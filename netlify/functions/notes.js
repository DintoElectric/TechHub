import { getStore } from '@netlify/blobs';
import { getSession, jsonResponse } from './lib/auth.js';

const STORE = 'dinto-hub';
const KEY = 'notes';

async function loadNotes(store) {
  return (await store.get(KEY, { type: 'json' })) || [];
}

export default async (req) => {
  const session = getSession(req);

  if (!session) {
    if (req.method === 'GET') return jsonResponse({ notes: [] });
    return jsonResponse({ error: 'Login required' }, { status: 403 });
  }

  const store = getStore(STORE);

  if (req.method === 'GET') {
    const notes = await loadNotes(store);
    return jsonResponse({ notes: notes.filter((n) => n.owner === session.username) });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.text || !body.text.trim()) {
      return jsonResponse({ error: 'text is required' }, { status: 400 });
    }
    const notes = await loadNotes(store);
    notes.push({
      id: crypto.randomUUID(),
      text: body.text.trim(),
      owner: session.username,
      createdAt: new Date().toISOString(),
    });
    await store.setJSON(KEY, notes);
    return jsonResponse({ notes: notes.filter((n) => n.owner === session.username) });
  }

  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    if (!body.id) return jsonResponse({ error: 'id is required' }, { status: 400 });
    const notes = await loadNotes(store);
    const target = notes.find((n) => n.id === body.id);
    if (!target || target.owner !== session.username) {
      return jsonResponse({ error: 'Note not found' }, { status: 404 });
    }
    const next = notes.filter((n) => n.id !== body.id);
    await store.setJSON(KEY, next);
    return jsonResponse({ notes: next.filter((n) => n.owner === session.username) });
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
};

export const config = { path: '/api/notes' };
