import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { findUserByToken } from '../auth.js';
import { readMemory, writeMemory } from '../store.js';
import { summarizeForMemory, tagTopics } from '../comfortEngine.js';
import { logError, logInfo, logOk, logWarn } from '../log.js';

export const memoryRouter = Router();
const HARD_CAP = 40;

function requireUser(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const user = findUserByToken(token);
  if (!user) {
    logWarn('[memory] 인증 필요');
    res.status(401).json({ error: '인증 필요' });
    return null;
  }
  return user;
}

memoryRouter.get('/', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const db = readMemory();
  const capsule = db.capsules[user.id] || { userId: user.id, items: [] };
  const items = [...capsule.items].sort((a, b) => (b.salience || 0) - (a.salience || 0));
  logInfo('[memory:list]', { userId: user.id, count: items.length });
  res.json({ items, context: items.filter((i) => !i.muted).slice(0, 4) });
});

memoryRouter.post('/', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const { transcript, sourceSessionId } = req.body || {};
  if (!transcript) {
    logError('[memory:save] transcript 없음');
    return res.status(400).json({ error: 'transcript 필요' });
  }

  const tags = tagTopics(transcript);
  const { label, summary, type } = summarizeForMemory(transcript, tags);
  logInfo('[memory:save]', { userId: user.id, label, tags, sourceSessionId });
  const db = readMemory();
  if (!db.capsules[user.id]) db.capsules[user.id] = { userId: user.id, items: [] };
  const capsule = db.capsules[user.id];

  const existing = capsule.items.find((i) => i.label === label && !i.muted);
  if (existing) {
    // Merge memory: keep newer summary, bump salience, preserve first-seen date
    existing.summary = summary;
    existing.salience = Math.min(1, (existing.salience || 0.5) + 0.12);
    existing.updatedAt = new Date().toISOString();
    existing.sourceSessionId = sourceSessionId || existing.sourceSessionId;
    if (!existing.createdAt) existing.createdAt = existing.updatedAt;
  } else {
    const now = new Date().toISOString();
    capsule.items.push({
      id: uuid(),
      createdAt: now,
      updatedAt: now,
      sourceSessionId: sourceSessionId || null,
      type,
      label,
      summary,
      salience: 0.55,
      userPinned: false,
      muted: false,
    });
  }

  // Soft decay for untouched items so recent topics surface
  for (const item of capsule.items) {
    if (item.label !== label && !item.userPinned && !item.muted) {
      item.salience = Math.max(0.15, (item.salience || 0.5) * 0.97);
    }
  }

  capsule.items.sort((a, b) => (b.salience || 0) - (a.salience || 0));
  if (capsule.items.length > HARD_CAP) {
    capsule.items = capsule.items.slice(0, HARD_CAP);
  }
  db.capsules[user.id] = capsule;
  writeMemory(db);
  logOk('[memory:save] done', { label, count: capsule.items.length });
  res.json({ item: capsule.items[0], items: capsule.items });
});

memoryRouter.delete('/:id', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const db = readMemory();
  const capsule = db.capsules[user.id];
  if (!capsule) {
    logWarn('[memory:delete] capsule 없음', { userId: user.id });
    return res.json({ items: [] });
  }
  const before = capsule.items.length;
  capsule.items = capsule.items.filter((i) => i.id !== req.params.id);
  writeMemory(db);
  logOk('[memory:delete]', { userId: user.id, id: req.params.id, before, after: capsule.items.length });
  res.json({ items: capsule.items });
});

memoryRouter.delete('/', (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const db = readMemory();
  const before = db.capsules[user.id]?.items?.length || 0;
  db.capsules[user.id] = { userId: user.id, items: [] };
  writeMemory(db);
  logOk('[memory:clear]', { userId: user.id, cleared: before });
  res.json({ items: [] });
});
