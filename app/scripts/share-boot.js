const SCRIPT = __DATA__;

class WaveField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'idle';
    this.rms = 0;
    this.amp = 0.12;
    this.target = 0.12;
    this.focusX = 0.5;
    this.focusY = 0.38;
    this.t0 = performance.now();
    this.particles = Array.from({ length: 28 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 0.25 + Math.random() * 0.65,
      s: 0.12 + Math.random() * 0.4,
      o: 0.2 + Math.random() * 0.4,
    }));
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    requestAnimationFrame(this.loop);
  }
  setMode(mode) { this.mode = mode || 'idle'; }
  setRms(v) { this.rms = Math.max(0, Math.min(1, Number(v) || 0)); }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(innerWidth * dpr);
    this.canvas.height = Math.floor(innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  loop(now) {
    const t = (now - this.t0) / 1000;
    const ctx = this.ctx;
    const w = innerWidth;
    const h = innerHeight;
    ctx.clearRect(0, 0, w, h);
    if (this.mode === 'listen') this.target = 0.18 + this.rms * 0.5;
    else if (this.mode === 'comfort') this.target = 0.11 + Math.sin(t * 0.85) * 0.028;
    else this.target = 0.11 + Math.sin(t * 0.32) * 0.03;
    this.amp += (this.target - this.amp) * 0.07;
    const cx = w * this.focusX;
    const cy = h * this.focusY;
    const base = Math.min(w, h) * 0.17;
    const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 3.4);
    haze.addColorStop(0, `rgba(201, 122, 48, ${0.09 + this.amp * 0.1})`);
    haze.addColorStop(0.5, `rgba(201, 122, 48, ${0.03 + this.amp * 0.03})`);
    haze.addColorStop(1, 'rgba(201, 122, 48, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);
    for (let i = 6; i >= 0; i--) {
      const r = base * (0.5 + i * 0.2) * (1 + this.amp * (0.35 - i * 0.03));
      const a = 0.06 + (6 - i) * 0.04 + this.amp * 0.08;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(184, 104, 36, ${a})`;
      ctx.lineWidth = i === 0 ? 2.2 : 1.1;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = `rgba(201, 110, 32, ${0.35 + this.amp * 0.45})`;
    ctx.lineWidth = 2;
    const wobble = Math.sin(t * 1.05) * this.amp * 12;
    ctx.arc(cx, cy, base * (1.02 + this.amp * 0.4) + wobble, 0, Math.PI * 2);
    ctx.stroke();
    for (const p of this.particles) {
      const ang = p.a + t * p.s * 0.3;
      const rad = base * (0.75 + p.r * (1.05 + this.amp));
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad * 0.7;
      ctx.beginPath();
      ctx.fillStyle = `rgba(201, 122, 48, ${p.o * (0.25 + this.amp * 0.5)})`;
      ctx.arc(x, y, 1.1 + this.amp * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.32);
    core.addColorStop(0, `rgba(201, 122, 48, ${0.16 + this.amp * 0.12})`);
    core.addColorStop(1, 'rgba(201, 122, 48, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, base * 0.32, 0, Math.PI * 2);
    ctx.fill();
    requestAnimationFrame((n) => this.loop(n));
  }
}

const wave = new WaveField(document.getElementById('wave'));
const thread = document.getElementById('liveThread');
const statusEl = document.getElementById('status');
const captionEl = document.getElementById('caption');
const hintEl = document.getElementById('hint');
const sessionUI = document.getElementById('sessionUI');
const demoSpeakBtn = document.getElementById('demoSpeak');
const micBtn = document.getElementById('mic');
const pastFab = document.getElementById('pastFab');
const chatSheet = document.getElementById('chatSheet');
const chatThread = document.getElementById('chatThread');
const pastList = document.getElementById('pastList');
const ttsToggle = document.getElementById('ttsToggle');
let scriptToken = 0;
let micStream = null;
let audioCtx = null;
let micOn = false;
let rafMic = 0;
let ttsOn = true;

function setMode(mode) {
  document.body.classList.remove('mode-idle', 'mode-session');
  document.body.classList.add('mode-' + mode);
  pastFab.hidden = mode !== 'session';
  if (mode !== 'session') closeChat();
  wave.setMode(mode === 'session' ? wave.mode : 'idle');
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
function words(text) {
  const parts = String(text || '').split(/(\s+)/);
  const chunks = [];
  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      if (chunks.length) chunks[chunks.length - 1] += part;
    } else chunks.push(part);
  }
  return chunks;
}
function setCaption(t, interim) {
  captionEl.textContent = t || '';
  captionEl.classList.toggle('empty', !t);
  captionEl.classList.toggle('interim', !!interim);
}
function addTurn(role, label) {
  const turn = document.createElement('div');
  turn.className = 'turn ' + role;
  const who = label || (role === 'you' ? '나' : '공명');
  turn.innerHTML = '<span>' + escapeHtml(who) + '</span><p></p>';
  thread.appendChild(turn);
  thread.scrollTop = thread.scrollHeight;
  return turn.querySelector('p');
}

function stopMic() {
  micOn = false;
  cancelAnimationFrame(rafMic);
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  document.body.classList.remove('listening');
  micBtn.classList.remove('on');
  wave.setRms(0);
  if (document.body.classList.contains('mode-session')) wave.setMode('idle');
}

async function startMic() {
  if (micOn) {
    stopMic();
    statusEl.textContent = '천천히 말씀해 주세요';
    return;
  }
  scriptToken += 1;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    hintEl.textContent = '마이크를 열 수 없습니다. 아래 칸에 적어도 됩니다.';
    return;
  }
  micOn = true;
  document.body.classList.add('listening');
  micBtn.classList.add('on');
  statusEl.textContent = '듣고 있어요';
  wave.setMode('listen');
  audioCtx = audioCtx || new AudioContext();
  const src = audioCtx.createMediaStreamSource(micStream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  const tick = () => {
    if (!micOn) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    wave.setRms(Math.min(1, Math.sqrt(sum / data.length) * 4));
    rafMic = requestAnimationFrame(tick);
  };
  tick();
}

async function playExample() {
  const mine = ++scriptToken;
  stopMic();
  setMode('session');
  thread.innerHTML = '';
  setCaption('');
  hintEl.textContent = '';
  demoSpeakBtn.hidden = true;
  statusEl.textContent = '듣고 있습니다';
  wave.setMode('idle');
  await wait(400);
  for (const turn of SCRIPT) {
    if (mine !== scriptToken) return;
    if (turn.role === 'gap') {
      const note = document.createElement('p');
      note.className = 'turn-gap';
      note.textContent = turn.text;
      thread.appendChild(note);
      thread.scrollTop = thread.scrollHeight;
      wave.setMode('idle');
      statusEl.textContent = '듣고 있습니다';
      await wait(700);
      continue;
    }
    const p = addTurn(turn.role, turn.label);
    if (turn.role === 'you') {
      statusEl.textContent = '듣고 있어요';
      wave.setMode('listen');
      wave.setRms(0.35);
      let heard = '';
      for (const chunk of words(turn.text)) {
        if (mine !== scriptToken) return;
        heard += chunk;
        p.textContent = heard;
        setCaption(heard.trim(), true);
        thread.scrollTop = thread.scrollHeight;
        await wait(120);
      }
      setCaption('');
      wave.setRms(0);
    } else {
      statusEl.textContent = '듣고 있습니다';
      setCaption('');
      wave.setMode('comfort');
      speak(turn.text);
      const full = turn.text;
      for (let i = 1; i <= full.length; i++) {
        if (mine !== scriptToken) return;
        p.textContent = full.slice(0, i);
        if (i % 6 === 0) thread.scrollTop = thread.scrollHeight;
        await wait(8);
      }
      thread.scrollTop = thread.scrollHeight;
    }
    wave.setMode('idle');
    await wait(turn.role === 'you' ? 280 : 360);
  }
  if (mine !== scriptToken) return;
  statusEl.textContent = '이어서 말씀해 주세요';
  hintEl.textContent = '예시가 끝났습니다. 이어서 말씀하셔도 됩니다';
  demoSpeakBtn.hidden = false;
}

function goHome() {
  scriptToken += 1;
  stopMic();
  if (window.speechSynthesis) speechSynthesis.cancel();
  setCaption('');
  hintEl.textContent = '';
  statusEl.textContent = '천천히 말씀해 주세요';
  document.getElementById('stage').innerHTML = '';
  setMode('idle');
  wave.setMode('idle');
}

function goSession() {
  scriptToken += 1;
  stopMic();
  document.getElementById('stage').innerHTML = '';
  setMode('session');
  statusEl.textContent = '천천히 말씀해 주세요';
  setCaption('');
  hintEl.textContent = '말씀하기를 누르거나, 아래 칸에 적어도 됩니다';
  wave.setMode('idle');
  demoSpeakBtn.hidden = false;
  setTimeout(() => startMic(), 300);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function speak(text) {
  if (!ttsOn || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 1;
  speechSynthesis.speak(u);
}
function renderChat() {
  const turns = [...thread.querySelectorAll('.turn')];
  if (!turns.length) {
    chatThread.innerHTML = '<p class="chat-empty">아직 나눈 말이 없어요.<br/>아래에 적어도 되고, 목소리로 하셔도 됩니다.</p>';
    return;
  }
  chatThread.innerHTML = turns.map((t) => {
    const role = t.classList.contains('you') ? 'you' : 'ai';
    return '<div class="bubble ' + role + '"><div class="bubble-body">' + escapeHtml(t.querySelector('p').textContent) + '</div></div>';
  }).join('');
  chatThread.scrollTop = chatThread.scrollHeight;
}
function closeChat() {
  chatSheet.hidden = true;
  chatSheet.classList.remove('open');
  chatSheet.setAttribute('aria-hidden', 'true');
  sessionUI.classList.remove('dimmed');
  pastList.hidden = true;
  chatThread.hidden = false;
}

document.getElementById('startGuest').onclick = () => goSession();
document.getElementById('startDemo').onclick = () => playExample();
document.getElementById('startMember').onclick = () => {
  const stage = document.getElementById('stage');
  stage.innerHTML = '<div class="screen"><h1 class="hero">이어서 듣기</h1><p class="soft">짧은 요약만 남겨 둡니다.</p><div class="row"><input class="field" id="phone" placeholder="휴대폰" inputmode="tel" /><input class="field" id="pin" placeholder="비밀번호" type="password" inputmode="numeric" /></div><input class="field" id="name" placeholder="어떻게 불러드릴까요 (선택)" /><p class="err" id="err"></p><div class="actions"><button type="button" class="btn primary xl" data-a="ok">들어가기</button><button type="button" class="btn ghost xl" data-a="back">닫기</button></div></div>';
  stage.querySelector('[data-a="back"]').onclick = () => { stage.innerHTML = ''; };
  stage.querySelector('[data-a="ok"]').onclick = () => {
    stage.querySelector('#err').textContent = '이 파일에는 계정이 없습니다. 말씀하기는 첫 화면에서 됩니다.';
  };
};
document.getElementById('end').onclick = () => goHome();
demoSpeakBtn.onclick = () => playExample();
micBtn.onclick = () => startMic();
document.getElementById('sayForm').onsubmit = (e) => {
  e.preventDefault();
  const input = document.getElementById('sayInput');
  const v = input.value.trim();
  input.value = '';
  if (!v) return;
  scriptToken += 1;
  stopMic();
  const p = addTurn('you');
  p.textContent = v;
  statusEl.textContent = '듣고 있습니다';
  wave.setMode('comfort');
  setTimeout(() => wave.setMode('idle'), 1200);
};
pastFab.onclick = () => {
  chatSheet.hidden = false;
  chatSheet.classList.add('open');
  chatSheet.setAttribute('aria-hidden', 'false');
  sessionUI.classList.add('dimmed');
  pastList.hidden = true;
  chatThread.hidden = false;
  renderChat();
};
document.getElementById('pastClose').onclick = () => closeChat();
document.getElementById('tabPast').onclick = () => {
  pastList.hidden = false;
  chatThread.hidden = true;
  pastList.innerHTML = '<p class="chat-empty">지난 대화가 없습니다.</p>';
};
document.getElementById('chatSend').onclick = () => {
  const input = document.getElementById('chatInput');
  const v = input.value.trim();
  input.value = '';
  if (!v) return;
  const p = addTurn('you');
  p.textContent = v;
  renderChat();
};
document.getElementById('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('chatSend').click();
});
ttsToggle.classList.add('on');
ttsToggle.onclick = () => {
  ttsOn = !ttsOn;
  ttsToggle.classList.toggle('on', ttsOn);
  ttsToggle.textContent = ttsOn ? '소리' : '소리 끔';
  if (!ttsOn) speechSynthesis.cancel();
};
setMode('idle');
