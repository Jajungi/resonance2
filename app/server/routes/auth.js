import { Router } from 'express';
import { registerOrLogin, findUserByToken, publicUser } from '../auth.js';
import { readMemory, writeMemory } from '../store.js';
import { logError, logInfo, logOk, logWarn } from '../log.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { phone, pin, displayName } = req.body || {};
    logInfo('[auth:login]', { phoneLen: String(phone || '').length, hasPin: Boolean(pin) });
    if (!phone || !pin) {
      logWarn('[auth:login] 휴대폰/PIN 누락');
      return res.status(400).json({ error: '휴대폰 번호와 PIN이 필요합니다.' });
    }
    if (String(pin).length < 4) {
      logWarn('[auth:login] PIN 짧음');
      return res.status(400).json({ error: 'PIN은 4자리 이상이어야 합니다.' });
    }
    const result = await registerOrLogin({ phone, pin, displayName });
    logOk('[auth:login] 성공', { userId: result?.user?.id });
    res.json(result);
  } catch (e) {
    logError('[auth:login] 실패', e.message || e);
    res.status(e.status || 500).json({ error: e.message || '로그인 실패' });
  }
});

authRouter.get('/me', (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const user = findUserByToken(token);
  if (!user) {
    logWarn('[auth:me] 인증 실패');
    return res.status(401).json({ error: '인증 필요' });
  }
  logInfo('[auth:me]', { userId: user.id });
  res.json({ user: publicUser(user) });
});

authRouter.patch('/me', (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const user = findUserByToken(token);
  if (!user) {
    logWarn('[auth:patch] 인증 실패');
    return res.status(401).json({ error: '인증 필요' });
  }
  const db = readMemory();
  const stored = db.users[user.phoneHash];
  const { displayName, preferredTradition, a11yPrefs, consent } = req.body || {};
  if (displayName != null) stored.displayName = displayName;
  if (preferredTradition != null) stored.preferredTradition = preferredTradition;
  if (a11yPrefs) stored.a11yPrefs = { ...stored.a11yPrefs, ...a11yPrefs };
  if (consent) stored.consent = { ...stored.consent, ...consent };
  db.users[user.phoneHash] = stored;
  writeMemory(db);
  logOk('[auth:patch] 프로필 저장', { userId: user.id });
  res.json({ user: publicUser(stored) });
});
