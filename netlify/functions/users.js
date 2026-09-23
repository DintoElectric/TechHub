import { getStore } from '@netlify/blobs';
import { getSession, hashPassword, jsonResponse } from './lib/auth.js';

const STORE = 'dinto-hub';
const KEY = 'viewers';

async function loadViewers(store) {
  return (await store.get(KEY, { type: 'json' })) || [];
}

function publicView(viewers) {
  return viewers.map((v) => ({ username: v.username, createdAt: v.createdAt }));
}

export default async (req) => {
  const session = getSession(req);
  if (!session || session.role !== 'admin') {
    return jsonResponse({ error: 'Admin login required' }, { status: 403 });
  }
  const store = getStore(STORE);

  if (req.method === 'GET') {
    const viewers = await loadViewers(store);
    return jsonResponse({ viewers: publicView(viewers) });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.username || !body.password) {
      return jsonResponse({ error: 'username and password are required' }, { status: 400 });
    }
    if (body.password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    const viewers = await loadViewers(store);
    if (viewers.some((v) => v.username.toLowerCase() === body.username.toLowerCase())) {
      return jsonResponse({ error: 'That username already exists' }, { status: 409 });
    }
    viewers.push({
      username: body.username,
      passwordHash: hashPassword(body.password),
      createdAt: new Date().toISOString(),
    });
    await store.setJSON(KEY, viewers);
    return jsonResponse({ viewers: publicView(viewers) });
  }

  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    if (!body.username) return jsonResponse({ error: 'username is required' }, { status: 400 });
    const viewers = await loadViewers(store);
    const next = viewers.filter((v) => v.username.toLowerCase() !== body.username.toLowerCase());
    await store.setJSON(KEY, next);
    return jsonResponse({ viewers: publicView(next) });
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
};

export const config = { path: '/api/users' };
