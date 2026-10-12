import { sql, json } from './_db.mjs';

export default async (req) => {
  try {
    if (req.method === 'GET') {
      const u = new URL(req.url);
      const since = u.searchParams.get('since');
      const keys = u.searchParams.get('keys');
      let rows;
      if (since) rows = await sql`select key, data, updated_at from atom_board where updated_at > ${since}::timestamptz order by updated_at`;
      else if (keys) rows = await sql`select key, data, updated_at from atom_board where key = any(${keys.split(',')})`;
      else rows = await sql`select key, data, updated_at from atom_board`;
      return json(rows.map(r => ({ ...r, updated_at: new Date(r.updated_at).toISOString() })));
    }
    if (req.method === 'POST') {
      const { rows } = await req.json();
      if (!Array.isArray(rows) || !rows.length) return json({ ok: true });
      for (const r of rows) {
        if (!r || typeof r.key !== 'string') continue;
        await sql`insert into atom_board (key, data, updated_at) values (${r.key}, ${JSON.stringify(r.data ?? null)}::jsonb, clock_timestamp())
                  on conflict (key) do update set data = excluded.data, updated_at = clock_timestamp()`;
      }
      return json({ ok: true });
    }
    return json({ error: 'method' }, 405);
  } catch (e) { return json({ error: String(e.message || e) }, 500); }
};
export const config = { path: '/api/board' };
