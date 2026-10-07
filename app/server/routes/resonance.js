import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { readResonance, writeResonance } from '../store.js';
import { tagTopics } from '../comfortEngine.js';
import { logError, logInfo, logOk } from '../log.js';

export const resonanceRouter = Router();

resonanceRouter.post('/match', (req, res) => {
  const { tags = [], text = '' } = req.body || {};
  const pool = readResonance().clips || [];
  const want = tags.length ? tags : tagTopics(text);
  logInfo('[resonance:match]', { want, poolSize: pool.length, textLen: String(text).length });
  let best = null;
  let score = -1;
  for (const clip of pool) {
    const s = (clip.tags || []).filter((t) => want.includes(t)).length;
    if (s > score) {
      score = s;
      best = clip;
    }
  }
  if (!best && pool.length) best = pool[Math.floor(Math.random() * pool.length)];
  logOk('[resonance:match] result', { score, clipId: best?.id, hasClip: Boolean(best) });
  res.json({ clip: best, matchedTags: want });
});

resonanceRouter.post('/share', (req, res) => {
  const { text } = req.body || {};
  if (!text) {
    logError('[resonance:share] text 없음');
    return res.status(400).json({ error: 'text 필요' });
  }
  const anonymized = String(text)
    .replace(/[0-9]{2,}/g, '')
    .replace(/(나는|제가|제\s*이름)/g, '어떤 분이')
    .slice(0, 120);
  const tags = tagTopics(text);
  const db = readResonance();
  const clip = {
    id: uuid(),
    tags,
    text: anonymized || '오늘도 여기 와서 말씀을 남기셨습니다.',
    ttlHint: '14d',
  };
  db.clips = db.clips || [];
  db.clips.unshift(clip);
  db.clips = db.clips.slice(0, 80);
  writeResonance(db);
  logOk('[resonance:share]', { clipId: clip.id, tags });
  res.json({ clip });
});
