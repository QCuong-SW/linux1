import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, apiRequest, SESSION_EXPIRED_EVENT } from '../src/shared/lib/api.ts';
import { validateCredentials } from '../src/features/auth/validation.ts';
import { validateName } from '../src/features/projects/workspace-types.ts';

test('HTTP requests use credentials, no cache, and JSON only for bodies', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, `${(process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '')}/projects`);
    assert.equal(options.credentials, 'include');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { name: 'Real project' });
    return Response.json({ id: 'project-id' }, { status: 201 });
  });
  assert.deepEqual(
    await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Real project' }),
    }),
    { id: 'project-id' },
  );
});

test('logout handles 204 without parsing JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  assert.equal(await apiRequest('/auth/logout', { method: 'POST' }), undefined);
});

test('401 expires private sessions but login and bootstrap failures do not', async (t) => {
  const browser = new EventTarget();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  });
  let expired = 0;
  browser.addEventListener(SESSION_EXPIRED_EVENT, () => expired++);
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ message: 'Unauthorized' }, { status: 401 }),
  );
  await assert.rejects(
    apiRequest('/projects'),
    (error) => error instanceof ApiError && error.status === 401,
  );
  assert.equal(expired, 1);
  await assert.rejects(
    apiRequest('/auth/login', { expireSession: false }),
    /Email hoặc mật khẩu không đúng/,
  );
  await assert.rejects(
    apiRequest('/auth/me', { expireSession: false }),
    (error) => error.status === 401,
  );
  assert.equal(expired, 1);
});

test('network and server errors produce retryable messages without exposing internals', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('private network details');
  });
  await assert.rejects(
    apiRequest('/projects'),
    (error) => error.status === 0 && !error.message.includes('private'),
  );
  fetchMock.mock.mockImplementation(async () =>
    Response.json({ message: 'postgres password=secret' }, { status: 500 }),
  );
  await assert.rejects(
    apiRequest('/projects'),
    (error) => error.status === 500 && !error.message.includes('secret'),
  );
  fetchMock.mock.mockImplementation(async () => Response.json({}, { status: 409 }));
  await assert.rejects(apiRequest('/auth/register'), /Email này đã được đăng ký/);
});

test('aborted reads stay aborted rather than becoming network errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new DOMException('Aborted', 'AbortError');
  });
  await assert.rejects(
    apiRequest('/projects'),
    (error) => error.name === 'AbortError' && !(error instanceof ApiError),
  );
});

test('validation matches backend name and UTF-8 password limits', () => {
  assert.ok(validateCredentials(' ', '').email);
  assert.ok(validateCredentials('user@', 'password123').email);
  assert.ok(validateCredentials('user@example.test', 'short').password);
  assert.ok(validateCredentials('user@example.test', 'é'.repeat(37)).password);
  assert.equal(validateCredentials('user@example.test', 'é'.repeat(36)).password, '');
  assert.equal(validateCredentials(' user@example.test ', 'password123').email, '');
  assert.ok(validateName('  '));
  assert.ok(validateName('x'.repeat(101)));
  assert.equal(validateName(` ${'x'.repeat(100)} `), '');
});
