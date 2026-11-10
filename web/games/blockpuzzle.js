/* Blok Yerleştir - 8x8 blok bulmacası */
(function () {
  const U = Platform.util;
  const S = (str) => {
    // "##.|.##" biçimini hücre listesine çevir
    const cells = [];
    str.split('|').forEach((row, y) => row.split('').forEach((ch, x) => { if (ch === '#') cells.push([x, y]); }));
    return cells;
  };
  const SHAPES = [
    [S('#'), 3, '#f59f00'],
    [S('##'), 4, '#ff6b6b'], [S('#|#'), 4, '#ff6b6b'],
    [S('###'), 4, '#4dabf7'], [S('#|#|#'), 4, '#4dabf7'],
    [S('####'), 3, '#22b8cf'], [S('#|#|#|#'), 3, '#22b8cf'],
    [S('#####'), 2, '#be4bdb'], [S('#|#|#|#|#'), 2, '#be4bdb'],
    [S('##|##'), 5, '#ffd43b'],
    [S('###|###|###'), 2, '#ff922b'],
    [S('##|#.'), 3, '#51cf66'], [S('##|.#'), 3, '#51cf66'], [S('#.|##'), 3, '#51cf66'], [S('.#|##'), 3, '#51cf66'],
    [S('#..|###'), 2, '#748ffc'], [S('..#|###'), 2, '#748ffc'], [S('###|#..'), 2, '#748ffc'], [S('###|..#'), 2, '#748ffc'],
    [S('#.|#.|##'), 2, '#f783ac'], [S('.#|.#|##'), 2, '#f783ac'], [S('##|#.|#.'), 2, '#f783ac'], [S('##|.#|.#'), 2, '#f783ac'],
    [S('###|.#.'), 2, '#e64980'], [S('.#.|###'), 2, '#e64980'], [S('#.|##|#.'), 2, '#e64980'], [S('.#|##|.#'), 2, '#e64980'],
    [S('##.|.##'), 1, '#20c997'], [S('.##|##.'), 1, '#20c997'], [S('#.|##|.#'), 1, '#20c997'], [S('.#|##|#.'), 1, '#20c997'],
    [S('###|###'), 2, '#fab005'], [S('##|##|##'), 2, '#fab005'],
    [S('#..|#..|###'), 1, '#4c6ef5'], [S('###|..#|..#'), 1, '#4c6ef5']
  ];
  const TOTALW = SHAPES.reduce((a, s) => a + s[1], 0);

  Platform.register({
    id: 'blockpuzzle', name: 'Blok Yerleştir', gen: 'modern', genre: 'Bulmaca',
    colors: ['#f59e0b', '#c2410c'],
    desc: 'Blokları tahtaya sürükle, satır ve sütunları doldurup patlat.',
    help: '<ul><li>Alttaki üç bloktan birini <b>tutup tahtaya sürükle</b>. Blok parmağının biraz üstünde görünür.</li><li>Dolan her <b>satır veya sütun</b> silinir ve puan kazandırır.</li><li>Arka arkaya silme yaparsan <b>kombo</b> çarpanı artar!</li><li>Elindeki blokların hiçbiri sığmazsa oyun biter. Bloklar döndürülemez.</li></ul>',
    icon: '<rect x="6" y="6" width="14" height="14" rx="3" fill="#ffd43b"/><rect x="21" y="6" width="14" height="14" rx="3" fill="#ffd43b"/><rect x="6" y="21" width="14" height="14" rx="3" fill="#ffd43b"/><rect x="21" y="21" width="14" height="14" rx="3" fill="#ffd43b"/><rect x="6" y="44" width="14" height="14" rx="3" fill="#ff6b6b"/><rect x="21" y="44" width="14" height="14" rx="3" fill="#ff6b6b"/><rect x="36" y="44" width="14" height="14" rx="3" fill="#ff6b6b"/><rect x="42" y="14" width="14" height="14" rx="3" fill="#4dabf7"/><rect x="42" y="29" width="14" height="14" rx="3" fill="#4dabf7"/>',
    create(s) {
      const N = 8, C = 40, BX = 20, BY = 12, W = 360, H = 560, TRAY_Y = 360, TRAY_H = 190, TC = 22;
      const view = s.canvas(W, H);
      const g = view.g;
      const board = Array.from({ length: N }, () => new Array(N).fill(null));
      let tray = [null, null, null], score = 0, combo = 0, drag = null, clearing = [], over = false, sinceClear = 0;
      const fx = new U.Particles();
      const floats = [];

      function pickShape() {
        let r = Math.random() * TOTALW;
        for (const sh of SHAPES) { r -= sh[1]; if (r <= 0) return sh; }
        return SHAPES[0];
      }
      function dims(cells) { let w = 0, h = 0; for (const [x, y] of cells) { w = Math.max(w, x + 1); h = Math.max(h, y + 1); } return { w, h }; }
      function fits(cells, gx, gy) {
        for (const [x, y] of cells) {
          const bx = gx + x, by = gy + y;
          if (bx < 0 || by < 0 || bx >= N || by >= N || board[by][bx]) return false;
        }
        return true;
      }
      function fitsAnywhere(cells) {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(cells, x, y)) return true;
        return false;
      }
      function refill() {
        for (let tries = 0; tries < 20; tries++) {
          const t = [pickShape(), pickShape(), pickShape()];
          if (tries < 19 && !t.some(sh => fitsAnywhere(sh[0]))) continue;
          tray = t.map(sh => ({ cells: sh[0], color: sh[2], appear: 0 }));
          return;
        }
      }
      function checkOver() {
        const live = tray.filter(Boolean);
        if (live.length && !live.some(p => fitsAnywhere(p.cells))) {
          over = true;
          s.sfx('lose'); s.vibe(200);
          s.over({ score, msg: 'Elindeki bloklar sığmadı.', delay: 1000 });
        }
      }
      function place(idx, gx, gy) {
        const p = tray[idx];
        for (const [x, y] of p.cells) board[gy + y][gx + x] = { color: p.color, pop: 0 };
        tray[idx] = null;
        score += p.cells.length;
        s.sfx('place'); s.vibe(12);
        // satır/sütun kontrolü
        const rows = [], cols = [];
        for (let y = 0; y < N; y++) if (board[y].every(v => v)) rows.push(y);
        for (let x = 0; x < N; x++) { let full = true; for (let y = 0; y < N; y++) if (!board[y][x]) { full = false; break; } if (full) cols.push(x); }
        const n = rows.length + cols.length;
        if (n) {
          combo++;
          sinceClear = 0;
          const pts = n * 10 * n * combo;
          score += pts;
          const cells = new Set();
          rows.forEach(y => { for (let x = 0; x < N; x++) cells.add(y * N + x); });
          cols.forEach(x => { for (let y = 0; y < N; y++) cells.add(y * N + x); });
          let k = 0;
          for (const id of cells) {
            const x = id % N, y = (id / N) | 0;
            const cell = board[y][x];
            clearing.push({ x, y, color: cell.color, t: -k * 0.012 });
            board[y][x] = null;
            k++;
          }
          s.sfx(n > 1 ? 'line' : 'pop');
          s.vibe(n > 1 ? 60 : 25);
          floats.push({ x: BX + (gx + 1) * C, y: BY + gy * C, txt: '+' + pts + (combo > 1 ? '  KOMBO x' + combo : ''), t: 0 });
          if (n >= 3) s.toast(['', '', '', 'Harika!', 'Muhteşem!', 'İnanılmaz!'][Math.min(5, n)] || 'Efsane!', 900);
        } else {
          sinceClear++;
          if (sinceClear >= 3) combo = 0;
        }
        s.score(score);
        if (tray.every(t => !t)) refill();
        checkOver();
      }
      function slotRect(i) { const w = W / 3; return { x: i * w, y: TRAY_Y, w, h: TRAY_H }; }
      function snapPos(p) {
        const d = dims(p.cells);
        const left = drag.x - (d.w * C) / 2, top = drag.y - d.h * C - 46;
        return { gx: Math.round((left - BX) / C), gy: Math.round((top - BY) / C), left, top };
      }

      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || over || drag) return;
        const p = view.pt(e);
        for (let i = 0; i < 3; i++) {
          const r = slotRect(i);
          if (tray[i] && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y - 10 && p.y < r.y + r.h) {
            drag = { i, id: e.pointerId, x: p.x, y: p.y };
            s.sfx('tick');
            try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
            return;
          }
        }
      });
      s.on(view.cv, 'pointermove', e => {
        if (!drag || drag.id !== e.pointerId) return;
        const p = view.pt(e);
        drag.x = p.x; drag.y = p.y;
      });
      s.on(view.cv, 'pointerup', e => {
        if (!drag || drag.id !== e.pointerId) return;
        const p = tray[drag.i];
        if (p && s.active()) {
          const sp = snapPos(p);
          if (fits(p.cells, sp.gx, sp.gy)) place(drag.i, sp.gx, sp.gy);
          else { p.appear = 0; s.sfx('error'); }
        }
        drag = null;
      });
      s.on(view.cv, 'pointercancel', () => { drag = null; });

      refill();

      function block(x, y, size, color, alpha) {
        g.globalAlpha = alpha == null ? 1 : alpha;
        g.fillStyle = color;
        U.rr(g, x + 1.5, y + 1.5, size - 3, size - 3, size * 0.2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.3)';
        U.rr(g, x + 4, y + 4, size - 8, size * 0.28, size * 0.12); g.fill();
        g.fillStyle = 'rgba(0,0,0,.15)';
        g.fillRect(x + 4, y + size - size * 0.24, size - 8, size * 0.1);
        g.globalAlpha = 1;
      }

      s.loop(dt => {
        fx.update(dt);
        for (const p of tray) if (p && p.appear < 1) p.appear = Math.min(1, p.appear + dt * 5);
        for (let i = clearing.length - 1; i >= 0; i--) {
          const c = clearing[i];
          c.t += dt;
          if (c.t > 0 && !c.fx) { c.fx = true; fx.burst(BX + c.x * C + C / 2, BY + c.y * C + C / 2, c.color, 5, 150, 0.6, 4, 300); }
          if (c.t > 0.3) clearing.splice(i, 1);
        }
        for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.1) floats.splice(i, 1); }
      }, dt => {
        if (!s.active()) fx.update(dt || 0);
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#2b1a4d'); bg.addColorStop(1, '#170f2b');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(0,0,0,.3)'; U.rr(g, BX - 6, BY - 6, N * C + 12, N * C + 12, 14); g.fill();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          g.fillStyle = 'rgba(255,255,255,.06)';
          U.rr(g, BX + x * C + 1.5, BY + y * C + 1.5, C - 3, C - 3, 7); g.fill();
        }
        // önizleme ve silinecek satırlar
        let ghost = null, hlRows = [], hlCols = [];
        if (drag && tray[drag.i]) {
          const p = tray[drag.i];
          const sp = snapPos(p);
          if (fits(p.cells, sp.gx, sp.gy)) {
            ghost = { p, sp };
            const tmp = board.map(r => r.map(v => !!v));
            for (const [x, y] of p.cells) tmp[sp.gy + y][sp.gx + x] = true;
            for (let y = 0; y < N; y++) if (tmp[y].every(Boolean)) hlRows.push(y);
            for (let x = 0; x < N; x++) if (tmp.every(r => r[x])) hlCols.push(x);
          }
        }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (!v) continue;
          const hl = hlRows.indexOf(y) >= 0 || hlCols.indexOf(x) >= 0;
          block(BX + x * C, BY + y * C, C, hl && ghost ? ghost.p.color : v.color);
          if (hl) { g.fillStyle = 'rgba(255,255,255,.25)'; U.rr(g, BX + x * C + 2, BY + y * C + 2, C - 4, C - 4, 7); g.fill(); }
        }
        if (ghost) for (const [x, y] of ghost.p.cells) block(BX + (ghost.sp.gx + x) * C, BY + (ghost.sp.gy + y) * C, C, ghost.p.color, 0.35);
        for (const c of clearing) {
          if (c.t < 0) { block(BX + c.x * C, BY + c.y * C, C, c.color); continue; }
          const k = 1 - c.t / 0.3;
          const sz = C * k;
          block(BX + c.x * C + (C - sz) / 2, BY + c.y * C + (C - sz) / 2, Math.max(1, sz), c.color, k);
        }
        // tepsi
        g.fillStyle = 'rgba(255,255,255,.04)'; U.rr(g, 8, TRAY_Y, W - 16, TRAY_H - 6, 18); g.fill();
        for (let i = 0; i < 3; i++) {
          const p = tray[i];
          if (!p || (drag && drag.i === i)) continue;
          const r = slotRect(i), d = dims(p.cells);
          const sc = U.easeOutBack(p.appear);
          const sz = TC * sc;
          const ok = fitsAnywhere(p.cells);
          const ox = r.x + r.w / 2 - d.w * sz / 2, oy = r.y + r.h / 2 - d.h * sz / 2 - 4;
          for (const [x, y] of p.cells) block(ox + x * sz, oy + y * sz, sz, ok ? p.color : '#5c5470', ok ? 1 : 0.6);
        }
        if (drag && tray[drag.i]) {
          const p = tray[drag.i], sp = snapPos(p);
          for (const [x, y] of p.cells) block(sp.left + x * C, sp.top + y * C, C, p.color, 0.95);
        }
        fx.draw(g);
        for (const f of floats) {
          g.globalAlpha = Math.max(0, 1 - f.t / 1.1);
          U.text(g, f.txt, U.clamp(f.x, 90, W - 90), f.y - f.t * 40, 18, '#fff3bf', 'center', 900);
          g.globalAlpha = 1;
        }
        if (combo > 1) U.text(g, 'KOMBO x' + combo, W / 2, TRAY_Y + TRAY_H - 18, 12, '#ffd43b');
      });
      return {};
    }
  });
})();
