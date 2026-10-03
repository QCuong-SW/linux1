import { validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/miniflow',
  JWT_SECRET: 'test-secret-for-validation-only-12345678',
};

describe('environment validation', () => {
  it('normalizes defaults and converts the port', () => {
    expect(validateEnv(valid)).toMatchObject({
      PORT: 3001,
      API_PREFIX: 'api',
      NODE_ENV: 'development',
    });
  });

  it.each([
    { PORT: '0' },
    { PORT: '65536' },
    { PORT: '3e3' },
    { API_PREFIX: '/api' },
    { FRONTEND_ORIGIN: '*' },
    { FRONTEND_ORIGIN: 'http://localhost:3000/path' },
    { DATABASE_URL: 'mysql://localhost/db' },
    { JWT_SECRET: 'short' },
    { JWT_SECRET: 'replace-with-a-random-secret-at-least-32-characters' },
    { JWT_EXPIRES_IN: '0d' },
    { NODE_ENV: 'production' },
  ])('rejects unsafe or malformed settings: %j', (override) => {
    expect(() => validateEnv({ ...valid, ...override })).toThrow();
  });

  it('does not expose database credentials in validation errors', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'bad:secret-password' })).toThrow(
      'Invalid FRONTEND_ORIGIN or DATABASE_URL',
    );
  });
});
