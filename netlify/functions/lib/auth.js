import crypto from 'node:crypto';

const COOKIE_NAME = 'dinto_hub_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is not set');
  return secret;
}

function sign(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

// ---- Passwords (scrypt, built into Node — no extra dependency) ----

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---- Sessions (signed, httpOnly cookie — no server-side session store needed) ----

export function createSessionCookie(payload) {
  const body = { ...payload, exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = sign(encoded);
  const token = `${encoded}.${signature}`;
  const secure = process.env.CONTEXT !== 'dev' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.CONTEXT !== 'dev' ? '; Secure' : '';
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return out;
}

export function getSession(request) {
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload; // { username, role: 'admin' | 'viewer' }
}

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}
