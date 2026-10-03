export function validateEnv(env: Record<string, unknown>) {
  const value = (key: string, fallback?: string): string => {
    const result = env[key] ?? fallback;
    if (typeof result !== 'string' || !result.trim()) {
      throw new Error(`Invalid environment variable: ${key}`);
    }
    return result.trim();
  };
  const nodeEnv = value('NODE_ENV', 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('Invalid environment variable: NODE_ENV');
  }
  const portText = value('PORT', '3001');
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || port < 1 || port > 65535) {
    throw new Error('Invalid environment variable: PORT');
  }
  const prefix = value('API_PREFIX', 'api');
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(prefix)) {
    throw new Error('Invalid environment variable: API_PREFIX');
  }
  const origin = value('FRONTEND_ORIGIN', 'http://localhost:3000');
  const databaseUrl = value('DATABASE_URL');
  try {
    const parsedOrigin = new URL(origin);
    const database = new URL(databaseUrl);
    if (
      !['http:', 'https:'].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin ||
      !['postgres:', 'postgresql:'].includes(database.protocol) ||
      !database.hostname ||
      database.pathname.length < 2
    ) {
      throw new Error();
    }
  } catch {
    throw new Error('Invalid FRONTEND_ORIGIN or DATABASE_URL');
  }
  const secret = value('JWT_SECRET');
  if (secret.length < 32 || /replace-with|change-me/i.test(secret)) {
    throw new Error('JWT_SECRET must be a real secret of at least 32 characters');
  }
  const expiresIn = value('JWT_EXPIRES_IN', '1d');
  if (!/^[1-9]\d*[smhd]$/.test(expiresIn)) {
    throw new Error('Invalid JWT_EXPIRES_IN: use a duration such as 15m or 1d');
  }
  if (nodeEnv === 'production' && !origin.startsWith('https://')) {
    throw new Error('FRONTEND_ORIGIN must use HTTPS in production');
  }
  return {
    ...env,
    NODE_ENV: nodeEnv,
    PORT: port,
    HOST: value('HOST', '127.0.0.1'),
    API_PREFIX: prefix,
    FRONTEND_ORIGIN: origin,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: secret,
    JWT_EXPIRES_IN: expiresIn,
  };
}
