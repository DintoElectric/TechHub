import { getStore } from '@netlify/blobs';
import { getSession, jsonResponse } from './lib/auth.js';

const STORE = 'dinto-hub';
const KEY = 'apps';

const DEFAULT_APPS = [
  { id: 'tool-tracker', name: 'Dinto Tool Tracker', url: 'https://dintotool.netlify.app/', blurb: 'Tracks Tools', status: 'Beta' },
  { id: 'as-built-viewer', name: 'Dinto As-Built Viewer', url: 'https://asbuiltviewer.netlify.app/', blurb: 'Views As-Builts and Panel Schedules', status: 'Live' },
  { id: 'delivery', name: 'Dinto Delivery', url: 'https://dintodelivery.netlify.app/', blurb: 'Schedule pickups and deliveries', status: 'Beta' },
  { id: 'prefab-catalog', name: 'Dinto Prefab Catalog', url: 'https://prefabcatalog.netlify.app/', blurb: 'Request prefabs', status: 'Beta' },
];

async function loadApps(store) {
  const apps = await store.get(KEY, { type: 'json' });
  if (apps) return apps;
  await store.setJSON(KEY, DEFAULT_APPS);
  return DEFAULT_APPS;
}

export default async (req) => {
  const store = getStore(STORE);
  const session = getSession(req);

  if (req.method === 'GET') {
    const apps = await loadApps(store);
    const visible = session ? apps : apps.filter((a) => a.status === 'Live');
    return jsonResponse({ apps: visible, role: session?.role || null, username: session?.username || null });
  }

  if (!session || session.role !== 'admin') {
    return jsonResponse({ error: 'Admin login required' }, { status: 403 });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.name || !body.url) return jsonResponse({ error: 'name and url are required' }, { status: 400 });
    const apps = await loadApps(store);
    const app = {
      id: crypto.randomUUID(),
      name: body.name,
      url: body.url,
      blurb: body.blurb || '',
      status: body.status === 'Live' ? 'Live' : 'Beta',
    };
    apps.push(app);
    await store.setJSON(KEY, apps);
    return jsonResponse({ apps });
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    if (!body.id) return jsonResponse({ error: 'id is required' }, { status: 400 });
    const apps = await loadApps(store);
    const idx = apps.findIndex((a) => a.id === body.id);
    if (idx === -1) return jsonResponse({ error: 'App not found' }, { status: 404 });
    apps[idx] = {
      ...apps[idx],
      name: body.name ?? apps[idx].name,
      url: body.url ?? apps[idx].url,
      blurb: body.blurb ?? apps[idx].blurb,
      status: body.status === 'Live' || body.status === 'Beta' ? body.status : apps[idx].status,
    };
    await store.setJSON(KEY, apps);
    return jsonResponse({ apps });
  }

  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    if (!body.id) return jsonResponse({ error: 'id is required' }, { status: 400 });
    const apps = await loadApps(store);
    const next = apps.filter((a) => a.id !== body.id);
    await store.setJSON(KEY, next);
    return jsonResponse({ apps: next });
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
};

export const config = { path: '/api/apps' };
