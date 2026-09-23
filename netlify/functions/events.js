import { getStore } from '@netlify/blobs';
import { getSession, jsonResponse } from './lib/auth.js';

const STORE = 'dinto-hub';
const KEY = 'events';

async function loadEvents(store) {
  return (await store.get(KEY, { type: 'json' })) || [];
}

function isValidDate(str) {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

export default async (req) => {
  const store = getStore(STORE);
  const session = getSession(req);

  // Events are private per account. Public visitors get an empty list
  // (the calendar grid itself stays visible and browsable, just with no dots).
  if (req.method === 'GET') {
    if (!session) return jsonResponse({ events: [] });
    const events = await loadEvents(store);
    return jsonResponse({ events: events.filter((e) => e.owner === session.username) });
  }

  if (!session) {
    return jsonResponse({ error: 'Login required' }, { status: 403 });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!isValidDate(body.date) || !body.title) {
      return jsonResponse({ error: 'date (YYYY-MM-DD) and title are required' }, { status: 400 });
    }
    const events = await loadEvents(store);
    events.push({
      id: crypto.randomUUID(),
      date: body.date,
      title: body.title,
      notes: body.notes || '',
      owner: session.username,
    });
    await store.setJSON(KEY, events);
    return jsonResponse({ events: events.filter((e) => e.owner === session.username) });
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    if (!body.id) return jsonResponse({ error: 'id is required' }, { status: 400 });
    const events = await loadEvents(store);
    const idx = events.findIndex((e) => e.id === body.id && e.owner === session.username);
    if (idx === -1) return jsonResponse({ error: 'Event not found' }, { status: 404 });
    events[idx] = {
      ...events[idx],
      date: isValidDate(body.date) ? body.date : events[idx].date,
      title: body.title ?? events[idx].title,
      notes: body.notes ?? events[idx].notes,
    };
    await store.setJSON(KEY, events);
    return jsonResponse({ events: events.filter((e) => e.owner === session.username) });
  }

  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    if (!body.id) return jsonResponse({ error: 'id is required' }, { status: 400 });
    const events = await loadEvents(store);
    const target = events.find((e) => e.id === body.id);
    if (!target || target.owner !== session.username) {
      return jsonResponse({ error: 'Event not found' }, { status: 404 });
    }
    const next = events.filter((e) => e.id !== body.id);
    await store.setJSON(KEY, next);
    return jsonResponse({ events: next.filter((e) => e.owner === session.username) });
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
};

export const config = { path: '/api/events' };
