/* Satranç - tam kurallar + alfa-beta yapay zeka */
(function () {
  const U = Platform.util;

  /* ================= MOTOR ================= */
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
  };
  const isW = p => p < 'a';

  function initial() {
    const b = new Array(64).fill(null);
    const back = 'rnbqkbnr';
    for (let c = 0; c < 8; c++) {
      b[c] = back[c]; b[8 + c] = 'p';
      b[48 + c] = 'P'; b[56 + c] = back[c].toUpperCase();
    }
    return { b, turn: 'w', cr: 15, ep: -1, half: 0, wk: 60, bk: 4 };
  }
  function clone(st) { return { b: st.b.slice(), turn: st.turn, cr: st.cr, ep: st.ep, half: st.half, wk: st.wk, bk: st.bk }; }

  function attacked(b, sq, byWhite) {
    const r = sq >> 3, c = sq & 7;
    if (byWhite) {
      if (r < 7) { if (c > 0 && b[sq + 7] === 'P') return true; if (c < 7 && b[sq + 9] === 'P') return true; }
    } else if (r > 0) { if (c > 0 && b[sq - 9] === 'p') return true; if (c < 7 && b[sq - 7] === 'p') return true; }
    const N = byWhite ? 'N' : 'n', K = byWhite ? 'K' : 'k', B = byWhite ? 'B' : 'b', R = byWhite ? 'R' : 'r', Q = byWhite ? 'Q' : 'q';
    for (const [dr, dc] of KN) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr * 8 + nc] === N) return true; }
    for (const [dr, dc] of KG) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr * 8 + nc] === K) return true; }
    for (const [dr, dc] of DIAG) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) { const p = b[nr * 8 + nc]; if (p) { if (p === B || p === Q) return true; break; } nr += dr; nc += dc; }
    }
    for (const [dr, dc] of ORTH) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) { const p = b[nr * 8 + nc]; if (p) { if (p === R || p === Q) return true; break; } nr += dr; nc += dc; }
    }
    return false;
  }
  function inCheck(st, side) { return attacked(st.b, side === 'w' ? st.wk : st.bk, side !== 'w'); }

  function gen(st, capsOnly) {
    const b = st.b, mv = [], white = st.turn === 'w';
    const pawnAdd = (f, t, p, cap) => {
      const tr = t >> 3;
      if (tr === 0 || tr === 7) { for (const pr of ['q', 'n', 'r', 'b']) mv.push({ f, t, p, c: cap, pr, fl: 0 }); }
      else mv.push({ f, t, p, c: cap, pr: null, fl: 0 });
    };
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p || isW(p) !== white) continue;
      const r = i >> 3, c = i & 7, t = p.toLowerCase();
      if (t === 'p') {
        const d = white ? -1 : 1, nr = r + d;
        if (nr < 0 || nr > 7) continue;
        const fwd = nr * 8 + c;
        if (!b[fwd]) {
          if (!capsOnly || nr === 0 || nr === 7) pawnAdd(i, fwd, p, null);
          if (!capsOnly && r === (white ? 6 : 1) && !b[(r + 2 * d) * 8 + c]) mv.push({ f: i, t: (r + 2 * d) * 8 + c, p, c: null, pr: null, fl: 3 });
        }
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (nc < 0 || nc > 7) continue;
          const to = nr * 8 + nc, q = b[to];
          if (q && isW(q) !== white) pawnAdd(i, to, p, q);
          else if (!q && to === st.ep) mv.push({ f: i, t: to, p, c: white ? 'p' : 'P', pr: null, fl: 1 });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, dc] of (t === 'n' ? KN : KG)) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
          const to = nr * 8 + nc, q = b[to];
          if (!q) { if (!capsOnly) mv.push({ f: i, t: to, p, c: null, pr: null, fl: 0 }); }
          else if (isW(q) !== white) mv.push({ f: i, t: to, p, c: q, pr: null, fl: 0 });
        }
        if (t === 'k' && !capsOnly) {
          if (white && i === 60) {
            if ((st.cr & 1) && b[63] === 'R' && !b[61] && !b[62] && !attacked(b, 60, false) && !attacked(b, 61, false) && !attacked(b, 62, false)) mv.push({ f: 60, t: 62, p, c: null, pr: null, fl: 2 });
            if ((st.cr & 2) && b[56] === 'R' && !b[57] && !b[58] && !b[59] && !attacked(b, 60, false) && !attacked(b, 59, false) && !attacked(b, 58, false)) mv.push({ f: 60, t: 58, p, c: null, pr: null, fl: 2 });
          } else if (!white && i === 4) {
            if ((st.cr & 4) && b[7] === 'r' && !b[5] && !b[6] && !attacked(b, 4, true) && !attacked(b, 5, true) && !attacked(b, 6, true)) mv.push({ f: 4, t: 6, p, c: null, pr: null, fl: 2 });
            if ((st.cr & 8) && b[0] === 'r' && !b[1] && !b[2] && !b[3] && !attacked(b, 4, true) && !attacked(b, 3, true) && !attacked(b, 2, true)) mv.push({ f: 4, t: 2, p, c: null, pr: null, fl: 2 });
          }
        }
      } else {
        const dirs = t === 'b' ? DIAG : t === 'r' ? ORTH : KG;
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const to = nr * 8 + nc, q = b[to];
            if (!q) { if (!capsOnly) mv.push({ f: i, t: to, p, c: null, pr: null, fl: 0 }); }
            else { if (isW(q) !== white) mv.push({ f: i, t: to, p, c: q, pr: null, fl: 0 }); break; }
            nr += dr; nc += dc;
          }
        }
      }
    }
    return mv;
  }

  function make(st, m) {
    const b = st.b;
    const u = { m, cr: st.cr, ep: st.ep, half: st.half };
    b[m.f] = null;
    if (m.fl === 1) b[(m.f & ~7) | (m.t & 7)] = null;
    b[m.t] = m.pr ? (isW(m.p) ? m.pr.toUpperCase() : m.pr) : m.p;
    if (m.fl === 2) {
      if (m.t === 62) { b[61] = b[63]; b[63] = null; } else if (m.t === 58) { b[59] = b[56]; b[56] = null; }
      else if (m.t === 6) { b[5] = b[7]; b[7] = null; } else if (m.t === 2) { b[3] = b[0]; b[0] = null; }
    }
    let cr = st.cr;
    if (m.p === 'K') cr &= ~3; else if (m.p === 'k') cr &= ~12;
    if (m.f === 63 || m.t === 63) cr &= ~1;
    if (m.f === 56 || m.t === 56) cr &= ~2;
    if (m.f === 7 || m.t === 7) cr &= ~4;
    if (m.f === 0 || m.t === 0) cr &= ~8;
    st.cr = cr;
    st.ep = m.fl === 3 ? (m.f + m.t) >> 1 : -1;
    st.half = (m.p === 'P' || m.p === 'p' || m.c) ? 0 : st.half + 1;
    if (m.p === 'K') st.wk = m.t; else if (m.p === 'k') st.bk = m.t;
    st.turn = st.turn === 'w' ? 'b' : 'w';
    return u;
  }
  function unmake(st, u) {
    const m = u.m, b = st.b;
    st.turn = st.turn === 'w' ? 'b' : 'w';
    st.cr = u.cr; st.ep = u.ep; st.half = u.half;
    b[m.f] = m.p;
    b[m.t] = null;
    if (m.fl === 1) b[(m.f & ~7) | (m.t & 7)] = m.c;
    else if (m.c) b[m.t] = m.c;
    if (m.fl === 2) {
      if (m.t === 62) { b[63] = b[61]; b[61] = null; } else if (m.t === 58) { b[56] = b[59]; b[59] = null; }
      else if (m.t === 6) { b[7] = b[5]; b[5] = null; } else if (m.t === 2) { b[0] = b[3]; b[3] = null; }
    }
    if (m.p === 'K') st.wk = m.f; else if (m.p === 'k') st.bk = m.f;
  }
  function legal(st) {
    const side = st.turn, out = [];
    for (const m of gen(st, false)) {
      const u = make(st, m);
      if (!inCheck(st, side)) out.push(m);
      unmake(st, u);
    }
    return out;
  }
  function evaluate(st) {
    const b = st.b;
    let s = 0, npm = 0, wkm = 0, wke = 0, bkm = 0, bke = 0, wb = 0, bb = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const t = p.toLowerCase();
      if (isW(p)) {
        if (t === 'k') { wkm = PST.k[i]; wke = PST.ke[i]; continue; }
        s += VAL[t] + PST[t][i];
        if (t !== 'p') npm += VAL[t];
        if (t === 'b') wb++;
      } else {
        const mi = (7 - (i >> 3)) * 8 + (i & 7);
        if (t === 'k') { bkm = PST.k[mi]; bke = PST.ke[mi]; continue; }
        s -= VAL[t] + PST[t][mi];
        if (t !== 'p') npm += VAL[t];
        if (t === 'b') bb++;
      }
    }
    if (wb >= 2) s += 30;
    if (bb >= 2) s -= 30;
    const eg = npm <= 2600 ? 1 : 0;
    s += eg ? (wke - bke) : (wkm - bkm);
    return s;
  }
  const MATE = 100000, ABORT = {};
  function orderScore(m) {
    let s = 0;
    if (m.c) s += 10 * VAL[m.c.toLowerCase()] - VAL[m.p.toLowerCase()] + 1000;
    if (m.pr) s += VAL[m.pr] + 800;
    return s;
  }
  function sortMoves(ms, first) {
    for (const m of ms) m._o = orderScore(m) + (first && m.f === first.f && m.t === first.t && m.pr === first.pr ? 1e6 : 0);
    ms.sort((a, b) => b._o - a._o);
  }
  function think(st0, opt) {
    const st = clone(st0);
    const deadline = Date.now() + (opt.time || 1500);
    let nodes = 0;
    const tick = () => { if ((++nodes & 1023) === 0 && Date.now() > deadline) throw ABORT; };
    function quiesce(alpha, beta, ply) {
      tick();
      const stand = (st.turn === 'w' ? 1 : -1) * evaluate(st);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (ply > 30) return stand;
      const side = st.turn;
      const ms = gen(st, true);
      sortMoves(ms);
      for (const m of ms) {
        const u = make(st, m);
        if (inCheck(st, side)) { unmake(st, u); continue; }
        const sc = -quiesce(-beta, -alpha, ply + 1);
        unmake(st, u);
        if (sc >= beta) return sc;
        if (sc > alpha) alpha = sc;
      }
      return alpha;
    }
    function negamax(depth, alpha, beta, ply) {
      tick();
      if (st.half >= 100) return 0;
      const side = st.turn;
      const chk = inCheck(st, side);
      if (chk && ply < 14) depth++;
      if (depth <= 0) return quiesce(alpha, beta, ply);
      const ms = gen(st, false);
      sortMoves(ms);
      let best = -Infinity, cnt = 0;
      for (const m of ms) {
        const u = make(st, m);
        if (inCheck(st, side)) { unmake(st, u); continue; }
        cnt++;
        const sc = -negamax(depth - 1, -beta, -alpha, ply + 1);
        unmake(st, u);
        if (sc > best) best = sc;
        if (sc > alpha) alpha = sc;
        if (alpha >= beta) break;
      }
      if (!cnt) return chk ? -MATE + ply : 0;
      return best;
    }
    const root = legal(st);
    if (!root.length) return null;
    if (root.length === 1) return root[0];
    let bestMove = root[0], scored = null;
    for (let d = 1; d <= opt.depth; d++) {
      try {
        sortMoves(root, bestMove);
        const res = [];
        let alpha = -Infinity;
        for (const m of root) {
          const u = make(st, m);
          // tam pencere: rastgele seçim için tüm skorlar gerekli
          const sc = opt.noise ? -negamax(d - 1, -Infinity, Infinity, 1) : -negamax(d - 1, -Infinity, -alpha, 1);
          unmake(st, u);
          res.push({ m, sc });
          if (sc > alpha) alpha = sc;
        }
        res.sort((a, b) => b.sc - a.sc);
        scored = res;
        bestMove = res[0].m;
        if (Math.abs(res[0].sc) > MATE - 100) break;
      } catch (e) {
        if (e !== ABORT) throw e;
        break;
      }
    }
    if (opt.noise && scored) {
      const top = scored[0].sc;
      const pool = scored.filter(x => x.sc >= top - opt.noise && x.sc > -MATE + 100);
      if (pool.length) return U.pick(pool).m;
    }
    return bestMove;
  }
  function posKey(st) { return st.b.map(p => p || '.').join('') + st.turn + st.cr + st.ep; }
  function insufficient(b) {
    const rest = [];
    for (const p of b) if (p && p.toLowerCase() !== 'k') rest.push(p.toLowerCase());
    if (!rest.length) return true;
    if (rest.length === 1 && (rest[0] === 'b' || rest[0] === 'n')) return true;
    return false;
  }

  /* ================= TAŞ ÇİZİMİ ================= */
  function drawPiece(g, p, x, y, S) {
    const white = isW(p), t = p.toLowerCase();
    const fill = white ? '#fbf7ee' : '#2e2e38', stroke = white ? '#3b3226' : '#0a0a0e', line2 = white ? '#c9bfae' : '#5c5c70';
    g.save(); g.translate(x, y); g.scale(S / 100, S / 100);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 3.8;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(50, 86, 28, 5, 0, 0, Math.PI * 2); g.fill();
    const fs = () => { g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.stroke(); };
    const rect = (x0, y0, w, h, r) => { U.rr(g, x0, y0, w, h, r); fs(); };
    const P = d => { g.beginPath(); const p2 = new Path2D(d); g.fillStyle = fill; g.fill(p2); g.strokeStyle = stroke; g.stroke(p2); };
    if (t === 'p') {
      rect(26, 74, 48, 11, 4);
      P('M34 75 C36 62 42 56 44 52 L56 52 C58 56 64 62 66 75 Z');
      rect(37, 46, 26, 8, 3);
      g.beginPath(); g.arc(50, 34, 13, 0, Math.PI * 2); fs();
    } else if (t === 'r') {
      rect(22, 74, 56, 11, 4);
      P('M30 74 L33 44 L67 44 L70 74 Z');
      rect(27, 39, 46, 8, 2);
      P('M27 40 L27 20 L37 20 L37 27 L45 27 L45 20 L55 20 L55 27 L63 27 L63 20 L73 20 L73 40 Z');
    } else if (t === 'b') {
      rect(24, 74, 52, 11, 4);
      P('M36 74 C38 67 42 65 44 63 L56 63 C58 65 62 67 64 74 Z');
      rect(36, 56, 28, 8, 3);
      P('M50 19 C65 29 71 41 65 53 C62 57 38 57 35 53 C29 41 35 29 50 19 Z');
      g.strokeStyle = stroke; g.beginPath(); g.moveTo(55, 31); g.lineTo(46, 44); g.stroke();
      g.beginPath(); g.arc(50, 15, 5.5, 0, Math.PI * 2); fs();
    } else if (t === 'n') {
      rect(24, 74, 52, 11, 4);
      P('M32 74 C32 61 40 55 45 49 C39 51 33 53 28 57 C21 55 19 48 23 42 C29 32 35 26 41 22 L44 12 L51 19 C65 20 75 34 73 50 C72 60 69 68 69 74 Z');
      g.fillStyle = stroke; g.beginPath(); g.arc(41, 33, 3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = line2; g.lineWidth = 3; g.beginPath(); g.moveTo(57, 25); g.bezierCurveTo(65, 33, 67, 45, 65, 60); g.stroke();
    } else if (t === 'q') {
      rect(22, 74, 56, 11, 4);
      P('M28 74 L19 34 L34 52 L36 25 L46 49 L50 20 L54 49 L64 25 L66 52 L81 34 L72 74 Z');
      for (const [bx, by] of [[19, 31], [36, 22], [50, 17], [64, 22], [81, 31]]) { g.beginPath(); g.arc(bx, by, 5, 0, Math.PI * 2); fs(); }
      g.strokeStyle = line2; g.lineWidth = 3; g.beginPath(); g.moveTo(30, 66); g.lineTo(70, 66); g.stroke();
    } else if (t === 'k') {
      rect(22, 74, 56, 11, 4);
      P('M28 74 C17 57 23 40 37 41 C42 41 46 45 50 52 C54 45 58 41 63 41 C77 40 83 57 72 74 Z');
      rect(44, 29, 12, 20, 3);
      rect(46.5, 6, 7, 24, 2);
      rect(39, 12, 22, 7, 2);
      g.strokeStyle = line2; g.lineWidth = 3; g.beginPath(); g.moveTo(31, 66); g.lineTo(69, 66); g.stroke();
    }
    g.restore();
  }

  /* ================= OYUN ================= */
  Platform.register({
    id: 'chess', name: 'Satranç', gen: 'retro', genre: 'Strateji',
    colors: ['#a16207', '#422006'], bestMode: 'wins',
    desc: 'Bilgisayara ya da arkadaşına karşı tam kurallı satranç.',
    help: '<ul><li>Taşına <b>dokun</b>, sonra gitmek istediğin kareye dokun. Noktalar gidebileceğin kareleri gösterir.</li><li>Rok, geçerken alma ve piyon terfisi desteklenir; terfide istediğin taşı seçebilirsin.</li><li>Şah mat, pat, 50 hamle kuralı, üç kez tekrar ve yetersiz materyal beraberlikleri uygulanır.</li><li><b>Geri Al</b> son hamleni geri alır, <b>İpucu</b> iyi bir hamle önerir.</li></ul>',
    options: [
      { key: 'mode', label: 'RAKİP', choices: [['easy', 'Kolay'], ['mid', 'Orta'], ['hard', 'Zor'], ['pvp', '2 Oyuncu']], def: 'mid' },
      { key: 'color', label: 'RENGİN (bilgisayara karşı)', choices: [['w', 'Beyaz'], ['b', 'Siyah']], def: 'w' }
    ],
    bestKey: o => o.mode,
    icon: '<rect x="4" y="4" width="56" height="56" rx="8" fill="#eedcbc"/><rect x="4" y="4" width="14" height="14" fill="#b58863"/><rect x="32" y="4" width="14" height="14" fill="#b58863"/><rect x="18" y="18" width="14" height="14" fill="#b58863"/><rect x="46" y="18" width="14" height="14" fill="#b58863"/><rect x="4" y="32" width="14" height="14" fill="#b58863"/><rect x="32" y="32" width="14" height="14" fill="#b58863"/><rect x="18" y="46" width="14" height="14" fill="#b58863"/><rect x="46" y="46" width="14" height="14" fill="#b58863"/><path d="M22 54 L42 54 L40 48 C46 40 46 26 36 18 L34 12 L30 17 C22 20 16 30 18 34 C20 38 26 36 30 34 C28 40 24 44 24 48 Z" fill="#222" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
    create(s, o) {
      const W = 360, H = 462, S = 45, BY = 51;
      const view = s.canvas(W, H);
      const g = view.g;
      const pvp = o.mode === 'pvp';
      const human = pvp ? null : o.color;
      const AIOPT = { easy: { depth: 1, noise: 140, time: 600 }, mid: { depth: 3, noise: 12, time: 1500 }, hard: { depth: 5, noise: 0, time: 2500 } }[o.mode];
      let st = initial();
      let flipped = human === 'b';
      let sel = -1, targets = [], last = null, anim = null, thinking = false, over = false, hint = null, promo = null;
      const history = [];
      const reps = {};
      reps[posKey(st)] = 1;
      let legalNow = legal(st);
      const fx = new U.Particles();

      // kontroller
      const ctrl = s.controls();
      const undoBtn = s.button(ctrl, '↶ Geri Al', undo, '');
      s.button(ctrl, '⇅ Çevir', () => { flipped = !flipped; s.sfx('click'); }, '');
      const hintBtn = s.button(ctrl, '💡 İpucu', doHint, '');

      // terfi seçici
      const pick = document.createElement('div');
      pick.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;gap:8px;padding:14px;background:#1e2245;border:1px solid rgba(255,255,255,.15);border-radius:18px;box-shadow:0 20px 50px #000;z-index:10';
      s.stage.appendChild(pick);

      function isHumanTurn() { return pvp || st.turn === human; }
      function sqAt(px, py) {
        const c = Math.floor(px / S), r = Math.floor((py - BY) / S);
        if (c < 0 || c > 7 || r < 0 || r > 7) return -1;
        return flipped ? (7 - r) * 8 + (7 - c) : r * 8 + c;
      }
      function sqPos(i) {
        let r = i >> 3, c = i & 7;
        if (flipped) { r = 7 - r; c = 7 - c; }
        return { x: c * S, y: BY + r * S };
      }
      function updButtons() {
        undoBtn.disabled = thinking || !history.length || (!pvp && !history.some(h => h.st.turn === human));
        hintBtn.disabled = thinking || over || !isHumanTurn();
      }
      function applyMove(m, animate) {
        history.push({ st: clone(st), last, key: posKey(st) });
        const a = sqPos(m.f);
        make(st, m);
        const k = posKey(st);
        reps[k] = (reps[k] || 0) + 1;
        last = m; sel = -1; targets = []; hint = null;
        if (animate) anim = { p: st.b[m.t], from: a, to: m.t, t: 0 };
        if (m.c) { s.sfx('capture'); const p = sqPos(m.t); fx.burst(p.x + S / 2, p.y + S / 2, ['#fde68a', '#fff'], 10, 120, 0.4, 3); }
        else s.sfx('place');
        legalNow = legal(st);
        if (inCheck(st, st.turn) && legalNow.length) { s.sfx('check'); s.vibe(60); }
        checkEnd();
        updButtons();
        if (!over && !isHumanTurn()) scheduleAI();
      }
      function checkEnd() {
        let res = null;
        if (!legalNow.length) {
          if (inCheck(st, st.turn)) res = { winner: st.turn === 'w' ? 'b' : 'w', why: 'Şah mat!' };
          else res = { winner: null, why: 'Pat – berabere.' };
        } else if (st.half >= 100) res = { winner: null, why: '50 hamle kuralı – berabere.' };
        else if (reps[posKey(st)] >= 3) res = { winner: null, why: 'Üç kez tekrar – berabere.' };
        else if (insufficient(st.b)) res = { winner: null, why: 'Yetersiz materyal – berabere.' };
        if (!res) return;
        over = true;
        const name = c => (c === 'w' ? 'Beyaz' : 'Siyah');
        if (pvp) {
          s.over({ win: false, count: false, emoji: res.winner ? '♛' : '🤝', title: res.winner ? name(res.winner) + ' kazandı!' : 'Berabere', msg: res.why, delay: 900 });
        } else if (!res.winner) s.over({ win: false, emoji: '🤝', title: 'Berabere', msg: res.why, delay: 900 });
        else if (res.winner === human) s.over({ win: true, title: 'Kazandın!', msg: res.why + ' Harika oyundu.', delay: 900 });
        else { s.over({ win: false, emoji: '😔', title: 'Kaybettin', msg: res.why, delay: 900 }); s.sfx('lose'); }
      }
      function scheduleAI() {
        thinking = true;
        updButtons();
        const go = () => {
          if (!s.alive || over) return;
          if (!s.active() || anim) { s.timeout(go, 250); return; }
          const m = think(st, AIOPT);
          thinking = false;
          if (m) applyMove(m, true);
          updButtons();
        };
        s.timeout(go, 380);
      }
      function undo() {
        if (thinking || !history.length) return;
        let h = history.pop();
        if (!pvp) { while (h && h.st.turn !== human && history.length) h = history.pop(); if (h.st.turn !== human) { history.push(h); return; } }
        st = clone(h.st); last = h.last;
        rebuildReps();
        sel = -1; targets = []; hint = null; anim = null; over = false;
        legalNow = legal(st);
        s.sfx('move');
        updButtons();
      }
      function rebuildReps() {
        for (const k in reps) delete reps[k];
        for (const h of history) reps[h.key] = (reps[h.key] || 0) + 1;
        const k = posKey(st); reps[k] = (reps[k] || 0) + 1;
      }
      function doHint() {
        if (thinking || over || !isHumanTurn()) return;
        hintBtn.disabled = true;
        s.toast('Düşünülüyor…', 700);
        s.timeout(() => {
          const m = think(st, { depth: 3, time: 1200 });
          hint = m;
          updButtons();
          if (m) { sel = m.f; targets = legalNow.filter(x => x.f === m.f); }
        }, 60);
      }
      function showPromo(moves) {
        promo = moves;
        pick.innerHTML = '';
        const white = st.turn === 'w';
        for (const t of ['q', 'r', 'b', 'n']) {
          const b = document.createElement('button');
          b.className = 'btn';
          b.style.cssText = 'width:62px;height:62px;padding:0';
          const c = document.createElement('canvas');
          c.width = 120; c.height = 120; c.style.width = '52px'; c.style.height = '52px';
          drawPiece(c.getContext('2d'), white ? t.toUpperCase() : t, 0, 0, 120);
          b.appendChild(c);
          b.addEventListener('click', () => {
            const m = promo.find(x => x.pr === t);
            pick.style.display = 'none'; promo = null;
            if (m) applyMove(m, true);
          });
          pick.appendChild(b);
        }
        pick.style.display = 'flex';
      }

      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || over || thinking || anim || promo || !isHumanTurn()) return;
        const p = view.pt(e);
        const i = sqAt(p.x, p.y);
        if (i < 0) { sel = -1; targets = []; return; }
        if (sel >= 0) {
          const ms = targets.filter(m => m.t === i);
          if (ms.length) {
            if (ms.length > 1 && ms[0].pr) showPromo(ms);
            else applyMove(ms[0], true);
            return;
          }
        }
        const pc = st.b[i];
        if (pc && (isW(pc) ? 'w' : 'b') === st.turn) {
          sel = i;
          targets = legalNow.filter(m => m.f === i);
          s.sfx('tick');
        } else { sel = -1; targets = []; }
      });

      updButtons();
      if (!isHumanTurn()) scheduleAI();

      function captured(white) {
        // ekrandan eksilen taşları say
        const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
        const cnt = { p: 0, n: 0, b: 0, r: 0, q: 0 };
        for (const p of st.b) if (p && isW(p) === white && p.toLowerCase() !== 'k') cnt[p.toLowerCase()]++;
        const out = [];
        for (const t of ['q', 'r', 'b', 'n', 'p']) for (let k = 0; k < Math.max(0, start[t] - cnt[t]); k++) out.push(white ? t.toUpperCase() : t);
        return out;
      }
      function material(white) { let m = 0; for (const p of st.b) if (p && isW(p) === white) m += VAL[p.toLowerCase()]; return m; }

      s.loop(dt => {
        fx.update(dt);
      }, dt => {
        if (anim) { anim.t += (dt || 0.016) / 0.18; if (anim.t >= 1) anim = null; }
        g.fillStyle = '#1b1410'; g.fillRect(0, 0, W, H);
        // tahta
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          g.fillStyle = (r + c) % 2 ? '#b58863' : '#f0d9b5';
          g.fillRect(c * S, BY + r * S, S, S);
        }
        const hl = (i, col) => { const p = sqPos(i); g.fillStyle = col; g.fillRect(p.x, p.y, S, S); };
        if (last) { hl(last.f, 'rgba(255,214,0,.35)'); hl(last.t, 'rgba(255,214,0,.45)'); }
        if (hint) { hl(hint.f, 'rgba(56,189,248,.45)'); hl(hint.t, 'rgba(56,189,248,.55)'); }
        if (sel >= 0) hl(sel, 'rgba(46,229,157,.5)');
        if (inCheck(st, st.turn)) {
          const k = sqPos(st.turn === 'w' ? st.wk : st.bk);
          const rg = g.createRadialGradient(k.x + S / 2, k.y + S / 2, 2, k.x + S / 2, k.y + S / 2, S * 0.7);
          rg.addColorStop(0, 'rgba(255,0,0,.9)'); rg.addColorStop(1, 'rgba(255,0,0,0)');
          g.fillStyle = rg; g.fillRect(k.x, k.y, S, S);
        }
        // koordinatlar
        for (let k = 0; k < 8; k++) {
          const file = 'abcdefgh'[flipped ? 7 - k : k], rank = String(flipped ? k + 1 : 8 - k);
          U.text(g, file, k * S + S - 5, BY + 8 * S - 6, 9, (k % 2) ? '#f0d9b5' : '#b58863', 'center', 800);
          U.text(g, rank, 5, BY + k * S + 8, 9, (k % 2) ? '#f0d9b5' : '#b58863', 'center', 800);
        }
        // taşlar
        for (let i = 0; i < 64; i++) {
          const p = st.b[i];
          if (!p || (anim && anim.to === i)) continue;
          const q = sqPos(i);
          drawPiece(g, p, q.x, q.y, S);
        }
        // hedefler
        for (const m of targets) {
          const q = sqPos(m.t);
          if (st.b[m.t] || m.fl === 1) {
            g.strokeStyle = 'rgba(20,20,20,.45)'; g.lineWidth = 4;
            g.beginPath(); g.arc(q.x + S / 2, q.y + S / 2, S / 2 - 3, 0, Math.PI * 2); g.stroke();
          } else {
            g.fillStyle = 'rgba(20,20,20,.3)';
            g.beginPath(); g.arc(q.x + S / 2, q.y + S / 2, S * 0.15, 0, Math.PI * 2); g.fill();
          }
        }
        if (anim) {
          const to = sqPos(anim.to), e = U.easeOut(Math.min(1, anim.t));
          drawPiece(g, anim.p, U.lerp(anim.from.x, to.x, e), U.lerp(anim.from.y, to.y, e), S);
        }
        fx.draw(g);
        // oyuncu şeritleri
        const topColor = flipped ? 'w' : 'b', botColor = flipped ? 'b' : 'w';
        const strip = (color, y) => {
          const white = color === 'w';
          const label = pvp ? (white ? 'Beyaz' : 'Siyah') : (color === human ? 'Sen' : 'Bilgisayar');
          const turn = st.turn === color && !over;
          g.fillStyle = turn ? 'rgba(255,214,0,.16)' : 'rgba(255,255,255,.04)';
          U.rr(g, 2, y, W - 4, 44, 10); g.fill();
          g.fillStyle = white ? '#fbf7ee' : '#2e2e38'; g.strokeStyle = '#999'; g.lineWidth = 1;
          g.beginPath(); g.arc(18, y + 22, 8, 0, Math.PI * 2); g.fill(); g.stroke();
          let txt = label;
          if (turn && thinking && color !== human) txt += ' · düşünüyor…';
          else if (turn && inCheck(st, color)) txt += ' · ŞAH!';
          else if (turn) txt += ' · sıra';
          U.text(g, txt, 32, y + 14, 13, turn ? '#fde68a' : '#d6d3d1', 'left', 800);
          // rakipten alınan taşlar
          const caps = captured(!white);
          caps.forEach((p, k) => drawPiece(g, p, 30 + k * 13, y + 22, 20));
          const diff = Math.round((material(white) - material(!white)) / 100);
          if (diff > 0) U.text(g, '+' + diff, W - 12, y + 22, 13, '#a3e635', 'right', 900);
        };
        strip(topColor, 3);
        strip(botColor, BY + 8 * S + 4);
      });
      return {};
    }
  });

  // test için dışa aç
  Platform._chess = { initial, legal, make, unmake, gen, think };
})();
