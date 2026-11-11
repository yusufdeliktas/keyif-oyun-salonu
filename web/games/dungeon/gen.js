/* Zindan Kaşifi - üretim (rng, zindan üretimi, görüş alanı, yol bulma) */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};

  /* ---------- Karo kodları ---------- */
  const T = DG.T = { WALL: 0, FLOOR: 1, DOOR: 2, DOOR_OPEN: 3, STAIRS: 4, STAIRS_UP: 5, WATER: 6, LAVA: 7, CHASM: 8 };
  DG.passable = t => t === T.FLOOR || t === T.DOOR || t === T.DOOR_OPEN || t === T.STAIRS || t === T.STAIRS_UP || t === T.WATER;
  DG.opaque = t => t === T.WALL || t === T.DOOR;

  /* ---------- Rastgele sayı üretici (mulberry32) ---------- */
  function seedToInt(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return Math.floor(seed) >>> 0;
    const s = String(seed == null ? 0 : seed);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mix(a, b) { // iki tam sayıyı tek tohuma karıştır
    let h = (a ^ Math.imul(b + 0x9E3779B9, 0x85EBCA6B)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7FEB352D);
    h = Math.imul(h ^ (h >>> 15), 0x846CA68B);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function makeRng(state) {
    let a = state >>> 0;
    const r = {
      next() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int(lo, hi) { return lo + Math.floor(r.next() * (hi - lo + 1)); },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      chance(p) { return r.next() < p; },
      shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(r.next() * (i + 1));
          const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
      },
      state() { return a; },
      get seed() { return a; }
    };
    return r;
  }
  DG.rng = seed => makeRng(seedToInt(seed));
  DG.rng.fromState = s => makeRng(s >>> 0);

  /* ---------- Küçük ikili yığın (öncelik kuyruğu) ---------- */
  function Heap() { this.k = []; this.v = []; }
  Heap.prototype.push = function (key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  };
  Heap.prototype.pop = function () {
    const k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop(), n = k.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  };
  Heap.prototype.size = function () { return this.k.length; };

  const SQRT2 = Math.SQRT2;
  const DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  /* ---------- Yol bulma ---------- */
  // A*, 8 yön, köşe kesme yok. Dönüş: başlangıç hariç, hedef dahil; yoksa null.
  function find(w, h, passable, sx, sy, tx, ty, maxNodes) {
    maxNodes = maxNodes || 4000;
    if (tx < 0 || ty < 0 || tx >= w || ty >= h || sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
    if (sx === tx && sy === ty) return [];
    if (!passable(tx, ty)) return null;
    const N = w * h, g = new Float64Array(N).fill(Infinity), parent = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heur = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return dx + dy + (SQRT2 - 2) * Math.min(dx, dy); };
    const heap = new Heap(), s = sy * w + sx, t = ty * w + tx;
    g[s] = 0; heap.push(heur(sx, sy), s);
    let expanded = 0;
    while (heap.size()) {
      const cur = heap.pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === t) {
        const path = [];
        for (let i = t; i !== s; i = parent[i]) path.push({ x: i % w, y: (i - i % w) / w });
        return path.reverse();
      }
      if (++expanded > maxNodes) return null;
      const cx = cur % w, cy = (cur - cx) / w;
      for (let d = 0; d < 8; d++) {
        const dx = DIR8[d][0], dy = DIR8[d][1], nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (closed[ni] || !passable(nx, ny)) continue;
        if (d >= 4 && !(passable(cx + dx, cy) && passable(cx, cy + dy))) continue;
        const ng = g[cur] + (d >= 4 ? SQRT2 : 1);
        if (ng < g[ni]) { g[ni] = ng; parent[ni] = cur; heap.push(ng + heur(nx, ny), ni); }
      }
    }
    return null;
  }

  // Çok kaynaklı mesafe haritası (8 yön, köşe kesme yok). Ulaşılamaz = -1.
  function dijkstra(w, h, passable, sources, maxDist) {
    if (maxDist == null) maxDist = 32767;
    const N = w * h, dist = new Int16Array(N).fill(-1), q = new Int32Array(N);
    let head = 0, tail = 0;
    for (const s of sources) {
      if (!s || s.x < 0 || s.y < 0 || s.x >= w || s.y >= h) continue;
      const i = s.y * w + s.x;
      if (dist[i] >= 0) continue;
      dist[i] = 0; q[tail++] = i;
    }
    while (head < tail) {
      const cur = q[head++], cd = dist[cur];
      if (cd >= maxDist) continue;
      const cx = cur % w, cy = (cur - cx) / w;
      for (let d = 0; d < 8; d++) {
        const dx = DIR8[d][0], dy = DIR8[d][1], nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (dist[ni] >= 0 || !passable(nx, ny)) continue;
        if (d >= 4 && !(passable(cx + dx, cy) && passable(cx, cy + dy))) continue;
        dist[ni] = cd + 1; q[tail++] = ni;
      }
    }
    return dist;
  }

  // Bresenham: iki uç dahil karo listesi
  function line(x0, y0, x1, y1) {
    const out = [];
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      out.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return out;
  }

  DG.path = { find, dijkstra, line };

  /* ---------- Görüş alanı: simetrik gölge döküm ---------- */
  // 4 kadran x 2 oktant; eğimler kesir olarak tutulur (yuvarlama hatası yok).
  // Zemin karosu, merkezden merkeze bakış simetrik olacak şekilde görünür sayılır; duvarlar her zaman görünür.
  function fovCompute(w, h, isOpaque, ox, oy, radius) {
    const vis = new Uint8Array(w * h);
    if (ox < 0 || oy < 0 || ox >= w || oy >= h) return vis;
    const r2 = radius * radius + radius; // hafif yuvarlak kenar
    vis[oy * w + ox] = 1;
    let q = 0;
    const px = (d, c) => q === 0 || q === 1 ? ox + c : q === 2 ? ox + d : ox - d;
    const py = (d, c) => q === 0 ? oy - d : q === 1 ? oy + d : oy + c;
    const blocked = (d, c) => { const x = px(d, c), y = py(d, c); return x < 0 || y < 0 || x >= w || y >= h || !!isOpaque(x, y); };
    const reveal = (d, c) => {
      if (d * d + c * c > r2) return;
      const x = px(d, c), y = py(d, c);
      if (x >= 0 && y >= 0 && x < w && y < h) vis[y * w + x] = 1;
    };
    function scan(depth, sn, sd, en, ed) {
      if (depth > radius) return;
      const minC = Math.floor((2 * depth * sn + sd) / (2 * sd));
      const maxC = Math.ceil((2 * depth * en - ed) / (2 * ed));
      let prev = 0; // 0 yok, 1 duvar, 2 zemin
      for (let c = minC; c <= maxC; c++) {
        const wall = blocked(depth, c);
        if (wall || (c * sd >= depth * sn && c * ed <= depth * en)) reveal(depth, c);
        if (prev === 1 && !wall) { sn = 2 * c - 1; sd = 2 * depth; }
        if (prev === 2 && wall) scan(depth + 1, sn, sd, 2 * c - 1, 2 * depth);
        prev = wall ? 1 : 2;
      }
      if (prev === 2) scan(depth + 1, sn, sd, en, ed);
    }
    for (q = 0; q < 4; q++) { scan(1, -1, 1, 0, 1); scan(1, 0, 1, 1, 1); }
    return vis;
  }
  DG.fov = { compute: fovCompute };

  /* ---------- Zindan üretimi ---------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function build(floor, rng, opts, simple) {
    const boss = !!opts.boss, shop = !!opts.shop;
    const themeWater = opts.themeWater === 'su' ? T.WATER : opts.themeWater === 'lav_havuz' ? T.LAVA : 0;
    const caveFloor = (floor >= 4 && floor <= 6) || floor >= 13;
    const w = clamp(44 + floor + rng.int(0, 2) + (boss ? 2 : 0), 44, 60);
    const h = clamp(44 + floor + rng.int(0, 2), 44, 60);
    const N = w * h;
    const tiles = new Uint8Array(N);        // hepsi WALL
    const zone = new Uint8Array(N);         // 0 ham duvar, 1 oda içi, 2 koridor, 3 mağara, 4 oda duvarı, 5 oda köşesi, 6 duvarda açıklık
    const roomId = new Int16Array(N).fill(-1);
    const rooms = [];
    const idx = (x, y) => y * w + x;
    const pass = (x, y) => DG.passable(tiles[idx(x, y)]);

    // Genişletilmiş dikdörtgen başka odaya değmesin (aralarında en az 3 karo kalsın: kapılar yan yana gelmez)
    function fits(x, y, rw, rh) {
      if (x < 2 || y < 2 || x + rw > w - 2 || y + rh > h - 2) return false;
      for (const r of rooms) {
        if (x - 3 < r.x + r.w && x + rw + 3 > r.x && y - 3 < r.y + r.h && y + rh + 3 > r.y) return false;
      }
      return true;
    }
    function addRect(rw, rh, kind, tries) {
      if (rw > w - 4 || rh > h - 4) return null;
      for (let t = 0; t < tries; t++) {
        const x = rng.int(2, w - 2 - rw), y = rng.int(2, h - 2 - rh);
        if (!fits(x, y, rw, rh)) continue;
        const r = { x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1), kind };
        rooms.push(r);
        const id = rooms.length - 1;
        for (let yy = y - 1; yy <= y + rh; yy++) for (let xx = x - 1; xx <= x + rw; xx++) {
          const i = idx(xx, yy);
          if (xx >= x && xx < x + rw && yy >= y && yy < y + rh) { tiles[i] = T.FLOOR; zone[i] = 1; roomId[i] = id; }
          else {
            const corner = (xx === x - 1 || xx === x + rw) && (yy === y - 1 || yy === y + rh);
            zone[i] = corner ? 5 : 4; roomId[i] = id;
          }
        }
        return r;
      }
      return null;
    }
    // Hücresel otomat ile doğal mağara bölümü
    function addCave(tries) {
      for (let t = 0; t < tries; t++) {
        const rw = rng.int(12, 18), rh = rng.int(10, 15);
        if (rw > w - 4 || rh > h - 4) continue;
        const x = rng.int(2, w - 2 - rw), y = rng.int(2, h - 2 - rh);
        if (!fits(x, y, rw, rh)) continue;
        const M = rw * rh;
        let a = new Uint8Array(M), b = new Uint8Array(M);
        for (let j = 1; j < rh - 1; j++) for (let i = 1; i < rw - 1; i++) a[j * rw + i] = rng.chance(0.56) ? 1 : 0;
        for (let it = 0; it < 4; it++) {
          for (let j = 1; j < rh - 1; j++) for (let i = 1; i < rw - 1; i++) {
            let n = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += a[(j + dy) * rw + i + dx];
            b[j * rw + i] = (a[j * rw + i] ? n >= 4 : n >= 5) ? 1 : 0;
          }
          const tmp = a; a = b; b = tmp;
        }
        // en büyük 4-bağlı bileşeni tut
        const comp = new Int16Array(M).fill(-1), stack = [];
        let best = -1, bestN = 0, nc = 0;
        for (let s = 0; s < M; s++) {
          if (!a[s] || comp[s] >= 0) continue;
          let cnt = 0; comp[s] = nc; stack.push(s);
          while (stack.length) {
            const c = stack.pop(); cnt++;
            const nb = [c - 1, c + 1, c - rw, c + rw];
            for (const q of nb) if (a[q] && comp[q] < 0) { comp[q] = nc; stack.push(q); }
          }
          if (cnt > bestN) { bestN = cnt; best = nc; }
          nc++;
        }
        if (bestN < 30) continue;
        const r = { x, y, w: rw, h: rh, cx: 0, cy: 0, kind: 'cave' };
        rooms.push(r);
        const id = rooms.length - 1;
        let sx = 0, sy = 0;
        for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
          if (comp[j * rw + i] !== best) continue;
          const g = idx(x + i, y + j);
          tiles[g] = T.FLOOR; zone[g] = 3; roomId[g] = id; sx += i; sy += j;
        }
        const c = nearest(x + Math.round(sx / bestN), y + Math.round(sy / bestN), i => tiles[i] === T.FLOOR && roomId[i] === id);
        r.cx = c % w; r.cy = (c - r.cx) / w;
        return r;
      }
      return null;
    }
    // (x,y) çevresinde koşulu sağlayan en yakın karo indeksi
    function nearest(x, y, pred) {
      for (let r = 0; r < Math.max(w, h); r++) {
        for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (Math.abs(xx - x) !== r && Math.abs(yy - y) !== r) continue;
          const i = idx(xx, yy);
          if (pred(i)) return i;
        }
      }
      return -1;
    }

    /* Odalar */
    const target = clamp(rng.int(8, 12) + Math.floor(floor / 5), 8, 14);
    if (boss && !addRect(rng.int(13, 16), rng.int(11, 13), 'boss', 300)) return null;
    const nCaves = simple ? 0 : caveFloor ? rng.int(2, 3) : rng.chance(0.25) ? 1 : 0;
    for (let i = 0; i < nCaves; i++) addCave(40);
    if (!addRect(rng.int(4, 5), rng.int(4, 5), 'treasure', 200)) return null;
    if (shop && !addRect(rng.int(5, 6), rng.int(4, 5), 'shop', 200)) return null;
    let tries = 0;
    while (rooms.length < target && tries < 60) {
      if (!addRect(rng.int(4, 9), rng.int(4, 7), 'normal', 30)) tries++;
    }
    const normalIds = [], nodeIds = [];
    rooms.forEach((r, i) => { if (r.kind === 'normal') normalIds.push(i); if (r.kind === 'normal' || r.kind === 'cave') nodeIds.push(i); });
    if (normalIds.length < 3) return null;

    /* Koridorlar: ağırlıklı en kısa yol ile kazı */
    function corridorCost(i, allowA, allowB, loop) {
      const z = zone[i];
      if (z === 5) return Infinity;
      const x = i % w, y = (i - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return Infinity;
      if (z === 1 || z === 4 || z === 6) {
        const rid = roomId[i];
        const special = rooms[rid].kind !== 'normal' && rooms[rid].kind !== 'cave' && rid !== allowA && rid !== allowB;
        if (z === 4) return special ? 80 : 12;
        if (z === 6) return special ? 80 : 1;
        return special ? 40 : 1;
      }
      if (z === 2) return loop ? 5 : 1;
      if (z === 3) return 1;
      return 3;
    }
    function dig(a, b, loop) {
      const ra = rooms[a], rb = rooms[b];
      const s = idx(ra.cx, ra.cy), t = idx(rb.cx, rb.cy);
      const dist = new Float64Array(N).fill(Infinity), parent = new Int32Array(N).fill(-1), done = new Uint8Array(N);
      const heap = new Heap();
      dist[s] = 0; heap.push(0, s);
      let found = false;
      while (heap.size()) {
        const cur = heap.pop();
        if (done[cur]) continue;
        done[cur] = 1;
        if (cur === t) { found = true; break; }
        const cx = cur % w, cy = (cur - cx) / w;
        for (let d = 0; d < 4; d++) {
          const nx = cx + DIR8[d][0], ny = cy + DIR8[d][1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (done[ni]) continue;
          const c = corridorCost(ni, a, b, loop);
          if (c === Infinity) continue;
          const nd = dist[cur] + c;
          if (nd < dist[ni]) { dist[ni] = nd; parent[ni] = cur; heap.push(nd, ni); }
        }
      }
      if (!found) return false;
      for (let i = t; i !== -1; i = parent[i]) {
        if (tiles[i] === T.WALL) tiles[i] = T.FLOOR;
        if (zone[i] === 0) zone[i] = 2;
        else if (zone[i] === 4) zone[i] = 6;
      }
      return true;
    }
    const d2 = (a, b) => { const ra = rooms[a], rb = rooms[b]; return (ra.cx - rb.cx) * (ra.cx - rb.cx) + (ra.cy - rb.cy) * (ra.cy - rb.cy); };
    const linked = new Set();
    const link = (a, b, loop) => { if (!dig(a, b, loop)) return false; linked.add(a < b ? a + ',' + b : b + ',' + a); return true; };
    // Prim: en yakın bağlı odaya bağla
    const inTree = [nodeIds[rng.int(0, nodeIds.length - 1)]];
    const rest = nodeIds.filter(i => i !== inTree[0]);
    while (rest.length) {
      let bi = -1, ba = -1, bd = Infinity;
      for (let i = 0; i < rest.length; i++) for (const a of inTree) { const d = d2(a, rest[i]); if (d < bd) { bd = d; bi = i; ba = a; } }
      const r = rest.splice(bi, 1)[0];
      if (!link(ba, r, false)) return null;
      inTree.push(r);
    }
    // Özel odalar: en yakın normal odaya tek bağlantı
    for (let i = 0; i < rooms.length; i++) {
      const k = rooms[i].kind;
      if (k === 'normal' || k === 'cave') continue;
      let ba = -1, bd = Infinity;
      for (const a of nodeIds) { const d = d2(a, i); if (d < bd) { bd = d; ba = a; } }
      if (!link(ba, i, false)) return null;
    }
    // Döngüler: %15-25 ek koridor
    const loops = Math.max(nodeIds.length >= 4 ? 1 : 0, Math.round(nodeIds.length * (0.15 + rng.next() * 0.1)));
    for (let l = 0; l < loops; l++) {
      const a = rng.pick(nodeIds);
      const cands = nodeIds.filter(b => b !== a && !linked.has(a < b ? a + ',' + b : b + ',' + a)).sort((p, q) => d2(a, p) - d2(a, q)).slice(0, 3);
      if (cands.length) link(a, rng.pick(cands), true);
    }

    /* Kapılar: iki yanı duvar, içi ve dışı geçilebilir */
    for (let i = 0; i < N; i++) {
      if (zone[i] !== 6) continue;
      const x = i % w, y = (i - x) / w, r = rooms[roomId[i]];
      const horiz = y === r.y - 1 || y === r.y + r.h;
      const ok = horiz
        ? tiles[i - 1] === T.WALL && tiles[i + 1] === T.WALL && DG.passable(tiles[i - w]) && DG.passable(tiles[i + w])
        : tiles[i - w] === T.WALL && tiles[i + w] === T.WALL && DG.passable(tiles[i - 1]) && DG.passable(tiles[i + 1]);
      if (ok && (r.kind !== 'normal' || rng.chance(0.8))) tiles[i] = T.DOOR;
    }

    /* Tüm geçilebilir karolar birbirine bağlı mı? (4 yön) */
    const stack = new Int32Array(N), mark = new Uint8Array(N);
    function fullyConnected() {
      let total = 0, first = -1;
      for (let i = 0; i < N; i++) if (DG.passable(tiles[i])) { total++; if (first < 0) first = i; }
      if (first < 0) return false;
      mark.fill(0);
      let sp = 0, seen = 0;
      stack[sp++] = first; mark[first] = 1;
      while (sp) {
        const c = stack[--sp]; seen++;
        const x = c % w;
        const nb = [c - 1, c + 1, c - w, c + w];
        for (let k = 0; k < 4; k++) {
          const q = nb[k];
          if (k === 0 && x === 0) continue;
          if (k === 1 && x === w - 1) continue;
          if (q < 0 || q >= N || mark[q] || !DG.passable(tiles[q])) continue;
          mark[q] = 1; stack[sp++] = q;
        }
      }
      return seen === total;
    }

    /* Havuzlar */
    const poolRooms = rooms.map((r, i) => i).filter(i => rooms[i].kind === 'normal' || rooms[i].kind === 'cave');
    function nearDoor(i) {
      return tiles[i - 1] === T.DOOR || tiles[i + 1] === T.DOOR || tiles[i - w] === T.DOOR || tiles[i + w] === T.DOOR;
    }
    function blob(tile, rad, keepCenter) {
      const rid = rng.pick(poolRooms), r = rooms[rid];
      const cands = [];
      for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) {
        const i = idx(xx, yy);
        if (tiles[i] === T.FLOOR && roomId[i] === rid && (zone[i] === 1 || zone[i] === 3)) cands.push(i);
      }
      if (!cands.length) return [];
      const c = rng.pick(cands), cx = c % w, cy = (c - cx) / w, changed = [];
      const r2 = rad * rad + rad;
      for (let yy = cy - rad; yy <= cy + rad; yy++) for (let xx = cx - rad; xx <= cx + rad; xx++) {
        if (xx < 1 || yy < 1 || xx >= w - 1 || yy >= h - 1) continue;
        if ((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) > r2 - (rng.chance(0.3) ? rad : 0)) continue;
        const i = idx(xx, yy);
        if (tiles[i] !== T.FLOOR || roomId[i] !== rid || (zone[i] !== 1 && zone[i] !== 3)) continue;
        if (keepCenter && ((xx === r.cx && yy === r.cy) || nearDoor(i))) continue;
        tiles[i] = tile; changed.push(i);
      }
      return changed;
    }
    if (!simple && themeWater === T.WATER) {
      const n = rng.int(1, 4);
      for (let k = 0; k < n; k++) blob(T.WATER, rng.int(1, 3), false);
    }
    const hazard = simple ? 0 : themeWater === T.LAVA ? T.LAVA : (floor >= 7 && rng.chance(0.4)) ? T.CHASM : 0;
    if (hazard) {
      const n = rng.int(1, 3);
      for (let k = 0; k < n; k++) {
        const changed = blob(hazard, rng.int(1, 2), true);
        if (changed.length && !fullyConnected()) for (const i of changed) tiles[i] = T.FLOOR; // yolu kesti: geri al
      }
    }
    if (!fullyConnected()) return null;

    /* Başlangıç ve merdiven: en uzak odalar */
    const dmap = src => dijkstra(w, h, pass, [src]);
    const center = r => ({ x: r.cx, y: r.cy });
    const farthest = (d, ids, skip) => {
      let best = -1, bd = -1;
      for (const i of ids) { if (i === skip) continue; const v = d[idx(rooms[i].cx, rooms[i].cy)]; if (v > bd) { bd = v; best = i; } }
      return best;
    };
    const bossId = rooms.findIndex(r => r.kind === 'boss');
    let startId, stairsId;
    if (boss) {
      startId = farthest(dmap(center(rooms[bossId])), normalIds, -1);
      stairsId = bossId;
    } else {
      const a = farthest(dmap(center(rooms[rng.pick(normalIds)])), normalIds, -1);
      startId = a;
      stairsId = farthest(dmap(center(rooms[a])), nodeIds, a);
    }
    if (startId < 0 || stairsId < 0) return null;
    const used = new Uint8Array(N); // nokta çakışmasını önle
    const sI = nearest(rooms[startId].cx, rooms[startId].cy, i => tiles[i] === T.FLOOR && roomId[i] === startId);
    if (sI < 0) return null;
    tiles[sI] = T.STAIRS_UP; used[sI] = 1;
    const start = { x: sI % w, y: (sI - sI % w) / w };
    rooms[startId].kind = 'start';
    const dist = dmap(start);
    let bossPt = null, tI;
    if (boss) {
      const ar = rooms[bossId];
      const bI = idx(ar.cx, ar.cy);
      bossPt = { x: ar.cx, y: ar.cy }; used[bI] = 1;
      // merdiven: arenanın girişe en uzak köşesi
      let bd = -1; tI = -1;
      for (let yy = ar.y; yy < ar.y + ar.h; yy++) for (let xx = ar.x; xx < ar.x + ar.w; xx++) {
        const i = idx(xx, yy);
        if (tiles[i] !== T.FLOOR || Math.max(Math.abs(xx - ar.cx), Math.abs(yy - ar.cy)) < 3) continue;
        if (dist[i] > bd) { bd = dist[i]; tI = i; }
      }
    } else {
      tI = nearest(rooms[stairsId].cx, rooms[stairsId].cy, i => tiles[i] === T.FLOOR && roomId[i] === stairsId && !used[i]);
      rooms[stairsId].kind = 'stairs';
    }
    if (tI < 0 || dist[tI] < 0) return null;
    tiles[tI] = T.STAIRS; used[tI] = 1;
    const stairs = { x: tI % w, y: (tI - tI % w) / w };

    /* Dükkan */
    let shopPt = null;
    const shopId = rooms.findIndex(r => r.kind === 'shop');
    if (shopId >= 0) {
      const i = nearest(rooms[shopId].cx, rooms[shopId].cy, j => tiles[j] === T.FLOOR && roomId[j] === shopId && !used[j]);
      if (i < 0 || dist[i] < 0) return null;
      used[i] = 1; shopPt = { x: i % w, y: (i - i % w) / w };
    }

    /* Nokta adayları */
    const pt = i => ({ x: i % w, y: (i - i % w) / w });
    const inRoomKind = (i, kinds) => roomId[i] >= 0 && kinds.indexOf(rooms[roomId[i]].kind) >= 0;
    const spawnC = [], itemC = [], trapC = [], decorC = [];
    for (let i = 0; i < N; i++) {
      if (tiles[i] !== T.FLOOR || dist[i] < 0) continue;
      const z = zone[i];
      const quiet = inRoomKind(i, ['start', 'shop', 'boss']);
      if (!quiet && dist[i] >= 8 && ((z === 1 || z === 3) || (z === 2 && rng.chance(0.2)))) spawnC.push(i);
      if (!quiet && dist[i] >= 3 && (z === 1 || z === 3) && !inRoomKind(i, ['treasure'])) itemC.push(i);
      if (dist[i] >= 5 && (z === 1 || z === 2 || z === 3) && !nearDoor(i) && !inRoomKind(i, ['shop', 'boss'])) trapC.push(i);
      if ((z === 1 || z === 3) && !inRoomKind(i, ['shop'])) decorC.push(i);
    }
    rng.shuffle(spawnC); rng.shuffle(itemC); rng.shuffle(trapC); rng.shuffle(decorC);
    const take = (list, n, mark) => {
      const out = [];
      for (const i of list) { if (out.length >= n) break; if (used[i]) continue; if (mark) used[i] = 1; out.push(i); }
      return out;
    };
    const spawns = take(spawnC, 120, false).map(pt);

    /* Sandıklar: hazine odasında garanti + 0-2 ek */
    const chests = [];
    const trId = rooms.findIndex(r => r.kind === 'treasure');
    const cI = nearest(rooms[trId].cx, rooms[trId].cy, j => tiles[j] === T.FLOOR && roomId[j] === trId && !used[j]);
    if (cI < 0 || dist[cI] < 0) return null;
    used[cI] = 1; chests.push(pt(cI));
    for (const i of take(itemC.filter(j => dist[j] >= 6), rng.int(0, 2), true)) chests.push(pt(i));

    const items = take(itemC, rng.int(5, 9), true).map(pt);

    /* Tuzaklar */
    const trapKinds = ['diken', 'diken', 'zehir', 'alarm'];
    if (floor >= 4) trapKinds.push('alev');
    if (floor >= 6) trapKinds.push('isinlanma');
    const traps = take(trapC.filter(j => Math.abs(j % w - stairs.x) > 1 || Math.abs((j - j % w) / w - stairs.y) > 1), rng.int(2, 2 + Math.min(4, floor >> 1)), true)
      .map(i => { const p = pt(i); p.kind = rng.pick(trapKinds); return p; });

    /* Dekor */
    const decor = [];
    for (let ri = 0; ri < rooms.length; ri++) {
      const r = rooms[ri];
      if (r.kind === 'cave') continue;
      const walls = [];
      for (let xx = r.x; xx < r.x + r.w; xx++) { walls.push(idx(xx, r.y - 1)); walls.push(idx(xx, r.y + r.h)); }
      for (let yy = r.y; yy < r.y + r.h; yy++) { walls.push(idx(r.x - 1, yy)); walls.push(idx(r.x + r.w, yy)); }
      rng.shuffle(walls);
      let n = r.kind === 'boss' ? 4 : rng.int(1, 2);
      for (const i of walls) {
        if (n <= 0) break;
        if (tiles[i] !== T.WALL || tiles[i - 1] === T.DOOR || tiles[i + 1] === T.DOOR || tiles[i - w] === T.DOOR || tiles[i + w] === T.DOOR) continue;
        decor.push({ x: i % w, y: (i - i % w) / w, kind: 'mesale' }); n--;
      }
    }
    const floorKinds = floor <= 3 ? ['kemik', 'fici', 'fici', 'ot'] : floor <= 6 ? ['kristal', 'ot', 'kemik', 'fici'] : floor <= 9 ? ['kemik', 'kemik', 'sunak', 'ot', 'sandik_kirik']
      : floor <= 12 ? ['kemik', 'sandik_kirik', 'kristal'] : ['kristal', 'kristal', 'kemik', 'sandik_kirik'];
    for (const i of take(decorC, rng.int(6, 12), true)) decor.push({ x: i % w, y: (i - i % w) / w, kind: rng.pick(floorKinds) });
    if (rng.chance(0.5)) {
      const aI = nearest(rooms[trId].cx, rooms[trId].cy, j => tiles[j] === T.FLOOR && roomId[j] === trId && !used[j]);
      if (aI >= 0) { used[aI] = 1; decor.push({ x: aI % w, y: (aI - aI % w) / w, kind: 'sunak' }); }
    }

    return { w, h, tiles, rooms, start, stairs, spawns, items, chests, traps, decor, shop: shopPt, boss: bossPt };
  }

  // Son kontrol: kenarlar duvar, tüm noktalar başlangıçtan 4 yönlü yürünerek ulaşılabilir
  function validate(m) {
    const { w, h, tiles } = m;
    for (let x = 0; x < w; x++) if (tiles[x] !== T.WALL || tiles[(h - 1) * w + x] !== T.WALL) return false;
    for (let y = 0; y < h; y++) if (tiles[y * w] !== T.WALL || tiles[y * w + w - 1] !== T.WALL) return false;
    if (m.start.x === m.stairs.x && m.start.y === m.stairs.y) return false;
    const d = dijkstra(w, h, (x, y) => DG.passable(tiles[y * w + x]), [m.start]);
    const ok = p => p && d[p.y * w + p.x] >= 0;
    if (!ok(m.stairs)) return false;
    for (const list of [m.spawns, m.items, m.chests]) for (const p of list) if (!ok(p)) return false;
    if (m.shop && !ok(m.shop)) return false;
    if (m.boss && !ok(m.boss)) return false;
    return true;
  }

  // Asla başarısız olmayan yedek harita (tek büyük oda)
  function fallback(floor, opts, seed) {
    const rng = makeRng(seed);
    const w = 44, h = 44, tiles = new Uint8Array(w * h);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) tiles[y * w + x] = T.FLOOR;
    const start = { x: 3, y: 3 }, stairs = { x: w - 4, y: h - 4 };
    tiles[start.y * w + start.x] = T.STAIRS_UP; tiles[stairs.y * w + stairs.x] = T.STAIRS;
    const spawns = [], items = [];
    for (let k = 0; k < 40; k++) spawns.push({ x: rng.int(12, w - 4), y: rng.int(12, h - 4) });
    for (let k = 0; k < 6; k++) items.push({ x: rng.int(6, w - 6), y: rng.int(6, h - 6) });
    const boss = opts.boss ? { x: w >> 1, y: h >> 1 } : null;
    const shop = opts.shop ? { x: 6, y: h - 6 } : null;
    return { w, h, tiles, rooms: [{ x: 2, y: 2, w: w - 4, h: h - 4, cx: w >> 1, cy: h >> 1, kind: opts.boss ? 'boss' : 'start' }],
      start, stairs, spawns, items, chests: [{ x: w >> 1, y: 5 }], traps: [], decor: [], shop, boss };
  }

  function generate(floor, seed, opts) {
    opts = opts || {};
    floor = Math.max(1, floor | 0);
    const base = mix(seedToInt(seed), floor);
    for (let attempt = 0; attempt < 12; attempt++) {
      const m = build(floor, makeRng(mix(base, attempt + 1)), opts, attempt >= 8);
      if (m && validate(m)) return m;
    }
    return fallback(floor, opts, base);
  }

  DG.gen = { generate };
})();
