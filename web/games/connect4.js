/* Dört Taş - dörtlü bağla */
(function () {
  const U = Platform.util;
  const COLS = 7, ROWS = 6, ORDER = [3, 2, 4, 1, 5, 0, 6];

  function lines(grid, c, r, p) {
    // (c,r) üzerinden geçen 4'lü çizgi varsa hücreleri döndürür
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const cells = [[c, r]];
      for (const sg of [1, -1]) {
        let x = c + dc * sg, y = r + dr * sg;
        while (x >= 0 && x < COLS && y >= 0 && y < ROWS && grid[x][y] === p) { cells.push([x, y]); x += dc * sg; y += dr * sg; }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  }
  function evalPos(grid, me) {
    const op = 3 - me;
    let s = 0;
    for (let r = 0; r < ROWS; r++) if (grid[3][r] === me) s += 6; else if (grid[3][r] === op) s -= 6;
    const win = (a, b, c, d) => {
      let m = 0, o = 0;
      for (const v of [a, b, c, d]) { if (v === me) m++; else if (v === op) o++; }
      if (m && o) return 0;
      if (m === 3) return 40; if (m === 2) return 8;
      if (o === 3) return -60; if (o === 2) return -8;
      return 0;
    };
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      if (c + 3 < COLS) s += win(grid[c][r], grid[c + 1][r], grid[c + 2][r], grid[c + 3][r]);
      if (r + 3 < ROWS) s += win(grid[c][r], grid[c][r + 1], grid[c][r + 2], grid[c][r + 3]);
      if (c + 3 < COLS && r + 3 < ROWS) s += win(grid[c][r], grid[c + 1][r + 1], grid[c + 2][r + 2], grid[c + 3][r + 3]);
      if (c + 3 < COLS && r - 3 >= 0) s += win(grid[c][r], grid[c + 1][r - 1], grid[c + 2][r - 2], grid[c + 3][r - 3]);
    }
    return s;
  }
  function height(grid, c) { let r = 0; while (r < ROWS && grid[c][r]) r++; return r; }
  function bestMove(grid, me, depth) {
    const WIN = 1e6;
    const g2 = grid.map(col => col.slice());
    function nm(p, d, a, b, ply) {
      let any = false, best = -Infinity;
      for (const c of ORDER) {
        const r = height(g2, c);
        if (r >= ROWS) continue;
        any = true;
        g2[c][r] = p;
        let sc;
        if (lines(g2, c, r, p)) sc = WIN - ply;
        else if (d <= 1) sc = evalPos(g2, p);
        else sc = -nm(3 - p, d - 1, -b, -a, ply + 1);
        g2[c][r] = 0;
        if (sc > best) best = sc;
        if (sc > a) a = sc;
        if (a >= b) break;
      }
      return any ? best : 0;
    }
    let bestC = -1, bestS = -Infinity;
    const scores = [];
    for (const c of ORDER) {
      const r = height(g2, c);
      if (r >= ROWS) continue;
      g2[c][r] = me;
      let sc;
      if (lines(g2, c, r, me)) sc = WIN;
      else sc = depth <= 1 ? evalPos(g2, me) : -nm(3 - me, depth - 1, -Infinity, Infinity, 1);
      g2[c][r] = 0;
      scores.push([c, sc]);
      if (sc > bestS) { bestS = sc; bestC = c; }
    }
    return { col: bestC, scores };
  }

  Platform.register({
    id: 'connect4', name: 'Dört Taş', gen: 'retro', genre: 'Strateji',
    colors: ['#2563eb', '#1e1b4b'], bestMode: 'wins',
    desc: 'Taşları sütunlara bırak; yatay, dikey ya da çapraz 4\'lü yapan kazanır.',
    help: '<ul><li>Taşını bırakmak istediğin <b>sütuna dokun</b> (klavyede <b>1-7</b>).</li><li>Taş, o sütundaki en alttaki boş yere düşer.</li><li>Yatay, dikey veya çapraz <b>4 taşı yan yana</b> getiren ilk oyuncu kazanır.</li><li>Rakibinin üçlü yaptığı yeri kapatmayı unutma!</li></ul>',
    options: [
      { key: 'mode', label: 'RAKİP', choices: [['easy', 'Kolay'], ['mid', 'Orta'], ['hard', 'Zor'], ['pvp', '2 Oyuncu']], def: 'mid' },
      { key: 'first', label: 'İLK HAMLE', choices: [['me', 'Ben'], ['ai', 'Rakip']], def: 'me' }
    ],
    bestKey: o => o.mode,
    icon: '<rect x="4" y="12" width="56" height="46" rx="8" fill="#2563eb"/><circle cx="14" cy="22" r="5" fill="#1e1b4b"/><circle cx="26" cy="22" r="5" fill="#1e1b4b"/><circle cx="38" cy="22" r="5" fill="#1e1b4b"/><circle cx="50" cy="22" r="5" fill="#1e1b4b"/><circle cx="14" cy="35" r="5" fill="#1e1b4b"/><circle cx="26" cy="35" r="5" fill="#facc15"/><circle cx="38" cy="35" r="5" fill="#ef4444"/><circle cx="50" cy="35" r="5" fill="#1e1b4b"/><circle cx="14" cy="48" r="5" fill="#ef4444"/><circle cx="26" cy="48" r="5" fill="#ef4444"/><circle cx="38" cy="48" r="5" fill="#facc15"/><circle cx="50" cy="48" r="5" fill="#ef4444"/><circle cx="32" cy="6" r="5" fill="#ef4444"/>',
    create(s, o) {
      const W = 360, H = 420, CS = 48, BX = (W - COLS * CS) / 2, BY = 96;
      const view = s.canvas(W, H);
      const g = view.g;
      const pvp = o.mode === 'pvp';
      const depth = { easy: 2, mid: 4, hard: 7 }[o.mode] || 4;
      const grid = Array.from({ length: COLS }, () => new Array(ROWS).fill(0));
      const HUMAN = 1, CPU = 2;
      let turn = !pvp && o.first === 'ai' ? CPU : HUMAN, drop = null, winCells = null, over = false, hover = 3, thinking = false, moves = 0, t = 0;
      const fx = new U.Particles();
      const COL = { 1: ['#f87171', '#dc2626'], 2: ['#fde047', '#eab308'] };

      const ctrl = s.controls();
      const info = document.createElement('div'); info.className = 'pill'; ctrl.appendChild(info);
      function upd() {
        if (over) return;
        if (pvp) info.textContent = 'Sıra: ' + (turn === 1 ? '🔴 Kırmızı' : '🟡 Sarı');
        else info.textContent = turn === HUMAN ? '🔴 Sıra sende' : '🟡 Bilgisayar düşünüyor…';
      }
      const cellY = r => BY + (ROWS - 1 - r) * CS + CS / 2;
      const cellX = c => BX + c * CS + CS / 2;

      function play(c) {
        if (over || drop) return false;
        const r = height(grid, c);
        if (r >= ROWS) { s.sfx('error'); return false; }
        drop = { c, r, p: turn, y: BY - CS / 2, vy: 0, bounced: 0 };
        s.sfx('move');
        return true;
      }
      function landed() {
        const { c, r, p } = drop;
        grid[c][r] = p;
        drop = null;
        moves++;
        s.sfx('place'); s.vibe(15);
        const w = lines(grid, c, r, p);
        if (w) {
          over = true; winCells = w;
          for (const [x, y] of w) fx.burst(cellX(x), cellY(y), COL[p], 12, 150, 0.7, 4);
          if (pvp) { info.textContent = (p === 1 ? 'Kırmızı' : 'Sarı') + ' kazandı!'; s.over({ win: false, count: false, emoji: p === 1 ? '🔴' : '🟡', title: (p === 1 ? 'Kırmızı' : 'Sarı') + ' kazandı!', msg: moves + ' hamlede bitti.', delay: 1300 }); s.sfx('win'); }
          else if (p === HUMAN) { info.textContent = 'Kazandın!'; s.over({ win: true, title: 'Kazandın!', msg: moves + ' hamlede dörtlü yaptın.', delay: 1300 }); }
          else { info.textContent = 'Bilgisayar kazandı'; s.over({ win: false, emoji: '😔', title: 'Kaybettin', msg: 'Bilgisayar dörtlü yaptı.', delay: 1300 }); s.sfx('lose'); }
          return;
        }
        if (moves >= COLS * ROWS) {
          over = true; info.textContent = 'Berabere';
          s.over({ win: false, count: false, emoji: '🤝', title: 'Berabere', msg: 'Tahta doldu.', delay: 900 });
          return;
        }
        turn = 3 - turn;
        upd();
        if (!pvp && turn === CPU) aiTurn();
      }
      function aiTurn() {
        thinking = true; upd();
        const go = () => {
          if (!s.alive || over) return;
          if (!s.active()) { s.timeout(go, 250); return; }
          let c;
          const res = bestMove(grid, CPU, depth);
          c = res.col;
          if (o.mode === 'easy' && Math.random() < 0.35) {
            const winNow = res.scores.find(x => x[1] >= 1e6 - 10);
            if (!winNow) c = U.pick(res.scores.map(x => x[0]));
          }
          thinking = false;
          hover = c;
          play(c);
        };
        s.timeout(go, 420);
      }
      function colAt(px) { const c = Math.floor((px - BX) / CS); return c >= 0 && c < COLS ? c : -1; }
      s.on(view.cv, 'pointermove', e => { const c = colAt(view.pt(e).x); if (c >= 0) hover = c; });
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || over || drop || thinking || (!pvp && turn !== HUMAN)) return;
        const c = colAt(view.pt(e).x);
        if (c < 0) return;
        hover = c;
        play(c);
      });
      s.key(e => {
        if (over || drop || thinking || (!pvp && turn !== HUMAN)) return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 7) { hover = n - 1; play(n - 1); }
        else if (e.key === 'ArrowLeft') hover = Math.max(0, hover - 1);
        else if (e.key === 'ArrowRight') hover = Math.min(COLS - 1, hover + 1);
        else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') play(hover);
      });

      upd();
      if (!pvp && turn === CPU) aiTurn();

      function disc(x, y, p, r) {
        const [a, b] = COL[p];
        const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        gr.addColorStop(0, a); gr.addColorStop(1, b);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.68, 0, Math.PI * 2); g.stroke();
      }
      s.loop(dt => {
        t += dt;
        fx.update(dt);
        if (drop) {
          const ty = cellY(drop.r);
          drop.vy += 2600 * dt;
          drop.y += drop.vy * dt;
          if (drop.y >= ty) {
            drop.y = ty;
            if (drop.bounced < 1 && drop.vy > 500) { drop.vy = -drop.vy * 0.25; drop.bounced++; }
            else landed();
          }
        }
      }, dt => {
        if (!s.active()) fx.update(dt || 0);
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#111633'); bg.addColorStop(1, '#0a0d22');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        // önizleme taşı
        if (!over && !drop && (pvp || turn === HUMAN) && !thinking) {
          g.globalAlpha = 0.85;
          disc(cellX(hover), BY - CS / 2 - 6, turn, CS * 0.4);
          g.globalAlpha = 1;
          U.text(g, '▼', cellX(hover), BY - 6, 10, 'rgba(255,255,255,.5)');
        }
        // düşen taş (tahtanın arkasında)
        if (drop) disc(cellX(drop.c), drop.y, drop.p, CS * 0.4);
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (grid[c][r]) disc(cellX(c), cellY(r), grid[c][r], CS * 0.4);
        // tahta (delikli)
        g.save();
        g.beginPath();
        U.rr(g, BX - 8, BY - 8, COLS * CS + 16, ROWS * CS + 16, 16);
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
          g.moveTo(cellX(c) + CS * 0.42, cellY(r));
          g.arc(cellX(c), cellY(r), CS * 0.42, 0, Math.PI * 2, true);
        }
        const bgr = g.createLinearGradient(0, BY, 0, BY + ROWS * CS);
        bgr.addColorStop(0, '#3b6cf6'); bgr.addColorStop(1, '#1d4ed8');
        g.fillStyle = bgr;
        g.fill('evenodd');
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 2;
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { g.beginPath(); g.arc(cellX(c), cellY(r), CS * 0.42, 0, Math.PI * 2); g.stroke(); }
        if (winCells) {
          const pulse = 0.6 + Math.sin(performance.now() / 120) * 0.4;
          g.strokeStyle = 'rgba(255,255,255,' + pulse + ')'; g.lineWidth = 4;
          for (const [x, y] of winCells) { g.beginPath(); g.arc(cellX(x), cellY(y), CS * 0.36, 0, Math.PI * 2); g.stroke(); }
        }
        // ayaklar
        g.fillStyle = '#1e3a8a';
        g.fillRect(BX - 14, BY + ROWS * CS + 8, 18, 26); g.fillRect(BX + COLS * CS - 4, BY + ROWS * CS + 8, 18, 26);
        fx.draw(g);
        // başlık
        const lbl = pvp ? ['🔴 Kırmızı', '🟡 Sarı'] : ['🔴 Sen', '🟡 Bilgisayar'];
        U.text(g, lbl[0], 16, 22, 14, turn === 1 && !over ? '#fca5a5' : '#94a3b8', 'left');
        U.text(g, lbl[1], W - 16, 22, 14, turn === 2 && !over ? '#fde68a' : '#94a3b8', 'right');
      });
      return {};
    }
  });
  Platform._c4 = { bestMove };
})();
