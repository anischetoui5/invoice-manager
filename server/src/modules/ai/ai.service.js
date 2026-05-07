const Groq = require('groq-sdk');
const pool = require('../../config/db');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getWorkspaceContext(workspaceId) {
  const [workspaceRes, statusRes, monthlyRes, vendorRes, recentRes] = await Promise.all([
    pool.query(
      `SELECT w.name, w.type, c.name AS company_name
       FROM workspaces w
       LEFT JOIN companies c ON c.workspace_id = w.id
       WHERE w.id = $1`,
      [workspaceId]
    ),
    pool.query(
      `SELECT current_status AS status,
              COUNT(*)::int AS count,
              COALESCE(SUM(amount), 0)::numeric AS total,
              COALESCE(AVG(amount), 0)::numeric AS avg
       FROM invoices
       WHERE workspace_id = $1
       GROUP BY current_status`,
      [workspaceId]
    ),
    pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', COALESCE(invoice_date, created_at)), 'Mon YYYY') AS month,
              COUNT(*)::int AS count,
              COALESCE(SUM(amount), 0)::numeric AS total,
              currency
       FROM invoices
       WHERE workspace_id = $1
         AND COALESCE(invoice_date, created_at) >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', COALESCE(invoice_date, created_at)), currency
       ORDER BY DATE_TRUNC('month', COALESCE(invoice_date, created_at)) DESC`,
      [workspaceId]
    ),
    pool.query(
      `SELECT vendor_name,
              COUNT(*)::int AS count,
              COALESCE(SUM(amount), 0)::numeric AS total,
              currency
       FROM invoices
       WHERE workspace_id = $1 AND vendor_name IS NOT NULL
       GROUP BY vendor_name, currency
       ORDER BY SUM(amount) DESC
       LIMIT 10`,
      [workspaceId]
    ),
    pool.query(
      `SELECT invoice_number, vendor_name, amount, currency, current_status AS status, invoice_date
       FROM invoices
       WHERE workspace_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [workspaceId]
    ),
  ]);

  const workspace = workspaceRes.rows[0];
  const stats = statusRes.rows;
  const monthly = monthlyRes.rows;
  const vendors = vendorRes.rows;
  const recent = recentRes.rows;

  const totalAll = stats.reduce((s, r) => s + parseFloat(r.total), 0);
  const countAll = stats.reduce((s, r) => s + r.count, 0);

  const statsBlock = stats.map(r =>
    `  • ${r.status}: ${r.count} invoice(s), total ${parseFloat(r.total).toLocaleString('fr-FR')} (avg ${parseFloat(r.avg).toFixed(2)})`
  ).join('\n');

  const monthlyBlock = monthly.map(r =>
    `  • ${r.month}: ${r.count} invoice(s), total ${parseFloat(r.total).toLocaleString('fr-FR')} ${r.currency || ''}`
  ).join('\n');

  const vendorBlock = vendors.map(r =>
    `  • ${r.vendor_name}: ${r.count} invoice(s), total ${parseFloat(r.total).toLocaleString('fr-FR')} ${r.currency || ''}`
  ).join('\n');

  const recentBlock = recent.map(r =>
    `  • #${r.invoice_number || 'N/A'} | ${r.vendor_name || 'Unknown'} | ${parseFloat(r.amount || 0).toLocaleString('fr-FR')} ${r.currency || ''} | ${r.status} | ${r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('fr-FR') : 'No date'}`
  ).join('\n');

  return `
WORKSPACE: ${workspace?.company_name || workspace?.name || 'Unknown'} (${workspace?.type || 'personal'})
TODAY: ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

INVOICE STATISTICS (all time):
  Total: ${countAll} invoices, cumulative amount: ${totalAll.toLocaleString('fr-FR')}
${statsBlock}

MONTHLY BREAKDOWN (last 6 months):
${monthlyBlock || '  No data'}

TOP VENDORS BY AMOUNT:
${vendorBlock || '  No vendors found'}

MOST RECENT INVOICES (last 20):
${recentBlock || '  No invoices found'}
`.trim();
}

async function chat(workspaceId, messages) {
  const context = await getWorkspaceContext(workspaceId);
  console.log('[AI context]', context.slice(0, 600));

  const systemPrompt = `You are EASYfact AI, an intelligent assistant built into EASYfact — a professional invoice management platform.

You have access to the user's real invoice data below. Use it to answer questions accurately.
Be concise, friendly, and professional. Format numbers clearly. Use bullet points for lists.
Default to English. Only switch to French if the user explicitly writes in French.
If asked something you cannot answer from the data, say so honestly.

--- LIVE DATA ---
${context}
--- END DATA ---`;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
  });

  return response.choices[0].message.content;
}

module.exports = { chat };
