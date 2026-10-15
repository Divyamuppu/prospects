import webpush from 'web-push';
import { sql, json } from './_db.mjs';

webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_CONTACT || 'admin@atomcontent.in'),
  process.env.VAPID_PUBLIC_KEY || 'BPpiuECNyJme8a6JF6ijyARFW9QvRTn7AORwHIzY0lvkXE0kuqmK64PrYeKgPO3PuIWUqmRbFDBeDDk6s_FZBh0',
  process.env.VAPID_PRIVATE_KEY || ''
);
let ready = false;
async function init() {
  if (ready) return;
  await sql`create table if not exists push_subs (endpoint text primary key, name text not null, sub jsonb not null, updated_at timestamptz default now())`;
  ready = true;
}

export default async (req) => {
  try {
    await init();
    const b = await req.json();
    if (b.action === 'subscribe') {
      const s = b.subscription;
      if (!s || !s.endpoint || !b.name) return json({ error: 'bad subscription' }, 400);
      await sql`insert into push_subs (endpoint, name, sub, updated_at) values (${s.endpoint}, ${String(b.name).trim()}, ${JSON.stringify(s)}::jsonb, now())
                on conflict (endpoint) do update set name = excluded.name, sub = excluded.sub, updated_at = now()`;
      return json({ ok: true });
    }
    if (b.action === 'unsubscribe') {
      await sql`delete from push_subs where endpoint = ${b.endpoint}`;
      return json({ ok: true });
    }
    if (b.action === 'send') {
      const names = (b.to || []).map(n => String(n).trim().toLowerCase()).filter(Boolean);
      if (!names.length) return json({ ok: true, sent: 0 });
      const rows = await sql`select endpoint, sub, name from push_subs where lower(trim(name)) = any(${names}) or lower(split_part(trim(name), ' ', 1)) = any(${names})`;
      const payload = JSON.stringify({ title: b.title || 'Work in Prospects', body: b.body || '', url: b.url || '/', tag: b.tag });
      let sent = 0;
      await Promise.all(rows.map(async r => {
        try { await webpush.sendNotification(r.sub, payload, { TTL: 86400, urgency: 'high' }); sent++; }
        catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await sql`delete from push_subs where endpoint = ${r.endpoint}`; }
      }));
      return json({ ok: true, sent });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) { return json({ error: String(e.message || e) }, 500); }
};
export const config = { path: '/api/push' };
