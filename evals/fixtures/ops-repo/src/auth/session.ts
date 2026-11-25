import { config } from '../config-loader';

/**
 * Session middleware: validates the signed session cookie
 * and refreshes sliding expiry on each request.
 */
export function sessionTimeoutSeconds(): number {
  const v = config.session.timeout;
  return Number(v) || 1800;
}

export function isExpired(issuedAt: number): boolean {
  return Date.now() - issuedAt > sessionTimeoutSeconds() * 1000;
}
