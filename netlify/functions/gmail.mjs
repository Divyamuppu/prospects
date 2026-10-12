import { sql, json } from './_db.mjs';
const CID = process.env.GOOGLE_CLIENT_ID || '';
const SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const DOMAIN = (process.env.ALLOWED_DOMAIN || '').toLowerCase();
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const hdr = (s) => '=?UTF-8?B?' + b64(s) + '?=';

async function googleToken(params) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CID, client_secret: SECRET, ...params }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'token_error');
  return j;
}

export default async (req) => {
  try {
    const body = await req.json();
    if (body.action === 'connect') {
      const t = await googleToken({ code: body.code, grant_type: 'authorization_code', redirect_uri: 'postmessage' });
      const me = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + t.access_token } }).then(r => r.json());
      const email = String(me.email || '').toLowerCase();
      if (!email) return json({ error: 'no_email' }, 400);
      if (DOMAIN && !email.endsWith('@' + DOMAIN)) return json({ error: 'Only @' + DOMAIN + ' accounts can connect' }, 403);
      if (t.refresh_token) {
        await sql`insert into gmail_tokens (email, name, refresh_token, updated_at) values (${email}, ${me.name || ''}, ${t.refresh_token}, now())
                  on conflict (email) do update set name = excluded.name, refresh_token = excluded.refresh_token, updated_at = now()`;
      } else {
        const rows = await sql`select email from gmail_tokens where email = ${email}`;
        if (!rows.length) return json({ error: 'no_refresh' }, 400);
      }
      return json({ email, name: me.given_name || me.name || '' });
    }
    if (body.action === 'disconnect') {
      await sql`delete from gmail_tokens where email = ${String(body.from || '').toLowerCase()}`;
      return json({ ok: true });
    }
    if (body.action === 'send') {
      const from = String(body.from || '').toLowerCase();
      const rows = await sql`select refresh_token from gmail_tokens where email = ${from}`;
      if (!rows.length) return json({ error: 'not_connected' }, 401);
      let access;
      try { access = (await googleToken({ refresh_token: rows[0].refresh_token, grant_type: 'refresh_token' })).access_token; }
      catch (e) {
        if (String(e.message) === 'invalid_grant') { await sql`delete from gmail_tokens where email = ${from}`; return json({ error: 'not_connected' }, 401); }
        throw e;
      }
      const to = (body.to || []).filter(r => r && r.email);
      if (!to.length) return json({ error: 'no_recipients' }, 400);
      const raw = [
        'From: ' + hdr(body.fromName || from) + ' <' + from + '>',
        'To: ' + to.map(r => hdr(r.name || r.email) + ' <' + r.email + '>').join(', '),
        'Subject: ' + hdr(body.subject || 'Atom Prospects'),
        'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '',
        b64(body.text || ''),
      ].join('\r\n');
      const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST', headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url') }),
      });
      if (!r.ok) return json({ error: 'gmail: ' + (await r.text()).slice(0, 200) }, 502);
      return json({ ok: true });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) { return json({ error: String(e.message || e) }, 500); }
};
export const config = { path: '/api/gmail' };
