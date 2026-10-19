/* =========================================================
 * 化学背背背 —— 全部化学数据都在这个文件里
 * 依据初中化合价口诀：
 *   一价钾钠银氢，二价钙镁钡锌，三铝四硅五价磷，
 *   二三铁、二四碳，铜汞二价最常见；氧 -2，氟 -1，单质为 0。
 *   原子团：OH -1, NO3 -1, SO4 -2, CO3 -2, NH4 +1, PO4 -3, ClO3 -1, MnO4 -1
 *
 * 字段说明：
 *   sym     元素符号 / 原子团（纯文本，数字会自动显示为下标）
 *   name    中文名
 *   z       原子序数（原子团没有）
 *   row,col 在简化周期表网格中的位置（col 为压缩后的列，见下方说明）
 *   val     本游戏接受的所有“常见化合价”（答出其中任意一个即算对）
 *   main    最常用的化合价（结算和提示时优先展示）
 *   noble   稀有气体：不出化合价题
 *   note    小贴士（答题后显示）
 *
 * 简化周期表列：1=IA 2=IIA 3=Mn(7族) 4=Fe(8族) 5=Cu/Ag(11族) 6=Zn/Hg(12族)
 *               7=IIIA 8=IVA 9=VA 10=VIA 11=VIIA 12=0族
 * 想加新元素：在 ELEMENTS 里照格式加一行，选好 row/col 不要和已有元素重叠即可。
 * ========================================================= */
window.CHEM = (function () {
  const ELEMENTS = [
    { sym: 'H',  name: '氢', z: 1,  row: 1, col: 1,  val: [1],             main: [1],  note: '一价钾钠银氢' },
    { sym: 'He', name: '氦', z: 2,  row: 1, col: 12, val: [0], noble: true, main: [0] },
    { sym: 'C',  name: '碳', z: 6,  row: 2, col: 8,  val: [2, 4],          main: [4],  note: '二四碳：CO 中 +2，CO₂ 中 +4' },
    { sym: 'N',  name: '氮', z: 7,  row: 2, col: 9,  val: [-3, 2, 4, 5],   main: [-3, 5], note: 'NH₃ 中 -3，NO 中 +2，NO₂ 中 +4，HNO₃ 中 +5' },
    { sym: 'O',  name: '氧', z: 8,  row: 2, col: 10, val: [-2],            main: [-2], note: '化合物中氧通常为 -2' },
    { sym: 'F',  name: '氟', z: 9,  row: 2, col: 11, val: [-1],            main: [-1], note: '氟只有 -1 价' },
    { sym: 'Ne', name: '氖', z: 10, row: 2, col: 12, val: [0], noble: true, main: [0] },
    { sym: 'Na', name: '钠', z: 11, row: 3, col: 1,  val: [1],             main: [1],  note: '一价钾钠银氢' },
    { sym: 'Mg', name: '镁', z: 12, row: 3, col: 2,  val: [2],             main: [2],  note: '二价钙镁钡锌' },
    { sym: 'Al', name: '铝', z: 13, row: 3, col: 7,  val: [3],             main: [3],  note: '三铝四硅五价磷' },
    { sym: 'Si', name: '硅', z: 14, row: 3, col: 8,  val: [4],             main: [4],  note: '三铝四硅五价磷：SiO₂ 中 +4' },
    { sym: 'P',  name: '磷', z: 15, row: 3, col: 9,  val: [5],             main: [5],  note: '三铝四硅五价磷：P₂O₅ 中 +5' },
    { sym: 'S',  name: '硫', z: 16, row: 3, col: 10, val: [-2, 4, 6],      main: [-2, 6], note: 'H₂S 中 -2，SO₂ 中 +4，SO₃/H₂SO₄ 中 +6' },
    { sym: 'Cl', name: '氯', z: 17, row: 3, col: 11, val: [-1, 1, 5, 7],   main: [-1], note: 'NaCl 中 -1，HClO 中 +1，KClO₃ 中 +5，HClO₄ 中 +7' },
    { sym: 'Ar', name: '氩', z: 18, row: 3, col: 12, val: [0], noble: true, main: [0] },
    { sym: 'K',  name: '钾', z: 19, row: 4, col: 1,  val: [1],             main: [1],  note: '一价钾钠银氢' },
    { sym: 'Ca', name: '钙', z: 20, row: 4, col: 2,  val: [2],             main: [2],  note: '二价钙镁钡锌' },
    { sym: 'Mn', name: '锰', z: 25, row: 4, col: 3,  val: [2, 4, 6, 7],    main: [2, 4, 6, 7], note: 'MnCl₂ +2，MnO₂ +4，K₂MnO₄ +6，KMnO₄ +7' },
    { sym: 'Fe', name: '铁', z: 26, row: 4, col: 4,  val: [2, 3],          main: [2, 3], note: '二三铁：亚铁 +2（FeCl₂），铁 +3（Fe₂O₃）' },
    { sym: 'Cu', name: '铜', z: 29, row: 4, col: 5,  val: [1, 2],          main: [2],  note: '铜常见 +2（CuO），Cu₂O 中 +1' },
    { sym: 'Zn', name: '锌', z: 30, row: 4, col: 6,  val: [2],             main: [2],  note: '二价钙镁钡锌' },
    { sym: 'Ag', name: '银', z: 47, row: 5, col: 5,  val: [1],             main: [1],  note: '一价钾钠银氢' },
    { sym: 'I',  name: '碘', z: 53, row: 5, col: 11, val: [-1, 5],         main: [-1], note: 'KI 中 -1；加碘盐里的 KIO₃ 中 +5' },
    { sym: 'Ba', name: '钡', z: 56, row: 6, col: 2,  val: [2],             main: [2],  note: '二价钙镁钡锌' },
    { sym: 'Hg', name: '汞', z: 80, row: 6, col: 6,  val: [2],             main: [2],  note: '铜汞二价最常见：HgO 中 +2' },
  ];

  // 原子团（根）。charge 即该原子团整体的化合价
  const GROUPS = [
    { sym: 'OH',   name: '氢氧根',   val: [-1], main: [-1], note: '氢氧根 -1，如 NaOH' },
    { sym: 'NO3',  name: '硝酸根',   val: [-1], main: [-1], note: '硝酸根 -1，如 KNO₃' },
    { sym: 'SO4',  name: '硫酸根',   val: [-2], main: [-2], note: '硫酸根 -2，如 CuSO₄' },
    { sym: 'CO3',  name: '碳酸根',   val: [-2], main: [-2], note: '碳酸根 -2，如 CaCO₃' },
    { sym: 'NH4',  name: '铵根',     val: [1],  main: [1],  note: '铵根是唯一常见的 +1 价阳离子原子团，如 NH₄Cl' },
    { sym: 'PO4',  name: '磷酸根',   val: [-3], main: [-3], note: '磷酸根 -3，如 Ca₃(PO₄)₂' },
    { sym: 'ClO3', name: '氯酸根',   val: [-1], main: [-1], note: '氯酸根 -1，如 KClO₃' },
    { sym: 'MnO4', name: '高锰酸根', val: [-1], main: [-1], note: '高锰酸根 -1（KMnO₄）；注意锰酸根 MnO₄²⁻ 是 -2' },
  ];
  GROUPS.forEach(g => (g.group = true));

  /* ---------- 化学式拼装用的“阳离子 / 阴离子” ----------
   * v 为化合价（带符号）。cname 为命名用字：如 亚铁、铁。
   * 阴离子 pre/suf 用于命名：氧化X、氯化X、硫化X、氢氧化X、硫酸X……
   */
  const CATIONS = [
    { sym: 'H',   v: 1, cname: '氢' },
    { sym: 'K',   v: 1, cname: '钾' },
    { sym: 'Na',  v: 1, cname: '钠' },
    { sym: 'Ag',  v: 1, cname: '银' },
    { sym: 'NH4', v: 1, cname: '铵', group: true },
    { sym: 'Ca',  v: 2, cname: '钙' },
    { sym: 'Mg',  v: 2, cname: '镁' },
    { sym: 'Ba',  v: 2, cname: '钡' },
    { sym: 'Zn',  v: 2, cname: '锌' },
    { sym: 'Cu',  v: 2, cname: '铜' },
    { sym: 'Fe',  v: 2, cname: '亚铁' },
    { sym: 'Fe',  v: 3, cname: '铁' },
    { sym: 'Al',  v: 3, cname: '铝' },
  ];
  const ANIONS = [
    { sym: 'O',   v: -2, kind: 'ide',  cname: '氧' },
    { sym: 'Cl',  v: -1, kind: 'ide',  cname: '氯' },
    { sym: 'S',   v: -2, kind: 'ide',  cname: '硫' },
    { sym: 'OH',  v: -1, kind: 'oh',   cname: '氢氧', group: true },
    { sym: 'NO3', v: -1, kind: 'acid', cname: '硝酸', group: true },
    { sym: 'SO4', v: -2, kind: 'acid', cname: '硫酸', group: true },
    { sym: 'CO3', v: -2, kind: 'acid', cname: '碳酸', group: true },
    { sym: 'PO4', v: -3, kind: 'acid', cname: '磷酸', group: true },
  ];
  // 不出题的组合（不存在、不稳定或初中不涉及）
  const SKIP = new Set([
    'H|OH', 'H|S',
    'NH4|O', 'NH4|OH', 'NH4|S',
    'Ag|OH', 'Ag|S', 'Ag|PO4', 'Ag|CO3',
    'Al|S', 'Al|CO3',
    'Fe3|S', 'Fe3|CO3', 'Fe2|S', 'Fe2|PO4', 'Fe3|PO4',
    'Cu|S', 'Cu|PO4', 'Cu|CO3', 'Zn|S', 'Mg|S', 'Ba|S', 'Ca|S', 'Zn|PO4', 'Mg|PO4', 'Ba|PO4', 'Al|PO4',
  ]);
  // 含氢化合物的特殊名称
  const SPECIAL_NAMES = {
    'H|O': '水', 'H|Cl': '氯化氢（盐酸）', 'H|NO3': '硝酸', 'H|SO4': '硫酸', 'H|CO3': '碳酸', 'H|PO4': '磷酸',
  };

  return { ELEMENTS, GROUPS, CATIONS, ANIONS, SKIP, SPECIAL_NAMES };
})();
