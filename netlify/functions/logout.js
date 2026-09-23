import { clearSessionCookie, jsonResponse } from './lib/auth.js';

export default async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  return jsonResponse({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
};

export const config = { path: '/api/logout' };
