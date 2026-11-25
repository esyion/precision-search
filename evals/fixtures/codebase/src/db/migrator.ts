import { DatabaseConnection } from './connection';
import { readMigrations } from '../migrations';

/**
 * Applies pending schema migrations on boot.
 * Each migration runs inside a transaction.
 */
export async function migrate(url: string): Promise<void> {
  const conn = new DatabaseConnection(url, { isolation: 'serializable' });
  const pending = await readMigrations(conn);
  for (const m of pending) {
    await conn.tx(async (tx) => tx.exec(m.sql));
  }
  await conn.close();
}
