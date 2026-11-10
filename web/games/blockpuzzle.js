/* Blok Yerleştir - blok bulmacası: 3 mod, jokerler, ipucu, kaldığın yerden devam */
(function () {
  const U = Platform.util;
  const S = (str) => {
    // "##.|.##" biçimini hücre listesine çevir
    const cells = [];
    str.split('|').forEach((row, y) => row.split('').forEach((ch, x) => { if (ch === '#') cells.push([x, y]); }));
    return cells;
  };
  // [hücreler, ağırlık, büyük parça mı]
  const SHAPES = [
    [S('#'), 3], [S('##'), 4], [S('#|#'), 4],
    [S('###'), 4], [S('#|#|#'), 4],
    [S('####'), 3], [S('#|#|#|#'), 3],
    [S('#####'), 2, 1], [S('#|#|#|#|#'), 2, 1],
    [S('##|##'), 5], [S('###|###|###'), 2, 1],
    [S('##|#.'), 3], [S('##|.#'), 3], [S('#.|##'), 3], [S('.#|##'), 3],
    [S('#..|###'), 2], [S('..#|###'), 2], [S('###|#..'), 2], [S('###|..#'), 2],
    [S('#.|#.|##'), 2], [S('.#|.#|##'), 2], [S('##|#.|#.'), 2], [S('##|.#|.#'), 2],
    [S('###|.#.'), 2], [S('.#.|###'), 2], [S('#.|##|#.'), 2], [S('.#|##|.#'), 2],
    [S('##.|.##'), 1], [S('.##|##.'), 1], [S('#.|##|.#'), 1], [S('.#|##|#.'), 1],
    [S('###|###'), 2, 1], [S('##|##|##'), 2, 1],
    [S('#..|#..|###'), 1, 1], [S('###|..#|..#'), 1, 1], [S('..#|..#|###'), 1, 1], [S('###|#..|#..'), 1, 1],
    [S('#.|.#'), 1], [S('.#|#.'), 1]
  ];
  const THEMES = {
    night: { bg: ['#2b1a4d', '#140d27'], board: 'rgba(0,0,0,.32)', cell: 'rgba(255,255,255,.06)', hud: '#d9ccff',
      pal: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac'] },
    ocean: { bg: ['#0b3b5c', '#06192b'], board: 'rgba(0,10,25,.35)', cell: 'rgba(160,220,255,.07)', hud: '#bfe8ff',
      pal: ['#ff8787', '#ffc078', '#ffe066', '#8ce99a', '#63e6be', '#66d9e8', '#74c0fc', '#91a7ff', '#e599f7'] },
    candy: { bg: ['#ff9ec7', '#b55ad6'], board: 'rgba(70,0,60,.25)', cell: 'rgba(255,255,255,.16)', hud: '#fff0f8',
      pal: ['#ff4d6d', '#ff922b', '#fcc419', '#40c057', '#12b886', '#228be6', '#5c7cfa', '#9c36b5', '#e64980'] },
    wood: { bg: ['#6b4423', '#3b2412'], board: 'rgba(30,15,5,.4)', cell: 'rgba(255,220,170,.08)', hud: '#ffe3c2',
      pal: ['#e8590c', '#f08c00', '#fab005', '#82c91e', '#2f9e44', '#1c7ed6', '#4263eb', '#ae3ec9', '#d6336c'] }
  };
  const GEMS = [null, '#ff4d6d', '#3fa9ff', '#3ddc84'];
  const JOKERS = [
    { k: 'rot', ic: '🔄', name: 'Döndür', tip: 'Döndürmek istediğin bloğa dokun' },
    { k: 're', ic: '🎲', name: 'Yenile', tip: '' },
    { k: 'bomb', ic: '💣', name: 'Bomba', tip: 'Patlatmak istediğin yere dokun (3×3)' },
    { k: 'undo', ic: '↩️', name: 'Geri Al', tip: '' },
    { k: 'hint', ic: '💡', name: 'İpucu', tip: '' }
  ];
  const START_JOKERS = { rot: 2, re: 1, bomb: 1, undo: 1, hint: 3 };
  const PRAISE = ['', '', 'Güzel!', 'Harika!', 'Muhteşem!', 'İnanılmaz!', 'Efsane!'];
  const TIME_START = 120;

  // Seviyeler için tekrarlanabilir rastgele sayı üretici
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dims(cells) { let w = 0, h = 0; for (const [x, y] of cells) { w = Math.max(w, x + 1); h = Math.max(h, y + 1); } return { w, h }; }
  function rotateCells(cells) {
    const d = dims(cells);
    return cells.map(([x, y]) => [d.h - 1 - y, x]);
  }

  Platform.register({
    id: 'blockpuzzle', name: 'Blok Yerleştir', gen: 'modern', genre: 'Bulmaca', isNew: 'Güncellendi',
    colors: ['#f59e0b', '#c2410c'],
    desc: 'Blokları tahtaya sürükle, satır ve sütunları patlat. Macera ve zamana karşı modları, jokerler!',
    help: '<ul><li>Alttaki bloklardan birine dokun ve <b>tahtaya sürükle</b>. Blok parmağının üstünde durur, en yakın uygun yere kendiliğinden oturur.</li><li>Dolan her <b>satır veya sütun</b> patlar. Aynı anda birden çok satır = büyük puan.</li><li>Üst üste patlatırsan <b>🔥 seri</b> büyür ve puanın katlanır. 3 hamle boyunca patlatma yapmazsan seri sıfırlanır.</li><li>Tahtayı tamamen boşaltırsan <b>Tahta Temiz</b> bonusu!</li><li><b>Jokerler:</b> 🔄 bloğu döndürür, 🎲 blokları yeniler, 💣 3×3 alanı patlatır, ↩️ son hamleyi geri alır, 💡 en iyi hamleyi gösterir. Büyük patlatmalarla yeni joker kazanırsın.</li><li><b>Macera:</b> satırları patlatarak istenen mücevherleri topla, seviye atla.</li><li><b>Zamana Karşı:</b> 2 dakikan var, her patlatma süre kazandırır.</li><li>Klasik ve Macera oyunların kaydedilir; çıksan bile kaldığın yerden devam edersin.</li></ul>',
    icon: '<rect x="6" y="6" width="14" height="14" rx="3" fill="#ffd43b"/><rect x="21" y="6" width="14" height="14" rx="3" fill="#ffd43b"/><rect x="6" y="21" width="14" height="14" rx="3" fill="#ffd43b"/><rect x="21" y="21" width="14" height="14" rx="3" fill="#ffd43b"/><rect x="6" y="44" width="14" height="14" rx="3" fill="#ff6b6b"/><rect x="21" y="44" width="14" height="14" rx="3" fill="#ff6b6b"/><rect x="36" y="44" width="14" height="14" rx="3" fill="#ff6b6b"/><rect x="42" y="14" width="14" height="14" rx="3" fill="#4dabf7"/><rect x="42" y="29" width="14" height="14" rx="3" fill="#4dabf7"/>',
    options: [
      { key: 'mode', label: 'OYUN MODU', choices: [['classic', 'Klasik'], ['adv', 'Macera'], ['time', 'Zamana Karşı']], def: 'classic' },
      { key: 'size', label: 'TAHTA (Klasik / Zamanlı)', choices: [[8, '8 × 8'], [10, '10 × 10']], def: 8 },
      { key: 'drag', label: 'SÜRÜKLEME HIZI', choices: [[1, 'Normal'], [1.25, 'Hızlı'], [1.5, 'Çok hızlı']], def: 1.25 },
      { key: 'theme', label: 'TEMA', choices: [['night', 'Gece'], ['ocean', 'Okyanus'], ['candy', 'Şeker'], ['wood', 'Ahşap']], def: 'night' }
    ],
    bestKey: o => o.mode === 'adv' ? 'adv' : o.mode + ':' + o.size,
    create(s, opts) {
      const MODE = opts.mode || 'classic';
      const N = MODE === 'adv' ? 8 : (opts.size || 8);
      const SENS = opts.drag || 1.25;
      const TH = THEMES[opts.theme] || THEMES.night;
      const PAL = TH.pal;
      const W = 360;
      const view = s.canvasFill(W, 590, 720);
      const g = view.g, H = view.H;
      const C = Math.floor(340 / N), BW = N * C, BX = Math.round((W - BW) / 2);
      // fazla yüksekliği üst boşluğa ve tepsiye paylaştır
      const extra = Math.max(0, H - (50 + BW + 62 + 150 + 6));
      const BY = 50 + Math.round(extra * 0.25);
      const JY = BY + BW + 10, JH = 44;
      const TRAY_Y = JY + JH + 8, TRAY_H = Math.min(H - TRAY_Y - 6, 150 + Math.round(extra * 0.5));
      const TC = Math.min(C * 0.64, (TRAY_H - 24) / 4);
      const SAVE = 'save:' + (MODE === 'adv' ? 'adv' : MODE + N);

      let board, tray, score, combo, sinceClear, jokers, undoSnap, level, goals, timeLeft, nextJokerAt;
      let drag = null, jmode = null, hint = null, stuck = false, over = false, lvlDone = 0;
      let dispScore = 0, shake = 0, praise = null, grayT = -1, t = 0;
      const clearing = [], floats = [], flying = [];
      const fx = new U.Particles();

      /* ---------- yardımcılar ---------- */
      const newBoard = () => Array.from({ length: N }, () => new Array(N).fill(null));
      function fits(cells, gx, gy, b) {
        b = b || board;
        for (const [x, y] of cells) {
          const bx = gx + x, by = gy + y;
          if (bx < 0 || by < 0 || bx >= N || by >= N || b[by][bx]) return false;
        }
        return true;
      }
      function fitsAnywhere(cells, b) {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(cells, x, y, b)) return true;
        return false;
      }
      // Bir yerleştirmenin kaç satır/sütun sileceği
      function linesIf(cells, gx, gy, b) {
        b = b || board;
        const rows = new Set(), cols = new Set();
        cells.forEach(([x, y]) => { rows.add(gy + y); cols.add(gx + x); });
        let n = 0;
        const filled = (x, y) => b[y][x] || cells.some(([cx, cy]) => cx + gx === x && cy + gy === y);
        rows.forEach(y => { let f = true; for (let x = 0; x < N && f; x++) if (!filled(x, y)) f = false; if (f) n++; });
        cols.forEach(x => { let f = true; for (let y = 0; y < N && f; y++) if (!filled(x, y)) f = false; if (f) n++; });
        return n;
      }
      function fillRatio() { let k = 0; for (const r of board) for (const v of r) if (v) k++; return k / (N * N); }

      /* ---------- parça üretimi ---------- */
      function shapePool() {
        // Puan arttıkça büyük parçalar biraz daha sık gelir
        const hard = MODE === 'adv' ? Math.min(1, level / 12) : Math.min(1, score / 6000);
        return SHAPES.map(sh => [sh[0], sh[1] * (sh[2] ? 0.8 + hard * 0.8 : 1)]);
      }
      function pickFrom(pool) {
        const tot = pool.reduce((a, p) => a + p[1], 0);
        let r = Math.random() * tot;
        for (const p of pool) { r -= p[1]; if (r <= 0) return p[0]; }
        return pool[0][0];
      }
      // Satır tamamlayabilecek parçalar (oyuncuya yardım için)
      function helpfulPool(pool) {
        const good = [];
        for (const p of pool) {
          let best = 0;
          for (let y = 0; y < N && best < 2; y++) for (let x = 0; x < N && best < 2; x++) if (fits(p[0], x, y)) { const l = linesIf(p[0], x, y); if (l > best) best = l; }
          if (best > 0) good.push([p[0], p[1] * best]);
        }
        return good;
      }
      // Üç parçanın bir sırayla hepsi yerleşebiliyor mu? (sınırlı arama)
      function solvable(pieces) {
        let budget = 2500;
        const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
        function apply(b, cells, gx, gy) {
          const nb = b.map(r => r.slice());
          cells.forEach(([x, y]) => { nb[gy + y][gx + x] = 1; });
          for (let y = 0; y < N; y++) if (nb[y].every(Boolean)) nb[y]._full = 1;
          const fullC = [];
          for (let x = 0; x < N; x++) { let f = true; for (let y = 0; y < N; y++) if (!nb[y][x]) { f = false; break; } if (f) fullC.push(x); }
          for (let y = 0; y < N; y++) { if (nb[y]._full) nb[y].fill(null); fullC.forEach(x => { nb[y][x] = null; }); }
          return nb;
        }
        function dfs(b, order, k) {
          if (k === order.length) return true;
          const cells = pieces[order[k]];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (--budget < 0) return true; // arama çok uzadı: yeterince açık bir tahta
            if (fits(cells, x, y, b) && dfs(apply(b, cells, x, y), order, k + 1)) return true;
          }
          return false;
        }
        const b0 = board.map(r => r.map(v => v ? 1 : null));
        return perms.some(o => dfs(b0, o, 0));
      }
      function makePiece(cells) {
        const p = { cells, ci: U.randi(0, PAL.length - 1), gems: null, appear: 0, ret: null };
        if (MODE === 'adv' && goals) {
          const need = goals.reduce((a, gl) => a + Math.max(0, gl.n - gl.got), 0) - gemsOnBoard() - gemsInTray();
          if (need > 0 && Math.random() < 0.55) {
            const open = goals.filter(gl => gl.got < gl.n);
            if (open.length) { p.gems = {}; p.gems[U.randi(0, cells.length - 1)] = U.pick(open).type; }
          }
        }
        return p;
      }
      function refill() {
        const pool = shapePool();
        const help = 0.2 + fillRatio() * 0.5;
        const good = helpfulPool(pool);
        let pick = null;
        for (let tries = 0; tries < 24; tries++) {
          const t3 = [0, 1, 2].map(() => (good.length && Math.random() < help ? pickFrom(good) : pickFrom(pool)));
          if (!t3.some(c => fitsAnywhere(c))) continue;
          pick = t3;
          if (tries > 16 || solvable(t3)) break;
        }
        if (!pick) pick = [0, 1, 2].map(() => pickFrom(pool));
        tray = [];
        pick.forEach(c => tray.push(makePiece(c)));
      }
      function gemsOnBoard() { let k = 0; for (const r of board) for (const v of r) if (v && v.gem) k++; return k; }
      function gemsInTray() { let k = 0; if (tray) for (const p of tray) if (p && p.gems) k += Object.keys(p.gems).length; return k; }

      /* ---------- macera seviyesi ---------- */
      function buildLevel(L) {
        const R = rng(L * 7919 + 13);
        board = newBoard();
        const types = Math.min(3, 1 + Math.floor((L - 1) / 3));
        const ids = [1, 2, 3].sort(() => R() - 0.5).slice(0, types);
        goals = ids.map(type => ({ type, n: Math.min(12, 3 + Math.floor(L * 0.7) + Math.floor(R() * 2)), got: 0 }));
        const pre = Math.min(30, 8 + Math.floor(L * 1.8));
        let placed = 0, guard = 0;
        while (placed < pre && guard++ < 500) {
          const x = Math.floor(R() * N), y = Math.floor(R() * N);
          if (board[y][x]) continue;
          board[y][x] = { ci: Math.floor(R() * PAL.length), gem: 0 };
          const rowFull = board[y].every(Boolean);
          let colFull = true; for (let yy = 0; yy < N; yy++) if (!board[yy][x]) colFull = false;
          if (rowFull || colFull) { board[y][x] = null; continue; }
          placed++;
        }
        // Tahtadaki mücevherler hedefin yarısı kadar, kalanı parçalarla gelir
        const cellsList = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x]) cellsList.push(board[y][x]);
        cellsList.sort(() => R() - 0.5);
        let k = 0;
        goals.forEach(gl => {
          const onBoard = Math.ceil(gl.n * 0.5);
          for (let i = 0; i < onBoard && k < cellsList.length; i++) cellsList[k++].gem = gl.type;
        });
      }

      /* ---------- kayıt ---------- */
      function snapshot() {
        return JSON.stringify({ board, tray: tray.map(p => p && { cells: p.cells, ci: p.ci, gems: p.gems }), score, combo, sinceClear, goals, level, timeLeft, nextJokerAt });
      }
      function restore(str) {
        const o = JSON.parse(str);
        board = o.board; score = o.score; combo = o.combo; sinceClear = o.sinceClear;
        goals = o.goals; level = o.level; timeLeft = o.timeLeft; nextJokerAt = o.nextJokerAt || 1000;
        tray = o.tray.map(p => p && { cells: p.cells, ci: p.ci, gems: p.gems, appear: 1, ret: null });
      }
      function save() {
        if (over) return;
        s.record(score);
        if (MODE === 'time') return;
        s.store.set(SAVE, { snap: snapshot(), jokers });
      }
      function clearSave() { s.store.set(SAVE, null); }

      /* ---------- oyun akışı ---------- */
      function newGame() {
        score = 0; combo = 0; sinceClear = 0; nextJokerAt = 1000; timeLeft = TIME_START;
        jokers = Object.assign({}, START_JOKERS);
        level = MODE === 'adv' ? s.store.get('advLevel', 1) : 0;
        goals = null;
        if (MODE === 'adv') buildLevel(level); else board = newBoard();
        tray = null;
        refill();
      }
      function addJoker(k, x, y) {
        k = k || U.pick(['rot', 're', 'bomb', 'undo', 'hint']);
        jokers[k] = Math.min(9, jokers[k] + 1);
        const j = JOKERS.find(q => q.k === k);
        floats.push({ x: x != null ? x : W / 2, y: y != null ? y : JY - 10, txt: '+1 ' + j.ic, t: 0, col: '#9effc9' });
        s.sfx('power');
      }
      function scorePts(n) { return 10 * n * (n + 1) * (1 + (combo - 1) * 0.5); }

      function place(idx, gx, gy) {
        const p = tray[idx];
        undoSnap = snapshot();
        p.cells.forEach(([x, y], i) => { board[gy + y][gx + x] = { ci: p.ci, gem: p.gems && p.gems[i] ? p.gems[i] : 0, pop: 1 }; });
        tray[idx] = null;
        hint = null;
        score += p.cells.length;
        s.sfx('place'); s.vibe(12);
        const rows = [], cols = [];
        for (let y = 0; y < N; y++) if (board[y].every(v => v)) rows.push(y);
        for (let x = 0; x < N; x++) { let full = true; for (let y = 0; y < N; y++) if (!board[y][x]) { full = false; break; } if (full) cols.push(x); }
        const n = rows.length + cols.length;
        if (n) {
          combo++;
          sinceClear = 0;
          const pts = Math.round(scorePts(n));
          score += pts;
          const cells = new Set();
          rows.forEach(y => { for (let x = 0; x < N; x++) cells.add(y * N + x); });
          cols.forEach(x => { for (let y = 0; y < N; y++) cells.add(y * N + x); });
          let k = 0;
          const cx = gx + 1, cy = gy;
          const list = [...cells].sort((a, b) => Math.hypot(a % N - cx, (a / N | 0) - cy) - Math.hypot(b % N - cx, (b / N | 0) - cy));
          for (const id of list) {
            const x = id % N, y = (id / N) | 0;
            removeCell(x, y, -k * 0.014);
            k++;
          }
          s.sfx(n > 1 ? 'line' : 'pop');
          s.vibe(n > 1 ? 50 + n * 15 : 25);
          shake = Math.min(10, 2 + n * 2.2);
          floats.push({ x: BX + (gx + 1) * C, y: BY + gy * C, txt: '+' + pts, t: 0, col: '#fff3bf', big: true });
          if (n >= 2 || combo >= 3) praise = { txt: n >= 2 ? PRAISE[Math.min(6, n + 1)] : (combo >= 6 ? 'Durdurulamaz!' : 'Seri!'), t: 0, sub: combo > 1 ? '🔥 SERİ x' + combo : '' };
          if (n >= 3) addJoker(null, BX + (gx + 1) * C, BY + gy * C + 30);
          if (MODE === 'time') { const add = n * 3 + (combo > 2 ? 2 : 0); timeLeft += add; floats.push({ x: W - 60, y: 34, txt: '+' + add + ' sn', t: 0, col: '#8ce99a' }); }
          // tahta tamamen boşaldı mı?
          if (board.every(r => r.every(v => !v))) {
            const bonus = 300 * Math.max(1, combo);
            score += bonus;
            praise = { txt: 'TAHTA TEMİZ!', t: 0, sub: '+' + bonus, rainbow: true };
            fx.burst(W / 2, BY + BW / 2, PAL, 60, 320, 1.1, 5, 200);
            addJoker('bomb', W / 2, BY + BW / 2 + 40);
            s.timeout(() => s.sfx('win'), 200);
          }
        } else {
          sinceClear++;
          if (sinceClear >= 3) combo = 0;
        }
        if (MODE !== 'adv' && score >= nextJokerAt) { nextJokerAt += 1000 + Math.floor(nextJokerAt / 2); addJoker(); }
        if (tray.every(q => !q)) refill();
        checkGoals();
        checkStuck();
        save();
      }
      function removeCell(x, y, delay) {
        const cell = board[y][x];
        if (!cell) return;
        clearing.push({ x, y, ci: cell.ci, gem: cell.gem, t: delay || 0 });
        if (cell.gem && goals) {
          const gl = goals.find(q => q.type === cell.gem);
          if (gl && gl.got < gl.n) {
            gl.got++;
            const gi = goals.indexOf(gl);
            flying.push({ x: BX + x * C + C / 2, y: BY + y * C + C / 2, tx: goalX(gi), ty: 24, t: (delay || 0) * 1.6, type: cell.gem });
          }
        }
        board[y][x] = null;
      }
      function goalX(i) { return W - 30 - (goals.length - 1 - i) * 62; }
      function checkGoals() {
        if (MODE !== 'adv' || lvlDone || !goals.every(gl => gl.got >= gl.n)) return;
        lvlDone = 1;
        praise = { txt: 'SEVİYE ' + level + ' TAMAM!', t: 0, sub: '+' + (200 + level * 50) + ' puan', rainbow: true };
        score += 200 + level * 50;
        s.sfx('win'); s.vibe(120);
        fx.burst(W / 2, BY + BW / 2, PAL, 70, 340, 1.2, 5, 200);
        level++;
        s.store.set('advLevel', level);
        s.record(score);
        s.timeout(() => {
          const keep = jokers;
          buildLevel(level);
          tray = null; refill();
          jokers = keep; addJoker();
          undoSnap = null; lvlDone = 0; combo = 0; sinceClear = 0;
          save();
          s.toast('Seviye ' + level, 1200);
        }, 1700);
      }
      function canRotateHelp() {
        if (jokers.rot <= 0) return false;
        return tray.some(p => { if (!p) return false; let c = p.cells; for (let r = 0; r < 3; r++) { c = rotateCells(c); if (fitsAnywhere(c)) return true; } return false; });
      }
      function checkStuck() {
        if (over || lvlDone) return;
        const live = tray.filter(Boolean);
        const can = live.some(p => fitsAnywhere(p.cells));
        if (can) { stuck = false; return; }
        if (jokers.re > 0 || jokers.bomb > 0 || (jokers.undo > 0 && undoSnap) || canRotateHelp()) {
          if (!stuck) { stuck = true; s.sfx('error'); s.vibe(60); }
          return;
        }
        gameOver('Elindeki bloklar sığmadı.');
      }
      function gameOver(msg, title) {
        if (over) return;
        over = true; stuck = false; drag = null; jmode = null;
        grayT = 0;
        clearSave();
        s.sfx('lose'); s.vibe(200);
        s.over({ score, msg: MODE === 'adv' ? 'Seviye ' + level + ' · ' + msg : msg, title, delay: 1400 });
      }

      /* ---------- jokerler ---------- */
      function useJoker(k) {
        if (over || lvlDone) return;
        if (jokers[k] <= 0) { s.sfx('error'); s.toast('Bu jokerden kalmadı. Büyük patlatmalar yaparak kazanabilirsin.', 1600); return; }
        s.sfx('click');
        if (k === 'rot' || k === 'bomb') { jmode = jmode === k ? null : k; return; }
        jmode = null;
        if (k === 're') {
          jokers.re--; tray = null; refill(); hint = null;
          s.sfx('flip');
        } else if (k === 'undo') {
          if (!undoSnap) { s.toast('Geri alınacak hamle yok', 1100); return; }
          jokers.undo--; restore(undoSnap); undoSnap = null; hint = null; clearing.length = 0;
          s.sfx('rotate');
        } else if (k === 'hint') {
          const h = findHint();
          if (!h) { s.toast('Uygun hamle yok', 1000); return; }
          jokers.hint--; hint = Object.assign(h, { t: 0 });
        }
        stuck = false;
        checkStuck();
        save();
      }
      function findHint() {
        let best = null;
        tray.forEach((p, i) => {
          if (!p) return;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (!fits(p.cells, x, y)) continue;
            let sc = linesIf(p.cells, x, y) * 100;
            // komşu dolu hücre / kenar sayısı: sıkı yerleşim iyidir
            for (const [cx, cy] of p.cells) {
              [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
                const nx = x + cx + dx, ny = y + cy + dy;
                if (nx < 0 || ny < 0 || nx >= N || ny >= N || board[ny][nx]) sc += 3;
              });
            }
            sc += p.cells.length * 2;
            if (!best || sc > best.sc) best = { i, gx: x, gy: y, sc };
          }
        });
        return best;
      }
      function bombAt(cx, cy) {
        undoSnap = snapshot();
        jokers.bomb--; jmode = null; hint = null;
        let k = 0;
        for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
          if (x < 0 || y < 0 || x >= N || y >= N || !board[y][x]) continue;
          removeCell(x, y, -k * 0.02); k++;
        }
        score += k * 2;
        s.sfx('boom'); s.vibe(120);
        shake = 9;
        fx.burst(BX + cx * C + C / 2, BY + cy * C + C / 2, ['#ffd43b', '#ff922b', '#fff', '#ff6b6b'], 40, 300, 0.8, 5, 150);
        stuck = false;
        checkGoals();
        checkStuck();
        save();
      }
      function rotatePiece(i) {
        const p = tray[i];
        if (!p) return;
        p.cells = rotateCells(p.cells); // mücevher indeksi hücreyle birlikte döner
        jokers.rot--; jmode = null; hint = null;
        p.appear = 0.4;
        s.sfx('rotate');
        stuck = false;
        checkStuck();
        save();
      }

      /* ---------- yerleşim / dokunma ---------- */
      function slotCenter(i) { return { x: W / 6 + i * W / 3, y: TRAY_Y + TRAY_H / 2 }; }
      // tepside her parça kendi boyutuna göre ölçeklenir (uzun parçalar sığsın diye)
      function traySize(p) { const d = dims(p.cells); return Math.min(TC, (W / 3 - 14) / d.w, (TRAY_H - 20) / d.h); }
      function trayPos(p, i) {
        const d = dims(p.cells), c = slotCenter(i), sz = traySize(p);
        return { x: c.x - d.w * sz / 2, y: c.y - d.h * sz / 2, sz };
      }
      function liftPx() { return U.clamp(70 / (view.scale || 1), 46, 120); }
      function dragTarget() {
        const p = tray[drag.i], d = dims(p.cells);
        const ex = drag.fx + (drag.x - drag.fx) * SENS;
        const ey = drag.fy + (drag.y - drag.fy) * SENS;
        return { left: ex - d.w * C / 2, top: ey - liftPx() - d.h * C };
      }
      // Bırakılan konuma en yakın uygun yeri bul (mıknatıslı yerleştirme)
      function snap(p, left, top) {
        const fxg = (left - BX) / C, fyg = (top - BY) / C;
        let best = null;
        for (let gy = Math.floor(fyg) - 1; gy <= Math.ceil(fyg) + 1; gy++) {
          for (let gx = Math.floor(fxg) - 1; gx <= Math.ceil(fxg) + 1; gx++) {
            if (!fits(p.cells, gx, gy)) continue;
            const d = Math.hypot(gx - fxg, gy - fyg);
            if (d < 0.95 && (!best || d < best.d)) best = { gx, gy, d };
          }
        }
        return best;
      }
      function jokerRect(i) { const w = (W - 20) / 5; return { x: 10 + i * w, y: JY, w: w - 6, h: JH }; }
      function giveUpRect() { return { x: W / 2 - 70, y: BY + BW / 2 + 34, w: 140, h: 40 }; }
      const inR = (p, r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || over || drag || lvlDone) return;
        Platform.sound.unlock();
        const p = view.pt(e);
        if (stuck && inR(p, giveUpRect())) { gameOver('Pes ettin.'); return; }
        for (let i = 0; i < 5; i++) if (inR(p, jokerRect(i))) { useJoker(JOKERS[i].k); return; }
        if (jmode === 'bomb' && p.x >= BX && p.x < BX + BW && p.y >= BY && p.y < BY + BW) {
          bombAt(Math.floor((p.x - BX) / C), Math.floor((p.y - BY) / C));
          return;
        }
        if (p.y < TRAY_Y - 26) { if (jmode) { jmode = null; s.sfx('tick'); } return; }
        // en yakın bloğu seç (boş slota dokunulduysa komşuya bak)
        let pick = -1, bd = 1e9;
        for (let i = 0; i < 3; i++) {
          if (!tray[i]) continue;
          const c = slotCenter(i), d = Math.abs(p.x - c.x);
          if (d < bd && d < W / 3) { bd = d; pick = i; }
        }
        if (pick < 0) return;
        if (jmode === 'rot') { rotatePiece(pick); return; }
        const pc = tray[pick];
        const tp = trayPos(pc, pick);
        drag = { i: pick, id: e.pointerId, fx: p.x, fy: p.y, x: p.x, y: p.y, dl: tp.x, dt: tp.y, dsz: tp.sz };
        pc.ret = null;
        s.sfx('tick'); s.vibe(8);
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      });
      s.on(view.cv, 'pointermove', e => {
        if (!drag || drag.id !== e.pointerId) return;
        const p = view.pt(e);
        drag.x = p.x; drag.y = p.y;
      });
      function endDrag(e, cancel) {
        if (!drag || (e && drag.id !== e.pointerId)) return;
        const p = tray[drag.i];
        if (p && !cancel && s.active()) {
          const tg = dragTarget();
          const sp = snap(p, tg.left, tg.top);
          if (sp) { const i = drag.i; drag = null; place(i, sp.gx, sp.gy); return; }
          s.sfx('error');
        }
        if (p) p.ret = { x: drag.dl, y: drag.dt, sz: drag.dsz, t: 0 };
        drag = null;
      }
      s.on(view.cv, 'pointerup', e => endDrag(e));
      s.on(view.cv, 'pointercancel', e => endDrag(e, true));
      s.key(e => {
        const m = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 }[e.key];
        if (m != null) useJoker(JOKERS[m].k);
      });

      /* ---------- başlangıç ---------- */
      const saved = s.store.get(SAVE, null);
      if (s.restart) clearSave();
      if (!s.restart && saved && saved.snap) {
        try {
          restore(saved.snap);
          jokers = Object.assign({}, START_JOKERS, saved.jokers || {});
          if (!tray || tray.every(q => !q)) refill();
          s.timeout(() => s.toast('Kaldığın yerden devam ediyorsun', 1500), 100);
        } catch (er) { newGame(); }
      } else newGame();
      dispScore = score;
      s.score(score);
      checkStuck();

      /* ---------- çizim ---------- */
      function block(x, y, size, color, alpha, gem) {
        g.globalAlpha = alpha == null ? 1 : alpha;
        const r = size * 0.18;
        g.fillStyle = color;
        U.rr(g, x + 1.5, y + 1.5, size - 3, size - 3, r); g.fill();
        g.fillStyle = 'rgba(0,0,0,.22)';
        U.rr(g, x + 1.5, y + size * 0.62, size - 3, size * 0.38 - 1.5, r); g.fill();
        g.fillStyle = color;
        U.rr(g, x + 3, y + 3, size - 6, size * 0.72, r * 0.8); g.fill();
        g.fillStyle = 'rgba(255,255,255,.32)';
        U.rr(g, x + 5, y + 5, size - 10, size * 0.22, size * 0.1); g.fill();
        if (gem) drawGem(x + size / 2, y + size / 2 + 1, size * 0.3, gem);
        g.globalAlpha = 1;
      }
      function drawGem(cx, cy, r, type) {
        const col = GEMS[type];
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.beginPath(); g.moveTo(cx, cy - r + 2); g.lineTo(cx + r + 1, cy + 1); g.lineTo(cx, cy + r + 3); g.lineTo(cx - r - 1, cy + 1); g.closePath(); g.fill();
        g.fillStyle = col;
        g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.75)';
        g.beginPath(); g.moveTo(cx - r * 0.45, cy - r * 0.1); g.lineTo(cx, cy - r * 0.6); g.lineTo(cx + r * 0.1, cy - r * 0.3); g.closePath(); g.fill();
      }
      function drawPiece(p, x, y, sz, alpha, grey) {
        p.cells.forEach(([cx, cy], i) => block(x + cx * sz, y + cy * sz, sz, grey ? '#5c5470' : PAL[p.ci], alpha, p.gems && p.gems[i]));
      }

      s.loop(dt => {
        t += dt;
        fx.update(dt);
        if (tray) for (const p of tray) {
          if (!p) continue;
          if (p.appear < 1) p.appear = Math.min(1, p.appear + dt * 4.5);
          if (p.ret) { p.ret.t += dt / 0.18; if (p.ret.t >= 1) p.ret = null; }
        }
        for (const r of board) for (const v of r) if (v && v.pop) { v.pop -= dt * 5; if (v.pop <= 0) delete v.pop; }
        for (let i = clearing.length - 1; i >= 0; i--) {
          const c = clearing[i];
          c.t += dt;
          if (c.t > 0 && !c.fx) { c.fx = true; fx.burst(BX + c.x * C + C / 2, BY + c.y * C + C / 2, [PAL[c.ci], '#fff'], 6, 170, 0.6, 4, 320); }
          if (c.t > 0.32) clearing.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.2) floats.splice(i, 1); }
        for (let i = flying.length - 1; i >= 0; i--) { flying[i].t += dt * 1.6; if (flying[i].t >= 1) { flying.splice(i, 1); s.sfx('coin'); } }
        if (praise) { praise.t += dt; if (praise.t > 1.4) praise = null; }
        if (hint) { hint.t += dt; if (hint.t > 5) hint = null; }
        if (shake > 0) shake = Math.max(0, shake - dt * 30);
        if (drag) {
          // sürüklenen blok parmağı hızla takip eder
          const tg = dragTarget(), k = Math.min(1, dt * 28);
          drag.dl += (tg.left - drag.dl) * k; drag.dt += (tg.top - drag.dt) * k; drag.dsz += (C - drag.dsz) * Math.min(1, dt * 18);
        }
        if (MODE === 'time' && !over && !lvlDone) {
          timeLeft -= dt;
          if (timeLeft <= 0) { timeLeft = 0; gameOver('Süre doldu!', 'Süre Bitti'); }
        }
        if (Math.abs(dispScore - score) > 0.5) { dispScore += (score - dispScore) * Math.min(1, dt * 9); s.score(Math.round(dispScore)); }
        else if (dispScore !== score) { dispScore = score; s.score(score); }
      }, dt => {
        if (!s.active()) fx.update(dt || 0);
        if (over && grayT >= 0) grayT += dt || 0;
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, TH.bg[0]); bg.addColorStop(1, TH.bg[1]);
        g.fillStyle = bg; g.fillRect(0, 0, W, H);

        /* üst bilgi */
        if (MODE === 'adv' && goals) {
          U.text(g, 'SEVİYE ' + level, 14, 24, 17, TH.hud, 'left', 900);
          goals.forEach((gl, i) => {
            const x = goalX(i);
            g.fillStyle = 'rgba(0,0,0,.25)'; U.rr(g, x - 28, 8, 56, 32, 10); g.fill();
            drawGem(x - 12, 24, 9, gl.type);
            const left = Math.max(0, gl.n - gl.got);
            U.text(g, left ? String(left) : '✓', x + 10, 25, 16, left ? '#fff' : '#8ce99a', 'center', 900);
          });
        } else if (MODE === 'time') {
          const frac = U.clamp(timeLeft / TIME_START, 0, 1);
          const low = timeLeft < 15;
          g.fillStyle = 'rgba(0,0,0,.3)'; U.rr(g, 14, 16, W - 100, 16, 8); g.fill();
          g.fillStyle = low ? (Math.sin(t * 12) > 0 ? '#ff4d6d' : '#ff8787') : '#69db7c';
          U.rr(g, 14, 16, Math.max(16, (W - 100) * Math.min(1, frac)), 16, 8); g.fill();
          U.text(g, '⏱ ' + U.fmtTime(Math.ceil(timeLeft)), W - 14, 24, 16, low ? '#ff8787' : TH.hud, 'right', 900);
        } else {
          U.text(g, 'KLASİK ' + N + '×' + N, 14, 24, 14, TH.hud, 'left', 800);
        }
        if (combo > 1 && MODE !== 'time') {
          const x = MODE === 'adv' ? 118 : W - 14;
          U.text(g, '🔥 x' + combo, x, 24, 16, '#ffb84d', MODE === 'adv' ? 'left' : 'right', 900);
        } else if (combo > 1) U.text(g, '🔥 x' + combo, 14, 44, 11, '#ffb84d', 'left', 900);

        /* tahta */
        g.save();
        if (shake > 0) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        g.fillStyle = TH.board; U.rr(g, BX - 6, BY - 6, BW + 12, BW + 12, 14); g.fill();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          g.fillStyle = TH.cell;
          U.rr(g, BX + x * C + 1.5, BY + y * C + 1.5, C - 3, C - 3, C * 0.17); g.fill();
        }
        let ghost = null;
        const hl = { r: [], c: [] };
        if (drag && tray[drag.i]) {
          const p = tray[drag.i], tg = dragTarget();
          const sp = snap(p, tg.left, tg.top);
          if (sp) {
            ghost = { p, sp };
            const tmp = board.map(r => r.map(v => !!v));
            for (const [x, y] of p.cells) tmp[sp.gy + y][sp.gx + x] = true;
            for (let y = 0; y < N; y++) if (tmp[y].every(Boolean)) hl.r.push(y);
            for (let x = 0; x < N; x++) if (tmp.every(r => r[x])) hl.c.push(x);
          }
        }
        let cellIdx = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (!v) continue;
          cellIdx++;
          const isHl = hl.r.indexOf(y) >= 0 || hl.c.indexOf(x) >= 0;
          let col = isHl ? PAL[ghost.p.ci] : PAL[v.ci];
          if (over && grayT >= 0 && grayT * 60 > ((x + y * N) * 0.6)) col = '#4a4558';
          const sc = v.pop ? 1 + Math.sin(v.pop * Math.PI) * 0.12 : 1;
          const sz = C * sc, o = (C - sz) / 2;
          block(BX + x * C + o, BY + y * C + o, sz, col, 1, v.gem);
          if (isHl) { g.fillStyle = 'rgba(255,255,255,' + (0.18 + Math.sin(t * 10) * 0.08) + ')'; U.rr(g, BX + x * C + 2, BY + y * C + 2, C - 4, C - 4, 7); g.fill(); }
        }
        if (ghost) ghost.p.cells.forEach(([x, y], i) => block(BX + (ghost.sp.gx + x) * C, BY + (ghost.sp.gy + y) * C, C, PAL[ghost.p.ci], 0.38, ghost.p.gems && ghost.p.gems[i]));
        if (hint && tray[hint.i] && !drag) {
          const a = 0.25 + (Math.sin(t * 6) + 1) * 0.2;
          tray[hint.i].cells.forEach(([x, y]) => {
            block(BX + (hint.gx + x) * C, BY + (hint.gy + y) * C, C, PAL[tray[hint.i].ci], a);
            g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = 2;
            U.rr(g, BX + (hint.gx + x) * C + 2, BY + (hint.gy + y) * C + 2, C - 4, C - 4, 7); g.stroke();
          });
        }
        if (jmode === 'bomb') {
          g.strokeStyle = 'rgba(255,212,59,' + (0.5 + Math.sin(t * 8) * 0.3) + ')'; g.lineWidth = 3;
          U.rr(g, BX - 4, BY - 4, BW + 8, BW + 8, 12); g.stroke();
        }
        for (const c of clearing) {
          if (c.t < 0) { block(BX + c.x * C, BY + c.y * C, C, PAL[c.ci], 1, c.gem); continue; }
          const k = 1 - c.t / 0.32;
          const sz = C * (0.4 + k * 0.7);
          block(BX + c.x * C + (C - sz) / 2, BY + c.y * C + (C - sz) / 2, Math.max(1, sz), c.t < 0.06 ? '#ffffff' : PAL[c.ci], k);
        }
        g.restore();

        /* joker çubuğu */
        JOKERS.forEach((j, i) => {
          const r = jokerRect(i), n = jokers[j.k], on = jmode === j.k;
          g.fillStyle = on ? 'rgba(255,212,59,.35)' : 'rgba(255,255,255,.08)';
          U.rr(g, r.x, r.y, r.w, r.h, 12); g.fill();
          if (on) { g.strokeStyle = '#ffd43b'; g.lineWidth = 2; U.rr(g, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 11); g.stroke(); }
          g.globalAlpha = n > 0 ? 1 : 0.35;
          U.text(g, j.ic, r.x + r.w / 2 - 6, r.y + r.h / 2 + 1, 20, '#fff', 'center', 400);
          g.globalAlpha = 1;
          g.fillStyle = n > 0 ? '#ff4d6d' : '#555';
          g.beginPath(); g.arc(r.x + r.w - 11, r.y + 12, 9, 0, Math.PI * 2); g.fill();
          U.text(g, String(n), r.x + r.w - 11, r.y + 12.5, 11, '#fff', 'center', 900);
        });

        /* tepsi */
        g.fillStyle = 'rgba(255,255,255,.05)'; U.rr(g, 8, TRAY_Y, W - 16, TRAY_H, 18); g.fill();
        if (jmode === 'rot') { g.strokeStyle = 'rgba(255,212,59,' + (0.5 + Math.sin(t * 8) * 0.3) + ')'; g.lineWidth = 3; U.rr(g, 9, TRAY_Y + 1, W - 18, TRAY_H - 2, 17); g.stroke(); }
        for (let i = 0; i < 3; i++) {
          const p = tray[i];
          if (!p || (drag && drag.i === i)) continue;
          const tp = trayPos(p, i), d = dims(p.cells);
          if (!tp) continue;
          const ok = fitsAnywhere(p.cells);
          if (p.ret) {
            const k = U.easeOut(Math.min(1, p.ret.t));
            const sz = U.lerp(p.ret.sz, tp.sz, k);
            drawPiece(p, U.lerp(p.ret.x, tp.x, k), U.lerp(p.ret.y, tp.y, k), sz, 1, !ok);
            continue;
          }
          const sc = U.easeOutBack(p.appear);
          const sz = tp.sz * sc;
          const c = slotCenter(i);
          let ox = c.x - d.w * sz / 2, oy = c.y - d.h * sz / 2;
          if (hint && hint.i === i) oy += Math.sin(t * 8) * 3;
          drawPiece(p, ox, oy, sz, ok ? 1 : 0.6, !ok);
        }
        if (drag && tray[drag.i]) drawPiece(tray[drag.i], drag.dl, drag.dt, drag.dsz, 0.96);

        /* efektler */
        fx.draw(g);
        for (const f of flying) {
          const k = U.easeOut(U.clamp(f.t, 0, 1));
          const x = U.lerp(f.x, f.tx - 12, k), y = U.lerp(f.y, f.ty, k) - Math.sin(k * Math.PI) * 50;
          drawGem(x, y, 9 + Math.sin(k * Math.PI) * 4, f.type);
        }
        for (const f of floats) {
          g.globalAlpha = Math.max(0, 1 - f.t / 1.2);
          U.text(g, f.txt, U.clamp(f.x, 60, W - 60), f.y - f.t * 45, f.big ? 22 : 16, f.col || '#fff3bf', 'center', 900);
          g.globalAlpha = 1;
        }
        if (praise) {
          const k = praise.t;
          const sc = k < 0.25 ? U.easeOutBack(k / 0.25) : 1;
          g.globalAlpha = k > 1.0 ? Math.max(0, 1 - (k - 1.0) / 0.4) : 1;
          g.save();
          g.translate(W / 2, BY + BW * 0.42);
          g.scale(sc, sc);
          g.font = U.font(praise.txt.length > 10 ? 30 : 38, 900);
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.45)'; g.strokeText(praise.txt, 0, 0);
          if (praise.rainbow) {
            const gr = g.createLinearGradient(-120, 0, 120, 0);
            ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2'].forEach((c, i) => gr.addColorStop(i / 4, c));
            g.fillStyle = gr;
          } else g.fillStyle = '#fff3bf';
          g.fillText(praise.txt, 0, 0);
          if (praise.sub) { g.font = U.font(17, 900); g.lineWidth = 5; g.strokeText(praise.sub, 0, 34); g.fillStyle = '#ffb84d'; g.fillText(praise.sub, 0, 34); }
          g.restore();
          g.globalAlpha = 1;
        }
        if (jmode) {
          const j = JOKERS.find(q => q.k === jmode);
          g.fillStyle = 'rgba(0,0,0,.6)'; U.rr(g, 30, JY - 40, W - 60, 30, 15); g.fill();
          U.text(g, j.tip, W / 2, JY - 25, 13, '#ffd43b', 'center', 800);
        }
        if (stuck && !over) {
          g.fillStyle = 'rgba(10,6,20,.78)'; U.rr(g, 30, BY + BW / 2 - 60, W - 60, 140, 20); g.fill();
          U.text(g, 'Yer kalmadı!', W / 2, BY + BW / 2 - 30, 22, '#fff', 'center', 900);
          U.text(g, 'Bir joker kullanarak devam edebilirsin', W / 2, BY + BW / 2 + 2, 13, '#cfc6ff', 'center', 700);
          const r = giveUpRect();
          g.fillStyle = '#ff4d6d'; U.rr(g, r.x, r.y, r.w, r.h, 12); g.fill();
          U.text(g, 'Oyunu Bitir', W / 2, r.y + r.h / 2, 15, '#fff', 'center', 900);
        }
      });

      // test için iç durum
      Platform._bp = { get: () => ({ board, tray, score, combo, jokers, level, goals, stuck, over, timeLeft, N, C, BX, BY, TRAY_Y, TRAY_H, H }), place: (i, x, y) => place(i, x, y), fits: (c, x, y) => fits(c, x, y), useJoker, setBoard: b => { board = b; } };
      return {};
    }
  });
})();
