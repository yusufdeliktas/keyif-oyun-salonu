/* Solitaire (Klondike / Kart Falı) */
(function () {
  const U = Platform.util;
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const red = s => s === 1 || s === 2;

  function suitPath(g, s, cx, cy, sz) {
    g.beginPath();
    if (s === 1) { // kupa
      g.moveTo(cx, cy + sz * 0.45);
      g.bezierCurveTo(cx - sz * 0.9, cy - sz * 0.1, cx - sz * 0.35, cy - sz * 0.75, cx, cy - sz * 0.25);
      g.bezierCurveTo(cx + sz * 0.35, cy - sz * 0.75, cx + sz * 0.9, cy - sz * 0.1, cx, cy + sz * 0.45);
    } else if (s === 2) { // karo
      g.moveTo(cx, cy - sz * 0.55); g.lineTo(cx + sz * 0.42, cy); g.lineTo(cx, cy + sz * 0.55); g.lineTo(cx - sz * 0.42, cy); g.closePath();
    } else if (s === 0) { // maça
      g.moveTo(cx, cy - sz * 0.55);
      g.bezierCurveTo(cx + sz * 0.9, cy + sz * 0.05, cx + sz * 0.35, cy + sz * 0.6, cx, cy + sz * 0.15);
      g.bezierCurveTo(cx - sz * 0.35, cy + sz * 0.6, cx - sz * 0.9, cy + sz * 0.05, cx, cy - sz * 0.55);
      g.moveTo(cx, cy + sz * 0.05); g.lineTo(cx + sz * 0.2, cy + sz * 0.55); g.lineTo(cx - sz * 0.2, cy + sz * 0.55); g.closePath();
    } else { // sinek
      const r = sz * 0.24;
      g.arc(cx, cy - sz * 0.25, r, 0, Math.PI * 2);
      g.moveTo(cx - sz * 0.22 + r, cy + sz * 0.08); g.arc(cx - sz * 0.25, cy + sz * 0.08, r, 0, Math.PI * 2);
      g.moveTo(cx + sz * 0.28 + r, cy + sz * 0.08); g.arc(cx + sz * 0.25, cy + sz * 0.08, r, 0, Math.PI * 2);
      g.moveTo(cx, cy); g.lineTo(cx + sz * 0.18, cy + sz * 0.55); g.lineTo(cx - sz * 0.18, cy + sz * 0.55); g.closePath();
    }
    g.fill();
  }

  Platform.register({
    id: 'solitaire', name: 'Solitaire', gen: 'retro', genre: 'Kart',
    colors: ['#16a34a', '#14532d'],
    desc: 'Klasik Klondike kart falı. Tüm kartları as\'tan papaza dizerek bitir.',
    help: '<ul><li>Masadaki sütunlarda kartları <b>büyükten küçüğe, renkleri değiştirerek</b> diz (kırmızı üstüne siyah).</li><li>Sağ üstteki 4 alana her türü <b>As\'tan Papaz\'a</b> sırayla yerleştir.</li><li>Boş sütuna yalnızca <b>Papaz (K)</b> konabilir.</li><li>Kartları <b>sürükleyip bırakabilir</b> ya da <b>dokunarak</b> otomatik en iyi yere gönderebilirsin.</li><li>Sol üstteki desteye dokunarak kart çek. Takılırsan <b>Geri Al</b> kullan.</li></ul>',
    options: [{ key: 'draw', label: 'KART ÇEKİMİ', choices: [['1', '1 kart'], ['3', '3 kart']], def: '1' }],
    bestKey: o => 'd' + o.draw,
    icon: '<rect x="8" y="12" width="28" height="40" rx="4" fill="#fff" transform="rotate(-12 22 32)"/><rect x="26" y="10" width="28" height="40" rx="4" fill="#fff" transform="rotate(10 40 30)"/><path d="M42 22c-6-5-11 2-6 7l6 6 6-6c5-5 0-12-6-7z" fill="#e11d48"/><text x="30" y="22" font-size="9" font-weight="900" fill="#e11d48" font-family="sans-serif" transform="rotate(10 40 30)">A</text>',
    create(s, o) {
      const W = 360, H = 610, CW = 47, CH = 66, GX = 3.5, MX = 4, TOPY = 8, TABY = 86;
      const view = s.canvas(W, H);
      const g = view.g;
      const drawN = +o.draw;
      const colX = i => MX + i * (CW + GX);
      const fx = new U.Particles();

      let cards = [];
      for (let su = 0; su < 4; su++) for (let r = 1; r <= 13; r++) cards.push({ s: su, r, up: false, ax: 0, ay: 0, at: -1 });
      U.shuffle(cards);
      const stock = [], waste = [], found = [[], [], [], []], tab = [[], [], [], [], [], [], []];
      let k = 0;
      for (let c = 0; c < 7; c++) for (let r = 0; r <= c; r++) { const cd = cards[k++]; cd.up = r === c; tab[c].push(cd); }
      while (k < 52) stock.push(cards[k++]);
      let score = 0, moves = 0, time = 0, undoStack = [], drag = null, won = false, autoRun = false, celebrate = 0;
      const now = () => performance.now();

      const ctrl = s.controls();
      const undoBtn = s.button(ctrl, '↶ Geri Al', undo);
      const autoBtn = s.button(ctrl, '⚡ Otomatik Bitir', startAuto, 'primary');
      autoBtn.style.display = 'none';
      const timeP = document.createElement('div'); timeP.className = 'pill'; ctrl.appendChild(timeP);
      const updTime = () => { timeP.textContent = '⏱ ' + U.fmtTime(time) + ' · ' + moves + ' hamle'; };
      updTime();

      function snapshot() {
        return { stock: stock.slice(), waste: waste.slice(), found: found.map(f => f.slice()), tab: tab.map(t => t.slice()), ups: cards.map(c => c.up), score, moves };
      }
      function restore(sn) {
        stock.length = 0; stock.push(...sn.stock);
        waste.length = 0; waste.push(...sn.waste);
        for (let i = 0; i < 4; i++) { found[i].length = 0; found[i].push(...sn.found[i]); }
        for (let i = 0; i < 7; i++) { tab[i].length = 0; tab[i].push(...sn.tab[i]); }
        cards.forEach((c, i) => { c.up = sn.ups[i]; });
        score = sn.score; moves = sn.moves;
      }
      function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 300) undoStack.shift(); }
      function undo() {
        if (!undoStack.length || autoRun || won) return;
        const before = positions();
        restore(undoStack.pop());
        animFrom(before, cards);
        s.score(score); updTime(); s.sfx('move'); refresh();
      }

      // yerleşim
      function tabOffsets(col) {
        const pile = tab[col];
        let down = 0, upc = 0;
        for (const c of pile) if (c.up) upc++; else down++;
        let fd = 8, fu = 21;
        const avail = H - TABY - CH - 6;
        const need = down * fd + Math.max(0, upc - 1) * fu;
        if (need > avail && upc > 1) fu = Math.max(9, (avail - down * fd) / (upc - 1));
        return { fd, fu };
      }
      function positions() {
        const map = new Map();
        stock.forEach((c, i) => map.set(c, { x: colX(0) + Math.min(i, 3) * 0.6, y: TOPY - Math.min(i, 3) * 0.6 }));
        const wn = waste.length;
        waste.forEach((c, i) => {
          const fromEnd = wn - 1 - i;
          const off = drawN === 3 ? Math.max(0, 2 - fromEnd) : 0;
          map.set(c, { x: colX(1) + off * 14, y: TOPY });
        });
        found.forEach((f, i) => f.forEach(c => map.set(c, { x: colX(3 + i), y: TOPY })));
        tab.forEach((pile, col) => {
          const { fd, fu } = tabOffsets(col);
          let y = TABY;
          pile.forEach(c => { map.set(c, { x: colX(col), y }); y += c.up ? fu : fd; });
        });
        return map;
      }
      function animFrom(before, list) {
        const t = now();
        for (const c of list) { const p = before.get(c); if (p) { c.ax = p.x; c.ay = p.y; c.at = t; } }
      }

      // kurallar
      function canFound(c, fi) {
        const f = found[fi];
        if (!f.length) return c.r === 1;
        const top = f[f.length - 1];
        return top.s === c.s && c.r === top.r + 1;
      }
      function canTab(c, col) {
        const p = tab[col];
        if (!p.length) return c.r === 13;
        const top = p[p.length - 1];
        return top.up && red(top.s) !== red(c.s) && c.r === top.r - 1;
      }
      function flipTops() {
        let flipped = false;
        for (const p of tab) if (p.length && !p[p.length - 1].up) { p[p.length - 1].up = true; score += 5; flipped = true; }
        if (flipped) s.sfx('flip');
      }
      // kaynak: {type:'waste'|'found'|'tab', idx, start}
      function takeCards(src) {
        if (src.type === 'waste') return [waste[waste.length - 1]];
        if (src.type === 'found') { const f = found[src.idx]; return [f[f.length - 1]]; }
        return tab[src.idx].slice(src.start);
      }
      function removeFrom(src) {
        if (src.type === 'waste') waste.pop();
        else if (src.type === 'found') found[src.idx].pop();
        else tab[src.idx].length = src.start;
      }
      function doMove(src, dst, didx) {
        const list = takeCards(src);
        const before = positions();
        pushUndo();
        removeFrom(src);
        if (dst === 'found') {
          found[didx].push(list[0]);
          score += src.type === 'found' ? 0 : 10;
          s.sfx('place');
        } else {
          tab[didx].push(...list);
          if (src.type === 'waste') score += 5;
          if (src.type === 'found') score = Math.max(0, score - 15);
          s.sfx('move');
        }
        moves++;
        flipTops();
        animFrom(before, cards);
        s.score(score); updTime();
        refresh();
        checkWin();
      }
      function draw() {
        if (autoRun || won) return;
        const before = positions();
        if (stock.length) {
          pushUndo();
          for (let i = 0; i < drawN && stock.length; i++) { const c = stock.pop(); c.up = true; waste.push(c); }
          s.sfx('flip');
        } else if (waste.length) {
          pushUndo();
          while (waste.length) { const c = waste.pop(); c.up = false; stock.push(c); }
          if (drawN === 1) score = Math.max(0, score - 20);
          s.sfx('drop');
        } else return;
        moves++;
        animFrom(before, cards);
        s.score(score); updTime();
        refresh();
      }
      function autoTarget(src) {
        const list = takeCards(src);
        const c = list[0];
        if (list.length === 1 && src.type !== 'found') for (let i = 0; i < 4; i++) if (canFound(c, i)) return ['found', i];
        // dolu sütunları tercih et; papazı boş sütuna sadece başka kart altındaysa taşı
        for (let col = 0; col < 7; col++) {
          if (src.type === 'tab' && col === src.idx) continue;
          if (tab[col].length && canTab(c, col)) return ['tab', col];
        }
        const kingAlone = src.type === 'tab' && src.start === 0;
        if (!kingAlone) for (let col = 0; col < 7; col++) {
          if (src.type === 'tab' && col === src.idx) continue;
          if (!tab[col].length && canTab(c, col)) return ['tab', col];
        }
        return null;
      }
      function canAuto() {
        if (stock.length || waste.length) return false;
        for (const p of tab) for (const c of p) if (!c.up) return false;
        return true;
      }
      function refresh() {
        undoBtn.disabled = !undoStack.length || autoRun || won;
        autoBtn.style.display = !won && !autoRun && canAuto() ? '' : 'none';
      }
      function startAuto() {
        if (autoRun || won || !canAuto()) return;
        autoRun = true; refresh();
        const stepA = () => {
          if (!s.alive) return;
          if (!s.active()) { s.timeout(stepA, 200); return; }
          for (let col = 0; col < 7; col++) {
            const p = tab[col];
            if (!p.length) continue;
            const c = p[p.length - 1];
            for (let i = 0; i < 4; i++) if (canFound(c, i)) {
              const before = positions();
              p.pop(); found[i].push(c); score += 10; moves++;
              animFrom(before, [c]);
              s.sfx('place'); s.score(score); updTime();
              checkWin();
              if (!won) s.timeout(stepA, 90);
              return;
            }
          }
          autoRun = false; refresh();
        };
        stepA();
      }
      function checkWin() {
        if (won) return;
        if (found.every(f => f.length === 13)) {
          won = true; autoRun = false; refresh();
          const bonus = Math.max(0, Math.round(1500 - time * 2));
          score += bonus; s.score(score);
          celebrate = 2.2;
          s.sfx('win'); s.vibe(120);
          s.over({ win: true, score, title: 'Kazandın!', msg: U.fmtTime(time) + ' sürede, ' + moves + ' hamlede bitirdin. Süre bonusu: +' + bonus, delay: 2200 });
        }
      }

      // giriş
      function hit(px, py) {
        // üst sıra
        if (py >= TOPY && py <= TOPY + CH) {
          if (px >= colX(0) && px <= colX(0) + CW) return { area: 'stock' };
          const wx = colX(1) + (drawN === 3 ? Math.min(2, Math.max(0, waste.length - 1)) * 14 : 0);
          if (waste.length && px >= wx && px <= wx + CW) return { src: { type: 'waste' } };
          for (let i = 0; i < 4; i++) if (px >= colX(3 + i) && px <= colX(3 + i) + CW && found[i].length) return { src: { type: 'found', idx: i } };
          return null;
        }
        if (py < TABY) return null;
        const col = Math.floor((px - MX + GX / 2) / (CW + GX));
        if (col < 0 || col > 6 || px < colX(col) || px > colX(col) + CW) return null;
        const pile = tab[col], pos = positions();
        for (let i = pile.length - 1; i >= 0; i--) {
          const p = pos.get(pile[i]);
          if (py >= p.y && py <= p.y + CH) {
            if (!pile[i].up) return null;
            return { src: { type: 'tab', idx: col, start: i } };
          }
        }
        return null;
      }
      function dropTarget(cx, cy, c, n) {
        let best = null, bd = 1e9;
        if (cy < TABY - 4 && n === 1) {
          for (let i = 0; i < 4; i++) {
            const d = Math.abs(cx - (colX(3 + i) + CW / 2));
            if (d < CW && canFound(c, i) && d < bd) { bd = d; best = ['found', i]; }
          }
        }
        if (!best) {
          const pos = positions();
          for (let col = 0; col < 7; col++) {
            const d = Math.abs(cx - (colX(col) + CW / 2));
            if (d > CW * 0.9) continue;
            const pile = tab[col];
            const topY = pile.length ? pos.get(pile[pile.length - 1]).y : TABY;
            if (cy < topY - CH * 0.7 && pile.length) continue;
            if (canTab(c, col) && d < bd) { bd = d; best = ['tab', col]; }
          }
        }
        return best;
      }
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || won || autoRun || drag) return;
        const p = view.pt(e);
        const h = hit(p.x, p.y);
        if (!h) return;
        if (h.area === 'stock') { draw(); return; }
        const list = takeCards(h.src);
        const pos = positions();
        const p0 = pos.get(list[0]);
        drag = { id: e.pointerId, src: h.src, list, ox: p.x - p0.x, oy: p.y - p0.y, sx: p.x, sy: p.y, x: p0.x, y: p0.y, moved: false, t: now() };
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      });
      s.on(view.cv, 'pointermove', e => {
        if (!drag || drag.id !== e.pointerId) return;
        const p = view.pt(e);
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 7) drag.moved = true;
        drag.x = p.x - drag.ox; drag.y = p.y - drag.oy;
      });
      const up = e => {
        if (!drag || drag.id !== e.pointerId) return;
        const d = drag; drag = null;
        if (!s.active()) return;
        if (!d.moved) {
          const t = autoTarget(d.src);
          if (t) doMove(d.src, t[0], t[1]);
          else s.sfx('error');
          return;
        }
        const c = d.list[0];
        const t = dropTarget(d.x + CW / 2, d.y + CH / 2, c, d.list.length);
        if (t && !(t[0] === 'tab' && d.src.type === 'tab' && t[1] === d.src.idx)) doMove(d.src, t[0], t[1]);
        else {
          // geri dön animasyonu
          const tm = now();
          d.list.forEach((cd, i) => { cd.ax = d.x; cd.ay = d.y + i * 20; cd.at = tm; });
        }
      };
      s.on(view.cv, 'pointerup', up);
      s.on(view.cv, 'pointercancel', e => { if (drag && drag.id === e.pointerId) drag = null; });

      refresh();

      // çizim
      function cardFace(c, x, y) {
        g.fillStyle = 'rgba(0,0,0,.25)'; U.rr(g, x + 1, y + 2, CW, CH, 5); g.fill();
        if (!c.up) {
          const gr = g.createLinearGradient(x, y, x + CW, y + CH);
          gr.addColorStop(0, '#3b5bdb'); gr.addColorStop(1, '#5f3dc4');
          g.fillStyle = gr; U.rr(g, x, y, CW, CH, 5); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5; U.rr(g, x + 3, y + 3, CW - 6, CH - 6, 3); g.stroke();
          g.save();
          U.rr(g, x + 4, y + 4, CW - 8, CH - 8, 3); g.clip();
          g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1;
          g.beginPath();
          for (let k = -CH; k < CW + CH; k += 7) { g.moveTo(x + k, y); g.lineTo(x + k + CH, y + CH); g.moveTo(x + k + CH, y); g.lineTo(x + k, y + CH); }
          g.stroke();
          g.restore();
          return;
        }
        g.fillStyle = '#fffdf8'; U.rr(g, x, y, CW, CH, 5); g.fill();
        g.strokeStyle = '#d6d3d1'; g.lineWidth = 0.8; g.stroke();
        const col = red(c.s) ? '#dc2626' : '#1c1917';
        U.text(g, RANKS[c.r], x + 4, y + 10, c.r === 10 ? 12 : 13.5, col, 'left', 900);
        g.fillStyle = col;
        suitPath(g, c.s, x + CW - 9, y + 10, 11);
        if (c.r > 10) {
          g.fillStyle = red(c.s) ? 'rgba(220,38,38,.1)' : 'rgba(28,25,23,.08)';
          U.rr(g, x + 6, y + 22, CW - 12, CH - 27, 4); g.fill();
          U.text(g, RANKS[c.r], x + CW / 2, y + CH / 2 + 10, 22, col, 'center', 900);
        } else {
          g.fillStyle = col;
          suitPath(g, c.s, x + CW / 2, y + CH / 2 + 8, 26);
        }
      }
      function slot(x, y, label) {
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5;
        U.rr(g, x + 1, y + 1, CW - 2, CH - 2, 5); g.stroke();
        if (label) U.text(g, label, x + CW / 2, y + CH / 2, 18, 'rgba(255,255,255,.3)');
      }
      function drawCardAt(c, p, tnow) {
        let x = p.x, y = p.y;
        if (c.at >= 0) {
          const k = (tnow - c.at) / 170;
          if (k < 1) { const e = U.easeOut(k); x = U.lerp(c.ax, p.x, e); y = U.lerp(c.ay, p.y, e); }
          else c.at = -1;
        }
        cardFace(c, x, y);
        return c.at >= 0;
      }

      s.loop(dt => {
        fx.update(dt);
        if (!won) {
          const b4 = Math.floor(time);
          time += dt;
          if (Math.floor(time) !== b4) updTime();
        }
      }, dt => {
        const bg = g.createRadialGradient(W / 2, H * 0.35, 40, W / 2, H / 2, H * 0.8);
        bg.addColorStop(0, '#1f7a46'); bg.addColorStop(1, '#0b3d22');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        slot(colX(0), TOPY, stock.length ? '' : '↻');
        slot(colX(1), TOPY, '');
        for (let i = 0; i < 4; i++) slot(colX(3 + i), TOPY, 'A');
        for (let i = 0; i < 7; i++) slot(colX(i), TABY, 'K');
        const pos = positions();
        const tnow = now();
        const dragSet = new Set(drag && drag.moved ? drag.list : []);
        const moving = [];
        const order = [].concat(stock, found[0], found[1], found[2], found[3], ...tab, waste);
        // destede sadece üstteki birkaç kartı çiz
        for (const c of order) {
          if (dragSet.has(c)) continue;
          if (c.at >= 0 && (tnow - c.at) < 170) { moving.push(c); continue; }
          if (stock.indexOf(c) >= 0 && stock.indexOf(c) < stock.length - 3) continue;
          drawCardAt(c, pos.get(c), tnow);
        }
        for (const c of moving) drawCardAt(c, pos.get(c), tnow);
        if (stock.length) U.text(g, String(stock.length), colX(0) + CW / 2, TOPY + CH + 8, 10, 'rgba(255,255,255,.6)');
        if (drag && drag.moved) {
          drag.list.forEach((c, i) => {
            g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 14; g.shadowOffsetY = 6;
            cardFace(c, drag.x, drag.y + i * 21);
            g.restore();
          });
        }
        if (celebrate > 0) {
          celebrate -= dt || 0.016;
          if (Math.random() < 0.6) fx.burst(U.rand(20, W - 20), U.rand(40, H / 2), ['#facc15', '#f472b6', '#60a5fa', '#4ade80', '#fff'], 14, 220, 1.1, 4, 200);
          if (!s.active()) fx.update(dt || 0.016);
        }
        fx.draw(g);
      });
      return {};
    }
  });
})();
