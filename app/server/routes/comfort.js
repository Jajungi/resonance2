import { Router } from 'express';
import { runComfortEngine } from '../comfortEngine.js';
import { logError, logInfo, logOk } from '../log.js';

export const comfortRouter = Router();

comfortRouter.post('/', async (req, res) => {
  const started = Date.now();
  const id = req._logId || '-';
  try {
    const { transcript, tradition, memory, locale, history } = req.body || {};
    logInfo(`[comfort:${id}] body`, {
      tradition: tradition || 'common',
      transcriptLen: String(transcript || '').length,
      memoryCount: Array.isArray(memory) ? memory.length : 0,
      historyCount: Array.isArray(history) ? history.length : 0,
      locale,
    });

    if (!transcript || !String(transcript).trim()) {
      logError(`[comfort:${id}] 빈 transcript`);
      return res.status(400).json({ error: '말씀이 비어 있습니다.' });
    }

    const result = await runComfortEngine({
      transcript: String(transcript).slice(0, 2000),
      tradition: tradition || 'common',
      memory: Array.isArray(memory) ? memory : [],
      history: Array.isArray(history) ? history.slice(-8) : [],
      locale,
    });

    logOk(`[comfort:${id}] ${Date.now() - started}ms`, {
      provider: result.provider,
      risk: result.risk,
      tags: result.tags,
      reflectionPreview: String(result.reflection || '').slice(0, 40),
    });
    res.json(result);
  } catch (e) {
    logError(`[comfort:${id}] 처리 실패`, e);
    res.json({
      reflection: '듣고 있습니다.',
      comfort: '연결이 잠시 끊겼습니다. 다시 말씀해 주십시오.',
      followup_invite: '한 번 더 말씀해 주십시오.',
      risk: 0,
      tags: ['마음'],
      provider: 'fallback',
    });
  }
});
