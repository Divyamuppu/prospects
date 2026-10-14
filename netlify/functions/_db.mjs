import { neon } from '@neondatabase/serverless';
// Accepts a clean URL, or a pasted snippet like: DATABASE_URL='postgresql://…'
const raw = String(process.env.DATABASE_URL || '');
const m = raw.match(/postgres(?:ql)?:\/\/[^\s'"]+/);
const url = m ? m[0].replace(/\\u0026/g, '&') : raw.trim();
export const sql = neon(url);
export const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
