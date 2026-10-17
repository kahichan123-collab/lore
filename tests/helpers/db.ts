// An in-memory Postgres with just enough of Supabase's `auth` schema and
// roles to run our real migrations and exercise RLS as different users.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

const MIGRATIONS = ["0001_schema.sql", "0002_rls.sql", "0003_admin_analytics.sql", "0004_rate_limits.sql"];

export async function createTestDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of MIGRATIONS) {
    await db.exec(readFileSync(join(__dirname, "../../supabase/migrations", file), "utf8"));
  }
  return db;
}

/** Run `fn` as a signed-in user (or as `anon` when `userId` is null), then reset. */
export async function as<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role`);
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
