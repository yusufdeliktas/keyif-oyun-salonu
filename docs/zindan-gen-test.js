/* Zindan Kaşifi - gen.js doğrulama betiği (node docs/zindan-gen-test.js) */
'use strict';
global.window = global;
require('../web/games/dungeon/gen.js');
const DG = global.DG;
const T = DG.T;
const { performance } = require('perf_hooks');

const FLOORS = 15, SEEDS = 200;
const themeWater = f => (f >= 10 && f <= 12) ? 'lav_havuz' : (f <= 3 || (f >= 4 && f <= 6)) ? 'su' : (f >= 13 ? 'su' : null);
const fails = [];
let count = 0, totalMs = 0, maxMs = 0, maxInfo = '';
const stats = { rooms: 0, caves: 0, doors: 0, badDoors: 0, water: 0, lava: 0, chasm: 0, loops: 0, minSize: 99, maxSize: 0, spawns: 0, dist: 0 };

function fail(ctx, msg) { fails.push(ctx + ': ' + msg); }

function flood4(m) { // başlangıçtan 4 yönlü taşma (kapalı kapı geçilebilir)
  const { w, h, tiles } = m, seen = new Uint8Array(w * h), st = [m.start.y * w + m.start.x];
  seen[st[0]] = 1;
  while (st.length) {
    const c = st.pop(), x = c % w;
    const nb = [[c - 1, x > 0], [c + 1, x < w - 1], [c - w, c >= w], [c + w, c + w < w * h]];
    for (const [q, ok] of nb) if (ok && !seen[q] && DG.passable(tiles[q])) { seen[q] = 1; st.push(q); }
  }
  return seen;
}

function check(floor, seed, opts) {
  const ctx = 'kat ' + floor + ' tohum ' + seed;
  const t0 = performance.now();
  const m = DG.gen.generate(floor, seed, opts);
  const ms = performance.now() - t0;
  count++; totalMs += ms; if (ms > maxMs) { maxMs = ms; maxInfo = ctx; }
  const { w, h, tiles } = m;
  if (w < 44 || w > 60 || h < 44 || h > 60) fail(ctx, 'boyut ' + w + 'x' + h);
  if (tiles.length !== w * h) fail(ctx, 'tiles uzunluğu');
  stats.minSize = Math.min(stats.minSize, w, h); stats.maxSize = Math.max(stats.maxSize, w, h);
  // kenarlar
  for (let x = 0; x < w; x++) if (tiles[x] !== T.WALL || tiles[(h - 1) * w + x] !== T.WALL) { fail(ctx, 'kenar duvar değil'); break; }
  for (let y = 0; y < h; y++) if (tiles[y * w] !== T.WALL || tiles[y * w + w - 1] !== T.WALL) { fail(ctx, 'kenar duvar değil'); break; }
  if (m.start.x === m.stairs.x && m.start.y === m.stairs.y) fail(ctx, 'başlangıç = merdiven');
  if (tiles[m.start.y * w + m.start.x] !== T.STAIRS_UP) fail(ctx, 'başlangıçta STAIRS_UP yok');
  if (tiles[m.stairs.y * w + m.stairs.x] !== T.STAIRS) fail(ctx, 'merdiven karosu STAIRS değil');
  if (m.rooms.length < 6 || m.rooms.length > 16) fail(ctx, 'oda sayısı ' + m.rooms.length);
  stats.rooms += m.rooms.length;
  stats.caves += m.rooms.filter(r => r.kind === 'cave').length;
  if (!m.rooms.some(r => r.kind === 'treasure')) fail(ctx, 'hazine odası yok');
  if (opts.boss) {
    const a = m.rooms.find(r => r.kind === 'boss');
    if (!a) fail(ctx, 'boss arenası yok');
    else if (a.w < 13 || a.h < 11) fail(ctx, 'arena küçük ' + a.w + 'x' + a.h);
    if (!m.boss) fail(ctx, 'boss noktası yok');
    else if (a && (m.boss.x !== a.cx || m.boss.y !== a.cy)) fail(ctx, 'boss arena ortasında değil');
    if (a && m.stairs && !(m.stairs.x >= a.x - 2 && m.stairs.x < a.x + a.w + 2 && m.stairs.y >= a.y - 2 && m.stairs.y < a.y + a.h + 2)) fail(ctx, 'merdiven arenada değil');
  } else if (m.boss) fail(ctx, 'boss istenmedi ama var');
  if (opts.shop) {
    if (!m.shop) fail(ctx, 'dükkan yok');
    else if (!m.rooms.some(r => r.kind === 'shop' && m.shop.x >= r.x && m.shop.x < r.x + r.w && m.shop.y >= r.y && m.shop.y < r.y + r.h)) fail(ctx, 'tüccar kendi odasında değil');
  } else if (m.shop) fail(ctx, 'dükkan istenmedi ama var');
  if (m.chests.length < 1 || m.chests.length > 3) fail(ctx, 'sandık sayısı ' + m.chests.length);
  if (m.spawns.length < 20) fail(ctx, 'az doğum noktası ' + m.spawns.length);
  if (m.items.length < 3) fail(ctx, 'az eşya noktası');
  stats.spawns += m.spawns.length;
  // erişilebilirlik
  const seen = flood4(m);
  const reach = (p, what) => {
    if (!p || p.x < 0 || p.y < 0 || p.x >= w || p.y >= h) return fail(ctx, what + ' harita dışı');
    const t = tiles[p.y * w + p.x];
    if (!DG.passable(t)) return fail(ctx, what + ' geçilemez karoda (' + t + ')');
    if (!seen[p.y * w + p.x]) fail(ctx, what + ' ulaşılamaz');
  };
  reach(m.stairs, 'merdiven');
  m.spawns.forEach(p => reach(p, 'doğum'));
  m.items.forEach(p => reach(p, 'eşya'));
  m.chests.forEach(p => reach(p, 'sandık'));
  m.traps.forEach(p => { reach(p, 'tuzak'); if (['diken', 'zehir', 'alev', 'alarm', 'isinlanma'].indexOf(p.kind) < 0) fail(ctx, 'tuzak türü ' + p.kind); });
  if (m.shop) reach(m.shop, 'dükkan');
  if (m.boss) reach(m.boss, 'boss');
  const sr = m.rooms.find(r => r.kind === 'start');
  if (sr) m.spawns.forEach(p => { if (p.x >= sr.x && p.x < sr.x + sr.w && p.y >= sr.y && p.y < sr.y + sr.h) fail(ctx, 'doğum noktası başlangıç odasında'); });
  // tüm geçilebilir karolar bağlı (lav/uçurum yol kesmemiş)
  let unreach = 0;
  for (let i = 0; i < w * h; i++) {
    if (DG.passable(tiles[i]) && !seen[i]) unreach++;
    if (tiles[i] === T.WATER) stats.water++; else if (tiles[i] === T.LAVA) stats.lava++; else if (tiles[i] === T.CHASM) stats.chasm++;
  }
  if (unreach) fail(ctx, unreach + ' geçilebilir karo kopuk');
  // dekor
  m.decor.forEach(d => {
    const t = tiles[d.y * w + d.x];
    if (d.kind === 'mesale' ? t !== T.WALL : t !== T.FLOOR) fail(ctx, 'dekor ' + d.kind + ' yanlış karoda');
  });
  // kapılar gerçekçi: iki yanı duvar, diğer iki yanı geçilebilir
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (tiles[i] !== T.DOOR) continue;
    stats.doors++;
    const L = tiles[i - 1], R = tiles[i + 1], U = tiles[i - w], D = tiles[i + w];
    const okH = L === T.WALL && R === T.WALL && DG.passable(U) && DG.passable(D);
    const okV = U === T.WALL && D === T.WALL && DG.passable(L) && DG.passable(R);
    if (!okH && !okV) { stats.badDoors++; fail(ctx, 'kapı (' + x + ',' + y + ') iki yanı duvar değil'); }
  }
  // merdiven uzaklığı
  const dmap = DG.path.dijkstra(w, h, (x, y) => DG.passable(tiles[y * w + x]), [m.start]);
  stats.dist += dmap[m.stairs.y * w + m.stairs.x];
  if (dmap[m.stairs.y * w + m.stairs.x] < 15) fail(ctx, 'merdiven çok yakın (' + dmap[m.stairs.y * w + m.stairs.x] + ')');
  // A*
  const pass = (x, y) => x >= 0 && y >= 0 && x < w && y < h && DG.passable(tiles[y * w + x]);
  const path = DG.path.find(w, h, pass, m.start.x, m.start.y, m.stairs.x, m.stairs.y, 20000);
  if (!path) fail(ctx, 'A* yol bulamadı');
  else {
    let px = m.start.x, py = m.start.y;
    for (const p of path) {
      const dx = p.x - px, dy = p.y - py;
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== 1) { fail(ctx, 'A* adımı bitişik değil'); break; }
      if (!pass(p.x, p.y)) { fail(ctx, 'A* geçilemez karoya bastı'); break; }
      if (dx && dy && !(pass(px + dx, py) && pass(px, py + dy))) { fail(ctx, 'A* köşe kesti'); break; }
      px = p.x; py = p.y;
    }
    if (px !== m.stairs.x || py !== m.stairs.y) fail(ctx, 'A* hedefe varmadı');
  }
  // döngü sayımı (kaba): koridor karoları arasında 2+ komşulu kavşaklar değil, Euler: E - V + 1
  return m;
}

function fovSymmetry(m, ctx) {
  const { w, h, tiles } = m, R = 8;
  const opaque = (x, y) => DG.opaque(tiles[y * w + x]);
  const floors = [];
  for (let i = 0; i < w * h; i++) if (tiles[i] === T.FLOOR) floors.push(i);
  const rng = DG.rng(7);
  const cache = new Map();
  const fov = i => { if (!cache.has(i)) cache.set(i, DG.fov.compute(w, h, opaque, i % w, (i - i % w) / w, R)); return cache.get(i); };
  let pairs = 0, bad = 0;
  for (let k = 0; k < 40; k++) {
    const a = rng.pick(floors), ax = a % w, ay = (a - ax) / w, va = fov(a);
    if (!va[a]) fail(ctx, 'FOV: kaynak kendini görmüyor');
    for (let i = 0; i < w * h; i++) {
      if (tiles[i] !== T.FLOOR || i === a) continue;
      const bx = i % w, by = (i - bx) / w;
      if ((bx - ax) * (bx - ax) + (by - ay) * (by - ay) > R * R) continue;
      pairs++;
      if (!!va[i] !== !!fov(i)[a]) bad++;
    }
    // duvarlar: görünür zemin karosuna bitişik duvar görünür olmalı (temel sağlamlık)
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!va[i] || tiles[i] !== T.FLOOR || Math.abs(x - ax) + Math.abs(y - ay) > 2) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = (y + dy) * w + x + dx;
        if (tiles[j] === T.WALL && !va[j] && (x + dx - ax) * (x + dx - ax) + (y + dy - ay) * (y + dy - ay) <= R * R) { fail(ctx, 'FOV: yakın duvar görünmüyor (' + (x + dx) + ',' + (y + dy) + ')'); return; }
      }
    }
  }
  if (bad) fail(ctx, 'FOV simetri bozuk: ' + bad + '/' + pairs);
  return pairs;
}

function ascii(m, title) {
  const { w, h, tiles } = m;
  const ch = { [T.WALL]: '#', [T.FLOOR]: '.', [T.DOOR]: '+', [T.DOOR_OPEN]: '/', [T.STAIRS]: '>', [T.STAIRS_UP]: '<', [T.WATER]: '~', [T.LAVA]: '%', [T.CHASM]: ':' };
  const g = [];
  for (let y = 0; y < h; y++) { const row = []; for (let x = 0; x < w; x++) row.push(ch[tiles[y * w + x]] || '?'); g.push(row); }
  m.decor.forEach(d => { if (d.kind === 'mesale') g[d.y][d.x] = 'i'; });
  m.items.forEach(p => { g[p.y][p.x] = '*'; });
  m.traps.forEach(p => { g[p.y][p.x] = '^'; });
  m.chests.forEach(p => { g[p.y][p.x] = 'C'; });
  if (m.shop) g[m.shop.y][m.shop.x] = 'S';
  if (m.boss) g[m.boss.y][m.boss.x] = 'B';
  console.log('\n' + title + ' (' + w + 'x' + h + ', oda ' + m.rooms.length + ', türler: ' + m.rooms.map(r => r.kind[0]).join('') + ')');
  console.log(g.map(r => r.join('')).join('\n'));
}

/* ---- çalıştır ---- */
const kept = {};
for (let floor = 1; floor <= FLOORS; floor++) {
  for (let s = 0; s < SEEDS; s++) {
    const seed = 1000 + s * 7919 + floor;
    const opts = { boss: floor % 5 === 0, shop: s % 3 === 0, themeWater: themeWater(floor) };
    const m = check(floor, seed, opts);
    if (s === 0) kept[floor] = m;
    if (s < 3) { // determinizm
      const m2 = DG.gen.generate(floor, seed, opts);
      let same = m2.w === m.w && m2.h === m.h;
      if (same) for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] !== m2.tiles[i]) { same = false; break; }
      const j = o => JSON.stringify([o.start, o.stairs, o.spawns, o.items, o.chests, o.traps, o.decor, o.shop, o.boss, o.rooms]);
      if (!same || j(m) !== j(m2)) fail('kat ' + floor + ' tohum ' + seed, 'determinizm bozuk');
    }
  }
}
// farklı tohum tipleri de çalışsın
DG.gen.generate(3, 'metin-tohum', {});
DG.gen.generate(3, 0, {});
// rng durumu
{
  const r = DG.rng(42); r.next(); r.next();
  const st = r.state(), r2 = DG.rng.fromState(st);
  if (r.next() !== r2.next() || r.int(1, 6) !== r2.int(1, 6)) fail('rng', 'fromState durumu geri yüklemedi');
  const a = DG.rng(5), b = DG.rng(5);
  for (let i = 0; i < 20; i++) if (a.next() !== b.next()) { fail('rng', 'aynı tohum farklı dizi'); break; }
  if (typeof a.seed !== 'number') fail('rng', 'seed alanı yok');
}
// Bresenham
{
  const l = DG.path.line(0, 0, 5, 2);
  if (l.length !== 6 || l[0].x !== 0 || l[5].x !== 5 || l[5].y !== 2) fail('line', 'bresenham uzunluğu/uçları');
}
let fovPairs = 0;
for (const f of [1, 5, 13]) fovPairs += fovSymmetry(kept[f], 'FOV kat ' + f);

console.log('Üretim: ' + count + ' harita, ortalama ' + (totalMs / count).toFixed(2) + ' ms, en uzun ' + maxMs.toFixed(2) + ' ms (' + maxInfo + ')');
console.log('Boyut ' + stats.minSize + '..' + stats.maxSize + ', ort. oda ' + (stats.rooms / count).toFixed(1) + ', ort. mağara ' + (stats.caves / count).toFixed(2)
  + ', ort. kapı ' + (stats.doors / count).toFixed(1) + ', ort. doğum ' + (stats.spawns / count).toFixed(0) + ', ort. merdiven uzaklığı ' + (stats.dist / count).toFixed(1));
console.log('Su karosu ' + stats.water + ', lav ' + stats.lava + ', uçurum ' + stats.chasm + '; FOV çift sayısı ' + fovPairs);
console.log('HATA SAYISI: ' + fails.length);
fails.slice(0, 30).forEach(f => console.log('  - ' + f));
ascii(kept[1], 'Kat 1');
ascii(kept[5], 'Kat 5 (boss)');
ascii(kept[13], 'Kat 13 (mağara)');
process.exitCode = fails.length ? 1 : 0;
