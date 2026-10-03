import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'miniflow-script-test-'));
  const bin = path.join(dir, 'bin');
  const state = path.join(dir, 'state');
  mkdirSync(bin);
  mkdirSync(state);
  const envFile = path.join(dir, 'production.env');
  writeFileSync(envFile, 'FRONTEND_ORIGIN=https://app.test.invalid\n', { mode: 0o600 });
  const events = path.join(dir, 'events.jsonl');
  writeFileSync(events, '');
  writeFileSync(
    path.join(bin, 'docker'),
    `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.MOCK_EVENTS, JSON.stringify(args) + '\\n');
const text = args.join(' ');
if (args[0] === 'image' && process.env.MOCK_MISSING_IMAGE) process.exit(1);
if (text.includes('pg_dump')) {
  if (process.env.MOCK_BACKUP_FAIL) process.exit(1);
  process.stdout.write('mock archive');
}
if (text.includes('createdb') && process.env.MOCK_DATABASE_EXISTS) process.exit(1);
if (args.includes('run') && args.includes('migrate') && process.env.MOCK_MIGRATION_FAIL) process.exit(23);
`,
    { mode: 0o755 },
  );
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    MOCK_EVENTS: events,
    MINIFLOW_ENV_FILE: envFile,
    MINIFLOW_STATE_DIR: state,
    MINIFLOW_BACKUP_DIR: path.join(state, 'backups'),
    MINIFLOW_PROJECT_NAME: 'miniflow_mock',
    MINIFLOW_IMAGE_TAG: 'new-release',
    MINIFLOW_ALLOW_DIRTY: '1',
    MINIFLOW_PUBLIC_URL: '',
    MINIFLOW_BACKUP_REMOTE: '',
  };
  return {
    dir,
    state,
    envFile,
    run: (script, args = [], overrides = {}) =>
      spawnSync('bash', [path.join(root, 'infra/scripts', script), ...args], {
        env: { ...env, ...overrides },
        encoding: 'utf8',
      }),
    events: () =>
      readFileSync(events, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
  };
}

test('a failed migration preserves the previous release and never replaces app containers', () => {
  const f = fixture();
  writeFileSync(path.join(f.state, 'current-release'), 'old-release\n');
  const result = f.run('deploy.sh', ['--reuse-images'], { MOCK_MIGRATION_FAIL: '1' });
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(path.join(f.state, 'current-release'), 'utf8'), 'old-release\n');
  assert.ok(f.events().some((args) => args.includes('run') && args.includes('migrate')));
  assert.ok(!f.events().some((args) => args.includes('up') && args.includes('backend')));
});

test('a failed backup never publishes a completed archive', () => {
  const f = fixture();
  const result = f.run('backup.sh', [], { MOCK_BACKUP_FAIL: '1' });
  assert.notEqual(result.status, 0);
  assert.deepEqual(readdirSync(path.join(f.state, 'backups')), ['backup.lock']);
});

test('restore refuses production-like target names before touching Docker', () => {
  const f = fixture();
  const archive = path.join(f.dir, 'backup.dump');
  writeFileSync(archive, 'archive');
  const result = f.run('restore.sh', [archive, 'miniflow']);
  assert.notEqual(result.status, 0);
  assert.deepEqual(f.events(), []);
});

test('restore does not overwrite an existing rehearsal database', () => {
  const f = fixture();
  const archive = path.join(f.dir, 'backup.dump');
  writeFileSync(archive, 'archive');
  const result = f.run('restore.sh', [archive, 'rehearsal_restore_test'], {
    MOCK_DATABASE_EXISTS: '1',
  });
  assert.notEqual(result.status, 0);
  assert.ok(!f.events().some((args) => args.join(' ').includes('pg_restore')));
});

test('rollback refuses missing images before changing running containers', () => {
  const f = fixture();
  const result = f.run('rollback.sh', ['--schema-compatible', 'old-release'], {
    MOCK_MISSING_IMAGE: '1',
  });
  assert.notEqual(result.status, 0);
  assert.ok(!f.events().some((args) => args.includes('up')));
});

test('rollback uses retained images and never executes migrations', () => {
  const f = fixture();
  writeFileSync(path.join(f.state, 'current-release'), 'new-release\n');
  const result = f.run('rollback.sh', ['--schema-compatible', 'old-release']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(path.join(f.state, 'current-release'), 'utf8'), 'old-release\n');
  assert.equal(readFileSync(path.join(f.state, 'previous-release'), 'utf8'), 'new-release\n');
  assert.ok(!f.events().some((args) => args.includes('run') || args.includes('build')));
});

test('env generation produces private secrets and refuses to overwrite them', () => {
  const f = fixture();
  const target = path.join(f.dir, 'new.env');
  const result = f.run('init-env.sh', ['app.test.invalid'], { MINIFLOW_ENV_FILE: target });
  assert.equal(result.status, 0, result.stderr);
  const original = readFileSync(target, 'utf8');
  assert.match(original, /JWT_SECRET=[a-f0-9]{64}/);
  assert.equal(statSync(target).mode & 0o777, 0o600);
  assert.notEqual(
    f.run('init-env.sh', ['app.test.invalid'], { MINIFLOW_ENV_FILE: target }).status,
    0,
  );
  assert.equal(readFileSync(target, 'utf8'), original);
});
