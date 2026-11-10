/* Sapan Uçuşu - sapanla fırlat, süzül, para kazan, uçağını geliştir */
(function () {
  const U = Platform.util;
  const G = 9.8, TRIM = 0.12;

  const MODELS = [
    { id: 'paper', name: 'Kağıt Uçak', price: 0, lift: 1, drag: 1, thrust: 1, engine: 0, eFuel: 0, desc: 'Her şey bununla başlar. Hafif ve oyuncu.' },
    { id: 'glider', name: 'Planör', price: 2500, lift: 1.3, drag: 0.82, thrust: 1, engine: 0, eFuel: 0, desc: 'Uzun kanatlar: çok daha iyi süzülür.' },
    { id: 'prop', name: 'Pervaneli', price: 9000, lift: 1.25, drag: 0.78, thrust: 1.15, engine: 4.5, eFuel: 14, desc: 'Kendi motoru var: 14 sn boyunca kendiliğinden iter.' },
    { id: 'jet', name: 'Jet', price: 30000, lift: 1.2, drag: 0.6, thrust: 1.7, engine: 7, eFuel: 8, desc: 'Çok hızlı, roketi çok güçlü, motoru var.' }
  ];
  const UPGS = [
    { k: 'sling', ic: '🎯', name: 'Sapan Gücü', max: 8, base: 60, fx: l => 'Fırlatma hızı ' + launchSpeed(l) + ' m/sn' },
    { k: 'aero', ic: '🌬️', name: 'Aerodinamik', max: 8, base: 90, fx: l => 'Hava direnci −' + Math.round(l * 7.5) + '%' },
    { k: 'wing', ic: '✈️', name: 'Kanatlar', max: 8, base: 120, fx: l => 'Taşıma gücü +' + Math.round(l * 7) + '%' },
    { k: 'rocket', ic: '🚀', name: 'Roket', max: 6, base: 400, fx: l => l ? 'İtiş ' + (l * 5) + ' m/sn²' : 'Roket yok — satın al!' },
    { k: 'fuel', ic: '⛽', name: 'Yakıt Deposu', max: 6, base: 300, req: 'rocket', fx: l => 'Roket süresi ' + (1.5 + l).toFixed(1) + ' sn' },
    { k: 'magnet', ic: '🧲', name: 'Mıknatıs', max: 5, base: 200, fx: l => l ? 'Altın çekim alanı ' + (l * 4) + ' m' : 'Altınları uzaktan çeker' },
    { k: 'bank', ic: '💰', name: 'Kazanç', max: 6, base: 500, fx: l => 'Para çarpanı x' + (1 + l * 0.15).toFixed(2) }
  ];
  const GOALS = [
    ['d100', 'dist', 100, 50], ['d250', 'dist', 250, 120], ['d500', 'dist', 500, 250], ['d1000', 'dist', 1000, 600],
    ['d2000', 'dist', 2000, 1200], ['d3500', 'dist', 3500, 2500], ['d5000', 'dist', 5000, 4000], ['d7500', 'dist', 7500, 6000], ['d10000', 'dist', 10000, 10000],
    ['a50', 'alt', 50, 80], ['a150', 'alt', 150, 250], ['a300', 'alt', 300, 600], ['a600', 'alt', 600, 1500],
    ['c20', 'coins', 20, 100], ['c60', 'coins', 60, 400], ['c150', 'coins', 150, 1200],
    ['t30', 'time', 30, 100], ['t60', 'time', 60, 300], ['t120', 'time', 120, 900],
    ['r3', 'rings', 3, 200], ['s3', 'skips', 3, 400]
  ];
  const GOAL_TXT = { dist: v => v + ' m uç', alt: v => v + ' m yüksekliğe çık', coins: v => 'Tek uçuşta ' + v + ' altın topla', time: v => v + ' sn havada kal', rings: v => 'Tek uçuşta ' + v + ' hız halkasından geç', skips: v => 'Suda ' + v + ' kez sek' };
  const BIOMES = [
    { name: 'Çayır', ground: '#4caf50', top: '#7bd66b', dirt: '#6b4a2b', sky: ['#7fd3ff', '#d9f3ff'], far: '#7fb8d9' },
    { name: 'Çöl', ground: '#e0b062', top: '#f5d38b', dirt: '#b07a3a', sky: ['#ffc98b', '#fff1d6'], far: '#d8a46c' },
    { name: 'Karlı Dağlar', ground: '#dfe9f3', top: '#ffffff', dirt: '#8a9bb0', sky: ['#9fc5e8', '#eef6ff'], far: '#9fb4cc' },
    { name: 'Okyanus', ground: '#e9cf8f', top: '#f7e2a8', dirt: '#b08a4a', sky: ['#5ec8f0', '#c8f1ff'], far: '#6fb0d0' }
  ];
  const BIOME_LEN = 1500;

  function launchSpeed(l) { return 22 + l * 5; }
  function upCost(u, l) { return Math.round(u.base * Math.pow(1.75, l) / 10) * 10; }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  const fmtM = m => m >= 10000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m';
  const fmtMoney = n => Math.floor(n).toLocaleString('tr-TR');
  const COIN = '<i class="pl-coin"></i>';

  /* ---- arazi ---- */
  function biomeAt(x) { return Math.max(0, Math.floor(x / BIOME_LEN)) % BIOMES.length; }
  function rawGround(x, b) {
    if (b === 0) return 5 + 4 * Math.sin(x / 70) + 3 * Math.sin(x / 23 + 2) + 2.5 * Math.sin(x / 151);
    if (b === 1) return 4 + 3.5 * Math.sin(x / 42) + 1.5 * Math.sin(x / 13 + 1);
    if (b === 2) return 12 + 9 * Math.sin(x / 110) + 5 * Math.sin(x / 37 + 1) + 3 * Math.abs(Math.sin(x / 19));
    // okyanus: adalar arasında su
    const m = ((x % 420) + 420) % 420;
    if (m > 170 && m < 290) return -2 + Math.sin((m - 170) / 120 * Math.PI) * 9;
    return -2;
  }
  function ground(x) {
    if (x < 30) return x < -40 ? 5 : 6;
    if (x < 60) return U.lerp(6, rawGround(60, 0), (x - 30) / 30);
    const b = biomeAt(x), off = x - Math.floor(x / BIOME_LEN) * BIOME_LEN;
    let h = rawGround(x, b);
    if (off < 80 && x > BIOME_LEN) {
      const pb = (b + BIOMES.length - 1) % BIOMES.length;
      h = U.lerp(rawGround(x, pb), h, off / 80);
    }
    return h;
  }
  const isWater = x => x > 60 && biomeAt(x) === 3 && ground(x) <= -1.5;

  Platform.register({
    id: 'plane', name: 'Sapan Uçuşu', gen: 'modern', genre: 'Simülasyon', isNew: true,
    colors: ['#38bdf8', '#2563eb'],
    scoreLabel: 'MESAFE', bestLabel: 'REKOR',
    desc: 'Uçağını sapanla fırlat, süzül, altın topla. Kazandığın parayla uçağını geliştir!',
    help: '<ul><li><b>Fırlatma:</b> ekrana dokun, parmağını <b>geriye doğru çek</b> ve bırak. Ne kadar çekersen o kadar güçlü fırlar; çizgi uçuş yönünü gösterir.</li><li><b>Uçuş:</b> ekranın <b>üst yarısına</b> basılı tut: burun yukarı. <b>Alt yarısına</b> basılı tut: burun aşağı. (Klavye: ↑ ↓)</li><li>Dalış yapınca hızlanırsın, yukarı çekince hızı yüksekliğe çevirirsin. Burnu çok kaldırırsan <b>stall</b> olur, düşersin!</li><li><b>🚀 Roket</b> aldıysan sağ alttaki düğmeye bas (Boşluk). Yakıt sınırlıdır.</li><li><i class="pl-coin"></i>Altınlar, 💫 hız halkaları, ⛽ yakıt ve 🌀 sıcak hava akımları seni ileri taşır. Kuşlar ve balonlar yavaşlatır.</li><li>Okyanusta suya <b>alçak ve hızlı</b> değersen taş gibi seker, dik düşersen batarsın.</li><li>Gittiğin <b>her metre para</b> kazandırır. Garajda yükseltme ve yeni uçak al, görevleri tamamla.</li></ul>',
    icon: '<path d="M6 40 L56 18 L30 46 Z" fill="#fff"/><path d="M30 46 L56 18 L34 54 Z" fill="#cbd5e1"/><path d="M30 46 L24 58 L34 54 Z" fill="#94a3b8"/><path d="M10 52 Q4 30 14 22" stroke="#7c3a10" stroke-width="4" fill="none" stroke-linecap="round"/>',
    create(s) {
      const W = 360;
      const view = s.canvasFill(W, 560, 760);
      const g = view.g, H = view.H;
      const YG = H - 140;
      const fx = new U.Particles();

      /* ---- kalıcı ilerleme ---- */
      const DEF = { money: 0, up: {}, owned: ['paper'], plane: 'paper', goals: {}, best: 0, flights: 0, total: 0 };
      const save = Object.assign({}, DEF, s.store.get('save', {}));
      UPGS.forEach(u => { if (save.up[u.k] == null) save.up[u.k] = 0; });
      const persist = () => s.store.set('save', save);

      /* ---- durum ---- */
      let state = 'garage', tab = 'up';
      let P = null, st = null, aim = null, input = 0, boostOn = false, t = 0, endT = 0, groundT = 0;
      let cam = { x: -30, sc: 7, lift: 0 };
      let items = [], genUpTo = 0, seed = 1, wind = 0, flight = null;
      const trail = [], clouds = [];
      const pointers = new Map();
      for (let i = 0; i < 60; i++) clouds.push({ x: i * 120 + Math.random() * 100, y: (i % 3 ? 22 + Math.random() * 60 : 60 + Math.random() * 360), s: 0.6 + Math.random() * 1.2 });

      function model() { return MODELS.find(m => m.id === save.plane) || MODELS[0]; }
      function stats() {
        const m = model(), u = save.up;
        return {
          launch: launchSpeed(u.sling),
          lift: 0.1 * m.lift * (1 + 0.07 * u.wing),
          drag: 0.0028 * m.drag * (1 - 0.075 * u.aero),
          stall: 0.3 + 0.012 * u.wing,
          thrust: u.rocket * 5 * m.thrust,
          fuel: u.rocket ? 1.5 + u.fuel : 0,
          engine: m.engine, eFuel: m.eFuel,
          magnet: u.magnet * 4,
          mult: 1 + u.bank * 0.15
        };
      }

      /* ---- içerik üretimi (100 m'lik parçalar) ---- */
      function genChunk(k) {
        const R = rng(seed * 1000 + k * 977);
        const x0 = k * 100;
        const maxAlt = Math.min(420, 30 + k * 7);
        const groups = k === 0 ? 1 : 2;
        for (let gi = 0; gi < groups; gi++) {
          if (k > 0 && R() > 0.72) continue;
          // alçak irtifalar daha olası: altınlar çoğu uçuşta ulaşılabilir yerde olsun
          const n = 5 + Math.floor(R() * 6), y0 = 5 + Math.pow(R(), 1.3) * maxAlt, amp = R() * 8, gold = R() < 0.18;
          const sx = k === 0 ? 30 + R() * 30 : x0 + gi * 50 + R() * 40;
          for (let i = 0; i < n; i++) {
            const x = sx + i * 4.5;
            const y = Math.max(ground(x) + 3, y0 + Math.sin(i / (n - 1) * Math.PI) * amp);
            items.push({ type: 'coin', x, y, v: gold ? 5 : 1 });
          }
        }
        if (k === 0) return;
        if (k > 2 && R() < 0.2) items.push({ type: 'ring', x: x0 + 20 + R() * 60, y: Math.max(ground(x0 + 50) + 8, 10 + R() * maxAlt), r: 5.5 });
        if (k > 1 && R() < 0.14) { const x = x0 + R() * 70; items.push({ type: 'thermal', x, w: 26, top: ground(x) + 60 + R() * 140 }); }
        if (k > 4 && R() < 0.16) {
          const y = 12 + R() * maxAlt, x = x0 + R() * 80, n = 3 + Math.floor(R() * 3);
          for (let i = 0; i < n; i++) items.push({ type: 'bird', x: x + i * 4, y: y + (i % 2) * 3, ph: R() * 6 });
        }
        if (k > 6 && R() < 0.09) items.push({ type: 'balloon', x: x0 + R() * 90, y: Math.max(ground(x0) + 25, 25 + R() * maxAlt), c: U.pick(['#ff6b6b', '#ffd43b', '#4dabf7', '#da77f2']) });
        if (save.up.rocket && k > 3 && R() < 0.11) items.push({ type: 'fuel', x: x0 + R() * 90, y: 8 + R() * maxAlt * 0.7 });
        if (k > 3 && R() < 0.05) items.push({ type: 'star', x: x0 + R() * 90, y: 15 + R() * maxAlt });
      }
      function ensureGen(x) { while (genUpTo * 100 < x + 600) { genChunk(genUpTo); genUpTo++; } }

      /* ---- uçuş ---- */
      function reset() {
        st = stats();
        seed = (Math.random() * 1e6) | 0;
        wind = U.rand(-3, 3);
        items = []; genUpTo = 0; trail.length = 0;
        P = { x: 0, y: 9, vx: 0, vy: 0, th: 0.35, fuel: st.fuel, eFuel: st.eFuel, onGround: false, stall: false, splash: false, dead: false };
        flight = { coins: 0, maxAlt: 0, time: 0, rings: 0, skips: 0, bounces: 0 };
        ensureGen(0);
        cam = { x: P.x - W * 0.42 / 7, sc: 7, lift: 0 };
        aim = null; input = 0; boostOn = false; endT = 0; groundT = 0;
        s.score(0);
      }
      function launch(ang, power) {
        const v = st.launch * power;
        P.vx = Math.cos(ang) * v; P.vy = Math.sin(ang) * v; P.th = ang;
        state = 'fly';
        s.sfx('jump'); s.vibe(30);
        fx.burst(sx(P.x), sy(P.y), ['#c08a4a', '#fff'], 10, 120, 0.4, 3);
      }
      function physics(dt) {
        const ax = P.vx - wind, ay = P.vy;
        const sp = Math.hypot(ax, ay) || 0.001;
        const gam = Math.atan2(ay, ax);
        // hız arttıkça denge açısı küçülür: hızlı uçak kendiliğinden takla atmaz, oyuncu en fazla ~3g çeker
        const lq = st.lift * sp * sp + 1e-3;
        const trim = Math.min(TRIM, G * 0.95 / lq);
        const want = trim + (input > 0 ? input * Math.min(0.26, 3.2 * G / lq) : input * Math.min(0.5, 3.2 * G / lq));
        if (!P.onGround) P.th += angDiff(gam + want, P.th) * Math.min(1, dt * 5);
        const a = angDiff(P.th, gam);
        const aa = Math.abs(a);
        let cl = aa < st.stall ? a : Math.sign(a) * Math.max(0.04, st.stall - (aa - st.stall) * 1.4);
        P.stall = aa > st.stall && sp > 4 && !P.onGround;
        const q = sp * sp;
        const L = st.lift * q * cl, D = st.drag * q * (1 + 8 * a * a);
        let fx_ = -Math.sin(gam) * L - Math.cos(gam) * D;
        let fy_ = Math.cos(gam) * L - Math.sin(gam) * D - G;
        if (boostOn && P.fuel > 0 && st.thrust > 0) {
          fx_ += Math.cos(P.th) * st.thrust; fy_ += Math.sin(P.th) * st.thrust;
          P.fuel = Math.max(0, P.fuel - dt);
          if (Math.random() < 0.6) fx.burst(sx(P.x - Math.cos(P.th) * 1.5), sy(P.y - Math.sin(P.th) * 1.5), ['#ffd43b', '#ff922b', '#ff6b6b'], 1, 60, 0.35, 4);
        }
        if (P.eFuel > 0 && st.engine > 0 && !P.onGround) {
          fx_ += Math.cos(P.th) * st.engine; fy_ += Math.sin(P.th) * st.engine;
          P.eFuel = Math.max(0, P.eFuel - dt);
        }
        // sıcak hava akımları
        for (const it of items) if (it.type === 'thermal' && P.x > it.x && P.x < it.x + it.w && P.y < it.top) fy_ += 15;
        P.vx += fx_ * dt; P.vy += fy_ * dt;
        P.x += P.vx * dt; P.y += P.vy * dt;
        // zemin
        const gh = ground(P.x);
        if (isWater(P.x) && P.y < 0.4) {
          if (P.vy < 0 && P.vx > 13 && -P.vy < P.vx * 0.42) {
            P.y = 0.4; P.vy = Math.abs(P.vy) * 0.55 + 2.5; P.vx *= 0.82;
            flight.skips++;
            splash(P.x, 14);
            s.sfx('bounce'); s.vibe(25);
            floatTxt('Sekme! x' + flight.skips, '#8fe3ff');
          } else if (!P.splash) {
            P.splash = true;
            splash(P.x, 40);
            s.sfx('explode'); s.vibe(80);
            P.vx *= 0.15; P.vy = 0;
          }
        }
        if (P.splash) { P.y = Math.min(P.y, -0.5); P.vx *= Math.pow(0.05, dt); P.vy = 0; P.onGround = true; return; }
        if (P.y < gh + 0.5) {
          P.y = gh + 0.5;
          const sl = (ground(P.x + 1) - ground(P.x - 1)) / 2;
          const nl = Math.hypot(sl, 1), nx = -sl / nl, ny = 1 / nl;
          const vn = P.vx * nx + P.vy * ny;
          if (vn < 0) {
            if (vn < -7) {
              P.vx -= 1.4 * vn * nx; P.vy -= 1.4 * vn * ny;
              P.vx *= 0.75;
              flight.bounces++;
              s.sfx('bounce'); s.vibe(30);
              fx.burst(sx(P.x), sy(P.y - 0.5), [BIOMES[biomeAt(P.x)].dirt, BIOMES[biomeAt(P.x)].top], 10, 120, 0.5, 3, 300);
            } else { P.vx -= vn * nx; P.vy -= vn * ny; }
          }
          // sürtünme
          const sp2 = Math.hypot(P.vx, P.vy);
          if (sp2 > 0) { const k = Math.max(0, sp2 - 5.5 * dt) / sp2; P.vx *= k; P.vy *= k; }
          P.th += angDiff(Math.atan(sl), P.th) * Math.min(1, dt * 10);
          P.onGround = true;
        } else P.onGround = false;
      }
      function splash(x, n) { fx.burst(sx(x), sy(0), ['#bfefff', '#ffffff', '#5ec8f0'], n, 160, 0.7, 4, 400); }
      const floats = [];
      function floatTxt(txt, col) { floats.push({ txt, col, t: 0 }); }

      function collect(dt) {
        const mag = st.magnet;
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          if (it.x < P.x - 150) { items.splice(i, 1); continue; }
          if (it.type === 'thermal') continue;
          if (it.type === 'bird') { it.x -= 4 * dt; it.ph += dt * 10; }
          const dx = P.x - it.x, dy = P.y - it.y, d = Math.hypot(dx, dy);
          if (it.type === 'coin' || it.type === 'star' || it.type === 'fuel') {
            if (mag && d < mag + 2 && it.type !== 'fuel') { const k = Math.min(1, dt * 8); it.x += dx * k; it.y += dy * k; }
            if (d < 2.4) {
              items.splice(i, 1);
              if (it.type === 'coin') { flight.coins += it.v; s.sfx('coin'); fx.burst(sx(it.x), sy(it.y), it.v > 1 ? '#ffd43b' : '#e9ecef', 5, 80, 0.4, 3); }
              else if (it.type === 'star') { flight.coins += 25; s.sfx('power'); floatTxt('+25 altın', '#ffd43b'); fx.burst(sx(it.x), sy(it.y), ['#ffd43b', '#fff'], 16, 140, 0.6, 3); }
              else { P.fuel = Math.min(st.fuel + 1.5, P.fuel + 1.5); s.sfx('power'); floatTxt('+Yakıt', '#9effc9'); }
            }
          } else if (it.type === 'ring') {
            if (!it.done && Math.abs(dx) < 1.5 && Math.abs(dy) < it.r) {
              it.done = true; flight.rings++;
              const spd = Math.hypot(P.vx, P.vy) + 12;
              P.vx = Math.cos(P.th) * spd; P.vy = Math.sin(P.th) * spd;
              s.sfx('power'); s.vibe(30);
              floatTxt('HIZ! +12', '#7df9ff');
              fx.burst(sx(it.x), sy(it.y), ['#7df9ff', '#fff'], 20, 160, 0.5, 3);
            }
          } else if (it.type === 'bird') {
            if (d < 2.2 && !it.hit) {
              it.hit = true; it.fall = 0;
              P.vx *= 0.68; P.vy = P.vy * 0.5 - 3;
              s.sfx('hit'); s.vibe(60);
              floatTxt('Kuş çarptı!', '#ffb3b3');
              fx.burst(sx(it.x), sy(it.y), ['#fff', '#ddd', '#555'], 12, 120, 0.8, 3, 120);
            }
          } else if (it.type === 'balloon') {
            if (d < 6.5 && !it.hit) {
              it.hit = true;
              P.vx *= 0.6; P.vy = -Math.abs(P.vy) * 0.4 - 5;
              s.sfx('pop'); s.vibe(80);
              floatTxt('Balon!', '#ffb3b3');
              fx.burst(sx(it.x), sy(it.y + 3), [it.c, '#fff'], 24, 200, 0.7, 4, 200);
            }
          }
          if (it.hit && it.type === 'bird') { it.y -= 12 * dt; }
        }
      }
      function endFlight() {
        state = 'result';
        const dist = Math.max(0, P.x);
        const m = stats().mult;
        const dMoney = Math.floor(dist * 0.6);
        const cMoney = flight.coins * 3;
        const aMoney = Math.floor(flight.maxAlt * 0.5);
        const total = Math.floor((dMoney + cMoney + aMoney) * m);
        save.money += total;
        save.flights++;
        save.total += dist;
        const rec = dist > save.best + 0.5;
        if (rec) save.best = Math.round(dist);
        s.record(Math.round(dist));
        const got = [];
        const val = { dist, alt: flight.maxAlt, coins: flight.coins, time: flight.time, rings: flight.rings, skips: flight.skips };
        GOALS.forEach(([id, k, v, r]) => { if (!save.goals[id] && val[k] >= v) { save.goals[id] = 1; save.money += r; got.push([GOAL_TXT[k](v), r]); } });
        persist();
        s.sfx(rec ? 'win' : 'coin');
        showResult({ dist, dMoney, cMoney, aMoney, m, total, rec, got });
      }

      /* ---- arayüz (garaj / sonuç) ---- */
      const ui = document.createElement('div');
      ui.className = 'pl-ui';
      s.stage.appendChild(ui);
      s.cleanup(() => ui.remove());
      s.on(ui, 'click', e => {
        const b = e.target.closest('[data-act]');
        if (!b || b.disabled) return;
        Platform.sound.unlock();
        const act = b.dataset.act, arg = b.dataset.arg;
        if (act === 'go') { hideUI(); reset(); state = 'aim'; s.sfx('click'); }
        else if (act === 'tab') { tab = arg; s.sfx('click'); showGarage(); }
        else if (act === 'buy') {
          const u = UPGS.find(q => q.k === arg), l = save.up[arg], c = upCost(u, l);
          if (l >= u.max || save.money < c) { s.sfx('error'); return; }
          save.money -= c; save.up[arg]++; persist(); s.sfx('power'); s.vibe(20); showGarage();
        } else if (act === 'plane') {
          const m = MODELS.find(q => q.id === arg);
          if (save.owned.indexOf(arg) < 0) {
            if (save.money < m.price) { s.sfx('error'); return; }
            save.money -= m.price; save.owned.push(arg); s.sfx('win');
          } else s.sfx('click');
          save.plane = arg; persist(); showGarage();
        } else if (act === 'garage') { s.sfx('click'); state = 'garage'; showGarage(); }
      });
      function hideUI() { ui.classList.add('hidden'); ui.innerHTML = ''; }
      function showGarage() {
        state = 'garage';
        reset();
        const nextGoal = GOALS.filter(q => !save.goals[q[0]]).length;
        let h = '<div class="pl-top"><div class="pl-chip"><small>PARA</small><b>' + COIN + fmtMoney(save.money) + '</b></div><div class="pl-chip"><small>REKOR</small><b>' + fmtM(save.best) + '</b></div><div class="pl-chip"><small>UÇUŞ</small><b>' + save.flights + '</b></div></div>';
        h += '<button class="btn primary pl-go" data-act="go">🚀&nbsp; FIRLAT</button>';
        h += '<div class="seg pl-tabs"><button data-act="tab" data-arg="up" class="' + (tab === 'up' ? 'on' : '') + '">Yükselt</button><button data-act="tab" data-arg="planes" class="' + (tab === 'planes' ? 'on' : '') + '">Uçaklar</button><button data-act="tab" data-arg="goals" class="' + (tab === 'goals' ? 'on' : '') + '">Görevler' + (nextGoal ? ' (' + nextGoal + ')' : '') + '</button></div>';
        h += '<div class="pl-list">';
        if (tab === 'up') {
          UPGS.forEach(u => {
            const l = save.up[u.k], max = l >= u.max, c = upCost(u, l);
            const locked = u.req && !save.up[u.req];
            let pips = '';
            for (let i = 0; i < u.max; i++) pips += '<i class="' + (i < l ? 'on' : '') + '"></i>';
            h += '<div class="pl-item"><div class="ic">' + u.ic + '</div><div class="tx"><b>' + u.name + '</b><small>' + (locked ? 'Önce roket almalısın' : u.fx(l)) + '</small><div class="pl-pips">' + pips + '</div></div>' +
              '<button class="btn ' + (!max && !locked && save.money >= c ? 'primary' : '') + '" data-act="buy" data-arg="' + u.k + '"' + (max || locked || save.money < c ? ' disabled' : '') + '>' + (max ? 'MAKS' : COIN + fmtMoney(c)) + '</button></div>';
          });
        } else if (tab === 'planes') {
          MODELS.forEach(m => {
            const own = save.owned.indexOf(m.id) >= 0, sel = save.plane === m.id;
            h += '<div class="pl-item' + (sel ? ' sel' : '') + '"><canvas class="pl-prev" data-model="' + m.id + '" width="120" height="70"></canvas><div class="tx"><b>' + m.name + '</b><small>' + m.desc + '</small></div>' +
              '<button class="btn ' + (sel ? 'on' : (own || save.money >= m.price ? 'primary' : '')) + '" data-act="plane" data-arg="' + m.id + '"' + (!own && save.money < m.price ? ' disabled' : '') + '>' + (sel ? 'Seçili' : own ? 'Seç' : COIN + fmtMoney(m.price)) + '</button></div>';
          });
        } else {
          GOALS.forEach(([id, k, v, r]) => {
            const done = !!save.goals[id];
            h += '<div class="pl-item' + (done ? ' done' : '') + '"><div class="ic">' + (done ? '✅' : '🎯') + '</div><div class="tx"><b>' + GOAL_TXT[k](v) + '</b><small>Ödül: ' + COIN + fmtMoney(r) + '</small></div></div>';
          });
        }
        h += '</div>';
        ui.innerHTML = h;
        ui.classList.remove('hidden');
        ui.querySelectorAll('canvas.pl-prev').forEach(cv => {
          const c2 = cv.getContext('2d');
          drawPlane(c2, cv.dataset.model, 60, 38, -0.12, 86, false, 0);
        });
      }
      function showResult(r) {
        let h = '<div class="pl-res"><div class="ov-emoji">' + (P.splash ? '🌊' : r.rec ? '🏆' : '🛬') + '</div><h2>' + (r.rec ? 'Yeni Rekor!' : 'Uçuş Bitti') + '</h2>' +
          '<div class="big-score">' + fmtM(r.dist) + '</div>' +
          '<div class="pl-rows"><div><span>Mesafe</span><b>' + COIN + fmtMoney(r.dMoney) + '</b></div><div><span>Altınlar (' + flight.coins + ')</span><b>' + COIN + fmtMoney(r.cMoney) + '</b></div><div><span>Yükseklik (' + Math.round(flight.maxAlt) + ' m)</span><b>' + COIN + fmtMoney(r.aMoney) + '</b></div>' +
          (r.m > 1 ? '<div><span>Kazanç çarpanı</span><b>x' + r.m.toFixed(2) + '</b></div>' : '') +
          '<div class="tot"><span>Toplam</span><b>' + COIN + fmtMoney(r.total) + '</b></div></div>';
        r.got.forEach(([txt, rw]) => { h += '<div class="pl-goal">🎯 Görev tamam: ' + txt + ' <b>+' + fmtMoney(rw) + '</b></div>'; });
        h += '<div class="btns"><button class="btn primary" data-act="garage">🛠&nbsp; Garaja Git</button></div></div>';
        ui.innerHTML = h;
        ui.classList.remove('hidden');
      }

      /* ---- giriş ---- */
      function boostRect() { return { x: W - 92, y: H - 104, w: 80, h: 80 }; }
      const inR = (p, r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
      function updateInput() {
        let up = 0, down = 0, bo = false;
        pointers.forEach(p => {
          if (p.boost) { bo = true; return; }
          if (p.y < H * 0.5) up = 1; else down = 1;
        });
        if (keys.up) up = 1;
        if (keys.down) down = 1;
        input = up - down;
        const was = boostOn;
        boostOn = bo || keys.boost;
        if (boostOn && !was && P && P.fuel > 0 && st.thrust > 0) s.sfx('power');
      }
      const keys = { up: false, down: false, boost: false };
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active()) return;
        Platform.sound.unlock();
        const p = view.pt(e);
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
        if (state === 'aim' && !aim) { aim = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y }; return; }
        if (state === 'fly') {
          pointers.set(e.pointerId, { x: p.x, y: p.y, boost: st.thrust > 0 && inR(p, boostRect()) });
          updateInput();
        }
      });
      s.on(view.cv, 'pointermove', e => {
        const p = view.pt(e);
        if (aim && aim.id === e.pointerId) { aim.x = p.x; aim.y = p.y; return; }
        const q = pointers.get(e.pointerId);
        if (q) { q.x = p.x; q.y = p.y; if (!q.boost) updateInput(); }
      });
      function aimVec() {
        const dx = aim.sx - aim.x, dy = aim.sy - aim.y;
        const len = Math.hypot(dx, dy);
        const power = U.clamp(len / 150, 0, 1);
        let ang = Math.atan2(-dy, dx);
        if (len < 6) ang = 0.6;
        ang = U.clamp(ang, -0.2, 1.4);
        return { ang, power };
      }
      const up = e => {
        if (aim && aim.id === e.pointerId) {
          const a = aimVec();
          aim = null;
          if (a.power > 0.08 && state === 'aim') launch(a.ang, a.power);
          return;
        }
        pointers.delete(e.pointerId);
        updateInput();
      };
      s.on(view.cv, 'pointerup', up);
      s.on(view.cv, 'pointercancel', up);
      s.key(e => {
        const k = e.key;
        if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.up = true;
        else if (k === 'ArrowDown' || k === 's' || k === 'S') keys.down = true;
        else if (k === ' ') {
          keys.boost = true;
          if (state === 'aim' && !e.repeat) launch(0.55, 1);
          else if (state === 'garage' && !e.repeat) { hideUI(); reset(); state = 'aim'; }
        }
        updateInput();
      });
      s.keyup(e => {
        const k = e.key;
        if (k === 'ArrowUp' || k === 'w' || k === 'W') keys.up = false;
        else if (k === 'ArrowDown' || k === 's' || k === 'S') keys.down = false;
        else if (k === ' ') keys.boost = false;
        updateInput();
      });

      /* ---- kamera ---- */
      function sx(x) { return (x - cam.x) * cam.sc; }
      function sy(y) { return YG - (y - cam.lift) * cam.sc; }
      function updateCam(dt, snapNow) {
        let tsc, tx;
        if (state === 'fly' || state === 'result') {
          const spd = Math.hypot(P.vx, P.vy);
          tsc = U.clamp((YG - H * 0.28) / (P.y + 14 + spd * 0.25), 0.3, 6);
          tx = P.x - (W * 0.32) / tsc + U.clamp(P.vx, -10, 40) * 0.05;
        } else { tsc = 7; tx = -W * 0.42 / 7; }
        const k = snapNow ? 1 : Math.min(1, dt * 3);
        cam.sc += (tsc - cam.sc) * k;
        cam.x += (tx - cam.x) * Math.min(1, snapNow ? 1 : dt * 8);
        cam.lift = Math.max(0, P.y - (YG - H * 0.3) / cam.sc);
      }

      /* ---- çizim yardımcıları ---- */
      function drawPlane(c, id, x, y, ang, size, flame, prop) {
        c.save();
        c.translate(x, y);
        c.rotate(-ang);
        const k = size / 40;
        c.scale(k, k);
        if (flame) {
          const fl = 10 + Math.random() * 8;
          c.fillStyle = '#ffd43b'; c.beginPath(); c.moveTo(-16, -3); c.lineTo(-16 - fl, 0); c.lineTo(-16, 3); c.fill();
          c.fillStyle = '#ff922b'; c.beginPath(); c.moveTo(-16, -2); c.lineTo(-16 - fl * 0.6, 0); c.lineTo(-16, 2); c.fill();
        }
        if (id === 'paper') {
          c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(20, 0); c.lineTo(-18, -9); c.lineTo(-10, 0); c.closePath(); c.fill();
          c.fillStyle = '#cfd8e3'; c.beginPath(); c.moveTo(20, 0); c.lineTo(-10, 0); c.lineTo(-16, 8); c.closePath(); c.fill();
          c.strokeStyle = '#9aa8b8'; c.lineWidth = 1; c.beginPath(); c.moveTo(20, 0); c.lineTo(-12, 1); c.stroke();
        } else if (id === 'glider') {
          c.fillStyle = '#f8f9fa'; c.beginPath(); c.ellipse(0, 0, 18, 3.6, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#4dabf7'; c.beginPath(); c.ellipse(9, -2, 5, 2.4, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#e03131'; c.beginPath(); c.moveTo(-14, -1); c.lineTo(-20, -10); c.lineTo(-17, -1); c.fill();
          c.fillStyle = '#dee2e6'; c.fillRect(-6, -1, 16, 2.4);
          c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-22, 1.5, 44, 1.6);
        } else if (id === 'prop') {
          c.fillStyle = '#ffd43b'; c.beginPath(); c.ellipse(0, 0, 17, 5, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#e03131'; c.fillRect(-6, -1, 14, 3);
          c.fillStyle = '#74c0fc'; c.beginPath(); c.ellipse(5, -3.5, 4.5, 2.6, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#e03131'; c.beginPath(); c.moveTo(-13, -2); c.lineTo(-19, -10); c.lineTo(-15, -2); c.fill();
          c.fillStyle = '#495057'; c.fillRect(16, -1.5, 3, 3);
          c.fillStyle = 'rgba(80,80,80,' + (prop ? 0.55 : 0.9) + ')';
          if (prop) { c.beginPath(); c.ellipse(19.5, 0, 1.6, 9, 0, 0, Math.PI * 2); c.fill(); }
          else c.fillRect(18.5, -9, 2, 18);
        } else {
          c.fillStyle = '#adb5bd'; c.beginPath(); c.moveTo(22, 0); c.quadraticCurveTo(12, -5, -14, -4); c.lineTo(-16, 3); c.quadraticCurveTo(10, 5, 22, 0); c.fill();
          c.fillStyle = '#343a40'; c.beginPath(); c.ellipse(10, -3, 5, 2.2, 0, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#868e96'; c.beginPath(); c.moveTo(-10, -3); c.lineTo(-18, -13); c.lineTo(-13, -3); c.fill();
          c.fillStyle = '#495057'; c.beginPath(); c.moveTo(4, 1); c.lineTo(-8, 7); c.lineTo(-10, 1); c.fill();
          c.fillStyle = '#e03131'; c.fillRect(-4, -1, 10, 1.6);
        }
        c.restore();
      }
      function drawSky() {
        const b = BIOMES[biomeAt(P ? P.x : 0)];
        const alt = P ? P.y : 0;
        const space = U.clamp((alt - 250) / 700, 0, 1);
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, mix(b.sky[0], '#0b1030', space));
        gr.addColorStop(1, mix(b.sky[1], '#33407a', space));
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        if (space > 0) {
          g.fillStyle = '#fff';
          for (let i = 0; i < 50; i++) {
            const x = (hash(i * 7 + 1) * W - cam.x * 0.02 * cam.sc + W * 10) % W, y = hash(i * 13 + 5) * H * 0.8;
            g.globalAlpha = space * (0.4 + hash(i) * 0.6);
            g.fillRect(x, y, 1.6, 1.6);
          }
          g.globalAlpha = 1;
        }
        // uzak dağlar (paralaks)
        const base = sy(0);
        g.fillStyle = b.far;
        g.globalAlpha = 0.55;
        g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) {
          const wx = x / Math.max(cam.sc, 0.6) * 0.5 + cam.x * 0.15;
          const h = 40 + 26 * Math.sin(wx / 40) + 18 * Math.sin(wx / 17 + 1);
          g.lineTo(x, Math.min(H, base - h * Math.min(1.2, cam.sc / 2.2) - 10 + (1 - Math.min(1, cam.sc / 2.2)) * 30));
        }
        g.lineTo(W, H); g.fill();
        g.globalAlpha = 1;
      }
      function mix(a, b, k) {
        const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
        const r = Math.round(U.lerp(pa >> 16, pb >> 16, k)), gg = Math.round(U.lerp(pa >> 8 & 255, pb >> 8 & 255, k)), bb = Math.round(U.lerp(pa & 255, pb & 255, k));
        return 'rgb(' + r + ',' + gg + ',' + bb + ')';
      }
      function drawClouds() {
        for (const c of clouds) {
          const x = sx(c.x), y = sy(c.y);
          const r = 7 * c.s * cam.sc;
          if (x < -r * 4 || x > W + r * 4 || y < -r * 3 || y > H + r) continue;
          g.fillStyle = 'rgba(255,255,255,.8)';
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.arc(x + r * 1.1, y + r * 0.2, r * 0.8, 0, Math.PI * 2); g.arc(x - r * 1.1, y + r * 0.3, r * 0.7, 0, Math.PI * 2); g.fill();
        }
      }
      function drawGround() {
        const x0 = cam.x - 5, x1 = cam.x + W / cam.sc + 5;
        const step = Math.max(0.5, 3 / cam.sc);
        // su
        const wy = sy(0);
        if (wy < H) {
          const anyWater = biomeAt(x0) === 3 || biomeAt(x1) === 3;
          if (anyWater) {
            const gr = g.createLinearGradient(0, wy, 0, H);
            gr.addColorStop(0, '#2fa4d9'); gr.addColorStop(1, '#0c4a75');
            g.fillStyle = gr;
            for (let bx = Math.floor(x0 / BIOME_LEN) * BIOME_LEN; bx < x1; bx += BIOME_LEN) {
              if (biomeAt(bx + 1) !== 3) continue;
              const l = Math.max(sx(bx), 0), r = Math.min(sx(bx + BIOME_LEN), W);
              if (r > l) g.fillRect(l, wy, r - l, H - wy);
            }
            g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5;
            g.beginPath();
            for (let x = 0; x < W; x += 14) { const wx = cam.x + x / cam.sc; if (biomeAt(wx) !== 3) continue; g.moveTo(x, wy + Math.sin(wx * 0.3 + t * 3) * 1.5); g.lineTo(x + 7, wy + Math.sin(wx * 0.3 + t * 3 + 1) * 1.5); }
            g.stroke();
          }
        }
        // kara parçaları
        let x = x0;
        let cur = null;
        const flush = () => {
          if (!cur || cur.pts.length < 2) { cur = null; return; }
          const b = BIOMES[cur.b];
          g.fillStyle = b.ground;
          g.beginPath(); g.moveTo(cur.pts[0][0], H + 5);
          cur.pts.forEach(p => g.lineTo(p[0], p[1]));
          g.lineTo(cur.pts[cur.pts.length - 1][0], H + 5); g.fill();
          g.strokeStyle = b.top; g.lineWidth = Math.max(2, 1.2 * cam.sc);
          g.beginPath(); cur.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
          cur = null;
        };
        while (x <= x1) {
          const h = ground(x), b = biomeAt(x);
          const land = !(b === 3 && x > 60 && h <= -1.5);
          if (land) {
            if (!cur || cur.b !== b) { const prev = cur && cur.pts[cur.pts.length - 1]; flush(); cur = { b, pts: prev ? [prev] : [] }; }
            cur.pts.push([sx(x), sy(h)]);
          } else flush();
          x += step;
        }
        flush();
        // süsler
        const cell = 22;
        for (let c = Math.floor(x0 / cell); c <= x1 / cell; c++) {
          if (c < 3) continue;
          const r = hash(c * 31 + 7);
          if (r > 0.55) continue;
          const wx = c * cell + hash(c * 17) * cell * 0.6;
          if (isWater(wx)) continue;
          const b = biomeAt(wx), gx = sx(wx), gy = sy(ground(wx)), k = cam.sc;
          if (k < 0.7) continue;
          if (b === 0) { g.fillStyle = '#6b4a2b'; g.fillRect(gx - 0.4 * k, gy - 4 * k, 0.8 * k, 4 * k); g.fillStyle = r < 0.25 ? '#2f9e44' : '#37b24d'; g.beginPath(); g.arc(gx, gy - 5 * k, 2.4 * k, 0, Math.PI * 2); g.fill(); }
          else if (b === 1) { g.fillStyle = '#2b8a3e'; g.fillRect(gx - 0.6 * k, gy - 5 * k, 1.2 * k, 5 * k); g.fillRect(gx - 2 * k, gy - 3.6 * k, 1.4 * k, 0.8 * k); g.fillRect(gx - 2 * k, gy - 4.6 * k, 0.8 * k, 1.8 * k); }
          else if (b === 2) { g.fillStyle = '#2b5f4b'; g.beginPath(); g.moveTo(gx, gy - 8 * k); g.lineTo(gx + 2.6 * k, gy); g.lineTo(gx - 2.6 * k, gy); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(gx, gy - 8 * k); g.lineTo(gx + 1 * k, gy - 5 * k); g.lineTo(gx - 1 * k, gy - 5 * k); g.fill(); }
          else { g.fillStyle = '#8d6e3f'; g.fillRect(gx - 0.3 * k, gy - 6 * k, 0.6 * k, 6 * k); g.strokeStyle = '#2f9e44'; g.lineWidth = 0.8 * k; g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(gx, gy - 6 * k); g.quadraticCurveTo(gx + Math.cos(i * 1.6) * 2 * k, gy - 7.5 * k, gx + Math.cos(i * 1.6) * 3.2 * k, gy - 5 * k); } g.stroke(); }
        }
        // mesafe bayrakları
        const every = cam.sc > 2 ? 50 : cam.sc > 0.8 ? 100 : 500;
        for (let m = Math.ceil(x0 / every) * every; m <= x1; m += every) {
          if (m <= 0) continue;
          const gx = sx(m), gy = sy(Math.max(0, ground(m)));
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(gx - 1, gy - 22, 2, 22);
          g.fillStyle = 'rgba(255,255,255,.85)'; U.rr(g, gx + 1, gy - 22, 34, 12, 3); g.fill();
          U.text(g, m + 'm', gx + 18, gy - 15.5, 8.5, '#333', 'center', 800);
        }
        if (save.best > 20) {
          const gx = sx(save.best);
          if (gx > -10 && gx < W + 10) {
            g.strokeStyle = 'rgba(255,212,59,.8)'; g.setLineDash([6, 6]); g.lineWidth = 2;
            const gy = sy(Math.max(0, ground(save.best)));
            g.beginPath(); g.moveTo(gx, 120); g.lineTo(gx, gy); g.stroke(); g.setLineDash([]);
            g.fillStyle = 'rgba(0,0,0,.45)'; U.rr(g, gx - 34, gy - 50, 68, 18, 9); g.fill();
            U.text(g, '🏆 REKOR', gx, gy - 41, 10.5, '#ffd43b', 'center', 900);
          }
        }
      }
      function drawSling() {
        const bx = sx(-2.2), by = sy(6);
        const k = cam.sc;
        if (bx < -60 || bx > W + 60) return;
        // rampa / kayalık
        g.fillStyle = '#8a6a4a';
        g.beginPath(); g.moveTo(sx(-40), sy(6)); g.lineTo(sx(30), sy(6)); g.lineTo(sx(30), H); g.lineTo(sx(-40), H); g.fill();
        g.fillStyle = '#6b8e23'; g.fillRect(sx(-40), sy(6) - 3, (70) * k, 3);
        g.strokeStyle = '#7c3a10'; g.lineWidth = 0.7 * k; g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - 2.2 * k); g.lineTo(bx - 1.1 * k, by - 4 * k); g.moveTo(bx, by - 2.2 * k); g.lineTo(bx + 1.1 * k, by - 4 * k); g.stroke();
        const lx = bx - 1.1 * k, rx = bx + 1.1 * k, ty = by - 4 * k;
        let px = sx(P.x), py = sy(P.y);
        if (state === 'aim') {
          if (aim) {
            const a = aimVec(), pull = a.power * 3.2;
            px = sx(-2.2 - Math.cos(a.ang) * pull); py = sy(9 - 1.2 - Math.sin(a.ang) * pull);
            P.x = -2.2 - Math.cos(a.ang) * pull; P.y = 9 - 1.2 - Math.sin(a.ang) * pull; P.th = a.ang;
            // tahmini yörünge
            let vx = Math.cos(a.ang) * st.launch * a.power, vy = Math.sin(a.ang) * st.launch * a.power, x = P.x, y = P.y;
            g.fillStyle = 'rgba(255,255,255,.85)';
            for (let i = 0; i < 24; i++) {
              for (let j = 0; j < 4; j++) { vy -= G * 0.02; x += vx * 0.02; y += vy * 0.02; }
              g.globalAlpha = 1 - i / 24;
              g.beginPath(); g.arc(sx(x), sy(y), 2.4, 0, Math.PI * 2); g.fill();
            }
            g.globalAlpha = 1;
            U.text(g, Math.round(a.power * 100) + '%  ·  ' + Math.round(a.ang * 57.3) + '°', W / 2, 96, 15, '#fff', 'center', 900);
          } else { P.x = -2.2; P.y = 7.8; P.th = 0.3; px = sx(P.x); py = sy(P.y); }
          g.strokeStyle = '#5c2c0c'; g.lineWidth = 0.35 * k;
          g.beginPath(); g.moveTo(lx, ty); g.lineTo(px - 0.6 * k, py); g.moveTo(rx, ty); g.lineTo(px - 0.6 * k, py); g.stroke();
        } else {
          g.strokeStyle = '#5c2c0c'; g.lineWidth = 0.35 * k;
          g.beginPath(); g.moveTo(lx, ty); g.quadraticCurveTo(bx, ty + 0.8 * k, rx, ty); g.stroke();
        }
      }
      function drawItems() {
        for (const it of items) {
          const x = sx(it.x);
          if (x < -80 || x > W + 80) continue;
          const y = sy(it.y || 0), k = Math.max(cam.sc, 1.2);
          if (it.type === 'coin') {
            const w = Math.abs(Math.cos(t * 4 + it.x)) * 1.2 * k + 0.4;
            g.fillStyle = it.v > 1 ? '#fab005' : '#adb5bd';
            g.beginPath(); g.ellipse(x, y, w, 1.3 * k, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = it.v > 1 ? '#ffe066' : '#f1f3f5';
            g.beginPath(); g.ellipse(x, y, w * 0.6, 0.85 * k, 0, 0, Math.PI * 2); g.fill();
          } else if (it.type === 'star') {
            g.save(); g.translate(x, y); g.rotate(t * 2);
            g.fillStyle = '#ffd43b'; g.beginPath();
            for (let i = 0; i < 10; i++) { const r = (i % 2 ? 1 : 2.2) * k, a = i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
            g.fill(); g.restore();
          } else if (it.type === 'fuel') {
            g.fillStyle = '#e03131'; U.rr(g, x - 1.1 * k, y - 1.5 * k, 2.2 * k, 3 * k, 0.4 * k); g.fill();
            U.text(g, '⛽', x, y, 1.8 * k, '#fff', 'center', 400);
          } else if (it.type === 'ring') {
            g.lineWidth = Math.max(2, 0.7 * cam.sc);
            g.strokeStyle = it.done ? 'rgba(255,255,255,.25)' : 'rgba(125,249,255,' + (0.7 + Math.sin(t * 6) * 0.3) + ')';
            g.beginPath(); g.ellipse(x, y, Math.max(3, 1.3 * cam.sc), it.r * cam.sc, 0, 0, Math.PI * 2); g.stroke();
          } else if (it.type === 'thermal') {
            const x2 = sx(it.x + it.w), top = sy(it.top), bot = sy(ground(it.x + it.w / 2));
            const gr = g.createLinearGradient(0, top, 0, bot);
            gr.addColorStop(0, 'rgba(255,200,120,0)'); gr.addColorStop(1, 'rgba(255,200,120,.22)');
            g.fillStyle = gr; g.fillRect(x, top, x2 - x, bot - top);
            g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
              const ax = x + (x2 - x) * (0.2 + i * 0.3);
              const span = bot - top;
              const ay = bot - ((t * 60 + i * 37) % Math.max(10, span));
              g.beginPath(); g.moveTo(ax - 4, ay + 5); g.lineTo(ax, ay); g.lineTo(ax + 4, ay + 5); g.stroke();
            }
          } else if (it.type === 'bird') {
            const f = Math.sin(it.ph) * 1.4 * k;
            g.strokeStyle = it.hit ? '#888' : '#212529'; g.lineWidth = Math.max(1.5, 0.35 * k);
            g.beginPath(); g.moveTo(x - 1.6 * k, y - f); g.quadraticCurveTo(x - 0.6 * k, y - 0.2 * k, x, y); g.quadraticCurveTo(x + 0.6 * k, y - 0.2 * k, x + 1.6 * k, y - f); g.stroke();
          } else if (it.type === 'balloon') {
            const kk = cam.sc;
            g.fillStyle = it.hit ? 'rgba(0,0,0,0)' : it.c;
            if (!it.hit) {
              g.beginPath(); g.ellipse(x, y - 3.5 * kk, 4.2 * kk, 5 * kk, 0, 0, Math.PI * 2); g.fill();
              g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 0.8 * kk, y - 8.4 * kk, 1.6 * kk, 9.8 * kk);
              g.strokeStyle = '#6b4a2b'; g.lineWidth = Math.max(1, 0.15 * kk);
              g.beginPath(); g.moveTo(x - 2.4 * kk, y); g.lineTo(x - 1 * kk, y + 3 * kk); g.moveTo(x + 2.4 * kk, y); g.lineTo(x + 1 * kk, y + 3 * kk); g.stroke();
              g.fillStyle = '#8d5a2b'; g.fillRect(x - 1.2 * kk, y + 3 * kk, 2.4 * kk, 1.8 * kk);
            }
          }
        }
      }
      function drawHUD() {
        if (state !== 'fly') return;
        const spd = Math.hypot(P.vx, P.vy);
        g.fillStyle = 'rgba(0,0,0,.28)'; U.rr(g, W / 2 - 80, 8, 160, 44, 14); g.fill();
        U.text(g, fmtM(Math.max(0, P.x)), W / 2, 31, 26, '#fff', 'center', 900);
        const row = (txt, x, col) => U.text(g, txt, x, 66, 12.5, col || '#fff', 'center', 800);
        g.fillStyle = 'rgba(0,0,0,.22)'; U.rr(g, 10, 56, W - 20, 20, 10); g.fill();
        row('⬆ ' + Math.round(Math.max(0, P.y)) + ' m', 55);
        row('➜ ' + Math.round(spd * 3.6) + ' km/sa', 140);
        g.fillStyle = '#fab005'; g.beginPath(); g.arc(205, 66, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffe066'; g.beginPath(); g.arc(205, 66, 3.5, 0, Math.PI * 2); g.fill();
        U.text(g, String(flight.coins), 215, 66, 12.5, '#ffd43b', 'left', 800);
        row((wind >= 0 ? '🍃 →' : '🍃 ←') + ' ' + Math.abs(wind).toFixed(1), 295, '#d0f4de');
        const b = BIOMES[biomeAt(P.x)];
        U.text(g, b.name, W / 2, 88, 10.5, 'rgba(255,255,255,.75)', 'center', 800);
        if (P.stall) U.text(g, '⚠ STALL! Burnu indir', W / 2, 110, 15, Math.sin(t * 14) > 0 ? '#ff6b6b' : '#fff', 'center', 900);
        // kontrol ipuçları
        const a = input > 0 ? 0.55 : 0.18, d = input < 0 ? 0.55 : 0.18;
        g.fillStyle = 'rgba(255,255,255,' + a + ')';
        g.beginPath(); g.moveTo(22, H * 0.5 - 40); g.lineTo(36, H * 0.5 - 62); g.lineTo(50, H * 0.5 - 40); g.fill();
        g.fillStyle = 'rgba(255,255,255,' + d + ')';
        g.beginPath(); g.moveTo(22, H * 0.5 + 40); g.lineTo(36, H * 0.5 + 62); g.lineTo(50, H * 0.5 + 40); g.fill();
        if (st.thrust > 0) {
          const r = boostRect(), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          g.fillStyle = boostOn && P.fuel > 0 ? 'rgba(255,146,43,.75)' : 'rgba(0,0,0,.35)';
          g.beginPath(); g.arc(cx, cy, 36, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#ffd43b'; g.lineWidth = 5;
          g.beginPath(); g.arc(cx, cy, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (P.fuel / Math.max(0.01, st.fuel))); g.stroke();
          U.text(g, '🚀', cx, cy + 1, 26, '#fff', 'center', 400);
        }
        if (st.engine > 0) {
          g.fillStyle = 'rgba(0,0,0,.3)'; U.rr(g, 10, H - 26, 110, 12, 6); g.fill();
          g.fillStyle = '#69db7c'; U.rr(g, 10, H - 26, Math.max(6, 110 * P.eFuel / st.eFuel), 12, 6); g.fill();
          U.text(g, 'MOTOR', 128, H - 20, 9.5, '#fff', 'left', 900);
        }
        for (let i = 0; i < floats.length; i++) {
          const f = floats[i];
          g.globalAlpha = Math.max(0, 1 - f.t / 1.3);
          U.text(g, f.txt, W / 2, H * 0.36 - f.t * 30 - i * 4, 18, f.col, 'center', 900);
        }
        g.globalAlpha = 1;
      }

      /* ---- döngü ---- */
      s.loop(dt => {
        t += dt;
        fx.update(dt);
        for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.3) floats.splice(i, 1); }
        if (state === 'fly') {
          const n = 3;
          for (let i = 0; i < n; i++) physics(dt / n);
          collect(dt);
          ensureGen(P.x);
          flight.time += dt;
          flight.maxAlt = Math.max(flight.maxAlt, P.y - Math.max(0, ground(P.x)));
          if (!P.onGround) { trail.push([P.x, P.y]); if (trail.length > 50) trail.shift(); } else if (trail.length) trail.shift();
          s.score(Math.max(0, Math.round(P.x)));
          const spd = Math.hypot(P.vx, P.vy);
          if (P.onGround && spd < 1.2) groundT += dt; else groundT = 0;
          if (groundT > 0.6 || (P.splash && spd < 1.5) || P.x < -60 || flight.time > 900) { endT += dt; if (endT > 0.2) endFlight(); }
        }
        updateCam(dt);
      }, () => {
        if (!P) return;
        drawSky();
        drawClouds();
        drawItems();
        drawGround();
        drawSling();
        if (trail.length > 1) {
          g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
          g.beginPath(); trail.forEach((p, i) => i ? g.lineTo(sx(p[0]), sy(p[1])) : g.moveTo(sx(p[0]), sy(p[1]))); g.stroke();
        }
        if (!P.splash || state !== 'result') {
          const sz = U.clamp(cam.sc * 6, 26, 42);
          drawPlane(g, save.plane, sx(P.x), sy(P.y), P.th, sz, state === 'fly' && boostOn && P.fuel > 0 && st.thrust > 0, P.eFuel > 0 && state === 'fly');
        }
        fx.draw(g);
        if (state === 'fly' && Math.hypot(P.vx, P.vy) > 35) {
          g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5;
          for (let i = 0; i < 6; i++) { const y = hash(i * 9 + Math.floor(t * 12)) * H, x = hash(i * 5 + Math.floor(t * 12)) * W; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 40, y); g.stroke(); }
        }
        drawHUD();
        if (state === 'aim' && !aim) {
          g.fillStyle = 'rgba(0,0,0,.4)'; U.rr(g, 30, 70, W - 60, 56, 16); g.fill();
          U.text(g, 'Ekrana dokun, geri çek ve bırak!', W / 2, 90, 15, '#fff', 'center', 900);
          U.text(g, 'Uçuşta: üst yarı ⬆ burun yukarı · alt yarı ⬇ aşağı', W / 2, 111, 11, '#e7f5ff', 'center', 700);
          const hx = W * 0.62 - Math.sin(t * 2.4) * 40, hy = H * 0.55 + Math.sin(t * 2.4) * 30;
          g.globalAlpha = 0.7; U.text(g, '👆', hx, hy, 34, '#fff', 'center', 400); g.globalAlpha = 1;
        }
      });

      showGarage();
      updateCam(0, true);
      Platform._plane = { get: () => ({ state, P, flight, save, st, cam, items: items.length }), launch: (a, p) => { hideUI(); reset(); state = 'aim'; launch(a, p); }, setInput: v => { input = v; }, boost: v => { boostOn = v; }, addMoney: m => { save.money += m; persist(); showGarage(); } };
      return {};
    }
  });
})();
