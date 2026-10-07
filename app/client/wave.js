/** Amber concentric resonance wave — light booth background */
export class WaveField {
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
    this._raf = requestAnimationFrame(this.loop);
  }

  setMode(mode) {
    this.mode = mode || 'idle';
  }

  /** Normalized 0–1 screen position for resonance ring (smoothed by caller) */
  setFocus(x, y) {
    // Wave also eases slowly toward head region
    const nx = Math.max(0.2, Math.min(0.8, Number(x) || 0.5));
    const ny = Math.max(0.2, Math.min(0.65, Number(y) || 0.38));
    this.focusX = (this.focusX ?? 0.5) * 0.94 + nx * 0.06;
    this.focusY = (this.focusY ?? 0.38) * 0.94 + ny * 0.06;
  }

  setRms(v) {
    this.rms = Math.max(0, Math.min(1, Number(v) || 0));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  loop(now) {
    const t = (now - this.t0) / 1000;
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    if (this.mode === 'listen') this.target = 0.18 + this.rms * 0.5;
    else if (this.mode === 'comfort') this.target = 0.11 + Math.sin(t * 0.85) * 0.028;
    else if (this.mode === 'crisis') this.target = 0.07;
    else this.target = 0.11 + Math.sin(t * 0.32) * 0.03;

    this.amp += (this.target - this.amp) * 0.07;

    const cx = w * (this.focusX ?? 0.5);
    const cy = h * (this.focusY ?? 0.38);
    const base = Math.min(w, h) * 0.17;

    // soft amber haze
    const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 3.4);
    haze.addColorStop(0, `rgba(201, 122, 48, ${0.09 + this.amp * 0.1})`);
    haze.addColorStop(0.5, `rgba(201, 122, 48, ${0.03 + this.amp * 0.03})`);
    haze.addColorStop(1, 'rgba(201, 122, 48, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);

    // concentric ripples (thin rings)
    for (let i = 6; i >= 0; i--) {
      const r = base * (0.5 + i * 0.2) * (1 + this.amp * (0.35 - i * 0.03));
      const a = 0.06 + (6 - i) * 0.04 + this.amp * 0.08;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(184, 104, 36, ${a})`;
      ctx.lineWidth = i === 0 ? 2.2 : 1.1;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // primary ring
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

    this._raf = requestAnimationFrame(this.loop);
  }
}
