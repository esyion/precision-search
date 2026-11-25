import { startProcess } from './task-engine';
import { DatabaseConnection } from './db/pool';
import { createServer } from './server';

/**
 * Taskflow API entry point.
 * Bootstraps the database connection and the HTTP server.
 */
const db = new DatabaseConnection(process.env.DATABASE_URL);

async function main() {
  await db.connect();
  const run = await startProcess('onboarding', { actor: 'system' });
  createServer(run);
}

main().catch((err) => {
  console.error('fatal', err);
  process.exit(1);
});
