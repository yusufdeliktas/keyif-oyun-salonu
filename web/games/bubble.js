/* Balon Patlat - balon fırlatma bulmacası */
(function () {
  const U = Platform.util;
  const PAL = ['#ff5c7a', '#4dabf7', '#ffd43b', '#51cf66', '#b197fc', '#ff922b'];

  Platform.register({
    id: 'bubble', name: 'Balon Patlat', gen: 'modern', genre: 'Bulmaca',
    colors: ['#06b6d4', '#7c3aed'],
    desc: 'Nişan al, fırlat; aynı renkten 3 balonu birleştirip patlat!',
    help: '<ul><li>Parmağını ekranda <b>sürükleyerek nişan al</b>, bırakınca balon fırlar. Klavyede <b>← →</b> ve <b>Boşluk</b>.</li><li>Aynı renkten <b>3 veya daha fazla</b> balon bir araya gelince patlar.</li><li>Tavana bağlantısı kopan balonlar düşer ve <b>bonus puan</b> verir.</li><li>Balonlar duvarlardan seker. Alttaki küçük balona dokunarak sıradakiyle değiştirebilirsin.</li><li>Birkaç atış ıskalarsan yeni bir sıra iner. Balonlar çizgiye ulaşırsa oyun biter!</li></ul>',
    icon: '<circle cx="16" cy="14" r="9" fill="#ff5c7a"/><circle cx="34" cy="14" r="9" fill="#4dabf7"/><circle cx="52" cy="14" r="9" fill="#ffd43b"/><circle cx="25" cy="29" r="9" fill="#51cf66"/><circle cx="43" cy="29" r="9" fill="#ff5c7a"/><circle cx="32" cy="54" r="8" fill="#ff5c7a"/><path d="M32 46l6-10" stroke="#fff" stroke-width="2" stroke-dasharray="2 3"/>',
    create(s) {
      const W = 360, H = 600, R = 16, COLS = 11, X0 = 4, TOPY = 6, RH = R * Math.sqrt(3), DEATH = 17, MAXR = 20;
      const SX = W / 2, SY = 548;
      const view = s.canvas(W, H);
      const g = view.g;
      const fx = new U.Particles();
      let rows = [], parity = 0, level = 1, nColors = 4, score = 0, misses = 0, shot = null, cur, nxt, angle = -Math.PI / 2, aiming = false, state = 'play', popping = [], falling = [], pushOff = 0, keyRot = 0, banner = 1.5;

      const isOff = r => ((r + parity) & 1) === 1;
      const ncols = r => (isOff(r) ? COLS - 1 : COLS);
      const cx = (r, c) => X0 + R + c * 2 * R + (isOff(r) ? R : 0);
      const cy = r => TOPY + R + r * RH;
      const get = (r, c) => (r >= 0 && r < rows.length && c >= 0 && c < ncols(r) ? rows[r][c] : null);
      function emptyRow() { return new Array(COLS).fill(null); }
      function ensureRows() { while (rows.length < MAXR) rows.push(emptyRow()); }
      function neighbors(r, c) {
        const o = isOff(r) ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]] : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
        const out = [];
        for (const [dr, dc] of o) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < rows.length && nc >= 0 && nc < ncols(nr)) out.push([nr, nc]); }
        return out;
      }
      function presentColors() {
        const set = new Set();
        for (let r = 0; r < rows.length; r++) for (let c = 0; c < ncols(r); c++) if (rows[r][c] != null) set.add(rows[r][c]);
        return [...set];
      }
      function randColor() {
        const p = presentColors();
        return p.length ? U.pick(p) : U.randi(0, nColors - 1);
      }
      function newLevel() {
        rows = []; parity = 0;
        nColors = Math.min(6, 3 + level);
        const n = Math.min(9, 4 + level);
        for (let r = 0; r < n; r++) {
          const row = emptyRow();
          for (let c = 0; c < ncols(r); c++) row[c] = U.randi(0, nColors - 1);
          rows.push(row);
        }
        ensureRows();
        misses = 0; banner = 1.5;
        cur = randColor(); nxt = randColor();
      }
      function missLimit() { return Math.max(4, 7 - Math.floor(level / 2)); }
      function pushRow() {
        const pc = presentColors();
        parity ^= 1;
        const row = emptyRow();
        rows.unshift(row);
        for (let c = 0; c < ncols(0); c++) row[c] = pc.length ? U.pick(pc) : U.randi(0, nColors - 1);
        if (rows.length > MAXR) rows.length = MAXR;
        pushOff = -RH;
        s.sfx('drop'); s.vibe(40);
      }
      function lowestRow() {
        for (let r = rows.length - 1; r >= 0; r--) for (let c = 0; c < ncols(r); c++) if (rows[r][c] != null) return r;
        return -1;
      }
      function fire() {
        if (shot || state !== 'play') return;
        shot = { x: SX, y: SY, vx: Math.cos(angle) * 950, vy: Math.sin(angle) * 950, c: cur };
        cur = nxt; nxt = randColor();
        s.sfx('shoot');
      }
      function snap(x, y, col) {
        let best = null, bd = Infinity;
        const er = Math.round((y - TOPY - R) / RH);
        for (let pass = 0; pass < 2 && !best; pass++) {
          for (let r = Math.max(0, er - 2); r <= Math.min(rows.length - 1, er + 2); r++) {
            for (let c = 0; c < ncols(r); c++) {
              if (rows[r][c] != null) continue;
              if (pass === 0 && r !== 0 && !neighbors(r, c).some(([a, b]) => rows[a][b] != null)) continue;
              const d = (cx(r, c) - x) ** 2 + (cy(r) - y) ** 2;
              if (d < bd) { bd = d; best = [r, c]; }
            }
          }
        }
        if (!best) return;
        const [r, c] = best;
        rows[r][c] = col;
        resolve(r, c);
      }
      function resolve(r, c) {
        const col = rows[r][c];
        const seen = new Set([r + ',' + c]), q = [[r, c]], group = [];
        while (q.length) {
          const [a, b] = q.pop();
          group.push([a, b]);
          for (const [na, nb] of neighbors(a, b)) {
            const k = na + ',' + nb;
            if (!seen.has(k) && rows[na][nb] === col) { seen.add(k); q.push([na, nb]); }
          }
        }
        if (group.length >= 3) {
          group.forEach(([a, b], i) => { popping.push({ x: cx(a, b), y: cy(a), c: rows[a][b], t: -i * 0.03 }); rows[a][b] = null; });
          score += group.length * 10;
          s.sfx('pop'); s.vibe(20);
          // bağlantısı kopanlar
          const conn = new Set(), st = [];
          for (let k = 0; k < ncols(0); k++) if (rows[0][k] != null) { conn.add('0,' + k); st.push([0, k]); }
          while (st.length) {
            const [a, b] = st.pop();
            for (const [na, nb] of neighbors(a, b)) { const k = na + ',' + nb; if (!conn.has(k) && rows[na][nb] != null) { conn.add(k); st.push([na, nb]); } }
          }
          let dropped = 0;
          for (let a = 0; a < rows.length; a++) for (let b = 0; b < ncols(a); b++) {
            if (rows[a][b] != null && !conn.has(a + ',' + b)) {
              falling.push({ x: cx(a, b), y: cy(a), vx: U.rand(-60, 60), vy: U.rand(-150, -40), c: rows[a][b] });
              rows[a][b] = null; dropped++;
            }
          }
          if (dropped) { score += dropped * 20 * Math.min(4, 1 + Math.floor(dropped / 4)); s.timeout(() => s.sfx('coin'), 150); }
          if (group.length + dropped >= 8) s.toast('Süper! +' + (group.length * 10 + dropped * 20), 900);
        } else {
          s.sfx('place');
          misses++;
          if (misses >= missLimit()) { misses = 0; pushRow(); }
        }
        s.score(score);
        if (lowestRow() >= DEATH) {
          state = 'dead';
          s.sfx('lose'); s.vibe(250);
          s.over({ score, msg: level + '. seviyeye ulaştın.', delay: 900 });
          return;
        }
        if (lowestRow() < 0) {
          score += 500 * level; s.score(score);
          s.sfx('win');
          s.toast('Seviye ' + level + ' tamamlandı! +' + 500 * level, 1500);
          level++;
          s.timeout(newLevel, 900);
          state = 'wait';
          s.timeout(() => { if (state === 'wait') state = 'play'; }, 950);
        }
        // mevcut renkler değiştiyse sıradakileri güncelle
        const pc = presentColors();
        if (pc.length && pc.indexOf(cur) < 0) cur = U.pick(pc);
        if (pc.length && pc.indexOf(nxt) < 0) nxt = U.pick(pc);
      }
      function setAim(p) {
        let a = Math.atan2(p.y - SY, p.x - SX);
        if (a > 0) a = p.x < SX ? -Math.PI + 0.14 : -0.14;
        angle = U.clamp(a, -Math.PI + 0.14, -0.14);
      }
      const nextPos = { x: SX - 70, y: SY + 18 };
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || state !== 'play') return;
        const p = view.pt(e);
        if (Math.hypot(p.x - nextPos.x, p.y - nextPos.y) < 24) { const t = cur; cur = nxt; nxt = t; s.sfx('click'); return; }
        aiming = true; setAim(p);
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      });
      s.on(view.cv, 'pointermove', e => { if (aiming && s.active()) setAim(view.pt(e)); });
      s.on(view.cv, 'pointerup', e => {
        if (!aiming) return;
        aiming = false;
        const p = view.pt(e);
        if (s.active() && p.y < SY - 10) fire();
      });
      s.on(view.cv, 'pointercancel', () => { aiming = false; });
      s.key(e => {
        if (e.key === 'ArrowLeft') keyRot = -1;
        else if (e.key === 'ArrowRight') keyRot = 1;
        else if (e.key === ' ' || e.key === 'ArrowUp') fire();
        else if (e.key === 'Shift' || e.key === 'c' || e.key === 'C') { const t = cur; cur = nxt; nxt = t; }
      });
      s.keyup(e => { if ((e.key === 'ArrowLeft' && keyRot < 0) || (e.key === 'ArrowRight' && keyRot > 0)) keyRot = 0; });

      newLevel();

      function hitsBubble(x, y) {
        const er = Math.round((y - TOPY - R) / RH);
        for (let r = Math.max(0, er - 1); r <= Math.min(rows.length - 1, er + 1); r++) {
          for (let c = 0; c < ncols(r); c++) {
            if (rows[r][c] == null) continue;
            if ((cx(r, c) - x) ** 2 + (cy(r) - y) ** 2 < (2 * R - 5) ** 2) return true;
          }
        }
        return false;
      }
      function bubble(x, y, c, rad, alpha) {
        g.globalAlpha = alpha == null ? 1 : alpha;
        const col = PAL[c];
        const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, rad * 0.1, x, y, rad);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, U.hexA(col, 0.85));
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad - 0.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1; g.stroke();
        g.globalAlpha = 1;
      }

      s.loop(dt => {
        fx.update(dt);
        if (banner > 0) banner -= dt;
        if (keyRot) angle = U.clamp(angle + keyRot * 1.8 * dt, -Math.PI + 0.14, -0.14);
        if (pushOff < 0) pushOff = Math.min(0, pushOff + RH * dt * 5);
        for (let i = popping.length - 1; i >= 0; i--) {
          const p = popping[i]; p.t += dt;
          if (p.t > 0 && !p.fx) { p.fx = true; fx.burst(p.x, p.y, PAL[p.c], 8, 140, 0.45, 3); }
          if (p.t > 0.18) popping.splice(i, 1);
        }
        for (let i = falling.length - 1; i >= 0; i--) {
          const f = falling[i]; f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
          if (f.y > H + 30) falling.splice(i, 1);
        }
        if (shot) {
          const steps = Math.ceil(Math.hypot(shot.vx, shot.vy) * dt / 5);
          for (let i = 0; i < steps && shot; i++) {
            shot.x += shot.vx * dt / steps; shot.y += shot.vy * dt / steps;
            if (shot.x < X0 + R) { shot.x = X0 + R; shot.vx = Math.abs(shot.vx); s.sfx('bounce'); }
            if (shot.x > W - X0 - R) { shot.x = W - X0 - R; shot.vx = -Math.abs(shot.vx); s.sfx('bounce'); }
            if (shot.y <= TOPY + R || hitsBubble(shot.x, shot.y)) { const sh = shot; shot = null; snap(sh.x, Math.max(sh.y, TOPY + R), sh.c); }
          }
        }
      }, dt => {
        if (!s.active()) fx.update(dt || 0);
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0e1a3d'); bg.addColorStop(1, '#1e0f3d');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(X0, 0, W - X0 * 2, cy(DEATH) - R);
        // ölüm çizgisi
        const dy = cy(DEATH) - R + 2;
        g.strokeStyle = 'rgba(255,92,122,.55)'; g.setLineDash([8, 6]); g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, dy); g.lineTo(W, dy); g.stroke(); g.setLineDash([]);
        // balonlar
        for (let r = 0; r < rows.length; r++) for (let c = 0; c < ncols(r); c++) {
          const v = rows[r][c];
          if (v != null) bubble(cx(r, c), cy(r) + pushOff, v, R);
        }
        for (const p of popping) { if (p.t < 0) bubble(p.x, p.y, p.c, R); else bubble(p.x, p.y, p.c, R * (1 + p.t * 2), Math.max(0, 1 - p.t / 0.18)); }
        for (const f of falling) bubble(f.x, f.y, f.c, R);
        // nişan çizgisi
        if (state === 'play' && !shot) {
          let x = SX, y = SY, vx = Math.cos(angle), vy = Math.sin(angle), len = 0;
          g.fillStyle = U.hexA(PAL[cur], 0.8);
          let dots = 0;
          while (len < 900 && y > TOPY + R) {
            x += vx * 4; y += vy * 4; len += 4;
            if (x < X0 + R) { x = X0 + R; vx = Math.abs(vx); }
            if (x > W - X0 - R) { x = W - X0 - R; vx = -Math.abs(vx); }
            if (hitsBubble(x, y)) break;
            if (len % 20 === 0) { dots++; const a = aiming ? 1 : 0.5; g.globalAlpha = a * Math.max(0.15, 1 - len / 900); g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
          }
          g.globalAlpha = 1;
        }
        // atıcı
        g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(SX, SY + 20, 44, Math.PI, 0); g.fill();
        g.save(); g.translate(SX, SY); g.rotate(angle + Math.PI / 2);
        g.fillStyle = '#334155'; U.rr(g, -7, -38, 14, 30, 5); g.fill();
        g.restore();
        if (shot) bubble(shot.x, shot.y, shot.c, R);
        else if (state === 'play' || state === 'wait') bubble(SX, SY, cur, R);
        bubble(nextPos.x, nextPos.y, nxt, R * 0.72);
        U.text(g, 'SIRADAKİ', nextPos.x, nextPos.y + 22, 8.5, 'rgba(255,255,255,.5)');
        // iskalama göstergesi
        const lim = missLimit();
        for (let i = 0; i < lim; i++) {
          g.fillStyle = i < lim - misses ? '#7dd3fc' : 'rgba(255,255,255,.12)';
          g.beginPath(); g.arc(SX + 56 + i * 12, SY + 18, 4, 0, Math.PI * 2); g.fill();
        }
        U.text(g, 'SEVİYE ' + level, W - 14, SY + 42, 11, '#c4b5fd', 'right');
        fx.draw(g);
        if (banner > 0) {
          g.globalAlpha = Math.min(1, banner);
          U.text(g, 'SEVİYE ' + level, W / 2, 330, 34, '#e9d5ff');
          g.globalAlpha = 1;
        }
      });
      return {};
    }
  });
})();
