/* WebAudio 合成音效（无需音频文件），针对 iPad Safari 做了加固：
 *  - 每次 pointerdown / touchend / click（捕获阶段）检查 AudioContext：
 *    suspended / interrupted → 在手势里 resume()；
 *    状态是 running 但 currentTime 不再前进（iOS 冻结时钟）→ 关闭并重建；
 *    resume 300ms 后仍未 running → 下次手势重建。
 *  - 支持时设置 navigator.audioSession.type = 'playback'（不受静音开关影响）。
 *  - 每个音结束后 disconnect 所有节点，并限制同时发声数量，防止 WebKit 节点泄漏导致静音。
 *  - 切后台 / pageshow(bfcache) / 被系统打断后标记，下次手势恢复。 */
window.SFX = (function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, gen = 0, lastCT = -1, lastWall = 0, needRebuild = false, reviveT = 0, noiseBuf = null, silentBuf = null;
  let muted = localStorage.getItem('hx_muted') === '1';
  let active = 0; const MAXV = 32;
  const stats = { created: 0, recreated: 0, resumed: 0, capped: 0, played: 0, skipped: 0 };
  const log = [];
  function setSession() { try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {} }
  function build() {
    if (!AC) return null;
    try {
      setSession();
      ctx = new AC(); gen++; stats.created++; noiseBuf = null; silentBuf = null; active = 0; lastCT = -1;
      master = ctx.createGain(); master.gain.value = 0.9;
      let comp = null;
      try { comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; } catch (e) { comp = null; }
      if (comp) { master.connect(comp); comp.connect(ctx.destination); } else master.connect(ctx.destination);
      const me = ctx;
      ctx.onstatechange = () => { if (ctx === me && ctx.state !== 'running' && ctx.state !== 'closed') needRebuild = needRebuild || ctx.state === 'interrupted'; };
    } catch (e) { ctx = null; master = null; }
    return ctx;
  }
  function resumeNow() {
    try { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && ctx.resume) { stats.resumed++; const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); return p; } } catch (e) {}
    return null;
  }
  function prime() { // 1 个采样的静音，让 iOS 在手势中真正打开音频通路
    try {
      if (!silentBuf) silentBuf = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource(); s.buffer = silentBuf; s.connect(ctx.destination);
      s.onended = () => { try { s.disconnect(); } catch (e) {} }; s.start(0);
    } catch (e) {}
  }
  function recreate() {
    const old = ctx; ctx = null; master = null; stats.recreated++;
    try { if (old && old.state !== 'closed' && old.close) { const p = old.close(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
    build(); resumeNow(); prime();
  }
  function check() {
    clearTimeout(reviveT); const g = gen;
    reviveT = setTimeout(() => { if (!ctx || g !== gen) return; if (ctx.state !== 'running') needRebuild = true; seen(); }, 300);
  }
  // 每次手势调用
  function unlock() {
    if (!AC) return;
    setSession();
    if (!ctx || ctx.state === 'closed') { build(); resumeNow(); prime(); check(); return; }
    if (needRebuild) { needRebuild = false; recreate(); check(); return; }
    const wall = performance.now();
    if (ctx.state === 'running' && lastCT >= 0 && wall - lastWall > 250 && ctx.currentTime === lastCT) { recreate(); check(); return; } // 冻结时钟
    if (ctx.state !== 'running') resumeNow(); // suspended / interrupted
    prime(); check();
    seen();
  }
  // 只有时钟真的前进时才刷新时间戳，这样“运行中但时钟不动”能被识别出来
  function seen() { if (!ctx) return; const ct = ctx.currentTime; if (ct !== lastCT) { lastCT = ct; lastWall = performance.now(); } }
  ['pointerdown', 'touchend', 'click'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lastCT = -1; else if (ctx && ctx.state !== 'running') needRebuild = true; });
  window.addEventListener('pageshow', e => { if (e.persisted && ctx) needRebuild = true; });

  // 只在上下文正在运行时排队播放；绝不在冻结 / 挂起的时钟上排队（否则恢复时会一下补放一串）
  function ready() {
    if (muted || !AC) return false;
    if (!ctx) return false;
    if (ctx.state !== 'running') { resumeNow(); if (ctx.state !== 'running') { stats.skipped++; return false; } }
    return true;
  }
  function track(src, nodes) {
    active++;
    src.onended = () => { active = Math.max(0, active - 1); nodes.forEach(n => { try { n.disconnect(); } catch (e) {} }); };
  }
  function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!ready()) return;
    if (active >= MAXV) { stats.capped++; return; }
    const t = ctx.currentTime + 0.005 + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    track(o, [o, g]); o.start(t); o.stop(t + dur + 0.03); stats.played++;
  }
  function noise(dur, vol = 0.3, filterFreq = 1200, delay = 0, endFreq = 100, type = 'lowpass') {
    if (!ready()) return;
    if (active >= MAXV) { stats.capped++; return; }
    const t = ctx.currentTime + 0.005 + delay;
    if (!noiseBuf) { const n = Math.floor(ctx.sampleRate * 0.6); noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(filterFreq, t);
    f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    track(src, [src, f, g]); src.start(t); src.stop(t + dur + 0.03); stats.played++;
  }
  const L = (k, fn) => function () { log.push({ k, t: Date.now(), ok: ready() }); if (log.length > 300) log.shift(); return fn.apply(null, arguments); };
  const api = {
    unlock,
    get muted() { return muted; },
    toggle() { muted = !muted; localStorage.setItem('hx_muted', muted ? '1' : '0'); return muted; },
    info: () => ({ state: ctx ? ctx.state : 'none', gen, active, needRebuild, stats, session: navigator.audioSession ? navigator.audioSession.type : null }),
    log,
    _ctx: () => ctx,
  };
  const S = {
    shoot() { noise(0.12, 0.35, 6000, 0, 800); tone(900, 0.12, 'square', 0.08, 120); },
    boom(combo = 0) {
      noise(0.5, 0.5, 2500, 0.08, 60); tone(110, 0.4, 'sine', 0.35, 40, 0.08);
      const base = 520 * Math.pow(1.06, Math.min(combo, 12));
      tone(base, 0.12, 'triangle', 0.12, null, 0.12); tone(base * 1.5, 0.15, 'triangle', 0.1, null, 0.2);
    },
    wrong() { tone(200, 0.25, 'sawtooth', 0.12, 110); tone(150, 0.3, 'square', 0.06, 90, 0.08); },
    flip() { tone(700, 0.06, 'sine', 0.08, 1100); },
    tap() { tone(600, 0.04, 'sine', 0.06); },
    ding(combo = 0) { const b = 660 * Math.pow(1.06, Math.min(combo, 12)); tone(b, 0.15, 'triangle', 0.15); tone(b * 1.26, 0.2, 'triangle', 0.12, null, 0.08); },
    tick() { tone(1000, 0.05, 'square', 0.05); },
    go() { tone(880, 0.25, 'triangle', 0.18); },
    end() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, null, i * 0.12)); },
    bubble() { for (let i = 0; i < 6; i++) tone(300 + Math.random() * 500, 0.06, 'sine', 0.07, 900 + Math.random() * 600, i * 0.09); },
    whoosh() { noise(0.35, 0.25, 3000, 0, 300); tone(300, 0.3, 'triangle', 0.08, 700); },
    fizz() { noise(0.4, 0.18, 8000, 0, 2000); },
    pop() { noise(0.08, 0.4, 4000, 0, 400); tone(500, 0.1, 'sine', 0.12, 150); },
    clear() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.15, 'triangle', 0.12, null, i * 0.07)); },
    // 🍉 切西瓜
    slice() { noise(0.16, 0.28, 700, 0, 3200, 'bandpass'); },
    splat() { noise(0.22, 0.35, 1800, 0, 200); tone(180, 0.16, 'sine', 0.2, 70); },
    chime(bonus) { const n = [1046, 1318, 1568]; n.forEach((f, i) => tone(f, i === 2 ? 0.5 : 0.28, 'sine', 0.13, null, i * 0.075)); if (bonus) [2093, 2637, 3136].forEach((f, i) => tone(f, 0.22, 'sine', 0.06, null, 0.28 + i * 0.05)); },
    soft() { tone(220, 0.24, 'sine', 0.2, 180); },
    fanfare() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.4, i % 2 ? 'sine' : 'triangle', 0.12, null, i * 0.085)); [523, 659, 784, 1046].forEach(f => tone(f, 1.1, 'sine', 0.07, null, 0.55)); },
    levelup() { [523, 587, 659, 698, 784, 880, 988, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.09, null, i * 0.055)); },
  };
  Object.keys(S).forEach(k => { api[k] = L(k, S[k]); });
  return api;
})();
