const { default: EmbeddedPostgres } = require('embedded-postgres');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

const DATA_DIR = path.resolve(__dirname, '../.pgdata');
const PORT = 5432;

async function ensureDb() {
  const pg = new EmbeddedPostgres({
    port: PORT,
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'password',
  });

  if (!fs.existsSync(DATA_DIR)) {
    console.log('[DB] Initializing PostgreSQL cluster at:', DATA_DIR);
    await pg.initialise();
  }

  console.log('[DB] Starting PostgreSQL on port', PORT);
  await pg.start();

  // Create database helpdesk_lite if not exists
  const client = new Client({
    user: 'postgres',
    password: 'password',
    host: '127.0.0.1',
    port: PORT,
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'helpdesk_lite'");
    if (res.rowCount === 0) {
      console.log("[DB] Creating database 'helpdesk_lite'...");
      await client.query('CREATE DATABASE helpdesk_lite');
      console.log("[DB] Database 'helpdesk_lite' created successfully.");
    }
  } catch (err) {
    console.warn('[DB] DB check notice:', err.message);
  } finally {
    await client.end();
  }

  console.log('[DB] PostgreSQL is READY and listening on localhost:5432');
  return pg;
}

const action = process.argv[2] || 'start';

if (action === 'start') {
  ensureDb().then((pg) => {
    // Keep alive if run directly
    process.on('SIGINT', async () => {
      console.log('[DB] Stopping PostgreSQL...');
      await pg.stop();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      console.log('[DB] Stopping PostgreSQL...');
      await pg.stop();
      process.exit(0);
    });
  }).catch((err) => {
    console.error('[DB] Failed to start PostgreSQL:', err);
    process.exit(1);
  });
} else if (action === 'init') {
  ensureDb().then(async (pg) => {
    console.log('[DB] Initialization complete. Stopping server.');
    await pg.stop();
    process.exit(0);
  }).catch((err) => {
    console.error('[DB] Init error:', err);
    process.exit(1);
  });
}
