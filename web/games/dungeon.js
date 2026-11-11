/* Zindan Kaşifi - sıra tabanlı roguelike: ana oyun (döngü, savaş, yapay zeka, arayüz, kayıt) */
(function () {
  'use strict';
  const U = Platform.util;
  const DG = window.DG = window.DG || {};

  const SKILLS = {
    girdap: { name: 'Girdap', icon: '🌪️', mp: 6, cd: 4, target: 'none', desc: 'Çevrendeki tüm düşmanlara %120 hasar.' },
    kalkan_duvari: { name: 'Kalkan Duvarı', icon: '🛡️', mp: 5, cd: 8, target: 'none', desc: '4 tur boyunca aldığın hasar %60 azalır.' },
    hucum: { name: 'Hücum', icon: '💨', mp: 5, cd: 5, target: 'tile', range: 4, desc: 'Düz çizgide 4 kareye atıl; ilk düşmana çift hasar ve sersemletme.' },
    coklu_ok: { name: 'Çoklu Ok', icon: '🏹', mp: 6, cd: 4, target: 'none', desc: 'Görüşteki en yakın 3 düşmana ok.' },
    zehirli_ok: { name: 'Zehirli Ok', icon: '☠️', mp: 4, cd: 3, target: 'enemy', range: 6, desc: 'Hedefi zehirler (6 tur).' },
    geri_sicra: { name: 'Geri Sıçra', icon: '🦘', mp: 3, cd: 4, target: 'none', desc: 'En yakın düşmandan 3 kare uzağa sıçra.' },
    ates_topu: { name: 'Ateş Topu', icon: '🔥', mp: 8, cd: 3, target: 'tile', range: 6, desc: 'Hedef ve çevresine (3×3) ateş hasarı, yanık.' },
    buz_halkasi: { name: 'Buz Halkası', icon: '❄️', mp: 7, cd: 6, target: 'none', desc: 'Çevrendeki düşmanları 3 tur dondurur ve hasar verir.' },
    isinlanma: { name: 'Işınlanma', icon: '✨', mp: 6, cd: 7, target: 'tile', range: 8, desc: 'Görüşteki boş bir kareye ışınlan.' }
  };
  const STATUS = {
    zehir: { name: 'Zehir', icon: '☠️', bad: true, msg: 'Zehirlendin!' }, yanik: { name: 'Yanık', icon: '🔥', bad: true, msg: 'Tutuştun!' }, donma: { name: 'Donma', icon: '❄️', bad: true, msg: 'Dondun!' },
    sersem: { name: 'Sersemlik', icon: '💫', bad: true, msg: 'Sersemledin!' }, zayif: { name: 'Zayıflık', icon: '🥀', bad: true, msg: 'Zayıf düştün!' },
    kuvvet: { name: 'Kuvvet', icon: '💪', msg: 'Kendini çok güçlü hissediyorsun!' }, yenilenme: { name: 'Yenilenme', icon: '💚', msg: 'Yaraların kapanmaya başladı.' }, gorunmez: { name: 'Görünmezlik', icon: '👻', msg: 'Görünmez oldun!' },
    ates_direnci: { name: 'Ateş Direnci', icon: '🧯', msg: 'Ateşe karşı dirençlisin.' }, kalkan: { name: 'Kalkan', icon: '🛡️', msg: 'Kalkanını kaldırdın.' }
  };
  const COLOR_TR = { kirmizi: 'Kırmızı', mavi: 'Mavi', yesil: 'Yeşil', mor: 'Mor', sari: 'Sarı', turuncu: 'Turuncu' };
  const SOUL_UPS = [
    { k: 'can', name: 'Dayanıklılık', icon: '❤️', desc: 'Başlangıç canı +5', max: 5, cost: l => 4 + l * 3 },
    { k: 'guc', name: 'Kuvvet', icon: '⚔️', desc: 'Saldırı +1', max: 3, cost: l => 6 + l * 5 },
    { k: 'zirh', name: 'Dayanım', icon: '🛡️', desc: 'Savunma +1', max: 3, cost: l => 6 + l * 5 },
    { k: 'altin', name: 'Miras', icon: '💰', desc: 'Başlangıç altını +60', max: 3, cost: l => 3 + l * 2 },
    { k: 'iksir', name: 'Hazırlık', icon: '🧪', desc: 'Fazladan 1 can iksiri ile başla', max: 2, cost: l => 5 + l * 4 },
    { k: 'bilgelik', name: 'Bilgelik', icon: '📘', desc: 'Kazanılan tecrübe +10%', max: 3, cost: l => 5 + l * 4 }
  ];
  const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const TS = 30, W = 360;
  let uid = 1;

  Platform.register({
    id: 'dungeon', name: 'Zindan Kaşifi', gen: 'retro', genre: 'RPG', isNew: true,
    colors: ['#7c3aed', '#1e1b4b'],
    scoreLabel: 'PUAN', bestLabel: 'REKOR',
    desc: 'Sıra tabanlı zindan macerası: 15 kat, 3 sınıf, yüzlerce eşya, üç boss. Ölüm kalıcıdır!',
    help: '<ul><li><b>Hareket:</b> bir kareye dokun, kahraman oraya yürür. Yanındaki düşmana dokun: <b>saldırı</b>. Uzaktaki düşmana dokun (yay/büyü varsa): <b>ateş</b>.</li><li>Her hamlen bir <b>tur</b>; sen durursan canavarlar da durur. Acele etme.</li><li><b>Alt çubuk:</b> 3 beceri, 🎒 çanta, ⏳ bekle, 🔍 ara (gizli tuzakları bulur), 🧭 keşfet (görünmeyen yerlere kendiliğinden yürür), 🗺 harita.</li><li>Yerdeki eşyalar üstüne basınca toplanır. Sandıklara ve kapılara yürüyerek açarsın.</li><li>İksirlerin rengi her oyunda değişir; içmeden ne olduğunu bilemezsin.</li><li>Seviye atlayınca 3 yetenekten birini seçersin. Her 5. katta <b>boss</b> var; merdiven boss ölmeden açılmaz.</li><li>Tüccardan eşya alıp satabilirsin.</li><li>Ölürsen oyun biter ama <b>Ruh Taşı</b> kazanırsın; kampta kalıcı bonuslara harcarsın.</li><li>Klavye: ok tuşları / WASD / QEZC yön, boşluk bekle, 1-2-3 beceri, I çanta, X keşfet, M harita, Enter merdiven.</li></ul>',
    icon: '<rect x="8" y="12" width="48" height="44" rx="4" fill="#3b2a5a"/><rect x="14" y="18" width="36" height="32" fill="#1e1b4b"/><path d="M24 50V30h16v20" fill="#0b0920"/><path d="M24 30a8 8 0 0 1 16 0" fill="#0b0920"/><circle cx="32" cy="38" r="3" fill="#ffd43b"/><path d="M12 12l6-6h28l6 6" fill="#5b4580"/><rect x="40" y="20" width="4" height="10" fill="#ff922b"/><circle cx="42" cy="18" r="3.5" fill="#ffd43b"/>',
    options: [
      { key: 'cls', label: 'SINIF', choices: [['savasci', '⚔️ Savaşçı'], ['okcu', '🏹 Okçu'], ['buyucu', '🔮 Büyücü']], def: 'savasci' },
      { key: 'diff', label: 'ZORLUK', choices: [['normal', 'Normal'], ['zor', 'Zor']], def: 'normal' }
    ],
    bestKey: o => o.cls,
    create(s, opts) {
      if (!DG.data || !DG.gen || !DG.art) { s.toast('Zindan modülleri yüklenemedi'); return {}; }
      const D = DG.data, T = DG.T;
      DG.art.init();
      const CLS = opts.cls || 'savasci', HARD = opts.diff === 'zor';
      const stW = Math.max(1, s.stage.clientWidth || 360), stH = (s.stage.clientHeight || 640) - 108;
      const view = s.canvas(W, Math.round(U.clamp(W * stH / stW, 440, 760)));
      const g = view.g, H = view.H;
      const HUD_H = 58, LOG_H = 60;
      const VW = Math.ceil(W / TS), VH = Math.ceil((H - HUD_H - LOG_H) / TS) + 1;
      const COLS = VW, ROWS = VH;

      /* ---------- kalıcı (meta) ilerleme ---------- */
      const meta = Object.assign({ souls: 0, ups: {}, runs: 0, wins: 0, deepest: 0, kills: 0 }, s.store.get('meta', {}));
      SOUL_UPS.forEach(u => { if (meta.ups[u.k] == null) meta.ups[u.k] = 0; });
      const saveMeta = () => s.store.set('meta', meta);

      /* ---------- oyun durumu ---------- */
      let G = null;            // aktif oyun
      let mode = 'camp';       // camp | play | dead
      let t = 0, frame = 0;
      let cam = { x: 0, y: 0 };
      let walkPath = null, walkT = 0, exploring = false;
      let targeting = null;    // { skill }
      let showMap = false;
      const fx = [];           // görsel efektler
      const floats = [];       // uçan yazılar
      let shake = 0, flash = 0;
      let busy = false;        // arayüz açıkken girişleri yok say

      const key = (x, y) => y * G.w + x;
      const inB = (x, y) => x >= 0 && y >= 0 && x < G.w && y < G.h;
      const tileAt = (x, y) => inB(x, y) ? G.tiles[key(x, y)] : T.WALL;
      const monAt = (x, y) => G.mons.find(m => m.x === x && m.y === y && m.hp > 0);
      const dist8 = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      const distE = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const theme = () => D.THEMES[D.floorTheme(G.floor)];
      const rnd = () => G.rng.next();

      /* ---------- kahraman istatistikleri ---------- */
      function stats() {
        const h = G.hero, c = D.CLASSES[h.cls];
        const st = { atk: c.atk + c.atkPerLevel * (h.level - 1) + meta.ups.guc, def: c.def + c.defPerLevel * (h.level - 1) + meta.ups.zirh,
          hpMax: c.hp + c.hpPerLevel * (h.level - 1) + meta.ups.can * 5, mpMax: c.mp + c.mpPerLevel * (h.level - 1),
          crit: c.crit, dodge: c.dodge, spell: 0, lifesteal: 0, regen: 0, thorns: 0, goldFind: 0, xpBonus: meta.ups.bilgelik * 0.1,
          sight: 7, skillCost: 0, fireDmg: 0, iceDmg: 0, poisonDmg: 0, regenMp: c.regenMp || 0.5, ranged: false, range: 1 };
        const add = (k, v) => { if (k === 'hp') st.hpMax += v; else if (k === 'mp') st.mpMax += v; else st[k] = (st[k] || 0) + v; };
        for (const slot in h.eq) {
          const it = h.eq[slot];
          if (!it) continue;
          for (const k in it.stats) add(k, it.stats[k]);
          if (slot === 'weapon') { st.ranged = !!it.ranged; st.range = it.range || 1; }
        }
        for (const pid in h.perks) {
          const p = D.PERKS.find(q => q.id === pid);
          if (p) for (const k in p.mods) add(k, p.mods[k] * h.perks[pid]);
        }
        if (h.status.kuvvet) st.atk *= 1.5;
        if (h.status.zayif) st.atk *= 0.7;
        st.atk = Math.max(1, Math.round(st.atk)); st.def = Math.max(0, Math.round(st.def));
        st.hpMax = Math.max(1, Math.round(st.hpMax)); st.mpMax = Math.max(0, Math.round(st.mpMax));
        st.sight = Math.round(st.sight);
        return st;
      }

      /* ---------- eşya üretimi ---------- */
      function rarityRoll(floor, bonus) {
        const list = D.RARITIES.map((r, i) => ({ r, w: r.weight * Math.pow(1 + floor * 0.12 + (bonus || 0), i) }));
        const tot = list.reduce((a, q) => a + q.w, 0);
        let x = rnd() * tot;
        for (const q of list) { x -= q.w; if (x <= 0) return q.r; }
        return list[0].r;
      }
      function weightedPick(list, wf) {
        const tot = list.reduce((a, q) => a + wf(q), 0);
        let x = rnd() * tot;
        for (const q of list) { x -= wf(q); if (x <= 0) return q; }
        return list[list.length - 1];
      }
      function makeEquip(floor, bonus, forceBase) {
        const bases = Object.values(D.ITEM_BASES).filter(b => b.minFloor <= floor + 1 && (!b.classes || b.classes.indexOf(G.hero.cls) >= 0 || rnd() < 0.3));
        const base = forceBase || weightedPick(bases, b => 1 / (1 + Math.abs(floor - b.minFloor) * 0.6));
        const rar = rarityRoll(floor, bonus);
        const it = { uid: uid++, kind: 'equip', base: base.id, slot: base.slot, sprite: base.sprite, rarity: rar.id, affixes: [], stats: {}, ranged: !!base.ranged, range: base.range || 1, value: base.value };
        ['atk', 'def', 'hp', 'mp', 'crit', 'dodge', 'spell'].forEach(k => { if (base[k]) it.stats[k] = base[k]; });
        const pool = D.AFFIXES.filter(a => a.minFloor <= floor + 1 && a.slots.indexOf(base.slot) >= 0);
        const used = new Set();
        let prefix = null, suffix = null;
        for (let i = 0; i < rar.affixes && pool.length; i++) {
          const cand = pool.filter(a => !used.has(a.stat) && ((a.pos === 'prefix' && !prefix) || (a.pos === 'suffix' && !suffix) || (prefix && suffix)));
          if (!cand.length) break;
          const a = weightedPick(cand, q => q.weight);
          used.add(a.stat);
          const isPct = a.max <= 1 && a.min < 1 && a.stat !== 'atk' && a.stat !== 'def' && a.stat !== 'hp' && a.stat !== 'mp' && a.stat !== 'spell';
          const v = isPct ? +(a.min + rnd() * (a.max - a.min)).toFixed(3) : Math.round(a.min + rnd() * (a.max - a.min));
          it.affixes.push({ id: a.id, name: a.name, pos: a.pos, stat: a.stat, val: v });
          it.stats[a.stat] = +((it.stats[a.stat] || 0) + v).toFixed(3);
          if (a.pos === 'prefix' && !prefix) prefix = a.name; else if (!suffix) suffix = a.name; else if (!prefix) prefix = a.name;
          it.value += Math.round(base.value * 0.6 + floor * 10);
        }
        it.name = (prefix ? prefix + ' ' : '') + base.name + (suffix ? ' (' + suffix + ')' : '');
        return it;
      }
      function makeConsumable(id, qty) {
        const c = D.CONSUMABLES[id];
        return { uid: uid++, kind: c.kind, base: id, qty: qty || 1, value: c.value, stackable: true };
      }
      function randomConsumable(floor, kind) {
        const list = Object.values(D.CONSUMABLES).filter(c => c.minFloor <= floor && (!kind || c.kind === kind));
        return makeConsumable(weightedPick(list, c => c.weight).id, 1);
      }
      function randomLoot(floor, bonus) {
        const lt = D.lootTable(floor);
        const r = rnd() * (lt.potion + lt.scroll + lt.equip + lt.food);
        if (r < lt.potion) return randomConsumable(floor, 'potion');
        if (r < lt.potion + lt.scroll) return randomConsumable(floor, 'scroll');
        if (r < lt.potion + lt.scroll + lt.equip) return makeEquip(floor, bonus);
        return randomConsumable(floor, 'food');
      }
      function itemName(it) {
        if (it.kind === 'equip') return it.name;
        const c = D.CONSUMABLES[it.base];
        if (c.kind === 'potion' && !G.known[it.base]) return COLOR_TR[G.potionMap[it.base].replace('iksir_', '')] + ' İksir';
        return c.name;
      }
      function itemSprite(it) {
        if (it.kind === 'equip') return it.sprite;
        const c = D.CONSUMABLES[it.base];
        return c.kind === 'potion' ? G.potionMap[it.base] : c.sprite;
      }
      function itemColor(it) { return it.kind === 'equip' ? D.RARITIES.find(r => r.id === it.rarity).color : '#e9ecef'; }
      function statLine(stats) {
        const L = { atk: 'Saldırı', def: 'Savunma', hp: 'Can', mp: 'Mana', crit: 'Kritik', dodge: 'Kaçınma', spell: 'Büyü', lifesteal: 'Can çalma', fireDmg: 'Ateş', iceDmg: 'Buz', poisonDmg: 'Zehir', regen: 'Yenilenme', thorns: 'Diken', goldFind: 'Altın bulma', xpBonus: 'Tecrübe', sight: 'Görüş', skillCost: 'Beceri maliyeti' };
        return Object.keys(stats).filter(k => stats[k]).map(k => { const v = stats[k]; const pct = Math.abs(v) < 1 && v !== 0 && ['crit', 'dodge', 'lifesteal', 'goldFind', 'xpBonus', 'skillCost'].indexOf(k) >= 0; return (L[k] || k) + ' ' + (v > 0 ? '+' : '') + (pct ? Math.round(v * 100) + '%' : v); }).join(' · ');
      }

      /* ---------- yeni oyun / kat ---------- */
      function newRun() {
        const c = D.CLASSES[CLS];
        const seed = (Math.random() * 1e9) | 0;
        G = { seed, floor: 0, rng: DG.rng(seed), turn: 0, log: [], known: {}, potionMap: {}, score: 0, kills: 0,
          hero: { cls: CLS, x: 0, y: 0, level: 1, xp: 0, hp: 0, mp: 0, gold: 20 + meta.ups.altin * 60, inv: [], eq: { weapon: null, armor: null, head: null, ring: null, amulet: null }, perks: {}, status: {}, cd: {}, skills: c.skills.slice(0, 3), pendingPerks: 0 } };
        // iksir renklerini karıştır
        const pots = Object.values(D.CONSUMABLES).filter(q => q.kind === 'potion').map(q => q.id);
        const cols = ['iksir_kirmizi', 'iksir_mavi', 'iksir_yesil', 'iksir_mor', 'iksir_sari', 'iksir_turuncu'];
        const sh = G.rng.shuffle(cols.slice());
        pots.forEach((id, i) => { G.potionMap[id] = sh[i % sh.length]; });
        c.startItems.forEach(id => {
          if (D.ITEM_BASES[id]) { const it = makeEquip(1, 0, D.ITEM_BASES[id]); it.rarity = 'siradan'; it.affixes = []; it.name = D.ITEM_BASES[id].name; it.stats = {}; ['atk', 'def', 'hp', 'mp', 'crit', 'dodge', 'spell'].forEach(k => { if (D.ITEM_BASES[id][k]) it.stats[k] = D.ITEM_BASES[id][k]; }); equip(it, true); }
          else if (D.CONSUMABLES[id]) addToInv(makeConsumable(id, 1), true);
        });
        const canId = Object.values(D.CONSUMABLES).find(q => q.effect === 'heal');
        if (canId && meta.ups.iksir) addToInv(makeConsumable(canId.id, meta.ups.iksir), true);
        const st = stats();
        G.hero.hp = st.hpMax; G.hero.mp = st.mpMax;
        meta.runs++; saveMeta();
        nextFloor();
      }
      function nextFloor() {
        G.floor++;
        const f = G.floor;
        const boss = f % 5 === 0, shop = !boss && (f % 3 === 2 || rnd() < 0.3);
        const th = D.THEMES[D.floorTheme(f)];
        const map = DG.gen.generate(f, G.seed + f * 7919, { boss, shop, themeWater: th.water });
        G.w = map.w; G.h = map.h; G.tiles = map.tiles; G.rooms = map.rooms;
        G.seen = new Uint8Array(G.w * G.h); G.vis = new Uint8Array(G.w * G.h);
        G.start = map.start; G.stairs = map.stairs; G.stairsLocked = boss;
        G.decor = map.decor; G.chests = map.chests.map(c => ({ x: c.x, y: c.y, open: false }));
        G.traps = map.traps.map(tr => ({ x: tr.x, y: tr.y, kind: tr.kind, known: false }));
        G.items = []; G.mons = []; G.shop = null; G.bossId = null;
        G.hero.x = map.start.x; G.hero.y = map.start.y;
        // canavarlar
        const pool = D.monsterPool(f);
        const n = Math.round((6 + f * 1.3) * (HARD ? 1.3 : 1));
        const spawns = map.spawns.filter(p => dist8(p, G.hero) > 6);
        let si = 0;
        for (let i = 0; i < n && si < spawns.length; i++) {
          const pick = weightedPick(pool, q => q.weight);
          const def = D.scaleMonster(D.MONSTERS[pick.id], f);
          const p = spawns[si++];
          const cnt = def.flags.indexOf('pack') >= 0 ? 2 + (rnd() < 0.5 ? 1 : 0) : 1;
          for (let k = 0; k < cnt; k++) {
            let q = p;
            if (k) { const free = DIRS8.map(d => ({ x: p.x + d[0], y: p.y + d[1] })).filter(z => DG.passable(tileAt(z.x, z.y)) && !monAt(z.x, z.y)); if (!free.length) break; q = free[Math.floor(rnd() * free.length)]; }
            spawnMon(def, q.x, q.y, rnd() < 0.08 + f * 0.004);
          }
        }
        if (boss && map.boss) {
          const bid = f === 5 ? 'goblin_kral' : f === 10 ? 'lich' : 'ejderha';
          G.bossId = bid;
          spawnMon(D.MONSTERS[bid], map.boss.x, map.boss.y, false);
        }
        if (shop && map.shop) {
          G.shop = { x: map.shop.x, y: map.shop.y, stock: [] };
          for (let i = 0; i < 3; i++) G.shop.stock.push(makeEquip(f + 1, 0.5));
          for (let i = 0; i < 3; i++) G.shop.stock.push(randomConsumable(f, 'potion'));
          G.shop.stock.push(randomConsumable(f, 'scroll'));
          G.shop.stock.push(randomConsumable(f, 'food'));
        }
        // yerdeki eşyalar ve altın
        const lt = D.lootTable(f);
        const spots = map.items.slice();
        const ni = 4 + Math.floor(rnd() * 3);
        for (let i = 0; i < ni && spots.length; i++) { const p = spots.splice(Math.floor(rnd() * spots.length), 1)[0]; G.items.push({ x: p.x, y: p.y, item: randomLoot(f, 0) }); }
        const ng = 3 + Math.floor(rnd() * 3);
        for (let i = 0; i < ng && spots.length; i++) { const p = spots.splice(Math.floor(rnd() * spots.length), 1)[0]; G.items.push({ x: p.x, y: p.y, item: { kind: 'gold', qty: lt.gold[0] + Math.floor(rnd() * (lt.gold[1] - lt.gold[0] + 1)) } }); }
        G.hero.cd = {};
        walkPath = null; exploring = false; targeting = null;
        updateFov();
        snapCam();
        meta.deepest = Math.max(meta.deepest, f); saveMeta();
        log(f === 1 ? 'Zindana adım attın. Dikkatli ol!' : 'Kat ' + f + ': ' + th.name + '.', '#d0bfff');
        if (boss) log('Burada güçlü bir varlık var... Merdiven mühürlü.', '#ff8787');
        addScore(f * 150);
        save();
      }
      function spawnMon(def, x, y, elite) {
        const mult = HARD ? 1.2 : 1;
        const m = { id: def.id, name: def.name, x, y, hpMax: Math.round(def.hp * mult * (elite ? 1.5 : 1)), atk: Math.round(def.atk * mult * (elite ? 1.3 : 1)), def: def.def + (elite ? 1 : 0),
          xp: Math.round(def.xp * (elite ? 2 : 1)), gold: def.gold, speed: def.speed || 1, energy: rnd(), ai: def.ai, range: def.range || 1, element: def.element, onHit: def.onHit,
          flags: def.flags || [], sight: def.sight || 7, boss: !!def.boss, phases: def.phases ? def.phases.map(p => Object.assign({}, p)) : [], special: def.special, summon: def.summon,
          status: {}, awake: false, elite, last: null, specT: 0, sumT: 0 };
        m.hp = m.hpMax;
        G.mons.push(m);
        return m;
      }

      /* ---------- görüş ---------- */
      function updateFov() {
        const st = stats();
        const r = st.sight + (theme().id === 'buz' ? 1 : 0);
        G.vis = DG.fov.compute(G.w, G.h, (x, y) => DG.opaque(tileAt(x, y)), G.hero.x, G.hero.y, r);
        for (let i = 0; i < G.vis.length; i++) if (G.vis[i]) G.seen[i] = 1;
      }
      const visible = (x, y) => inB(x, y) && G.vis[key(x, y)] === 1;
      function los(a, b) {
        const line = DG.path.line(a.x, a.y, b.x, b.y);
        for (let i = 1; i < line.length - 1; i++) if (DG.opaque(tileAt(line[i].x, line[i].y))) return false;
        return true;
      }

      /* ---------- günlük / efektler ---------- */
      function log(txt, col) { G.log.push({ txt, col: col || '#e9ecef', turn: G.turn }); if (G.log.length > 60) G.log.shift(); }
      function floatTxt(x, y, txt, col) { floats.push({ x, y, txt, col: col || '#fff', t: 0 }); }
      function addFx(f) { fx.push(Object.assign({ t: 0 }, f)); }
      function addScore(n) { G.score += n; s.score(G.score); s.record(G.score); }

      /* ---------- savaş ---------- */
      function rollDmg(atk, def) {
        const base = atk * (0.85 + rnd() * 0.3);
        return Math.max(1, Math.round(base - def * 0.6));
      }
      function heroAttack(m, opt) {
        opt = opt || {};
        const st = stats();
        if (m.ai === 'npc') return;
        wake(m);
        if (!opt.sure && rnd() < 0.05) { log('Iskaladın!', '#adb5bd'); floatTxt(m.x, m.y, 'ıska', '#adb5bd'); return; }
        let dmg = rollDmg(st.atk * (opt.mult || 1), m.def);
        let crit = false;
        if (rnd() < st.crit) { dmg = Math.round(dmg * 1.8); crit = true; }
        if (st.fireDmg && m.element !== 'ates') dmg += st.fireDmg;
        if (st.iceDmg && m.element !== 'buz') dmg += st.iceDmg;
        if (st.poisonDmg && m.flags.indexOf('undead') < 0 && rnd() < 0.5) addStatus(m, 'zehir', 4, st.poisonDmg);
        if (m.element === 'buz' && st.fireDmg) dmg = Math.round(dmg * 1.3);
        if (m.element === 'ates' && st.iceDmg) dmg = Math.round(dmg * 1.3);
        if (opt.element === 'ates' && m.element === 'ates') dmg = Math.round(dmg * 0.3);
        if (opt.element === 'buz' && m.element === 'buz') dmg = Math.round(dmg * 0.3);
        if (opt.element === 'ates' && m.element === 'buz') dmg = Math.round(dmg * 1.5);
        if (opt.element === 'buz' && m.element === 'ates') dmg = Math.round(dmg * 1.5);
        if (opt.flat) dmg = opt.flat;
        hurtMon(m, dmg, crit, opt.element);
        if (st.lifesteal > 0) heal(Math.max(1, Math.round(dmg * st.lifesteal)), true);
        s.sfx(crit ? 'capture' : 'hit'); s.vibe(crit ? 25 : 12);
        return dmg;
      }
      function hurtMon(m, dmg, crit, element) {
        m.hp -= dmg;
        m.flashT = 0.18;
        floatTxt(m.x, m.y, (crit ? '💥' : '') + dmg, crit ? '#ffd43b' : element === 'ates' ? '#ff922b' : element === 'buz' ? '#74c0fc' : element === 'zehir' ? '#8ce99a' : '#fff');
        if (m.hp <= 0) killMon(m);
      }
      function killMon(m) {
        m.hp = 0;
        const st = stats();
        const xp = Math.round(m.xp * (1 + st.xpBonus));
        G.kills++; meta.kills++;
        addScore(m.xp * 10);
        log(m.name + ' öldü.' + (xp ? ' +' + xp + ' TP' : ''), m.boss ? '#ffd43b' : '#c3fae8');
        addFx({ kind: 'burst', x: m.x, y: m.y, col: m.boss ? '#ffd43b' : '#ff6b6b', n: m.boss ? 40 : 10 });
        s.sfx(m.boss ? 'boom' : 'explode');
        // ganimet
        const gold = Math.round((m.gold[0] + rnd() * (m.gold[1] - m.gold[0])) * (1 + st.goldFind) * (m.elite ? 2 : 1));
        if (gold > 0) dropAt(m.x, m.y, { kind: 'gold', qty: gold });
        const dropP = m.boss ? 1 : m.elite ? 0.6 : 0.18;
        if (rnd() < dropP) dropAt(m.x, m.y, m.boss ? makeEquip(G.floor + 2, 3) : m.elite ? makeEquip(G.floor, 1) : randomLoot(G.floor, 0));
        if (m.boss) { dropAt(m.x, m.y, randomConsumable(G.floor, 'potion')); dropAt(m.x, m.y, makeEquip(G.floor + 1, 2)); }
        if (m.flags.indexOf('split') >= 0 && m.hpMax >= 6) {
          const free = DIRS8.map(d => ({ x: m.x + d[0], y: m.y + d[1] })).filter(z => DG.passable(tileAt(z.x, z.y)) && !monAt(z.x, z.y) && !(z.x === G.hero.x && z.y === G.hero.y));
          for (let k = 0; k < 2 && free.length; k++) {
            const z = free.splice(Math.floor(rnd() * free.length), 1)[0];
            const c = spawnMon(Object.assign({}, D.MONSTERS[m.id], { hp: Math.ceil(m.hpMax / 2), xp: Math.ceil(m.xp / 2), flags: m.flags.filter(f => f !== 'split') }), z.x, z.y, false);
            c.awake = true; c.name = 'Küçük ' + m.name;
          }
          log(m.name + ' ikiye bölündü!', '#8ce99a');
        }
        if (m.flags.indexOf('explode') >= 0) {
          addFx({ kind: 'ring', x: m.x, y: m.y, col: '#ff922b' });
          if (dist8(m, G.hero) <= 1) hurtHero(m.atk, m.name + ' patlaması');
          G.mons.forEach(o => { if (o !== m && o.hp > 0 && dist8(o, m) <= 1) { o.hp -= m.atk; if (o.hp <= 0) killMon(o); } });
        }
        gainXp(xp);
        if (m.boss) {
          G.stairsLocked = false;
          log('Mühür kırıldı! Merdiven açıldı.', '#ffd43b');
          s.toast(m.name + ' yenildi!', 2000);
          if (m.id === 'ejderha') s.timeout(() => victory(), 900);
        }
      }
      function dropAt(x, y, item) {
        const cand = [{ x, y }].concat(DIRS8.map(d => ({ x: x + d[0], y: y + d[1] })));
        for (const c of cand) {
          if (!DG.passable(tileAt(c.x, c.y)) || tileAt(c.x, c.y) === T.STAIRS || tileAt(c.x, c.y) === T.DOOR || G.chests.some(q => q.x === c.x && q.y === c.y)) continue;
          const ex = G.items.find(q => q.x === c.x && q.y === c.y);
          if (ex && item.kind === 'gold' && ex.item.kind === 'gold') { ex.item.qty += item.qty; return; }
          if (!ex) { G.items.push({ x: c.x, y: c.y, item }); return; }
        }
        G.items.push({ x, y, item });
      }
      function hurtHero(dmg, src, element) {
        const h = G.hero;
        if (h.status.kalkan) dmg = Math.round(dmg * 0.4);
        if (element === 'ates' && h.status.ates_direnci) dmg = Math.round(dmg * 0.25);
        dmg = Math.max(0, dmg);
        h.hp -= dmg;
        if (dmg > 0) { flash = 0.3; shake = Math.min(8, 2 + dmg * 0.4); floatTxt(h.x, h.y, '-' + dmg, '#ff6b6b'); s.vibe(Math.min(80, 10 + dmg * 3)); }
        if (h.hp <= 0) die(src);
        return dmg;
      }
      function heal(n, quiet) {
        const st = stats();
        const before = G.hero.hp;
        G.hero.hp = Math.min(st.hpMax, G.hero.hp + n);
        const got = G.hero.hp - before;
        if (got > 0 && !quiet) floatTxt(G.hero.x, G.hero.y, '+' + got, '#8ce99a');
        return got;
      }
      function addStatus(who, id, turns, power) {
        const isHero = who === G.hero;
        if (!isHero && who.flags) {
          if (id === 'zehir' && who.flags.indexOf('undead') >= 0) return false;
          if (id === 'yanik' && who.element === 'ates') return false;
          if (id === 'donma' && who.element === 'buz') return false;
          if (who.boss && (id === 'donma' || id === 'sersem')) turns = Math.max(1, Math.floor(turns / 2));
        }
        const cur = who.status[id];
        who.status[id] = { t: Math.max(cur ? cur.t : 0, turns), p: Math.max(cur ? cur.p || 0 : 0, power || 0) };
        if (isHero && !cur) log(STATUS[id].icon + ' ' + STATUS[id].msg, STATUS[id].bad ? '#ffa8a8' : '#b2f2bb');
        else if (visible(who.x, who.y)) floatTxt(who.x, who.y, STATUS[id].icon, '#fff');
        return true;
      }
      function tickStatus(who) {
        const isHero = who === G.hero;
        for (const id in who.status) {
          const st = who.status[id];
          if (id === 'zehir') { const d = Math.max(1, st.p || 1 + Math.floor(G.floor / 4)); if (isHero) hurtHero(d, 'zehir', 'zehir'); else hurtMon(who, d, false, 'zehir'); }
          else if (id === 'yanik') { const d = Math.max(2, st.p || 2 + Math.floor(G.floor / 3)); if (isHero) hurtHero(d, 'yanık', 'ates'); else hurtMon(who, d, false, 'ates'); }
          else if (id === 'yenilenme' && isHero) heal(st.p || 2, true);
          st.t--;
          if (st.t <= 0) { delete who.status[id]; if (isHero) log(STATUS[id].name + ' etkisi geçti.', '#adb5bd'); }
          if (who.hp <= 0) return;
        }
      }
      function gainXp(n) {
        if (!n) return;
        const h = G.hero;
        h.xp += n;
        while (h.xp >= D.xpForLevel(h.level)) {
          h.xp -= D.xpForLevel(h.level);
          h.level++;
          h.pendingPerks++;
          const st = stats();
          h.hp = Math.min(st.hpMax, h.hp + Math.round(st.hpMax * 0.3));
          h.mp = st.mpMax;
          log('⭐ Seviye ' + h.level + '! Yeni bir yetenek seç.', '#ffd43b');
          addFx({ kind: 'ring', x: h.x, y: h.y, col: '#ffd43b' });
          s.sfx('win'); s.vibe(40);
          addScore(200);
        }
      }
      function die(src) {
        if (mode === 'dead') return;
        mode = 'dead';
        G.hero.hp = 0;
        const gained = G.floor + Math.floor(G.kills / 10);
        meta.souls += gained; saveMeta();
        s.store.set('run', null);
        s.sfx('lose'); s.vibe(300);
        log('Öldün...', '#ff6b6b');
        s.over({ score: G.score, win: false, title: 'Öldün', emoji: '💀', msg: 'Kat ' + G.floor + ', seviye ' + G.hero.level + '. ' + (src ? src + ' seni yendi.' : '') + ' +' + gained + ' Ruh Taşı kazandın.', delay: 1400 });
      }
      function victory() {
        if (mode === 'dead') return;
        mode = 'dead';
        const gained = 30 + G.floor;
        meta.souls += gained; meta.wins++; saveMeta();
        s.store.set('run', null);
        addScore(5000);
        s.over({ score: G.score, win: true, title: 'Zafer!', emoji: '🐉', msg: 'Kızıl Ejderha\'yı yendin ve zindandan sağ çıktın! +' + gained + ' Ruh Taşı.', delay: 800 });
      }

      /* ---------- kahraman eylemleri ---------- */
      function tryMove(dx, dy) {
        const h = G.hero, nx = h.x + dx, ny = h.y + dy;
        if (!inB(nx, ny)) return false;
        if (dx && dy && DG.opaque(tileAt(h.x + dx, h.y)) && DG.opaque(tileAt(h.x, h.y + dy))) return false;
        if (G.shop && G.shop.x === nx && G.shop.y === ny) { openShop(); return false; }
        const m = monAt(nx, ny);
        if (m) {
          if (m.ai === 'npc') { openShop(); return false; }
          heroAttack(m); endTurn(); return true;
        }
        const tl = tileAt(nx, ny);
        if (tl === T.DOOR) { G.tiles[key(nx, ny)] = T.DOOR_OPEN; s.sfx('click'); log('Kapıyı açtın.', '#adb5bd'); endTurn(); return true; }
        const ch = G.chests.find(c => c.x === nx && c.y === ny && !c.open);
        if (ch) { openChest(ch); endTurn(); return true; }
        if (!DG.passable(tl) || G.chests.some(c => c.x === nx && c.y === ny)) return false;
        h.x = nx; h.y = ny;
        if (dx) h.face = dx;
        stepOn();
        endTurn();
        return true;
      }
      function stepOn() {
        const h = G.hero;
        // eşya topla
        for (let i = G.items.length - 1; i >= 0; i--) {
          const it = G.items[i];
          if (it.x !== h.x || it.y !== h.y) continue;
          if (it.item.kind === 'gold') { h.gold += it.item.qty; addScore(it.item.qty); log('+' + it.item.qty + ' altın', '#ffd43b'); floatTxt(h.x, h.y, '+' + it.item.qty + ' altın', '#ffd43b'); s.sfx('coin'); G.items.splice(i, 1); }
          else if (addToInv(it.item)) { log(itemName(it.item) + ' aldın.', itemColor(it.item)); s.sfx('place'); G.items.splice(i, 1); }
          else { log('Çantan dolu!', '#ff8787'); walkPath = null; exploring = false; }
        }
        // tuzak
        const tr = G.traps.find(q => q.x === h.x && q.y === h.y);
        if (tr) { triggerTrap(tr); walkPath = null; exploring = false; }
        const tl = tileAt(h.x, h.y);
        if (tl === T.STAIRS) { walkPath = null; exploring = false; log(G.stairsLocked ? 'Merdiven mühürlü. Önce bu katın efendisini yen.' : 'Merdivendesin. ⬇ düğmesiyle in.', '#d0bfff'); }
        if (tl === T.WATER) h.wet = 2;
      }
      function triggerTrap(tr) {
        tr.known = true;
        const f = G.floor;
        s.sfx('error');
        if (tr.kind === 'diken') { log('Diken tuzağı!', '#ff8787'); hurtHero(3 + f * 2, 'diken tuzağı'); }
        else if (tr.kind === 'zehir') { log('Zehirli gaz tuzağı!', '#8ce99a'); addStatus(G.hero, 'zehir', 5, 1 + Math.floor(f / 3)); }
        else if (tr.kind === 'alev') { log('Alev tuzağı!', '#ff922b'); hurtHero(2 + f * 2, 'alev tuzağı', 'ates'); addStatus(G.hero, 'yanik', 3, 2 + Math.floor(f / 3)); addFx({ kind: 'ring', x: tr.x, y: tr.y, col: '#ff922b' }); }
        else if (tr.kind === 'alarm') { log('Alarm! Canavarlar uyandı.', '#ff8787'); G.mons.forEach(m => { if (dist8(m, G.hero) < 18) { m.awake = true; m.last = { x: G.hero.x, y: G.hero.y }; } }); }
        else if (tr.kind === 'isinlanma') { log('Işınlanma tuzağı!', '#d0bfff'); teleportRandom(); }
        G.traps.splice(G.traps.indexOf(tr), 1);
      }
      function teleportRandom() {
        const h = G.hero;
        for (let k = 0; k < 400; k++) {
          const x = 1 + Math.floor(rnd() * (G.w - 2)), y = 1 + Math.floor(rnd() * (G.h - 2));
          if (tileAt(x, y) === T.FLOOR && !monAt(x, y) && heroPassable(x, y) && dist8({ x, y }, h) > 8) { addFx({ kind: 'ring', x: h.x, y: h.y, col: '#d0bfff' }); h.x = x; h.y = y; addFx({ kind: 'ring', x, y, col: '#d0bfff' }); updateFov(); snapCam(); return; }
        }
      }
      function openChest(ch) {
        ch.open = true;
        s.sfx('power'); s.vibe(30);
        log('Sandığı açtın!', '#ffd43b');
        const n = 1 + Math.floor(rnd() * 2);
        for (let i = 0; i < n; i++) dropAt(ch.x, ch.y, i === 0 ? makeEquip(G.floor, 1) : randomLoot(G.floor, 1));
        dropAt(ch.x, ch.y, { kind: 'gold', qty: 10 + G.floor * 6 + Math.floor(rnd() * 15) });
        if (rnd() < 0.12) { log('Sandık tuzaklıydı!', '#ff8787'); hurtHero(2 + G.floor, 'tuzaklı sandık'); }
      }
      function addToInv(item, quiet) {
        const inv = G.hero.inv;
        if (item.stackable) {
          const ex = inv.find(q => q.base === item.base && q.stackable);
          if (ex) { ex.qty += item.qty; return true; }
        }
        if (inv.length >= 18) return false;
        inv.push(item);
        void quiet;
        return true;
      }
      function equip(it, quiet) {
        const h = G.hero;
        const base = D.ITEM_BASES[it.base];
        if (base.classes && base.classes.indexOf(h.cls) < 0) { if (!quiet) s.toast('Bu eşyayı sınıfın kullanamaz', 1200); return false; }
        const old = h.eq[it.slot];
        const idx = h.inv.indexOf(it);
        if (idx >= 0) h.inv.splice(idx, 1);
        h.eq[it.slot] = it;
        if (old) h.inv.push(old);
        if (!quiet) { log(it.name + ' kuşandın.', itemColor(it)); s.sfx('place'); }
        const st = stats();
        h.hp = Math.min(h.hp, st.hpMax); h.mp = Math.min(h.mp, st.mpMax);
        return true;
      }
      function useItem(it, fromShop) {
        const h = G.hero, c = D.CONSUMABLES[it.base];
        const st = stats();
        let used = true, needTurn = true;
        const E = c.effect, P = c.power || 0;
        if (c.kind === 'potion' && !G.known[it.base]) { G.known[it.base] = true; log('Bu ' + c.name + ' imiş!', '#d0bfff'); }
        if (E === 'heal') { heal(P); log(c.name + ': +' + P + ' can.', '#8ce99a'); if (h.status.zehir) delete h.status.zehir; }
        else if (E === 'mana') { h.mp = Math.min(st.mpMax, h.mp + P); log('+' + P + ' mana.', '#74c0fc'); }
        else if (E === 'cure') { ['zehir', 'yanik', 'zayif', 'sersem', 'donma'].forEach(k => delete h.status[k]); heal(Math.round(P)); log('Kendini arınmış hissediyorsun.', '#b2f2bb'); }
        else if (E === 'strength') addStatus(h, 'kuvvet', c.turns || 12);
        else if (E === 'regen') addStatus(h, 'yenilenme', c.turns || 10, P || 2);
        else if (E === 'invis') addStatus(h, 'gorunmez', c.turns || 12);
        else if (E === 'fireres') addStatus(h, 'ates_direnci', c.turns || 20);
        else if (E === 'xp') { gainXp(P || D.xpForLevel(h.level) * 0.5); log('Zihnin açıldı: tecrübe kazandın!', '#ffd43b'); }
        else if (E === 'food') { heal(P); h.sated = 30; log('Yemek yedin. +' + P + ' can.', '#b2f2bb'); }
        else if (E === 'teleport') { teleportRandom(); log('Işınlandın!', '#d0bfff'); }
        else if (E === 'map') { for (let i = 0; i < G.seen.length; i++) if (G.tiles[i] !== T.WALL || hasFloorNeighbor(i)) G.seen[i] = 1; G.traps.forEach(q => { q.known = true; }); log('Katın haritası zihninde belirdi!', '#d0bfff'); }
        else if (E === 'enchant') { const w = h.eq.weapon || h.eq.armor; if (!w) { s.toast('Büyülenecek eşya yok', 1200); used = false; } else { const k = w.slot === 'weapon' ? 'atk' : 'def'; w.stats[k] = (w.stats[k] || 0) + Math.max(1, P); w.name = w.name.replace(/ \+\d+$/, '') + ' +' + ((w.plus = (w.plus || 0) + 1)); log(w.name + ' güçlendi!', '#ffd43b'); } }
        else if (E === 'fire') { let n = 0; G.mons.forEach(m => { if (m.hp > 0 && visible(m.x, m.y) && m.ai !== 'npc') { const d = Math.round(P + st.spell * 1.5); hurtMon(m, m.element === 'ates' ? Math.round(d * 0.3) : d, false, 'ates'); if (m.hp > 0) addStatus(m, 'yanik', 3, 2 + Math.floor(G.floor / 3)); n++; } }); log('Alevler ' + n + ' düşmanı yaladı!', '#ff922b'); addFx({ kind: 'ring', x: h.x, y: h.y, col: '#ff922b' }); s.sfx('boom'); }
        else if (E === 'freeze') { let n = 0; G.mons.forEach(m => { if (m.hp > 0 && visible(m.x, m.y) && m.ai !== 'npc') { addStatus(m, 'donma', c.turns || 4); hurtMon(m, Math.round(P + st.spell), false, 'buz'); n++; } }); log(n + ' düşman dondu!', '#74c0fc'); addFx({ kind: 'ring', x: h.x, y: h.y, col: '#74c0fc' }); }
        else if (E === 'identify') { Object.values(D.CONSUMABLES).forEach(q => { if (q.kind === 'potion') G.known[q.id] = true; }); log('Tüm iksirleri tanıyorsun artık.', '#d0bfff'); }
        else if (E === 'return') { h.x = G.start.x; h.y = G.start.y; updateFov(); snapCam(); log('Katın başına döndün.', '#d0bfff'); }
        else { log('Hiçbir şey olmadı.', '#adb5bd'); }
        if (used) {
          s.sfx(c.kind === 'potion' ? 'flip' : c.kind === 'food' ? 'eat' : 'power');
          if (!fromShop) { it.qty--; if (it.qty <= 0) h.inv.splice(h.inv.indexOf(it), 1); }
          if (needTurn) endTurn();
        }
        return used;
      }
      function hasFloorNeighbor(i) { const x = i % G.w, y = (i / G.w) | 0; return DIRS8.some(d => inB(x + d[0], y + d[1]) && G.tiles[key(x + d[0], y + d[1])] !== T.WALL); }

      function useSkill(idx, target) {
        const h = G.hero, id = h.skills[idx], S = SKILLS[id];
        if (!S) return;
        const st = stats();
        const cost = Math.max(1, Math.round(S.mp * (1 + (st.skillCost || 0))));
        if (h.cd[id] > 0) { s.toast(S.name + ' hazır değil (' + h.cd[id] + ' tur)', 1100); return; }
        if (h.mp < cost) { s.toast('Yeterli mana yok (' + cost + ' gerekli)', 1100); s.sfx('error'); return; }
        if (S.target !== 'none' && !target) { targeting = { idx, id, S }; s.toast(S.name + ': hedef seç', 1200); return; }
        const inView = () => G.mons.filter(m => m.hp > 0 && m.ai !== 'npc' && visible(m.x, m.y));
        const spellPow = st.spell;
        let ok = true;
        if (id === 'girdap') {
          const ms = G.mons.filter(m => m.hp > 0 && m.ai !== 'npc' && dist8(m, h) <= 1);
          if (!ms.length) { s.toast('Yanında düşman yok', 1000); return; }
          ms.forEach(m => heroAttack(m, { mult: 1.2, sure: true }));
          addFx({ kind: 'ring', x: h.x, y: h.y, col: '#ffd43b' });
        } else if (id === 'kalkan_duvari') { addStatus(h, 'kalkan', 4); addFx({ kind: 'ring', x: h.x, y: h.y, col: '#74c0fc' }); }
        else if (id === 'hucum') {
          const dx = Math.sign(target.x - h.x), dy = Math.sign(target.y - h.y);
          if (!dx && !dy) return;
          let hit = null, steps = 0;
          while (steps < 4) {
            const nx = h.x + dx, ny = h.y + dy;
            const m = monAt(nx, ny);
            if (m) { hit = m; break; }
            if (!DG.passable(tileAt(nx, ny)) || G.chests.some(c => c.x === nx && c.y === ny && !c.open)) break;
            h.x = nx; h.y = ny; steps++;
            addFx({ kind: 'spark', x: h.x, y: h.y, col: '#ffd43b' });
          }
          if (hit) { heroAttack(hit, { mult: 2, sure: true }); if (hit.hp > 0) addStatus(hit, 'sersem', 2); }
          stepOn();
        } else if (id === 'coklu_ok') {
          const ms = inView().filter(m => los(h, m)).sort((a, b) => distE(a, h) - distE(b, h)).slice(0, 3);
          if (!ms.length) { s.toast('Görüşte düşman yok', 1000); return; }
          ms.forEach(m => { addFx({ kind: 'proj', x0: h.x, y0: h.y, x1: m.x, y1: m.y, col: '#ffe066' }); heroAttack(m, { mult: 0.9, sure: true }); });
          s.sfx('shoot');
        } else if (id === 'zehirli_ok') {
          const m = monAt(target.x, target.y);
          if (!m || !visible(m.x, m.y) || distE(m, h) > S.range) { s.toast('Hedef menzil dışında', 1000); return; }
          addFx({ kind: 'proj', x0: h.x, y0: h.y, x1: m.x, y1: m.y, col: '#8ce99a' });
          heroAttack(m, { sure: true });
          if (m.hp > 0) addStatus(m, 'zehir', 6, 2 + Math.floor(G.floor / 3) + Math.floor(st.atk * 0.15));
        } else if (id === 'geri_sicra') {
          const ms = inView();
          let best = null, bd = -1;
          for (let k = 0; k < 400; k++) {
            const x = h.x - 3 + Math.floor(rnd() * 7), y = h.y - 3 + Math.floor(rnd() * 7);
            if (!DG.passable(tileAt(x, y)) || monAt(x, y) || !visible(x, y) || dist8({ x, y }, h) > 3) continue;
            const dmin = ms.length ? Math.min.apply(null, ms.map(m => distE(m, { x, y }))) : dist8({ x, y }, h);
            if (dmin > bd) { bd = dmin; best = { x, y }; }
          }
          if (!best) { s.toast('Sıçrayacak yer yok', 1000); return; }
          addFx({ kind: 'spark', x: h.x, y: h.y, col: '#fff' });
          h.x = best.x; h.y = best.y; stepOn();
        } else if (id === 'ates_topu') {
          if (!visible(target.x, target.y) || distE(target, h) > S.range) { s.toast('Hedef görüş dışında', 1000); return; }
          addFx({ kind: 'proj', x0: h.x, y0: h.y, x1: target.x, y1: target.y, col: '#ff922b' });
          addFx({ kind: 'ring', x: target.x, y: target.y, col: '#ff922b' });
          const dmg = Math.round(8 + G.floor * 1.6 + spellPow * 2 + h.level);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const m = monAt(target.x + dx, target.y + dy);
            if (m && m.ai !== 'npc') { wake(m); const d = m.element === 'ates' ? Math.round(dmg * 0.3) : m.element === 'buz' ? Math.round(dmg * 1.5) : dmg; hurtMon(m, d, false, 'ates'); if (m.hp > 0) addStatus(m, 'yanik', 3, 2 + Math.floor(G.floor / 3)); }
          }
          if (dist8(target, h) <= 1) hurtHero(Math.round(dmg * 0.5), 'kendi ateş topun', 'ates');
          s.sfx('boom'); shake = 6;
        } else if (id === 'buz_halkasi') {
          const ms = G.mons.filter(m => m.hp > 0 && m.ai !== 'npc' && dist8(m, h) <= 2);
          const dmg = Math.round(4 + G.floor + spellPow * 1.5);
          ms.forEach(m => { wake(m); hurtMon(m, m.element === 'buz' ? 1 : dmg, false, 'buz'); if (m.hp > 0) addStatus(m, 'donma', 3); });
          addFx({ kind: 'ring', x: h.x, y: h.y, col: '#74c0fc' });
          s.sfx('power');
        } else if (id === 'isinlanma') {
          if (!visible(target.x, target.y) || !DG.passable(tileAt(target.x, target.y)) || monAt(target.x, target.y) || tileAt(target.x, target.y) === T.LAVA) { s.toast('Oraya ışınlanamazsın', 1000); return; }
          addFx({ kind: 'ring', x: h.x, y: h.y, col: '#d0bfff' });
          h.x = target.x; h.y = target.y;
          addFx({ kind: 'ring', x: h.x, y: h.y, col: '#d0bfff' });
          stepOn();
        }
        if (!ok) return;
        h.mp -= cost;
        h.cd[id] = S.cd;
        targeting = null;
        s.sfx('power');
        endTurn();
      }
      function fireAt(m) {
        const h = G.hero, st = stats();
        if (distE(m, h) > st.range || !los(h, m)) { s.toast('Menzil dışında', 900); return false; }
        addFx({ kind: 'proj', x0: h.x, y0: h.y, x1: m.x, y1: m.y, col: '#ffe066' });
        heroAttack(m);
        s.sfx('shoot');
        endTurn();
        return true;
      }
      function search() {
        let found = 0;
        G.traps.forEach(tr => { if (!tr.known && dist8(tr, G.hero) <= 2 && (dist8(tr, G.hero) <= 1 || rnd() < 0.6)) { tr.known = true; found++; } });
        log(found ? '🔍 ' + found + ' gizli tuzak buldun!' : 'Etrafı aradın, bir şey yok.', found ? '#ffd43b' : '#adb5bd');
        if (found) s.sfx('check');
        endTurn();
      }
      function descend() {
        if (tileAt(G.hero.x, G.hero.y) !== T.STAIRS) {
          // merdivene yürü
          walkTo(G.stairs.x, G.stairs.y);
          return;
        }
        if (G.stairsLocked) { s.toast('Merdiven mühürlü: önce bossu yen', 1400); s.sfx('error'); return; }
        s.sfx('drop'); s.vibe(30);
        addFx({ kind: 'fade' });
        nextFloor();
      }

      /* ---------- tur ---------- */
      function endTurn() {
        if (mode !== 'play') return;
        const h = G.hero;
        G.turn++;
        monstersAct();
        if (mode !== 'play') return;
        // donmuş/sersem kahraman: canavarlar bir tur daha oynar
        let lost = 0;
        while ((h.status.donma || h.status.sersem) && lost < 3 && mode === 'play') {
          lost++;
          if (h.status.sersem) delete h.status.sersem;
          else { h.status.donma.t--; if (h.status.donma.t <= 0) delete h.status.donma; }
          log('Hareket edemiyorsun!', '#ffa8a8');
          monstersAct();
        }
        if (mode !== 'play') return;
        // durum etkileri, yenilenme
        tickStatus(h);
        if (mode !== 'play') return;
        const st = stats();
        h.mp = Math.min(st.mpMax, h.mp + st.regenMp);
        if (st.regen) heal(st.regen, true);
        if (G.turn % 10 === 0 && !h.status.zehir && !h.status.yanik) heal(1, true);
        for (const k in h.cd) if (h.cd[k] > 0) h.cd[k]--;
        if (h.wet > 0) h.wet--;
        updateFov();
        // boss karşılaşması
        G.mons.forEach(m => { if (m.boss && !m.met && visible(m.x, m.y)) { m.met = true; log('⚠ ' + m.name + ' karşında!', '#ff6b6b'); s.toast(m.name, 1800); s.sfx('boom'); shake = 8; } });
        if (h.pendingPerks > 0 && !busy) showPerks();
        save();
      }
      function wake(m) { if (!m.awake) { m.awake = true; } m.last = { x: G.hero.x, y: G.hero.y }; }
      function monstersAct() {
        const h = G.hero;
        for (const m of G.mons) {
          if (m.hp <= 0 || m.ai === 'npc') continue;
          if (m.status.donma) { tickStatus(m); continue; }
          if (m.flags.indexOf('regen') >= 0 && m.hp < m.hpMax) m.hp = Math.min(m.hpMax, m.hp + Math.max(1, Math.round(m.hpMax * 0.04)));
          let sp = m.speed;
          if (tileAt(m.x, m.y) === T.WATER && m.flags.indexOf('flying') < 0) sp *= 0.5;
          m.energy += sp;
          let guard = 0;
          while (m.energy >= 1 && m.hp > 0 && mode === 'play' && guard++ < 4) {
            m.energy -= 1;
            if (m.status.sersem) { delete m.status.sersem; continue; }
            monAct(m);
          }
          tickStatus(m);
          if (mode !== 'play') return;
        }
        void h;
      }
      function canSee(m) {
        const h = G.hero;
        if (h.status.gorunmez && dist8(m, h) > 1) return false;
        return dist8(m, h) <= m.sight && visible(m.x, m.y);
      }
      function monPassable(m) {
        return (x, y) => {
          const tl = tileAt(x, y);
          if (m.flags.indexOf('phase') >= 0) return tl !== T.CHASM && inB(x, y) && x > 0 && y > 0 && x < G.w - 1 && y < G.h - 1;
          if (tl === T.LAVA || tl === T.CHASM) return m.flags.indexOf('flying') >= 0;
          if (tl === T.DOOR) return true;
          if (G.chests.some(c => c.x === x && c.y === y)) return false;
          if (G.shop && G.shop.x === x && G.shop.y === y) return false;
          return DG.passable(tl);
        };
      }
      function monStep(m, tx, ty) {
        const pass = monPassable(m);
        const path = DG.path.find(G.w, G.h, (x, y) => pass(x, y) && (!monAt(x, y) || (x === tx && y === ty)), m.x, m.y, tx, ty, 900);
        let nx, ny;
        if (path && path.length) { nx = path[0].x; ny = path[0].y; }
        else {
          // açgözlü adım
          let best = null, bd = 1e9;
          for (const d of DIRS8) {
            const x = m.x + d[0], y = m.y + d[1];
            if (!pass(x, y) || monAt(x, y) || (x === G.hero.x && y === G.hero.y)) continue;
            const dd = Math.hypot(x - tx, y - ty);
            if (dd < bd) { bd = dd; best = { x, y }; }
          }
          if (!best) return false;
          nx = best.x; ny = best.y;
        }
        if (nx === G.hero.x && ny === G.hero.y) return false;
        if (monAt(nx, ny)) return false;
        if (tileAt(nx, ny) === T.DOOR) G.tiles[key(nx, ny)] = T.DOOR_OPEN;
        if (nx !== m.x) m.face = nx - m.x;
        m.x = nx; m.y = ny;
        return true;
      }
      function monFlee(m) {
        const pass = monPassable(m);
        let best = null, bd = dist8(m, G.hero);
        for (const d of DIRS8) {
          const x = m.x + d[0], y = m.y + d[1];
          if (!pass(x, y) || monAt(x, y)) continue;
          const dd = Math.max(Math.abs(x - G.hero.x), Math.abs(y - G.hero.y));
          if (dd > bd) { bd = dd; best = { x, y }; }
        }
        if (best) { m.x = best.x; m.y = best.y; return true; }
        return false;
      }
      function monAttack(m, ranged) {
        const h = G.hero, st = stats();
        if (!ranged && rnd() < st.dodge) { log(m.name + ' saldırdı, kaçındın!', '#adb5bd'); floatTxt(h.x, h.y, 'kaçındın', '#adb5bd'); return; }
        if (ranged) addFx({ kind: 'proj', x0: m.x, y0: m.y, x1: h.x, y1: h.y, col: m.element === 'ates' ? '#ff922b' : m.element === 'buz' ? '#74c0fc' : m.ai === 'caster' ? '#da77f2' : '#ced4da' });
        if (ranged && rnd() < st.dodge * 0.6) { log(m.name + ' ıskaladı.', '#adb5bd'); return; }
        const dmg = rollDmg(m.atk, st.def);
        const done = hurtHero(dmg, m.name, m.element);
        log(m.name + ' sana ' + done + ' hasar verdi.' + (m.element ? ' (' + m.element + ')' : ''), '#ffa8a8');
        s.sfx('hit');
        if (m.onHit && rnd() < m.onHit.chance) addStatus(h, m.onHit.status, m.onHit.turns, 1 + Math.floor(G.floor / 3));
        if (st.thorns && !ranged) { hurtMon(m, st.thorns, false); }
        if (m.ai === 'caster' && m.special === 'can_emme') { m.hp = Math.min(m.hpMax, m.hp + Math.round(done * 0.6)); }
      }
      function bossSpecial(m) {
        const h = G.hero;
        m.specT++;
        if (m.id === 'ejderha' && m.specT >= 4 && dist8(m, h) <= 5 && los(m, h)) {
          m.specT = 0;
          log('🐉 Ejderha ateş püskürdü!', '#ff922b');
          const line = DG.path.line(m.x, m.y, h.x, h.y);
          line.forEach((p, i) => { if (i) addFx({ kind: 'ring', x: p.x, y: p.y, col: '#ff922b', small: true }); });
          hurtHero(Math.round(m.atk * 1.4), 'ejderha nefesi', 'ates');
          addStatus(h, 'yanik', 3, 4);
          shake = 10; s.sfx('boom');
          return true;
        }
        if (m.id === 'lich' && m.specT >= 3 && visible(m.x, m.y) && los(m, h)) {
          m.specT = 0;
          log('💀 Lich canını emiyor!', '#da77f2');
          addFx({ kind: 'proj', x0: m.x, y0: m.y, x1: h.x, y1: h.y, col: '#da77f2' });
          const d = hurtHero(Math.round(m.atk * 0.9), 'lich', 'karanlik');
          m.hp = Math.min(m.hpMax, m.hp + d);
          return true;
        }
        if (m.id === 'goblin_kral' && m.specT >= 5) {
          m.specT = 0;
          log('👑 Goblin Kralı savaş çığlığı attı!', '#ffd43b');
          G.mons.forEach(o => { if (o !== m && o.hp > 0 && o.id.indexOf('goblin') === 0) { o.awake = true; o.last = { x: h.x, y: h.y }; o.atk = Math.round(o.atk * 1.15); } });
          shake = 6; s.sfx('boom');
          return true;
        }
        return false;
      }
      function monAct(m) {
        const h = G.hero;
        const sees = canSee(m);
        if (sees) wake(m);
        if (!m.awake) {
          if (m.ai === 'erratic' && rnd() < 0.3) monStep(m, m.x + Math.floor(rnd() * 3) - 1, m.y + Math.floor(rnd() * 3) - 1);
          return;
        }
        const d = dist8(m, h);
        // boss evreleri
        if (m.boss) {
          for (const ph of m.phases) {
            if (!ph.done && m.hp <= m.hpMax * ph.hpBelow) {
              ph.done = true;
              log(ph.msg || (m.name + ' güç topluyor!'), '#ff8787');
              if (ph.summon) summonNear(m, ph.summon, ph.count || 2);
              if (ph.heal) m.hp = Math.min(m.hpMax, m.hp + Math.round(m.hpMax * ph.heal));
              shake = 8; s.sfx('boom');
            }
          }
          if (bossSpecial(m)) return;
        }
        if (m.flags.indexOf('summoner') >= 0 && m.summon) { m.sumT++; if (m.sumT >= 6 && sees) { m.sumT = 0; summonNear(m, m.summon, 1); log(m.name + ' yardım çağırdı!', '#da77f2'); return; } }
        const ranged = (m.ai === 'ranged' || m.ai === 'caster') && m.range > 1;
        if (m.ai === 'coward' && m.hp < m.hpMax * 0.4 && d <= 3) { if (monFlee(m)) return; }
        if (m.ai === 'ambush' && !m.sprung) { if (d <= 2) { m.sprung = true; m.speed = Math.max(m.speed, 2); log(m.name + ' pusudan fırladı!', '#ff8787'); } else return; }
        if (m.ai === 'erratic' && rnd() < 0.35) { monStep(m, m.x + Math.floor(rnd() * 3) - 1, m.y + Math.floor(rnd() * 3) - 1); return; }
        if (d <= 1) { monAttack(m, false); return; }
        if (ranged && sees && d <= m.range && los(m, h)) {
          if (d <= 2 && rnd() < 0.5 && monFlee(m)) return;
          monAttack(m, true); return;
        }
        const tgt = sees ? h : m.last;
        if (!tgt) return;
        if (!monStep(m, tgt.x, tgt.y) && !sees) m.last = null;
        if (m.last && m.x === m.last.x && m.y === m.last.y) m.last = null;
      }
      function summonNear(m, id, n) {
        const def = D.MONSTERS[id];
        if (!def) return;
        for (let k = 0; k < n; k++) {
          const free = DIRS8.map(d => ({ x: m.x + d[0], y: m.y + d[1] })).filter(z => DG.passable(tileAt(z.x, z.y)) && !monAt(z.x, z.y) && !(z.x === G.hero.x && z.y === G.hero.y));
          if (!free.length) return;
          const z = free[Math.floor(rnd() * free.length)];
          const c = spawnMon(D.scaleMonster(def, G.floor), z.x, z.y, false);
          c.awake = true; c.xp = Math.round(c.xp * 0.5); c.gold = [0, 0];
          addFx({ kind: 'ring', x: z.x, y: z.y, col: '#da77f2', small: true });
        }
      }

      /* ---------- yürüme / keşif ---------- */
      function heroPassable(x, y) {
        const tl = tileAt(x, y);
        if (tl === T.DOOR) return true;
        if (G.chests.some(c => c.x === x && c.y === y)) return false;
        if (G.shop && G.shop.x === x && G.shop.y === y) return false;
        const tr = G.traps.find(q => q.x === x && q.y === y && q.known);
        if (tr) return false;
        return DG.passable(tl);
      }
      const seenMonAt = (x, y) => { const m = monAt(x, y); return m && visible(x, y) ? m : null; };
      function walkTo(tx, ty) {
        const h = G.hero;
        if (!G.seen[key(tx, ty)]) { s.toast('Orayı henüz görmedin', 900); return; }
        const path = DG.path.find(G.w, G.h, (x, y) => (x === tx && y === ty && tileAt(x, y) !== T.WALL) || (heroPassable(x, y) && !seenMonAt(x, y)), h.x, h.y, tx, ty, 6000);
        if (!path || !path.length) { s.toast('Oraya yol yok', 900); return; }
        walkPath = path; walkT = 0; exploring = false;
      }
      function visibleThreat() { return G.mons.some(m => m.hp > 0 && m.ai !== 'npc' && visible(m.x, m.y) && (m.awake || dist8(m, G.hero) < 6)); }
      function walkStep() {
        if (!walkPath || !walkPath.length) { walkPath = null; return; }
        const n = walkPath.shift();
        const dx = n.x - G.hero.x, dy = n.y - G.hero.y;
        const hpBefore = G.hero.hp;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || !tryMove(dx, dy)) { walkPath = null; return; }
        if (walkPath && !walkPath.length) walkPath = null;
        if (visibleThreat() || G.hero.hp < hpBefore) { walkPath = null; exploring = false; }
      }
      function exploreStep() {
        const h = G.hero;
        if (visibleThreat()) { exploring = false; log('Bir düşman göründü! Keşif durdu.', '#ffa8a8'); return; }
        const dmap = DG.path.dijkstra(G.w, G.h, (x, y) => heroPassable(x, y) && !seenMonAt(x, y), [{ x: h.x, y: h.y }], 600);
        let best = null, bd = 1e9;
        // önce yerdeki eşyalar (çanta doluysa yalnızca altın)
        const full = h.inv.length >= 18;
        for (const it of G.items) {
          if (full && it.item.kind !== 'gold' && !(it.item.stackable && h.inv.some(q => q.base === it.item.base))) continue;
          const dd = dmap[key(it.x, it.y)];
          if (dd > 0 && dd < bd && G.seen[key(it.x, it.y)]) { bd = dd; best = { x: it.x, y: it.y }; }
        }
        // kapalı sandıklar: yanına git, yanındaysan aç
        for (const c of G.chests) {
          if (c.open || !G.seen[key(c.x, c.y)]) continue;
          if (dist8(c, h) === 1 && !(c.x !== h.x && c.y !== h.y && DG.opaque(tileAt(c.x, h.y)) && DG.opaque(tileAt(h.x, c.y)))) { tryMove(c.x - h.x, c.y - h.y); return; }
          for (const d of DIRS8) {
            const x = c.x + d[0], y = c.y + d[1];
            if (!inB(x, y)) continue;
            const dd = dmap[key(x, y)];
            if (dd > 0 && dd < bd) { bd = dd; best = { x, y }; }
          }
        }
        if (!best) {
          // sınır: görülmüş, ulaşılabilir ve görülmemiş komşusu olan karo
          for (let y = 1; y < G.h - 1; y++) for (let x = 1; x < G.w - 1; x++) {
            const i = key(x, y);
            if (dmap[i] <= 0 || dmap[i] >= bd || !G.seen[i]) continue;
            for (const d of DIRS8) { if (!G.seen[key(x + d[0], y + d[1])]) { bd = dmap[i]; best = { x, y }; break; } }
          }
        }
        if (!best) {
          exploring = false;
          if (G.seen[key(G.stairs.x, G.stairs.y)] && tileAt(h.x, h.y) !== T.STAIRS) { log('Kat keşfedildi. Merdivene gidiliyor.', '#d0bfff'); walkTo(G.stairs.x, G.stairs.y); }
          else log('Keşfedilecek yer kalmadı.', '#adb5bd');
          return;
        }
        const path = DG.path.find(G.w, G.h, (x, y) => heroPassable(x, y) && (!seenMonAt(x, y) || (x === best.x && y === best.y)), h.x, h.y, best.x, best.y, 6000);
        if (!path || !path.length) { exploring = false; return; }
        walkPath = path; walkT = 0;
      }

      /* ---------- kayıt ---------- */
      function save() {
        if (mode !== 'play') return;
        const o = Object.assign({}, G);
        o.rng = G.rng.state();
        o.tiles = Array.from(G.tiles); o.seen = Array.from(G.seen); o.vis = undefined;
        s.store.set('run', o);
      }
      function restore(o) {
        G = o;
        G.rng = DG.rng.fromState(o.rng);
        G.tiles = Uint8Array.from(o.tiles); G.seen = Uint8Array.from(o.seen);
        G.vis = new Uint8Array(G.w * G.h);
        let mx = 0;
        const scan = it => { if (it && it.uid > mx) mx = it.uid; };
        G.hero.inv.forEach(scan); Object.values(G.hero.eq).forEach(scan); G.items.forEach(q => scan(q.item)); if (G.shop) G.shop.stock.forEach(scan);
        uid = mx + 1;
        updateFov();
      }

      /* ---------- kamera ---------- */
      function snapCam() { cam.x = G.hero.x - COLS / 2 + 0.5; cam.y = G.hero.y - ROWS / 2 + 0.5; clampCam(); }
      function clampCam() {
        cam.x = U.clamp(cam.x, -1, Math.max(-1, G.w - COLS + 1));
        cam.y = U.clamp(cam.y, -1, Math.max(-1, G.h - ROWS + 1));
      }
      const MAP_Y = HUD_H;
      const sx = x => (x - cam.x) * TS;
      const sy = y => MAP_Y + (y - cam.y) * TS;

      /* ---------- DOM arayüzü ---------- */
      const ui = document.createElement('div');
      ui.className = 'dg-ui hidden';
      s.stage.appendChild(ui);
      const bar1 = s.controls('dg-bar'), bar2 = s.controls('dg-bar');
      const skillBtns = [0, 1, 2].map(i => s.button(bar1, '', () => { if (mode === 'play' && !busy) { closeUI(); useSkill(i); } }));
      s.button(bar1, '🎒', () => { if (mode === 'play') toggleInv(); });
      const waitBtn = s.button(bar2, '⏳', () => { if (mode === 'play' && !busy) { stopAuto(); endTurn(); } }, '', { repeat: true, rate: 160, delay: 300 });
      s.button(bar2, '🔍', () => { if (mode === 'play' && !busy) { stopAuto(); search(); } });
      const exploreBtn = s.button(bar2, '🧭', () => { if (mode !== 'play' || busy) return; if (tileAt(G.hero.x, G.hero.y) === T.STAIRS) { descend(); return; } if (exploring || walkPath) stopAuto(); else { exploring = true; exploreStep(); } });
      s.button(bar2, '🗺', () => { if (mode === 'play') { showMap = !showMap; closeUI(); } });
      void waitBtn;
      function stopAuto() { walkPath = null; exploring = false; }
      function refreshBar() {
        if (!G) return;
        const h = G.hero, st = stats();
        skillBtns.forEach((b, i) => {
          const id = h.skills[i], S = SKILLS[id];
          if (!S) { b.innerHTML = '–'; b.disabled = true; return; }
          const cd = h.cd[id] || 0, cost = Math.max(1, Math.round(S.mp * (1 + (st.skillCost || 0))));
          b.innerHTML = S.icon + '<small>' + (cd > 0 ? cd + ' tur' : cost + ' mana') + '</small>';
          b.disabled = mode !== 'play';
          b.classList.toggle('cool', cd > 0 || h.mp < cost);
          b.classList.toggle('on', !!(targeting && targeting.idx === i));
        });
        const onStairs = tileAt(h.x, h.y) === T.STAIRS;
        exploreBtn.innerHTML = onStairs ? '⬇<small>in</small>' : (exploring || walkPath) ? '⏹<small>dur</small>' : '🧭<small>keşfet</small>';
        exploreBtn.classList.toggle('primary', onStairs && !G.stairsLocked);
      }
      function closeUI() { ui.classList.add('hidden'); ui.innerHTML = ''; busy = false; uiKind = null; if (G && mode === 'play') save(); }
      s.on(ui, 'click', e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        Platform.sound.unlock();
        const act = b.dataset.act, arg = b.dataset.arg;
        if (act === 'close') { closeUI(); if (G && G.hero.pendingPerks > 0 && mode === 'play') showPerks(); }
        else if (act === 'start') { closeUI(); newRun(); mode = 'play'; s.sfx('click'); refreshBar(); }
        else if (act === 'continue') { const o = s.store.get('run', null); closeUI(); if (o) { restore(o); mode = 'play'; snapCam(); s.score(G.score); s.toast('Kaldığın yerden devam ediyorsun', 1400); } else newRun(); mode = 'play'; refreshBar(); }
        else if (act === 'soul') { const u = SOUL_UPS.find(q => q.k === arg), l = meta.ups[arg], c = u.cost(l); if (l >= u.max || meta.souls < c) { s.sfx('error'); return; } meta.souls -= c; meta.ups[arg]++; saveMeta(); s.sfx('power'); showCamp(); }
        else if (act === 'item') { selectedItem = selectedItem === arg ? null : arg; renderIfOpen(); }
        else if (act === 'use') { const it = findItem(arg); if (it) { if (it.kind === 'equip') { equip(it); } else { closeUI(); useItem(it); } renderIfOpen(); } }
        else if (act === 'unequip') { const it = G.hero.eq[arg]; if (it && G.hero.inv.length < 18) { G.hero.eq[arg] = null; G.hero.inv.push(it); s.sfx('place'); renderInv(); } else s.toast('Çanta dolu', 900); }
        else if (act === 'drop') { const it = findItem(arg); if (it) { G.hero.inv.splice(G.hero.inv.indexOf(it), 1); dropAt(G.hero.x, G.hero.y, it); log(itemName(it) + ' yere bıraktın.', '#adb5bd'); selectedItem = null; renderInv(); } }
        else if (act === 'perk') { const p = D.PERKS.find(q => q.id === arg); G.hero.perks[arg] = (G.hero.perks[arg] || 0) + 1; G.hero.pendingPerks--; const st = stats(); if (p.mods.hp) G.hero.hp += p.mods.hp; G.hero.hp = Math.min(G.hero.hp, st.hpMax); log('Yetenek: ' + p.name, '#ffd43b'); s.sfx('power'); closeUI(); if (G.hero.pendingPerks > 0) showPerks(); save(); refreshBar(); }
        else if (act === 'buy') { const it = G.shop.stock.find(q => q.uid === +arg); if (!it) return; const price = shopPrice(it); if (G.hero.gold < price) { s.sfx('error'); s.toast('Yeterli altının yok', 900); return; } if (!addToInv(it)) { s.toast('Çanta dolu', 900); return; } G.hero.gold -= price; G.shop.stock.splice(G.shop.stock.indexOf(it), 1); if (it.kind === 'potion') G.known[it.base] = true; s.sfx('coin'); log(itemName(it) + ' satın aldın.', itemColor(it)); save(); renderShop(); }
        else if (act === 'sell') { const it = findItem(arg); if (!it) return; const price = Math.max(1, Math.floor(it.value / 2)); G.hero.gold += price; if (it.stackable && it.qty > 1) it.qty--; else G.hero.inv.splice(G.hero.inv.indexOf(it), 1); s.sfx('coin'); log(itemName(it) + ' sattın: +' + price + ' altın', '#ffd43b'); selectedItem = null; save(); renderShop(); }
        else if (act === 'shoptab') { shopTab = arg; renderShop(); }
        else if (act === 'log') { renderLog(); }
      });
      let selectedItem = null, shopTab = 'buy', uiKind = null;
      const findItem = id => G.hero.inv.find(q => q.uid === +id);
      const renderIfOpen = () => { if (uiKind === 'inv') renderInv(); else if (uiKind === 'shop') renderShop(); };
      const iconCache = {};
      const iconHtml = (id, px) => {
        px = px || 36;
        const k = id + ':' + px;
        if (!iconCache[k]) {
          let url = '';
          try { url = DG.art.iconUrl ? DG.art.iconUrl(id, px * 2) : DG.art.icon(id, px * 2).toDataURL(); } catch (e) { url = ''; }
          iconCache[k] = url;
        }
        return iconCache[k] ? '<img class="dg-px" width="' + px + '" height="' + px + '" src="' + iconCache[k] + '" alt="">' : '';
      };
      const esc = str => String(str).replace(/</g, '&lt;');
      const GOLD = '<span class="dg-gold">' + iconHtml('altin', 15) + '</span>';

      function showCamp() {
        mode = 'camp'; busy = true; uiKind = 'camp';
        const c = D.CLASSES[CLS];
        const saved = s.store.get('run', null);
        let h = '<div class="dg-camp"><div class="dg-top"><div class="dg-chip"><small>RUH TAŞI</small><b>💠 ' + meta.souls + '</b></div><div class="dg-chip"><small>EN DERİN</small><b>Kat ' + meta.deepest + '</b></div><div class="dg-chip"><small>ZAFER</small><b>' + meta.wins + '</b></div></div>';
        h += '<div class="dg-hero"><div class="dg-heroic">' + iconHtml(CLS, 64) + '</div><div><b style="color:' + c.color + '">' + c.name + '</b><small>' + esc(c.desc) + '</small><small>❤️ ' + (c.hp + meta.ups.can * 5) + ' · 🔵 ' + c.mp + ' · ⚔️ ' + (c.atk + meta.ups.guc) + ' · 🛡️ ' + (c.def + meta.ups.zirh) + '</small></div></div>';
        if (saved && saved.hero && saved.hero.cls === CLS && !s.restart) h += '<button class="btn primary dg-go" data-act="continue">▶&nbsp; DEVAM ET (Kat ' + saved.floor + ', Sv ' + saved.hero.level + ')</button><button class="btn dg-go2" data-act="start">Yeni Oyun (mevcut oyun silinir)</button>';
        else h += '<button class="btn primary dg-go" data-act="start">⚔️&nbsp; ZİNDANA GİR</button>';
        h += '<div class="opt-label">KALICI BONUSLAR (Ruh Taşı ile)</div><div class="dg-list">';
        SOUL_UPS.forEach(u => {
          const l = meta.ups[u.k], max = l >= u.max, cost = u.cost(l);
          let pips = ''; for (let i = 0; i < u.max; i++) pips += '<i class="' + (i < l ? 'on' : '') + '"></i>';
          h += '<div class="dg-item"><div class="ic">' + u.icon + '</div><div class="tx"><b>' + u.name + '</b><small>' + u.desc + '</small><div class="pl-pips">' + pips + '</div></div><button class="btn ' + (!max && meta.souls >= cost ? 'primary' : '') + '" data-act="soul" data-arg="' + u.k + '"' + (max || meta.souls < cost ? ' disabled' : '') + '>' + (max ? 'MAKS' : '💠 ' + cost) + '</button></div>';
        });
        h += '</div><p class="dg-note">Ölüm kalıcıdır: ölünce her şey sıfırlanır, ama ulaştığın kat kadar Ruh Taşı kazanırsın.</p></div>';
        ui.innerHTML = h; ui.classList.remove('hidden');
      }
      function toggleInv() { if (uiKind === 'inv' && !ui.classList.contains('hidden')) { closeUI(); return; } stopAuto(); targeting = null; selectedItem = null; renderInv(); }
      function itemRow(it, act, extra) {
        const sel = selectedItem === String(it.uid);
        const st = it.kind === 'equip' ? statLine(it.stats) : esc(D.CONSUMABLES[it.base].kind === 'potion' && !G.known[it.base] ? 'Bilinmeyen iksir' : D.CONSUMABLES[it.base].desc);
        let h = '<div class="dg-item' + (sel ? ' sel' : '') + '" data-act="item" data-arg="' + it.uid + '"><div class="ic">' + iconHtml(itemSprite(it), 34) + '</div><div class="tx"><b style="color:' + itemColor(it) + '">' + esc(itemName(it)) + (it.qty > 1 ? ' ×' + it.qty : '') + '</b><small>' + st + '</small>' + (extra || '') + '</div></div>';
        if (sel) h += '<div class="dg-actions">' + act + '</div>';
        return h;
      }
      function renderInv() {
        busy = true; uiKind = 'inv';
        const h = G.hero, st = stats();
        let out = '<div class="dg-panel"><div class="dg-ph"><b>🎒 Çanta</b><span>' + h.inv.length + '/18 · ' + GOLD + ' ' + h.gold + '</span><button class="btn ghost" data-act="close">✕</button></div>';
        out += '<div class="dg-stats"><span>❤️ ' + h.hp + '/' + st.hpMax + '</span><span>🔵 ' + Math.floor(h.mp) + '/' + st.mpMax + '</span><span>⚔️ ' + st.atk + '</span><span>🛡️ ' + st.def + '</span><span>💥 ' + Math.round(st.crit * 100) + '%</span><span>💨 ' + Math.round(st.dodge * 100) + '%</span>' + (st.spell ? '<span>🔮 ' + st.spell + '</span>' : '') + (st.range > 1 ? '<span>🎯 ' + st.range + '</span>' : '') + '</div>';
        const perks = Object.keys(h.perks).map(id => { const p = D.PERKS.find(q => q.id === id); return p ? p.icon + ' ' + p.name + (h.perks[id] > 1 ? ' ×' + h.perks[id] : '') : ''; }).filter(Boolean);
        if (perks.length) out += '<div class="dg-perks">' + perks.join(' · ') + '</div>';
        out += '<div class="dg-eq">';
        [['weapon', 'Silah'], ['armor', 'Zırh'], ['head', 'Başlık'], ['ring', 'Yüzük'], ['amulet', 'Kolye']].forEach(([slot, nm]) => {
          const it = h.eq[slot];
          out += '<div class="dg-slot' + (it ? '' : ' free') + '" data-act="' + (it ? 'unequip' : 'none') + '" data-arg="' + slot + '" title="' + nm + '">' + (it ? iconHtml(it.sprite, 30) : '<small>' + nm + '</small>') + '</div>';
        });
        out += '</div>';
        for (const slot in h.eq) { const it = h.eq[slot]; if (it) out += '<div class="dg-eqline" style="color:' + itemColor(it) + '">' + esc(it.name) + ' <small>' + statLine(it.stats) + '</small></div>'; }
        out += '<div class="dg-list">';
        if (!h.inv.length) out += '<p class="dg-note">Çantan boş.</p>';
        h.inv.forEach(it => {
          let act;
          if (it.kind === 'equip') {
            const cur = h.eq[it.slot];
            let cmp = '';
            if (cur) { const keys = ['atk', 'def', 'hp', 'mp', 'crit', 'dodge', 'spell']; cmp = keys.map(k => { const d = (it.stats[k] || 0) - (cur.stats[k] || 0); if (!d) return ''; const pct = ['crit', 'dodge'].indexOf(k) >= 0; return '<i style="color:' + (d > 0 ? '#8ce99a' : '#ff8787') + '">' + k.toUpperCase() + ' ' + (d > 0 ? '+' : '') + (pct ? Math.round(d * 100) + '%' : +d.toFixed(1)) + '</i>'; }).filter(Boolean).join(' '); }
            act = (cmp ? '<div class="dg-cmp">' + cmp + '</div>' : '') + '<button class="btn primary" data-act="use" data-arg="' + it.uid + '">Kuşan</button><button class="btn ghost" data-act="drop" data-arg="' + it.uid + '">Yere At</button>';
          } else act = '<button class="btn primary" data-act="use" data-arg="' + it.uid + '">' + (it.kind === 'potion' ? 'İç' : it.kind === 'food' ? 'Ye' : 'Oku') + '</button><button class="btn ghost" data-act="drop" data-arg="' + it.uid + '">Yere At</button>';
          out += itemRow(it, act);
        });
        out += '</div><button class="btn ghost dg-logbtn" data-act="log">📜 Günlük</button></div>';
        ui.innerHTML = out; ui.classList.remove('hidden');
      }
      function renderLog() {
        let out = '<div class="dg-panel"><div class="dg-ph"><b>📜 Günlük</b><span>Tur ' + G.turn + '</span><button class="btn ghost" data-act="close">✕</button></div><div class="dg-log">';
        G.log.slice().reverse().forEach(l => { out += '<div style="color:' + l.col + '">' + esc(l.txt) + '</div>'; });
        out += '</div></div>';
        ui.innerHTML = out;
      }
      function showPerks() {
        busy = true; uiKind = 'perk'; stopAuto(); targeting = null;
        const h = G.hero;
        const pool = D.PERKS.filter(p => (!p.classes || p.classes.indexOf(h.cls) >= 0) && (h.perks[p.id] || 0) < p.max);
        const picks = [];
        for (let i = 0; i < 3 && pool.length; i++) picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
        let out = '<div class="dg-panel dg-center"><div class="ov-emoji">⭐</div><h2>Seviye ' + h.level + '!</h2><p>Bir yetenek seç</p><div class="dg-cards">';
        picks.forEach(p => { out += '<button class="dg-card" data-act="perk" data-arg="' + p.id + '"><div class="ic">' + p.icon + '</div><b>' + esc(p.name) + '</b><small>' + esc(p.desc) + '</small>' + ((h.perks[p.id] || 0) ? '<i>' + h.perks[p.id] + '/' + p.max + '</i>' : '') + '</button>'; });
        out += '</div></div>';
        ui.innerHTML = out; ui.classList.remove('hidden');
      }
      function shopPrice(it) { return Math.max(5, Math.round(it.value * 1.4)); }
      function openShop() { stopAuto(); shopTab = 'buy'; selectedItem = null; renderShop(); s.sfx('coin'); }
      function renderShop() {
        busy = true; uiKind = 'shop';
        const h = G.hero;
        let out = '<div class="dg-panel"><div class="dg-ph"><b>🧙 Gezgin Tüccar</b><span>' + GOLD + ' ' + h.gold + '</span><button class="btn ghost" data-act="close">✕</button></div>';
        out += '<div class="seg"><button data-act="shoptab" data-arg="buy" class="' + (shopTab === 'buy' ? 'on' : '') + '">Satın Al</button><button data-act="shoptab" data-arg="sell" class="' + (shopTab === 'sell' ? 'on' : '') + '">Sat</button></div><div class="dg-list">';
        if (shopTab === 'buy') {
          if (!G.shop.stock.length) out += '<p class="dg-note">Tezgâh boşaldı.</p>';
          G.shop.stock.forEach(it => { const p = shopPrice(it); out += itemRow(it, '<button class="btn ' + (h.gold >= p ? 'primary' : '') + '" data-act="buy" data-arg="' + it.uid + '"' + (h.gold < p ? ' disabled' : '') + '>Al · ' + GOLD + ' ' + p + '</button>'); });
        } else {
          if (!h.inv.length) out += '<p class="dg-note">Satacak bir şeyin yok.</p>';
          h.inv.forEach(it => { out += itemRow(it, '<button class="btn primary" data-act="sell" data-arg="' + it.uid + '">Sat · ' + GOLD + ' ' + Math.max(1, Math.floor(it.value / 2)) + '</button>'); });
        }
        out += '</div></div>';
        ui.innerHTML = out; ui.classList.remove('hidden');
      }

      /* ---------- giriş ---------- */
      function tileFromPt(p) { return { x: Math.floor(p.x / TS + cam.x), y: Math.floor((p.y - MAP_Y) / TS + cam.y) }; }
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || mode !== 'play' || busy) return;
        Platform.sound.unlock();
        const p = view.pt(e);
        if (showMap) { showMap = false; return; }
        if (p.y < MAP_Y) return;
        if (p.y > H - LOG_H) { renderLog(); busy = true; ui.classList.remove('hidden'); return; }
        const tl = tileFromPt(p);
        if (!inB(tl.x, tl.y)) return;
        if (walkPath || exploring) { stopAuto(); return; }
        const h = G.hero;
        if (targeting) {
          const tg = targeting; targeting = null;
          if (tl.x === h.x && tl.y === h.y) return; // iptal
          useSkill(tg.idx, tl);
          return;
        }
        const d = dist8(tl, h);
        if (d === 0) { if (tileAt(h.x, h.y) === T.STAIRS) descend(); else endTurn(); return; }
        const m = monAt(tl.x, tl.y);
        if (m && visible(m.x, m.y)) {
          if (d === 1) { tryMove(Math.sign(tl.x - h.x), Math.sign(tl.y - h.y)); return; }
          if (m.ai !== 'npc' && stats().ranged) { fireAt(m); return; }
          walkTo(tl.x, tl.y);
          return;
        }
        if (d === 1) { if (!tryMove(tl.x - h.x, tl.y - h.y)) s.sfx('tick'); return; }
        walkTo(tl.x, tl.y);
      });
      s.key(e => {
        if (mode !== 'play' || busy) { if (e.key === 'i' || e.key === 'I' || e.key === 'Escape') { if (uiKind === 'inv') closeUI(); } return; }
        const k = e.key;
        const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1], q: [-1, -1], e: [1, -1], z: [-1, 1], c: [1, 1], A: [-1, 0], D: [1, 0], W: [0, -1], S: [0, 1], Q: [-1, -1], E: [1, -1], Z: [-1, 1], C: [1, 1] }[k];
        if (mv) { stopAuto(); targeting = null; tryMove(mv[0], mv[1]); return; }
        if (k === ' ' || k === '.') { stopAuto(); endTurn(); }
        else if (k === 'i' || k === 'I') toggleInv();
        else if (k === 'x' || k === 'X') { if (exploring || walkPath) stopAuto(); else { exploring = true; exploreStep(); } }
        else if (k === 'm' || k === 'M') showMap = !showMap;
        else if (k === 'Enter' || k === '>') descend();
        else if (k === 'f' || k === 'F') { stopAuto(); search(); }
        else if (k >= '1' && k <= '3') useSkill(+k - 1);
      });

      /* ---------- çizim ---------- */
      function drawHUD() {
        const h = G.hero, st = stats(), th = theme();
        g.fillStyle = '#0f0d1c'; g.fillRect(0, 0, W, HUD_H);
        g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, HUD_H - 1, W, 1);
        const bar = (x, y, w, v, col, txt) => {
          g.fillStyle = 'rgba(0,0,0,.5)'; U.rr(g, x, y, w, 13, 6); g.fill();
          g.fillStyle = col; U.rr(g, x, y, Math.max(0, w * U.clamp(v, 0, 1)), 13, 6); g.fill();
          U.text(g, txt, x + w / 2, y + 7, 9.5, '#fff', 'center', 900);
        };
        bar(8, 7, 120, h.hp / st.hpMax, h.hp / st.hpMax < 0.3 ? '#ff4d6d' : '#2fb344', '❤ ' + h.hp + ' / ' + st.hpMax);
        bar(8, 24, 120, h.mp / Math.max(1, st.mpMax), '#3b82f6', '🔵 ' + Math.floor(h.mp) + ' / ' + st.mpMax);
        bar(8, 41, 120, h.xp / D.xpForLevel(h.level), '#f59f00', 'Sv ' + h.level + ' · ' + h.xp + ' / ' + D.xpForLevel(h.level) + ' TP');
        U.text(g, 'Kat ' + G.floor + ' · ' + th.name, W - 8, 14, 12, '#d0bfff', 'right', 900);
        const stTxt = h.gold + '   ⚔ ' + st.atk + '   🛡 ' + st.def;
        U.text(g, stTxt, W - 8, 32, 11, '#e9ecef', 'right', 800);
        DG.art.draw(g, 'altin', W - 8 - g.measureText(stTxt).width - 17, 24, 15);
        let sx0 = W - 8;
        Object.keys(h.status).forEach(id => { const stt = h.status[id]; U.text(g, STATUS[id].icon + stt.t, sx0, 49, 10, STATUS[id].bad ? '#ffa8a8' : '#b2f2bb', 'right', 800); sx0 -= 30; });
        if (!Object.keys(h.status).length) U.text(g, 'Tur ' + G.turn, W - 8, 49, 10, '#868e96', 'right', 700);
        void frame;
      }
      function drawLog() {
        const y0 = H - LOG_H;
        g.fillStyle = 'rgba(8,6,16,.92)'; g.fillRect(0, y0, W, LOG_H);
        const lines = G.log.slice(-3);
        lines.forEach((l, i) => {
          const age = G.turn - l.turn;
          g.globalAlpha = age > 6 ? 0.45 : 1;
          g.font = U.font(12, i === lines.length - 1 ? 800 : 600); g.fillStyle = l.col; g.textAlign = 'left'; g.textBaseline = 'middle';
          let txt = l.txt; while (g.measureText(txt).width > W - 16 && txt.length > 4) txt = txt.slice(0, -2);
          if (txt !== l.txt) txt += '…';
          g.fillText(txt, 8, y0 + 12 + i * 18);
        });
        g.globalAlpha = 1;
        if (targeting) { g.fillStyle = 'rgba(255,212,59,.9)'; U.rr(g, W / 2 - 110, y0 - 30, 220, 24, 12); g.fill(); U.text(g, targeting.S.icon + ' ' + targeting.S.name + ': hedef kareye dokun', W / 2, y0 - 18, 11.5, '#1a1600', 'center', 900); }
      }
      function drawMap() {
        const th = theme();
        const x0 = Math.floor(cam.x), y0 = Math.floor(cam.y);
        g.save();
        g.beginPath(); g.rect(0, MAP_Y, W, H - MAP_Y - LOG_H); g.clip();
        if (shake > 0) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        g.fillStyle = th.ambient; g.fillRect(0, MAP_Y, W, H - MAP_Y);
        const fr = Math.floor(t * 2.2) % 2;
        for (let y = y0; y <= y0 + ROWS; y++) for (let x = x0; x <= x0 + COLS; x++) {
          if (!inB(x, y)) continue;
          const i = key(x, y);
          if (!G.seen[i]) continue;
          const px = sx(x), py = sy(y);
          DG.art.tile(g, th.id, G.tiles[i], px, py, TS, (x * 7 + y * 13 + G.floor) % 97);
        }
        // dekor
        for (const d of G.decor) { if (!G.seen[key(d.x, d.y)] || d.x < x0 - 1 || d.x > x0 + COLS + 1 || d.y < y0 - 1 || d.y > y0 + ROWS + 1) continue; DG.art.draw(g, d.kind, sx(d.x), sy(d.y), TS, { frame: fr }); }
        for (const tr of G.traps) if (tr.known && G.seen[key(tr.x, tr.y)]) DG.art.draw(g, 'tuzak', sx(tr.x), sy(tr.y), TS);
        for (const c of G.chests) if (G.seen[key(c.x, c.y)]) DG.art.draw(g, c.open ? 'sandik_acik' : 'sandik', sx(c.x), sy(c.y), TS);
        for (const it of G.items) if (G.seen[key(it.x, it.y)]) DG.art.draw(g, it.item.kind === 'gold' ? 'altin' : itemSprite(it.item), sx(it.x), sy(it.y), TS, { frame: fr });
        if (G.shop) DG.art.draw(g, 'tuccar', sx(G.shop.x), sy(G.shop.y), TS, { frame: fr, alpha: visible(G.shop.x, G.shop.y) ? 1 : G.seen[key(G.shop.x, G.shop.y)] ? 0.5 : 0 });
        // sis (görülmüş ama şu an görünmeyen)
        g.fillStyle = th.fog;
        for (let y = y0; y <= y0 + ROWS; y++) for (let x = x0; x <= x0 + COLS; x++) {
          if (!inB(x, y)) continue;
          const i = key(x, y);
          if (G.seen[i] && !G.vis[i]) g.fillRect(sx(x), sy(y), TS, TS);
        }
        // canavarlar
        for (const m of G.mons) {
          if (m.hp <= 0 || !visible(m.x, m.y)) continue;
          const big = DG.art.big && DG.art.big(m.id);
          const size = big ? TS * 2 : TS;
          const px = sx(m.x) - (big ? TS / 2 : 0), py = sy(m.y) - (big ? TS : 0);
          const opt = { frame: fr, flip: m.face < 0 };
          if (m.flashT > 0) opt.tint = '#ffffff';
          else if (m.status.donma) opt.tint = '#9ad5ff';
          if (m.elite) opt.outline = '#ffd43b';
          if (m.boss) opt.outline = '#ff6b6b';
          if (m.ai === 'ambush' && !m.sprung) opt.alpha = 0.55;
          DG.art.draw(g, m.id, px, py, size, opt);
          if (m.hp < m.hpMax) {
            g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(sx(m.x) + 3, sy(m.y) - 4, TS - 6, 4);
            g.fillStyle = m.boss ? '#ff6b6b' : '#ff922b'; g.fillRect(sx(m.x) + 3, sy(m.y) - 4, (TS - 6) * m.hp / m.hpMax, 4);
          }
          const sts = Object.keys(m.status);
          if (sts.length) U.text(g, sts.map(k => STATUS[k].icon).join(''), sx(m.x) + TS / 2, sy(m.y) + TS + 4, 9, '#fff', 'center', 400);
          if (!m.awake && m.ai !== 'ambush') U.text(g, '💤', sx(m.x) + TS - 6, sy(m.y) + 4, 9, '#fff', 'center', 400);
        }
        // kahraman
        const h = G.hero;
        const hopt = { frame: fr, flip: h.face < 0 };
        if (flash > 0) hopt.tint = '#ff6b6b';
        if (h.status.gorunmez) hopt.alpha = 0.5;
        if (h.status.donma) hopt.tint = '#9ad5ff';
        DG.art.draw(g, h.cls, sx(h.x), sy(h.y), TS, hopt);
        if (h.status.kalkan) { g.strokeStyle = 'rgba(116,192,252,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(sx(h.x) + TS / 2, sy(h.y) + TS / 2, TS * 0.62, 0, Math.PI * 2); g.stroke(); }
        // hedefleme menzili
        if (targeting) {
          const R = targeting.S.range || 1;
          g.fillStyle = 'rgba(255,212,59,.18)';
          for (let y = h.y - R; y <= h.y + R; y++) for (let x = h.x - R; x <= h.x + R; x++) if (inB(x, y) && visible(x, y) && Math.hypot(x - h.x, y - h.y) <= R) g.fillRect(sx(x), sy(y), TS, TS);
        }
        // yürüme yolu
        if (walkPath) { g.fillStyle = 'rgba(255,255,255,.25)'; walkPath.forEach(p => { g.beginPath(); g.arc(sx(p.x) + TS / 2, sy(p.y) + TS / 2, 3, 0, Math.PI * 2); g.fill(); }); }
        // efektler
        for (const f of fx) {
          if (f.kind === 'proj') { const k = Math.min(1, f.t / 0.18); g.strokeStyle = f.col; g.lineWidth = 3; g.beginPath(); g.moveTo(sx(f.x0) + TS / 2, sy(f.y0) + TS / 2); g.lineTo(U.lerp(sx(f.x0), sx(f.x1), k) + TS / 2, U.lerp(sy(f.y0), sy(f.y1), k) + TS / 2); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(U.lerp(sx(f.x0), sx(f.x1), k) + TS / 2, U.lerp(sy(f.y0), sy(f.y1), k) + TS / 2, 4, 0, Math.PI * 2); g.fill(); }
          else if (f.kind === 'ring') { const k = f.t / 0.45; g.strokeStyle = f.col; g.globalAlpha = 1 - k; g.lineWidth = 4 - k * 3; g.beginPath(); g.arc(sx(f.x) + TS / 2, sy(f.y) + TS / 2, (f.small ? 0.5 : 1.6) * TS * k + 4, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
          else if (f.kind === 'burst') { for (let i = 0; i < f.n; i++) { const a = i / f.n * Math.PI * 2 + i, r = f.t * 90 * (0.5 + (i % 3) * 0.3); g.globalAlpha = Math.max(0, 1 - f.t / 0.6); g.fillStyle = f.col; g.fillRect(sx(f.x) + TS / 2 + Math.cos(a) * r - 2, sy(f.y) + TS / 2 + Math.sin(a) * r - 2 + f.t * f.t * 120, 4, 4); } g.globalAlpha = 1; }
          else if (f.kind === 'spark') { g.globalAlpha = Math.max(0, 1 - f.t / 0.3); g.fillStyle = f.col; g.fillRect(sx(f.x) + 4, sy(f.y) + 4, TS - 8, TS - 8); g.globalAlpha = 1; }
        }
        for (const f of floats) {
          g.globalAlpha = Math.max(0, 1 - f.t / 0.9);
          g.font = U.font(13, 900); g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(f.txt, sx(f.x) + TS / 2, sy(f.y) - 2 - f.t * 26);
          g.fillStyle = f.col; g.fillText(f.txt, sx(f.x) + TS / 2, sy(f.y) - 2 - f.t * 26);
        }
        g.globalAlpha = 1;
        // karanlık kenar (meşale hissi)
        const cx = sx(h.x) + TS / 2, cy = sy(h.y) + TS / 2;
        const rad = (stats().sight + 1.5) * TS;
        const vg = g.createRadialGradient(cx, cy, rad * 0.45, cx, cy, rad);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
        g.fillStyle = vg; g.fillRect(0, MAP_Y, W, H - MAP_Y - LOG_H);
        if (flash > 0) { g.fillStyle = 'rgba(255,40,40,' + flash * 0.5 + ')'; g.fillRect(0, MAP_Y, W, H - MAP_Y - LOG_H); }
        g.restore();
      }
      function drawMiniMap() {
        const th = theme();
        const avail = H - MAP_Y - LOG_H;
        const c = Math.floor(Math.min(W / G.w, avail / G.h));
        const ox = Math.floor((W - G.w * c) / 2), oy = MAP_Y + Math.floor((avail - G.h * c) / 2);
        g.fillStyle = 'rgba(10,8,20,.95)'; g.fillRect(0, MAP_Y, W, avail);
        for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
          const i = key(x, y);
          if (!G.seen[i]) continue;
          const tl = G.tiles[i];
          g.fillStyle = tl === T.WALL ? '#5c5470' : tl === T.WATER ? '#3a8fc7' : tl === T.LAVA ? '#e8590c' : tl === T.CHASM ? '#111' : (tl === T.DOOR || tl === T.DOOR_OPEN) ? '#c08a4a' : (tl === T.STAIRS) ? '#ffd43b' : tl === T.STAIRS_UP ? '#adb5bd' : G.vis[i] ? '#cbc3e3' : '#8a84a0';
          g.fillRect(ox + x * c, oy + y * c, c, c);
        }
        const dot = (x, y, col, r) => { g.fillStyle = col; g.beginPath(); g.arc(ox + x * c + c / 2, oy + y * c + c / 2, r || c, 0, Math.PI * 2); g.fill(); };
        G.items.forEach(it => { if (G.seen[key(it.x, it.y)]) dot(it.x, it.y, it.item.kind === 'gold' ? '#ffd43b' : '#74c0fc', c * 0.7); });
        G.chests.forEach(ch => { if (G.seen[key(ch.x, ch.y)] && !ch.open) dot(ch.x, ch.y, '#f59f00', c); });
        G.mons.forEach(m => { if (m.hp > 0 && visible(m.x, m.y)) dot(m.x, m.y, m.boss ? '#ff6b6b' : m.ai === 'npc' ? '#8ce99a' : '#ff8787', c); });
        if (G.shop && G.seen[key(G.shop.x, G.shop.y)]) dot(G.shop.x, G.shop.y, '#8ce99a', c);
        dot(G.hero.x, G.hero.y, '#fff', Math.max(3, c * 0.9));
        U.text(g, 'Kat ' + G.floor + ' · ' + th.name + '  —  dokununca kapanır', W / 2, MAP_Y + 14, 12, '#fff', 'center', 800);
      }

      /* ---------- ana döngü ---------- */
      s.loop(dt => {
        t += dt; frame++;
        for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].t > (fx[i].kind === 'burst' ? 0.6 : fx[i].kind === 'ring' ? 0.45 : fx[i].kind === 'proj' ? 0.2 : 0.3)) fx.splice(i, 1); }
        for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 0.9) floats.splice(i, 1); }
        if (shake > 0) shake = Math.max(0, shake - dt * 30);
        if (flash > 0) flash = Math.max(0, flash - dt * 1.5);
        if (!G || mode !== 'play') return;
        G.mons.forEach(m => { if (m.flashT > 0) m.flashT -= dt; });
        if (!busy && (walkPath || exploring)) {
          walkT += dt;
          if (walkT >= 0.085) { walkT = 0; if (walkPath) walkStep(); else if (exploring) exploreStep(); if (!walkPath && exploring && mode === 'play') exploreStep(); }
        }
        // kamera takibi
        const tx = G.hero.x - COLS / 2 + 0.5, ty = G.hero.y - ROWS / 2 + 0.5;
        cam.x += (tx - cam.x) * Math.min(1, dt * 7); cam.y += (ty - cam.y) * Math.min(1, dt * 7);
        clampCam();
        if (frame % 6 === 0) refreshBar();
      }, () => {
        if (!G) { g.fillStyle = '#0f0d1c'; g.fillRect(0, 0, W, H); return; }
        if (showMap) { drawHUD(); drawMiniMap(); drawLog(); return; }
        drawMap();
        drawHUD();
        drawLog();
      });

      showCamp();
      refreshBar();
      Platform._dg = { get: () => G, stats, hero: () => G && G.hero, tryMove, endTurn, useSkill, useItem, equip, makeEquip, newRun: () => { closeUI(); newRun(); mode = 'play'; }, mode: () => mode, setMode: m => { mode = m; }, descend, monAt, spawnMon, killMon, closeUI, renderInv, openShop, showPerks, walkTo, explore: () => { exploring = true; exploreStep(); }, cam: () => ({ x: cam.x, y: cam.y, mapY: MAP_Y }), D };
      return { resume() { if (G && mode === 'play') refreshBar(); } };
    }
  });
})();
