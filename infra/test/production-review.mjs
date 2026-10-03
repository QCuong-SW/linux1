import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  appendFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Destructive cleanup is restricted to this runner's isolated Compose project.
const root = fileURLToPath(new URL('../..', import.meta.url));
const tagIndex = process.argv.indexOf('--image-tag');
const tag = tagIndex < 0 ? 'ci' : process.argv[tagIndex + 1];
assert.match(tag, /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,90}$/);
const suffix = randomUUID().slice(0, 8);
const project = `miniflow_review_${suffix}`;
const artifacts = process.env.MINIFLOW_REVIEW_ARTIFACTS || '/tmp/miniflow-production-review';
mkdirSync(artifacts, { recursive: true });
const secrets = mkdtempSync(path.join(tmpdir(), 'miniflow-production-secrets-'));
const envFile = path.join(secrets, 'production.env');
const state = path.join(artifacts, `state-${suffix}`);
const logFile = path.join(artifacts, `review-${suffix}.log`);
const port = process.env.MINIFLOW_REVIEW_PORT || '13000';
const apiPort = process.env.MINIFLOW_REVIEW_API_PORT || '13001';
const httpPort = process.env.MINIFLOW_REVIEW_HTTP_PORT || '18080';
const httpsPort = process.env.MINIFLOW_REVIEW_HTTPS_PORT || '18443';
const publicURL = `https://localhost:${httpsPort}`;
const nginxName = `miniflow_nginx_review_${suffix}`;
const dbPassword = randomUUID().replaceAll('-', '');
writeFileSync(
  envFile,
  `POSTGRES_USER=review
POSTGRES_PASSWORD=${dbPassword}
POSTGRES_DB=miniflow_review
DATABASE_URL=postgresql://review:${dbPassword}@postgres:5432/miniflow_review
JWT_SECRET=${randomUUID()}${randomUUID()}
FRONTEND_ORIGIN=${publicURL}
NEXT_PUBLIC_API_URL=/api
FRONTEND_PORT=${port}
BACKEND_PORT=${apiPort}
`,
  { mode: 0o600 },
);
const env = {
  ...process.env,
  // Compose shell variables override --env-file; isolate the CI host database URL.
  DATABASE_URL: `postgresql://review:${dbPassword}@postgres:5432/miniflow_review`,
  MINIFLOW_PROJECT_NAME: project,
  MINIFLOW_ENV_FILE: envFile,
  MINIFLOW_STATE_DIR: state,
  MINIFLOW_BACKUP_DIR: path.join(state, 'backups'),
  MINIFLOW_IMAGE_TAG: tag,
  MINIFLOW_ALLOW_DIRTY: '1',
  MINIFLOW_PUBLIC_URL: '',
  MINIFLOW_BACKUP_REMOTE: '',
  IMAGE_TAG: tag,
};
function run(command, args, extraEnv = {}, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...env, ...extraEnv },
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 8 * 1024 * 1024,
  });
  appendFileSync(
    logFile,
    `${command} ${args.join(' ')}\n${result.stdout || ''}${result.stderr || ''}\n`,
  );
  if (!allowFailure) assert.equal(result.status, 0, `${command} failed; see ${logFile}`);
  return result;
}
const dc = (...args) =>
  run('docker', [
    'compose',
    '-p',
    project,
    '--env-file',
    envFile,
    '-f',
    'compose.production.yaml',
    ...args,
  ]);
const script = (name, args = [], extraEnv = {}, allowFailure = false) =>
  run('bash', [`infra/scripts/${name}`, ...args], extraEnv, allowFailure);
const base = `http://127.0.0.1:${port}/api`;
async function request(endpoint, { cookie, body, method = 'GET' } = {}) {
  const response = await fetch(`${base}${endpoint}`, {
    method,
    headers: {
      Origin: publicURL,
      Connection: 'close',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  return {
    status: response.status,
    cookie: response.headers.get('set-cookie'),
    body: response.status === 204 ? null : await response.json(),
  };
}
try {
  script('deploy.sh', ['--reuse-images']);
  assert.equal(readFileSync(path.join(state, 'current-release'), 'utf8').trim(), tag);
  for (const service of ['frontend', 'backend', 'migration']) {
    const user = run('docker', [
      'image',
      'inspect',
      '--format',
      '{{.Config.User}}',
      `miniflow-${service}:${tag}`,
    ]).stdout.trim();
    assert.equal(user, 'node');
    run('docker', [
      'run',
      '--rm',
      '--entrypoint',
      'sh',
      `miniflow-${service}:${tag}`,
      '-c',
      'test ! -e /app/.env.production && test ! -e /app/backend/.env && test ! -e /app/frontend/.env.local',
    ]);
  }
  const account = await request('/auth/register', {
    method: 'POST',
    body: { email: `review-${suffix}@example.test`, password: 'Review-password-123' },
  });
  assert.equal(account.status, 201);
  assert.match(account.cookie, /HttpOnly/i);
  assert.match(account.cookie, /Secure/i);
  assert.match(account.cookie, /SameSite=Lax/i);
  const cookie = account.cookie.split(';')[0];
  const created = await request('/projects', {
    method: 'POST',
    cookie,
    body: { name: 'Production review project' },
  });
  assert.equal(created.status, 201);
  const task = await request(`/projects/${created.body.id}/tasks`, {
    method: 'POST',
    cookie,
    body: { title: 'Backup and rollback fixture' },
  });
  assert.equal(task.status, 201);
  assert.equal(
    (
      await request(`/tasks/${task.body.id}/status`, {
        method: 'PATCH',
        cookie,
        body: { status: 'DONE' },
      })
    ).status,
    200,
  );
  const second = await request('/auth/register', {
    method: 'POST',
    body: { email: `other-${suffix}@example.test`, password: 'Review-password-123' },
  });
  assert.equal(second.status, 201);
  assert.equal(
    (await request(`/projects/${created.body.id}`, { cookie: second.cookie.split(';')[0] })).status,
    404,
  );
  dc('restart', 'backend', 'frontend');
  dc('up', '-d', '--no-deps', '--wait', '--wait-timeout', '180', 'backend', 'frontend');
  assert.equal((await request('/auth/me', { cookie })).status, 200);
  assert.equal((await request(`/projects/${created.body.id}`, { cookie })).body.completedTasks, 1);
  script('backup.sh');
  const backups = readdirSync(env.MINIFLOW_BACKUP_DIR)
    .filter((name) => name.endsWith('.dump'))
    .sort();
  const archive = path.join(env.MINIFLOW_BACKUP_DIR, backups.at(-1));
  script('restore.sh', [archive, 'rehearsal_restore_test']);
  const restored = dc(
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'review',
    '-d',
    'rehearsal_restore_test',
    '-At',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    'SELECT count(*) FROM "Project"; SELECT count(*) FROM "Task" WHERE status = \'DONE\';',
  ).stdout.trim();
  assert.equal(restored, '1\n1');
  // Re-tag identical images to exercise image retention/state without introducing a schema change.
  const nextTag = `${tag}-rollback-review`;
  for (const service of ['frontend', 'backend', 'migration'])
    run('docker', ['tag', `miniflow-${service}:${tag}`, `miniflow-${service}:${nextTag}`]);
  script('deploy.sh', ['--reuse-images'], { MINIFLOW_IMAGE_TAG: nextTag });
  script('rollback.sh', ['--schema-compatible']);
  assert.equal(readFileSync(path.join(state, 'current-release'), 'utf8').trim(), tag);
  assert.equal((await request(`/projects/${created.body.id}`, { cookie })).body.completedTasks, 1);
  const ids = dc('ps', '-q', 'backend', 'frontend').stdout;
  const override = path.join(secrets, 'migration-failure.yaml');
  writeFileSync(
    override,
    'services:\n  migrate:\n    command: ["node", "-e", "process.exit(23)"]\n',
  );
  assert.notEqual(
    script('deploy.sh', ['--reuse-images'], { MINIFLOW_COMPOSE_OVERRIDE: override }, true).status,
    0,
  );
  assert.equal(dc('ps', '-q', 'backend', 'frontend').stdout, ids);
  assert.equal(readFileSync(path.join(state, 'current-release'), 'utf8').trim(), tag);
  // Check the actual Nginx templates with a local CA, including ACME and TLS proxy paths.
  const certDir = path.join(secrets, 'cert');
  const acmeDir = path.join(secrets, 'acme');
  mkdirSync(certDir);
  mkdirSync(path.join(acmeDir, '.well-known/acme-challenge'), { recursive: true });
  writeFileSync(path.join(acmeDir, '.well-known/acme-challenge/review'), 'acme-review');
  const ca = path.join(certDir, 'fullchain.pem');
  run('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-keyout',
    path.join(certDir, 'privkey.pem'),
    '-out',
    ca,
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost',
  ]);
  const nginxConfig = path.join(secrets, 'nginx.conf');
  const renderNginx = (template) =>
    readFileSync(path.join(root, 'infra/nginx', template), 'utf8')
      .replaceAll('miniflow.example.com', 'localhost')
      .replace('listen 80;', `listen 127.0.0.1:${httpPort};`)
      .replace('listen 443 ssl;', `listen 127.0.0.1:${httpsPort} ssl;`)
      .replaceAll('127.0.0.1:3000', `127.0.0.1:${port}`)
      .replaceAll('127.0.0.1:3001', `127.0.0.1:${apiPort}`)
      .replace('https://localhost$request_uri', `${publicURL}$request_uri`);
  const mounts = [
    '--network',
    'host',
    '-v',
    `${nginxConfig}:/etc/nginx/conf.d/default.conf:ro`,
    '-v',
    `${certDir}:/etc/letsencrypt/live/localhost:ro`,
    '-v',
    `${acmeDir}:/var/www/letsencrypt:ro`,
  ];
  for (const template of ['miniflow.http.conf', 'miniflow.https.conf']) {
    writeFileSync(nginxConfig, renderNginx(template));
    run('docker', ['run', '--rm', ...mounts, 'nginx:stable-alpine', 'nginx', '-t']);
  }
  run('docker', ['run', '-d', '--name', nginxName, ...mounts, 'nginx:stable-alpine']);
  run('curl', [
    '--fail',
    '--silent',
    '--show-error',
    '--retry',
    '10',
    '--retry-connrefused',
    '--retry-delay',
    '1',
    '--max-time',
    '30',
    '--cacert',
    ca,
    `${publicURL}/api/health`,
  ]);
  const redirect = await fetch(`http://127.0.0.1:${httpPort}/login`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), `${publicURL}/login`);
  assert.equal(
    await (await fetch(`http://127.0.0.1:${httpPort}/.well-known/acme-challenge/review`)).text(),
    'acme-review',
  );
  script('health-check.sh', [], {
    MINIFLOW_DISK_LIMIT: '100',
    MINIFLOW_MEMORY_LIMIT: '100',
    MINIFLOW_PUBLIC_URL: publicURL,
    CURL_CA_BUNDLE: ca,
  });
  assert.equal((await request('/auth/logout', { method: 'POST', cookie })).status, 204);
  assert.equal((await request('/auth/me', { cookie })).status, 401);
  console.log(
    'Production review passed: images, Nginx/HTTPS/ACME, proxy, auth, persistence, ownership, backup/restore, rollback and migration failure gate.',
  );
  appendFileSync(logFile, 'Production review passed.\n');
} finally {
  const logs = run(
    'docker',
    [
      'compose',
      '-p',
      project,
      '--env-file',
      envFile,
      '-f',
      'compose.production.yaml',
      'logs',
      '--no-color',
      '--tail',
      '100',
    ],
    {},
    true,
  );
  writeFileSync(path.join(artifacts, `containers-${suffix}.log`), logs.stdout + logs.stderr);
  run('docker', ['rm', '-f', nginxName], {}, true);
  run(
    'docker',
    [
      'compose',
      '-p',
      project,
      '--env-file',
      envFile,
      '-f',
      'compose.production.yaml',
      'down',
      '--volumes',
      '--remove-orphans',
    ],
    {},
    true,
  );
}
