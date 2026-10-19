/* WebAudio 合成音效，无需音频文件 */
window.SFX = (function () {
  let ctx = null;
  let muted = localStorage.getItem('hx_muted') === '1';
  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (muted) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.3, filterFreq = 1200, delay = 0, endFreq = 100) {
    if (muted) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFreq, t);
    f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }
  return {
    unlock() { ac(); },
    get muted() { return muted; },
    toggle() { muted = !muted; localStorage.setItem('hx_muted', muted ? '1' : '0'); return muted; },
    shoot() { noise(0.12, 0.35, 6000, 0, 800); tone(900, 0.12, 'square', 0.08, 120); },
    boom(combo = 0) {
      noise(0.5, 0.5, 2500, 0.08, 60);
      tone(110, 0.4, 'sine', 0.35, 40, 0.08);
      const base = 520 * Math.pow(1.06, Math.min(combo, 12));
      tone(base, 0.12, 'triangle', 0.12, null, 0.12);
      tone(base * 1.5, 0.15, 'triangle', 0.1, null, 0.2);
    },
    wrong() { tone(200, 0.25, 'sawtooth', 0.12, 110); tone(150, 0.3, 'square', 0.06, 90, 0.08); },
    flip() { tone(700, 0.06, 'sine', 0.08, 1100); },
    tap() { tone(600, 0.04, 'sine', 0.06); },
    ding(combo = 0) { const b = 660 * Math.pow(1.06, Math.min(combo, 12)); tone(b, 0.15, 'triangle', 0.15); tone(b * 1.26, 0.2, 'triangle', 0.12, null, 0.08); },
    tick() { tone(1000, 0.05, 'square', 0.05); },
    go() { tone(880, 0.25, 'triangle', 0.18); },
    end() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, null, i * 0.12)); },
    clear() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.15, 'triangle', 0.12, null, i * 0.07)); },
  };
})();
