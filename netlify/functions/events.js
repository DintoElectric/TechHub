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

  // Reading the calendar is public (both public visitors and logged-in
  // users see it); only writes require any logged-in account.
  if (req.method === 'GET') {
    const events = await loadEvents(store);
    return jsonResponse({ events });
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
    const event = {
      id: crypto.randomUUID(),
      date: body.date,
      title: body.title,
      notes: body.notes || '',
      createdBy: session.username,
    };
    events.push(event);
