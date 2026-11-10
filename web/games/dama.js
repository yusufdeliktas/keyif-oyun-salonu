/* Dama (Türk daması) */
(function () {
  const U = Platform.util;
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  /* ---------- kurallar ---------- */
  function initial() {
    const b = new Array(64).fill(null);
    for (let c = 0; c < 8; c++) { b[8 + c] = 'b'; b[16 + c] = 'b'; b[40 + c] = 'w'; b[48 + c] = 'w'; }
    return b;
  }
  const own = (p, side) => p && p.toLowerCase() === side;
  const enemy = (p, side) => p && p.toLowerCase() !== side;
  const isKing = p => p === 'W' || p === 'B';

  function gen(b, side) {
    const fwd = side === 'w' ? -1 : 1;
    let caps = [], best = 0;
    const simple = [];
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!own(p, side)) continue;
      const king = isKing(p);
      // alma dizileri
      b[i] = null;
      const found = [];
      const dfs = (pos, path, taken, lastDir) => {
        let any = false;
        const r = pos >> 3, c = pos & 7;
        for (let d = 0; d < 4; d++) {
          const [dr, dc] = DIRS[d];
          if (!king && dr === -fwd) continue; // taş geri gidemez
          if (king && lastDir >= 0 && DIRS[lastDir][0] === -dr && DIRS[lastDir][1] === -dc) continue; // 180° dönüş yok
          if (king) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr * 8 + nc]) { nr += dr; nc += dc; }
            if (!(nr >= 0 && nr < 8 && nc >= 0 && nc < 8)) continue;
            const ei = nr * 8 + nc;
            if (!enemy(b[ei], side)) continue;
            let lr = nr + dr, lc = nc + dc;
            while (lr >= 0 && lr < 8 && lc >= 0 && lc < 8 && !b[lr * 8 + lc]) {
              const li = lr * 8 + lc;
              const ep = b[ei];
              b[ei] = null;
              any = true;
              dfs(li, path.concat(li), taken.concat(ei), d);
              b[ei] = ep;
              lr += dr; lc += dc;
            }
          } else {
            const ar = r + dr, ac = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
            if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
            const ai = ar * 8 + ac, li = lr * 8 + lc;
            if (!enemy(b[ai], side) || b[li]) continue;
            const ep = b[ai];
            b[ai] = null;
            any = true;
            dfs(li, path.concat(li), taken.concat(ai), d);
            b[ai] = ep;
          }
        }
        if (!any && taken.length) found.push({ f: i, path, caps: taken, p });
      };
      dfs(i, [], [], -1);
      b[i] = p;
      for (const m of found) {
        if (m.caps.length > best) { best = m.caps.length; caps = [m]; }
        else if (m.caps.length === best) caps.push(m);
      }
      if (best === 0) {
        const r = i >> 3, c = i & 7;
        for (const [dr, dc] of DIRS) {
          if (!king && dr === -fwd) continue;
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr * 8 + nc]) {
            simple.push({ f: i, path: [nr * 8 + nc], caps: [], p });
            if (!king) break;
            nr += dr; nc += dc;
          }
        }
      }
    }
    return best > 0 ? caps : simple;
  }
  function apply(b, m) {
    const nb = b.slice();
    nb[m.f] = null;
    for (const c of m.caps) nb[c] = null;
    const to = m.path[m.path.length - 1];
    let p = m.p;
    const r = to >> 3;
    if (p === 'w' && r === 0) p = 'W';
    if (p === 'b' && r === 7) p = 'B';
    nb[to] = p;
    return nb;
  }
  function evaluate(b, side) {
    let s = 0, w = 0, bl = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const r = i >> 3, c = i & 7;
      const center = (c >= 2 && c <= 5) ? 4 : 0;
      if (p === 'w') { s += 100 + (6 - r) * 6 + center; w++; }
      else if (p === 'W') { s += 340; w++; }
      else if (p === 'b') { s -= 100 + (r - 1) * 6 + center; bl++; }
      else if (p === 'B') { s -= 340; bl++; }
    }
    // önde olan taraf takas yapmayı sevsin
    if (w > bl) s += (16 - bl) * 4; else if (bl > w) s -= (16 - w) * 4;
    return side === 'w' ? s : -s;
  }
  const ABORT = {};
  function think(b, side, depth, time, noise) {
    const deadline = Date.now() + time;
    let nodes = 0;
    const other = s => (s === 'w' ? 'b' : 'w');
    function nm(bd, sd, d, a, be, ply) {
      if ((++nodes & 511) === 0 && Date.now() > deadline) throw ABORT;
      const ms = gen(bd, sd);
      if (!ms.length) return -100000 + ply;
      const capt = ms[0].caps.length > 0;
      if (d <= 0 && (!capt || ply > 18)) return evaluate(bd, sd);
      let best = -Infinity;
      for (const m of ms) {
        const sc = -nm(apply(bd, m), other(sd), d - 1, -be, -a, ply + 1);
        if (sc > best) best = sc;
        if (sc > a) a = sc;
        if (a >= be) break;
      }
      return best;
    }
    const root = gen(b, side);
    if (!root.length) return null;
    if (root.length === 1) return root[0];
    let bestMove = root[0], scored = null;
    for (let d = 1; d <= depth; d++) {
      try {
        const res = [];
        for (const m of root) res.push({ m, sc: -nm(apply(b, m), other(side), d - 1, -Infinity, Infinity, 1) });
        res.sort((x, y) => y.sc - x.sc);
        scored = res; bestMove = res[0].m;
        root.sort((x, y) => res.findIndex(r => r.m === x) - res.findIndex(r => r.m === y));
      } catch (e) { if (e !== ABORT) throw e; break; }
    }
    if (noise && scored) {
      const pool = scored.filter(x => x.sc >= scored[0].sc - noise);
      return U.pick(pool).m;
    }
    return bestMove;
  }

  /* ---------- oyun ---------- */
  Platform.register({
    id: 'dama', name: 'Dama', gen: 'retro', genre: 'Strateji',
    colors: ['#dc2626', '#450a0a'], bestMode: 'wins',
    desc: 'Klasik Türk daması: taşlar ileri ve yana gider, almak zorunludur.',
    help: '<ul><li>Taşlar <b>bir kare ileri veya yana</b> gider, geri gidemez.</li><li>Rakip taşın üzerinden atlayarak alırsın. <b>Almak zorunludur</b> ve en çok taş alan hamle seçilmelidir.</li><li>Son sıraya ulaşan taş <b>dama</b> olur: dikey ve yatayda istediği kadar ilerler, uzaktan alır (bir alma dizisinde geri dönemez).</li><li>Tüm taşları alınan veya hamle yapamayan taraf kaybeder. Beyaz başlar.</li></ul>',
    options: [{ key: 'mode', label: 'RAKİP', choices: [['easy', 'Kolay'], ['mid', 'Orta'], ['hard', 'Zor'], ['pvp', '2 Oyuncu']], def: 'mid' }],
    bestKey: o => o.mode,
    icon: '<rect x="4" y="4" width="56" height="56" rx="8" fill="#7c2d12"/><path d="M4 18h56M4 32h56M4 46h56M18 4v56M32 4v56M46 4v56" stroke="#9a3412" stroke-width="1.5"/><circle cx="25" cy="39" r="9" fill="#f5f5f4" stroke="#a8a29e" stroke-width="2"/><circle cx="39" cy="25" r="9" fill="#1c1917" stroke="#57534e" stroke-width="2"/><circle cx="39" cy="25" r="4" fill="none" stroke="#fbbf24" stroke-width="2"/><circle cx="25" cy="39" r="4" fill="none" stroke="#d6d3d1" stroke-width="2"/>',
    create(s, o) {
      const W = 360, H = 452, S = 45, BY = 47;
      const view = s.canvas(W, H);
      const g = view.g;
      const pvp = o.mode === 'pvp';
      const human = 'w';
      const AI = { easy: [2, 500, 60], mid: [4, 1000, 0], hard: [7, 1800, 0] }[o.mode];
      let b = initial(), turn = 'w', legal = gen(b, 'w');
      let sel = -1, chosen = [], cand = [], anim = null, thinking = false, over = false, last = null, quiet = 0;
      const history = [];
      const fx = new U.Particles();

      const ctrl = s.controls();
      const undoBtn = s.button(ctrl, '↶ Geri Al', undo);
      const info = document.createElement('div');
      info.className = 'pill';
      ctrl.appendChild(info);

      const humanTurn = () => pvp || turn === human;
      function sqAt(px, py) {
        const c = Math.floor(px / S), r = Math.floor((py - BY) / S);
        return c < 0 || c > 7 || r < 0 || r > 7 ? -1 : r * 8 + c;
      }
      const pos = i => ({ x: (i & 7) * S + S / 2, y: BY + (i >> 3) * S + S / 2 });
      function count(side) { let n = 0; for (const p of b) if (own(p, side)) n++; return n; }
      function updUI() {
        undoBtn.disabled = thinking || !!anim || !history.length || (!pvp && !history.some(h => h.turn === human));
        const mustCap = legal.length && legal[0].caps.length;
        info.textContent = over ? 'Oyun bitti' : (thinking ? 'Bilgisayar düşünüyor…' : (mustCap ? '⚠ Almak zorunlu' : (turn === 'w' ? 'Sıra: Beyaz' : 'Sıra: Siyah')));
      }
      function finishMove(m) {
        history.push({ b: b.slice(), turn, last, quiet });
        const wasKing = isKing(m.p);
        b = apply(b, m);
        if (m.caps.length || !wasKing) quiet = 0; else quiet++;
        const to = m.path[m.path.length - 1];
        if (!wasKing && isKing(b[to])) { s.sfx('power'); const p = pos(to); fx.burst(p.x, p.y, ['#fbbf24', '#fff'], 20, 160, 0.6, 3); }
        last = { f: m.f, t: to };
        turn = turn === 'w' ? 'b' : 'w';
        legal = gen(b, turn);
        sel = -1; chosen = []; cand = [];
        checkEnd();
        updUI();
        if (!over && !humanTurn()) scheduleAI();
      }
      function checkEnd() {
        let winner = null, why = '';
        if (!count(turn)) { winner = turn === 'w' ? 'b' : 'w'; why = 'Tüm taşlar alındı.'; }
        else if (!legal.length) { winner = turn === 'w' ? 'b' : 'w'; why = 'Hamle yapacak taş kalmadı.'; }
        else if (quiet >= 60) {
          over = true;
          s.over({ win: false, count: false, emoji: '🤝', title: 'Berabere', msg: 'Uzun süre alma ya da taş hamlesi olmadı.', delay: 700 });
          return;
        }
        if (!winner) return;
        over = true;
        if (pvp) s.over({ win: false, count: false, emoji: '🏁', title: (winner === 'w' ? 'Beyaz' : 'Siyah') + ' kazandı!', msg: why, delay: 800 });
        else if (winner === human) s.over({ win: true, title: 'Kazandın!', msg: why, delay: 800 });
        else { s.over({ win: false, emoji: '😔', title: 'Kaybettin', msg: why, delay: 800 }); s.sfx('lose'); }
      }
      // yol boyunca animasyon (adım adım atlama)
      function animate(m, fromStep, toStep, done) {
        const pts = [m.f].concat(m.path);
        anim = { m, seg: fromStep, end: toStep, t: 0, pts, done };
      }
      function scheduleAI() {
        thinking = true; updUI();
        const go = () => {
          if (!s.alive || over) return;
          if (!s.active() || anim) { s.timeout(go, 250); return; }
          const m = think(b, turn, AI[0], AI[1], AI[2]);
          thinking = false;
          if (!m) { updUI(); return; }
          sel = m.f; chosen = []; cand = [m];
          animate(m, 0, m.path.length, () => finishMove(m));
          updUI();
        };
        s.timeout(go, 350);
      }
      function undo() {
        if (thinking || anim || !history.length) return;
        let h = history.pop();
        if (!pvp) { while (h.turn !== human && history.length) h = history.pop(); if (h.turn !== human) { history.push(h); return; } }
        b = h.b.slice(); turn = h.turn; last = h.last; quiet = h.quiet;
        legal = gen(b, turn); sel = -1; chosen = []; cand = []; over = false;
        s.sfx('move'); updUI();
      }

      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || over || thinking || anim || !humanTurn()) return;
        const p = view.pt(e);
        const i = sqAt(p.x, p.y);
        if (i < 0) return;
        if (sel >= 0) {
          const k = chosen.length;
          const next = cand.filter(m => m.path[k] === i);
          if (next.length) {
            cand = next;
            chosen.push(i);
            const m = cand[0];
            s.sfx(m.caps.length ? 'capture' : 'place');
            if (m.caps.length) { const q = pos(m.caps[k]); fx.burst(q.x, q.y, ['#fde68a', '#fff'], 10, 120, 0.4, 3); }
            const complete = cand.find(x => x.path.length === chosen.length);
            animate(m, k, k + 1, () => {
              if (complete) finishMove(complete);
              else updUI();
            });
            return;
          }
          if (chosen.length) return; // çoklu almada devam etmek zorunlu
        }
        const mine = legal.filter(m => m.f === i);
        if (mine.length) { sel = i; cand = mine; chosen = []; s.sfx('tick'); }
        else {
          if (own(b[i], turn) && legal.length && legal[0].caps.length) { s.toast('Almak zorunlu! Alma yapabilen taşı seç.', 1300); s.sfx('error'); }
          sel = -1; cand = []; chosen = [];
        }
      });

      updUI();

      function drawDisc(x, y, p, alpha) {
        const white = p.toLowerCase() === 'w';
        g.globalAlpha = alpha == null ? 1 : alpha;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + 1.5, y + 3, S * 0.4, 0, Math.PI * 2); g.fill();
        const gr = g.createRadialGradient(x - 5, y - 6, 2, x, y, S * 0.42);
        if (white) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d6d3d1'); }
        else { gr.addColorStop(0, '#57534e'); gr.addColorStop(1, '#0c0a09'); }
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, S * 0.4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = white ? '#a8a29e' : '#000'; g.lineWidth = 1.5; g.stroke();
        g.strokeStyle = white ? 'rgba(120,113,108,.5)' : 'rgba(255,255,255,.15)';
        g.beginPath(); g.arc(x, y, S * 0.27, 0, Math.PI * 2); g.stroke();
        if (isKing(p)) {
          g.fillStyle = '#f59e0b';
          g.beginPath();
          const w = S * 0.32, h = S * 0.2, yy = y + 4;
          g.moveTo(x - w / 2, yy); g.lineTo(x - w / 2, yy - h); g.lineTo(x - w / 4, yy - h * 0.45); g.lineTo(x, yy - h * 1.15); g.lineTo(x + w / 4, yy - h * 0.45); g.lineTo(x + w / 2, yy - h); g.lineTo(x + w / 2, yy); g.closePath(); g.fill();
        }
        g.globalAlpha = 1;
      }

      s.loop(dt => { fx.update(dt); }, dt => {
        if (anim) {
          anim.t += (dt || 0.016) / 0.2;
          if (anim.t >= 1) {
            anim.seg++; anim.t = 0;
            if (anim.seg >= anim.end) { const d = anim.done; anim = null; d(); }
          }
        }
        g.fillStyle = '#1c1210'; g.fillRect(0, 0, W, H);
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          g.fillStyle = (r + c) % 2 ? '#c08552' : '#e8c9a0';
          g.fillRect(c * S, BY + r * S, S, S);
        }
        if (last) for (const i of [last.f, last.t]) { g.fillStyle = 'rgba(250,204,21,.35)'; g.fillRect((i & 7) * S, BY + (i >> 3) * S, S, S); }
        if (sel >= 0) { g.fillStyle = 'rgba(46,229,157,.45)'; g.fillRect((sel & 7) * S, BY + (sel >> 3) * S, S, S); }
        // alma yapabilen taşları göster
        const mustCap = !over && humanTurn() && legal.length && legal[0].caps.length;
        // ele geçirilen (işaretlenmiş) taşlar
        const doneCaps = new Set();
        const curM = cand[0];
        let movingIdx = -1, stepsDone = 0;
        if (sel >= 0 && curM && (anim || chosen.length)) {
          movingIdx = sel;
          stepsDone = anim ? anim.seg : chosen.length;
          for (let k = 0; k < stepsDone && k < curM.caps.length; k++) doneCaps.add(curM.caps[k]);
        }
        for (let i = 0; i < 64; i++) {
          const p = b[i];
          if (!p || i === movingIdx) continue;
          const q = pos(i);
          drawDisc(q.x, q.y, p, doneCaps.has(i) ? 0.25 : 1);
          if (mustCap && legal.some(m => m.f === i) && sel < 0) {
            g.strokeStyle = 'rgba(244,63,94,' + (0.6 + Math.sin(performance.now() / 150) * 0.3) + ')'; g.lineWidth = 3;
            g.beginPath(); g.arc(q.x, q.y, S * 0.46, 0, Math.PI * 2); g.stroke();
          }
        }
        // hareket eden taş
        if (movingIdx >= 0) {
          const pts = [curM.f].concat(curM.path);
          let x, y;
          if (anim) {
            const a = pos(pts[anim.seg]), bb = pos(pts[anim.seg + 1]), e = U.easeOut(anim.t);
            x = U.lerp(a.x, bb.x, e); y = U.lerp(a.y, bb.y, e) - Math.sin(e * Math.PI) * (curM.caps.length ? 12 : 4);
          } else { const q = pos(pts[chosen.length]); x = q.x; y = q.y; }
          drawDisc(x, y, b[movingIdx] || curM.p);
        }
        // hedef kareler
        if (sel >= 0 && !anim && humanTurn() && !thinking) {
          const k = chosen.length;
          const seen = new Set();
          for (const m of cand) {
            const t = m.path[k];
            if (t == null || seen.has(t)) continue;
            seen.add(t);
            const q = pos(t);
            g.fillStyle = m.caps.length ? 'rgba(244,63,94,.6)' : 'rgba(20,20,20,.35)';
            g.beginPath(); g.arc(q.x, q.y, S * 0.15, 0, Math.PI * 2); g.fill();
          }
        }
        fx.draw(g);
        // şeritler
        const strip = (side, y) => {
          const turnOn = turn === side && !over;
          g.fillStyle = turnOn ? 'rgba(250,204,21,.16)' : 'rgba(255,255,255,.04)';
          U.rr(g, 2, y, W - 4, 40, 10); g.fill();
          const label = pvp ? (side === 'w' ? 'Beyaz' : 'Siyah') : (side === human ? 'Sen (Beyaz)' : 'Bilgisayar (Siyah)');
          U.text(g, label + (turnOn ? ' · sıra' : ''), 12, y + 20, 13, turnOn ? '#fde68a' : '#d6d3d1', 'left');
          U.text(g, count(side) + ' taş', W - 12, y + 20, 13, '#e7e5e4', 'right');
        };
        strip('b', 3);
        strip('w', BY + 8 * S + 3);
      });
      return {};
    }
  });
  Platform._dama = { initial, gen, apply, think };
})();
