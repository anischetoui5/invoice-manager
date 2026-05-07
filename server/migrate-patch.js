/**
 * Patch migration — adds columns that may be missing from older databases.
 * Safe to run multiple times (uses IF NOT EXISTS).
 * Run: node migrate-patch.js
 */
require('dotenv').config({ path: '.env' });
const pool = require('./src/config/db');

const patches = [
  {
    name: 'memberships.contract_start',
    sql: `ALTER TABLE memberships ADD COLUMN IF NOT EXISTS contract_start timestamp`,
  },
  {
    name: 'memberships.contract_end',
    sql: `ALTER TABLE memberships ADD COLUMN IF NOT EXISTS contract_end timestamp`,
  },
  {
    name: 'users.is_verified',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false`,
  },
  {
    name: 'users.verification_code',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code varchar(6)`,
  },
  {
    name: 'users.verification_expires_at',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz`,
  },
  {
    name: 'users.reset_code',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code varchar(6)`,
  },
  {
    name: 'users.reset_expires_at',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires_at timestamptz`,
  },
  {
    name: 'notifications table',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type varchar(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
      title varchar(255) NOT NULL,
      message text NOT NULL,
      action_url varchar(255),
      is_read boolean NOT NULL DEFAULT FALSE,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    name: 'notifications index',
    sql: `CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)`,
  },
  {
    name: 'activity_log table',
    sql: `CREATE TABLE IF NOT EXISTS activity_log (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      action varchar(100) NOT NULL,
      entity_type varchar(50),
      entity_id uuid,
      metadata jsonb DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
  },
  {
    name: 'activity_log index',
    sql: `CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON activity_log(workspace_id, created_at DESC)`,
  },
  {
    name: 'invoice_status seed',
    sql: `INSERT INTO invoice_status (code) VALUES ('draft'),('pending_review'),('approved'),('rejected'),('paid'),('archived') ON CONFLICT DO NOTHING`,
  },
];

async function run() {
  console.log('🔧 Running patch migrations...\n');
  const client = await pool.connect();
  let ok = 0, skip = 0;
  try {
    for (const patch of patches) {
      try {
        await client.query(patch.sql);
        console.log(`  ✅ ${patch.name}`);
        ok++;
      } catch (err) {
        console.log(`  ⚠️  ${patch.name} — ${err.message}`);
        skip++;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
  console.log(`\n✔ Done — ${ok} applied, ${skip} skipped\n`);
}

run();
