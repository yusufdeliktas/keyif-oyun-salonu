/* Birleştir - sayı birleştirme bulmacası */
(function () {
  const U = Platform.util;
  const COLORS = { 2: '#33407a', 4: '#3e52a8', 8: '#6d5cff', 16: '#9a4dff', 32: '#d04dff', 64: '#ff4d9d', 128: '#ff6b4d', 256: '#ff9f43', 512: '#ffc93c', 1024: '#7bdc6b', 2048: '#22d3ee', 4096: '#f8fafc', 8192: '#fde68a' };
  const V = { L: [0, -1], R: [0, 1], U: [-1, 0], D: [1, 0] };

  Platform.register({
    id: 'merge', name: 'Birleştir', gen: 'modern', genre: 'Bulmaca',
    colors: ['#8b5cf6', '#db2777'],
    desc: 'Aynı sayıları kaydırıp birleştir, 2048\'e ve ötesine ulaş!',
    help: '<ul><li>Ekranı <b>kaydır</b> ya da <b>ok tuşlarını</b> kullan: tüm kareler o yöne kayar.</li><li>Aynı sayıdaki iki kare çarpışınca <b>birleşir</b> ve toplamları puanına eklenir.</li><li>Her hamleden sonra yeni bir 2 (bazen 4) gelir.</li><li>Hamle kalmayınca oyun biter. Oyun başına <b>3 geri alma</b> hakkın var.</li></ul>',
    options: [{ key: 'size', label: 'TAHTA', choices: [['4', '4×4'], ['5', '5×5'], ['6', '6×6']], def: '4' }],
    bestKey: o => 's' + o.size,
    icon: '<rect x="6" y="6" width="24" height="24" rx="6" fill="#6d5cff"/><rect x="34" y="6" width="24" height="24" rx="6" fill="#ff4d9d"/><rect x="6" y="34" width="24" height="24" rx="6" fill="#ffc93c"/><rect x="34" y="34" width="24" height="24" rx="6" fill="#22d3ee"/><text x="18" y="23" font-size="12" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">8</text><text x="46" y="23" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">64</text><text x="18" y="51" font-size="9" font-weight="900" fill="#3b2a00" text-anchor="middle" font-family="sans-serif">512</text><text x="46" y="51" font-size="7.5" font-weight="900" fill="#083344" text-anchor="middle" font-family="sans-serif">2048</text>',
    create(s, o) {
      const N = +o.size, W = 360, H = 360;
      const GAP = N === 4 ? 10 : N === 5 ? 8 : 7;
      const CELL = (W - GAP * (N + 1)) / N;
      const view = s.canvas(W, H);
      const g = view.g;
      const SLIDE = 110, POP = 160;
      let grid, tiles, dying = [], score = 0, moveStart = 0, nextId = 1, undoLeft = 3, undoSnap = null, won = false, over = false;
      const fx = new U.Particles();
      const now = () => performance.now();

      const ctrl = s.controls();
      const undoBtn = s.button(ctrl, '', undo);
      const updUndo = () => { undoBtn.innerHTML = '↶ Geri Al <small>(' + undoLeft + ')</small>'; undoBtn.disabled = !undoSnap || undoLeft <= 0 || over; };

      function newTile(v, r, c, bornAt, kind) {
        const t = { id: nextId++, v, r, c, fr: r, fc: c, bornAt: bornAt || 0, kind: kind || 'spawn' };
        grid[r][c] = t;
        return t;
      }
      function empties() { const e = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) e.push([r, c]); return e; }
      function spawn(at) {
        const e = empties();
        if (!e.length) return;
        const [r, c] = U.pick(e);
        newTile(Math.random() < 0.9 ? 2 : 4, r, c, at, 'spawn');
      }
      function reset() {
        grid = Array.from({ length: N }, () => new Array(N).fill(null));
        spawn(0); spawn(0);
        score = 0; s.score(0);
        updUndo();
      }
      function allTiles() { const a = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c]) a.push(grid[r][c]); return a; }
      function canMove() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const t = grid[r][c];
          if (!t) return true;
          if (c + 1 < N && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true;
          if (r + 1 < N && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true;
        }
        return false;
      }
      function snap() { return { vals: grid.map(row => row.map(t => (t ? t.v : 0))), score }; }
      function undo() {
        if (!undoSnap || undoLeft <= 0 || over) return;
        undoLeft--;
        grid = Array.from({ length: N }, () => new Array(N).fill(null));
        undoSnap.vals.forEach((row, r) => row.forEach((v, c) => { if (v) newTile(v, r, c, 0, 'old'); }));
        score = undoSnap.score; s.score(score);
        undoSnap = null; dying = [];
        s.sfx('move');
        updUndo();
      }
      function move(dir) {
        if (over) return;
        // önceki animasyonu bitir
        dying = [];
        for (const t of allTiles()) { t.fr = t.r; t.fc = t.c; t.merged = false; }
        const before = snap();
        const [dr, dc] = V[dir];
        const rs = [...Array(N).keys()], cs = [...Array(N).keys()];
        if (dr === 1) rs.reverse();
        if (dc === 1) cs.reverse();
        let moved = false, gained = 0, maxNew = 0;
        const t0 = now();
        for (const r of rs) for (const c of cs) {
          const t = grid[r][c];
          if (!t) continue;
          let nr = r, nc = c, merged = false;
          for (;;) {
            const tr = nr + dr, tc = nc + dc;
            if (tr < 0 || tr >= N || tc < 0 || tc >= N) break;
            const ot = grid[tr][tc];
            if (!ot) { nr = tr; nc = tc; continue; }
            if (ot.v === t.v && !ot.merged) {
              grid[r][c] = null;
              t.r = tr; t.c = tc;
              dying.push(t, ot);
              const nt = newTile(t.v * 2, tr, tc, t0 + SLIDE, 'merge');
              nt.merged = true;
              gained += nt.v; maxNew = Math.max(maxNew, nt.v);
              merged = true; moved = true;
            }
            break;
          }
          if (!merged && (nr !== r || nc !== c)) {
            grid[r][c] = null; grid[nr][nc] = t; t.r = nr; t.c = nc; moved = true;
          }
        }
        if (!moved) return;
        moveStart = t0;
        undoSnap = before;
        score += gained; s.score(score);
        spawn(t0 + SLIDE);
        if (gained) {
          s.sfx('merge');
          if (maxNew >= 128) s.vibe(20);
        } else s.sfx('move');
        if (maxNew >= 2048 && !won) {
          won = true;
          s.timeout(() => { s.sfx('win'); s.toast('🎉 2048\'e ulaştın! Devam edebilirsin.', 2500); }, 200);
        }
        updUndo();
        if (!canMove()) {
          over = true; updUndo();
          let mx = 0; for (const t of allTiles()) mx = Math.max(mx, t.v);
          s.sfx('lose');
          s.over({ score, msg: 'En büyük kare: ' + mx, delay: 900 });
        }
      }
      s.key(e => {
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') move('L');
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') move('R');
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') move('U');
        else if (k === 'ArrowDown' || k === 's' || k === 'S') move('D');
        else if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey)) undo();
      });
      s.swipe(s.stage, d => move(d), null, { min: 26 });

      reset();

      const pos = (r, c) => ({ x: GAP + c * (CELL + GAP), y: GAP + r * (CELL + GAP) });
      function drawTile(v, x, y, sc) {
        const col = COLORS[v] || '#fde68a';
        const w = CELL * sc, ox = x + (CELL - w) / 2, oy = y + (CELL - w) / 2;
        g.fillStyle = col;
        if (v >= 128) { g.shadowColor = col; g.shadowBlur = 14; }
        U.rr(g, ox, oy, w, w, CELL * 0.14); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = 'rgba(255,255,255,.09)';
        U.rr(g, ox + 4, oy + 4, w - 8, w * 0.22, CELL * 0.08); g.fill();
        const str = String(v);
        const fs = CELL * (str.length <= 2 ? 0.46 : str.length === 3 ? 0.38 : str.length === 4 ? 0.3 : 0.24) * sc;
        const dark = v >= 512 && v !== 1024 ? '#1e1b2e' : '#fff';
        U.text(g, str, ox + w / 2, oy + w / 2 + 1, fs, v === 1024 ? '#0f2e12' : dark, 'center', 900);
      }

      s.loop(dt => { fx.update(dt); }, dt => {
        if (!s.active()) fx.update(dt || 0);
        const tn = now();
        g.fillStyle = '#1a1838';
        U.rr(g, 0, 0, W, H, 18); g.fill();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const p = pos(r, c);
          g.fillStyle = 'rgba(255,255,255,.06)';
          U.rr(g, p.x, p.y, CELL, CELL, CELL * 0.14); g.fill();
        }
        const k = U.clamp((tn - moveStart) / SLIDE, 0, 1), e = U.easeOut(k);
        if (k < 1) for (const t of dying) {
          const a = pos(t.fr, t.fc), b = pos(t.r, t.c);
          drawTile(t.v, U.lerp(a.x, b.x, e), U.lerp(a.y, b.y, e), 1);
        }
        for (const t of allTiles()) {
          if (t.bornAt > tn) continue;
          const a = pos(t.fr, t.fc), b = pos(t.r, t.c);
          let x = b.x, y = b.y, sc = 1;
          if (t.kind === 'old' || t.kind === 'spawn' && t.bornAt === 0) { /* sabit */ }
          if (!(t.fr === t.r && t.fc === t.c) && k < 1) { x = U.lerp(a.x, b.x, e); y = U.lerp(a.y, b.y, e); }
          const age = tn - t.bornAt;
          if (t.bornAt > 0 && age < POP) {
            const q = age / POP;
            sc = t.kind === 'merge' ? 1 + Math.sin(q * Math.PI) * 0.14 : U.easeOutBack(q);
            if (t.kind === 'merge' && !t.fxd) { t.fxd = true; fx.burst(b.x + CELL / 2, b.y + CELL / 2, COLORS[t.v] || '#fff', 8, 110, 0.4, 3); }
          }
          drawTile(t.v, x, y, Math.max(0.01, sc));
        }
        if (k >= 1 && dying.length) dying = [];
        fx.draw(g);
      });
      return {};
    }
  });
})();
