require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const CATEGORIES = ['Software', 'Hardware', 'Consulting', 'Utilities', 'Office Supplies', 'Marketing', 'Travel', 'Other'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }

async function seed() {
  const client = await pool.connect();
  try {
    // ── Find user ──────────────────────────────────────────────────
    const userRes = await client.query(
      `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)`,
      ['anis@gmail.com']
    );
    if (!userRes.rows[0]) { console.error('❌ User not found'); return; }
    const user = userRes.rows[0];
    console.log(`✅ Found: ${user.name} (${user.email})`);

    // ── Find workspaces ────────────────────────────────────────────
    const wsRes = await client.query(
      `SELECT w.id, w.name, w.type FROM workspaces w
       JOIN memberships m ON m.workspace_id = w.id
       WHERE m.user_id = $1`, [user.id]
    );
    const personalWs = wsRes.rows.find(w => w.type === 'personal');
    const companyWs  = wsRes.rows.find(w => w.type === 'company');
    console.log(`✅ Personal: ${personalWs?.name ?? 'NOT FOUND'}`);
    console.log(`✅ Company:  ${companyWs?.name  ?? 'NOT FOUND'}`);

    // ── Roles ──────────────────────────────────────────────────────
    const rolesRes = await client.query(`SELECT id, name FROM roles`);
    const roleMap = Object.fromEntries(rolesRes.rows.map(r => [r.name, r.id]));

    const memberPassword = await bcrypt.hash('Demo1234!', 10);

    // ══════════════════════════════════════════════════════════════
    // COMPANY WORKSPACE
    // ══════════════════════════════════════════════════════════════
    if (companyWs) {
      console.log('\n📦 Seeding company workspace…');

      // ── Fake team members ───────────────────────────────────────
      const fakeEmployees = [
        { name: 'Yasmine Benali',  email: 'yasmine.benali@easyfact.demo' },
        { name: 'Karim Ouahrani', email: 'karim.ouahrani@easyfact.demo'  },
        { name: 'Lina Hamdi',     email: 'lina.hamdi@easyfact.demo'      },
        { name: 'Mehdi Boukhalfa',email: 'mehdi.boukhalfa@easyfact.demo' },
      ];
      const fakeAccountants = [
        { name: 'Sonia Maaloul', email: 'sonia.maaloul@easyfact.demo' },
        { name: 'Tarek Bensalah',email: 'tarek.bensalah@easyfact.demo' },
      ];

      const employeeIds = [];
      const accountantIds = [];

      for (const emp of fakeEmployees) {
        const ex = await client.query(`SELECT id FROM users WHERE email=$1`, [emp.email]);
        let id = ex.rows[0]?.id;
        if (!id) {
          const ins = await client.query(
            `INSERT INTO users (name,email,password_hash,is_verified) VALUES ($1,$2,$3,true) RETURNING id`,
            [emp.name, emp.email, memberPassword]
          );
          id = ins.rows[0].id;
        }
        await client.query(
          `INSERT INTO memberships (user_id,workspace_id,role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [id, companyWs.id, roleMap['Employee']]
        );
        employeeIds.push(id);
        console.log(`  👤 Employee: ${emp.name}`);
      }

      for (const acc of fakeAccountants) {
        const ex = await client.query(`SELECT id FROM users WHERE email=$1`, [acc.email]);
        let id = ex.rows[0]?.id;
        if (!id) {
          const ins = await client.query(
            `INSERT INTO users (name,email,password_hash,is_verified) VALUES ($1,$2,$3,true) RETURNING id`,
            [acc.name, acc.email, memberPassword]
          );
          id = ins.rows[0].id;
        }
        await client.query(
          `INSERT INTO memberships (user_id,workspace_id,role_id,contract_start,contract_end)
           VALUES ($1,$2,$3,NOW(),NOW()+INTERVAL '1 year') ON CONFLICT DO NOTHING`,
          [id, companyWs.id, roleMap['Accountant']]
        );
        accountantIds.push(id);
        console.log(`  🧮 Accountant: ${acc.name}`);
      }

      // ── Company invoices ────────────────────────────────────────
      const companyInvoices = [
        { vendor: 'Microsoft Corporation', amount: 4800,  status: 'paid',           daysAgoCreated: 60 },
        { vendor: 'Adobe Systems',         amount: 1200,  status: 'paid',           daysAgoCreated: 55 },
        { vendor: 'Amazon Web Services',   amount: 9500,  status: 'paid',           daysAgoCreated: 50 },
        { vendor: 'Oracle Corp',           amount: 15000, status: 'approved',       daysAgoCreated: 45 },
        { vendor: 'Salesforce Inc',        amount: 7200,  status: 'approved',       daysAgoCreated: 40 },
        { vendor: 'IBM Global',            amount: 3400,  status: 'pending_review', daysAgoCreated: 30 },
        { vendor: 'Dell Technologies',     amount: 8900,  status: 'pending_review', daysAgoCreated: 25 },
        { vendor: 'HP Enterprise',         amount: 2100,  status: 'pending_review', daysAgoCreated: 20 },
        { vendor: 'Cisco Systems',         amount: 6700,  status: 'rejected',       daysAgoCreated: 35 },
        { vendor: 'SAP SE',                amount: 12000, status: 'draft',          daysAgoCreated: 10 },
        { vendor: 'Zoom Video',            amount: 840,   status: 'draft',          daysAgoCreated: 7  },
        { vendor: 'Slack Technologies',    amount: 1560,  status: 'archived',       daysAgoCreated: 90 },
        { vendor: 'Atlassian',             amount: 2200,  status: 'archived',       daysAgoCreated: 85 },
        { vendor: 'Apple Inc',             amount: 5400,  status: 'paid',           daysAgoCreated: 70 },
        { vendor: 'Shopify Inc',           amount: 3800,  status: 'approved',       daysAgoCreated: 15 },
      ];

      for (let i = 0; i < companyInvoices.length; i++) {
        const inv = companyInvoices[i];
        const uploader = randomItem([user.id, ...employeeIds]);
        const accountant = accountantIds[0] ?? user.id;
        const invNum = `INV-${String(2025001 + i).padStart(6, '0')}`;
        const category = randomItem(CATEGORIES);
        const createdAt = daysAgo(inv.daysAgoCreated);
        const dueDate   = daysAgo(inv.daysAgoCreated - 30);

        const invRes = await client.query(
          `INSERT INTO invoices
             (workspace_id, created_by, vendor_name, invoice_number, invoice_date,
              due_date, amount, currency, current_status, category, notes, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'TND',$8,$9,$10,$11) RETURNING id`,
          [companyWs.id, uploader, inv.vendor, invNum, createdAt, dueDate,
           inv.amount, inv.status, category,
           `Invoice from ${inv.vendor} for ${category.toLowerCase()} services`, createdAt]
        );
        const invoiceId = invRes.rows[0].id;

        // Status history — one row per status transition
        await client.query(
          `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'draft',$3)`,
          [invoiceId, uploader, createdAt]
        );
        if (['pending_review','approved','rejected','paid','archived'].includes(inv.status)) {
          await client.query(
            `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'pending_review',$3)`,
            [invoiceId, uploader, daysAgo(inv.daysAgoCreated - 2)]
          );
        }
        if (['approved','paid','archived'].includes(inv.status)) {
          await client.query(
            `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'approved',$3)`,
            [invoiceId, accountant, daysAgo(inv.daysAgoCreated - 5)]
          );
        }
        if (inv.status === 'rejected') {
          await client.query(
            `INSERT INTO status_history (invoice_id, changed_by, status, comment, changed_at)
             VALUES ($1,$2,'rejected','Missing supporting documents. Please resubmit.',$3)`,
            [invoiceId, accountant, daysAgo(inv.daysAgoCreated - 4)]
          );
        }
        if (inv.status === 'paid') {
          await client.query(
            `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'paid',$3)`,
            [invoiceId, user.id, daysAgo(inv.daysAgoCreated - 8)]
          );
        }
        if (inv.status === 'archived') {
          await client.query(
            `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'archived',$3)`,
            [invoiceId, user.id, daysAgo(inv.daysAgoCreated - 10)]
          );
        }

        console.log(`  🧾 ${invNum} — ${inv.vendor} — ${inv.amount} TND [${inv.status}]`);
      }

      // ── Notifications ───────────────────────────────────────────
      const notifs = [
        { title: 'Invoice Paid',     message: 'Invoice INV-2025003 from Amazon Web Services has been paid' },
        { title: 'Invoice Approved', message: 'Invoice INV-2025004 from Oracle Corp has been approved'    },
        { title: 'Invoice Rejected', message: 'Invoice INV-2025009 from Cisco Systems was rejected: Missing documents' },
        { title: 'Team Update',      message: 'Yasmine Benali joined your workspace as Employee'          },
        { title: 'Subscription',     message: 'Your subscription is active — 15 invoices used this month' },
      ];
      for (const n of notifs) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, is_read) VALUES ($1,'info',$2,$3,false)`,
          [user.id, n.title, n.message]
        );
      }
      console.log(`  🔔 Added ${notifs.length} notifications`);
    }

    // ══════════════════════════════════════════════════════════════
    // PERSONAL WORKSPACE
    // ══════════════════════════════════════════════════════════════
    if (personalWs) {
      console.log('\n👤 Seeding personal workspace…');

      const personalInvoices = [
        { vendor: 'Tunisie Telecom',    amount: 180, status: 'paid',           daysAgoCreated: 45 },
        { vendor: 'STEG',               amount: 95,  status: 'paid',           daysAgoCreated: 40 },
        { vendor: 'SONEDE',             amount: 62,  status: 'paid',           daysAgoCreated: 35 },
        { vendor: 'Ooredoo Tunisie',    amount: 55,  status: 'approved',       daysAgoCreated: 20 },
        { vendor: 'Carrefour Market',   amount: 340, status: 'pending_review', daysAgoCreated: 10 },
        { vendor: 'Pharmacie Centrale', amount: 120, status: 'draft',          daysAgoCreated: 5  },
        { vendor: 'Orange Tunisie',     amount: 75,  status: 'paid',           daysAgoCreated: 60 },
      ];

      for (let i = 0; i < personalInvoices.length; i++) {
        const inv = personalInvoices[i];
        const invNum    = `PERS-${String(2025001 + i).padStart(6, '0')}`;
        const createdAt = daysAgo(inv.daysAgoCreated);
        const dueDate   = daysAgo(inv.daysAgoCreated - 15);

        const invRes = await client.query(
          `INSERT INTO invoices
             (workspace_id, created_by, vendor_name, invoice_number, invoice_date,
              due_date, amount, currency, current_status, category, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'TND',$8,'Other',$9) RETURNING id`,
          [personalWs.id, user.id, inv.vendor, invNum, createdAt, dueDate,
           inv.amount, inv.status, createdAt]
        );
        const invoiceId = invRes.rows[0].id;

        await client.query(
          `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'draft',$3)`,
          [invoiceId, user.id, createdAt]
        );
        if (inv.status === 'paid') {
          await client.query(
            `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'paid',$3)`,
            [invoiceId, user.id, daysAgo(inv.daysAgoCreated - 3)]
          );
        }
        if (inv.status === 'approved') {
          await client.query(
            `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'approved',$3)`,
            [invoiceId, user.id, daysAgo(inv.daysAgoCreated - 2)]
          );
        }
        if (inv.status === 'pending_review') {
          await client.query(
            `INSERT INTO status_history (invoice_id, changed_by, status, changed_at) VALUES ($1,$2,'pending_review',$3)`,
            [invoiceId, user.id, daysAgo(inv.daysAgoCreated - 1)]
          );
        }

        console.log(`  🧾 ${invNum} — ${inv.vendor} — ${inv.amount} TND [${inv.status}]`);
      }
    }

    console.log('\n✅ Seeding complete!');
    console.log('🔑 All fake member passwords: Demo1234!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
