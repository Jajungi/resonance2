import { Router } from 'express';
import { logError, logInfo, logOk } from '../log.js';

export const sttRouter = Router();

const JUNK = /^(감사합니다|시청해\s*주셔서\s*감사합니다|구독|좋아요|다음\s*영상)[.!…\s]*$/;

sttRouter.post('/', async (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    logError('[stt] GROQ_API_KEY 없음');
    return res.status(503).json({ error: 'GROQ_API_KEY 없음' });
  }
  const b64 = req.body?.audio;
  if (!b64 || typeof b64 !== 'string') {
    logError('[stt] audio 필드 없음', { keys: Object.keys(req.body || {}) });
    return res.status(400).json({ error: '녹음 데이터가 서버에 없습니다.' });
  }
  let buf;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch (e) {
    logError('[stt] base64 깨짐', e);
    return res.status(400).json({ error: '녹음 형식이 깨졌습니다.' });
  }
  if (!buf.length) {
    logError('[stt] 0바이트');
    return res.status(400).json({ error: '녹음이 비어 있습니다.' });
  }
  const mime = String(req.body?.mime || 'audio/webm').split(';')[0];
  const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
  logInfo('[stt] whisper 요청', { bytes: buf.length, mime });
  try {
    const form = new FormData();
    form.append('file', new Blob([buf], { type: mime }), `speech.${ext}`);
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'ko');
    form.append('response_format', 'json');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const raw = await r.text();
    if (!r.ok) {
      const detail = raw.slice(0, 280);
      logError('[stt] Groq 실패', { status: r.status, detail });
      return res.status(502).json({ error: `받아쓰기 실패 (${r.status}) ${detail}` });
    }
    const data = JSON.parse(raw);
    let text = String(data.text || '').replace(/\s+/g, ' ').trim();
    if (buf.length < 4000 && (JUNK.test(text) || !text)) {
      logError('[stt] 무음 녹음', { bytes: buf.length, text });
      return res.status(422).json({
        error: `녹음이 무음입니다 (${buf.length}바이트). 마이크 입력이 거의 비어 있습니다.`,
      });
    }
    if (JUNK.test(text)) text = '';
    logOk('[stt] 결과', { chars: text.length, preview: text.slice(0, 60) || '(빈 문자열)' });
    res.json({ text });
  } catch (e) {
    logError('[stt] 예외', e);
    res.status(502).json({ error: e.message || '음성 인식 요청 실패' });
  }
});
