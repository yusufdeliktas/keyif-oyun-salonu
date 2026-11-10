/* Blok Yağmuru - düşen blok bulmacası */
(function () {
  const U = Platform.util;
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
  };
  const COLORS = { I: '#ff6b9d', J: '#4dabf7', L: '#ffa94d', O: '#ffd43b', S: '#69db7c', T: '#b197fc', Z: '#ff8787' };
  const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1], [0, -2]];

  function rotate(m, dir) {
    const n = m.length, r = [];
    for (let i = 0; i < n; i++) {
      r.push([]);
      for (let j = 0; j < n; j++) r[i][j] = dir > 0 ? m[n - 1 - j][i] : m[j][n - 1 - i];
    }
    return r;
  }

  Platform.register({
    id: 'blocks', name: 'Blok Yağmuru', gen: 'retro', genre: 'Bulmaca',
    colors: ['#a855f7', '#4c1d95'],
    desc: 'Düşen blokları döndür, yerleştir ve satırları temizle.',
    help: '<ul><li><b>← →</b> hareket, <b>↑ / X</b> döndür, <b>Z</b> ters döndür, <b>↓</b> hızlı indir, <b>Boşluk</b> anında bırak, <b>C</b> sakla.</li><li>Dokunmatik: ekrana <b>dokun</b> = döndür, <b>sağa-sola sürükle</b> = kaydır, <b>aşağı sürükle</b> = indir, <b>hızlıca aşağı fırlat</b> = bırak.</li><li>Aynı anda 4 satır silmek en çok puanı verir. Her 10 satırda seviye ve hız artar.</li></ul>',
    options: [{ key: 'start', label: 'BAŞLANGIÇ SEVİYESİ', choices: [['1', '1'], ['5', '5'], ['10', '10']], def: '1' }],
    icon: '<rect x="10" y="38" width="12" height="12" rx="2" fill="#ffd43b"/><rect x="22" y="38" width="12" height="12" rx="2" fill="#ffd43b"/><rect x="34" y="38" width="12" height="12" rx="2" fill="#69db7c"/><rect x="46" y="38" width="12" height="12" rx="2" fill="#69db7c"/><rect x="22" y="26" width="12" height="12" rx="2" fill="#ffd43b"/><rect x="34" y="26" width="12" height="12" rx="2" fill="#69db7c"/><rect x="18" y="2" width="12" height="12" rx="2" fill="#ff6b9d"/><rect x="30" y="2" width="12" height="12" rx="2" fill="#ff6b9d"/><rect x="42" y="2" width="12" height="12" rx="2" fill="#ff6b9d"/><rect x="30" y="14" width="12" height="12" rx="2" fill="#ff6b9d"/>',
    create(s, o) {
      const COLS = 10, ROWS = 20, C = 26, BX = 8, BY = 8;
      const W = 362, H = BY * 2 + ROWS * C;
      const view = s.canvas(W, H);
      const g = view.g;
      const fx = new U.Particles();
      let board = [], bag = [], next = [], cur = null, hold = null, canHold = true;
      let score = 0, lines = 0, level = +o.start, startLevel = +o.start;
      let fall = 0, lockT = 0, lockMoves = 0, clearing = null, state = 'play', deadT = 0, softHeld = false;
      const held = { L: false, R: false }; let dasT = 0, dasDir = 0, arrT = 0;

      for (let y = 0; y < ROWS; y++) board.push(new Array(COLS).fill(null));

      function fromBag() {
        if (!bag.length) bag = U.shuffle(Object.keys(SHAPES).slice());
        return bag.pop();
      }
      for (let i = 0; i < 3; i++) next.push(fromBag());

      function makePiece(t) {
        const m = SHAPES[t].map(r => r.slice());
        let top = 0;
        while (top < m.length && m[top].every(v => !v)) top++;
        return { t, m, x: Math.floor((COLS - m.length) / 2), y: -top };
      }
      function collide(m, x, y) {
        for (let i = 0; i < m.length; i++) for (let j = 0; j < m.length; j++) {
          if (!m[i][j]) continue;
          const bx = x + j, by = y + i;
          if (bx < 0 || bx >= COLS || by >= ROWS) return true;
          if (by >= 0 && board[by][bx]) return true;
        }
        return false;
      }
      function gravity() { return Math.pow(0.8 - (level - 1) * 0.007, level - 1); }
      function spawn(t) {
        cur = makePiece(t || next.shift());
        if (!t) next.push(fromBag());
        canHold = t ? canHold : true;
        fall = 0; lockT = 0; lockMoves = 0;
        if (collide(cur.m, cur.x, cur.y)) gameOver();
      }
      function gameOver() {
        state = 'dead'; deadT = 0;
        s.sfx('lose'); s.vibe(250);
      }
      function touchingGround() { return collide(cur.m, cur.x, cur.y + 1); }
      function resetLock() { if (touchingGround() && lockMoves < 15) { lockT = 0; lockMoves++; } }
      function move(dx) {
        if (!cur || clearing || state !== 'play') return false;
        if (!collide(cur.m, cur.x + dx, cur.y)) { cur.x += dx; s.sfx('move'); resetLock(); return true; }
        return false;
      }
      function rot(dir) {
        if (!cur || clearing || state !== 'play' || cur.t === 'O') return;
        const m = rotate(cur.m, dir);
        for (const [kx, ky] of KICKS) {
          if (!collide(m, cur.x + kx, cur.y + ky)) {
            cur.m = m; cur.x += kx; cur.y += ky;
            s.sfx('rotate'); resetLock();
            return;
          }
        }
      }
      function softDrop() {
        if (!cur || clearing || state !== 'play') return;
        if (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 1; s.score(score); fall = 0; }
      }
      function ghostY() {
        let y = cur.y;
        while (!collide(cur.m, cur.x, y + 1)) y++;
        return y;
      }
      function hardDrop() {
        if (!cur || clearing || state !== 'play') return;
        const gy = ghostY();
        score += (gy - cur.y) * 2;
        cur.y = gy;
        s.sfx('drop'); s.vibe(20);
        lock();
      }
      function doHold() {
        if (!cur || clearing || state !== 'play' || !canHold) return;
        const t = cur.t;
        if (hold) { const h = hold; hold = t; spawn(h); }
        else { hold = t; spawn(); }
        canHold = false;
        s.sfx('click');
      }
      function lock() {
        let above = true;
        for (let i = 0; i < cur.m.length; i++) for (let j = 0; j < cur.m.length; j++) {
          if (!cur.m[i][j]) continue;
          const by = cur.y + i, bx = cur.x + j;
          if (by >= 0) { board[by][bx] = cur.t; above = false; }
        }
        if (above) { cur = null; gameOver(); return; }
        cur = null;
        const full = [];
        for (let y = 0; y < ROWS; y++) if (board[y].every(v => v)) full.push(y);
        if (full.length) {
          clearing = { rows: full, t: 0 };
          s.sfx('line'); s.vibe(full.length >= 4 ? 120 : 40);
          for (const y of full) for (let x = 0; x < COLS; x++) {
            fx.burst(BX + x * C + C / 2, BY + y * C + C / 2, COLORS[board[y][x]], 3, 140, 0.5, 4, 300);
          }
        } else {
          s.sfx('place');
          s.score(score);
          spawn();
        }
      }
      function finishClear() {
        const n = clearing.rows.length;
        for (const y of clearing.rows) { board.splice(y, 1); board.unshift(new Array(COLS).fill(null)); }
        score += [0, 100, 300, 500, 800][n] * level;
        lines += n;
        const nl = Math.max(startLevel, startLevel + Math.floor(lines / 10));
        if (nl > level) { level = nl; s.toast('Seviye ' + level + '!', 1200); s.sfx('power'); }
        if (n === 4) s.toast('DÖRTLÜ! +' + 800 * level, 1200);
        s.score(score);
        clearing = null;
        spawn();
      }

      // klavye
      s.key(e => {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (!e.repeat) { move(-1); held.L = true; dasDir = -1; dasT = 0; arrT = 0; } }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (!e.repeat) { move(1); held.R = true; dasDir = 1; dasT = 0; arrT = 0; } }
        else if (k === 'ArrowDown' || k === 's' || k === 'S') softHeld = true;
        else if (!e.repeat && (k === 'ArrowUp' || k === 'x' || k === 'X' || k === 'w' || k === 'W')) rot(1);
        else if (!e.repeat && (k === 'z' || k === 'Z')) rot(-1);
        else if (!e.repeat && k === ' ') hardDrop();
        else if (!e.repeat && (k === 'c' || k === 'C' || k === 'Shift')) doHold();
      });
      s.keyup(e => {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { held.L = false; if (dasDir === -1) dasDir = held.R ? 1 : 0; }
        if (k === 'ArrowRight' || k === 'd' || k === 'D') { held.R = false; if (dasDir === 1) dasDir = held.L ? -1 : 0; }
        if (k === 'ArrowDown' || k === 's' || k === 'S') softHeld = false;
      });

      // dokunmatik jestler (tuval üzerinde)
      let gp = null;
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active()) return;
        const p = view.pt(e);
        gp = { id: e.pointerId, sx: p.x, sy: p.y, lx: p.x, ly: p.y, ax: 0, ay: 0, t: performance.now(), moved: false };
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      });
      s.on(view.cv, 'pointermove', e => {
        if (!gp || e.pointerId !== gp.id || !s.active()) return;
        const p = view.pt(e);
        gp.ax += p.x - gp.lx; gp.ay += p.y - gp.ly;
        gp.lx = p.x; gp.ly = p.y;
        if (Math.abs(p.x - gp.sx) > 10 || Math.abs(p.y - gp.sy) > 10) gp.moved = true;
        while (gp.ax > C * 0.85) { move(1); gp.ax -= C * 0.85; }
        while (gp.ax < -C * 0.85) { move(-1); gp.ax += C * 0.85; }
        while (gp.ay > C * 0.9) { softDrop(); gp.ay -= C * 0.9; }
        if (gp.ay < 0) gp.ay = 0;
      });
      s.on(view.cv, 'pointerup', e => {
        if (!gp || e.pointerId !== gp.id) return;
        const p = view.pt(e);
        const dt = performance.now() - gp.t;
        const dy = p.y - gp.sy, dx = p.x - gp.sx;
        if (s.active()) {
          if (!gp.moved && dt < 350) rot(1);
          else if (dy > 70 && dy > Math.abs(dx) * 2 && dy / dt > 0.9) hardDrop();
          else if (dy < -60 && Math.abs(dy) > Math.abs(dx) * 2) doHold();
        }
        gp = null;
      });
      s.on(view.cv, 'pointercancel', () => { gp = null; });

      // tuşlar
      const c1 = s.controls('tight');
      s.button(c1, 'SAKLA', doHold, 'ghost');
      s.button(c1, '◀', () => move(-1), '', { repeat: true, rate: 60, delay: 170 });
      s.button(c1, '⟳', () => rot(1), 'on');
      s.button(c1, '▶', () => move(1), '', { repeat: true, rate: 60, delay: 170 });
      s.button(c1, '▼', softDrop, '', { repeat: true, rate: 40, delay: 120 });
      s.button(c1, '⤓', hardDrop, 'primary');

      spawn();

      function drawCell(x, y, t, size, alpha) {
        const col = COLORS[t];
        g.globalAlpha = alpha == null ? 1 : alpha;
        g.fillStyle = col;
        U.rr(g, x + 1, y + 1, size - 2, size - 2, size * 0.18); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)';
        U.rr(g, x + 3, y + 3, size - 6, size * 0.3, size * 0.12); g.fill();
        g.fillStyle = 'rgba(0,0,0,.18)';
        g.fillRect(x + 3, y + size - size * 0.22, size - 6, size * 0.12);
        g.globalAlpha = 1;
      }
      function drawMini(t, cx, cy, size) {
        if (!t) return;
        const m = SHAPES[t];
        let minx = 9, maxx = -1, miny = 9, maxy = -1;
        m.forEach((r, i) => r.forEach((v, j) => { if (v) { minx = Math.min(minx, j); maxx = Math.max(maxx, j); miny = Math.min(miny, i); maxy = Math.max(maxy, i); } }));
        const w = (maxx - minx + 1) * size, h = (maxy - miny + 1) * size;
        m.forEach((r, i) => r.forEach((v, j) => { if (v) drawCell(cx - w / 2 + (j - minx) * size, cy - h / 2 + (i - miny) * size, t, size); }));
      }

      s.loop(dt => {
        fx.update(dt);
        if (state === 'dead') {
          deadT += dt;
          if (deadT > 1) { state = 'over'; s.over({ score, msg: 'Seviye ' + level + ' · ' + lines + ' satır' }); }
          return;
        }
        if (clearing) { clearing.t += dt; if (clearing.t > 0.28) finishClear(); return; }
        if (!cur) return;
        // DAS (basılı tutunca kayma)
        if (dasDir !== 0) {
          dasT += dt;
          if (dasT > 0.16) { arrT += dt; while (arrT > 0.045) { arrT -= 0.045; move(dasDir); } }
        }
        const gv = softHeld ? Math.min(gravity(), 0.04) : gravity();
        if (touchingGround()) {
          lockT += dt;
          if (lockT >= 0.5) lock();
        } else {
          fall += dt;
          while (fall >= gv && cur) {
            fall -= gv;
            if (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; if (softHeld) { score++; s.score(score); } }
            else break;
          }
        }
      }, () => {
        g.fillStyle = '#120b26'; g.fillRect(0, 0, W, H);
        // tahta
        g.fillStyle = '#0b0718';
        U.rr(g, BX - 3, BY - 3, COLS * C + 6, ROWS * C + 6, 10); g.fill();
        g.strokeStyle = 'rgba(177,151,252,.08)'; g.lineWidth = 1;
        for (let x = 1; x < COLS; x++) { g.beginPath(); g.moveTo(BX + x * C, BY); g.lineTo(BX + x * C, BY + ROWS * C); g.stroke(); }
        for (let y = 1; y < ROWS; y++) { g.beginPath(); g.moveTo(BX, BY + y * C); g.lineTo(BX + COLS * C, BY + y * C); g.stroke(); }
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const t = board[y][x];
          if (!t) continue;
          if (clearing && clearing.rows.indexOf(y) >= 0) {
            const k = clearing.t / 0.28;
            g.globalAlpha = 1 - k;
            g.fillStyle = '#fff';
            g.fillRect(BX + x * C, BY + y * C, C, C);
            g.globalAlpha = 1;
          } else drawCell(BX + x * C, BY + y * C, t, C, state === 'dead' || state === 'over' ? 0.45 : 1);
        }
        if (cur && state === 'play') {
          const gy = ghostY();
          for (let i = 0; i < cur.m.length; i++) for (let j = 0; j < cur.m.length; j++) {
            if (!cur.m[i][j]) continue;
            const x = BX + (cur.x + j) * C, yy = gy + i;
            if (yy >= 0) {
              g.strokeStyle = U.hexA(COLORS[cur.t], 0.55); g.lineWidth = 2;
              U.rr(g, x + 2, BY + yy * C + 2, C - 4, C - 4, 5); g.stroke();
            }
          }
          for (let i = 0; i < cur.m.length; i++) for (let j = 0; j < cur.m.length; j++) {
            if (!cur.m[i][j] || cur.y + i < 0) continue;
            drawCell(BX + (cur.x + j) * C, BY + (cur.y + i) * C, cur.t, C);
          }
        }
        fx.draw(g);
        // yan panel
        const px = BX + COLS * C + 10, pw = W - px - 4;
        const box = (y, h, title) => {
          g.fillStyle = 'rgba(255,255,255,.05)';
          U.rr(g, px, y, pw, h, 10); g.fill();
          U.text(g, title, px + pw / 2, y + 12, 9.5, '#b9a6ff', 'center', 800);
        };
        box(BY, 66, 'SAKLA');
        g.globalAlpha = canHold ? 1 : 0.35;
        drawMini(hold, px + pw / 2, BY + 40, 12);
        g.globalAlpha = 1;
        box(BY + 74, 170, 'SIRADAKİ');
        next.forEach((t, i) => drawMini(t, px + pw / 2, BY + 116 + i * 48, i === 0 ? 13 : 11));
        box(BY + 252, 52, 'SEVİYE');
        U.text(g, String(level), px + pw / 2, BY + 284, 22, '#fff');
        box(BY + 312, 52, 'SATIR');
        U.text(g, String(lines), px + pw / 2, BY + 344, 22, '#fff');
        // seviye ilerleme çubuğu
        const pr = (lines % 10) / 10;
        g.fillStyle = 'rgba(255,255,255,.08)'; U.rr(g, px + 6, BY + 374, pw - 12, 8, 4); g.fill();
        g.fillStyle = '#b197fc'; U.rr(g, px + 6, BY + 374, (pw - 12) * pr, 8, 4); g.fill();
        if (state === 'dead' || state === 'over') {
          g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(BX, BY + ROWS * C / 2 - 30, COLS * C, 60);
          U.text(g, 'OYUN BİTTİ', BX + COLS * C / 2, BY + ROWS * C / 2, 26, '#ff8787');
        }
      });
      return {};
    }
  });
})();
