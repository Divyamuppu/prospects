import { sql, json } from './_db.mjs';
export default async (req) => {
  try {
    const { rows } = await req.json();
    for (const r of rows || []) await sql`insert into atom_mail (to_email, to_name, subject, body) values (${r.to_email}, ${r.to_name || ''}, ${r.subject || ''}, ${r.body || ''})`;
    return json({ ok: true });
  } catch (e) { return json({ error: String(e.message || e) }, 500); }
};
export const config = { path: '/api/mail' };
