/* Dron Pilotu - 3B şehirde dron uçuşu: serbest keşif, halka yarışı, kargo teslimatı */
(function () {
  const U = Platform.util;

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const FOG = [206, 228, 242];
  function shade(rgb, k, f) {
    const r = rgb[0] * k, gg = rgb[1] * k, b = rgb[2] * k;
    return 'rgb(' + Math.round(r + (FOG[0] - r) * f) + ',' + Math.round(gg + (FOG[1] - gg) * f) + ',' + Math.round(b + (FOG[2] - b) * f) + ')';
  }

  /* ---------- Dünya (her seferinde aynı şehir: öğrenilebilir) ---------- */
  const BS = 50, ROAD = 12, NB = 6, CITY = NB * BS, EDGE = 900;
  function buildWorld() {
    const R = rng(20260611);
    const W = { buildings: [], trees: [], blocks: [], fields: [], pads: [], turbines: [], grid: new Map(), lake: null, spots: [] };
    const BCOL = ['#c9ced6', '#b8c4d4', '#d8cdb8', '#a9b7c6', '#c7b7a3', '#9fb0c2', '#d6d0c4', '#b4a99a', '#8fa3b8', '#c2c8cf'];
    const add = b => {
      W.buildings.push(b);
      const i0 = Math.floor(b.x0 / BS), i1 = Math.floor(b.x1 / BS), j0 = Math.floor(b.z0 / BS), j1 = Math.floor(b.z1 / BS);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const k = i + ',' + j;
        if (!W.grid.has(k)) W.grid.set(k, []);
        W.grid.get(k).push(b);
      }
    };
    const LAKE = { x0: 2 * BS + ROAD / 2, x1: 4 * BS - ROAD / 2, z0: -5 * BS + ROAD / 2, z1: -3 * BS - ROAD / 2 };
    W.lake = LAKE;
    for (let i = -NB; i < NB; i++) for (let j = -NB; j < NB; j++) {
      const x0 = i * BS + ROAD / 2, x1 = (i + 1) * BS - ROAD / 2, z0 = j * BS + ROAD / 2, z1 = (j + 1) * BS - ROAD / 2;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      let type = 'build';
      if (i === 0 && j === 0) type = 'home';
      else if (i === 0 && j === 1) type = 'park';
      else if (i >= 2 && i <= 3 && j >= -5 && j <= -4) type = 'lake';
      else if (i === -5 && j === 4) type = 'tower';
      else if (R() < 0.11) type = 'park';
      W.blocks.push({ x0, x1, z0, z1, cx, cz, type, i, j });
      if (type === 'home') { W.pads.push({ x: cx, z: cz, y: 0, home: true }); continue; }
      if (type === 'lake') continue;
      if (type === 'park') {
        for (let k = 0; k < 7; k++) W.trees.push({ x: U.lerp(x0 + 4, x1 - 4, R()), z: U.lerp(z0 + 4, z1 - 4, R()), h: 5 + R() * 4, c: R() < 0.5 ? '#3f8f3a' : '#4f9e3f' });
        W.spots.push({ x: cx, z: cz, y: 0, kind: 'park' });
        continue;
      }
      if (type === 'tower') {
        // kırmızı-beyaz radyo kulesi
        for (let k = 0; k < 8; k++) add({ x0: cx - 2, x1: cx + 2, z0: cz - 2, z1: cz + 2, y0: k * 14, h: (k + 1) * 14, rgb: hexRGB(k % 2 ? '#f1f3f5' : '#e03131'), tower: true });
        W.spots.push({ x: cx + 10, z: cz + 10, y: 0, kind: 'ground' });
        continue;
      }
      const dc = Math.hypot(cx, cz) / CITY;
      const tall = Math.max(0, 1 - dc * 1.1);
      const split = R();
      const lots = [];
      if (split < 0.3) lots.push([x0, x1, z0, z1]);
      else if (split < 0.6) { const m = U.lerp(x0, x1, 0.4 + R() * 0.2); lots.push([x0, m - 1.5, z0, z1], [m + 1.5, x1, z0, z1]); }
      else { const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2; lots.push([x0, mx - 1.5, z0, mz - 1.5], [mx + 1.5, x1, z0, mz - 1.5], [x0, mx - 1.5, mz + 1.5, z1], [mx + 1.5, x1, mz + 1.5, z1]); }
      lots.forEach(l => {
        if (R() < 0.12) return; // boş arsa
        const ins = 1 + R() * 3;
        const h = Math.round(6 + R() * 14 + tall * tall * (30 + R() * 70));
        add({ x0: l[0] + ins, x1: l[1] - ins, z0: l[2] + ins, z1: l[3] - ins, y0: 0, h, rgb: hexRGB(BCOL[Math.floor(R() * BCOL.length)]) });
      });
    }
    // Çatı pistleri (şarj istasyonu)
    const cand = W.buildings.filter(b => !b.tower && b.h > 14 && b.h < 60 && (b.x1 - b.x0) > 12 && (b.z1 - b.z0) > 12);
    for (let k = 0; k < 7 && cand.length; k++) {
      const b = cand.splice(Math.floor(R() * cand.length), 1)[0];
      b.pad = true;
      W.pads.push({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, y: b.h, b });
    }
    // Kır alanı: tarlalar, ağaçlar, rüzgar türbinleri
    const FC = ['#7fb35a', '#93c060', '#c9b45e', '#6fa24e', '#a8c46c', '#b59a5c'];
    for (let i = -9; i < 9; i++) for (let j = -9; j < 9; j++) {
      const x0 = i * 100, z0 = j * 100;
      if (x0 >= -CITY - 20 && x0 + 100 <= CITY + 20 && z0 >= -CITY - 20 && z0 + 100 <= CITY + 20) continue;
      W.fields.push({ x0: x0 + 2, x1: x0 + 98, z0: z0 + 2, z1: z0 + 98, rgb: hexRGB(FC[Math.floor(R() * FC.length)]) });
    }
    for (let k = 0; k < 260; k++) {
      const x = (R() * 2 - 1) * (EDGE - 20), z = (R() * 2 - 1) * (EDGE - 20);
      if (Math.abs(x) < CITY + 15 && Math.abs(z) < CITY + 15) continue;
      if (x > 430 && x < 760 && z > -60 && z < 380) continue;
      W.trees.push({ x, z, h: 6 + R() * 6, c: R() < 0.5 ? '#3c7d35' : '#4c8f3c' });
    }
    for (let k = 0; k < 6; k++) {
      const x = 480 + (k % 3) * 110, z = 40 + Math.floor(k / 3) * 160 + (k % 2) * 30;
      W.turbines.push({ x, z, ph: R() * 6 });
      add({ x0: x - 1, x1: x + 1, z0: z - 1, z1: z + 1, y0: 0, h: 44, rgb: hexRGB('#eef1f4'), turb: true });
    }
    // Görev noktaları: kavşaklar ve çatılar
    for (let i = -NB + 1; i < NB; i++) for (let j = -NB + 1; j < NB; j++) {
      const x = i * BS, z = j * BS;
      if (x > LAKE.x0 - 8 && x < LAKE.x1 + 8 && z > LAKE.z0 - 8 && z < LAKE.z1 + 8) continue;
      W.spots.push({ x, z, y: 0, kind: 'cross', i, j });
    }
    W.buildings.forEach(b => { if (!b.tower && !b.turb && b.h < 50 && (b.x1 - b.x0) > 8 && (b.z1 - b.z0) > 8) W.spots.push({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, y: b.h, kind: 'roof', b }); });
    return W;
  }
  let WORLD = null;

  Platform.register({
    id: 'drone', name: 'Dron Pilotu', gen: 'modern', genre: 'Simülasyon', isNew: true,
    colors: ['#22d3ee', '#0e7490'],
    desc: '3B şehirde dron uçur: serbest keşif, halka yarışı ve kargo teslimatı.',
    help: '<ul><li><b>Sol joystick:</b> yukarı/aşağı = <b>yüksel / alçal</b>, sağa/sola = <b>dön</b>.</li><li><b>Sağ joystick:</b> yukarı = <b>ileri</b>, aşağı = geri, sağa/sola = yana kay.</li><li>Joystickler parmağını koyduğun yerde belirir. Bırakınca dron havada asılı kalır.</li><li>Klavye: <b>W/S</b> yüksel/alçal, <b>A/D</b> dön, <b>ok tuşları</b> ileri/geri/yanlar, <b>C</b> kamera.</li><li>🎥 düğmesi takip ve <b>FPV (kokpit)</b> kamerası arasında geçiş yapar. Sağ üstte mini harita var.</li><li>🔋 Batarya azalırsa <b>H</b> işaretli pistlere (çatılarda ve başlangıçta) iniş yap: şarj olur.</li><li>Binalara hızlı çarparsan dron hasar alır. 120 m irtifa sınırı vardır.</li><li><b>Serbest Uçuş:</b> şehirdeki 40 kristali bul. <b>Halka Yarışı:</b> halkalardan sırayla, en kısa sürede geç. <b>Kargo:</b> paketi al, hedefe indir, süre bitmeden olabildiğince çok teslimat yap.</li></ul>',
    icon: '<rect x="25" y="27" width="14" height="10" rx="3" fill="#0f172a"/><path d="M14 20 L50 44 M50 20 L14 44" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/><ellipse cx="14" cy="20" rx="10" ry="3.5" fill="#e0f2fe"/><ellipse cx="50" cy="20" rx="10" ry="3.5" fill="#e0f2fe"/><ellipse cx="14" cy="44" rx="10" ry="3.5" fill="#e0f2fe"/><ellipse cx="50" cy="44" rx="10" ry="3.5" fill="#e0f2fe"/><circle cx="32" cy="32" r="2.4" fill="#22d3ee"/>',
    options: [
      { key: 'mode', label: 'GÖREV', choices: [['free', 'Serbest Uçuş'], ['race', 'Halka Yarışı'], ['cargo', 'Kargo']], def: 'free' },
      { key: 'assist', label: 'UÇUŞ YARDIMI', choices: [['on', 'Yardımlı (kolay)'], ['off', 'Manuel (gerçekçi)']], def: 'on' },
      { key: 'cam', label: 'KAMERA', choices: [['chase', 'Takip'], ['fpv', 'FPV (kokpit)']], def: 'chase' }
    ],
    bestKey: o => o.mode,
    create(s, opts) {
      if (!WORLD) WORLD = buildWorld();
      const WD = WORLD;
      const MODE = opts.mode || 'free', ASSIST = opts.assist !== 'off';
      let camMode = opts.cam || 'chase';
      const W = 360;
      const view = s.canvasFill(W, 560, 760);
      const g = view.g, H = view.H;
      const F = 230, CX = W / 2, CY = H * 0.44;
      const DRAW = 540, FOG0 = 140;

      /* ---------- durum ---------- */
      const home = WD.pads.find(p => p.home);
      const d = { x: home.x, y: 0.3, z: home.z - 2, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, roll: 0, rot: 0, bat: 1, hp: 100, landed: true, surf: 0 };
      const cam = { x: d.x, y: 3, z: d.z - 7, yaw: 0, pitch: 0.2 };
      const inp = { thr: 0, yaw: 0, fwd: 0, side: 0 };
      const keys = {};
      let t = 0, score = 0, over = false, hintT = 0, warn = '', warnT = 0, charging = false;
      const parts = [];
      const msgs = [];
      // mod verileri
      let crystals = [], rings = [], ringIdx = 0, raceT = 0, cargo = null, timeLeft = 90, deliveries = 0;

      if (MODE === 'free') {
        const R = rng(777);
        const roofs = WD.buildings.filter(b => !b.turb && !b.tower);
        for (let k = 0; k < 40; k++) {
          const r = R();
          if (r < 0.45) { const b = roofs[Math.floor(R() * roofs.length)]; crystals.push({ x: (b.x0 + b.x1) / 2, y: b.h + 2, z: (b.z0 + b.z1) / 2 }); }
          else if (r < 0.8) { const sp = WD.spots.filter(q => q.kind === 'cross'); const q = sp[Math.floor(R() * sp.length)]; crystals.push({ x: q.x + (R() - 0.5) * 6, y: 3 + R() * 25, z: q.z + (R() - 0.5) * 6 }); }
          else if (r < 0.9) { const L = WD.lake; crystals.push({ x: U.lerp(L.x0 + 10, L.x1 - 10, R()), y: 2 + R() * 4, z: U.lerp(L.z0 + 10, L.z1 - 10, R()) }); }
          else { const a = R() * Math.PI * 2, rr = CITY + 60 + R() * 400; crystals.push({ x: Math.cos(a) * rr, y: 4 + R() * 30, z: Math.sin(a) * rr }); }
        }
        const tw = WD.buildings.filter(b => b.tower).pop();
        crystals[39] = { x: (tw.x0 + tw.x1) / 2, y: tw.h + 3, z: (tw.z0 + tw.z1) / 2 };
      } else if (MODE === 'race') {
        const R = rng((Math.random() * 1e9) | 0);
        let ci = 0, cj = 0, prev = null;
        const seen = new Set(['0,0']);
        for (let k = 0; k < 16; k++) {
          const opts2 = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => {
            const ni = ci + a, nj = cj + b;
            if (Math.abs(ni) > NB - 1 || Math.abs(nj) > NB - 1 || seen.has(ni + ',' + nj)) return false;
            const x = ni * BS, z = nj * BS, L = WD.lake;
            return !(x > L.x0 - 8 && x < L.x1 + 8 && z > L.z0 - 8 && z < L.z1 + 8);
          });
          if (!opts2.length) break;
          let [a, b] = opts2[Math.floor(R() * opts2.length)];
          if (prev && R() < 0.5 && opts2.some(o => o[0] === prev[0] && o[1] === prev[1])) [a, b] = prev;
          const mx = (ci + a / 2) * BS, mz = (cj + b / 2) * BS;
          ci += a; cj += b; seen.add(ci + ',' + cj); prev = [a, b];
          const high = R() < 0.18;
          rings.push({ x: mx, z: mz, y: high ? 50 + R() * 25 : 5 + R() * 22, nx: a, nz: b, r: 4.5 });
        }
      }
      function startCargo() {
        let from = null;
        for (let k = 0; k < 60 && !from; k++) {
          const c = WD.spots[Math.floor(Math.random() * WD.spots.length)];
          const dd = Math.hypot(c.x - d.x, c.z - d.z);
          if (dd > 40 && dd < 200) from = c;
        }
        cargo = { from: from || WD.spots[0], to: null, has: false, hold: 0 };
        let to = null;
        for (let k = 0; k < 60 && !to; k++) {
          const c = WD.spots[Math.floor(Math.random() * WD.spots.length)];
          const dd = Math.hypot(c.x - cargo.from.x, c.z - cargo.from.z);
          if (dd > 110 && dd < 360) to = c;
        }
        cargo.to = to || WD.spots[1];
      }
      if (MODE === 'cargo') startCargo();

      /* ---------- kamera ve izdüşüm ---------- */
      let cyw, syw, cpt, spt;
      function setCam() { cyw = Math.cos(cam.yaw); syw = Math.sin(cam.yaw); cpt = Math.cos(cam.pitch); spt = Math.sin(cam.pitch); }
      function toCam(x, y, z, out) {
        const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
        out[0] = dx * cyw - dz * syw;
        out[1] = dx * syw * spt + dy * cpt + dz * cyw * spt;
        out[2] = dx * syw * cpt - dy * spt + dz * cyw * cpt;
        return out;
      }
      const NEAR = 0.25;
      const tmpA = [];
      for (let i = 0; i < 16; i++) tmpA.push([0, 0, 0]);
      // Dünya noktalarından çokgen çiz (yakın düzlemde kırpar)
      function poly(pts, fill, stroke, lw) {
        const n = pts.length;
        const cs = [];
        let behind = 0;
        for (let i = 0; i < n; i++) { const c = toCam(pts[i][0], pts[i][1], pts[i][2], [0, 0, 0]); if (c[2] < NEAR) behind++; cs.push(c); }
        if (behind === n) return false;
        let list = cs;
        if (behind) {
          list = [];
          for (let i = 0; i < n; i++) {
            const a = cs[i], b = cs[(i + 1) % n];
            const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
            if (ain) list.push(a);
            if (ain !== bin) {
              const k = (NEAR - a[2]) / (b[2] - a[2]);
              list.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]);
            }
          }
          if (list.length < 3) return false;
        }
        g.beginPath();
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          const X = CX + c[0] / c[2] * F, Y = CY - c[1] / c[2] * F;
          if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
        }
        g.closePath();
        if (fill) { g.fillStyle = fill; g.fill(); }
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); }
        return true;
      }
      const pc = [0, 0, 0];
      function proj(x, y, z) {
        toCam(x, y, z, pc);
        if (pc[2] < NEAR) return null;
        return { x: CX + pc[0] / pc[2] * F, y: CY - pc[1] / pc[2] * F, z: pc[2] };
      }
      function line3(a, b) {
        const ca = toCam(a[0], a[1], a[2], [0, 0, 0]), cb = toCam(b[0], b[1], b[2], [0, 0, 0]);
        if (ca[2] < NEAR && cb[2] < NEAR) return;
        if (ca[2] < NEAR) { const k = (NEAR - ca[2]) / (cb[2] - ca[2]); ca[0] += (cb[0] - ca[0]) * k; ca[1] += (cb[1] - ca[1]) * k; ca[2] = NEAR; }
        if (cb[2] < NEAR) { const k = (NEAR - cb[2]) / (ca[2] - cb[2]); cb[0] += (ca[0] - cb[0]) * k; cb[1] += (ca[1] - cb[1]) * k; cb[2] = NEAR; }
        g.moveTo(CX + ca[0] / ca[2] * F, CY - ca[1] / ca[2] * F);
        g.lineTo(CX + cb[0] / cb[2] * F, CY - cb[1] / cb[2] * F);
      }
      const fogK = dist => U.clamp((dist - FOG0) / (DRAW - FOG0), 0, 1);
      // Görüş alanı dışındaki nesneleri ele
      function visible(x, y, z, rad) {
        toCam(x, y, z, pc);
        if (pc[2] < -rad) return false;
        if (pc[2] > DRAW + rad) return false;
        const lim = (Math.abs(pc[2]) + rad) * 1.0 + rad;
        return Math.abs(pc[0]) < lim * 0.9 + rad && Math.abs(pc[1]) < lim * 1.9 + rad;
      }

      /* ---------- çizim parçaları ---------- */
      function drawSkyGround() {
        const hy = CY - Math.tan(cam.pitch) * F;
        const sky = g.createLinearGradient(0, Math.min(hy, 0) - 200, 0, hy);
        sky.addColorStop(0, '#3d8fd6'); sky.addColorStop(1, '#cfe6f5');
        g.fillStyle = sky; g.fillRect(0, 0, W, Math.max(0, Math.min(H, hy)));
        // uzak dağlar (kameranın yönüne göre panorama)
        g.fillStyle = '#a9c3d6';
        g.beginPath(); g.moveTo(0, hy);
        for (let x = 0; x <= W; x += 6) {
          const a = cam.yaw + Math.atan((x - CX) / F);
          const hgt = 14 + 10 * Math.sin(a * 3) + 7 * Math.sin(a * 7 + 1) + 4 * Math.sin(a * 13 + 2);
          g.lineTo(x, hy - hgt * (F / 230) * Math.cos(cam.pitch));
        }
        g.lineTo(W, hy); g.fill();
        if (hy < H) {
          const gr = g.createLinearGradient(0, hy, 0, H);
          gr.addColorStop(0, 'rgb(' + FOG.join(',') + ')'); gr.addColorStop(Math.min(1, 40 / Math.max(1, H - hy)), '#9fbf86'); gr.addColorStop(1, '#6f9a52');
          g.fillStyle = gr; g.fillRect(0, Math.max(0, hy), W, H - Math.max(0, hy));
        }
      }
      function decal(x0, x1, z0, z1, y, rgb, k) {
        const cx = U.clamp(cam.x, x0, x1), cz = U.clamp(cam.z, z0, z1);
        const dist = Math.hypot(cx - cam.x, cz - cam.z, cam.y - y);
        if (dist > DRAW) return;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, rad = Math.hypot(x1 - x0, z1 - z0) / 2;
        if (!visible(mx, y, mz, rad)) return;
        poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], shade(rgb, k || 1, fogK(dist)));
      }
      const C_ASPH = hexRGB('#5d6470'), C_WALK = hexRGB('#b9bec5'), C_PARK = hexRGB('#5fa34a'), C_LAKE = hexRGB('#3a8fc7'), C_PLAZA = hexRGB('#d9d2c2'), C_PAD = hexRGB('#2b2f36');
      function drawGroundLayer() {
        for (const f of WD.fields) decal(f.x0, f.x1, f.z0, f.z1, 0, f.rgb);
        for (const b of WD.blocks) {
          decal(b.x0 - ROAD / 2, b.x1 + ROAD / 2, b.z0 - ROAD / 2, b.z1 + ROAD / 2, 0, C_ASPH);
          if (b.type === 'lake') continue;
          decal(b.x0, b.x1, b.z0, b.z1, 0.02, b.type === 'park' ? C_PARK : b.type === 'home' ? C_PLAZA : C_WALK);
        }
        const L = WD.lake;
        decal(L.x0, L.x1, L.z0, L.z1, 0.04, C_LAKE);
        // yol şeritleri (yakındakiler)
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2;
        g.beginPath();
        for (let k = -NB; k <= NB; k++) {
          const c = k * BS;
          for (let m = -NB; m < NB; m++) {
            const a = m * BS + ROAD / 2 + 4, b = (m + 1) * BS - ROAD / 2 - 4;
            if (Math.hypot(c - cam.x, (a + b) / 2 - cam.z) < 130) line3([c, 0.05, a], [c, 0.05, b]);
            if (Math.hypot((a + b) / 2 - cam.x, c - cam.z) < 130) line3([a, 0.05, c], [b, 0.05, c]);
          }
        }
        g.stroke();
        for (const p of WD.pads) if (p.home) drawPad(p);
        if (!shadowB) drawShadow();
      }
      function drawPad(p) {
        const dist = Math.hypot(p.x - cam.x, p.z - cam.z, p.y - cam.y);
        if (dist > 300) return;
        const y = p.y + 0.06, r = 4.2, pts = [];
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pts.push([p.x + Math.cos(a) * r, y, p.z + Math.sin(a) * r]); }
        poly(pts, shade(C_PAD, 1, fogK(dist)), charging && Math.hypot(d.x - p.x, d.z - p.z) < 5 ? '#69db7c' : '#ffd43b', 2);
        g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, 6 / Math.max(1, dist / 10));
        g.beginPath();
        line3([p.x - 1.4, y, p.z - 1.8], [p.x - 1.4, y, p.z + 1.8]);
        line3([p.x + 1.4, y, p.z - 1.8], [p.x + 1.4, y, p.z + 1.8]);
        line3([p.x - 1.4, y, p.z], [p.x + 1.4, y, p.z]);
        g.stroke();
      }
      function drawBuilding(b, dist) {
        const f = fogK(dist);
        const { x0, x1, z0, z1, h } = b;
        const y0 = b.y0 || 0;
        const near = dist < 110 && !b.tower && !b.turb && h > 7;
        const faces = [];
        if (cam.x > x1) faces.push([[x1, y0, z0], [x1, y0, z1], [x1, h, z1], [x1, h, z0]], 0.86);
        if (cam.x < x0) faces.push([[x0, y0, z1], [x0, y0, z0], [x0, h, z0], [x0, h, z1]], 0.68);
        if (cam.z > z1) faces.push([[x1, y0, z1], [x0, y0, z1], [x0, h, z1], [x1, h, z1]], 0.78);
        if (cam.z < z0) faces.push([[x0, y0, z0], [x1, y0, z0], [x1, h, z0], [x0, h, z0]], 0.6);
        for (let i = 0; i < faces.length; i += 2) {
          const q = faces[i];
          if (!poly(q, shade(b.rgb, faces[i + 1], f))) continue;
          if (near) {
            // kat çizgileri ve pencere sütunları
            g.strokeStyle = 'rgba(40,55,75,' + (0.35 * (1 - f)) + ')'; g.lineWidth = 1;
            g.beginPath();
            for (let y = 3.5; y < h - 1; y += 3.5) line3([q[0][0], y, q[0][2]], [q[1][0], y, q[1][2]]);
            const len = Math.hypot(q[1][0] - q[0][0], q[1][2] - q[0][2]);
            const n = Math.floor(len / 4.5);
            for (let k = 1; k < n; k++) {
              const tk = k / n;
              const x = U.lerp(q[0][0], q[1][0], tk), z = U.lerp(q[0][2], q[1][2], tk);
              line3([x, 1, z], [x, h - 1, z]);
            }
            g.stroke();
          }
        }
        if (cam.y > h) {
          poly([[x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]], shade(b.rgb, 1.08, f));
          if (b.pad) drawPad({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, y: h });
          if (b === shadowB) drawShadow();
          else if (near && !b.tower && (x1 - x0) > 8) {
            // çatı üstü küçük makine dairesi
            const mx = x0 + (x1 - x0) * 0.3, mz = z0 + (z1 - z0) * 0.3;
            poly([[mx, h + 1.6, mz], [mx + 3, h + 1.6, mz], [mx + 3, h + 1.6, mz + 2.5], [mx, h + 1.6, mz + 2.5]], shade(b.rgb, 0.9, f));
          }
        }
      }
      function drawTree(tr, dist) {
        const f = fogK(dist), rgb = tr.rgb || (tr.rgb = hexRGB(tr.c));
        const r = tr.h * 0.32, y0 = tr.h * 0.25;
        g.strokeStyle = shade([100, 70, 40], 1, f); g.lineWidth = Math.max(1, 30 / dist);
        g.beginPath(); line3([tr.x, 0, tr.z], [tr.x, y0, tr.z]); g.stroke();
        const top = [tr.x, tr.h, tr.z];
        const base = [[tr.x - r, y0, tr.z - r], [tr.x + r, y0, tr.z - r], [tr.x + r, y0, tr.z + r], [tr.x - r, y0, tr.z + r]];
        const shades = [0.62, 0.86, 0.78, 0.7];
        for (let i = 0; i < 4; i++) {
          const a = base[i], b = base[(i + 1) % 4];
          // yüz normali (yaklaşık): kenarın orta noktasından dışa
          const mx = (a[0] + b[0]) / 2 - tr.x, mz = (a[2] + b[2]) / 2 - tr.z;
          if (mx * (cam.x - tr.x) + mz * (cam.z - tr.z) + 0.3 * r * (cam.y - y0) < 0) continue;
          poly([a, b, top], shade(rgb, shades[i], f));
        }
      }
      function drawTurbine(tb, dist) {
        const hub = [tb.x, 45, tb.z - 1.6];
        const f = fogK(dist);
        g.strokeStyle = shade([245, 247, 250], 1, f); g.lineWidth = Math.max(1.2, 90 / dist);
        g.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = tb.ph + t * 1.4 + k * Math.PI * 2 / 3;
          line3(hub, [tb.x + Math.cos(a) * 17, 45 + Math.sin(a) * 17, tb.z - 1.6]);
        }
        g.stroke();
      }
      function drawRing(r, dist, active) {
        const px = r.nz, pz = -r.nx;
        const pts = [];
        for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; pts.push([r.x + Math.cos(a) * r.r * px, r.y + Math.sin(a) * r.r, r.z + Math.cos(a) * r.r * pz]); }
        const lw = Math.max(2, 70 / Math.max(5, dist));
        poly(pts, null, active ? (Math.sin(t * 8) > 0 ? '#ffd43b' : '#ff922b') : 'rgba(125,249,255,.85)', lw);
        if (active) poly(pts, 'rgba(255,212,59,.12)');
      }
      function drawGem(x, y, z, dist, col) {
        const p = proj(x, y + Math.sin(t * 2 + x) * 0.4, z);
        if (!p) return;
        const sz = Math.max(3, 1.2 / p.z * F);
        const w = sz * (0.55 + Math.abs(Math.cos(t * 2.5 + z)) * 0.45);
        g.fillStyle = col; g.globalAlpha = 1 - fogK(dist) * 0.7;
        g.beginPath(); g.moveTo(p.x, p.y - sz); g.lineTo(p.x + w * 0.7, p.y); g.lineTo(p.x, p.y + sz); g.lineTo(p.x - w * 0.7, p.y); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.7)';
        g.beginPath(); g.moveTo(p.x, p.y - sz); g.lineTo(p.x + w * 0.25, p.y - sz * 0.2); g.lineTo(p.x - w * 0.3, p.y - sz * 0.1); g.closePath(); g.fill();
        if (dist > 60) { g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, sz + 4, 0, Math.PI * 2); g.stroke(); }
        g.globalAlpha = 1;
      }
      function drawBeam(x, y, z, col, dist) {
        const b = proj(x, y, z), tp = proj(x, y + 60, z);
        if (!b || !tp) return;
        const w = Math.max(4, 2.5 / b.z * F);
        const gr = g.createLinearGradient(0, b.y, 0, tp.y);
        gr.addColorStop(0, col.replace('A', '.55')); gr.addColorStop(1, col.replace('A', '0'));
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(b.x - w, b.y); g.lineTo(b.x + w, b.y); g.lineTo(tp.x + w * 0.6, tp.y); g.lineTo(tp.x - w * 0.6, tp.y); g.fill();
        // yer halkası
        const pts = [];
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pts.push([x + Math.cos(a) * 3.5, y + 0.1, z + Math.sin(a) * 3.5]); }
        poly(pts, null, col.replace('A', '1'), Math.max(1.5, 40 / Math.max(5, dist)));
      }
      function droneRot(lx, ly, lz) {
        const cr = Math.cos(d.roll), sr = Math.sin(d.roll), cp = Math.cos(d.pitch), sp = Math.sin(d.pitch), cyw2 = Math.cos(d.yaw), syw2 = Math.sin(d.yaw);
        let x = lx * cr + ly * sr, y = -lx * sr + ly * cr, z = lz;
        const y2 = y * cp - z * sp, z2 = y * sp + z * cp;
        return [d.x + x * cyw2 + z2 * syw2, d.y + y2, d.z - x * syw2 + z2 * cyw2];
      }
      let shadowB = null;
      function findShadowB() {
        shadowB = null;
        let h = 0;
        for (const b of nearBuildings(d.x, d.z)) if (d.x > b.x0 && d.x < b.x1 && d.z > b.z0 && d.z < b.z1 && b.h <= d.y + 0.6 && b.h > h) { h = b.h; shadowB = b; }
      }
      function drawShadow() {
        if (over) return;
        const sh = shadowB ? shadowB.h : 0;
        const hgt = d.y - sh;
        if (hgt > 40) return;
        const pts = [];
        const r = 0.8 * (1 + hgt * 0.02);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([d.x + Math.cos(a) * r, sh + 0.08, d.z + Math.sin(a) * r]); }
        poly(pts, 'rgba(0,0,0,' + (0.35 * (1 - hgt / 40)) + ')');
      }
      function drawDrone() {
        if (camMode === 'fpv') return;
        const S = 1.6;
        const arms = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
        g.strokeStyle = '#1f2933'; g.lineWidth = Math.max(2, 0.12 * S / Math.max(0.5, distCam()) * F);
        g.lineCap = 'round';
        g.beginPath();
        arms.forEach(([ax, az]) => line3(droneRot(0, 0, 0), droneRot(ax * 0.36 * S, 0.02, az * 0.36 * S)));
        g.stroke();
        g.lineCap = 'butt';
        // gövde
        const bw = 0.17 * S, bh = 0.08 * S, bl = 0.24 * S;
        const c = [];
        for (const [x, y, z] of [[-bw, -bh, -bl], [bw, -bh, -bl], [bw, -bh, bl], [-bw, -bh, bl], [-bw, bh, -bl], [bw, bh, -bl], [bw, bh, bl], [-bw, bh, bl]]) c.push(droneRot(x, y, z));
        const faces = [[4, 5, 6, 7, '#2b3440'], [0, 1, 5, 4, '#222a33'], [2, 3, 7, 6, '#38bdf8'], [1, 2, 6, 5, '#1b222a'], [3, 0, 4, 7, '#1b222a']];
        faces.forEach(fc => {
          const q = [c[fc[0]], c[fc[1]], c[fc[2]], c[fc[3]]];
          // arka yüz eleme: kamera yönündeki çapraz çarpım
          const ux = q[1][0] - q[0][0], uy = q[1][1] - q[0][1], uz = q[1][2] - q[0][2];
          const vx = q[3][0] - q[0][0], vy = q[3][1] - q[0][1], vz = q[3][2] - q[0][2];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          if (nx * (cam.x - q[0][0]) + ny * (cam.y - q[0][1]) + nz * (cam.z - q[0][2]) > 0) poly(q, fc[4]);
        });
        // pervaneler
        arms.forEach(([ax, az], k) => {
          const pts = [];
          for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pts.push(droneRot(ax * 0.36 * S + Math.cos(a) * 0.2 * S, 0.06, az * 0.36 * S + Math.sin(a) * 0.2 * S)); }
          poly(pts, 'rgba(220,235,245,.35)', 'rgba(255,255,255,.5)', 1);
          const a = d.rot * (k % 2 ? 1 : -1);
          g.strokeStyle = 'rgba(30,40,50,.75)'; g.lineWidth = 2;
          g.beginPath();
          line3(droneRot(ax * 0.36 * S + Math.cos(a) * 0.2 * S, 0.07, az * 0.36 * S + Math.sin(a) * 0.2 * S), droneRot(ax * 0.36 * S - Math.cos(a) * 0.2 * S, 0.07, az * 0.36 * S - Math.sin(a) * 0.2 * S));
          g.stroke();
        });
        // LED'ler
        const fl = droneRot(0, 0, bl + 0.02), bk = droneRot(0, 0, -bl - 0.02);
        const pf = proj(fl[0], fl[1], fl[2]), pb = proj(bk[0], bk[1], bk[2]);
        if (pf) { g.fillStyle = '#69db7c'; g.beginPath(); g.arc(pf.x, pf.y, 2.2, 0, Math.PI * 2); g.fill(); }
        if (pb && Math.sin(t * 8) > 0) { g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(pb.x, pb.y, 2.2, 0, Math.PI * 2); g.fill(); }
        if (cargo && cargo.has) {
          const top = droneRot(0, -bh, 0), bot = [d.x, d.y - 2.2, d.z];
          g.strokeStyle = '#333'; g.lineWidth = 1; g.beginPath(); line3(top, bot); g.stroke();
          const pp = [[bot[0] - 0.4, bot[1], bot[2] - 0.4], [bot[0] + 0.4, bot[1], bot[2] - 0.4], [bot[0] + 0.4, bot[1] - 0.7, bot[2] - 0.4], [bot[0] - 0.4, bot[1] - 0.7, bot[2] - 0.4]];
          poly(pp, '#c08a4a');
          poly([[bot[0] - 0.4, bot[1], bot[2] - 0.4], [bot[0] + 0.4, bot[1], bot[2] - 0.4], [bot[0] + 0.4, bot[1], bot[2] + 0.4], [bot[0] - 0.4, bot[1], bot[2] + 0.4]], '#d9a566');
        }
      }
      const distCam = () => Math.hypot(d.x - cam.x, d.y - cam.y, d.z - cam.z);
      // Kameradan noktaya giden doğru parçası bir binaya çarpıyor mu? (kutu-ışın testi)
      function occluded(px, py, pz, list) {
        const dx = px - cam.x, dy = py - cam.y, dz = pz - cam.z;
        for (const b of list) {
          let t0 = 0, t1 = 0.97;
          const lo = [b.x0 + 0.05, (b.y0 || 0), b.z0 + 0.05], hi = [b.x1 - 0.05, b.h - 0.05, b.z1 - 0.05];
          const o = [cam.x, cam.y, cam.z], v = [dx, dy, dz];
          let hit = true;
          for (let k = 0; k < 3; k++) {
            if (Math.abs(v[k]) < 1e-9) { if (o[k] < lo[k] || o[k] > hi[k]) { hit = false; break; } continue; }
            let ta = (lo[k] - o[k]) / v[k], tb = (hi[k] - o[k]) / v[k];
            if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
            if (ta > t0) t0 = ta;
            if (tb < t1) t1 = tb;
            if (t0 > t1) { hit = false; break; }
          }
          if (hit) return true;
        }
        return false;
      }

      /* ---------- fizik ---------- */
      function nearBuildings(x, z) {
        const i = Math.floor(x / BS), j = Math.floor(z / BS), out = [];
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = WD.grid.get((i + a) + ',' + (j + b)); if (l) for (const q of l) if (out.indexOf(q) < 0) out.push(q); }
        return out;
      }
      function damage(v, msg) {
        if (over) return;
        const dmg = Math.round((v - 6) * 4);
        if (dmg <= 0) return;
        d.hp -= dmg;
        s.sfx(dmg > 25 ? 'explode' : 'hit'); s.vibe(Math.min(200, 30 + dmg * 3));
        burst(d.x, d.y, d.z, ['#ffd43b', '#adb5bd', '#495057'], 10 + dmg / 3);
        flash = 0.25;
        if (d.hp <= 0) { d.hp = 0; crash(msg || 'Dron çarptı ve parçalandı.'); }
      }
      let flash = 0;
      function crash(msg) {
        if (over) return;
        over = true;
        burst(d.x, d.y, d.z, ['#ff922b', '#ffd43b', '#495057', '#212529'], 50);
        s.sfx('boom'); s.vibe(300);
        finish(false, msg);
      }
      function burst(x, y, z, cols, n) {
        for (let i = 0; i < n; i++) parts.push({ x, y, z, vx: U.rand(-6, 6), vy: U.rand(-2, 8), vz: U.rand(-6, 6), life: U.rand(0.5, 1.2), c: U.pick(cols) });
      }
      // Yardımlı modda engel algılama: binaya doğru giden hız bileşeni yaklaştıkça kesilir
      function avoid() {
        const sp = Math.hypot(d.vx, d.vz);
        if (sp < 0.8) return;
        const look = 1.6 + sp * 0.45;
        for (const b of nearBuildings(d.x, d.z)) {
          if (d.y > b.h + 0.7 || d.y < (b.y0 || 0) - 0.7) continue;
          const cx = U.clamp(d.x, b.x0, b.x1), cz = U.clamp(d.z, b.z0, b.z1);
          let nx = d.x - cx, nz = d.z - cz;
          const dist = Math.hypot(nx, nz);
          if (dist < 0.01 || dist > look) continue;
          nx /= dist; nz /= dist;
          const vn = d.vx * nx + d.vz * nz;
          if (vn >= 0) continue;
          const k = U.clamp(1 - (dist - 1.1) / (look - 1.1), 0, 1);
          d.vx -= nx * vn * k; d.vz -= nz * vn * k;
          if (k > 0.35 && -vn > 2) { warn = '⚠ Engel algılandı · fren'; warnT = 0.25; }
        }
      }
      function physics(dt) {
        const fw = [Math.sin(d.yaw), Math.cos(d.yaw)], rt = [Math.cos(d.yaw), -Math.sin(d.yaw)];
        const dead = d.bat <= 0;
        const thr = dead ? -0.6 : inp.thr, fwdIn = dead ? 0 : inp.fwd, sideIn = dead ? 0 : inp.side;
        const load = cargo && cargo.has ? 0.8 : 1;
        let ax, az, ay;
        if (ASSIST) {
          const VMAX = 17;
          const tvx = (fw[0] * fwdIn + rt[0] * sideIn) * VMAX, tvz = (fw[1] * fwdIn + rt[1] * sideIn) * VMAX;
          ax = U.clamp((tvx - d.vx) * 2.4, -14, 14); az = U.clamp((tvz - d.vz) * 2.4, -14, 14);
          ay = U.clamp((thr * (thr > 0 ? 7 * load : 6) - d.vy) * 3, -14, 14);
        } else {
          ax = (fw[0] * fwdIn + rt[0] * sideIn) * 13 - d.vx * 0.32;
          az = (fw[1] * fwdIn + rt[1] * sideIn) * 13 - d.vz * 0.32;
          ay = thr * 11 * load - d.vy * 0.9 - (thr === 0 ? d.vy * 0.4 : 0);
        }
        d.vx += ax * dt; d.vz += az * dt; d.vy += ay * dt;
        if (ASSIST) avoid();
        if (d.y > 118 && d.vy > 0) { d.vy *= 0.85; warn = 'İrtifa sınırı: 120 m'; warnT = 0.3; }
        d.yaw += (dead ? 0 : inp.yaw) * 2.1 * dt;
        // görsel eğim: ivme yönüne doğru
        const af = ax * fw[0] + az * fw[1], ar = ax * rt[0] + az * rt[1];
        d.pitch += (U.clamp(af / 22, -0.5, 0.5) - d.pitch) * Math.min(1, dt * 8);
        d.roll += (U.clamp(ar / 22, -0.5, 0.5) - d.roll) * Math.min(1, dt * 8);
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        d.rot += dt * (d.landed && thr <= 0 ? 4 : 60);
        // sınırlar
        if (Math.abs(d.x) > EDGE || Math.abs(d.z) > EDGE) {
          d.x = U.clamp(d.x, -EDGE, EDGE); d.z = U.clamp(d.z, -EDGE, EDGE); d.vx *= -0.3; d.vz *= -0.3;
        }
        if (Math.abs(d.x) > EDGE - 60 || Math.abs(d.z) > EDGE - 60) { warn = 'Uçuş alanı sınırı! Geri dön'; warnT = 0.3; }
        // çarpışmalar
        const r = 0.5;
        d.landed = false; d.surf = 0;
        for (const b of nearBuildings(d.x, d.z)) {
          const y0 = b.y0 || 0;
          if (d.x > b.x0 - r && d.x < b.x1 + r && d.z > b.z0 - r && d.z < b.z1 + r && d.y < b.h + r && d.y > y0 - r) {
            const pen = [d.x - (b.x0 - r), (b.x1 + r) - d.x, d.z - (b.z0 - r), (b.z1 + r) - d.z, (b.h + r) - d.y];
            let m = 0;
            for (let i = 1; i < 5; i++) if (pen[i] < pen[m]) m = i;
            let nx = 0, ny = 0, nz = 0;
            if (m === 0) { d.x = b.x0 - r; nx = -1; } else if (m === 1) { d.x = b.x1 + r; nx = 1; } else if (m === 2) { d.z = b.z0 - r; nz = -1; } else if (m === 3) { d.z = b.z1 + r; nz = 1; } else { d.y = b.h + r; ny = 1; }
            const vn = d.vx * nx + d.vy * ny + d.vz * nz;
            if (vn < 0) {
              damage(-vn);
              const k = ny ? 1.0 : 1.35;
              d.vx -= k * vn * nx; d.vy -= k * vn * ny; d.vz -= k * vn * nz;
              if (!ny) { d.vx *= 0.7; d.vz *= 0.7; }
            }
            if (ny) { d.surf = b.h; if (Math.abs(d.vy) < 0.8) { d.landed = true; d.vx *= Math.pow(0.02, dt); d.vz *= Math.pow(0.02, dt); } }
          }
        }
        // zemin ve göl
        const L = WD.lake;
        const inLake = d.x > L.x0 && d.x < L.x1 && d.z > L.z0 && d.z < L.z1;
        if (d.y < 0.3) {
          if (inLake) { if (!over) { burst(d.x, 0.2, d.z, ['#bfefff', '#ffffff', '#3a8fc7'], 40); s.sfx('explode'); crash('Dron göle düştü!'); } d.y = 0.3; return; }
          if (d.vy < 0) damage(-d.vy);
          d.y = 0.3; if (d.vy < 0) d.vy = 0;
          d.landed = true;
          d.vx *= Math.pow(0.02, dt); d.vz *= Math.pow(0.02, dt);
        }
        // batarya
        if (MODE !== 'race') {
          const use = 1 / 200 + (Math.abs(inp.thr) + Math.abs(inp.fwd) + Math.abs(inp.side)) / 450;
          if (!d.landed || inp.thr > 0) d.bat = Math.max(0, d.bat - use * dt);
          charging = false;
          if (d.landed) for (const p of WD.pads) {
            if (Math.hypot(d.x - p.x, d.z - p.z) < 5 && Math.abs(d.y - p.y - 0.3) < 1) { charging = true; d.bat = Math.min(1, d.bat + dt * 0.18); }
          }
          if (d.bat <= 0 && d.landed && !charging && !over) { over = true; s.sfx('lose'); finish(false, 'Batarya bitti, dron yere indi.'); }
          if (d.bat < 0.2 && d.bat > 0 && Math.floor(t * 2) % 4 === 0) { warn = '🔋 Batarya zayıf! Bir H pistine in'; warnT = 0.3; }
        }
      }

      /* ---------- görevler ---------- */
      function addMsg(txt, col) { msgs.push({ txt, col: col || '#fff', t: 0 }); }
      function objectives(dt) {
        if (MODE === 'free') {
          for (let i = crystals.length - 1; i >= 0; i--) {
            const c = crystals[i];
            if (Math.hypot(c.x - d.x, c.y - d.y, c.z - d.z) < 2.6) {
              crystals.splice(i, 1);
              score += 100;
              s.score(score); s.record(score);
              s.sfx('coin'); s.vibe(25);
              burst(c.x, c.y, c.z, ['#b197fc', '#e5dbff', '#fff'], 16);
              addMsg('💎 Kristal! ' + (40 - crystals.length) + '/40', '#d0bfff');
              if (!crystals.length) { score += Math.max(0, 3000 - Math.floor(t) * 5); s.score(score); over = true; finish(true, 'Tüm kristalleri topladın! Süre: ' + U.fmtTime(t)); }
            }
          }
        } else if (MODE === 'race') {
          if (ringIdx > 0 || Math.hypot(d.vx, d.vz) > 0.5 || d.y > 1) raceT += dt;
          const r = rings[ringIdx];
          if (r) {
            const dx = d.x - r.x, dy = d.y - r.y, dz = d.z - r.z;
            const along = dx * r.nx + dz * r.nz;
            const lat = Math.hypot(dx - along * r.nx, dz - along * r.nz, dy);
            if (Math.abs(along) < 1.6 && lat < r.r) {
              ringIdx++;
              score += 200;
              s.score(score);
              s.sfx(ringIdx === rings.length ? 'win' : 'point'); s.vibe(20);
              burst(r.x, r.y, r.z, ['#ffd43b', '#fff'], 18);
              if (ringIdx === rings.length) {
                score += Math.max(0, Math.round((240 - raceT) * 25));
                s.score(score);
                over = true;
                finish(true, 'Parkur ' + U.fmtTime(raceT) + ' sürede tamamlandı!');
              } else addMsg('Halka ' + ringIdx + '/' + rings.length, '#ffe066');
            }
          }
        } else {
          timeLeft -= dt;
          if (timeLeft <= 0 && !over) { timeLeft = 0; over = true; finish(deliveries > 0, deliveries + ' paket teslim ettin.', 'Süre Doldu'); return; }
          const tg = cargo.has ? cargo.to : cargo.from;
          const hd = Math.hypot(d.x - tg.x, d.z - tg.z), vd = d.y - tg.y;
          if (hd < 4.5 && vd < 3.2 && vd > -0.5 && Math.hypot(d.vx, d.vz) < 4) {
            cargo.hold += dt;
            if (cargo.hold > 0.6) {
              cargo.hold = 0;
              if (!cargo.has) { cargo.has = true; s.sfx('power'); addMsg('📦 Paket alındı! Hedefe götür', '#ffd8a8'); }
              else {
                deliveries++;
                const pts = 150 + Math.round(Math.max(0, timeLeft) * 2);
                score += pts; s.score(score);
                const bonus = Math.round(12 + Math.hypot(cargo.to.x - cargo.from.x, cargo.to.z - cargo.from.z) / 18);
                timeLeft += bonus;
                s.sfx('win'); s.vibe(40);
                addMsg('✅ Teslim edildi! +' + pts + ' puan, +' + bonus + ' sn', '#8ce99a');
                startCargo();
              }
            }
          } else cargo.hold = 0;
        }
      }
      function finish(win, msg, title) {
        s.over({ score, win, msg, title: title || (win ? 'Görev Tamam!' : 'Dron Düştü'), emoji: win ? '🏆' : '💥', delay: win ? 900 : 1500 });
      }
      function target() {
        if (MODE === 'race') { const r = rings[ringIdx]; return r ? { x: r.x, y: r.y, z: r.z, label: 'Halka ' + (ringIdx + 1) } : null; }
        if (MODE === 'cargo') { const tg = cargo.has ? cargo.to : cargo.from; return { x: tg.x, y: tg.y, z: tg.z, label: cargo.has ? 'Teslimat' : 'Paket' }; }
        let best = null, bd = 1e9;
        for (const c of crystals) { const dd = Math.hypot(c.x - d.x, c.z - d.z); if (dd < bd) { bd = dd; best = c; } }
        if (d.bat < 0.25) {
          let pb = null, pd = 1e9;
          for (const p of WD.pads) { const dd = Math.hypot(p.x - d.x, p.z - d.z); if (dd < pd) { pd = dd; pb = p; } }
          return { x: pb.x, y: pb.y, z: pb.z, label: 'Şarj pisti' };
        }
        return best ? { x: best.x, y: best.y, z: best.z, label: 'En yakın kristal' } : null;
      }

      /* ---------- giriş: iki sanal joystick ---------- */
      const sticks = { L: null, R: null };
      const SR = 46;
      function camBtn() { return { x: 10, y: 84, w: 46, h: 34 }; }
      const inR = (p, r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
      function stickVal(st) {
        if (!st) return [0, 0];
        let dx = (st.x - st.ox) / SR, dy = (st.y - st.oy) / SR;
        const m = Math.hypot(dx, dy);
        if (m > 1) { dx /= m; dy /= m; }
        const dz = v => { const a = Math.abs(v); return a < 0.1 ? 0 : Math.sign(v) * Math.pow((a - 0.1) / 0.9, 1.3); };
        return [dz(dx), dz(dy)];
      }
      function readInput() {
        const [lx, ly] = stickVal(sticks.L), [rx, ry] = stickVal(sticks.R);
        const k = c => keys[c] ? 1 : 0;
        inp.thr = U.clamp(-ly + k('w') - k('s'), -1, 1);
        inp.yaw = U.clamp(lx + k('d') - k('a'), -1, 1);
        inp.fwd = U.clamp(-ry + k('ArrowUp') - k('ArrowDown') + k('i') - k('k'), -1, 1);
        inp.side = U.clamp(rx + k('ArrowRight') - k('ArrowLeft') + k('l') - k('j'), -1, 1);
        if (inp.thr || inp.fwd || inp.side || inp.yaw) hintT = Math.max(hintT, 6);
      }
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active()) return;
        Platform.sound.unlock();
        const p = view.pt(e);
        if (inR(p, camBtn())) { camMode = camMode === 'chase' ? 'fpv' : 'chase'; s.sfx('click'); return; }
        const side = p.x < W / 2 ? 'L' : 'R';
        if (sticks[side]) return;
        sticks[side] = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      });
      s.on(view.cv, 'pointermove', e => {
        const p = view.pt(e);
        for (const k of ['L', 'R']) { const st = sticks[k]; if (st && st.id === e.pointerId) { st.x = p.x; st.y = p.y; } }
      });
      const release = e => { for (const k of ['L', 'R']) if (sticks[k] && sticks[k].id === e.pointerId) sticks[k] = null; };
      s.on(view.cv, 'pointerup', release);
      s.on(view.cv, 'pointercancel', release);
      const KEYMAP = { w: 'w', W: 'w', s: 's', S: 's', a: 'a', A: 'a', d: 'd', D: 'd', i: 'i', I: 'i', k: 'k', K: 'k', j: 'j', J: 'j', l: 'l', L: 'l', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight' };
      s.key(e => {
        if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = true;
        if ((e.key === 'c' || e.key === 'C') && !e.repeat) camMode = camMode === 'chase' ? 'fpv' : 'chase';
      });
      s.keyup(e => { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });

      /* ---------- kamera güncelle ---------- */
      function updateCam(dt) {
        if (camMode === 'fpv') {
          const fw = [Math.sin(d.yaw), Math.cos(d.yaw)];
          cam.x = d.x + fw[0] * 0.4; cam.z = d.z + fw[1] * 0.4; cam.y = d.y + 0.15;
          cam.yaw = d.yaw;
          cam.pitch = 0.12 + d.pitch * 0.6;
          return;
        }
        let dy = angDiff(d.yaw, cam.yaw);
        cam.yaw += dy * Math.min(1, dt * 3.2);
        const back = 6.5, up = 2.4;
        const tx = d.x - Math.sin(cam.yaw) * back, tz = d.z - Math.cos(cam.yaw) * back;
        let ty = d.y + up;
        const k = Math.min(1, dt * 6);
        cam.x += (tx - cam.x) * k; cam.z += (tz - cam.z) * k; cam.y += (ty - cam.y) * k;
        if (cam.y < 0.8) cam.y = 0.8;
        const look = Math.atan2(cam.y - (d.y + 0.6), Math.hypot(d.x - cam.x, d.z - cam.z));
        cam.pitch = U.clamp(look, -0.6, 1.2);
      }
      function angDiff(a, b) { let x = a - b; while (x > Math.PI) x -= Math.PI * 2; while (x < -Math.PI) x += Math.PI * 2; return x; }

      /* ---------- HUD ---------- */
      function drawMinimap() {
        const mx = W - 56, my = 58, R0 = 46, SC = 0.24;
        g.save();
        g.beginPath(); g.arc(mx, my, R0, 0, Math.PI * 2); g.clip();
        g.fillStyle = 'rgba(20,30,45,.78)'; g.fillRect(mx - R0, my - R0, R0 * 2, R0 * 2);
        const c = Math.cos(d.yaw), sn = Math.sin(d.yaw);
        // dünya -> harita (yön yukarı)
        const m = (x, z) => { const dx = x - d.x, dz = z - d.z; return [mx + (dx * c - dz * sn) * SC, my - (dx * sn + dz * c) * SC]; };
        const L = WD.lake;
        g.fillStyle = '#3a8fc7';
        g.beginPath(); [[L.x0, L.z0], [L.x1, L.z0], [L.x1, L.z1], [L.x0, L.z1]].forEach((q, i) => { const p = m(q[0], q[1]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.fill();
        g.fillStyle = 'rgba(200,210,225,.75)';
        for (const b of nearBuildings(d.x, d.z).concat(WD.buildings.length < 600 ? WD.buildings : [])) {
          if (Math.abs(b.x0 - d.x) > 220 || Math.abs(b.z0 - d.z) > 220) continue;
          g.beginPath(); [[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]].forEach((q, i) => { const p = m(q[0], q[1]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.fill();
        }
        const dot = (x, z, col, r) => { let p = m(x, z); const dx = p[0] - mx, dy = p[1] - my, dd = Math.hypot(dx, dy); if (dd > R0 - 4) p = [mx + dx / dd * (R0 - 4), my + dy / dd * (R0 - 4)]; g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], r || 3, 0, Math.PI * 2); g.fill(); };
        for (const p of WD.pads) if (Math.hypot(p.x - d.x, p.z - d.z) * SC < R0 - 4 || d.bat < 0.3) dot(p.x, p.z, '#ffd43b', 2.2);
        if (MODE === 'free') for (const cr of crystals) if (Math.hypot(cr.x - d.x, cr.z - d.z) * SC < R0 - 4) dot(cr.x, cr.z, '#b197fc', 2.2);
        const tg = target();
        if (tg) dot(tg.x, tg.z, '#ff6b6b', 3.6);
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, R0, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#38d9ff';
        g.beginPath(); g.moveTo(mx, my - 6); g.lineTo(mx + 4.5, my + 5); g.lineTo(mx, my + 2.5); g.lineTo(mx - 4.5, my + 5); g.fill();
        // kuzey işareti
        U.text(g, 'K', mx - sn * (R0 - 8), my - c * (R0 - 8), 9, '#ffd43b', 'center', 900);
      }
      function bar(x, y, w, v, col, label) {
        g.fillStyle = 'rgba(0,0,0,.35)'; U.rr(g, x, y, w, 9, 4.5); g.fill();
        g.fillStyle = col; U.rr(g, x, y, Math.max(4, w * U.clamp(v, 0, 1)), 9, 4.5); g.fill();
        U.text(g, label, x - 4, y + 5, 10, '#fff', 'right', 800);
      }
      function drawHUD() {
        g.fillStyle = 'rgba(10,18,30,.55)'; U.rr(g, 8, 8, 150, 70, 12); g.fill();
        let l1 = '';
        if (MODE === 'free') l1 = '💎 ' + (40 - crystals.length) + ' / 40   ⏱ ' + U.fmtTime(t);
        else if (MODE === 'race') l1 = '⭕ ' + ringIdx + ' / ' + rings.length + '   ⏱ ' + U.fmtTime(raceT);
        else l1 = '📦 ' + deliveries + '   ⏱ ' + U.fmtTime(Math.ceil(timeLeft));
        U.text(g, l1, 16, 22, 13, MODE === 'cargo' && timeLeft < 15 && Math.sin(t * 10) > 0 ? '#ff8787' : '#fff', 'left', 900);
        const spd = Math.hypot(d.vx, d.vz);
        U.text(g, '↕ ' + Math.round(d.y) + ' m   ➜ ' + Math.round(spd * 3.6) + ' km/sa', 16, 40, 11, '#cfe8ff', 'left', 700);
        if (MODE !== 'race') bar(40, 52, 108, d.bat, d.bat < 0.2 ? '#ff6b6b' : d.bat < 0.45 ? '#ffd43b' : '#69db7c', '🔋');
        bar(40, 65, 108, d.hp / 100, d.hp < 35 ? '#ff6b6b' : '#4dabf7', '🛠');
        const cb = camBtn();
        g.fillStyle = 'rgba(10,18,30,.55)'; U.rr(g, cb.x, cb.y, cb.w, cb.h, 10); g.fill();
        U.text(g, camMode === 'fpv' ? '🎥' : '📷', cb.x + cb.w / 2, cb.y + cb.h / 2 + 1, 17, '#fff', 'center', 400);
        drawMinimap();
        // hedef oku
        const tg = target();
        if (tg) {
          const dx = tg.x - d.x, dz = tg.z - d.z, dist = Math.hypot(dx, dz);
          const ang = Math.atan2(dx, dz) - cam.yaw;
          const ax = W / 2, ay = 126;
          g.save(); g.translate(ax, ay); g.rotate(ang);
          g.fillStyle = 'rgba(255,107,107,.92)'; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(0, -16); g.lineTo(11, 8); g.lineTo(0, 3); g.lineTo(-11, 8); g.closePath(); g.stroke(); g.fill();
          g.restore();
          const dy = tg.y - d.y;
          U.text(g, tg.label + ' · ' + Math.round(dist) + ' m' + (Math.abs(dy) > 4 ? (dy > 0 ? ' ▲' : ' ▼') : ''), ax, ay + 24, 11.5, '#fff', 'center', 800);
        }
        if (camMode === 'fpv') {
          g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(CX - 14, CY); g.lineTo(CX - 5, CY); g.moveTo(CX + 5, CY); g.lineTo(CX + 14, CY); g.moveTo(CX, CY - 5); g.lineTo(CX, CY - 12); g.stroke();
          g.save(); g.translate(CX, CY); g.rotate(-d.roll);
          g.strokeStyle = 'rgba(125,249,255,.6)'; g.beginPath(); g.moveTo(-60, d.pitch * 120); g.lineTo(-25, d.pitch * 120); g.moveTo(25, d.pitch * 120); g.lineTo(60, d.pitch * 120); g.stroke();
          g.restore();
          U.text(g, '● REC', W - 70, 124, 11, Math.sin(t * 4) > 0 ? '#ff6b6b' : 'rgba(255,107,107,.3)', 'center', 900);
        }
        // joystickler
        const drawStick = (st, dx, label) => {
          const ox = st ? st.ox : dx, oy = st ? st.oy : H - 92;
          g.globalAlpha = st ? 0.9 : 0.4;
          g.fillStyle = 'rgba(10,18,30,.35)'; g.beginPath(); g.arc(ox, oy, SR + 8, 0, Math.PI * 2); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.stroke();
          let kx = ox, ky = oy;
          if (st) { const rr = Math.min(1, Math.hypot(st.x - ox, st.y - oy) / SR); const a = Math.atan2(st.y - oy, st.x - ox); kx = ox + Math.cos(a) * rr * SR; ky = oy + Math.sin(a) * rr * SR; }
          g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(kx, ky, 18, 0, Math.PI * 2); g.fill();
          if (!st) { U.text(g, label, ox, oy + SR + 20, 10, '#fff', 'center', 800); }
          g.globalAlpha = 1;
        };
        drawStick(sticks.L, 72, 'YÜKSEL · DÖN');
        drawStick(sticks.R, W - 72, 'İLERİ · YANA');
        if (hintT < 6) {
          g.globalAlpha = Math.min(1, (6 - hintT) / 1);
          g.fillStyle = 'rgba(10,18,30,.7)'; U.rr(g, 24, H * 0.47 - 30, W - 48, 60, 14); g.fill();
          U.text(g, 'Kalkış: sol joystick\'i YUKARI it', W / 2, H * 0.47 - 10, 14, '#fff', 'center', 900);
          U.text(g, 'Sağ joystick ile ileri git, sol ile dön', W / 2, H * 0.47 + 12, 12, '#cfe8ff', 'center', 700);
          g.globalAlpha = 1;
        }
        if (warnT > 0) {
          g.fillStyle = 'rgba(200,30,40,.75)'; U.rr(g, 30, 156, W - 60, 28, 14); g.fill();
          U.text(g, warn, W / 2, 170, 12.5, '#fff', 'center', 900);
        } else if (charging) {
          g.fillStyle = 'rgba(40,160,80,.75)'; U.rr(g, 60, 156, W - 120, 28, 14); g.fill();
          U.text(g, '⚡ Şarj oluyor ' + Math.round(d.bat * 100) + '%', W / 2, 170, 12.5, '#fff', 'center', 900);
        }
        msgs.forEach((m, i) => {
          g.globalAlpha = Math.max(0, 1 - Math.max(0, m.t - 1.4) / 0.6);
          U.text(g, m.txt, W / 2, H * 0.3 + i * 22 - m.t * 8, 15, m.col, 'center', 900);
        });
        g.globalAlpha = 1;
        if (flash > 0) { g.fillStyle = 'rgba(255,60,60,' + flash + ')'; g.fillRect(0, 0, W, H); }
      }

      /* ---------- ana döngü ---------- */
      s.loop(dt => {
        t += dt;
        readInput();
        if (hintT < 6 && (inp.thr || inp.fwd)) hintT += dt * 3; else hintT += dt * 0.3;
        if (!over) {
          const n = 2;
          for (let i = 0; i < n; i++) physics(dt / n);
          objectives(dt);
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
          p.vy -= (p.smoke ? -1 : 12) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.y < 0.1) { p.y = 0.1; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
        }
        for (let i = msgs.length - 1; i >= 0; i--) { msgs[i].t += dt; if (msgs[i].t > 2) msgs.splice(i, 1); }
        if (warnT > 0) warnT -= dt;
        if (flash > 0) flash = Math.max(0, flash - dt);
        if (d.hp < 40 && !over && Math.random() < 0.3) parts.push({ x: d.x, y: d.y + 0.2, z: d.z, vx: U.rand(-0.5, 0.5), vy: 2, vz: U.rand(-0.5, 0.5), life: 0.9, c: '#495057', smoke: true });
        updateCam(dt);
      }, () => {
        setCam();
        findShadowB();
        drawSkyGround();
        drawGroundLayer();
        // nesneleri uzaklığa göre sırala (ressam algoritması)
        const objs = [];
        for (const b of WD.buildings) {
          const cx = U.clamp(cam.x, b.x0, b.x1), cz = U.clamp(cam.z, b.z0, b.z1), cy = U.clamp(cam.y, b.y0 || 0, b.h);
          const dist = Math.hypot(cx - cam.x, cy - cam.y, cz - cam.z);
          if (dist > DRAW) continue;
          const rad = Math.hypot(b.x1 - b.x0, b.z1 - b.z0, b.h - (b.y0 || 0)) / 2;
          if (!visible((b.x0 + b.x1) / 2, ((b.y0 || 0) + b.h) / 2, (b.z0 + b.z1) / 2, rad)) continue;
          objs.push([dist, 0, b]);
        }
        for (const tr of WD.trees) {
          const dist = Math.hypot(tr.x - cam.x, tr.h / 2 - cam.y, tr.z - cam.z);
          if (dist > 380 || !visible(tr.x, tr.h / 2, tr.z, tr.h)) continue;
          objs.push([dist, 1, tr]);
        }
        for (const tb of WD.turbines) {
          const dist = Math.hypot(tb.x - cam.x, 40 - cam.y, tb.z - cam.z);
          if (dist < DRAW) objs.push([dist - 1, 2, tb]);
        }
        if (MODE === 'race') rings.forEach((r, i) => { if (i < ringIdx) return; const dist = Math.hypot(r.x - cam.x, r.y - cam.y, r.z - cam.z); if (dist < DRAW) objs.push([dist, 3, r, i === ringIdx]); });
        if (MODE === 'free') for (const c of crystals) { const dist = Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z); if (dist < DRAW) objs.push([dist, 4, c]); }
        if (MODE === 'cargo') { const tg = cargo.has ? cargo.to : cargo.from; const dist = Math.hypot(tg.x - cam.x, tg.y - cam.y, tg.z - cam.z); objs.push([dist, 5, tg]); }
        const dd = distCam();
        objs.push([dd, 9, null]);
        objs.sort((a, b) => b[0] - a[0]);
        // Küçük nesneler: önünde bina yoksa binalardan sonra çiz (çatıdaki dron/kristal kaybolmasın)
        const blds = objs.filter(o => o[1] === 0).map(o => o[2]);
        const late = [];
        const main = [];
        for (const o of objs) {
          if (o[1] >= 3) {
            const p = o[1] === 9 ? d : o[2];
            if (!occluded(p.x, (p.y || 0) + (o[1] === 5 ? 1 : 0), p.z, blds)) { late.push(o); continue; }
          }
          main.push(o);
        }
        for (const o of main.concat(late)) {
          if (o[1] === 0) drawBuilding(o[2], o[0]);
          else if (o[1] === 1) drawTree(o[2], o[0]);
          else if (o[1] === 2) drawTurbine(o[2], o[0]);
          else if (o[1] === 3) drawRing(o[2], o[0], o[3]);
          else if (o[1] === 4) drawGem(o[2].x, o[2].y, o[2].z, o[0], '#9775fa');
          else if (o[1] === 5) drawBeam(o[2].x, o[2].y, o[2].z, cargo.has ? 'rgba(255,107,107,A)' : 'rgba(105,219,124,A)', o[0]);
          else if (!over) drawDrone();
        }
        for (const p of parts) {
          const q = proj(p.x, p.y, p.z);
          if (!q) continue;
          const sz = Math.max(1.5, 0.25 / q.z * F);
          g.globalAlpha = Math.min(1, p.life * 1.5);
          g.fillStyle = p.c;
          if (p.smoke) { g.globalAlpha *= 0.45; g.beginPath(); g.arc(q.x, q.y, sz * 1.6 * (2 - p.life), 0, Math.PI * 2); g.fill(); }
          else g.fillRect(q.x - sz / 2, q.y - sz / 2, sz, sz);
        }
        g.globalAlpha = 1;
        drawHUD();
      });

      s.score(0);
      Platform._drone = { get: () => ({ d, cam, inp, score, over, crystals: crystals.length, ringIdx, rings: rings.length, cargo, deliveries, timeLeft, camMode }), set: o => Object.assign(d, o), input: o => Object.assign(keys, o), world: WD, ring: () => rings[ringIdx] || null };
      return {
        resume() { sticks.L = sticks.R = null; for (const k in keys) keys[k] = false; }
      };
    }
  });
})();
