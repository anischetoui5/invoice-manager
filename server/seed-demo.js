/**
 * Demo seed script — fills DB with realistic data for PFE presentation.
 * Run: node seed-demo.js
 */

require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── helpers ─────────────────────────────────────────────────────────────────

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndNum(min, max, dec = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ─── data pools ──────────────────────────────────────────────────────────────

const VENDORS = [
  'Tunisie Telecom', 'STEG', 'SONEDE', 'Orange Tunisie', 'Ooredoo',
  'Dell Technologies', 'HP Enterprise', 'Microsoft Tunisie', 'SAP Maghreb',
  'Office Depot', 'Megastore', 'Carrefour', 'Monoprix Tunisie',
  'DHL Tunisie', 'FedEx', 'TNT Express', 'Trans-Med Logistics',
  'Attijari Bank', 'BIAT', 'BNA Banque', 'UIB',
  'Assurances COMAR', 'GAT Assurances',
  'Graphic Design Studio', 'Print Express', 'Media One',
  'Maintenance Pro', 'Techno Services', 'Clean Office',
];

const STATUSES = ['draft', 'pending_review', 'approved', 'rejected'];
const CURRENCIES = ['TND', 'TND', 'TND', 'EUR', 'USD'];

// prettier status weights: more approved than rejected
function weightedStatus() {
  const w = Math.random();
  if (w < 0.20) return 'draft';
  if (w < 0.35) return 'pending_review';
  if (w < 0.80) return 'approved';
  return 'rejected';
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  console.log('🌱 Starting demo seed...\n');

  try {
    await client.query('BEGIN');

    // ── 1. Look up role IDs ──────────────────────────────────────────────────
    const { rows: roleRows } = await client.query('SELECT id, name FROM roles');
    const roles = {};
    roleRows.forEach(r => { roles[r.name] = r.id; });
    console.log('✅ Roles fetched:', Object.keys(roles).join(', '));

    // ── 2. Create demo users ─────────────────────────────────────────────────
    const pw = await bcrypt.hash('Demo1234!', 10);

    async function upsertUser(name, email) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, is_verified)
         VALUES ($1,$2,$3,true)
         ON CONFLICT (email) DO UPDATE SET
           name          = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           is_verified   = true
         RETURNING id`,
        [name, email, pw]
      );
      return rows[0].id;
    }

    const directorId  = await upsertUser('Ahmed Ben Ali',     'director@demo.com');
    const accountId   = await upsertUser('Sonia Maaref',      'accountant@demo.com');
    const emp1Id      = await upsertUser('Youssef Trabelsi',  'employee1@demo.com');
    const emp2Id      = await upsertUser('Mariem Khelifi',    'employee2@demo.com');
    const personalId  = await upsertUser('Karim Jouini',      'personal@demo.com');

    console.log('✅ Demo users created/updated');

    // ── 3. Create company workspace ──────────────────────────────────────────
    let compWsId;
    {
      const existing = await client.query(
        `SELECT w.id FROM workspaces w
         JOIN memberships m ON m.workspace_id=w.id
         WHERE w.type='company' AND w.owner_id=$1`,
        [directorId]
      );
      if (existing.rows.length) {
        compWsId = existing.rows[0].id;
        console.log('✅ Company workspace already exists, reusing');
      } else {
        const ws = await client.query(
          `INSERT INTO workspaces (name, type, owner_id)
           VALUES ('TechCorp Tunisie', 'company', $1) RETURNING id`,
          [directorId]
        );
        compWsId = ws.rows[0].id;

        await client.query(
          `INSERT INTO companies (workspace_id, name, email, phone, address, industry)
           VALUES ($1,'TechCorp Tunisie','contact@techcorp.tn','+216 71 234 567',
                   '12 Rue de la Liberté, Tunis 1000','Technology')`,
          [compWsId]
        );

        const addMember = async (userId, roleName) => {
          await client.query(
            `INSERT INTO memberships (user_id, workspace_id, role_id)
             VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [userId, compWsId, roles[roleName]]
          );
        };
        await addMember(directorId, 'Director');
        await addMember(accountId,  'Accountant');
        await addMember(emp1Id,     'Employee');
        await addMember(emp2Id,     'Employee');

        console.log('✅ Company workspace created with 4 members');
      }
    }

    // ── 4. Create personal workspace ─────────────────────────────────────────
    let persWsId;
    {
      const existing = await client.query(
        `SELECT id FROM workspaces WHERE owner_id=$1 AND type='personal'`,
        [personalId]
      );
      if (existing.rows.length) {
        persWsId = existing.rows[0].id;
      } else {
        const ws = await client.query(
          `INSERT INTO workspaces (name, type, owner_id)
           VALUES ('Karim Personal', 'personal', $1) RETURNING id`,
          [personalId]
        );
        persWsId = ws.rows[0].id;
        await client.query(
          `INSERT INTO memberships (user_id, workspace_id, role_id)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [personalId, persWsId, roles['Personal']]
        );
      }
      console.log('✅ Personal workspace ready');
    }

    // ── 5. Seed company invoices ──────────────────────────────────────────────
    const uploaders = [emp1Id, emp2Id, accountId];
    let created = 0;

    const existing = await client.query(
      'SELECT COUNT(*) FROM invoices WHERE workspace_id=$1', [compWsId]
    );
    const alreadyHas = parseInt(existing.rows[0].count);

    if (alreadyHas < 10) {
      for (let i = 1; i <= 60; i++) {
        const daysBack = Math.floor(Math.random() * 180); // up to 6 months ago
        const invDate  = daysAgo(daysBack);
        const dueDate  = daysFromNow(30 - daysBack); // might be overdue
        const status   = weightedStatus();
        const vendor   = rnd(VENDORS);
        const currency = rnd(CURRENCIES);
        const amount   = rndNum(200, 25000);
        const uploader = rnd(uploaders);
        const invNum   = `INV-${String(2024001 + i).padStart(6, '0')}`;

        await client.query(
          `INSERT INTO invoices
           (workspace_id, created_by, invoice_number, vendor_name, amount,
            currency, invoice_date, due_date, current_status, ocr_status, ocr_confidence)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'completed',$10)`,
          [compWsId, uploader, invNum, vendor, amount, currency, invDate, dueDate, status, rndNum(80, 99)]
        );
        created++;
      }
      console.log(`✅ Created ${created} company invoices`);
    } else {
      console.log(`⏩ Company already has ${alreadyHas} invoices, skipping`);
    }

    // ── 6. Seed personal invoices ─────────────────────────────────────────────
    const persExisting = await client.query(
      'SELECT COUNT(*) FROM invoices WHERE workspace_id=$1', [persWsId]
    );
    const persHas = parseInt(persExisting.rows[0].count);

    if (persHas < 5) {
      const persVendors = ['STEG', 'SONEDE', 'Ooredoo', 'Carrefour', 'Monoprix Tunisie', 'Pharmacie Centrale'];
      for (let i = 1; i <= 15; i++) {
        const daysBack = Math.floor(Math.random() * 90);
        const invDate  = daysAgo(daysBack);
        const dueDate  = daysFromNow(15 - daysBack);
        const status   = rnd(['draft', 'pending_review', 'approved', 'approved', 'approved']);

        await client.query(
          `INSERT INTO invoices
           (workspace_id, created_by, invoice_number, vendor_name, amount,
            currency, invoice_date, due_date, current_status, ocr_status, ocr_confidence)
           VALUES ($1,$2,$3,$4,$5,'TND',$6,$7,$8,'completed',$9)`,
          [persWsId, personalId,
           `PERS-${String(i).padStart(4, '0')}`,
           rnd(persVendors),
           rndNum(20, 800),
           invDate, dueDate, status,
           rndNum(85, 99)]
        );
      }
      console.log('✅ Created 15 personal invoices');
    } else {
      console.log(`⏩ Personal workspace already has ${persHas} invoices, skipping`);
    }

    // ── 7. Activity log entries ───────────────────────────────────────────────
    const actExisting = await client.query(
      'SELECT COUNT(*) FROM activity_log WHERE workspace_id=$1', [compWsId]
    );
    if (parseInt(actExisting.rows[0].count) < 5) {
      const { rows: invRows } = await client.query(
        'SELECT id, invoice_number, vendor_name, current_status FROM invoices WHERE workspace_id=$1 LIMIT 10',
        [compWsId]
      );

      for (const inv of invRows) {
        await client.query(
          `INSERT INTO activity_log (workspace_id, user_id, action, entity_type, entity_id, metadata)
           VALUES ($1,$2,'invoice.created','invoice',$3,$4)`,
          [compWsId, rnd(uploaders), inv.id,
           JSON.stringify({ invoice_number: inv.invoice_number, vendor_name: inv.vendor_name })]
        );

        if (inv.current_status !== 'draft') {
          await client.query(
            `INSERT INTO activity_log (workspace_id, user_id, action, entity_type, entity_id, metadata)
             VALUES ($1,$2,'invoice.status_changed','invoice',$3,$4)`,
            [compWsId, accountId, inv.id,
             JSON.stringify({ invoice_number: inv.invoice_number, status: inv.current_status })]
          );
        }
      }

      // member events
      await client.query(
        `INSERT INTO activity_log (workspace_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1,$2,'member.joined','member',$3,$4)`,
        [compWsId, emp1Id, emp1Id,
         JSON.stringify({ user_name: 'Youssef Trabelsi', role: 'Employee' })]
      );
      await client.query(
        `INSERT INTO activity_log (workspace_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1,$2,'member.joined','member',$3,$4)`,
        [compWsId, emp2Id, emp2Id,
         JSON.stringify({ user_name: 'Mariem Khelifi', role: 'Employee' })]
      );
      await client.query(
        `INSERT INTO activity_log (workspace_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1,$2,'company.updated','company',$3,$4)`,
        [compWsId, directorId, compWsId,
         JSON.stringify({ company_name: 'TechCorp Tunisie' })]
      );

      console.log('✅ Activity log populated');
    } else {
      console.log('⏩ Activity log already has entries, skipping');
    }

    // ── 8. Notifications for director ────────────────────────────────────────
    const notifExisting = await client.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id=$1', [directorId]
    );
    if (parseInt(notifExisting.rows[0].count) < 3) {
      const notifs = [
        { type: 'info',    title: 'Welcome to EASYfact!',          message: 'Your company workspace is ready. Invite your team to get started.' },
        { type: 'success', title: 'Invoice approved',               message: 'Invoice INV-2024001 from Tunisie Telecom has been approved.' },
        { type: 'warning', title: '3 invoices pending review',      message: 'You have 3 invoices waiting for your review.' },
        { type: 'success', title: 'Team member joined',             message: 'Youssef Trabelsi joined as Employee.' },
        { type: 'info',    title: 'Monthly report ready',           message: 'Your invoice report for April 2025 is available.' },
      ];
      for (const n of notifs) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, is_read)
           VALUES ($1,$2,$3,$4,false)`,
          [directorId, n.type, n.title, n.message]
        );
      }
      console.log('✅ Notifications created');
    } else {
      console.log('⏩ Notifications already exist, skipping');
    }

    await client.query('COMMIT');
    console.log('\n🎉 Demo seed complete!\n');
    console.log('─────────────────────────────────────────');
    console.log('Demo accounts (password: Demo1234!)');
    console.log('─────────────────────────────────────────');
    console.log('  Director   → director@demo.com');
    console.log('  Accountant → accountant@demo.com');
    console.log('  Employee 1 → employee1@demo.com');
    console.log('  Employee 2 → employee2@demo.com');
    console.log('  Personal   → personal@demo.com');
    console.log('─────────────────────────────────────────\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
