/* 化学背背背 · 实验插图（全部用代码画的 SVG，不需要图片文件） */
window.LABSVG = (function () {
  const GLASS = 'fill="rgba(220,240,255,.55)" stroke="#4a5d7a" stroke-width="2.2"';
  const svg = (vb, body, cls = '') => `<svg class="${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const table = (y = 200) => `<rect x="0" y="${y}" width="300" height="20" fill="#e9d6b5"/><line x1="0" y1="${y}" x2="300" y2="${y}" stroke="#b9996a" stroke-width="2"/>`;
  const txt = (x, y, s, size = 12, fill = '#2d3047', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" font-weight="700" ${extra}>${s}</text>`;
  const emoji = (x, y, e, size = 34, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="middle" ${extra}>${e}</text>`;

  // 试管：管口在 (x,y)，沿局部 +y 方向长 len，ang 为旋转角度
  function tube(x, y, len, ang, frac = 0, color = '#8fd3ff', extra = '') {
    const w = 9, p = (y0) => `M${-w},${y0} L${-w},${len - w} A${w},${w} 0 0 0 ${w},${len - w} L${w},${y0}`;
    const liq = frac > 0 ? `<path d="${p(len * (1 - frac))} Z" fill="${color}" opacity=".85"/>` : '';
    return `<g transform="translate(${x},${y}) rotate(${ang})">${liq}${extra}<path d="${p(0)}" fill="rgba(220,240,255,.35)" stroke="#4a5d7a" stroke-width="2.2"/><line x1="${-w - 2}" y1="0" x2="${w + 2}" y2="0" stroke="#4a5d7a" stroke-width="2.5"/></g>`;
  }
  function flame(x, y, s = 1, color = '#ff9f1a', inner = '#ffe066', cls = 'flick') {
    return `<g transform="translate(${x},${y}) scale(${s})"><g class="${cls}"><path d="M0,0 C-9,-8 -7,-22 0,-34 C7,-22 9,-8 0,0Z" fill="${color}"/><path d="M0,-2 C-4,-7 -3,-15 0,-22 C3,-15 4,-7 0,-2Z" fill="${inner}"/></g></g>`;
  }
  // 酒精灯：底部中心 (x,y)
  function lamp(x, y, lit = true, rot = 0) {
    return `<g transform="translate(${x},${y}) rotate(${rot})"><path d="M-28,0 C-34,-26 -20,-38 -8,-40 L8,-40 C20,-38 34,-26 28,0 Z" ${GLASS}/><path d="M-26,-4 C-30,-20 -20,-28 -6,-30 L6,-30 C20,-28 30,-20 26,-4 Z" fill="#cfe9ff" opacity=".8"/>${txt(0, -12, '酒精', 9, '#4a5d7a')}<rect x="-7" y="-48" width="14" height="8" fill="#9aa5b8" stroke="#4a5d7a" stroke-width="1.5"/><line x1="0" y1="-48" x2="0" y2="-55" stroke="#333" stroke-width="3"/>${lit ? flame(0, -54, 1) : ''}</g>`;
  }
  function beaker(x, y, w, h, liq = 0, color = '#bfe6ff', label = '', rot = 0) {
    const L = -w / 2, R = w / 2;
    return `<g transform="translate(${x},${y}) rotate(${rot})">${liq ? `<rect x="${L + 2}" y="${-liq}" width="${w - 4}" height="${liq - 1}" fill="${color}" opacity=".9"/>` : ''}<path d="M${L - 4},${-h} L${L},${-h + 4} L${L},0 L${R},0 L${R},${-h}" fill="rgba(220,240,255,.3)" stroke="#4a5d7a" stroke-width="2.2"/>${label ? txt(0, -h / 2, label, 11, '#2d3047') : ''}</g>`;
  }
  function bottle(x, y, label = '', rot = 0, open = true, labelSide = 'front') {
    const lab = label ? `<rect x="${labelSide === 'left' ? -22 : labelSide === 'right' ? 4 : -14}" y="-40" width="${labelSide === 'front' ? 28 : 18}" height="26" fill="#fff" stroke="#999"/>${txt(labelSide === 'left' ? -13 : labelSide === 'right' ? 13 : 0, -23, label, labelSide === 'front' ? 10 : 8)}` : '';
    return `<g transform="translate(${x},${y}) rotate(${rot})"><path d="M-22,0 L-22,-50 C-22,-60 -10,-62 -8,-66 L-8,-76 L8,-76 L8,-66 C10,-62 22,-60 22,-50 L22,0 Z" fill="#cfe7f5" stroke="#4a5d7a" stroke-width="2.2"/>${lab}${open ? '' : '<rect x="-9" y="-86" width="18" height="10" rx="2" fill="#888"/>'}</g>`;
  }
  function cylinder(x, base, h, level) {
    let ticks = '';
    for (let i = 1; i < 10; i++) { const yy = base - 10 - i * (h - 20) / 10; ticks += `<line x1="${x - 14}" y1="${yy}" x2="${x - (i % 5 ? 6 : 2)}" y2="${yy}" stroke="#4a5d7a" stroke-width="1"/>`; }
    return `<rect x="${x - 26}" y="${base - 6}" width="52" height="6" fill="#9aa5b8"/><path d="M${x - 15},${level} Q${x},${level + 6} ${x + 15},${level} L${x + 15},${base - 6} L${x - 15},${base - 6} Z" fill="#8fd3ff" opacity=".85"/><path d="M${x - 15},${base - h} L${x - 15},${base - 6} M${x + 15},${base - h} L${x + 15},${base - 6}" stroke="#4a5d7a" stroke-width="2.2" fill="none"/>${ticks}`;
  }
  const eye = (x, y) => `<g transform="translate(${x},${y})"><ellipse rx="16" ry="9" fill="#fff" stroke="#2d3047" stroke-width="2"/><circle cx="4" r="5" fill="#2d3047"/></g>`;
  const dash = (x1, y1, x2, y2, c = '#ff5e57') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2" stroke-dasharray="5 4"/>`;
  const stand = (x, top = 40, base = 200) => `<rect x="${x - 30}" y="${base - 6}" width="60" height="6" fill="#7a7f9a"/><line x1="${x}" y1="${base - 6}" x2="${x}" y2="${top}" stroke="#7a7f9a" stroke-width="4"/>`;

  /* ---------- 操作找茬场景（300×220） ---------- */
  const SCENES = {
    lookUp: () => table() + cylinder(170, 200, 170, 110) + eye(80, 170) + dash(96, 166, 170, 113) + txt(240, 113, '凹液面', 11, '#4a5d7a'),
    lookDown: () => table() + cylinder(170, 200, 170, 110) + eye(80, 40) + dash(96, 44, 170, 113) + txt(240, 113, '凹液面', 11, '#4a5d7a'),
    heatUp: () => table() + stand(255) + `<line x1="255" y1="95" x2="200" y2="95" stroke="#7a7f9a" stroke-width="4"/>` + lamp(118, 200) +
      tube(215, 75, 112, 60, 0, '', '<g fill="#6b4a2b">' + [[-4, 96], [3, 98], [0, 92], [-5, 90], [5, 92]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3"/>`).join('') + '</g>'),
    lampLight: () => table() + lamp(205, 200, false) + `<g transform="translate(132,166) rotate(70)">${lamp(0, 0, true)}</g>` + emoji(70, 120, '✋', 34),
    dropperIn: () => table() + tube(150, 70, 120, 0, .3) + `<g><ellipse cx="150" cy="30" rx="10" ry="14" fill="#444"/><rect x="146" y="42" width="8" height="90" fill="rgba(220,240,255,.8)" stroke="#4a5d7a" stroke-width="2"/></g>` + emoji(150, 18, '🤏', 26),
    stopper: () => table() + tube(207, 92, 100, -25, .15) +
      bottle(132, 72, '试剂', 105, true, 'left') + emoji(160, 40, '✋', 30) + `<path d="M48,198 L72,198 L76,174 L44,174 Z" fill="#888"/>`,
    label: () => table() + tube(207, 92, 100, -25, .15) +
      bottle(132, 72, '试剂', 105, true, 'right') + emoji(160, 40, '✋', 30) + `<path d="M44,198 L76,198 L72,174 L48,174 Z" fill="#888"/>` + `<path d="M190,100 q-14,6 -30,6" stroke="#8fd3ff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    hand: () => table() + bottle(230, 200, '锌粒', 0) + `<path d="M100,200 Q140,170 180,200 Z" fill="#b9c2cc"/>` + emoji(140, 150, '🫳', 54) + txt(140, 215, '药品', 10),
    dilute: () => table() + beaker(150, 200, 80, 90, 40, '#f5efc9', '浓硫酸') + beaker(210, 90, 60, 60, 25, '#bfe6ff', '水', -120) + `<path d="M178,62 Q160,90 155,110" stroke="#8fd3ff" stroke-width="5" fill="none"/>` + emoji(120, 100, '💥', 22) + emoji(185, 120, '💥', 18),
    balance: () => table() + `<rect x="120" y="182" width="60" height="18" fill="#7a7f9a"/><line x1="150" y1="182" x2="150" y2="120" stroke="#7a7f9a" stroke-width="5"/><line x1="70" y1="120" x2="230" y2="120" stroke="#7a7f9a" stroke-width="5"/><path d="M50,140 L110,140 L100,150 L60,150 Z M190,140 L250,140 L240,150 L200,150 Z" fill="#c6cbd8" stroke="#7a7f9a"/><line x1="80" y1="120" x2="80" y2="140" stroke="#7a7f9a" stroke-width="3"/><line x1="220" y1="120" x2="220" y2="140" stroke="#7a7f9a" stroke-width="3"/>` +
      `<rect x="68" y="118" width="24" height="22" fill="#c9a227" stroke="#8a6d10"/>${txt(80, 133, '砝码', 9)}<rect x="200" y="132" width="40" height="8" fill="#fff" stroke="#bbb"/><path d="M205,132 Q220,112 235,132 Z" fill="#e3e3e3" stroke="#aaa"/>${txt(220, 165, '药品', 10)}${txt(80, 165, '左盘', 10, '#7a7f9a')}${txt(220, 180, '右盘', 10, '#7a7f9a')}`,
    tooMuch: () => table() + lamp(130, 200) + tube(200, 60, 110, 45, .85, '#8fd3ff') + `<rect x="205" y="72" width="70" height="8" rx="3" fill="#b98b4e" transform="rotate(45 205 72)"/>` + txt(250, 40, '试管夹', 10, '#7a7f9a'),
    blow: () => table() + lamp(170, 200) + emoji(85, 135, '😗', 50) + `<path d="M115,140 q10,-6 20,0 M115,152 q10,-6 20,0 M118,128 q10,-6 20,0" stroke="#7aa7d6" stroke-width="2.5" fill="none"/>`,
    filter: () => table() + stand(250, 30) + `<line x1="250" y1="80" x2="170" y2="80" stroke="#7a7f9a" stroke-width="4"/><path d="M135,70 L195,70 L170,110 L170,150 L164,150 L164,110 Z" fill="rgba(220,240,255,.5)" stroke="#4a5d7a" stroke-width="2.2"/><path d="M140,73 L190,73 L167,105 Z" fill="#fff" opacity=".9"/>` + beaker(167, 200, 60, 60, 12, '#d6c4a0') +
      beaker(85, 55, 50, 50, 22, '#c9b48a', '', 120) + `<path d="M108,40 Q130,50 150,85" stroke="#c9b48a" stroke-width="5" fill="none"/>` + `<g class="splash"><circle cx="128" cy="68" r="3" fill="#c9b48a"/><circle cx="196" cy="78" r="3" fill="#c9b48a"/></g>`,
    smell: () => table() + bottle(150, 200, '?', 0) + emoji(150, 95, '👃', 48) + `<path d="M150,124 q-6,-6 0,-12 q6,-6 0,-12" stroke="#aab" stroke-width="2" fill="none"/>`,
    addAlcohol: () => table() + lamp(140, 200, true) + bottle(225, 95, '酒精', -125, true, 'front') + `<path d="M178,92 Q160,110 150,138" stroke="#cfe9ff" stroke-width="5" fill="none"/>`,
    lump: () => table() + `<rect x="138" y="185" width="24" height="15" fill="#7a7f9a"/>` + tube(150, 60, 125, 0) + `<g class="fall"><rect x="140" y="20" width="20" height="16" rx="4" fill="#9a8f7a"/></g><path d="M134,40 l0,14 M166,40 l0,14" stroke="#aab" stroke-width="2"/>` + emoji(185, 175, '💥', 20),
  };

  /* ---------- 装置图（160×140） ---------- */
  const vbD = '0 0 160 140';
  function flask(funnel, outBad) {
    const liq = '<path d="M38,104 L22,128 L98,128 L82,104 Z" fill="#cfe9ff"/>';
    const body = `<path d="M50,58 L50,80 L18,130 L102,130 L70,80 L70,58" fill="rgba(220,240,255,.35)" stroke="#4a5d7a" stroke-width="2.2"/><rect x="47" y="50" width="26" height="10" fill="#a0522d"/>`;
    const solid = '<g fill="#777">' + [[44, 125], [58, 126], [72, 125], [52, 121], [66, 122]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3.5"/>`).join('') + '</g>';
    let f = '';
    if (funnel === 'long') f = `<path d="M44,10 L64,10 L56,26 L56,118" fill="none" stroke="#4a5d7a" stroke-width="2.2"/><line x1="52" y1="26" x2="52" y2="118" stroke="#4a5d7a" stroke-width="2.2"/>`;
    if (funnel === 'longBad') f = `<path d="M44,10 L64,10 L56,26 L56,92" fill="none" stroke="#4a5d7a" stroke-width="2.2"/><line x1="52" y1="26" x2="52" y2="92" stroke="#4a5d7a" stroke-width="2.2"/>`;
    if (funnel === 'sep') f = `<path d="M54,4 C34,10 34,34 54,40 L54,62 M58,4 C78,10 78,34 58,40 L58,62" fill="rgba(220,240,255,.4)" stroke="#4a5d7a" stroke-width="2.2"/><rect x="48" y="40" width="16" height="5" fill="#4a5d7a"/><path d="M42,24 C44,34 68,34 70,24 Z" fill="#cfe9ff"/>`;
    const outY = outBad ? 118 : 62;
    const out = `<path d="M66,${outY} L66,44 L66,40 L150,40" fill="none" stroke="#4a5d7a" stroke-width="3"/>`;
    return svg(vbD, liq + solid + body + f + out);
  }
  function heatTube(down) {
    const ang = down ? 100 : 60, mx = down ? 108 : 112, my = down ? 64 : 34;
    const pow = '<g fill="#4a1a5c">' + [[-4, 70], [3, 72], [0, 66], [-5, 64], [5, 66]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3"/>`).join('') + '</g>';
    const cotton = down ? '<ellipse cx="0" cy="8" rx="7" ry="5" fill="#fff" stroke="#ccc"/>' : '';
    const lampX = down ? 38 : 52;
    return svg(vbD, `<rect x="0" y="134" width="160" height="6" fill="#e9d6b5"/><line x1="140" y1="134" x2="140" y2="20" stroke="#7a7f9a" stroke-width="3"/><line x1="140" y1="${my + 6}" x2="${mx}" y2="${my + 6}" stroke="#7a7f9a" stroke-width="3"/>` +
      `<g transform="translate(0,0) scale(.7) translate(${lampX / .7 - lampX},${134 / .7 - 134})">${lamp(lampX, 134, true)}</g>` +
      tube(mx, my, 80, ang, 0, '', pow + cotton) + `<path d="M${mx},${my} L158,${my}" stroke="#4a5d7a" stroke-width="3" fill="none"/>`);
  }
  const jar = (x, y, inv, extra = '') => `<g transform="translate(${x},${y}) ${inv ? 'scale(1,-1)' : ''}"><path d="M-22,0 L-22,-62 Q-22,-66 -18,-66 L18,-66 Q22,-66 22,-62 L22,0 Z" fill="rgba(220,240,255,.35)" stroke="#4a5d7a" stroke-width="2.2"/>${extra}</g>`;
  const DEVICES = {
    heatDown: () => heatTube(true),
    heatUp: () => heatTube(false),
    flLong: () => flask('long'),
    flLongBad: () => flask('longBad'),
    flSep: () => flask('sep'),
    flOutBad: () => flask('long', true),
    water: () => svg(vbD, `<path d="M10,70 L10,130 L150,130 L150,70" fill="none" stroke="#4a5d7a" stroke-width="2.2"/><rect x="11" y="84" width="138" height="45" fill="#bfe6ff" opacity=".8"/><g transform="translate(100,112)"><path d="M-22,0 L-22,-62 Q-22,-66 -18,-66 L18,-66 Q22,-66 22,-62 L22,0" fill="#bfe6ff" stroke="#4a5d7a" stroke-width="2.2"/></g><path d="M0,20 L40,20 L40,122 L96,122 L96,106" fill="none" stroke="#4a5d7a" stroke-width="3"/><g class="bubbles-s" fill="#fff" stroke="#7ab"><circle cx="96" cy="100" r="3"/><circle cx="102" cy="90" r="2.5"/><circle cx="98" cy="80" r="2"/></g>`),
    upAir: () => svg(vbD, jar(90, 128, false) + `<path d="M0,30 L98,30 L98,122" fill="none" stroke="#4a5d7a" stroke-width="3"/><rect x="62" y="58" width="56" height="4" fill="#bbb"/>`),
    downAir: () => svg(vbD, `<g transform="translate(0,-60)">${jar(90, 70, true)}</g><path d="M0,128 L98,128 L98,18" fill="none" stroke="#4a5d7a" stroke-width="3"/>`),
    upShort: () => svg(vbD, jar(90, 128, false) + `<path d="M0,30 L98,30 L98,66" fill="none" stroke="#4a5d7a" stroke-width="3"/><rect x="62" y="58" width="56" height="4" fill="#bbb"/>`),
  };

  /* ---------- 气体瓶 & 鉴别特效 ---------- */
  function gasJar(label) {
    return svg('0 -60 100 200', `<g class="gj-fx"></g><path d="M18,135 L18,32 Q18,28 22,28 L78,28 Q82,28 82,32 L82,135 Z" fill="rgba(220,240,255,.45)" stroke="#4a5d7a" stroke-width="2.5"/><rect x="12" y="23" width="76" height="5" rx="2" fill="#9fb3c8" class="gj-plate"/><rect x="28" y="70" width="44" height="30" rx="6" fill="#fff" stroke="#c9c9e0" stroke-width="2"/><text x="50" y="92" font-size="20" font-weight="900" text-anchor="middle" fill="#6c5ce7" class="gj-label">${label}</text>`, 'gasjar');
  }
  const splint = (tip) => `<g class="splint"><line x1="50" y1="-55" x2="50" y2="60" stroke="#b07a3c" stroke-width="5" stroke-linecap="round"/>${tip}</g>`;
  const liquid = (c, cls = '') => `<rect class="${cls}" x="20" y="108" width="60" height="26" fill="${c}"/>`;
  const cup = (inner) => `<g class="cup"><path d="M22,-10 L22,-52 L78,-52 L78,-10" fill="rgba(220,240,255,.5)" stroke="#4a5d7a" stroke-width="2.2"/>${inner}</g>`;
  const GASFX = {
    relight: () => splint(`<circle cx="50" cy="60" r="4" fill="#ff5a00" class="ember"/>` + flame(50, 62, 1.1, '#ff9f1a', '#ffe066', 'grow')),
    glow: () => splint(`<circle cx="50" cy="60" r="4" fill="#ff5a00" class="ember"/>`),
    brighter: () => splint(flame(50, 62, 1.6, '#ff8a00', '#fff36b', 'grow')),
    normal: () => splint(flame(50, 62, .9)),
    out: () => splint(flame(50, 62, .9, '#ff9f1a', '#ffe066', 'die') + `<g class="smoke"><circle cx="50" cy="45" r="6" fill="#bbb"/><circle cx="55" cy="35" r="5" fill="#ccc"/></g>`),
    gasPale: () => flame(50, 26, 1.3, '#9fd8ff', '#e6f6ff', 'grow') + splint(''),
    gasBlue: () => flame(50, 26, 1.3, '#3b82f6', '#a8d4ff', 'grow') + splint(''),
    cloudy: () => liquid('#bfe6ff', 'to-milk'),
    clear: () => liquid('#bfe6ff'),
    litmusRed: () => liquid('#8e44ad', 'to-red'),
    litmus: () => liquid('#8e44ad'),
    fog: () => flame(50, 26, 1.1, '#9fd8ff', '#e6f6ff', 'grow') + cup(`<g class="drops" fill="#7fb8e6">${[30, 42, 55, 68, 36, 62].map((x, i) => `<circle cx="${x}" cy="${-46 + (i % 3) * 8}" r="2.2"/>`).join('')}</g>`),
    nofog: () => flame(50, 26, 1.1, '#3b82f6', '#a8d4ff', 'grow') + cup(''),
    cupCloudy: () => flame(50, 26, 1.1, '#3b82f6', '#a8d4ff', 'grow') + cup(`<path class="to-milk-s" d="M25,-50 L25,-12 M75,-50 L75,-12 M25,-49 L75,-49" stroke="#bfe6ff" stroke-width="5"/><text class="drops" x="50" y="-26" font-size="12" text-anchor="middle" fill="#7a7f9a" font-weight="800">浑浊</text>`),
    cupClear: () => flame(50, 26, 1.1, '#9fd8ff', '#e6f6ff', 'grow') + cup(`<path d="M25,-50 L25,-12 M75,-50 L75,-12 M25,-49 L75,-49" stroke="#bfe6ff" stroke-width="5"/>`),
    noign: () => `<g class="fizz">${emoji(50, 12, '✨', 22)}</g>` + `<text x="50" y="-20" font-size="13" text-anchor="middle" fill="#7a7f9a" font-weight="700">点不着</text>`,
  };

  /* ---------- 实验台容器（200×200） ---------- */
  function benchVessel(type) {
    const bub = `<g class="bvb" opacity="0">${Array.from({ length: 10 }, (_, i) => `<circle class="bb" cx="${type === 'tube' ? 92 + (i * 7) % 16 : 70 + (i * 23) % 60}" cy="${type === 'tube' ? 170 : 175}" r="${2 + (i % 3)}" style="animation-delay:${(i * .17).toFixed(2)}s"/>`).join('')}</g>`;
    if (type === 'flask') return svg('0 0 200 200', `<defs><clipPath id="bvClip"><path d="M85,60 L85,95 L40,185 L160,185 L115,95 L115,60 Z"/></clipPath></defs><g clip-path="url(#bvClip)"><rect class="bvl" x="0" y="125" width="200" height="75" fill="transparent"/><g class="bvs"></g>${bub}</g><path d="M85,40 L85,95 L40,185 L160,185 L115,95 L115,40" fill="none" stroke="#4a5d7a" stroke-width="3"/><rect x="0" y="186" width="200" height="14" fill="#e9d6b5"/>`, 'bench-svg');
    if (type === 'beaker') return svg('0 0 200 200', `<defs><clipPath id="bvClip"><rect x="52" y="60" width="96" height="125"/></clipPath></defs><g clip-path="url(#bvClip)"><rect class="bvl" x="0" y="110" width="200" height="90" fill="transparent"/><g class="bvs"></g>${bub}</g><path d="M46,56 L52,62 L52,185 L148,185 L148,56" fill="none" stroke="#4a5d7a" stroke-width="3"/><g class="bvdrip"></g><rect x="0" y="186" width="200" height="14" fill="#e9d6b5"/>`, 'bench-svg');
    if (type === 'tube') return svg('0 0 200 200', `<defs><clipPath id="bvClip"><path d="M86,30 L86,170 A14,14 0 0 0 114,170 L114,30 Z"/></clipPath></defs><g clip-path="url(#bvClip)"><rect class="bvl" x="0" y="110" width="200" height="90" fill="transparent"/><g class="bvs"></g>${bub}</g><path d="M86,24 L86,170 A14,14 0 0 0 114,170 L114,24" fill="none" stroke="#4a5d7a" stroke-width="3"/><rect x="60" y="186" width="80" height="14" fill="#e9d6b5"/>`, 'bench-svg');
    // heat：倾斜试管 + 酒精灯 + 水槽
    return svg('0 0 200 200', `<rect x="0" y="186" width="200" height="14" fill="#e9d6b5"/><g class="bvflame" opacity="0">${lamp(50, 186, true)}</g><g transform="translate(110,70) rotate(100)"><g class="bvs"></g><ellipse cx="0" cy="8" rx="7" ry="5" fill="#fff" stroke="#ccc"/><path d="M-10,0 L-10,82 A10,10 0 0 0 10,82 L10,0" fill="rgba(220,240,255,.35)" stroke="#4a5d7a" stroke-width="2.5"/></g><path d="M110,70 L150,70 L150,165 L160,165" fill="none" stroke="#4a5d7a" stroke-width="3"/><path d="M128,130 L128,185 L196,185 L196,130" fill="none" stroke="#4a5d7a" stroke-width="2.2"/><rect x="129" y="140" width="66" height="44" fill="#bfe6ff" opacity=".8"/>${bub.replace(/cx="(\d+)"/g, (m, v) => `cx="${158 + (+v % 12)}"`).replace(/cy="\d+"/g, 'cy="165"')}`, 'bench-svg');
  }
  function benchSolid(type, color, heat) {
    if (heat) return type === 'powder' ? [[-4, 70], [3, 72], [0, 66], [-5, 64], [5, 66], [2, 76], [-2, 74]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="3.2" fill="${color}"/>`).join('') : '';
    if (type === 'lump') return [[85, 170], [105, 174], [120, 168], [95, 160]].map(([x, y], i) => `<rect class="lump" x="${x - 9}" y="${y - 7}" width="${16 + i % 2 * 4}" height="${12 + i % 3 * 2}" rx="4" fill="${color}" stroke="#777"/>`).join('');
    if (type === 'powder') return Array.from({ length: 14 }, (_, i) => `<circle cx="${70 + (i * 37) % 60}" cy="${178 - (i % 3) * 3}" r="3" fill="${color}"/>`).join('');
    if (type === 'nail') return `<g class="nail"><rect x="95" y="62" width="10" height="118" fill="${color}"/><rect x="86" y="58" width="28" height="7" rx="2" fill="${color}"/><rect class="coat" x="95" y="110" width="10" height="70" fill="transparent"/></g>`;
    return '';
  }
  return { SCENES, DEVICES, gasJar, GASFX, benchVessel, benchSolid };
})();
