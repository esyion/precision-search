import { DatabaseConnection, PoolOptions } from './connection';

/**
 * Connection pool for the taskflow database.
 *
 * DatabaseConnection handles a single socket; the pool hands out
 * leases and reclaims them on release. See docs/architecture.md.
 */
export class ConnectionPool {
  private conn: DatabaseConnection;
  private leases = new Map<string, number>();

  constructor(url: string, private opts: PoolOptions = {}) {
    this.conn = new DatabaseConnection(url, opts);
  }

  async lease<T>(fn: (c: DatabaseConnection) => Promise<T>): Promise<T> {
    const id = crypto.randomUUID();
    this.leases.set(id, Date.now());
    try {
      return await fn(this.conn);
    } finally {
      this.leases.delete(id);
    }
  }
}
