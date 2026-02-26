import pg from 'pg';

const DB_NAME = 'eli_cms_test';
const ROOT_URL = 'postgresql://eli:eli_secret@localhost:5432/postgres';
const TEST_URL = `postgresql://eli:eli_secret@localhost:5432/${DB_NAME}`;

export async function setup() {
  // 1. Create test DB if it doesn't exist
  const root = new pg.Client({ connectionString: ROOT_URL });
  await root.connect();

  const result = await root.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
  if (result.rowCount === 0) {
    await root.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`Created database "${DB_NAME}"`);
  }
  await root.end();

  // 2. Run Drizzle migrations on the test DB
  const testClient = new pg.Client({ connectionString: TEST_URL });
  await testClient.connect();

  const { readFileSync, readdirSync } = await import('fs');
  const { join } = await import('path');
  const { fileURLToPath } = await import('url');

  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const migrationsDir = join(__dirname, '..', '..', 'drizzle');

  const sqlFiles = readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  // Create drizzle migration table if not exists
  await testClient.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `);

  for (const file of sqlFiles) {
    const hash = file;
    const exists = await testClient.query(
      `SELECT 1 FROM "__drizzle_migrations" WHERE hash = $1`,
      [hash],
    );
    if (exists.rowCount === 0) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await testClient.query(sql);
      await testClient.query(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
        [hash, Date.now()],
      );
      console.log(`Applied migration: ${file}`);
    }
  }

  await testClient.end();
}
