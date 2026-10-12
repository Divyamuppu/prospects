import { neon } from '@neondatabase/serverless';
export const sql = neon(process.env.DATABASE_URL);
export const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
