/**
 * Camera → soft amber particle cloud near the head.
 * Optional debug panel: live video + recognition overlay.
 */
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Pose connections for debug skeleton (subset) */
const EDGES = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [15, 17], [15, 19], [16, 18], [16, 20],
  [0, 7], [0, 8],
];

export class SilhouetteField {
  constructor(canvas, { onFocus, debugVideo, debugOverlay } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onFocus = onFocus || (() => {});
    this.debugVideo = debugVideo || null;
    this.debugOverlay = debugOverlay || null;
    this.debugCtx = debugOverlay ? debugOverlay.getContext('2d') : null;
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.autoplay = true;
    this.stream = null;
    this.landmarker = null;
    this.running = false;
    this.lastDetect = 0;
    this.lastLandmarks = null;
    this.head = { x: 0.5, y: 0.38 };
    this.headSmooth = { x: 0.5, y: 0.38 };
    this.hasPerson = false;
    this.particles = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      const r = 0.04 + (i % 5) * 0.018;
      return {
        x: 0.5 + Math.cos(a) * r,
        y: 0.38 + Math.sin(a) * r * 0.85,
        vx: 0,
        vy: 0,
        ox: Math.cos(a) * r,
        oy: Math.sin(a) * r * 0.9,
        lag: 0.006 + (i % 8) * 0.0015,
        size: 1.4 + (i % 4) * 0.4,
        alpha: 0.22 + (i % 5) * 0.07,
        drift: 0.4 + (i % 6) * 0.15,
      };
    });
    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setDebugTargets(debugVideo, debugOverlay) {
    this.debugVideo = debugVideo || null;
    this.debugOverlay = debugOverlay || null;
    this.debugCtx = debugOverlay ? debugOverlay.getContext('2d') : null;
    if (this.debugVideo && this.stream) {
      this.debugVideo.srcObject = this.stream;
      this.debugVideo.playsInline = true;
      this.debugVideo.muted = true;
      this.debugVideo.play().catch(() => {});
    }
  }

  async start() {
    if (this.running) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      if (this.debugVideo) {
        this.debugVideo.srcObject = this.stream;
        this.debugVideo.playsInline = true;
        this.debugVideo.muted = true;
        await this.debugVideo.play().catch(() => {});
      }

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      this.running = true;
      this._raf = requestAnimationFrame(this.loop);
      return true;
    } catch (e) {
      console.warn('silhouette camera', e);
      this.stop();
      return false;
    }
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    try {
      this.stream?.getTracks?.().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    this.stream = null;
    this.landmarker?.close?.();
    this.landmarker = null;
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  detect(now) {
    if (!this.landmarker || this.video.readyState < 2) return;
    if (now - this.lastDetect < 90) return;
    this.lastDetect = now;

    const result = this.landmarker.detectForVideo(this.video, now);
    const lm = result?.landmarks?.[0];
    if (!lm) {
      this.hasPerson = false;
      this.lastLandmarks = null;
      return;
    }

    this.hasPerson = true;
    this.lastLandmarks = lm;
    const nose = lm[0];
    const earL = lm[7];
    const earR = lm[8];
    const hx = 1 - (nose.x * 0.5 + earL.x * 0.25 + earR.x * 0.25);
    const hy = nose.y * 0.55 + earL.y * 0.225 + earR.y * 0.225;
    this.head.x = hx;
    this.head.y = hy * 0.92 + 0.04;
  }

  drawDebug() {
    const overlay = this.debugOverlay;
    const ctx = this.debugCtx;
    const video = this.debugVideo;
    if (!overlay || !ctx || !video) return;

    const w = overlay.clientWidth || 280;
    const h = overlay.clientHeight || 210;
    if (overlay.width !== w || overlay.height !== h) {
      overlay.width = w;
      overlay.height = h;
    }
    ctx.clearRect(0, 0, w, h);

    const lm = this.lastLandmarks;
    if (!lm) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '12px sans-serif';
      ctx.fillText(this.hasPerson ? '추적 중…' : '사람 없음', 10, 20);
      return;
    }

    // Mirror-space draw to match mirrored video CSS
    const px = (p) => (1 - p.x) * w;
    const py = (p) => p.y * h;

    ctx.strokeStyle = 'rgba(255, 180, 80, 0.85)';
    ctx.lineWidth = 2;
    for (const [a, b] of EDGES) {
      if (!lm[a] || !lm[b]) continue;
      ctx.beginPath();
      ctx.moveTo(px(lm[a]), py(lm[a]));
      ctx.lineTo(px(lm[b]), py(lm[b]));
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 200, 100, 0.95)';
    for (const i of [0, 7, 8, 11, 12, 15, 16, 23, 24]) {
      if (!lm[i]) continue;
      ctx.beginPath();
      ctx.arc(px(lm[i]), py(lm[i]), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head gather region (what particles actually use)
    const hx = this.head.x * w;
    const hy = this.head.y * h;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(80, 200, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.arc(hx, hy, Math.min(w, h) * 0.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(80, 200, 255, 0.95)';
    ctx.font = '11px sans-serif';
    ctx.fillText('입자 모이는 곳', hx - 36, hy - Math.min(w, h) * 0.14 - 6);
  }

  loop(now) {
    if (!this.running) return;
    this.detect(now);
    this.drawDebug();

    this.headSmooth.x = lerp(this.headSmooth.x, this.head.x, 0.018);
    this.headSmooth.y = lerp(this.headSmooth.y, this.head.y, 0.018);
    this.onFocus(this.headSmooth.x, this.headSmooth.y);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const cx = this.headSmooth.x;
    const cy = this.headSmooth.y;
    const t = now * 0.00025;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const breathe = 1 + Math.sin(t * p.drift + i) * 0.12;
      const tx = cx + p.ox * breathe + Math.sin(t * 0.7 + i * 0.3) * 0.008;
      const ty = cy + p.oy * breathe + Math.cos(t * 0.6 + i * 0.25) * 0.007;

      p.vx += (tx - p.x) * p.lag;
      p.vy += (ty - p.y) * p.lag;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.x += p.vx;
      p.y += p.vy;

      ctx.beginPath();
      ctx.fillStyle = `rgba(201, 120, 48, ${p.alpha})`;
      ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    const fx = this.headSmooth.x * w;
    const fy = this.headSmooth.y * h;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.min(w, h) * 0.16);
    g.addColorStop(0, 'rgba(201, 120, 48, 0.05)');
    g.addColorStop(1, 'rgba(201, 120, 48, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    this._raf = requestAnimationFrame(this.loop);
  }
}
