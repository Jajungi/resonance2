import { EXAMPLE_SCRIPT } from '../demoBank.js';
import { pickPractice, practiceCard } from '../practices.js';
import { WaveField } from './wave.js';
import { SilhouetteField } from './silhouette.js';
import { api, getToken, setToken } from './httpClient.js';
import { SpeechListener, speak, stopSpeak } from './speech.js';
import {
  listChats,
  getChat,
  createChat,
  replaceMessages,
  deleteChat,
  groupChatsByDate,
  formatChatWhen,
} from './chats.js';

const TRADITIONS = [
  { id: 'common', label: '공통' },
  { id: 'catholic', label: '가톨릭' },
  { id: 'protestant', label: '개신교' },
  { id: 'buddhist', label: '불교' },
  { id: 'won', label: '원불교' },
];

const params = new URLSearchParams(location.search);
const devMode = params.get('dev') === '1';
if (devMode) document.body.classList.add('dev');

const state = {
  mode: params.get('mode') === 'web' ? 'web' : 'kiosk',
  demo: params.get('demo') === '1' || params.get('demo') === 'true',
  user: null,
  tradition: localStorage.getItem('resonance_tradition') || 'common',
  chatId: null,
  messages: [],
  memoryContext: [],
  lastResult: null,
  sessionMode: 'guest',
  fontScale: Number(localStorage.getItem('resonance_font') || 1.2),
  ttsRate: 0.85,
  ttsOn: localStorage.getItem('resonance_tts') !== '0',
  shareResonance: false,
  listener: null,
  listening: false,
  busy: false,
  speaking: false,
  turnId: 0,
  bargeListener: null,
  captionAbort: false,
  micStream: null,
};

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
}

const stage = document.getElementById('stage');
const statusEl = document.getElementById('status');
const captionEl = document.getElementById('caption');
const hintEl = document.getElementById('hint');
const micBtn = document.getElementById('mic');
const doneTurn = document.getElementById('doneTurn');
const traditionBar = document.getElementById('traditionBar');
const pastFab = document.getElementById('pastFab');
const chatSheet = document.getElementById('chatSheet');
const chatThread = document.getElementById('chatThread');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const pastList = document.getElementById('pastList');
const ttsToggle = document.getElementById('ttsToggle');
const tabPast = document.getElementById('tabPast');
const sessionUI = document.getElementById('sessionUI');
const startGate = document.getElementById('startGate');
const tradGate = document.getElementById('tradGate');
const kioskBar = document.getElementById('kioskBar');
const demoSpeakBtn = document.getElementById('demoSpeak');
const demoPicksEl = document.getElementById('demoPicks');
const startDemo = document.getElementById('startDemo');

let liveText = '';
let chatOpen = false;
let scriptToken = 0;
let wave = { setMode() {}, setRms() {}, setFocus() {} };
try {
  wave = new WaveField(document.getElementById('wave'));
} catch (e) {
  console.error(e);
}

let silhouette = null;
let camDebugWin = null;
try {
  silhouette = new SilhouetteField(document.getElementById('silhouette'), {
    onFocus: (x, y) => wave.setFocus?.(x, y),
  });
} catch (e) {
  console.warn(e);
}

function openCameraDebugWindow() {
  if (camDebugWin && !camDebugWin.closed) {
    camDebugWin.focus();
    return camDebugWin;
  }
  const w = 480;
  const h = 420;
  const left = Math.max(0, window.screenX + window.outerWidth - w - 24);
  const top = Math.max(0, window.screenY + 80);
  camDebugWin = window.open(
    '/camera-debug.html',
    'resonanceCamDebug',
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no`
  );
  return camDebugWin;
}

function bindDebugWindow(win) {
  if (!win || win.closed || !silhouette) return false;
  const video = win.document.getElementById('debugVideo');
  const overlay = win.document.getElementById('debugOverlay');
  if (!video || !overlay) return false;
  silhouette.setDebugTargets(video, overlay);
  win.addEventListener('beforeunload', () => {
    if (silhouette) silhouette.setDebugTargets(null, null);
    camDebugWin = null;
  });
  return true;
}

async function ensureSilhouette() {
  if (!silhouette) return;
  const ok = await silhouette.start();
  const note = document.getElementById('camNote');
  if (note) note.hidden = ok;
  if (!ok || !devMode) return;
  const win = openCameraDebugWindow();
  if (!win) return;
  const tryBind = () => {
    if (bindDebugWindow(win)) return;
    setTimeout(tryBind, 80);
  };
  if (win.document.readyState === 'complete') tryBind();
  else win.addEventListener('load', tryBind);
}

document.getElementById('openCamWin')?.addEventListener('click', async () => {
  if (!silhouette) return;
  if (!silhouette.running) await silhouette.start();
  const win = openCameraDebugWindow();
  if (!win) {
    alert('팝업이 차단되었습니다. 브라우저에서 이 사이트 팝업을 허용해 주세요.');
    return;
  }
  const tryBind = () => {
    if (bindDebugWindow(win)) return;
    setTimeout(tryBind, 80);
  };
  if (win.document.readyState === 'complete') tryBind();
  else win.addEventListener('load', tryBind);
});

function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${t}`);
  localStorage.setItem('resonance_theme', t);
  document.getElementById('themeLight')?.classList.toggle('on', t === 'light');
  document.getElementById('themeDark')?.classList.toggle('on', t === 'dark');
}

applyTheme(localStorage.getItem('resonance_theme') || 'light');
document.getElementById('themeLight')?.addEventListener('click', () => applyTheme('light'));
document.getElementById('themeDark')?.addEventListener('click', () => applyTheme('dark'));

if (state.mode === 'kiosk' && devMode && kioskBar) {
  document.body.classList.add('kiosk');
  kioskBar.hidden = false;
}
if (state.demo) {
  document.body.classList.add('demo');
}

applyFontScale();
syncTtsToggle();

function applyFontScale() {
  document.documentElement.style.setProperty('--font-scale', String(state.fontScale));
  localStorage.setItem('resonance_font', String(state.fontScale));
}

function syncTtsToggle() {
  if (!ttsToggle) return;
  ttsToggle.textContent = state.ttsOn ? '소리' : '소리 끔';
  ttsToggle.classList.toggle('on', state.ttsOn);
}

if (ttsToggle) {
  ttsToggle.onclick = () => {
    state.ttsOn = !state.ttsOn;
    localStorage.setItem('resonance_tts', state.ttsOn ? '1' : '0');
    syncTtsToggle();
    if (!state.ttsOn) stopSpeak();
  };
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unlockTts() {
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis?.speak(u);
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

/** Exclusive UI modes — never overlap */
function setMode(mode) {
  state.uiMode = mode;
  document.body.classList.remove('mode-idle', 'mode-trad', 'mode-session');
  document.body.classList.add(`mode-${mode}`);

  startGate.hidden = mode !== 'idle';
  tradGate.hidden = mode !== 'trad';
  sessionUI.hidden = mode !== 'session';
  pastFab.hidden = mode !== 'session';

  if (mode !== 'session') {
    stopListening({ releaseMic: true });
    stopSpeak();
    openChat(false);
  }
}

function stopListening({ releaseMic = true } = {}) {
  if (state.listener) {
    try {
      state.listener.stop({ releaseMic });
    } catch {
      /* ignore */
    }
    state.listener = null;
  }
  if (state.bargeListener) {
    try {
      state.bargeListener.stop({ releaseMic: false });
    } catch {
      /* ignore */
    }
    state.bargeListener = null;
  }
  state.listening = false;
  document.body.classList.remove('listening');
  micBtn.classList.remove('on');
  doneTurn.hidden = true;
  wave.setRms(0);
  if (releaseMic) releaseSharedMic();
}

function releaseSharedMic() {
  try {
    state.micStream?.getTracks?.().forEach((t) => t.stop());
  } catch {
    /* ignore */
  }
  state.micStream = null;
}

async function ensureSharedMic() {
  if (state.micStream?.active) return state.micStream;
  state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return state.micStream;
}

function interruptSpeech() {
  state.captionAbort = true;
  state.speaking = false;
  stopSpeak();
}

async function typeCaption(full) {
  setCaption('');
  // Do not clear captionAbort here — barge-in may already have set it
  const step = Math.min(22, Math.max(10, 1800 / Math.max(full.length, 1)));
  for (let i = 0; i < full.length; i++) {
    if (state.captionAbort) return false;
    setCaption(full.slice(0, i + 1));
    await new Promise((r) => setTimeout(r, step));
  }
  return true;
}

function currentHeardText() {
  return (
    liveText ||
    state.listener?.finalText ||
    state.listener?._lastLive ||
    ''
  ).trim();
}

function startBargeInWatch() {
  // Recorder owns the microphone. Talking over the reply is the mic button.
}

function stopBargeOnly() {
  if (state.bargeListener) {
    try {
      state.bargeListener.stop();
    } catch {
      /* ignore */
    }
    state.bargeListener = null;
  }
}

function micPreference() {
  return document.getElementById('micDevice')?.value || sessionStorage.getItem('resonance_mic') || '';
}

function bindMicList(inputs) {
  const sel = document.getElementById('micDevice');
  if (!sel) return;
  const prev = sel.value || sessionStorage.getItem('resonance_mic') || '';
  const options = (inputs || []).filter((d) => d.deviceId && d.label);
  if (!options.length) return;
  sel.innerHTML = options
    .map((d) => `<option value="${escapeHtml(d.deviceId)}">${escapeHtml(d.label)}</option>`)
    .join('');
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function rememberMic(id) {
  if (!id) return;
  sessionStorage.setItem('resonance_mic', id);
  const sel = document.getElementById('micDevice');
  if (sel && [...sel.options].some((o) => o.value === id)) sel.value = id;
}

function makeListener() {
  return new SpeechListener({
    silenceMs: 1800,
    deviceId: micPreference(),
    onStart: () => setStatus('듣고 있어요'),
    onInputs: bindMicList,
    onDevice: (id) => rememberMic(id),
    onRetry: (msg) => {
      setHint(msg);
      pushMicLog(msg);
      setStatus('듣고 있어요');
      state.listening = true;
      document.body.classList.add('listening');
      micBtn.classList.add('on');
      doneTurn.hidden = false;
    },
    onPartial: (t, interim) => {
      if (!t || String(t).includes('글자로')) {
        if (t) setStatus(t);
        return;
      }
      liveText = t;
      setCaption(t, { interim });
    },
    onFinalChunk: (_c, full) => {
      liveText = full;
      setCaption(full);
    },
    onRms: (v) => wave.setRms(v),
    onSilence: (text) => {
      const spoken = String(text || '').trim();
      if (spoken) finishUserTurn(spoken);
    },
    onError: (msg) => {
      setHint(msg);
      pushMicLog(msg);
      if (String(msg).includes('권한') || String(msg).includes('지원하지')) {
        stopListening();
        showTextFallback();
      } else {
        state.listening = false;
        document.body.classList.remove('listening');
        micBtn.classList.remove('on');
        doneTurn.hidden = true;
      }
    },
    onLog: pushMicLog,
  });
}

async function resumeListeningAfterBarge(seed = '') {
  if (state.uiMode !== 'session') return;
  state.busy = false;
  state.speaking = false;
  liveText = seed || '';
  setStatus('듣고 있어요');
  setHint('말을 마치면 글자가 나옵니다. 「이만큼이에요」를 눌러도 됩니다.');
  document.body.classList.add('listening');
  if (demoPicksEl) demoPicksEl.hidden = true;
  wave.setMode('listen');
  micBtn.classList.add('on');
  doneTurn.hidden = false;
  state.listening = true;

  state.listener = makeListener();
  try {
    releaseSharedMic();
    const ok = await state.listener.start();
    if (!ok) {
      stopListening();
      showTextFallback();
    }
  } catch {
    stopListening();
    showTextFallback();
  }
}

async function finishUserTurn(spoken) {
  const text = String(spoken || '').trim();
  if (!text) return;
  cancelExampleScript();
  // Grok-style: always take the newest utterance; older in-flight turns drop via turnId
  if (state.speaking) interruptSpeech();
  stopBargeOnly();

  const turnId = ++state.turnId;
  state.busy = true;
  if (demoPicksEl) demoPicksEl.hidden = true;
  stopListening({ releaseMic: false });
  liveText = '';

  const abandon = () => {
    if (turnId === state.turnId) state.busy = false;
  };

  state.messages.push({ id: uid(), role: 'you', text, at: Date.now() });
  persistMessages();
  renderLiveThread();
  if (chatOpen) renderChatThread();

  setStatus('듣고 있습니다');
  setCaption(text);
  setHint('');
  wave.setMode('comfort');
  await new Promise((r) => setTimeout(r, 350));
  if (turnId !== state.turnId) {
    abandon();
    return;
  }

  setStatus('잠깐만요');
  setCaption('');
  if (chatOpen) {
    const pending = document.createElement('div');
    pending.className = 'bubble ai pending';
    pending.innerHTML = `<div class="bubble-body">…</div>`;
    chatThread.appendChild(pending);
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  const history = state.messages
    .filter((m) => m.role === 'you' || m.role === 'ai')
    .slice(0, -1)
    .slice(-8)
    .map((m) => ({ role: m.role, text: m.text }));

  try {
    console.log('[resonance] comfort →', text.slice(0, 40));
    const result = await api.comfort({
      transcript: text,
      tradition: state.tradition,
      memory: state.sessionMode === 'member' ? state.memoryContext : [],
      history,
    });
    console.log('[resonance] comfort ←', result?.provider, result?.tags);
    if (turnId !== state.turnId) {
      abandon();
      return;
    }
    state.lastResult = result;
    if (result.risk >= 3) {
      state.busy = false;
      showOverlay('CRISIS');
      return;
    }

    const full = `${result.reflection} ${result.comfort}${
      result.followup_invite ? ` ${result.followup_invite}` : ''
    }`.trim();

    setStatus('듣고 있어요 · 말씀하시면 이어 듣습니다');
    state.speaking = true;
    state.captionAbort = false;
    startBargeInWatch(turnId);

    const speakP = state.ttsOn
      ? speak(full, { rate: state.ttsRate })
      : Promise.resolve({ interrupted: false });
    await typeCaption(full);
    if (turnId !== state.turnId) {
      abandon();
      return;
    }

    const shown = captionEl.textContent?.trim() || full;
    state.messages.push({
      id: uid(),
      role: 'ai',
      text: state.captionAbort ? shown : full,
      at: Date.now(),
    });
    persistMessages();
    renderLiveThread();
    setCaption('');
    if (chatOpen) renderChatThread();

    const speakResult = await speakP;
    stopBargeOnly();
    state.speaking = false;

    if (state.sessionMode === 'member' && state.user) {
      api.memorySave({ transcript: text, sourceSessionId: state.chatId }).catch(() => {});
    }

    if (turnId !== state.turnId) {
      abandon();
      return;
    }

    // Interrupted → listening may already be running
    if (speakResult?.interrupted || state.captionAbort) {
      state.busy = false;
      if (!state.listening && state.uiMode === 'session') await startMic();
      return;
    }

    setStatus('이어서 말씀해 주세요');
    setHint(result.followup_invite || '방금 말에서 이어지면 됩니다');
    wave.setMode('idle');
    state.busy = false;
    // Continuous conversation — reopen mic right away
    if (state.uiMode === 'session') {
      await new Promise((r) => setTimeout(r, 400));
      if (turnId === state.turnId && !state.listening && !state.busy) await startMic();
    }
  } catch (e) {
    stopBargeOnly();
    state.speaking = false;
    setStatus('잠시 잇지 못했습니다');
    setCaption(e.message || '잠깐 잇지 못했어요. 다시 말씀해 주세요');
    wave.setMode('idle');
    state.busy = false;
    if (state.uiMode === 'session') setTimeout(() => startMic(), 400);
  }
}

async function startMic() {
  if (state.uiMode !== 'session') return;
  cancelExampleScript();

  // Grok-style: tapping mic while AI talks = interrupt & listen
  if (state.speaking) {
    interruptSpeech();
    stopBargeOnly();
    state.busy = false;
  }
  // Recover if a previous turn left busy stuck (thinking / API)
  if (state.busy && !state.listening) {
    state.busy = false;
  }
  if (state.busy) return;

  if (state.listening) {
    setStatus('글자로 바꾸는 중…');
    state.listener?.flush();
    return;
  }

  unlockTts();
  stopListening({ releaseMic: false });
  if (demoPicksEl) demoPicksEl.hidden = true;
  liveText = '';
  setCaption('');
  setStatus('듣고 있어요');
  setHint('말을 마치면 글자가 나옵니다. 「이만큼이에요」를 눌러도 됩니다.');
  document.body.classList.add('listening');
  wave.setMode('listen');
  micBtn.classList.add('on');
  doneTurn.hidden = false;
  state.listening = true;

  state.listener = makeListener();

  try {
    releaseSharedMic();
    const ok = await state.listener.start();
    if (!ok) {
      stopListening();
      setStatus('마이크를 쓸 수 없어요');
      showTextFallback();
    }
  } catch {
    stopListening();
    setStatus('마이크를 쓸 수 없어요');
    showTextFallback();
  }
}

function setStatus(t) {
  statusEl.textContent = t;
}
function setCaption(t, { interim = false } = {}) {
  captionEl.textContent = t || '';
  captionEl.classList.toggle('empty', !t);
  captionEl.classList.toggle('interim', interim);
}
function pushMicLog(line) {
  const el = document.getElementById('micLog');
  const stamp = new Date().toISOString().slice(11, 19);
  const row = `${stamp}  ${line}`;
  if (!el) return;
  const prev = el.textContent ? el.textContent.split('\n').filter(Boolean) : [];
  el.textContent = [row, ...prev].slice(0, 8).join('\n');
}
function setHint(t) {
  hintEl.textContent = t || '';
}

async function restore() {
  if (!getToken()) return;
  try {
    const { user } = await api.me();
    state.user = user;
    state.sessionMode = 'member';
    const data = await api.memoryList();
    state.memoryContext = data.context || [];
  } catch {
    setToken('');
    state.user = null;
  }
}

function persistMessages() {
  if (!state.chatId) return;
  const has = state.messages.some((m) => m.role === 'you' || m.role === 'ai');
  if (!has) {
    deleteChat(state.chatId);
    return;
  }
  replaceMessages(state.chatId, state.messages, {
    tradition: state.tradition,
    userId: state.user?.id || null,
  });
}

function beginFreshChat() {
  // draft only — empty chats are not written to storage
  const chat = createChat({
    tradition: state.tradition,
    userId: state.user?.id || null,
    title: '대화',
  });
  state.chatId = chat.id;
  state.messages = [];
  state.lastResult = null;
}

function renderTraditionBar() {
  traditionBar.innerHTML = TRADITIONS.map(
    (t) =>
      `<button type="button" class="pick ${state.tradition === t.id ? 'on' : ''}" data-id="${t.id}">${
        t.label
      }</button>`
  ).join('');
  traditionBar.querySelectorAll('.pick').forEach((b) => {
    b.onclick = () => {
      state.tradition = b.dataset.id;
      localStorage.setItem('resonance_tradition', state.tradition);
      renderTraditionBar();
      // 키오스크: 고르면 바로 다음으로 (버튼이 안 보여서 막히지 않게)
      goSession({ autoListen: true });
    };
  });
}

function goIdle() {
  // drop empty draft so it never remains in history
  if (state.chatId && !state.messages.some((m) => m.role === 'you' || m.role === 'ai')) {
    deleteChat(state.chatId);
    state.chatId = null;
    state.messages = [];
  } else {
    persistMessages();
  }
  setMode('idle');
  wave.setMode('idle');
}

function goTrad() {
  beginFreshChat();
  renderTraditionBar();
  setMode('trad');
  wave.setMode('idle');
}

function renderLiveThread() {
  const el = document.getElementById('liveThread');
  if (!el) return;
  const items = state.messages.filter((m) => m.role === 'you' || m.role === 'ai').slice(-12);
  el.innerHTML = items
    .map(
      (m) =>
        `<div class="turn ${m.role}"><span>${m.role === 'you' ? '나' : '공명'}</span><p>${escapeHtml(m.text)}</p></div>`
    )
    .join('');
  const last = el.lastElementChild;
  if (last) last.scrollIntoView({ block: 'end' });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cancelExampleScript() {
  scriptToken += 1;
}

function wordChunks(text) {
  const parts = String(text || '').split(/(\s+)/);
  const chunks = [];
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      if (chunks.length) chunks[chunks.length - 1] += part;
    } else {
      chunks.push(part);
    }
  }
  return chunks;
}

function appendStreamTurn(role, label) {
  const el = document.getElementById('liveThread');
  if (!el) return null;
  const turn = document.createElement('div');
  turn.className = `turn ${role} streaming`;
  const who = label || (role === 'you' ? '나' : '공명');
  turn.innerHTML = `<span>${escapeHtml(who)}</span><p></p>`;
  el.appendChild(turn);
  el.scrollTop = el.scrollHeight;
  return turn.querySelector('p');
}

async function playExampleScript() {
  const token = ++scriptToken;
  state.turnId += 1;
  stopListening({ releaseMic: true });
  stopSpeak();
  state.speaking = false;
  state.busy = false;
  state.demo = true;
  document.body.classList.add('demo');
  state.sessionMode = 'guest';
  state.tradition = 'common';
  beginFreshChat();
  if (demoPicksEl) demoPicksEl.hidden = true;
  goSession({ autoListen: false });
  if (demoSpeakBtn) demoSpeakBtn.hidden = true;
  setHint('');
  setCaption('');
  const thread = document.getElementById('liveThread');
  if (thread) thread.innerHTML = '';

  for (const turn of EXAMPLE_SCRIPT) {
    if (token !== scriptToken) return;
    if (turn.role === 'gap') {
      const note = document.createElement('p');
      note.className = 'turn-gap';
      note.textContent = turn.text;
      if (thread) {
        thread.appendChild(note);
        thread.scrollTop = thread.scrollHeight;
      }
      wave.setMode('idle');
      setStatus('듣고 있습니다');
      await wait(700);
      continue;
    }
    const p = appendStreamTurn(turn.role, turn.label);
    if (!p) return;
    const box = p.parentElement;

    if (turn.role === 'you') {
      setStatus('듣고 있어요');
      wave.setMode('listen');
      const chunks = wordChunks(turn.text);
      let heard = '';
      for (const chunk of chunks) {
        if (token !== scriptToken) return;
        heard += chunk;
        p.textContent = heard;
        setCaption(heard.trim(), { interim: true });
        if (thread) thread.scrollTop = thread.scrollHeight;
        await wait(120);
      }
      setCaption('');
    } else {
      setStatus('듣고 있습니다');
      setCaption('');
      wave.setMode('comfort');
      const full = turn.text;
      for (let i = 1; i <= full.length; i++) {
        if (token !== scriptToken) return;
        p.textContent = full.slice(0, i);
        if (i % 6 === 0 && thread) thread.scrollTop = thread.scrollHeight;
        await wait(8);
      }
      if (thread) thread.scrollTop = thread.scrollHeight;
    }

    if (token !== scriptToken) return;
    box?.classList.remove('streaming');
    state.messages.push({ id: uid(), role: turn.role, text: turn.text, at: Date.now() });
    wave.setMode('idle');
    await wait(turn.role === 'you' ? 280 : 360);
  }

  if (token !== scriptToken) return;
  setCaption('');
  setStatus('이어서 말씀해 주세요');
  setHint('예시가 끝났습니다. 이어서 말씀하셔도 됩니다');
  if (demoSpeakBtn) demoSpeakBtn.hidden = false;
}

function goSession({ autoListen = true } = {}) {
  state.tradition = state.tradition || 'common';
  localStorage.setItem('resonance_tradition', state.tradition);
  setMode('session');
  setStatus('천천히 말씀해 주세요');
  setCaption('');
  renderLiveThread();
  setHint('말씀하기를 누르거나, 아래 칸에 적어도 됩니다');
  if (demoSpeakBtn) demoSpeakBtn.hidden = false;
  if (demoPicksEl) demoPicksEl.hidden = true;
  wave.setMode('idle');
  if (autoListen && !state.demo) setTimeout(() => startMic(), 300);
}

function openChat(open = true) {
  chatOpen = open;
  chatSheet.hidden = !open;
  chatSheet.classList.toggle('open', open);
  chatSheet.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.classList.toggle('chat-text-open', open);
  pastList.hidden = true;
  chatThread.hidden = false;
  // When text chat is open, hide the big kiosk buttons so background chat is clean
  if (state.uiMode === 'session') {
    sessionUI.classList.toggle('dimmed', open);
  }
  if (!open) {
    sessionUI.classList.remove('dimmed');
  }
  if (open) {
    renderChatThread();
    setTimeout(() => chatInput.focus(), 150);
  }
}

function renderChatThread() {
  const items = state.messages.filter((m) => m.role === 'you' || m.role === 'ai');
  if (!items.length) {
    chatThread.innerHTML = `<p class="chat-empty">아직 나눈 말이 없어요.<br/>아래에 적어도 되고, 목소리로 하셔도 됩니다.</p>`;
    return;
  }
  chatThread.innerHTML = items
    .map(
      (m) => `
      <div class="bubble ${m.role}">
        <div class="bubble-body">${escapeHtml(m.text)}</div>
      </div>`
    )
    .join('');
  chatThread.scrollTop = chatThread.scrollHeight;
}

function renderPastList() {
  const guest = listChats({ guest: true });
  const mine = listChats({ userId: state.user?.id || null, guest: !state.user });
  const map = new Map();
  for (const c of [...mine, ...guest]) map.set(c.id, c);
  const all = [...map.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const groups = groupChatsByDate(all);
  if (!all.length) {
    pastList.innerHTML = `<p class="chat-empty">지난 대화가 없습니다.</p>`;
    return;
  }
  pastList.innerHTML = groups
    .map(
      (g) => `
      <div>
        <div class="past-group-label">${escapeHtml(g.label)}</div>
        ${g.items
          .map(
            (c) => `
          <button type="button" class="past-item" data-id="${c.id}">
            <div class="title">${escapeHtml(c.title || '대화')}</div>
            <div class="meta">${escapeHtml(formatChatWhen(c.updatedAt || c.createdAt))}</div>
          </button>`
          )
          .join('')}
      </div>`
    )
    .join('');
  pastList.querySelectorAll('.past-item').forEach((btn) => {
    btn.onclick = () => {
      const chat = getChat(btn.dataset.id);
      if (!chat) return;
      state.chatId = chat.id;
      state.messages = chat.messages || [];
      state.tradition = chat.tradition || 'common';
      pastList.hidden = true;
      chatThread.hidden = false;
      renderChatThread();
    };
  });
}

function showTextFallback() {
  if (document.getElementById('textFallback')) return;
  setHint('글로 적어도 됩니다');
  const wrap = document.createElement('div');
  wrap.id = 'textFallback';
  wrap.className = 'text-fallback';
  wrap.innerHTML = `
    <input class="field" id="textInput" placeholder="여기에 적어도 됩니다" />
    <button type="button" class="btn primary xl" id="sendText">보내기</button>
  `;
  sessionUI.appendChild(wrap);
  const input = wrap.querySelector('#textInput');
  const send = () => {
    finishUserTurn(input.value);
    wrap.remove();
  };
  wrap.querySelector('#sendText').onclick = send;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
  input.focus();
}

function el(html) {
  const d = document.createElement('div');
  d.className = 'screen';
  d.innerHTML = html;
  return d;
}
function clearOverlay() {
  stage.innerHTML = '';
}
function showOverlay(name) {
  stage.innerHTML = '';
  ({ AUTH: renderAuth, HOME: renderHome, CRISIS: renderCrisis, PRACTICE: renderPractice, RESONANCE: renderResonance, CLOSE: renderClose }[
    name
  ]?.());
}

function renderAuth() {
  const node = el(`
    <h1 class="hero">이어서 듣기</h1>
    <p class="soft">짧은 요약만 남겨 둡니다.</p>
    <div class="row">
      <input class="field" id="phone" placeholder="휴대폰" inputmode="tel" />
      <input class="field" id="pin" placeholder="비밀번호" type="password" inputmode="numeric" />
    </div>
    <input class="field" id="name" placeholder="어떻게 불러드릴까요 (선택)" />
    <p class="err" id="err"></p>
    <div class="actions">
      <button class="btn primary xl" data-a="ok">들어가기</button>
      <button class="btn ghost xl" data-a="back">닫기</button>
    </div>
  `);
  node.querySelector('[data-a="back"]').onclick = () => clearOverlay();
  node.querySelector('[data-a="ok"]').onclick = async () => {
    try {
      const { user } = await api.login({
        phone: node.querySelector('#phone').value.trim(),
        pin: node.querySelector('#pin').value.trim(),
        displayName: node.querySelector('#name').value.trim(),
      });
      setToken(user.token);
      state.user = user;
      state.sessionMode = 'member';
      const data = await api.memoryList();
      state.memoryContext = data.context || [];
      clearOverlay();
      showOverlay('HOME');
    } catch (e) {
      node.querySelector('#err').textContent = e.message;
    }
  };
  stage.appendChild(node);
}

async function renderHome() {
  let items = [];
  try {
    const data = await api.memoryList();
    items = data.items || [];
    state.memoryContext = data.context || [];
  } catch {
    /* ignore */
  }
  const list =
    items
      .slice(0, 4)
      .map(
        (i) =>
          `<div class="mem-item"><strong>${escapeHtml(i.label)}</strong><span>${escapeHtml(
            i.summary
          )}</span></div>`
      )
      .join('') || `<p class="soft">아직 남겨 둔 말이 없어요.</p>`;
  const node = el(`
    <h1 class="hero">${
      state.user?.displayName
        ? `${escapeHtml(state.user.displayName)}님, 다시 오셨네요`
        : '다시 오셨네요'
    }</h1>
    <div class="mem">${list}</div>
    <div class="actions">
      <button class="btn primary xl" data-a="chat">말씀할게요</button>
      <button class="btn ghost xl" data-a="out">나가기</button>
    </div>
  `);
  node.querySelector('[data-a="chat"]').onclick = () => {
    clearOverlay();
    state.sessionMode = 'member';
    goSession({ autoListen: true });
  };
  node.querySelector('[data-a="out"]').onclick = () => {
    setToken('');
    state.user = null;
    state.sessionMode = 'guest';
    clearOverlay();
  };
  stage.appendChild(node);
}

function renderCrisis() {
  openChat(false);
  stopListening();
  stopSpeak();
  wave.setMode('crisis');
  // stay on overlay; do not wipe session draft
  const node = el(`
    <div class="crisis-card">
      <p class="whisper">잠깐</p>
      <h1 class="hero crisis-hero">지금, 안전이<br/>먼저입니다</h1>
      <p class="soft crisis-copy">혼자가 아닙니다. 사람을 연결해 드릴게요.</p>
      <div class="crisis-phones">
        <a class="phone-pill" href="tel:15770199">정신건강 · 1577-0199</a>
        <a class="phone-pill" href="tel:109">자살예방 · 109</a>
      </div>
      <p class="soft" id="crisisStatus">지금은 연습용 연결입니다.</p>
      <div class="actions">
        <button class="btn primary xl" data-a="help">도움 연결 요청</button>
        <button class="btn ghost xl" data-a="ok">지금은 괜찮아요</button>
      </div>
    </div>
  `);
  const status = node.querySelector('#crisisStatus');
  node.querySelector('[data-a="help"]').onclick = async () => {
    const btn = node.querySelector('[data-a="help"]');
    btn.disabled = true;
    status.textContent = '알리는 중이에요…';
    await new Promise((r) => setTimeout(r, 900));
    status.textContent = '전해 두었습니다. (연습용)';
    state.crisisNotified = true;
    await new Promise((r) => setTimeout(r, 1200));
    showOverlay('RESONANCE');
  };
  node.querySelector('[data-a="ok"]').onclick = () => showOverlay('RESONANCE');
  stage.appendChild(node);
}

async function renderPractice() {
  openChat(false);
  stopListening();
  stopSpeak();
  wave.setMode('comfort');
  const lastYou = [...state.messages].reverse().find((m) => m.role === 'you');
  const id = state.lastResult?.practice || pickPractice(lastYou?.text || '', state.lastResult?.tags || []);
  const card = practiceCard(id, state.tradition);
  const node = el(`
    <div class="practice-card">
      <p class="whisper">들었습니다</p>
      <h1 class="hero">${escapeHtml(card.title)}</h1>
      <p class="soft">${escapeHtml(card.body)}</p>
      <div class="actions">
        <button class="btn ghost xl" data-a="skip">오늘은 이대로</button>
        <button class="btn primary xl" data-a="try">해볼게요</button>
      </div>
    </div>
  `);
  const next = () => showOverlay('RESONANCE');
  node.querySelector('[data-a="skip"]').onclick = next;
  node.querySelector('[data-a="try"]').onclick = async () => {
    const btn = node.querySelector('[data-a="try"]');
    btn.disabled = true;
    if (state.ttsOn) await speak(card.body, { rate: state.ttsRate });
    next();
  };
  stage.appendChild(node);
}

async function renderResonance() {
  openChat(false);
  wave.setMode('comfort');
  const node = el(`
    <div class="resonance-card">
      <p class="whisper">익명의 말씀</p>
      <h1 class="hero">비슷한 마음을 둔<br/>분의 말이 있어요</h1>
      <p class="soft">짧게 들어 보시겠어요? 이름과 얼굴은 없습니다.</p>
      <p class="resonance-clip" id="clip">불러오는 중…</p>
      <label class="share-row">
        <input type="checkbox" id="share" />
        <span>내 말도 익명으로 남겨, 비슷한 밤을 보내는 분께 전하기</span>
      </label>
      <div class="actions">
        <button class="btn primary xl" data-a="play">듣기</button>
        <button class="btn ghost xl" data-a="skip">건너뛰기</button>
      </div>
    </div>
  `);
  stage.appendChild(node);
  const clipEl = node.querySelector('#clip');
  let clipText = '지금은 나눌 말이 없어요.';

  try {
    const lastYou = [...state.messages].reverse().find((m) => m.role === 'you');
    const { clip } = await api.resonanceMatch({
      tags: state.lastResult?.tags || [],
      text: lastYou?.text || '',
    });
    clipText = clip?.text || clipText;
    clipEl.textContent = `「${clipText}」`;
  } catch {
    clipEl.textContent = '불러오지 못했어요. 건너뛰셔도 됩니다.';
  }

  const goNext = async () => {
    state.shareResonance = node.querySelector('#share').checked;
    if (state.shareResonance) {
      const lastYou = [...state.messages].reverse().find((m) => m.role === 'you');
      if (lastYou) {
        try {
          await api.resonanceShare({ text: lastYou.text });
        } catch {
          /* ignore */
        }
      }
    }
    showOverlay('CLOSE');
  };

  node.querySelector('[data-a="skip"]').onclick = () => goNext();
  node.querySelector('[data-a="play"]').onclick = async () => {
    const btn = node.querySelector('[data-a="play"]');
    btn.disabled = true;
    if (state.ttsOn) {
      const together =
        state.tradition === 'catholic'
          ? '그분을 위해, 마음에만 짧게 평화를 청하셔도 됩니다.'
          : state.tradition === 'protestant'
            ? '그분을 위해, 그 짐을 혼자 지지 않아도 된다고 떠올리셔도 됩니다.'
            : state.tradition === 'buddhist'
              ? '그분을 위해, 숨 한 번 함께 있어도 됩니다.'
              : state.tradition === 'won'
                ? '그분을 위해, 마음에만 짧게 함께 있어도 됩니다.'
                : '그분을 위해, 마음에만 짧게 함께 있어 주셔도 됩니다.';
      await speak('혼자만의 말이 아니라는 뜻으로, 익명의 한 말씀을 들려드립니다.', { rate: state.ttsRate });
      await speak(clipText, { rate: state.ttsRate });
      await speak(together, { rate: state.ttsRate });
    }
    await new Promise((r) => setTimeout(r, 500));
    await goNext();
  };
}

function renderClose() {
  const node = el(`
    <h1 class="hero">오늘 말씀, 들었어요.</h1>
    <p class="soft">${
      state.crisisNotified
        ? '도움이 필요하시면 1577-0199, 109로 연결해 주세요.'
        : '여기서 나눈 말은 남기지 않습니다. 언제든 다시 오셔도 됩니다.'
    }</p>
    <div class="actions">
      <button class="btn primary xl" data-a="home">처음으로</button>
    </div>
  `);
  node.querySelector('[data-a="home"]').onclick = () => {
    state.crisisNotified = false;
    state.shareResonance = false;
    state.lastResult = null;
    clearOverlay();
    goIdle();
  };
  stage.appendChild(node);
}

document.getElementById('startGuest').onclick = () => {
  unlockTts();
  state.sessionMode = 'guest';
  state.tradition = 'common';
  localStorage.setItem('resonance_tradition', 'common');
  beginFreshChat();
  goSession({ autoListen: !state.demo });
};
document.getElementById('startMember').onclick = () => {
  if (state.user) showOverlay('HOME');
  else showOverlay('AUTH');
};
startDemo.onclick = () => {
  unlockTts();
  playExampleScript();
};
document.getElementById('tradNext').onclick = () => goSession({ autoListen: !state.demo });
document.getElementById('tradSkip').onclick = () => {
  state.tradition = 'common';
  localStorage.setItem('resonance_tradition', 'common');
  goSession({ autoListen: !state.demo });
};

pastFab.onclick = () => openChat(true);
document.getElementById('pastClose').onclick = () => openChat(false);
tabPast.onclick = () => {
  const showPast = pastList.hidden;
  pastList.hidden = !showPast;
  chatThread.hidden = showPast;
  if (showPast) renderPastList();
  else renderChatThread();
};

chatSend.onclick = () => {
  const v = chatInput.value;
  chatInput.value = '';
  finishUserTurn(v);
};
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const v = chatInput.value;
    chatInput.value = '';
    finishUserTurn(v);
  }
});

micBtn.onclick = () => startMic();
const micDevice = document.getElementById('micDevice');
if (micDevice) {
  micDevice.onchange = () => {
    sessionStorage.setItem('resonance_mic', micDevice.value);
    if (!state.listening) return;
    stopListening({ releaseMic: true });
    startMic();
  };
}
doneTurn.onclick = () => {
  if (!state.listening || !state.listener) {
    setHint('먼저 「말씀하기」를 눌러 주세요');
    return;
  }
  setStatus('글자로 바꾸는 중…');
  state.listener.flush();
};
if (demoSpeakBtn) demoSpeakBtn.onclick = () => playExampleScript();
document.getElementById('sayForm').onsubmit = (e) => {
  e.preventDefault();
  const input = document.getElementById('sayInput');
  const v = input.value;
  input.value = '';
  finishUserTurn(v);
};
document.getElementById('end').onclick = () => {
  stopListening({ releaseMic: true });
  stopSpeak();
  openChat(false);
  if (!state.messages.some((m) => m.role === 'you')) {
    goIdle();
    return;
  }
  persistMessages();
  setMode('idle');
  showOverlay('PRACTICE');
};

document.getElementById('fsBtn').onclick = async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    alert('이 환경에서는 전체화면을 열 수 없습니다. 브라우저 메뉴에서 전체화면을 선택해 주세요.');
  }
};

setMode('idle');
restore().finally(() => wave.setMode('idle'));
ensureSilhouette();
