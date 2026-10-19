/* 化学背背背 · 🧪 实验区：现象抢答 / 气体鉴别侦探 / 虚拟实验台 / 装置拼装 / 操作找茬 */
(function () {
  'use strict';
  const C = window.HX.core, L = window.LAB, S = window.LABSVG;
  const { $, $$, rand, shuffle, hud, toast } = C;
  const chem = s => s.replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>');
  const eq = s => chem(s).replace(/=\[(.+?)\]=/g, (m, c) => `<span class="eqc"><small>${c}</small><span>═══</span></span>`);
  const roundTime = () => (C.store.get('hx_settings', {}).time || 60);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/</g, '&lt;');

  /* ---------- 注入页面 ---------- */
  function addScreen(id, html, hudOn = true) {
    const s = document.createElement('section');
    s.className = 'screen lab'; s.id = id; if (hudOn) s.dataset.hud = '1';
    s.innerHTML = html;
    document.getElementById('app').insertBefore(s, document.getElementById('modal'));
    return s;
  }
  const LAB_GAMES = [
    { id: 'phen', emoji: '⚡', name: '现象抢答', desc: `限时选出正确实验现象（${L.PHENOMENA.length} 题）`, cls: 't1' },
    { id: 'gas', emoji: '🕵️', name: '气体鉴别侦探', desc: '用木条、石灰水等工具鉴别无标签气体', cls: 't2' },
    { id: 'bench', emoji: '🧫', name: '虚拟实验台', desc: `选试剂和仪器做实验，再答追问（${L.BENCH.length} 个实验）`, cls: 't3' },
    { id: 'dev', emoji: '🔧', name: '装置拼装', desc: '为 O₂ / CO₂ / H₂ 选发生装置和收集装置', cls: 't4' },
    { id: 'spot', emoji: '🔍', name: '操作找茬', desc: `找出错误的实验操作（${L.MISTAKES.length} 幅图）`, cls: 't5' },
  ];
  addScreen('scrLab', `
    <div class="lab-hero"><div class="lab-hero-t">🧪 实验室</div><div class="lab-hero-s">初中化学必会实验，边玩边记</div></div>
    <div class="menu">${LAB_GAMES.map(g => `<button class="game-tile ${g.cls}" data-lab="${g.id}"><div class="gt-emoji">${g.emoji}</div><div class="gt-body"><div class="gt-name">${g.name}</div><div class="gt-desc">${g.desc}</div></div><div class="gt-best" data-labbest="${g.id}"></div></button>`).join('')}</div>
    <footer class="foot">答错的题会自动进入 📒 错题本，可在错题本里专项练习。</footer>`, false);
  $('#scrLab').addEventListener('click', e => { const t = e.target.closest('[data-lab]'); if (t) window.HX.startGame(t.dataset.lab); });

  addScreen('scrPhen', `
    <div class="ph-card card-panel"><div class="ph-emoji" id="phEmoji">🔥</div><div class="ph-title" id="phTitle"></div><div class="ph-ask">会看到什么现象？</div></div>
    <div class="ph-opts" id="phOpts"></div>
    <div class="ph-note" id="phNote"></div>
    <button class="btn primary ph-next" id="phNext" hidden>下一题 ▶</button>`);
  addScreen('scrGas', `
    <div class="gs-head"><b id="gsLevel"></b><span id="gsUses"></span></div>
    <div class="gs-bottles" id="gsBottles"></div>
    <div class="gs-sec">① 选一个瓶子，再选工具检验</div>
    <div class="gs-tools" id="gsTools"></div>
    <div class="gs-log" id="gsLog"></div>
    <div class="gs-sec">② 给选中的瓶子贴标签</div>
    <div class="gs-labels" id="gsLabels"></div>
    <button class="btn primary gs-submit" id="gsSubmit" disabled>🔎 提交鉴定</button>`);
  addScreen('scrBench', `
    <div class="bn-task card-panel"><div class="bn-goal">目标：<b id="bnTitle"></b></div><div class="bn-phase" id="bnPhase"></div></div>
    <div class="bn-stage"><div class="bn-vessel" id="bnVessel"></div><div class="bn-say" id="bnSay"></div></div>
    <div class="bn-tray" id="bnTray"></div>
    <div class="bn-shelf" id="bnShelf"></div>
    <div class="bn-quiz" id="bnQuiz"></div>
    <div class="bn-actions"><button class="btn primary" id="bnGo">▶ 开始实验</button><button class="btn primary" id="bnNext" hidden>下一个实验 ▶</button></div>`);
  addScreen('scrDev', `
    <div class="dv-task card-panel"><div class="dv-title" id="dvTitle"></div><div class="dv-step" id="dvStep"></div></div>
    <div class="dv-built" id="dvBuilt"></div>
    <div class="dv-why" id="dvWhy"></div>
    <div class="dv-grid" id="dvGrid"></div>
    <button class="btn primary dv-next" id="dvNext" hidden>下一个 ▶</button>`);
  addScreen('scrSpot', `
    <div class="sp-ask" id="spAsk"></div>
    <div class="sp-pic card-panel" id="spPic"></div>
    <div class="sp-tip" id="spTip">💡 先在图上点出错误位置可加 5 分（可跳过）</div>
    <div class="ph-opts" id="spOpts"></div>
    <div class="ph-note" id="spNote"></div>
    <button class="btn primary ph-next" id="spNext" hidden>下一题 ▶</button>`);

  /* ---------- 通用：选择题按钮 ---------- */
  function choiceButtons(box, options, onPick) {
    box.innerHTML = '';
    options.forEach(o => {
      const b = document.createElement('button');
      b.className = 'opt'; b.innerHTML = o.html; b._o = o;
      b.addEventListener('click', () => onPick(b, o));
      box.appendChild(b);
    });
  }
  function revealChoices(box, picked) {
    $$('.opt', box).forEach(b => { b.disabled = true; if (b._o.ok) b.classList.add('right'); });
    if (!picked._o.ok) picked.classList.add('wrongpick');
  }
  function confetti(el) {
    const r = el.getBoundingClientRect(), fx = $('#fxLayer') || document.body;
    const colors = ['#ff3d71', '#ffb400', '#6c5ce7', '#00b894', '#4fc3f7'];
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('div'); s.className = 'spark';
      s.style.left = (r.left + r.width * Math.random()) + 'px'; s.style.top = (r.top + r.height / 2) + 'px'; s.style.background = rand(colors);
      fx.appendChild(s);
      s.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 120}px,${-30 - Math.random() * 60}px) scale(.3)`, opacity: 0 }], { duration: 600 }).onfinish = () => s.remove();
    }
  }
  const missRows = rows => rows.length ? '<h4>❌ 本局答错</h4>' + rows.map(([a, b]) => `<div class="mrow lab-mrow"><span>${a}</span><b>${b}</b></div>`).join('') + '<p style="font-size:12px;color:#7a7f9a">已加入错题本</p>' : '';

  /* =========================================================
   * 1. 现象抢答
   * ========================================================= */
  const phEmoji = t => /电解/.test(t) ? '⚡' : /燃烧|点燃|熄灭|加热|蜡烛/.test(t) ? '🔥' : /石灰水|石蕊|酚酞|溶液|酸/.test(t) ? '🧪' : /还原/.test(t) ? '♨️' : '🔬';
  function PhenGame(opts = {}) {
    this.opts = opts;
    const practice = !!opts.practice;
    let bank = L.PHENOMENA.filter(p => !practice || C.labWrong()['phen:' + p.id]);
    let running = false, busy = false, right = 0, wrong = 0, order = [], cur = null, shownAt = 0, nextT = null;
    const misses = [];
    const timer = new C.Timer(roundTime(), () => end());
    const next = () => {
      clearTimeout(nextT);
      if (!running) return;
      if (!bank.length) { toast('现象错题都练对啦！🎉'); return end(); }
      if (!order.length) order = shuffle(bank);
      cur = order.pop();
      $('#phEmoji').textContent = phEmoji(cur.title);
      $('#phTitle').textContent = cur.title;
      $('.ph-card').classList.remove('in'); void $('.ph-card').offsetWidth; $('.ph-card').classList.add('in');
      $('#phNote').innerHTML = ''; $('#phNext').hidden = true;
      const opts = shuffle([{ html: esc(cur.ok), ok: true }, ...shuffle(cur.no).slice(0, 3).map(t => ({ html: esc(t), ok: false }))]);
      choiceButtons($('#phOpts'), opts, pick);
      shownAt = performance.now(); busy = false;
      SFX.flip();
    };
    function pick(b, o) {
      SFX.unlock();
      if (!running || busy) return;
      busy = true; revealChoices($('#phOpts'), b);
      if (o.ok) {
        const fast = performance.now() - shownAt < 4000;
        right++; hud.add(fast ? 15 : 10); SFX.ding(hud.combo); confetti(b);
        if (practice) { C.delLabWrong('phen:' + cur.id); bank = bank.filter(p => p !== cur); }
        $('#phNote').innerHTML = `<b class="okc">✔ 正确${fast ? ' ⚡快答 +5' : ''}</b> ${cur.note || ''}`;
        nextT = setTimeout(next, cur.note ? 1800 : 900);
      } else {
        wrong++; hud.miss(); SFX.wrong();
        C.addLabWrong('phen:' + cur.id, 'phen', cur.title, cur.ok);
        misses.push([cur.title, cur.ok]);
        $('#phNote').innerHTML = `<b class="badc">✘ 再记一遍</b> ${cur.note || ''}`;
        $('#phNext').hidden = false;
        nextT = setTimeout(next, 6000);
      }
    }
    $('#phNext').onclick = () => next();
    const end = () => {
      if (!running) return;
      running = false; timer.stop(); clearTimeout(nextT);
      const t = right + wrong;
      C.finish('phen', practice ? 'phen|wrong' : 'phen', [['答对', right], ['答错', wrong], ['正确率', t ? Math.round(right / t * 100) + '%' : '-']], missRows(misses));
    };
    this.start = () => {
      hud.reset(); timer.preview(); $('#phOpts').innerHTML = ''; $('#phTitle').textContent = '准备…'; $('#phNote').innerHTML = ''; $('#phNext').hidden = true;
      if (!bank.length) { toast('没有现象错题，先去玩一局吧'); return; }
      C.countdown(() => { running = true; timer.start(); next(); });
    };
    this.stop = () => { running = false; timer.stop(); clearTimeout(nextT); };
    this.debug = () => ({ cur, busy, running });
  }

  /* =========================================================
   * 2. 气体鉴别侦探
   * ========================================================= */
  const GAS = Object.fromEntries(L.GASES.map(g => [g.id, g]));
  const LETTERS = 'ABCDEFG';
  function GasGame(opts = {}) {
    this.opts = opts;
    let level = 0, bottles = [], sel = 0, uses = 0, totalUses = 0, right = 0, wrong = 0, busy = false, running = false, submitted = false;
    const misses = [];
    function setup() {
      const lv = L.GAS_LEVELS[level];
      C.progress(level, L.GAS_LEVELS.length);
      bottles = shuffle(lv.pool).slice(0, lv.n).map((g, i) => ({ gas: g, letter: LETTERS[i], tag: null, res: '' }));
      sel = 0; uses = 0; submitted = false;
      $('#gsLevel').textContent = `第 ${level + 1}/${L.GAS_LEVELS.length} 案：${lv.n} 瓶无色气体`;
      const box = $('#gsBottles'); box.innerHTML = '';
      bottles.forEach((b, i) => {
        const d = document.createElement('button'); d.className = 'gbottle';
        d.innerHTML = S.gasJar(b.letter) + '<div class="gb-res"></div><div class="gb-tag">贴标签</div>';
        d.addEventListener('click', () => { if (!submitted) { sel = i; draw(); SFX.tap(); } });
        b.el = d; box.appendChild(d);
      });
      const tb = $('#gsTools'); tb.innerHTML = '';
      L.GAS_TOOLS.forEach(t => {
        const d = document.createElement('button'); d.className = 'gtool';
        d.innerHTML = `<span class="gt-i">${t.icon}</span><span>${t.name}</span>`;
        d.addEventListener('click', () => test(t));
        tb.appendChild(d);
      });
      const lb = $('#gsLabels'); lb.innerHTML = '';
      lv.pool.forEach(g => {
        const d = document.createElement('button'); d.className = 'glabel'; d.dataset.g = g;
        d.textContent = GAS[g].name;
        d.addEventListener('click', () => label(g));
        lb.appendChild(d);
      });
      $('#gsLog').innerHTML = '<span class="muted">实验记录会显示在这里</span>';
      $('#gsSubmit').textContent = '🔎 提交鉴定';
      draw();
    }
    function draw() {
      bottles.forEach((b, i) => {
        b.el.classList.toggle('sel', i === sel && !submitted);
        if (submitted) return;
        b.el.querySelector('.gb-tag').textContent = b.tag ? GAS[b.tag].name : '贴标签';
        b.el.querySelector('.gb-tag').classList.toggle('set', !!b.tag);
      });
      $$('.glabel').forEach(d => d.classList.toggle('used', bottles.some(b => b.tag === d.dataset.g)));
      $('#gsUses').textContent = `已用工具 ${uses} 次`;
      $('#gsSubmit').disabled = submitted ? false : !bottles.every(b => b.tag);
    }
    async function test(tool) {
      SFX.unlock();
      if (!running || busy || submitted) return;
      busy = true; uses++; totalUses++;
      const b = bottles[sel];
      const r = tool.res[b.gas] || tool.res._;
      const fx = b.el.querySelector('.gj-fx');
      b.el.classList.add('testing');
      fx.innerHTML = ''; void fx.getBoundingClientRect();
      fx.innerHTML = S.GASFX[r.fx]();
      ({ relight: SFX.whoosh, brighter: SFX.whoosh, out: SFX.fizz, gasPale: SFX.pop, gasBlue: SFX.pop, cloudy: SFX.bubble, litmusRed: SFX.bubble, noign: SFX.fizz }[r.fx] || SFX.tap).call(SFX);
      b.el.querySelector('.gb-res').textContent = r.txt;
      const log = $('#gsLog');
      if (log.querySelector('.muted')) log.innerHTML = '';
      log.insertAdjacentHTML('afterbegin', `<div class="gl-row"><b>${b.letter}</b> ${tool.icon} ${tool.name}（${tool.how}）→ <span>${r.txt}</span></div>`);
      draw();
      await wait(500);
      b.el.classList.remove('testing');
      busy = false;
    }
    function label(g) {
      if (!running || submitted) return;
      SFX.tap();
      const b = bottles[sel];
      if (b.tag === g) b.tag = null;
      else { bottles.forEach(o => { if (o.tag === g) o.tag = null; }); b.tag = g; }
      // 自动跳到下一个没贴标签的瓶子
      if (b.tag) { const n = bottles.findIndex(o => !o.tag); if (n >= 0) sel = n; }
      draw();
    }
    function submit() {
      if (!running) return;
      if (submitted) { level++; if (level >= L.GAS_LEVELS.length) return end(); setup(); return; }
      submitted = true;
      let ok = 0;
      bottles.forEach(b => {
        const good = b.tag === b.gas;
        b.el.classList.add(good ? 'good' : 'bad');
        b.el.querySelector('.gb-tag').innerHTML = good ? '✔ ' + GAS[b.gas].name : `✘ 是${GAS[b.gas].name}`;
        if (good) { ok++; right++; hud.add(20); }
        else {
          wrong++; hud.miss();
          C.addLabWrong('gas:' + b.gas, 'gas', `怎样鉴别${GAS[b.gas].name}？`, GAS[b.gas].key);
          misses.push([`${GAS[b.gas].name}（误标为${GAS[b.tag].name}）`, GAS[b.gas].key]);
        }
      });
      const par = bottles.length * 2, bonus = ok === bottles.length ? Math.max(0, par - uses) * 3 : 0;
      if (bonus) { hud.score += bonus; hud.draw(true); }
      ok === bottles.length ? SFX.clear() : SFX.wrong();
      $('#gsLog').insertAdjacentHTML('afterbegin', `<div class="gl-row gl-sum">${ok === bottles.length ? '🎉 全部鉴定正确！' : `鉴定正确 ${ok}/${bottles.length}`}${bonus ? `　省工具奖励 +${bonus}` : ''}</div>` +
        bottles.filter(b => b.tag !== b.gas).map(b => `<div class="gl-row">💡 <b>${GAS[b.gas].name}</b>：${GAS[b.gas].key}</div>`).join(''));
      $('#gsSubmit').textContent = level + 1 >= L.GAS_LEVELS.length ? '🏁 结案' : '下一案 ▶';
      draw();
    }
    $('#gsSubmit').onclick = submit;
    const end = () => {
      if (!running) return;
      running = false;
      C.finish('gas', 'gas', [['鉴定正确', right], ['鉴定错误', wrong], ['用工具', totalUses]], missRows(misses));
    };
    this.start = () => { hud.reset(); level = 0; running = true; setup(); };
    this.stop = () => { running = false; };
    this.debug = () => ({ bottles: bottles.map(b => b.gas), sel, submitted, level });
  }

  /* =========================================================
   * 3. 虚拟实验台
   * ========================================================= */
  function BenchGame(opts = {}) {
    this.opts = opts;
    const list = shuffle(L.BENCH);
    let i = 0, exp = null, chosen = new Set(), attempts = 0, running = false, phase = 'pick', qi = 0, right = 0, wrong = 0, busy = false;
    const misses = [];
    function setup() {
      exp = list[i]; chosen = new Set(); attempts = 0; phase = 'pick'; qi = 0;
      C.progress(i, list.length);
      $('#bnTitle').textContent = exp.title;
      $('#bnPhase').textContent = '① 从货架上点选需要的试剂和仪器，放到实验台上';
      $('#bnVessel').innerHTML = S.benchVessel(exp.vessel);
      $('#bnSay').textContent = '';
      $('#bnQuiz').innerHTML = '';
      $('#bnShelf').hidden = false; $('#bnTray').hidden = false;
      $('#bnGo').hidden = false; $('#bnNext').hidden = true;
      const sh = $('#bnShelf'); sh.innerHTML = '';
      shuffle(exp.shelf).forEach(id => {
        const it = L.ITEMS[id], d = document.createElement('button');
        d.className = 'bitem'; d.dataset.id = id;
        d.innerHTML = `<span class="bi-i">${it.icon}</span><span>${it.name}</span>`;
        d.addEventListener('click', () => toggle(id));
        sh.appendChild(d);
      });
      drawTray();
    }
    function toggle(id) {
      if (!running || phase !== 'pick' || busy) return;
      SFX.tap();
      chosen.has(id) ? chosen.delete(id) : chosen.add(id);
      drawTray();
    }
    function drawTray() {
      $$('.bitem').forEach(d => d.classList.toggle('on', chosen.has(d.dataset.id)));
      $('#bnTray').innerHTML = chosen.size ? [...chosen].map(id => `<span class="tchip">${L.ITEMS[id].icon} ${L.ITEMS[id].name}</span>`).join('') : '<span class="muted">实验台（空）</span>';
    }
    async function go() {
      SFX.unlock();
      if (!running || phase !== 'pick' || busy) return;
      attempts++;
      const bad = [...chosen].filter(id => !exp.need.includes(id));
      const miss = exp.need.filter(id => !chosen.has(id));
      if (bad.length || miss.length) {
        SFX.wrong(); hud.miss();
        const lines = bad.map(id => `❌ <b>${L.ITEMS[id].name}</b>：${exp.bad[id] || '本实验用不到它。'}`)
          .concat(bad.length ? [] : (() => {
            const hinted = miss.filter(id => exp.missing && exp.missing[id]);
            const rest = miss.length - hinted.length;
            return hinted.map(id => `➕ 还缺少 <b>${L.ITEMS[id].name}</b>：${exp.missing[id]}`).concat(rest ? [`➕ 还缺少 ${rest} 样试剂或仪器，再想想～`] : []);
          })());
        $('#bnSay').innerHTML = `<div class="bn-err">${lines.join('<br>')}</div>`;
        bad.forEach(id => chosen.delete(id));
        if (bad.length) { const why = bad.map(id => `${L.ITEMS[id].name}：${exp.bad[id] || '用不到'}`).join('；'); C.addLabWrong('bench:' + exp.id + ':pick', 'bench', `${exp.title}：选试剂/仪器`, why); misses.push([`${exp.title}（选材）`, bad.map(id => L.ITEMS[id].name).join('、') + ' 不该选']); }
        $('#bnTray').classList.add('shake'); setTimeout(() => $('#bnTray').classList.remove('shake'), 400);
        drawTray();
        return;
      }
      hud.add(attempts === 1 ? 20 : 5); SFX.ding(hud.combo);
      phase = 'run'; busy = true;
      $('#bnShelf').hidden = true; $('#bnGo').hidden = true;
      $('#bnPhase').textContent = '② 观察实验现象';
      await runSteps();
      busy = false;
      if (!running) return;
      phase = 'quiz'; ask();
    }
    async function runSteps() {
      const v = $('#bnVessel'), heat = exp.vessel === 'heat';
      for (const st of exp.steps) {
        if (!running) return;
        if (st.solid) v.querySelector('.bvs').innerHTML = S.benchSolid(st.solid, st.solidColor, heat);
        if (st.liquid && v.querySelector('.bvl')) v.querySelector('.bvl').style.fill = st.liquid;
        if (st.flame) v.querySelector('.bvflame').style.opacity = 1;
        if (st.bubbles) { v.querySelector('.bvb').style.opacity = 1; v.classList.add('bubbling'); SFX.bubble(); }
        if (st.shrink) v.querySelectorAll('.lump').forEach(l => l.classList.add('shrink'));
        if (st.coat) { const c = v.querySelector('.coat'); if (c) c.style.fill = st.coat; }
        if (st.drip) { const d = v.querySelector('.bvdrip'); if (d) d.innerHTML = '<g class="dropper-anim"><rect x="95" y="0" width="10" height="40" fill="rgba(220,240,255,.9)" stroke="#4a5d7a"/><ellipse cx="100" cy="0" rx="9" ry="10" fill="#444"/><circle class="drop" cx="100" cy="46" r="4" fill="#bfe6ff"/></g>'; }
        $('#bnSay').innerHTML = `<div class="bn-ok">👀 ${st.say}</div>`;
        await wait(1500);
      }
      if (exp.steps.some(s => s.bubbles)) setTimeout(SFX.bubble, 200);
    }
    function ask() {
      const q = exp.qs[qi];
      $('#bnPhase').textContent = `③ 追问 ${qi + 1}/${exp.qs.length}`;
      const box = $('#bnQuiz');
      box.innerHTML = `<div class="bq-q">${q.q}</div><div class="ph-opts bq-opts"></div><div class="ph-note bq-note"></div>`;
      const fmt = /=/.test(q.a[0]) ? eq : esc;
      choiceButtons(box.querySelector('.bq-opts'), shuffle(q.a.map((a, k) => ({ html: fmt(a), ok: k === 0 }))), (b, o) => {
        if (!running || busy) return;
        busy = true; revealChoices(box.querySelector('.bq-opts'), b);
        if (o.ok) { right++; hud.add(10); SFX.ding(hud.combo); confetti(b); }
        else {
          wrong++; hud.miss(); SFX.wrong();
          C.addLabWrong('bench:' + exp.id + ':' + qi, 'bench', `${exp.title}：${q.q}`, fmt(q.a[0]));
          misses.push([q.q, fmt(q.a[0])]);
        }
        box.querySelector('.bq-note').innerHTML = (o.ok ? '<b class="okc">✔ 正确</b> ' : '<b class="badc">✘</b> ') + (q.why || '');
        setTimeout(() => {
          busy = false;
          if (!running) return;
          qi++;
          if (qi < exp.qs.length) ask();
          else { $('#bnNext').hidden = false; $('#bnNext').textContent = i + 1 >= list.length ? '🏁 完成' : '下一个实验 ▶'; $('#bnPhase').textContent = '✅ 实验完成！'; }
        }, o.ok ? 1100 : 2400);
      });
    }
    $('#bnGo').onclick = go;
    $('#bnNext').onclick = () => { if (!running) return; i++; if (i >= list.length) end(); else setup(); };
    const end = () => {
      if (!running) return;
      running = false;
      C.finish('bench', 'bench', [['追问答对', right], ['答错', wrong], ['实验数', list.length]], missRows(misses));
    };
    this.start = () => { hud.reset(); running = true; setup(); };
    this.stop = () => { running = false; };
    this.debug = () => ({ exp, phase, qi, busy, chosen: [...chosen] });
  }

  /* =========================================================
   * 4. 装置拼装
   * ========================================================= */
  function DevGame(opts = {}) {
    this.opts = opts;
    const tasks = shuffle(L.DEVICE_TASKS);
    let i = 0, stage = 0, task = null, chosen = [], firstTry = true, running = false, right = 0, wrong = 0;
    const misses = [];
    function setup() {
      task = tasks[i]; stage = 0; chosen = [];
      C.progress(i, tasks.length);
      $('#dvTitle').innerHTML = `🎯 ${task.title}`;
      $('#dvBuilt').innerHTML = ''; $('#dvNext').hidden = true;
      showStage();
    }
    function showStage() {
      firstTry = true;
      const parts = stage === 0 ? L.DEVICE_GEN : L.DEVICE_COL;
      $('#dvStep').textContent = stage === 0 ? '第 1 步：选择发生装置' : `第 2 步：选择 ${task.gas} 的收集装置`;
      $('#dvWhy').innerHTML = '';
      const g = $('#dvGrid'); g.innerHTML = ''; g.hidden = false;
      shuffle(parts).forEach(p => {
        const d = document.createElement('button'); d.className = 'dpart'; d.dataset.id = p.id;
        d.innerHTML = S.DEVICES[p.id]() + `<div class="dp-n">${p.name}</div>`;
        d.addEventListener('click', () => pick(d, p));
        g.appendChild(d);
      });
    }
    function pick(d, p) {
      SFX.unlock();
      if (!running || d.disabled || stage > 1) return;
      if (p.ok.includes(task.id)) {
        d.classList.add('right'); right++; hud.add(firstTry ? 15 : 5); SFX.ding(hud.combo); confetti(d);
        chosen.push(p);
        $('#dvBuilt').innerHTML = chosen.map(c => `<div class="dv-piece">${S.DEVICES[c.id]()}<span>${c.name}</span></div>`).join('<div class="dv-plus">＋</div>');
        stage++;
        if (stage === 1) setTimeout(() => running && showStage(), 700);
        else {
          $('#dvGrid').hidden = true;
          $('#dvStep').textContent = '✅ 装置搭好啦！';
          $('#dvWhy').innerHTML = `<div class="dv-tip">💡 ${task.tip}</div>`;
          $('#dvNext').hidden = false; $('#dvNext').textContent = i + 1 >= tasks.length ? '🏁 完成' : '下一个 ▶';
          SFX.clear();
        }
      } else {
        firstTry = false; wrong++; hud.miss(); SFX.wrong();
        d.classList.add('wrongpick'); d.disabled = true;
        const why = p.why[task.id] || p.why._ || '这个装置不合适。';
        $('#dvWhy').innerHTML = `<div class="dv-err">✘ <b>${p.name}</b>：${why}</div>`;
        C.addLabWrong('dev:' + task.id + ':' + p.id, 'dev', `${task.title}：能用「${p.name}」吗？`, '不能。' + why);
        misses.push([`${task.title}：${p.name}`, why]);
      }
    }
    $('#dvNext').onclick = () => { if (!running) return; i++; if (i >= tasks.length) end(); else setup(); };
    const end = () => {
      if (!running) return;
      running = false;
      C.finish('dev', 'dev', [['选对', right], ['选错', wrong], ['装置数', tasks.length]], missRows(misses));
    };
    this.start = () => { hud.reset(); running = true; setup(); };
    this.stop = () => { running = false; };
    this.debug = () => ({ task: task && task.id, stage, ok: (stage === 0 ? L.DEVICE_GEN : L.DEVICE_COL).filter(p => task && p.ok.includes(task.id)).map(p => p.id) });
  }

  /* =========================================================
   * 5. 操作找茬
   * ========================================================= */
  function SpotGame(opts = {}) {
    this.opts = opts;
    const practice = !!opts.practice;
    let bank = L.MISTAKES.filter(m => !practice || C.labWrong()['spot:' + m.id]);
    const list = shuffle(bank).slice(0, practice ? bank.length : 10);
    let i = 0, cur = null, running = false, busy = false, tapped = false, right = 0, wrong = 0, found = 0;
    const misses = [];
    function setup() {
      cur = list[i]; busy = false; tapped = false;
      C.progress(i, list.length);
      $('#spAsk').textContent = cur.ask;
      const [cx, cy, r] = cur.hot;
      $('#spPic').innerHTML = `<svg class="sp-svg" viewBox="0 0 300 220">${S.SCENES[cur.scene]().replace(/^<svg[^>]*>|<\/svg>$/g, '')}<circle class="sp-hot" cx="${cx}" cy="${cy}" r="${r}" /><g class="sp-marks"></g></svg>`;
      $('#spPic svg').addEventListener('click', tapPic);
      $('#spTip').hidden = false;
      $('#spNote').innerHTML = ''; $('#spNext').hidden = true;
      const opts = shuffle([{ html: esc(cur.ok), ok: true }, ...cur.no.map(t => ({ html: esc(t), ok: false }))]);
      choiceButtons($('#spOpts'), opts, pick);
    }
    function tapPic(e) {
      if (!running || busy || tapped) return;
      tapped = true;
      const svg = e.currentTarget, rc = svg.getBoundingClientRect();
      const x = (e.clientX - rc.left) / rc.width * 300, y = (e.clientY - rc.top) / rc.height * 220;
      const [cx, cy, r] = cur.hot;
      const hit = Math.hypot(x - cx, y - cy) <= r * 1.4;
      svg.querySelector('.sp-marks').innerHTML = `<text x="${x}" y="${y}" font-size="22" text-anchor="middle" dominant-baseline="middle">${hit ? '🎯' : '❌'}</text>`;
      if (hit) { found++; hud.score += 5; hud.draw(true); SFX.shoot(); setTimeout(() => SFX.boom(0), 120); toast('找到了！+5'); }
      else { SFX.tap(); toast('不在这里，看看下面的选项'); }
      svg.querySelector('.sp-hot').classList.add('show');
      $('#spTip').hidden = true;
    }
    function pick(b, o) {
      SFX.unlock();
      if (!running || busy) return;
      busy = true; revealChoices($('#spOpts'), b);
      $('#spPic .sp-hot').classList.add('show'); $('#spTip').hidden = true;
      if (o.ok) {
        right++; hud.add(10); SFX.ding(hud.combo); confetti(b);
        if (practice) C.delLabWrong('spot:' + cur.id);
        $('#spNote').innerHTML = '<b class="okc">✔ 找对了！</b> 红圈处就是错误操作。';
      } else {
        wrong++; hud.miss(); SFX.wrong();
        C.addLabWrong('spot:' + cur.id, 'spot', cur.ask.replace('，错在哪？', '') + '（操作找茬）', cur.ok);
        misses.push([cur.ask.replace('，错在哪？', ''), cur.ok]);
        $('#spNote').innerHTML = `<b class="badc">✘</b> 正确：${esc(cur.ok)}`;
      }
      $('#spNext').hidden = false;
      $('#spNext').textContent = i + 1 >= list.length ? '🏁 完成' : '下一题 ▶';
    }
    $('#spNext').onclick = () => { if (!running) return; i++; if (i >= list.length) end(); else setup(); };
    const end = () => {
      if (!running) return;
      running = false;
      C.finish('spot', practice ? 'spot|wrong' : 'spot', [['答对', right], ['答错', wrong], ['点中错误', found]], missRows(misses));
    };
    this.start = () => {
      hud.reset();
      if (!list.length) { toast('没有找茬错题'); return; }
      running = true; setup();
    };
    this.stop = () => { running = false; };
    this.debug = () => ({ cur, busy });
  }

  /* ---------- 注册 ---------- */
  C.register('lab', {
    menu: true, scr: 'scrLab', title: '🧪 实验室',
    render() {
      const best = C.store.get('hx_best', {});
      $$('[data-labbest]').forEach(el => { const v = best[el.dataset.labbest]; el.textContent = v ? '最佳 ' + v : ''; });
    },
  });
  C.register('phen', { cls: PhenGame, scr: 'scrPhen', title: '⚡ 现象抢答', parent: 'lab', wrong: true });
  C.register('gas', { cls: GasGame, scr: 'scrGas', title: '🕵️ 气体鉴别侦探', parent: 'lab', wrong: true, doneTitle: '🕵️ 全部结案！' });
  C.register('bench', { cls: BenchGame, scr: 'scrBench', title: '🧫 虚拟实验台', parent: 'lab', wrong: true, doneTitle: '🧫 实验全部完成！' });
  C.register('dev', { cls: DevGame, scr: 'scrDev', title: '🔧 装置拼装', parent: 'lab', wrong: true, doneTitle: '🔧 装置全部搭好！' });
  C.register('spot', { cls: SpotGame, scr: 'scrSpot', title: '🔍 操作找茬', parent: 'lab', wrong: true, doneTitle: '🔍 找茬完成！' });
  window.HX.lab = { chem, eq };
})();
