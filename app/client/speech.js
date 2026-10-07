let _speakToken = 0;
let _audio = null;
let _speakResolve = null;

function stopAudio() {
  if (_audio) {
    try {
      _audio.onended = null;
      _audio.onerror = null;
      _audio.pause();
      _audio.src = '';
    } catch {
      /* ignore */
    }
    _audio = null;
  }
  window.speechSynthesis?.cancel();
}

function abortSpeak() {
  _speakToken += 1;
  stopAudio();
  const resolve = _speakResolve;
  _speakResolve = null;
  resolve?.({ interrupted: true });
}

function speakBrowser(text, rate, token) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve({ interrupted: false });
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = rate;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const ko = voices.find((v) => v.lang?.startsWith('ko'));
    if (ko) u.voice = ko;
    const finish = (interrupted) => {
      if (token !== _speakToken) resolve({ interrupted: true });
      else resolve({ interrupted });
    };
    u.onend = () => finish(false);
    u.onerror = () => finish(token !== _speakToken);
    window.speechSynthesis.speak(u);
  });
}

/** Edge neural Korean voice via /api/tts, browser speech as fallback. */
export function speak(text, { rate = 0.92 } = {}) {
  abortSpeak();
  const token = _speakToken;
  const spoken = String(text || '').trim();
  return new Promise((resolve) => {
    _speakResolve = resolve;
    const done = (interrupted) => {
      if (_speakResolve !== resolve) return;
      _speakResolve = null;
      resolve({ interrupted });
    };
    if (!spoken) {
      done(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: spoken.slice(0, 700) }),
        });
        if (token !== _speakToken) return;
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const blob = await res.blob();
        if (token !== _speakToken) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        _audio = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (_audio === audio) _audio = null;
          done(token !== _speakToken);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          speakBrowser(spoken, rate, token).then((r) => done(r.interrupted));
        };
        await audio.play();
      } catch {
        if (token !== _speakToken) return;
        const r = await speakBrowser(spoken, rate, token);
        done(r.interrupted);
      }
    })();
  });
}

export function stopSpeak() {
  abortSpeak();
}

export function isSpeaking() {
  return Boolean(_audio && !_audio.paused) || Boolean(window.speechSynthesis?.speaking);
}

export class SpeechListener {
  constructor({
    onPartial,
    onFinalChunk,
    onRms,
    onSilence,
    onError,
    onStart,
    onLog,
    onRetry,
    onDevice,
    onInputs,
    deviceId = '',
    silenceMs = 1400,
  }) {
    this.onPartial = onPartial;
    this.onFinalChunk = onFinalChunk;
    this.onRms = onRms;
    this.onSilence = onSilence;
    this.onError = onError;
    this.onStart = onStart;
    this.onLog = onLog;
    this.onRetry = onRetry;
    this.onDevice = onDevice;
    this.onInputs = onInputs;
    this.deviceId = deviceId || '';
    this.silenceMs = silenceMs;
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.recorder = null;
    this._chunks = [];
    this._raf = 0;
    this.finalText = '';
    this._running = false;
    this._silenceTimer = null;
    this._heard = false;
    this._flushPromise = null;
    this._flushed = false;
    this._mime = 'audio/webm';
    this._peak = 0;
    this.recordStream = null;
    this._inputs = [];
    this._label = '';
    this._deviceId = '';
  }

  _log(line) {
    console.log('[resonance:mic]', line);
    this.onLog?.(line);
  }

  supported() {
    return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  }

  async start() {
    this.finalText = '';
    this._chunks = [];
    this._running = true;
    this._heard = false;
    this._flushPromise = null;
    this._flushed = false;

    if (!this.supported()) {
      this._log('실패: MediaRecorder 없음');
      this.onError?.('이 브라우저는 마이크 녹음을 지원하지 않습니다. Chrome을 이용해 주세요.');
      this._running = false;
      return false;
    }

    this._peak = 0;
    this._startedAt = 0;
    this._switched = false;
    try {
      const ok = await this._begin(this.deviceId || '');
      if (!ok) this._running = false;
      return ok;
    } catch (e) {
      this._log(`마이크 거부: ${e?.name || e?.message || e}`);
      this.onError?.('마이크 권한을 허용해 주세요. 주소창의 자물쇠에서 마이크를 켜 주세요.');
      this._running = false;
      return false;
    }
  }

  async _openStream(deviceId) {
    this._releaseStream();
    const audio = {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
    };
    if (deviceId) audio.deviceId = { exact: deviceId };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (e) {
      if (!deviceId) throw e;
      this._log(`지정한 마이크를 열지 못해 기본 장치로 다시 엽니다`);
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
    }
  }

  async _begin(deviceId) {
    await this._openStream(deviceId);
    const track = this.stream.getAudioTracks()[0];
    const settings = track?.getSettings?.() || {};
    this._deviceId = settings.deviceId || deviceId || '';
    this._label = track?.label || '기본 마이크';
    this.deviceId = this._deviceId;
    this._log(
      `마이크: ${this._label} · muted=${Boolean(track?.muted)} · ${settings.sampleRate || '?'}Hz · ${track?.readyState || '?'}`
    );
    if (track?.muted) this._log('이 장치는 음소거 상태입니다');
    track?.addEventListener('mute', () => this._log('마이크가 음소거됐습니다'));

    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      this._inputs = all.filter((d) => d.kind === 'audioinput');
      this.onInputs?.(this._inputs);
      const names = this._inputs.map((d) => d.label).filter(Boolean);
      if (names.length) this._log(`입력 장치: ${names.join(' | ')}`);
    } catch {
      this._inputs = [];
    }
    this.onDevice?.(this._deviceId, this._label);

    this._mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.recordStream = this.stream.clone();
    try {
      this.recorder = new MediaRecorder(this.recordStream, {
        mimeType: this._mime,
        audioBitsPerSecond: 128000,
      });
      this._mime = this.recorder.mimeType || this._mime;
    } catch {
      this.onError?.('녹음을 시작하지 못했습니다.');
      this.stop();
      return false;
    }

    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) this._chunks.push(e.data);
    };
    this.recorder.start(200);
    this._startedAt = Date.now();
    await this._watchLevel();
    clearTimeout(this._zeroTimer);
    this._zeroTimer = setTimeout(() => {
      if (!this._running || this._peak >= 0.01) return;
      this._log(`1.5초 동안 소리 레벨 ${this._peak.toFixed(3)} · ${this._label}`);
    }, 1500);
    this._log(`녹음 시작 (${this._mime})`);
    this.onStart?.();
    this.onPartial?.('', true);
    return true;
  }

  _hardwareName(label) {
    return String(label || '')
      .replace(/^(default|communications)\s*-\s*/i, '')
      .replace(/^(기본|통신)\s*-\s*/i, '')
      .trim();
  }

  _nextInput() {
    const curName = this._hardwareName(this._label);
    const junk = (label) =>
      /stereo mix|스테레오 믹스|what u hear|cable|vb-audio|virtual|loopback|nvidia broadcast/i.test(label || '');
    const rest = (this._inputs || []).filter((d) => {
      if (!d.deviceId || d.deviceId === 'default' || d.deviceId === 'communications') return false;
      if (d.deviceId === this._deviceId) return false;
      const name = this._hardwareName(d.label);
      if (curName && name === curName) return false;
      return true;
    });
    rest.sort((a, b) => Number(junk(a.label)) - Number(junk(b.label)));
    return rest[0] || null;
  }

  async _watchLevel() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new Ctx();
      if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();
      const src = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      const mute = this.audioCtx.createGain();
      mute.gain.value = 0;
      src.connect(this.analyser);
      this.analyser.connect(mute);
      mute.connect(this.audioCtx.destination);
      this._mute = mute;
    } catch (e) {
      this._log(`레벨 측정 실패: ${e?.message || e}`);
      return;
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const tick = () => {
      if (!this._running || !this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > this._peak) this._peak = rms;
      this.onRms?.(rms * 4);
      if (rms > 0.02) {
        if (!this._heard) this._log(`소리 감지 (레벨 ${rms.toFixed(3)})`);
        this._heard = true;
        clearTimeout(this._silenceTimer);
        this._silenceTimer = null;
      } else if (this._heard && this._peak > 0.03 && !this._silenceTimer) {
        this._silenceTimer = setTimeout(() => {
          if (this._running && this._heard) this.flush();
        }, this.silenceMs);
      }
      this._raf = requestAnimationFrame(tick);
    };
    tick();
  }

  /** Stop recording and turn speech into Korean text. */
  flush() {
    if (!this._flushPromise) this._flushPromise = this._flush();
    return this._flushPromise;
  }

  async _flush() {
    if (this._flushed) return this.finalText;
    this._flushed = true;
    if (!this.recorder && !this._chunks.length) {
      this._log('실패: 녹음기가 이미 꺼져 있음');
      this.onError?.('녹음이 이미 끝났습니다. 「말씀하기」를 다시 눌러 주세요.');
      return '';
    }
    this._running = false;
    clearTimeout(this._silenceTimer);
    cancelAnimationFrame(this._raf);
    const blob = await this._stopRecorder();
    this._releaseStream();
    const size = blob?.size || 0;
    const sec = ((Date.now() - (this._startedAt || Date.now())) / 1000).toFixed(1);
    this._log(`녹음 종료 ${size}바이트 · ${sec}초 · 최대레벨 ${this._peak.toFixed(3)} · ${this._label || '마이크'}`);
    if (!blob || size < 2500 || (this._peak < 0.02 && size < 12000)) {
      const next = this._switched ? null : this._nextInput();
      if (next) {
        this._switched = true;
        const from = this._label || '현재 마이크';
        const to = next.label || '다른 마이크';
        this._log(`무음이라 마이크를 바꿉니다 → ${to}`);
        this._chunks = [];
        this._peak = 0;
        this._heard = false;
        this._flushPromise = null;
        this._flushed = false;
        this._running = true;
        this.onRetry?.(
          `「${from}」에서는 소리가 안 들렸습니다. 「${to}」로 바꿔 두었습니다. 다시 말씀해 주세요.`
        );
        try {
          await this._begin(next.deviceId);
        } catch (e) {
          this.onError?.(`다른 마이크를 열지 못했습니다. ${e?.message || ''}`.trim());
        }
        return '';
      }
      const names = (this._inputs || []).map((d) => d.label).filter(Boolean).join(', ');
      this.onError?.(
        `목소리가 녹음에 안 담겼습니다 (${size}바이트, 레벨 ${this._peak.toFixed(3)}, ${this._label || '기본 마이크'}). ${
          names ? `선택 가능한 장치: ${names}. ` : ''
        }아래 마이크 목록에서 다른 장치를 고른 뒤 다시 말씀해 주세요.`
      );
      return '';
    }
    this.onPartial?.('글자로 바꾸는 중…', true);
    this._log('서버로 받아쓰기 요청');
    try {
      const text = await transcribe(blob, (line) => this._log(line));
      this.finalText = text;
      if (!text) {
        this._log('결과: 빈 문장');
        this.onError?.('소리는 들었는데 문장으로 바꾸지 못했습니다. 다시 말씀해 주세요.');
        return '';
      }
      this._log(`결과: ${text}`);
      this.onFinalChunk?.(text, text);
      this.onPartial?.(text, false);
      this.onSilence?.(text);
      return text;
    } catch (e) {
      const msg = e?.message || '음성 인식에 실패했습니다.';
      this._log(`실패: ${msg}`);
      this.onError?.(msg);
      return '';
    }
  }

  _stopRecorder() {
    const rec = this.recorder;
    this.recorder = null;
    if (!rec || rec.state === 'inactive') {
      return Promise.resolve(this._chunks.length ? new Blob(this._chunks, { type: this._mime }) : null);
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        setTimeout(() => {
          resolve(this._chunks.length ? new Blob(this._chunks, { type: this._mime }) : null);
        }, 40);
      };
      try {
        rec.stop();
      } catch {
        resolve(this._chunks.length ? new Blob(this._chunks, { type: this._mime }) : null);
      }
    });
  }

  _releaseStream() {
    clearTimeout(this._zeroTimer);
    cancelAnimationFrame(this._raf);
    this.recordStream?.getTracks().forEach((t) => t.stop());
    this.recordStream = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    try {
      this.audioCtx?.close();
    } catch {
      /* ignore */
    }
    this.audioCtx = null;
    this.analyser = null;
  }

  stop() {
    this._running = false;
    clearTimeout(this._silenceTimer);
    cancelAnimationFrame(this._raf);
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      /* ignore */
    }
    this.recorder = null;
    this._chunks = [];
    this._releaseStream();
    return this.finalText.trim();
  }
}

async function transcribe(blob, log = () => {}) {
  const audio = await blobToBase64(blob);
  log(`전송 ${audio.length}자 (base64)`);
  let res;
  try {
    res = await fetch('/api/stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, mime: blob.type || 'audio/webm' }),
    });
  } catch (e) {
    throw new Error(`서버에 연결하지 못했습니다 (${e?.message || e})`);
  }
  const data = await res.json().catch(() => ({}));
  log(`서버 응답 ${res.status}`);
  if (!res.ok) throw new Error(data.error || `음성 인식 실패 (HTTP ${res.status})`);
  return String(data.text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      resolve(raw.includes(',') ? raw.split(',')[1] : raw);
    };
    reader.onerror = () => reject(new Error('녹음을 읽지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}
