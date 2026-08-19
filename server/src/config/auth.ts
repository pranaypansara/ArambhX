/**
 * Centralized JWT configuration (Phase 13).
 *
 * The secret is read from the environment instead of being scattered across the
 * auth controller/middleware. It is never hardcoded for production use: when
 * NODE_ENV=production and JWT_SECRET is absent the process fails fast with a
 * clear error. In development a warned fallback keeps local tooling working.
 */

const DEV_FALLBACK_SECRET = 'local-development-only-jwt-secret';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn(
    '[Auth Config] JWT_SECRET is not set. Using a development-only fallback. Set JWT_SECRET in production.'
  );
  return DEV_FALLBACK_SECRET;
};

export const getJwtExpiresIn = (): string => process.env.JWT_EXPIRES_IN || '7d';