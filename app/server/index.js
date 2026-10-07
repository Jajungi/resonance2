import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { comfortRouter } from './routes/comfort.js';
import { memoryRouter } from './routes/memory.js';
import { authRouter } from './routes/auth.js';
import { resonanceRouter } from './routes/resonance.js';
import { ttsRouter } from './routes/tts.js';
import { sttRouter } from './routes/stt.js';
import { logError, logInfo, logOk, logPath, logReq, logWarn } from './log.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 8787;

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use('/api', logReq);

app.get('/api/health', (_req, res) => {
  const aiDisabled =
    process.env.AI_DISABLED === '1' ||
    String(process.env.AI_DISABLED || '').toLowerCase() === 'true';
  const payload = {
    ok: true,
    ai: {
      disabled: aiDisabled,
      groq: !aiDisabled && Boolean(process.env.GROQ_API_KEY),
      ollama: !aiDisabled && Boolean(process.env.OLLAMA_BASE_URL),
    },
  };
  logInfo('[health]', payload.ai);
  res.json(payload);
});

app.use('/api/auth', authRouter);
app.use('/api/comfort', comfortRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/resonance', resonanceRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/stt', sttRouter);

const dist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(dist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) {
      logWarn('[static] client dist 없음 — npm run dev:client 필요');
      res.status(404).json({ error: 'Client not built. Run npm run dev:client' });
    }
  });
});

process.on('uncaughtException', (e) => {
  logError('[process] uncaughtException', e);
});
process.on('unhandledRejection', (e) => {
  logError('[process] unhandledRejection', e instanceof Error ? e : String(e));
});

app.listen(PORT, () => {
  const aiDisabled =
    process.env.AI_DISABLED === '1' ||
    String(process.env.AI_DISABLED || '').toLowerCase() === 'true';
  const hasGroq = !aiDisabled && Boolean(process.env.GROQ_API_KEY);
  const hasOllama = !aiDisabled && Boolean(String(process.env.OLLAMA_BASE_URL || '').trim());
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  공명 스테이션 — API 서버 로그 창                      ║');
  console.log('║  말씀 보내면 아래에 [http] / [ai] / ERROR 가 뜹니다     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  logOk(`API listening http://localhost:${PORT}`);
  logInfo(`로그 파일: ${logPath()}`);
  logInfo(`AI config Groq=${hasGroq ? 'ON' : 'OFF'} Ollama=${hasOllama ? 'ON' : 'OFF'}`);
  logInfo(`GROQ_MODEL=${process.env.GROQ_MODEL || 'openai/gpt-oss-20b (default)'}`);
  logInfo(`OLLAMA_BASE_URL=${process.env.OLLAMA_BASE_URL || '(empty)'}`);
  logInfo(`OLLAMA_MODEL=${process.env.OLLAMA_MODEL || 'llama3.2 (default)'}`);
  if (!hasGroq) {
    logError('[ai:config] GROQ_API_KEY 비어 있음 → Groq 호출 불가');
  }
  if (!hasOllama) {
    logWarn('[ai:config] OLLAMA_BASE_URL 비어 있음 (선택) — Groq만 사용');
  }
  if (aiDisabled) {
    logWarn('[ai:config] AI_DISABLED=1 → demo/템플릿만 사용 (API 토큰 미사용)');
  } else if (!hasGroq && !hasOllama) {
    logError('[ai:config] AI 미설정 → demo/템플릿만 사용됩니다 (.env 확인)');
  }
});
