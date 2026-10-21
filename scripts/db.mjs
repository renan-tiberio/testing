// Applies db/migrations/*.sql (once each, tracked in private.schema_migrations) and
// db/seed.sql. Runs locally (`pnpm db:migrate`, `pnpm db:seed`, reading .env.local) and on
// every Vercel deploy (`vercel-build`, reading the project's environment variables).
import console from 'node:console'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'

import pg from 'pg'

const DB_DIR = join(import.meta.dirname, '..', 'db')
const LOCAL_ENV_FILE = join(import.meta.dirname, '..', '.env.local')

// Locally the variables live in .env.local; on Vercel they are already in the environment.
if (existsSync(LOCAL_ENV_FILE)) process.loadEnvFile(LOCAL_ENV_FILE)

const connect = async () => {
  const raw = process.env.POSTGRES_URL_NON_POOLING
  if (raw === undefined || raw === '') throw new Error('POSTGRES_URL_NON_POOLING is not set')
  const url = new URL(raw)
  url.searchParams.delete('sslmode')
  // Supabase serves a certificate from its own CA; encrypt without verifying the chain.
  const client = new pg.Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  return client
}

const migrate = async (client) => {
  await client.query(`create schema if not exists private;
    create table if not exists private.schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`)
  const files = (await readdir(join(DB_DIR, 'migrations'))).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    const { rowCount } = await client.query(
      'select 1 from private.schema_migrations where name = $1',
      [file],
    )
    if (rowCount > 0) {
      console.info(`skip ${file}`)
      continue
    }
    await client.query('begin')
    try {
      await client.query(await readFile(join(DB_DIR, 'migrations', file), 'utf8'))
      await client.query('insert into private.schema_migrations (name) values ($1)', [file])
      await client.query('commit')
      console.info(`applied ${file}`)
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  }
}

const seed = async (client) => {
  const password = process.env.SEED_USER_PASSWORD
  if (password === undefined || password.length < 12) {
    throw new Error('Set SEED_USER_PASSWORD (12+ characters) to seed the test users')
  }
  // Statements are run one by one: $1 binding requires a single statement per query.
  const sql = await readFile(join(DB_DIR, 'seed.sql'), 'utf8')
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter((s) => s !== '')
  await client.query('begin')
  try {
    for (const statement of statements) {
      await client.query(statement, statement.includes('$1') ? [password] : [])
    }
    await client.query('commit')
    console.info(`seeded (${statements.length} statements)`)
  } catch (error) {
    await client.query('rollback')
    throw error
  }
}

const command = process.argv[2]
const client = await connect()
try {
  if (command === 'migrate') await migrate(client)
  else if (command === 'seed') await seed(client)
  else throw new Error('Usage: scripts/db.mjs migrate|seed')
} finally {
  await client.end()
}
