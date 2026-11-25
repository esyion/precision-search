export interface RetryConfig {
  maxRetries: number;
  maxRetryDelayMs: number;
  backoffBase: number;
}

const defaults: RetryConfig = {
  maxRetries: 5,
  maxRetryDelayMs: 30_000,
  backoffBase: 2,
};

export function loadRetryConfig(env: NodeJS.ProcessEnv = process.env): RetryConfig {
  const cfg = { ...defaults };
  if (env.MAX_RETRIES_OVERRIDE) {
    cfg.maxRetries = Number(env.MAX_RETRIES_OVERRIDE);
  }
  return cfg;
}

/**
 * Hard cap enforced by ops; cfg.maxRetries may never exceed maxRetriesLimit.
 */
export const maxRetriesLimit = 10;

export async function withRetry<T>(fn: () => Promise<T>, cfg: RetryConfig): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = Math.min(1000 * cfg.backoffBase ** attempt, cfg.maxRetryDelayMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
