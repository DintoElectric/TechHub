import { getStore } from '@netlify/blobs';
import { verifyPassword, timingSafeStringEqual, createSessionCookie, jsonResponse } from './lib/auth.js';

export default async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  const body = await req.json().catch(() => ({}));
  const { username, password } = body;
  if (!username || !password) {
    return jsonResponse({ error: 'Username and password required' }, { status: 400 });
  }

  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (adminUser && adminPass && username === adminUser && timingSafeStringEqual(password, adminPass)) {
    const cookie = createSessionCookie({ username, role: 'admin' });
    return jsonResponse({ username, role: 'admin' }, { headers: { 'Set-Cookie': cookie } });
  }

  const store = getStore('dinto-hub');
  const viewers = (await store.get('viewers', { type: 'json' })) || [];
  const viewer = viewers.find((v) => v.username.toLowerCase() === String(username).toLowerCase());
  if (viewer && verifyPassword(password, viewer.passwordHash)) {
    const cookie = createSessionCookie({ username: viewer.username, role: 'viewer' });
    return jsonResponse({ username: viewer.username, role: 'viewer' }, { headers: { 'Set-Cookie': cookie } });
  }

  return jsonResponse({ error: 'Invalid username or password' }, { status: 401 });
};

export const config = { path: '/api/login' };
