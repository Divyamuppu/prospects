import { getStore } from '@netlify/blobs';
import { json } from './_db.mjs';
export default async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    const path = new URL(req.url).searchParams.get('path') || '';
    if (!path || path.includes('..')) return json({ error: 'bad path' }, 400);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 20 * 1024 * 1024) return json({ error: 'File too large (max 20 MB)' }, 413);
    await getStore('atom-docs').set(path, buf, { metadata: { type: req.headers.get('content-type') || 'application/octet-stream' } });
    return json({ ok: true, path });
  } catch (e) { return json({ error: String(e.message || e) }, 500); }
};
export const config = { path: '/api/upload' };
