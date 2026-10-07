
export function createToneBus() {
  let ctx = null;
  let nodes = [];
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function stopAll() {
    nodes.forEach((n) => { try { n.stop(); } catch (e) {} });
    nodes = [];
  }
  function playSine(freq, dur, gain = 0.04, type = "sine") {
    const c = ensure();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(c.destination);
    const t = c.currentTime;
    g.gain.exponentialRampToValueAtTime(gain, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
    nodes.push(o);
  }
  return {
    stopAll,
    choeum() { stopAll(); playSine(196, 2.2, 0.05); },
    buneum() {
      stopAll();
      [220, 247, 277, 311, 349].forEach((f, i) => {
        setTimeout(() => playSine(f, 1.4, 0.028), i * 180);
      });
    },
    hapmyeong() {
      stopAll();
      [196, 247, 294, 370].forEach((f, i) => playSine(f, 2.4, 0.022 + i * 0.002));
    },
    gwieum() {
      stopAll();
      playSine(196, 2.8, 0.05);
    },
    drone() { stopAll(); playSine(110, 8, 0.02); },
    droneLoop() {
      stopAll();
      const c = ensure();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = 110;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(c.destination);
      const t = c.currentTime;
      g.gain.exponentialRampToValueAtTime(0.018, t + 0.6);
      o.start(t);
      nodes.push(o);
      /* 게인 노드도 추적해 stopAll에서 끊김 */
      nodes.push({ stop() { try { g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3); o.stop(c.currentTime + 0.35); } catch (e) {} } });
    },
  };
}
