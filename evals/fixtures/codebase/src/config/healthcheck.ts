import { withRetry } from './retry';

interface HealthReport {
  db: boolean;
  queue: boolean;
  checkedAt: string;
}

/**
 * Periodic health check. Pings the database and the job queue;
 * transient failures are retried before the check reports failure.
 */
export async function runHealthCheck(ping: () => Promise<void>): Promise<HealthReport> {
  const cfg = loadHealthRetryConfig();
  try {
    await withRetry(ping, cfg);
  } catch {
    return { db: false, queue: false, checkedAt: new Date().toISOString() };
  }
  return { db: true, queue: true, checkedAt: new Date().toISOString() };
}

function loadHealthRetryConfig() {
  // Health probes retry more aggressively than user-facing calls.
  const maxRetries = Number(process.env.HEALTH_MAX_RETRIES ?? 8);
  const maxRetryDelayMs = Number(process.env.HEALTH_MAX_RETRY_DELAY_MS ?? 5_000);
  return { maxRetries, maxRetryDelayMs, backoffBase: 2 };
}
