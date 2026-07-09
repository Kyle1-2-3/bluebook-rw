import HTML from './index.html';
import { mergeState } from './sync.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'Content-Type',
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/api/sync') {
      if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });
      const key = url.searchParams.get('key') || '';
      if (!/^[\w-]{4,64}$/.test(key)) return new Response('Unauthorized', { status: 401, headers: CORS });
      let client;
      try { client = await req.json(); } catch { return new Response('Bad request', { status: 400, headers: CORS }); }
      const server = JSON.parse((await env.STATE.get('state:' + key)) || 'null');
      const merged = mergeState(server, client);
      await env.STATE.put('state:' + key, JSON.stringify(merged));
      return new Response(JSON.stringify(merged), { headers: { 'content-type': 'application/json', ...CORS } });
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    return new Response('Not found', { status: 404 });
  },
};
