import { Router } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { EdgeTTS } from 'node-edge-tts';
import { logError, logInfo, logOk } from '../log.js';

export const ttsRouter = Router();

/** Microsoft Edge neural voice — ko-KR-SunHiNeural (node-edge-tts) */
function makeTts() {
  return new EdgeTTS({
    voice: 'ko-KR-SunHiNeural',
    lang: 'ko-KR',
    rate: '-10%',
    timeout: 15000,
    saveSubtitles: false,
  });
}

ttsRouter.post('/', async (req, res) => {
  const text = String(req.body?.text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
  if (!text) {
    logError('[tts] text 없음');
    return res.status(400).json({ error: 'text 필요' });
  }
  const file = path.join(os.tmpdir(), `resonance-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);
  const t0 = Date.now();
  logInfo('[tts] 생성', { chars: text.length });
  try {
    await makeTts().ttsPromise(text, file);
    const buf = await fs.readFile(file);
    if (!buf.length) throw new Error('TTS 오디오가 비었습니다');
    logOk('[tts] ok', { bytes: buf.length, ms: Date.now() - t0 });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buf);
  } catch (e) {
    logError('[tts] 실패', e);
    res.status(502).json({ error: '음성 생성 실패' });
  } finally {
    fs.unlink(file).catch(() => {});
  }
});
