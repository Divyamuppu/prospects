import { getStore } from '@netlify/blobs';
export default async (req) => {
  const path = new URL(req.url).searchParams.get('path') || '';
  const r = await getStore('atom-docs').getWithMetadata(path, { type: 'arrayBuffer' });
  if (!r) return new Response('Not found', { status: 404 });
  const name = path.split('/').pop().replace(/^\d+-/, '');
  return new Response(r.data, { headers: { 'Content-Type': r.metadata?.type || 'application/octet-stream', 'Content-Disposition': 'inline; filename="' + name + '"', 'Cache-Control': 'private, max-age=3600' } });
};
export const config = { path: '/api/file' };
