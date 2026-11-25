export interface PoolOptions {
  isolation?: 'serializable' | 'read-committed';
  maxLeases?: number;
}

export class DatabaseConnection {
  constructor(
    public url: string,
    public opts: PoolOptions = {}
  ) {}

  async connect(): Promise<void> {}
  async close(): Promise<void> {}
  async tx<T>(fn: (tx: { exec(sql: string): Promise<void> }) => Promise<T>): Promise<T> {
    return fn({ exec: async () => {} });
  }
}
