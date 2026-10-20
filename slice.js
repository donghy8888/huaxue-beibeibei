/* 🍉 切西瓜复习：把今天复习/练习过的知识做成“切西瓜”
 * 参考 math-app 的切公式引擎（DOM 西瓜 + canvas 刀光/果汁粒子），改为化学题库：
 *  - 题库：今天在本 App 里复习过的内容（化合价、符号↔名称、化学式、实验现象/找茬/鉴别/实验台/装置、错题本练习）；
 *    不足 4 个时用近期高频内容补足，再不够用核心数据。
 *  - 西瓜漂浮在原地不掉落；等待不扣心。切对 → 裂开 + 果汁汇聚成发光大卡；切错 → 扣 1 颗心，正确的发光，加入「今日巩固」。
 *  - 速度计分：≤3 秒 ⚡神速满分，15 秒后只有基础分；连击倍率；偶尔出现金西瓜（双倍）。 */
(function () {
  'use strict';
  const H = window.HX, C = H.core, CH = window.CHEM, LAB = window.LAB;
  const { $, shuffle, fmt, vs, store, toast } = C;
  const ROUNDS = 10, LIVES = 3, FAST = 3, SLOWT = 15;
  const esc = s => String(s).replace(/</g, '&lt;');
  const eq = s => (H.lab ? H.lab.eq(s) : s);

  /* =================== 题目生成 =================== */
  const symH = it => (it.group ? fmt(it.sym) : it.sym);
  const ASK = [...CH.ELEMENTS.filter(e => !e.noble), ...CH.GROUPS];
  const vstr = it => it.val.map(vs).join(' / ');
  const pick3 = (cands, right) => shuffle([...new Set(cands)].filter(x => x !== right)).slice(0, 3);
  function makeItem(key) {
    const i = key.indexOf(':'), t = key.slice(0, i), id = key.slice(i + 1);
    try {
      if (t === 'val') {
        const it = C.BY_ID[id]; if (!it || it.noble) return null;
        const ans = vstr(it);
        const opts = pick3(ASK.filter(o => !o.val.every(v => it.val.includes(v))).map(vstr), ans);
        return { key, label: '化合价', prompt: `<b class="big">${symH(it)}</b> ${it.name} 的常见化合价是？`, answer: ans, opts,
          reveal: card(`${it.name} ${symH(it)}`, ans, it.note || (it.val.length > 1 ? '多价元素，记住每种价态的代表物' : '')), q: `${symH(it)}（${it.name}）的化合价`, a: ans, tip: it.note || '' };
      }
      if (t === 'name') {
        const it = C.BY_ID[id]; if (!it) return null;
        const pool = C.ALL.filter(o => !!o.group === !!it.group);
        return { key, label: it.group ? '原子团名称' : '元素名称', prompt: `<b class="big">${symH(it)}</b> 是什么？`, answer: it.name, opts: pick3(pool.map(o => o.name), it.name),
          reveal: card(`${symH(it)} = ${it.name}`, it.noble ? '稀有气体' : '化合价 ' + vstr(it), it.note || ''), q: `${symH(it)} 的名称`, a: it.name, tip: it.note || '' };
      }
      if (t === 'form') {
        const combo = H.COMBOS.find(c => c.key === id); if (!combo) return null;
        const q = H.makeQuestion(combo), { c, a } = combo;
        const ion = (s, v, g) => `${g ? fmt(s) : s}<sup>${vs(v)}</sup>`;
        return { key, label: '化学式', prompt: `${ion(c.sym, c.v, c.group)} 与 ${ion(a.sym, a.v, a.group)} 组成的化合物？`, answer: q.right, opts: q.options.filter(o => o !== q.right),
          reveal: card(q.name, q.right, '化合价“交叉约简”：正负化合价代数和为 0'), q: `${q.name}的化学式`, a: q.right, tip: '正负化合价代数和为 0' };
      }
      if (t === 'phen') {
        const p = LAB.PHENOMENA.find(x => x.id === id); if (!p) return null;
        return { key, label: '实验现象', prompt: `${esc(p.title)}，现象是？`, answer: esc(p.ok), opts: p.no.map(esc), reveal: card(esc(p.title), esc(p.ok), p.note || '', true), q: esc(p.title), a: esc(p.ok), tip: p.note || '' };
      }
      if (t === 'spot') {
        const m = LAB.MISTAKES.find(x => x.id === id); if (!m) return null;
        return { key, label: '实验操作', prompt: esc(m.ask.replace('，错在哪？', '：正确做法是？')), answer: esc(m.ok), opts: m.no.map(esc), reveal: card(esc(m.ask.replace('，错在哪？', '')), esc(m.ok), '规范操作是实验题必考点', true), q: esc(m.ask), a: esc(m.ok), tip: '' };
      }
      if (t === 'gas') {
        const g = LAB.GASES.find(x => x.id === id); if (!g) return null;
        return { key, label: '气体鉴别', prompt: `怎样鉴别<b>${g.name}</b>？`, answer: g.key, opts: pick3(LAB.GASES.map(x => x.key), g.key),
          reveal: card(`鉴别${g.name}`, g.key, '先想“这种气体最特别的性质”', true), q: `怎样鉴别${g.name}`, a: g.key, tip: '' };
      }
      if (t === 'bench') {
        const [eid, qi] = id.split(':'); const ex = LAB.BENCH.find(x => x.id === eid); const qq = ex && ex.qs[+qi]; if (!qq) return null;
        const f = /=/.test(qq.a[0]) ? eq : esc;
        return { key, label: '实验台', prompt: `${ex.title}：${qq.q}`, answer: f(qq.a[0]), opts: qq.a.slice(1).map(f), reveal: card(ex.title, f(qq.a[0]), qq.why || '', !/=/.test(qq.a[0])), q: `${ex.title}：${qq.q}`, a: f(qq.a[0]), tip: qq.why || '' };
      }
      if (t === 'dev') {
        const task = LAB.DEVICE_TASKS.find(x => x.id === id); if (!task) return null;
        const okc = LAB.DEVICE_COL.filter(p => p.ok.includes(task.id)).map(p => p.name);
        const names = ['排水法', '向上排空气法', '向下排空气法'], combos = [];
        names.forEach((a, i) => { combos.push(a); names.slice(i + 1).forEach(b => combos.push(a + ' 或 ' + b)); });
        const ans = okc.join(' 或 ');
        return { key, label: '装置', prompt: `${task.title}：${task.gas} 可用哪些方法收集？（选最完整的）`, answer: ans, opts: pick3(combos, ans),
          reveal: card(`${task.gas} 的收集`, ans, task.tip, true), q: `${task.title}：收集方法`, a: ans, tip: task.tip };
      }
    } catch (e) { return null; }
    return null;
  }
  function card(title, big, tip, small) {
    return `<div class="sl-bt">${title}</div><div class="sl-bf${small ? ' sm' : ''}">${big}</div>${tip ? `<div class="sl-bs">💡 ${tip}</div>` : ''}`;
  }
  const CORE = ['val:O', 'val:H', 'val:Na', 'val:Fe', 'val:Cu', 'val:Al', 'val:C', 'val:S', 'val:g:SO4', 'val:g:OH', 'phen:fe-o2', 'phen:s-o2', 'phen:p-air', 'phen:co2-lime', 'name:Mn', 'name:Hg'];
  // 组题：今日巩固 → 今天复习过（错得多的优先）→（不足 4 个）近期高频 → 核心数据；凑满 10 题
  function buildPool() {
    const td = C.today(), hist = C.hist(), day = hist.days[td] || {};
    const cons = store.get('hx_consol', {}), consKeys = cons.day === td ? (cons.items || []).map(c => c.key) : [];
    let keys = [...new Set([...consKeys, ...Object.keys(day).sort((a, b) => (day[b].w - day[a].w) || (day[b].t - day[a].t))])];
    let items = keys.map(makeItem).filter(Boolean);
    const todayN = items.length;
    let filled = false;
    if (items.length < 4) {
      filled = true;
      const have = new Set(items.map(i => i.key));
      const wk = Date.now() - 7 * 864e5;
      const freq = Object.keys(hist.freq).filter(k => !have.has(k) && hist.freq[k].last > wk).sort((a, b) => hist.freq[b].n - hist.freq[a].n);
      const wb = Object.keys(C.wrongBook()).map(id => 'val:' + id).concat(Object.keys(C.labWrong()).filter(k => /^(phen|spot|gas):/.test(k)));
      for (const k of [...freq, ...wb, ...shuffle(CORE)]) { if (items.length >= Math.max(6, todayN)) break; if (have.has(k)) continue; const it = makeItem(k); if (it) { items.push(it); have.add(k); } }
    }
    // 凑满 10 题：今天的题优先，可以重复（不相邻）
    const base = shuffle(items.slice(0, todayN || items.length)).concat(shuffle(items.slice(todayN || items.length)));
    const out = [];
    let guard = 0;
    while (out.length < ROUNDS && base.length && guard++ < 100) {
      for (const it of (out.length ? shuffle(base) : base)) {
        if (out.length >= ROUNDS) break;
        if (out.length && out[out.length - 1].key === it.key && base.length > 1) continue;
        out.push(makeItem(it.key) || it);
      }
    }
    return { items: out, todayN, filled };
  }

  /* =================== 积分 / 每日局数 / 勋章 =================== */
  function sliceData() {
    const d = store.get('hx_slice', {}); const td = C.today();
    if (d.day !== td) { d.day = td; d.rounds = 0; d.todayPts = 0; }
    d.best = d.best || 0; d.points = d.points || 0; d.badges = d.badges || {};
    return d;
  }
  const bonusFor = rounds => Math.min(2, Math.round((1 + 0.1 * rounds) * 10) / 10);
  function addConsol(it) {
    const td = C.today(); const c = store.get('hx_consol', {});
    if (c.day !== td) { c.day = td; c.items = []; }
    if (!c.items.some(x => x.key === it.key)) c.items.unshift({ key: it.key, q: it.q, a: it.a, tip: it.tip, t: Date.now() });
    store.set('hx_consol', c);
    C.track(it.key, false);
  }

  /* =================== 引擎（改编自 math-app/src/slice.js） =================== */
  let G = null;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const now = () => performance.now();
  function segHit(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy; let t = L ? ((cx - x1) * dx + (cy - y1) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx - cx, py = y1 + t * dy - cy; return px * px + py * py <= r * r;
  }
  function halfPoly(w, h, dx, dy, side) {
    const pts = [[0, 0], [w, 0], [w, h], [0, h]], cx = w / 2, cy = h / 2, out = [];
    const s = p => side * ((p[0] - cx) * dy - (p[1] - cy) * dx);
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4], sa = s(a), sb = s(b);
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    return 'polygon(' + out.map(p => (p[0] / w * 100).toFixed(1) + '% ' + (p[1] / h * 100).toFixed(1) + '%').join(',') + ')';
  }
  const sfx = (k, o) => { try { SFX[k] && SFX[k](o); } catch (e) {} };
  const COLORS = ['#e85d75', '#f28b82', '#ffb3a7', '#7cc47f', '#f6c453'];

  function start(cfg) {
    close();
    const root = el('div', 'slice'); root.id = 'slice';
    root.innerHTML = '<div class="sl-top"><button class="sl-x" aria-label="退出">✕</button><div class="sl-rd"></div><div class="sl-hearts"></div><div class="grow"></div><div class="sl-combo"></div><div class="sl-score">0</div></div>'
      + '<div class="sl-prompt"><div class="sl-pl"></div><div class="sl-pq"></div><div class="sl-spd"><i></i><span></span></div></div>'
      + '<div class="sl-stage"><canvas class="sl-cv"></canvas><div class="sl-fruits"></div><div class="sl-reveal"></div><div class="sl-float"></div></div>';
    document.body.appendChild(root); document.body.classList.add('slicing');
    G = { cfg, root, stage: root.querySelector('.sl-stage'), cv: root.querySelector('.sl-cv'), layer: root.querySelector('.sl-fruits'), reveal: root.querySelector('.sl-reveal'), flt: root.querySelector('.sl-float'),
      items: cfg.items.slice(0, ROUNDS), round: -1, lives: LIVES, score: 0, combo: 0, maxCombo: 0, correct: 0, wrong: 0, gold: 0, seen: [], weak: [], fruits: [], debris: [], parts: [], trail: [],
      raf: 0, last: now(), shake: 0, ptr: null, lastWhoosh: 0, times: [], rt: 0, slow: 1 };
    G.ctx = G.cv.getContext('2d');
    root.querySelector('.sl-x').addEventListener('click', () => { const c = G && G.cfg; close(); if (c && c.onQuit) c.onQuit(); });
    bindInput(); resize(); G.onResize = resize; window.addEventListener('resize', G.onResize);
    hud(); nextRound(); G.raf = requestAnimationFrame(loop);
  }
  function close() {
    if (!G) return; cancelAnimationFrame(G.raf); window.removeEventListener('resize', G.onResize);
    clearTimeout(G.t1); clearTimeout(G.t2); clearTimeout(G.t3); clearTimeout(G.t4);
    if (G.root.parentNode) G.root.remove(); document.body.classList.remove('slicing'); G = null;
  }
  function resize() {
    if (!G) return;
    const r = G.stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    G.W = r.width; G.H = r.height; G.cv.width = Math.round(r.width * dpr); G.cv.height = Math.round(r.height * dpr);
    G.cv.style.width = r.width + 'px'; G.cv.style.height = r.height + 'px'; G.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const mult = () => Math.min(3, 1 + 0.5 * Math.floor(G.combo / 3));
  const speedK = t => (t <= FAST ? 1 : Math.max(0, 1 - (t - FAST) / (SLOWT - FAST)));
  function hud() {
    const r = G.root;
    r.querySelector('.sl-rd').textContent = Math.min(G.round + 1, G.items.length) + '/' + G.items.length;
    r.querySelector('.sl-hearts').innerHTML = [0, 1, 2].map(i => `<span class="${i < G.lives ? 'on' : ''}">${i < G.lives ? '❤️' : '🤍'}</span>`).join('');
    r.querySelector('.sl-score').textContent = G.score;
    const m = mult(); r.querySelector('.sl-combo').innerHTML = G.combo >= 2 ? '连击 <b>' + G.combo + '</b>' + (m > 1 ? ' · ×' + m : '') : '';
  }
  function spdBar() {
    const b = G.root.querySelector('.sl-spd'), k = speedK(G.rt);
    b.firstChild.style.width = (k * 100).toFixed(1) + '%'; b.className = 'sl-spd' + (G.rt < FAST ? ' fast' : k > 0.4 ? ' mid' : ' slow');
    b.lastChild.textContent = (G.rt < FAST ? '⚡神速 ' : '⏱ ') + G.rt.toFixed(1) + 's';
  }
  function nextRound() {
    G.round++;
    if (G.round >= G.items.length || G.lives <= 0) { finish(); return; }
    const it = G.items[G.round]; G.cur = it; G.state = 'fly'; G.failed = false; G.slow = 1;
    G.root.querySelector('.sl-pl').textContent = it.label || '';
    G.root.querySelector('.sl-pq').innerHTML = it.prompt;
    hud();
    const nOpt = Math.min(it.opts.length, G.W < 560 ? 2 : 3); // 手机 3 个西瓜，iPad 4 个
    const all = shuffle([{ html: it.answer, ok: true }].concat(shuffle(it.opts).slice(0, nOpt).map(h => ({ html: h, ok: false }))));
    const gold = G.round >= 2 && Math.random() < (window.__hxSliceGold != null ? window.__hxSliceGold : 0.18);
    G.rt = 0; resize();
    G.top = Math.max(0, G.root.querySelector('.sl-prompt').getBoundingClientRect().bottom - G.stage.getBoundingClientRect().top) + 8;
    const slots = shuffle(all.map((_, i) => (i + 0.5) / all.length));
    G.fruits = all.map((o, i) => makeFruit(o, i, 1.4, slots[i], gold && o.ok));
  }
  const IN = 0.64, MINS = 0.6;
  function fitFruit(f, W, H) {
    const c = f.firstChild, m = Math.min(W, H), D = Math.max(108, Math.min(185, m * (W < 560 ? 0.3 : 0.2)));
    let Wmax = Math.min(D * 1.7, W * 0.5), Hmax = D * 1.35;
    c.style.whiteSpace = 'nowrap'; c.style.width = ''; c.style.transform = 'translate(-50%,-50%)';
    let b = c.getBoundingClientRect(), cw = b.width, ch = b.height;
    const fit = () => Math.min(1, Wmax * IN / Math.max(cw, 1), Hmax * IN / Math.max(ch, 1));
    let sc = fit();
    if (sc < MINS) { // 长答案：换行并变成椭圆
      c.style.whiteSpace = 'normal'; c.style.width = Math.max(120, Wmax * IN / MINS).toFixed(0) + 'px';
      b = c.getBoundingClientRect(); cw = b.width; ch = b.height; sc = fit();
      if (sc < MINS) { Wmax = Math.min(D * 2, W * 0.62); Hmax = D * 1.7; c.style.width = Math.max(120, Wmax * IN / MINS).toFixed(0) + 'px'; b = c.getBoundingClientRect(); cw = b.width; ch = b.height; sc = fit(); }
      if (sc < MINS) { const M2 = 0.55; c.style.width = Math.max(120, Wmax * IN / M2).toFixed(0) + 'px'; b = c.getBoundingClientRect(); cw = b.width; ch = b.height; sc = fit(); }
    }
    const fw = Math.min(Wmax, Math.max(D, cw * sc / IN)), fh = Math.min(Hmax, Math.max(D, ch * sc / IN));
    f.style.width = fw.toFixed(1) + 'px'; f.style.height = fh.toFixed(1) + 'px'; c.style.transform = 'translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
    return { w: fw, h: fh, sc };
  }
  function measure(list, W, H) {
    const box = el('div', 'slice'); box.style.visibility = 'hidden'; document.body.appendChild(box); const out = [];
    list.forEach((html, i) => {
      const f = el('div', 'sf c' + (i % 4), '<div class="sfc">' + html + '</div>'); box.appendChild(f); const sz = fitFruit(f, W || innerWidth, H || innerHeight);
      const fr = f.getBoundingClientRect(), k = f.firstChild.getBoundingClientRect();
      // 文字矩形的四个角都要在椭圆内
      const cx = (fr.left + fr.right) / 2, cy = (fr.top + fr.bottom) / 2, a = fr.width / 2, b2 = fr.height / 2;
      const inside = [[k.left, k.top], [k.right, k.top], [k.left, k.bottom], [k.right, k.bottom]].every(([x, y]) => ((x - cx) / a) ** 2 + ((y - cy) / b2) ** 2 <= 1.02);
      out.push({ html, inside, fs: 26 * sz.sc, w: fr.width, h: fr.height, over: f.firstChild.scrollWidth > f.firstChild.clientWidth + 1 });
    });
    box.remove(); return out;
  }
  function makeFruit(o, i, T, slot, gold) {
    const f = el('div', 'sf c' + (i % 4) + (gold ? ' gold' : '') + (o.ok ? ' ok' : ''), '<div class="sfc">' + o.html + '</div>');
    G.layer.appendChild(f);
    const sz = fitFruit(f, G.W, G.H), d = sz.h, fw = sz.w, W = G.W, Hh = G.H;
    const ax = Math.max(fw / 2, Math.min(W - fw / 2, W * (0.12 + 0.76 * slot) + rnd(-12, 12)));
    const lo = G.top + d / 2, hi = Math.max(lo, Hh - d / 2 - 6), apex = lo + (hi - lo) * rnd(0.15, 0.85);
    const x0 = Math.max(fw / 2, Math.min(W - fw / 2, ax + rnd(-W * 0.1, W * 0.1))), y0 = Hh + d / 2 + 4, Ti = T * rnd(0.92, 1.08), h0 = y0 - apex;
    const fr = { el: f, ok: o.ok, gold, html: o.html, d, w: fw, r: fw / 2, ry: d / 2, x: x0, y: y0, vx: (ax - x0) / (Ti / 2), vy: -4 * h0 / Ti, g: 8 * h0 / (Ti * Ti), fl: false, ph: rnd(0, 6.3),
      rot: rnd(-8, 8), vr: rnd(-20, 20), delay: i * rnd(0.15, 0.28), alive: true, cut: false, bumped: false };
    place(fr); return fr;
  }
  const place = f => { f.el.style.transform = 'translate3d(' + (f.x - f.r).toFixed(1) + 'px,' + (f.y - f.ry).toFixed(1) + 'px,0) rotate(' + f.rot.toFixed(1) + 'deg)'; };

  function bindInput() {
    const s = G.stage, pos = e => { const r = s.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: now() }; };
    s.addEventListener('pointerdown', e => { if (!G || G.state === 'end') return; G.ptr = pos(e); G.trail.push(G.ptr); try { s.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    s.addEventListener('pointermove', e => { if (!G || !G.ptr) return; const p = pos(e), q = G.ptr; G.ptr = p; G.trail.push(p); swipe(q, p); e.preventDefault(); });
    const up = () => { if (G) G.ptr = null; };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => s.addEventListener(ev, up));
    G.root.addEventListener('touchmove', e => { if (G && G.state === 'end' && e.target.closest && e.target.closest('.sl-end')) return; e.preventDefault(); }, { passive: false });
    G.root.addEventListener('gesturestart', e => e.preventDefault());
    G.reveal.addEventListener('click', () => { if (G && G.state === 'reveal' && G.revealReady) endReveal(); });
  }
  function swipe(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (len < 6) return;
    G.acc = (b.t - (G.lastMv || 0) > 120 ? 0 : (G.acc || 0)) + len; G.lastMv = b.t;
    if (b.t - (G.lastWhoosh || 0) > 140 && G.acc > 40) { G.lastWhoosh = b.t; G.acc = 0; sfx('slice'); }
    if (G.state !== 'fly') return;
    for (const f of G.fruits) {
      if (!f.alive || f.cut || f.delay > 0) continue;
      if (segHit(a.x, f.y + (a.y - f.y) * f.r / f.ry, b.x, f.y + (b.y - f.y) * f.r / f.ry, f.x, f.y, f.r * 0.92)) { hit(f, dx / len, dy / len); if (G.state !== 'fly') return; }
    }
  }
  function hit(f, ux, uy) {
    if (f.ok) {
      f.cut = true; f.alive = false; splitFruit(f, ux, uy); juice(f.x, f.y, f.gold ? 46 : 30); sfx('splat');
      if (!G.failed) {
        G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.correct++; if (f.gold) G.gold++;
        const sp = speedK(G.rt), pts = Math.round((50 + 100 * sp) * mult() * (f.gold ? 2 : 1)); G.score += pts; G.times.push(G.rt);
        floatText(f.x, f.y - f.ry, '+' + pts + (G.rt < FAST ? ' ⚡神速' : '') + (f.gold ? ' 金西瓜！' : ''), (f.gold ? 'gold ' : '') + 'spd');
        sfx('chime', f.gold || G.combo >= 3);
        C.track(G.cur.key, true);
      } else sfx('chime');
      hud(); startReveal(f, G.failed ? 'learn' : 'ok');
    } else {
      if (f.bumped) return; f.bumped = true;
      f.vy = (f.fl ? 0 : Math.min(f.vy, 0)) + uy * 200 - 50; f.vx += ux * 200; f.vr += uy * 70; f.el.classList.add('bump');
      G.shake = 0.3;
      if (!G.failed) { G.failed = true; G.wrong++; G.combo = 0; loseLife(); if (!G.weak.includes(G.cur)) G.weak.push(G.cur); addConsol(G.cur); }
      G.slow = 0.45; G.fruits.forEach(x => { if (x.ok) x.el.classList.add('hint'); });
      sfx('soft'); hud();
      // 显示正确答案：正确西瓜发光；3 秒内没补切就自动展示大卡
      clearTimeout(G.t4); G.t4 = setTimeout(() => { if (G && G.state === 'fly' && G.failed) { const okf = G.fruits.find(x => x.ok && x.alive); startReveal(okf, 'learn'); } }, 3000);
      if (G.lives <= 0) { clearTimeout(G.t4); G.t4 = setTimeout(() => { if (G && G.state === 'fly') { const okf = G.fruits.find(x => x.ok && x.alive); startReveal(okf, 'learn'); } }, 900); }
    }
  }
  function loseLife() { G.lives = Math.max(0, G.lives - 1); const h = G.root.querySelector('.sl-hearts'); h.classList.remove('hurt'); void h.offsetWidth; h.classList.add('hurt'); }
  function splitFruit(f, ux, uy) {
    const w = f.w, h = f.d, nx = -uy, ny = ux;
    [1, -1].forEach(side => {
      const e = f.el.cloneNode(true); e.classList.add('half'); e.classList.remove('hint');
      e.style.clipPath = e.style.webkitClipPath = halfPoly(w, h, ux, uy, side);
      G.layer.appendChild(e);
      G.debris.push({ el: e, r: f.r, ry: f.ry, x: f.x, y: f.y, vx: f.vx * 0.3 + side * nx * 160, vy: Math.min(f.vy, 0) * 0.3 + side * ny * 160 - 60, g: 900, rot: f.rot, vr: side * 140, life: 1.1 });
    });
    f.el.remove();
  }
  function juice(x, y, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = rnd(80, 360); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 700, life: rnd(0.45, 0.8), t: 0, s: rnd(2.5, 6), c: COLORS[i % COLORS.length] }); }
  }
  function floatText(x, y, txt, cls) { const e = el('div', 'sl-ft ' + (cls || ''), txt); e.style.left = Math.min(Math.max(x, 80), G.W - 80) + 'px'; e.style.top = Math.max(y, 30) + 'px'; G.flt.appendChild(e); setTimeout(() => e.remove(), 1100); }
  function startReveal(f, kind) {
    clearTimeout(G.t4);
    G.state = 'reveal'; G.revealReady = false;
    const it = G.cur; G.seen.push({ item: it, kind });
    G.fruits.forEach(x => { if (x.alive) { x.alive = false; x.el.classList.add('fade'); juice(x.x, x.y, 6); const e = x.el; setTimeout(() => e.remove(), 400); } });
    const R = G.reveal; R.className = 'sl-reveal ' + kind;
    R.innerHTML = '<div class="sl-big">' + (kind === 'learn' ? '<div class="sl-tag">再看一眼，记牢 💪</div>' : '') + it.reveal + '</div>';
    const bg = R.firstChild, maxW = Math.min(window.innerWidth * 0.94, 640); let fs = 100;
    bg.style.maxWidth = maxW + 'px';
    for (let i = 0; i < 12 && (bg.scrollWidth > maxW + 1 || bg.offsetHeight > G.H * 0.95); i++) { fs -= 7; bg.style.fontSize = fs + '%'; }
    const br = bg.getBoundingClientRect(), sr = G.stage.getBoundingClientRect();
    const bx = br.left - sr.left, by = br.top - sr.top, bw = br.width, bh = br.height;
    const sx = f ? f.x : G.W / 2, sy = f ? f.y : G.H * 0.85, N = kind === 'ok' ? 90 : 50;
    for (let i = 0; i < N; i++) { // 果汁汇聚成大卡
      let tx, ty;
      if (Math.random() < 0.6) { const p = Math.random() * 2 * (bw + bh); if (p < bw) { tx = bx + p; ty = by; } else if (p < bw + bh) { tx = bx + bw; ty = by + p - bw; } else if (p < 2 * bw + bh) { tx = bx + (p - bw - bh); ty = by + bh; } else { tx = bx; ty = by + (p - 2 * bw - bh); } }
      else { tx = bx + Math.random() * bw; ty = by + Math.random() * bh; }
      G.parts.push({ x: sx, y: sy, x0: sx + rnd(-20, 20), y0: sy + rnd(-20, 20), tx, ty, t: -i * 0.004, dur: rnd(0.5, 0.7), life: 1.3, s: rnd(2.5, 5), c: COLORS[i % COLORS.length], fly: true });
    }
    G.t1 = setTimeout(() => { if (!G) return; R.classList.add('show'); G.revealReady = true; if (kind === 'ok' && G.combo > 0 && G.combo % 5 === 0) sfx('levelup'); }, 560);
    G.t2 = setTimeout(() => { if (G) endReveal(); }, kind === 'ok' ? 2300 : 3200);
  }
  function endReveal() {
    if (!G || G.state !== 'reveal') return; clearTimeout(G.t2);
    G.state = 'gap'; G.reveal.classList.add('out');
    G.t3 = setTimeout(() => { if (!G) return; G.reveal.className = 'sl-reveal'; G.reveal.innerHTML = ''; G.fruits.forEach(x => x.el.parentNode && x.el.remove()); G.fruits = []; nextRound(); }, 260);
  }
  function loop(t) {
    if (!G) return;
    const dt = Math.min(0.05, (t - G.last) / 1000); G.last = t;
    const ts = (window.__hxSliceTS || 1) * G.slow, d = dt * ts;
    if (G.state === 'fly') {
      G.fruits.forEach(f => {
        if (!f.alive) return;
        if (f.delay > 0) { f.delay -= d; return; }
        if (!f.fl) { f.vy += f.g * d; if (f.vy >= 0) { f.fl = true; f.vx = rnd(-26, 26); f.vy = rnd(-16, 16); f.vr *= 0.3; } }
        else { f.ph += d * 1.6; f.vy += Math.sin(f.ph) * 14 * d; const sp = Math.hypot(f.vx, f.vy); if (sp > 40) { const k = Math.max(40 / sp, 1 - 2.2 * d); f.vx *= k; f.vy *= k; } f.vr *= (1 - 0.8 * d); f.rot = Math.max(-12, Math.min(12, f.rot)); }
        f.x += f.vx * d; f.y += f.vy * d; f.rot += f.vr * d;
        if (f.x < f.r) { f.x = f.r; f.vx = Math.abs(f.vx); } if (f.x > G.W - f.r) { f.x = G.W - f.r; f.vx = -Math.abs(f.vx); }
        if (f.fl) { if (f.y < G.top + f.ry) { f.y = G.top + f.ry; f.vy = Math.abs(f.vy); } if (f.y > G.H - f.ry) { f.y = G.H - f.ry; f.vy = -Math.abs(f.vy); } }
      });
      const Lf = G.fruits.filter(f => f.alive && f.delay <= 0 && f.fl);
      for (let i = 0; i < Lf.length; i++) for (let j = i + 1; j < Lf.length; j++) { // 互相避让（椭圆按外接矩形近似）
        const a = Lf[i], b = Lf[j], dx = b.x - a.x, dy = b.y - a.y, ox = a.r + b.r + 6 - Math.abs(dx), oy = a.ry + b.ry + 6 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox / (a.r + b.r) < oy / (a.ry + b.ry)) { const s = Math.sign(dx) || 1; a.x -= s * ox / 2; b.x += s * ox / 2; a.vx -= s * 20 * d; b.vx += s * 20 * d; }
          else { const s = Math.sign(dy) || 1; a.y -= s * oy / 2; b.y += s * oy / 2; a.vy -= s * 20 * d; b.vy += s * 20 * d; }
        }
      }
      G.fruits.forEach(f => { if (!f.alive || f.delay > 0) return; if (f.fl) { f.x = Math.max(f.r, Math.min(G.W - f.r, f.x)); f.y = Math.max(Math.min(G.top + f.ry, G.H - f.ry), Math.min(G.H - f.ry, f.y)); } place(f); });
      G.rt += dt * (window.__hxSliceTS || 1); spdBar();
    }
    G.debris = G.debris.filter(b => {
      b.life -= dt; b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
      b.el.style.transform = 'translate3d(' + (b.x - b.r).toFixed(1) + 'px,' + (b.y - b.ry).toFixed(1) + 'px,0) rotate(' + b.rot.toFixed(1) + 'deg)'; b.el.style.opacity = Math.max(0, Math.min(1, b.life * 1.6));
      if (b.life <= 0 || b.y - b.ry > G.H + 40) { b.el.remove(); return false; } return true;
    });
    if (G.shake > 0) { G.shake -= dt; const a = G.shake * 20; G.stage.style.transform = 'translate(' + (Math.sin(t / 18) * a).toFixed(1) + 'px,0)'; if (G.shake <= 0) G.stage.style.transform = ''; }
    draw(dt);
    if (G && G.state !== 'end') G.raf = requestAnimationFrame(loop);
  }
  function draw(dt) {
    const x = G.ctx; x.clearRect(0, 0, G.W, G.H);
    G.parts = G.parts.filter(p => {
      p.t += dt;
      if (p.fly) {
        if (p.t < 0) return true; const k = Math.min(1, p.t / p.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        p.x = p.x0 + (p.tx - p.x0) * e + Math.sin(k * Math.PI) * 30 * Math.sin(p.tx); p.y = p.y0 + (p.ty - p.y0) * e - Math.sin(k * Math.PI) * 60;
        const al = k < 1 ? 1 : Math.max(0, 1 - (p.t - p.dur) / 0.45); if (al <= 0) return false;
        x.globalAlpha = al; x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.s * (k < 1 ? 1 : 1 + (p.t - p.dur) * 3), 0, 7); x.fill(); return true;
      }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; const al2 = 1 - p.t / p.life; if (al2 <= 0) return false;
      x.globalAlpha = al2; x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, p.s, 0, 7); x.fill(); return true;
    });
    const tn = now(); G.trail = G.trail.filter(p => tn - p.t < 160);
    if (G.trail.length > 1) {
      x.lineCap = 'round'; x.strokeStyle = '#5a8f6a';
      for (let i = 1; i < G.trail.length; i++) { const a = G.trail[i - 1], b = G.trail[i], k = 1 - (tn - b.t) / 160; x.globalAlpha = 0.25 + 0.6 * k; x.lineWidth = 2 + 9 * k; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
    }
    x.globalAlpha = 1;
  }
  function finish() {
    G.state = 'end'; G.fruits.forEach(x => x.el.parentNode && x.el.remove()); G.fruits = []; cancelAnimationFrame(G.raf); G.stage.style.transform = '';
    const res = { score: G.score, correct: G.correct, wrong: G.wrong, gold: G.gold, rounds: G.round, total: G.items.length, lives: G.lives, maxCombo: G.maxCombo,
      avgT: G.times.length ? G.times.reduce((a, b) => a + b, 0) / G.times.length : null, fastT: G.times.length ? Math.min(...G.times) : null, seen: G.seen.map(s => s.item), weak: G.weak.slice() };
    const info = G.cfg.onEnd ? G.cfg.onEnd(res) : {};
    const seenU = [], seenH = {}; res.seen.forEach(it => { if (!seenH[it.key]) { seenH[it.key] = 1; seenU.push(it); } });
    const weakH = {}; res.weak.forEach(it => { weakH[it.key] = 1; });
    G.root.querySelector('.sl-prompt').style.display = 'none';
    G.stage.innerHTML = '<div class="sl-end"><div class="sl-stars">' + [1, 2, 3].map(i => '<span class="' + (i <= info.stars ? 'on' : '') + '">★</span>').join('') + '</div>'
      + '<div class="sl-et">' + (info.title || '') + '</div>' + (info.badge ? '<div class="sl-badge">🏅 获得勋章「切瓜大师」！</div>' : '')
      + '<div class="sl-nums"><div><b>' + res.score + '</b><span>得分' + (info.newBest ? ' · 新纪录！' : '') + '</span></div><div><b>' + info.best + '</b><span>最高分</span></div><div><b>' + res.correct + '/' + res.rounds + '</b><span>切对</span></div><div><b>' + res.maxCombo + '</b><span>最大连击</span></div><div><b>' + (res.avgT != null ? res.avgT.toFixed(1) + 's' : '–') + '</b><span>平均用时</span></div><div><b>' + (res.fastT != null ? res.fastT.toFixed(1) + 's' : '–') + '</b><span>最快 ⚡</span></div></div>'
      + (info.pointsHtml ? '<div class="sl-pts">' + info.pointsHtml + '</div>' : '')
      + (res.weak.length ? '<div class="sl-weak">🌱 ' + res.weak.length + ' 个没切对的已加入「今日巩固」（在 📒 错题本里）</div>' : '')
      + '<div class="sl-rech">这一局切出的知识卡</div><div class="sl-recap">' + seenU.map(it => '<div class="sl-rc ' + (weakH[it.key] ? 'weak' : '') + '">' + it.reveal + '</div>').join('') + '</div>'
      + '<div class="sl-btns"><button class="btn primary sl-again">🍉 再来一局' + (info.nextBonus ? '（奖励×' + info.nextBonus + '）' : '') + '</button><button class="btn sl-wb">📒 错题本</button><button class="btn ghost sl-back">返回</button></div></div>';
    const c = G.cfg;
    G.stage.querySelector('.sl-again').addEventListener('click', () => { close(); c.onReplay && c.onReplay(); });
    G.stage.querySelector('.sl-back').addEventListener('click', () => { close(); c.onQuit && c.onQuit(); });
    G.stage.querySelector('.sl-wb').addEventListener('click', () => { close(); c.onQuit && c.onQuit(); H.startGame('wrongbook'); });
    G.stage.classList.add('ended');
    sfx(info.stars >= 2 ? 'fanfare' : 'chime', info.stars === 3);
  }

  /* =================== 接入 App =================== */
  function launch() {
    const pool = buildPool();
    if (pool.filled) toast(pool.todayN ? `今天复习的不足 4 个，加入了几道近期高频题` : '今天还没复习，先用近期高频 / 核心知识热热身～');
    start({
      items: pool.items,
      onQuit: () => { C.refreshMenu(); },
      onReplay: () => launch(),
      onEnd(res) {
        const d = sliceData();
        const bonus = bonusFor(d.rounds);
        const acc = res.correct / Math.max(1, res.total);
        const stars = res.correct >= 10 ? 3 : res.correct >= 7 ? 2 : res.correct >= 4 ? 1 : 0;
        const pts = Math.round((res.correct * 10 + res.gold * 5) * bonus);
        d.rounds++; d.todayPts += pts; d.points += pts;
        const newBest = res.score > d.best; if (newBest) d.best = res.score;
        const badge = res.correct === res.total && res.total > 0;
        if (badge) d.badges.slicer = (d.badges.slicer || 0) + 1;
        d.last = { score: res.score, correct: res.correct, rounds: res.total, gold: res.gold, pts, bonus };
        store.set('hx_slice', d);
        const best = store.get('hx_best', {}); best.slice = d.best; store.set('hx_best', best);
        if (badge) setTimeout(() => toast('🏅 切瓜大师！本局全部切对', 2600), 400);
        return { stars, best: d.best, newBest, badge, nextBonus: bonusFor(d.rounds),
          title: stars === 3 ? '🍉 切瓜大师！' : stars === 2 ? '切得漂亮！' : stars === 1 ? '继续加油～' : '再来一局，记得更牢！',
          pointsHtml: `本局积分 <b>+${pts}</b>（切对 ${res.correct} 个${res.gold ? ' · 金西瓜 ' + res.gold : ''} · 第${d.rounds}局 奖励×${bonus.toFixed(1)}）<br>今天累计 ${d.todayPts} 分 · 总积分 ${d.points}` + (acc === 1 ? '' : '') };
      },
    });
  }
  C.register('slice', { menu: true, scr: 'scrHome', title: '⚗️ 化学背背背', render: launch });
  H.menuHooks.push(() => {
    const day = C.hist().days[C.today()] || {}, n = Object.keys(day).filter(k => makeItem(k)).length, d = sliceData();
    const e = document.getElementById('sliceDesc');
    if (e) e.innerHTML = n ? `今天复习过 <b>${n}</b> 个知识点${d.rounds ? ` · 下一局奖励×${bonusFor(d.rounds).toFixed(1)}` : ''}` : '把今天复习过的知识切一遍！';
    const bb = document.querySelector('[data-best="slice"]'); if (bb) bb.textContent = (d.badges.slicer ? '🏅' : '') + (d.best ? '最佳 ' + d.best : '');
  });
  C.refreshMenu();
  window.HXSlice = { start, close, launch, buildPool, makeItem, measure, active: () => !!G, _g: () => G,
    state() {
      if (!G) return null; const sr = G.stage.getBoundingClientRect();
      return { rt: G.rt, phase: G.state, round: G.round, lives: G.lives, score: G.score, combo: G.combo, correct: G.correct, wrong: G.wrong, failed: G.failed, top: G.top + sr.top,
        fruits: G.fruits.filter(f => f.alive && f.delay <= 0).map(f => ({ x: f.x + sr.left, y: f.y + sr.top, r: f.r, ry: f.ry, fl: f.fl, ok: f.ok, gold: f.gold })) };
    },
    allAnswers() {
      const keys = [...C.ALL.map(it => 'val:' + (it.group ? 'g:' : '') + it.sym), ...H.COMBOS.map(c => 'form:' + c.key), ...LAB.PHENOMENA.map(p => 'phen:' + p.id), ...LAB.MISTAKES.map(m => 'spot:' + m.id), ...LAB.GASES.map(g => 'gas:' + g.id),
        ...LAB.BENCH.flatMap(b => b.qs.map((_, i) => 'bench:' + b.id + ':' + i)), ...LAB.DEVICE_TASKS.map(t => 'dev:' + t.id)];
      const out = new Set(); keys.forEach(k => { const it = makeItem(k); if (it) { out.add(it.answer); it.opts.forEach(o => out.add(o)); } }); return [...out];
    },
  };
})();
