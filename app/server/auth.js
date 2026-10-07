import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { readMemory, writeMemory } from './store.js';

function hashPhone(phone) {
  const normalized = String(phone).replace(/\D/g, '');
  return createHash('sha256').update(`resonance:${normalized}`).digest('hex');
}

function hashPin(pin, salt) {
  return scryptSync(String(pin), salt, 32).toString('hex');
}

function verifyPin(pin, salt, expected) {
  const got = Buffer.from(hashPin(pin, salt), 'hex');
  const exp = Buffer.from(expected, 'hex');
  if (got.length !== exp.length) return false;
  return timingSafeEqual(got, exp);
}

export function createToken() {
  return randomBytes(24).toString('hex');
}

export function findUserByToken(token) {
  if (!token) return null;
  const db = readMemory();
  return Object.values(db.users).find((u) => u.token === token) || null;
}

export async function registerOrLogin({ phone, pin, displayName }) {
  const db = readMemory();
  const phoneHash = hashPhone(phone);
  let user = db.users[phoneHash];

  if (!user) {
    const salt = randomBytes(8).toString('hex');
    user = {
      id: phoneHash.slice(0, 16),
      phoneHash,
      pinSalt: salt,
      pinHash: hashPin(pin, salt),
      displayName: displayName || '행인',
      preferredTradition: 'common',
      a11yPrefs: { fontScale: 1, contrast: false, ttsRate: 0.85 },
      consent: { memory: true, resonancePool: false, crisisShare: true },
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      token: createToken(),
    };
    db.users[phoneHash] = user;
    if (!db.capsules[user.id]) {
      db.capsules[user.id] = { userId: user.id, items: [] };
    }
    writeMemory(db);
    return { user: publicUser(user), created: true };
  }

  if (!verifyPin(pin, user.pinSalt, user.pinHash)) {
    const err = new Error('PIN이 맞지 않습니다.');
    err.status = 401;
    throw err;
  }

  user.lastSeenAt = new Date().toISOString();
  user.token = createToken();
  if (displayName) user.displayName = displayName;
  db.users[phoneHash] = user;
  writeMemory(db);
  return { user: publicUser(user), created: false };
}

export function publicUser(user) {
  return {
    id: user.id,
    displayName: user.displayName,
    preferredTradition: user.preferredTradition,
    a11yPrefs: user.a11yPrefs,
    consent: user.consent,
    token: user.token,
    lastSeenAt: user.lastSeenAt,
  };
}
