import { getStore } from '@netlify/blobs';
import { getSession, jsonResponse } from './lib/auth.js';

const STORE = 'dinto-hub';
const KEY = 'apps';

const DEFAULT_APPS = [
  { id: 'tool-tracker', name: 'Dinto Tool Tracker', url: 'https://dintotool.netlify.app/', blurb: 'Tracks Tools', status: 'Beta' },
  { id: 'as-built-viewer', name: 'Dinto As-Built Viewer', url: 'https://asbuiltviewer.netlify.app/', blurb: 'Views As-Builts and Panel Schedules', status: 'Live' },
  { id: 'delivery', name: 'Dinto Delivery', url: 'https://dintodelivery.netlify.app/', blurb: 'Schedule pickups and deliveries', status: 'Beta' },
  { id: 'prefab-catalog', name: 'Dinto Prefab Catalog', url: 'https://prefabcatalog.netlify.app/', blurb: 'Request prefabs', status: 'Beta' },
  { id: 'procore', name: 'Procore', url: 'https://login.procore.com/?cookies_enabled=true', blurb: 'Procore login', status: 'Live' },
];

async function loadApps(store) {
  const apps = await store.get(KEY, { type: 'json' });
  if (apps) return apps;
  await store.setJSON(KEY, DEFAULT_APPS);
  return DEFAULT_APPS;
}

export default async (req) => {
  // Strong consistency: always read the latest saved list, never a stale cached copy.
  const store = getStore({ name: STORE, consistency: 'strong' });
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
      logo: body.logo || '',
      logoFit: body.logoFit === 'cover' ? 'cover' : 'contain',
    };
    apps.push(app);
    await store.setJSON(KEY, apps);
    return jsonResponse({ apps });
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const apps = await loadApps(store);

    // Reorder: body.order is a list of app ids in the desired order.
    if (Array.isArray(body.order)) {
      const byId = new Map(apps.map((a) => [a.id, a]));
      const ordered = [];
      for (const id of body.order) {
        if (byId.has(id)) {
          ordered.push(byId.get(id));
          byId.delete(id);
        }
      }
      // Anything not mentioned (e.g. an app added in another tab) keeps a place at the end.
      for (const a of byId.values()) ordered.push(a);
      await store.setJSON(KEY, ordered);
      return jsonResponse({ apps: ordered });
    }

    if (!body.id) return jsonResponse({ error: 'id is required' }, { status: 400 });
    const idx = apps.findIndex((a) => a.id === body.id);
    if (idx === -1) return jsonResponse({ error: 'App not found' }, { status: 404 });
    apps[idx] = {
      ...apps[idx],
      name: body.name ?? apps[idx].name,
      url: body.url ?? apps[idx].url,
      blurb: body.blurb ?? apps[idx].blurb,
      status: body.status === 'Live' || body.status === 'Beta' ? body.status : apps[idx].status,
      logo: body.logo ?? apps[idx].logo ?? '',
      logoFit: body.logoFit === 'cover' || body.logoFit === 'contain' ? body.logoFit : (apps[idx].logoFit || 'contain'),
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
