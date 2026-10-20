/* 化学背背背 —— 游戏逻辑 */
(function () {
  'use strict';
  const { ELEMENTS, GROUPS, CATIONS, ANIONS, SKIP, SPECIAL_NAMES } = window.CHEM;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rand = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  /* ---------- 通用工具 ---------- */
  const idOf = it => (it.group ? 'g:' : '') + it.sym;
  const ALL = [...ELEMENTS, ...GROUPS];
  const BY_ID = Object.fromEntries(ALL.map(it => [idOf(it), it]));
  const fmt = sym => sym.replace(/(\d+)/g, '<sub>$1</sub>');               // NO3 -> NO<sub>3</sub>
  const vs = v => (v > 0 ? '+' + v : v < 0 ? '−' + -v : '0');              // 化合价文字
  const chips = (vals, picked) => vals.map(v => `<span class="vchip${v === picked ? ' picked' : ''}">${vs(v)}</span>`).join('');

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const settings = Object.assign({ time: 60, scope: 'el' }, store.get('hx_settings', {}));
  const best = store.get('hx_best', {});
  let wrongBook = store.get('hx_wrong', {});   // id -> {n: 次数, t: 时间}
  const saveWrong = () => store.set('hx_wrong', wrongBook);
  function addWrong(id) { const w = wrongBook[id] || { n: 0 }; w.n++; w.t = Date.now(); wrongBook[id] = w; saveWrong(); }
  // 每日复习记录：days[YYYY-MM-DD][key] = {n, w}；freq[key] = {n, last}（切西瓜题库用）
  const today = () => { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); };
  let hist = store.get('hx_hist', null); if (!hist || !hist.days) hist = { days: {}, freq: {} };
  function track(key, ok) {
    const d = today(), day = hist.days[d] || (hist.days[d] = {});
    const e = day[key] || (day[key] = { n: 0, w: 0 }); e.n++; if (ok === false) e.w++; e.t = Date.now();
    const f = hist.freq[key] || (hist.freq[key] = { n: 0 }); f.n++; f.last = Date.now();
    const ds = Object.keys(hist.days).sort(); while (ds.length > 14) delete hist.days[ds.shift()];
    const fk = Object.keys(hist.freq); if (fk.length > 500) fk.sort((a, b) => hist.freq[a].last - hist.freq[b].last).slice(0, fk.length - 500).forEach(k => delete hist.freq[k]);
    store.set('hx_hist', hist);
  }
  // 实验错题本：id -> {n, t, kind, q, a}（q/a 为 HTML）
  let labWrong = store.get('hx_wrong_lab', {});
  const saveLab = () => store.set('hx_wrong_lab', labWrong);
  function addLabWrong(id, kind, q, a) { const w = labWrong[id] || { n: 0 }; Object.assign(w, { kind, q, a, t: Date.now() }); w.n++; labWrong[id] = w; saveLab(); }
  function delLabWrong(id) { if (labWrong[id]) { delete labWrong[id]; saveLab(); } }

  let toastTimer;
  function toast(msg, ms = 2200) {
    const t = $('#toast'); t.innerHTML = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ---------- 屏幕切换 ---------- */
  let current = null; // 当前游戏对象
  let lastGame = null, curGame = null;
  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    $('#btnHome').hidden = id === 'scrHome';
    const el = document.getElementById(id);
    $('#hud').hidden = !(el && el.dataset.hud);
    window.scrollTo(0, 0);
  }
  function goHome() {
    stopAll(); curGame = null;
    $('#modal').hidden = true;
    refreshMenu();
    $('#brand').textContent = '⚗️ 化学背背背';
    show('scrHome');
  }
  function stopAll() { if (current) { current.stop(); current = null; } $('#countdown').hidden = true; }

  /* ---------- 计时 & HUD ---------- */
  const hud = {
    score: 0, combo: 0, maxCombo: 0,
    reset() { this.score = 0; this.combo = 0; this.maxCombo = 0; this.draw(); },
    add(base) { this.score += base + Math.min(this.combo, 10) * 2; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.draw(true); },
    miss() { this.combo = 0; this.draw(); },
    draw(hot) {
      $('#hudScore').textContent = this.score;
      const c = $('#hudCombo'); c.textContent = this.combo ? '×' + this.combo : '0';
      c.classList.remove('hot'); if (hot && this.combo >= 3) { void c.offsetWidth; c.classList.add('hot'); }
    },
  };
  function Timer(seconds, onEnd) {
    let end = 0, total = seconds * 1000, iv = null, lastSec = null, paused = false;
    const draw = () => {
      const left = Math.max(0, end - performance.now());
      const sec = Math.ceil(left / 1000);
      $('#hudTime').textContent = sec;
      $('#timebarFill').style.width = (left / total * 100) + '%';
      $('#timebarFill').style.backgroundPosition = (100 - left / total * 100) + '% 0';
      $('.hud .timer').classList.toggle('low', sec <= 10);
      if (sec !== lastSec && sec <= 5 && sec > 0) SFX.tick();
      lastSec = sec;
      if (left <= 0) { this.stop(); onEnd(); }
    };
    this.start = () => { end = performance.now() + seconds * 1000; draw(); iv = setInterval(draw, 100); };
    this.stop = () => { clearInterval(iv); iv = null; };
    this.bonus = s => { end += s * 1000; total = Math.max(total, end - performance.now()); draw(); };
    $('#hudTimeK').textContent = '时间';
    this.preview = () => { $('#hudTime').textContent = seconds; $('#timebarFill').style.width = '100%'; $('.hud .timer').classList.remove('low'); };
  }
  function progress(i, n) {
    $('#hudTimeK').textContent = '进度';
    $('#hudTime').textContent = Math.min(i + 1, n) + '/' + n;
    $('#timebarFill').style.width = ((n - i) / n * 100) + '%';
    $('#timebarFill').style.backgroundPosition = '0 0';
    $('.hud .timer').classList.remove('low');
  }
  function countdown(cb) {
    const el = $('#countdown'); el.hidden = false;
    const seq = ['3', '2', '1', 'GO!']; let i = 0;
    const step = () => {
      if (!current) { el.hidden = true; return; }
      if (i >= seq.length) { el.hidden = true; cb(); return; }
      el.innerHTML = `<span>${seq[i]}</span>`;
      i === 3 ? SFX.go() : SFX.tick();
      i++; setTimeout(step, i === 4 ? 350 : 450);
    };
    step();
  }

  /* ---------- 结算 ---------- */
  function finish(game, key, stats, missesHtml) {
    SFX.end();
    const old = best[key] || 0;
    const rec = hud.score > old;
    if (rec) { best[key] = hud.score; store.set('hx_best', best); }
    $('#mTitle').textContent = (GAMES[game] && GAMES[game].doneTitle) || '⏰ 时间到！';
    $('#mRecord').hidden = !rec || hud.score === 0;
    $('#mStats').innerHTML = [
      ['得分', hud.score], ['最佳', Math.max(old, hud.score)], ['最高连击', hud.maxCombo],
      ...stats,
    ].map(([k, v]) => `<div class="m-stat"><b>${v}</b><span>${k}</span></div>`).join('');
    $('#mMiss').innerHTML = missesHtml || '<p style="text-align:center">🎉 一个都没错，太强了！</p>';
    $('#btnToWrong').hidden = !(GAMES[game] && GAMES[game].wrong);
    lastGame = game;
    $('#modal').hidden = false;
    $('#btnAgain').onclick = () => { $('#modal').hidden = true; startGame(game, current && current.opts); };
  }

  /* =========================================================
   * 游戏 1：化合价击毙（元素翻牌）
   * ========================================================= */
  function ValenceGame(opts = {}) {
    this.opts = opts;
    const practice = !!opts.practice;
    const scope = practice ? 'mix' : settings.scope;
    const useEl = scope !== 'grp', useGrp = scope !== 'el';
    let items = [];
    if (useEl) items = items.concat(ELEMENTS);
    if (useGrp) items = items.concat(GROUPS);
    const askable = it => !it.noble && (!practice || wrongBook[idOf(it)]);
    const cells = {};
    let cur = null, locked = true, running = false, armNeg = false, armTimer = null, lastId = null;
    let right = 0, wrong = 0; const misses = {};
    const timer = new Timer(settings.time, () => end());

    // —— 搭建网格
    const pt = $('#ptable'), gt = $('#gtable');
    pt.innerHTML = ''; gt.innerHTML = '';
    gt.classList.toggle('big', scope === 'grp');
    items.forEach(it => {
      const c = document.createElement('button');
      c.className = 'cell' + (it.noble ? ' noble' : '');
      c.dataset.id = idOf(it);
      const label = it.group ? fmt(it.sym) : it.sym;
      c.innerHTML = `<div class="ci"><div class="cf cb">${it.noble ? '稀' : '?'}</div><div class="cf cfr"><span class="lbl">${label}</span></div></div>`;
      if (!it.group) { c.style.gridRow = it.row; c.style.gridColumn = it.col; pt.appendChild(c); }
      else gt.appendChild(c);
      if (!askable(it)) { if (!it.noble) { c.classList.add('up'); c.style.opacity = .35; } }
      c.addEventListener('click', () => onCell(it, c));
      cells[idOf(it)] = c;
    });
    const alive = () => items.filter(it => askable(it) && !cells[idOf(it)].classList.contains('dead'));

    function onCell(it, c) {
      if (it.noble) { toast(`${it.sym} ${it.name}：稀有气体化学性质很稳定，初中不考它的化合价（单质为 0），本游戏不出题`); return; }
      if (!running || locked || !askable(it) || c.classList.contains('dead') || it === cur) return;
      if (cur) cells[idOf(cur)].classList.remove('up', 'cur');
      flipTo(it);
    }

    // —— 键盘
    const kp = $('#keypad'); kp.innerHTML = '';
    [1, 2, 3, 4, 5, 6, 7, -1, -2, -3].forEach(v => {
      const b = document.createElement('button');
      b.className = 'key ' + (v > 0 ? 'pos' : 'neg'); b.textContent = vs(v); b.dataset.v = v;
      b.addEventListener('click', () => answer(v, b));
      kp.appendChild(b);
    });
    const keyBtn = v => kp.querySelector(`[data-v="${v}"]`);
    this.onKey = e => {
      if (e.key === '-' || e.key === 'Subtract') { armNeg = true; kp.classList.add('armneg'); clearTimeout(armTimer); armTimer = setTimeout(() => { armNeg = false; kp.classList.remove('armneg'); }, 1500); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 7) {
        let v = n;
        if (armNeg) { if (n > 3) return; v = -n; armNeg = false; kp.classList.remove('armneg'); }
        const b = keyBtn(v); b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 120);
        answer(v, b);
      }
    };

    function pickNext() {
      const pool = alive();
      if (!pool.length) {
        if (practice && !items.some(askable)) { toast('错题全部练对啦！🎉'); end(); return; }
        hud.score += 50; hud.draw(true); SFX.clear();
        toast('🎉 全部击毙！奖励 +50，重新洗牌');
        Object.values(cells).forEach(c => c.classList.remove('dead'));
        items.forEach(it => { if (!it.noble && !askable(it)) { cells[idOf(it)].classList.add('up'); cells[idOf(it)].style.opacity = .35; } });
        return setTimeout(pickNext, 500);
      }
      let cand = pool.filter(it => idOf(it) !== lastId);
      if (!cand.length) cand = pool;
      flipTo(rand(cand));
    }
    function flipTo(it) {
      cur = it; lastId = idOf(it); locked = true;
      const bc = $('#bigcard');
      bc.classList.remove('up', 'killed', 'wrong');
      $('#feedback').innerHTML = '';
      setTimeout(() => {
        if (!running) return;
        $('#bcZ').textContent = it.z || '';
        $('#bcSym').innerHTML = it.group ? fmt(it.sym) : it.sym;
        $('#bcSym').classList.toggle('grp', !!it.group);
        $('#bcName').textContent = it.name;
        $('#bcBadge').hidden = it.val.length < 2;
        $('#qprompt').textContent = it.val.length > 1 ? '写出它的一种常见化合价' : (it.group ? '这个原子团的化合价是？' : '它的常见化合价是？');
        bc.classList.add('up');
        cells[idOf(it)].classList.add('up', 'cur');
        SFX.flip();
        locked = false;
      }, 160);
    }
    function answer(v, btn) {
      SFX.unlock();
      if (!running || locked || !cur) return;
      locked = true;
      const it = cur, id = idOf(it), cell = cells[id];
      const ok = it.val.includes(v);
      track('val:' + id, ok);
      const note = it.note ? `<span class="note">💡 ${it.note}</span>` : '';
      if (ok) {
        right++; hud.add(10);
        if (practice) { delete wrongBook[id]; saveWrong(); }
        $('#bigcard').classList.add('killed');
        $('#feedback').innerHTML = `<span class="ok">✔ 击毙！</span> ${it.val.length > 1 ? '常见化合价：' : ''}<span class="vals">${chips(it.val, v)}</span>${note}`;
        shoot(btn, cell, () => {
          cell.classList.remove('cur'); cell.classList.add('dead', 'hit');
          setTimeout(() => cell.classList.remove('hit'), 400);
        });
        setTimeout(() => { if (running) pickNext(); }, it.val.length > 1 ? 1100 : 750);
      } else {
        wrong++; hud.miss(); SFX.wrong();
        misses[id] = (misses[id] || 0) + 1; addWrong(id);
        $('#bigcard').classList.add('wrong');
        $('#feedback').innerHTML = `<span class="bad">✘ 不是 ${vs(v)}</span> 正确：<span class="vals">${chips(it.val)}</span>${note}`;
        if (navigator.vibrate) navigator.vibrate(80);
        setTimeout(() => { if (!running) return; cell.classList.remove('up', 'cur'); cell.classList.add('missed'); setTimeout(() => cell.classList.remove('missed'), 400); pickNext(); }, 1700);
      }
    }

    // —— 射击 + 爆炸特效
    function shoot(btn, cell, onHit) {
      SFX.shoot();
      const fx = $('#fxLayer');
      const a = btn.getBoundingClientRect(), b = cell.getBoundingClientRect();
      const x0 = a.left + a.width / 2, y0 = a.top, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
      const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI + 90;
      const bu = document.createElement('div'); bu.className = 'bullet';
      bu.style.left = (x0 - 3) + 'px'; bu.style.top = (y0 - 11) + 'px';
      fx.appendChild(bu);
      const anim = bu.animate([
        { transform: `translate(0,0) rotate(${ang}deg)` },
        { transform: `translate(${x1 - x0}px,${y1 - y0}px) rotate(${ang}deg)` },
      ], { duration: 170, easing: 'ease-in' });
      anim.onfinish = () => { bu.remove(); explode(x1, y1); onHit(); };
    }
    function explode(x, y) {
      SFX.boom(hud.combo);
      const fx = $('#fxLayer');
      const fl = document.createElement('div'); fl.className = 'flash'; fx.appendChild(fl); setTimeout(() => fl.remove(), 260);
      const ring = document.createElement('div'); ring.className = 'boom-ring'; ring.style.left = x + 'px'; ring.style.top = y + 'px'; fx.appendChild(ring); setTimeout(() => ring.remove(), 520);
      const colors = ['#ff3d71', '#ffb400', '#ff7a00', '#6c5ce7', '#00b894', '#fff176'];
      for (let i = 0; i < 18; i++) {
        const s = document.createElement('div'); s.className = 'spark';
        s.style.left = (x - 4) + 'px'; s.style.top = (y - 4) + 'px'; s.style.background = rand(colors);
        fx.appendChild(s);
        const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 60;
        s.animate([
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(.2)`, opacity: 0 },
        ], { duration: 450 + Math.random() * 250, easing: 'cubic-bezier(.2,.8,.4,1)' }).onfinish = () => s.remove();
      }
      const tag = document.createElement('div'); tag.className = 'kill-tag';
      tag.textContent = hud.combo >= 3 ? `击毙！×${hud.combo}` : '击毙！';
      tag.style.left = Math.min(Math.max(x, 60), innerWidth - 60) + 'px'; tag.style.top = y + 'px'; fx.appendChild(tag); setTimeout(() => tag.remove(), 950);
    }

    const end = () => {
      if (!running) return;
      running = false; locked = true; timer.stop();
      const ids = Object.keys(misses);
      const total = right + wrong;
      const html = ids.length ? '<h4>❌ 本局答错</h4>' + ids.map(id => {
        const it = BY_ID[id];
        return `<div class="mrow"><span><b>${it.group ? fmt(it.sym) : it.sym}</b> ${it.name}${misses[id] > 1 ? ' ×' + misses[id] : ''}</span><span>${chips(it.val)}</span></div>`;
      }).join('') + '<p style="font-size:12px;color:#7a7f9a">已自动加入错题本</p>' : '';
      finish('valence', practice ? 'valence|wrong' : 'valence|' + scope, [['答对', right], ['答错', wrong], ['正确率', total ? Math.round(right / total * 100) + '%' : '-']], html);
    };

    this.start = () => {
      hud.reset(); timer.preview();
      $('#bigcard').classList.remove('up', 'killed', 'wrong');
      $('#feedback').innerHTML = practice ? '错题练习：答对就从错题本移除' : '';
      $('#qprompt').textContent = '准备…';
      countdown(() => { running = true; timer.start(); pickNext(); });
    };
    this.stop = () => { running = false; timer.stop(); clearTimeout(armTimer); };
    this.debug = () => ({ cur, running, locked });
  }

  /* =========================================================
   * 游戏 2：元素连连看
   * ========================================================= */
  function MatchGame(opts = {}) {
    this.opts = opts;
    const scope = settings.scope;
    let pool = [];
    if (scope !== 'grp') pool = pool.concat(ELEMENTS);
    if (scope !== 'el') pool = pool.concat(GROUPS);
    const PAIRS = 6;
    let running = false, sel = null, left = 0, right = 0, wrong = 0, boards = 0, busy = false;
    const misses = {};
    const timer = new Timer(settings.time, () => end());
    const grid = $('#matchGrid');

    function deal() {
      const picks = shuffle(pool).slice(0, PAIRS);
      const tiles = shuffle(picks.flatMap(it => [{ it, kind: 'sym' }, { it, kind: 'nm' }]));
      grid.innerHTML = ''; sel = null; left = PAIRS;
      tiles.forEach(t => {
        const b = document.createElement('button');
        b.className = 'mtile ' + t.kind;
        b.dataset.id = idOf(t.it);
        b.dataset.kind = t.kind;
        b.innerHTML = t.kind === 'sym' ? (t.it.group ? fmt(t.it.sym) : t.it.sym) : t.it.name;
        b.addEventListener('click', () => tap(b, t));
        grid.appendChild(b);
      });
    }
    function tap(b, t) {
      SFX.unlock();
      if (!running || busy || b.classList.contains('gone')) return;
      if (!sel) { sel = { b, t }; b.classList.add('sel'); SFX.tap(); return; }
      if (sel.b === b) { b.classList.remove('sel'); sel = null; return; }
      if (sel.t.kind === t.kind) { sel.b.classList.remove('sel'); sel = { b, t }; b.classList.add('sel'); SFX.tap(); return; }
      const a = sel.b; sel = null;
      if (a.dataset.id === b.dataset.id) {
        track('name:' + a.dataset.id, true);
        right++; hud.add(10); SFX.ding(hud.combo);
        a.classList.remove('sel'); a.classList.add('gone'); b.classList.add('gone');
        if (--left === 0) {
          boards++; timer.bonus(5); SFX.clear(); toast('清空！+5 秒 ⏱');
          busy = true; setTimeout(() => { busy = false; if (running) deal(); }, 450);
        }
      } else {
        wrong++; hud.miss(); SFX.wrong();
        const symTile = t.kind === 'sym' ? b : a;
        track('name:' + symTile.dataset.id, false);
        misses[symTile.dataset.id] = (misses[symTile.dataset.id] || 0) + 1;
        a.classList.remove('sel'); a.classList.add('no'); b.classList.add('no');
        busy = true; setTimeout(() => { a.classList.remove('no'); b.classList.remove('no'); busy = false; }, 420);
      }
    }
    const end = () => {
      if (!running) return;
      running = false; timer.stop();
      const ids = Object.keys(misses);
      const html = ids.length ? '<h4>❌ 配错过的</h4>' + ids.map(id => {
        const it = BY_ID[id];
        return `<div class="mrow"><span><b>${it.group ? fmt(it.sym) : it.sym}</b></span><span>${it.name}</span></div>`;
      }).join('') : '';
      finish('match', 'match|' + scope, [['配对', right], ['配错', wrong], ['清空版数', boards]], html);
    };
    this.start = () => { hud.reset(); timer.preview(); grid.innerHTML = ''; countdown(() => { running = true; timer.start(); deal(); }); };
    this.stop = () => { running = false; timer.stop(); };
  }

  /* =========================================================
   * 游戏 3：化学式拼装
   * ========================================================= */
  const elName = sym => (BY_ID[sym] || BY_ID['g:' + sym] || {}).name || sym;
  const COMBOS = [];
  CATIONS.forEach(c => ANIONS.forEach(a => {
    const ck = (c.sym === 'Fe' ? 'Fe' + c.v : c.sym) + '|' + a.sym;
    if (SKIP.has(ck)) return;
    COMBOS.push({ c, a, key: c.sym + c.v + '|' + a.sym });
  }));
  function part(sym, n, group, parens = true) {
    const s = fmt(sym);
    if (n === 1) return s;
    return (group && parens ? '(' + s + ')' : s) + `<sub>${n}</sub>`;
  }
  const formula = (c, a, x, y, parens = true) => part(c.sym, x, c.group, parens) + part(a.sym, y, a.group, parens);
  function compoundName(c, a) {
    const sp = SPECIAL_NAMES[c.sym + '|' + a.sym];
    if (sp) return sp;
    if (a.kind === 'ide') return a.cname + '化' + c.cname;
    if (a.kind === 'oh') return '氢氧化' + c.cname;
    return a.cname + c.cname;
  }
  function makeQuestion(q) {
    const { c, a } = q;
    const pv = c.v, nv = -a.v, l = pv * nv / gcd(pv, nv);
    const x = l / pv, y = l / nv;
    const right = formula(c, a, x, y);
    const cand = [
      [nv, pv], [y, x], [1, 1], [x + 1, y], [x, y + 1], [pv, nv], [2, 1], [1, 2], [x * 2, y * 2],
    ].map(([i, j]) => formula(c, a, i, j));
    if (a.group && y > 1) cand.unshift(formula(c, a, x, y, false));
    if (c.group && x > 1) cand.unshift(formula(c, a, x, y, false));
    const opts = [right];
    for (const f of cand) { if (opts.length >= 4) break; if (!opts.includes(f)) opts.push(f); }
    return { right, options: shuffle(opts), name: compoundName(c, a), x, y };
  }
  function FormulaGame(opts = {}) {
    this.opts = opts;
    let running = false, q = null, lastKey = null, busy = false, right = 0, wrong = 0;
    const misses = [];
    const timer = new Timer(settings.time, () => end());
    const ionHtml = (sym, v, group, nm) => `<span class="ion"><span class="iv${v < 0 ? ' n' : ''}">${vs(v)}</span><span>${group ? fmt(sym) : sym}</span><span class="in">${nm}</span></span>`;
    function next() {
      let pick; do { pick = rand(COMBOS); } while (pick.key === lastKey && COMBOS.length > 1);
      lastKey = pick.key;
      q = Object.assign({ combo: pick }, makeQuestion(pick));
      const { c, a } = pick;
      $('#fIons').innerHTML = ionHtml(c.sym, c.v, c.group, c.group ? '铵根' : elName(c.sym) + (c.cname === '亚铁' ? '（亚铁）' : '')) + '<span class="f-plus">+</span>' + ionHtml(a.sym, a.v, a.group, elName(a.sym));
      $('#fFeedback').innerHTML = '';
      const box = $('#fOptions'); box.innerHTML = '';
      q.options.forEach(f => {
        const b = document.createElement('button'); b.className = 'fopt'; b.innerHTML = f;
        b.addEventListener('click', () => choose(b, f));
        box.appendChild(b);
      });
      busy = false;
    }
    function choose(b, f) {
      SFX.unlock();
      if (!running || busy) return;
      busy = true;
      const ok = f === q.right;
      track('form:' + q.combo.key, ok);
      $$('.fopt').forEach(o => { if (o.innerHTML === q.right) o.classList.add('right'); });
      if (ok) {
        right++; hud.add(10); SFX.ding(hud.combo);
        $('#fFeedback').innerHTML = `✔ 正确！${q.right} 读作「${q.name}」`;
      } else {
        wrong++; hud.miss(); SFX.wrong(); b.classList.add('wrongpick');
        misses.push(q);
        $('#fFeedback').innerHTML = `<span style="color:var(--bad)">✘ 正确答案是 ${q.right}（${q.name}）</span>`;
      }
      setTimeout(() => { if (running) next(); }, ok ? 800 : 1800);
    }
    const end = () => {
      if (!running) return;
      running = false; timer.stop();
      const html = misses.length ? '<h4>❌ 本局答错</h4>' + misses.map(m => `<div class="mrow"><span>${m.name}</span><b>${m.right}</b></div>`).join('') : '';
      finish('formula', 'formula', [['答对', right], ['答错', wrong], ['正确率', right + wrong ? Math.round(right / (right + wrong) * 100) + '%' : '-']], html);
    };
    this.start = () => { hud.reset(); timer.preview(); $('#fIons').innerHTML = ''; $('#fOptions').innerHTML = ''; $('#fFeedback').innerHTML = ''; countdown(() => { running = true; timer.start(); next(); }); };
    this.stop = () => { running = false; timer.stop(); };
  }

  /* ---------- 错题本 & 口诀表 ---------- */
  function renderWrong() {
    const ids = Object.keys(wrongBook).filter(id => BY_ID[id]).sort((a, b) => wrongBook[b].n - wrongBook[a].n);
    const lids = Object.keys(labWrong).sort((a, b) => labWrong[b].t - labWrong[a].t);
    const cons = store.get('hx_consol', {}); const citems = cons.day === today() ? cons.items || [] : [];
    $('#wbConsol').innerHTML = citems.length ? '<h3 class="wb-h3">🍉 今日巩固（' + citems.length + '）</h3>' + citems.map(c => `<div class="wb-lab cons"><span class="wb-kind">切西瓜</span><div class="wb-q">${c.q}</div><div class="wb-a">✔ ${c.a}</div>${c.tip ? `<div class="wb-tip">💡 ${c.tip}</div>` : ''}</div>`).join('') : '';
    const kinds = new Set(lids.map(id => labWrong[id].kind));
    $('#btnWbPhen').hidden = !kinds.has('phen');
    $('#btnWbSpot').hidden = !kinds.has('spot');
    const KN = { phen: '现象', gas: '气体鉴别', bench: '实验台', dev: '装置', spot: '找茬' };
    $('#wbLabList').innerHTML = lids.length ? '<h3 class="wb-h3">🧪 实验错题（' + lids.length + '）</h3>' + lids.map(id => {
      const w = labWrong[id];
      return `<div class="wb-lab"><span class="wb-kind">${KN[w.kind] || '实验'}</span><div class="wb-q">${w.q}</div><div class="wb-a">✔ ${w.a}</div><span class="wb-cnt">错 ${w.n} 次</span></div>`;
    }).join('') : '';
    $('#wbSub').textContent = ids.length ? `共 ${ids.length} 个` : '';
    $('#btnWbPractice').hidden = !ids.length;
    $('#wbList').innerHTML = ids.length ? ids.map(id => {
      const it = BY_ID[id];
      return `<div class="wb-item"><div class="wb-sym">${it.group ? fmt(it.sym) : it.sym}</div><div class="wb-info"><b>${it.name}</b><br>${chips(it.val)}<br><span class="wb-cnt">错 ${wrongBook[id].n} 次</span></div></div>`;
    }).join('') : (lids.length || citems.length ? '' : '<div class="wb-empty">错题本空空如也～<br>去玩「化合价击毙」或实验小游戏吧！</div>');
    $('#wbSub').textContent = (ids.length || lids.length) ? `化合价 ${ids.length} 个 · 实验 ${lids.length} 题` : '';
  }
  function renderCheat() {
    $('#cheatList').innerHTML = ALL.map(it => `<div class="wb-item${it.noble ? ' noble' : ''}"><div class="wb-sym">${it.group ? fmt(it.sym) : it.sym}</div><div class="wb-info"><b>${it.name}</b><br>${it.noble ? '<small>稀有气体，不出题</small>' : chips(it.val)}</div></div>`).join('');
  }
  function refreshMenu() {
    $$('#segTime button').forEach(b => b.classList.toggle('on', +b.dataset.v === settings.time));
    $$('#segScope button').forEach(b => b.classList.toggle('on', b.dataset.v === settings.scope));
    const bv = best['valence|' + settings.scope], bm = best['match|' + settings.scope], bf = best['formula'];
    $('[data-best="valence"]').textContent = bv ? '最佳 ' + bv : '';
    $('[data-best="match"]').textContent = bm ? '最佳 ' + bm : '';
    $('[data-best="formula"]').textContent = bf ? '最佳 ' + bf : '';
    const n = Object.keys(wrongBook).length + Object.keys(labWrong).length;
    $('#wbCount').textContent = n ? n + ' 题' : '';
    (window.HX && window.HX.menuHooks || []).forEach(f => { try { f(); } catch (e) {} });
  }

  /* ---------- 启动游戏 ---------- */
  const GAMES = {
    valence: { cls: ValenceGame, scr: 'scrValence', title: '🎯 化合价击毙', wrong: true },
    match: { cls: MatchGame, scr: 'scrMatch', title: '🔗 元素连连看' },
    formula: { cls: FormulaGame, scr: 'scrFormula', title: '🧩 化学式拼装' },
  };
  function startGame(name, opts) {
    stopAll();
    SFX.unlock();
    if (name === 'wrongbook') { renderWrong(); $('#brand').textContent = '📒 错题本'; show('scrWrong'); return; }
    if (name === 'cheat') { renderCheat(); $('#brand').textContent = '📜 化合价表'; show('scrCheat'); return; }
    const g = GAMES[name]; if (!g) return;
    $('#brand').textContent = g.title + (opts && opts.practice ? '·错题' : '');
    curGame = name;
    if (g.menu) { g.render(); show(g.scr); return; }
    show(g.scr);
    current = new g.cls(opts || {});
    window.HX.game = current;
    current.start();
  }

  /* ---------- 事件绑定 ---------- */
  $('#menu').addEventListener('click', e => { const t = e.target.closest('[data-game]'); if (t) startGame(t.dataset.game); });
  $('#segTime').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; settings.time = +b.dataset.v; store.set('hx_settings', settings); SFX.tap(); refreshMenu(); });
  $('#segScope').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; settings.scope = b.dataset.v; store.set('hx_settings', settings); SFX.tap(); refreshMenu(); });
  const back = () => { const g = GAMES[curGame]; if (g && g.parent) { $('#modal').hidden = true; startGame(g.parent); } else goHome(); };
  $('#btnHome').addEventListener('click', back);
  $('#btnToHome').addEventListener('click', back);
  $('#btnWbPhen').addEventListener('click', () => startGame('phen', { practice: true }));
  $('#btnWbSpot').addEventListener('click', () => startGame('spot', { practice: true }));
  $('#btnToWrong').addEventListener('click', () => { $('#modal').hidden = true; startGame('wrongbook'); });
  $('#btnWbPractice').addEventListener('click', () => startGame('valence', { practice: true }));
  $('#btnWbClear').addEventListener('click', () => { if (confirm('确定清空错题本吗？')) { wrongBook = {}; saveWrong(); labWrong = {}; saveLab(); renderWrong(); } });
  const muteBtn = $('#btnMute');
  const drawMute = () => (muteBtn.textContent = SFX.muted ? '🔇' : '🔊');
  muteBtn.addEventListener('click', () => { SFX.toggle(); drawMute(); SFX.tap(); });
  document.addEventListener('keydown', e => { if (current && current.onKey && $('#modal').hidden) current.onKey(e); });
  document.addEventListener('visibilitychange', () => { /* 切到后台不暂停，保持简单 */ });

  window.HX = { data: window.CHEM, makeQuestion, COMBOS, compoundName, startGame, goHome, menuHooks: [] };
  window.HX.core = {
    $, $$, rand, shuffle, fmt, vs, store, toast, show, hud, Timer, countdown, progress, finish,
    addLabWrong, delLabWrong, labWrong: () => labWrong,
    track, today, hist: () => hist, wrongBook: () => wrongBook, refreshMenu, BY_ID, ALL,
    register(name, def) { GAMES[name] = def; },
    setCurrent(g) { current = g; window.HX.game = g; },
    stopAll,
  };
  drawMute();
  refreshMenu();
})();
