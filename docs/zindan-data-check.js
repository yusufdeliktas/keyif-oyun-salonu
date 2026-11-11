/* Zindan Kaşifi - data.js doğrulama ve denge tablosu
   Çalıştır: node docs/zindan-data-check.js (depo kökünden) */
'use strict';
const path = require('path');
global.window = global;
require(path.join(__dirname, '..', 'web', 'games', 'dungeon', 'data.js'));
const D = global.DG && global.DG.data;

/* ---- Bölüm 1 sabit ID listeleri (spec'ten kopya) ---- */
const CLASS_IDS = ['savasci', 'okcu', 'buyucu'];
const MONSTER_IDS = [
  'sican', 'yarasa', 'balcik', 'goblin', 'iskelet',
  'orumcek', 'goblin_okcu', 'ork', 'saman', 'kurt',
  'zombi', 'hayalet', 'iskelet_buyucu', 'gulyabani', 'tarikatci',
  'ates_cini', 'semender', 'golem', 'alev_buyucu', 'cehennem_kopegi',
  'buz_trolu', 'ruh', 'kara_sovalye', 'minotor', 'ejder_yavrusu'
];
const BOSS_IDS = ['goblin_kral', 'lich', 'ejderha'];
const NPC_IDS = ['tuccar'];
const ITEM_SPRITES = [
  'kilic', 'balta', 'hancer', 'topuz', 'mizrak', 'yay', 'arbalet', 'asa', 'degnek',
  'cubbe', 'deri_zirh', 'zincir_zirh', 'plaka_zirh', 'bere', 'migfer', 'yuzuk', 'kolye',
  'iksir_kirmizi', 'iksir_mavi', 'iksir_yesil', 'iksir_mor', 'iksir_sari', 'iksir_turuncu',
  'parsomen', 'altin', 'anahtar', 'yemek'
];
const THEME_IDS = ['mahzen', 'magara', 'mezar', 'lav', 'buz'];
const DECOR_IDS = ['kapi', 'kapi_acik', 'merdiven', 'merdiven_yukari', 'su', 'lav_havuz', 'tuzak', 'tuzak_gizli',
  'sandik', 'sandik_acik', 'mesale', 'kemik', 'fici', 'sandik_kirik', 'ot', 'kristal', 'sunak'];
const SLOTS = ['weapon', 'armor', 'head', 'ring', 'amulet'];
const KINDS = ['kilic', 'balta', 'hancer', 'topuz', 'mizrak', 'yay', 'arbalet', 'asa', 'degnek', 'hafif', 'agir', 'cubbe', null];
const AIS = ['melee', 'ranged', 'caster', 'coward', 'erratic', 'ambush', 'npc'];
const ELEMENTS = [null, 'ates', 'buz', 'zehir', 'karanlik'];
const STATUSES = ['zehir', 'yanik', 'donma', 'sersem', 'zayif'];
const FLAGS = ['undead', 'flying', 'regen', 'split', 'summoner', 'explode', 'phase', 'boss', 'pack'];
const AFFIX_STATS = ['atk', 'def', 'hp', 'mp', 'crit', 'dodge', 'lifesteal', 'fireDmg', 'iceDmg', 'poisonDmg', 'spell', 'regen', 'thorns', 'goldFind', 'xpBonus'];
const PERK_MODS = ['atk', 'def', 'hp', 'mp', 'crit', 'dodge', 'lifesteal', 'regen', 'spell', 'thorns', 'goldFind', 'xpBonus', 'sight', 'skillCost'];
const EFFECTS = ['heal', 'mana', 'cure', 'strength', 'regen', 'invis', 'fireres', 'xp', 'teleport', 'map', 'enchant', 'fire', 'freeze', 'identify', 'return', 'food'];
const SKILLS = {
  savasci: ['girdap', 'kalkan_duvari', 'hucum'],
  okcu: ['coklu_ok', 'zehirli_ok', 'geri_sicra'],
  buyucu: ['ates_topu', 'buz_halkasi', 'isinlanma']
};

let fails = 0;
const fail = msg => { fails++; console.log('  HATA: ' + msg); };
const ok = msg => console.log('  ok   ' + msg);
const inList = (v, list) => list.indexOf(v) >= 0;
const sameSet = (a, b) => a.length === b.length && a.every(x => b.indexOf(x) >= 0);

if (!D) { console.log('DG.data yüklenemedi'); process.exit(1); }

/* ---- NaN / undefined taraması (tüm ağaç) ---- */
function scanNumbers(obj, where) {
  if (obj === null) return;
  if (typeof obj === 'number') { if (!Number.isFinite(obj)) fail(where + ' sayı değil: ' + obj); return; }
  if (typeof obj === 'undefined') { fail(where + ' undefined'); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => scanNumbers(v, where + '[' + i + ']')); return; }
  if (typeof obj === 'object') for (const k in obj) scanNumbers(obj[k], where + '.' + k);
}
console.log('[1] NaN/undefined taraması');
['CLASSES', 'MONSTERS', 'ITEM_BASES', 'CONSUMABLES', 'AFFIXES', 'RARITIES', 'THEMES', 'PERKS'].forEach(k => scanNumbers(D[k], k));
if (!fails) ok('tüm sayılar sonlu, undefined yok');

/* ---- sınıflar ---- */
console.log('[2] Sınıflar');
if (!sameSet(Object.keys(D.CLASSES), CLASS_IDS)) fail('CLASSES anahtarları: ' + Object.keys(D.CLASSES));
for (const id of CLASS_IDS) {
  const c = D.CLASSES[id];
  if (!c) continue;
  if (c.id !== id) fail(id + ' id alanı uyumsuz');
  ['hp', 'mp', 'atk', 'def', 'crit', 'dodge', 'hpPerLevel', 'mpPerLevel', 'atkPerLevel', 'defPerLevel', 'regenMp'].forEach(k => {
    if (typeof c[k] !== 'number') fail(id + '.' + k + ' eksik');
  });
  if (!/^#[0-9a-f]{6}$/i.test(c.color)) fail(id + ' renk geçersiz');
  c.startItems.forEach(it => { if (!D.ITEM_BASES[it] && !D.CONSUMABLES[it]) fail(id + ' başlangıç eşyası yok: ' + it); });
  c.startItems.forEach(it => {
    const b = D.ITEM_BASES[it];
    if (b && b.classes && b.classes.indexOf(id) < 0) fail(id + ' kendi başlangıç eşyasını kullanamıyor: ' + it);
  });
  if (!sameSet(c.skills, SKILLS[id])) fail(id + ' beceri listesi: ' + c.skills);
  if (!c.name || !c.desc) fail(id + ' ad/açıklama eksik');
}
ok(Object.keys(D.CLASSES).length + ' sınıf, başlangıç eşyaları ve beceriler yerinde');

/* ---- canavarlar ---- */
console.log('[3] Canavarlar');
const allMon = MONSTER_IDS.concat(BOSS_IDS, NPC_IDS);
if (!sameSet(Object.keys(D.MONSTERS), allMon)) fail('MONSTERS anahtarları spec ile aynı değil: ' + Object.keys(D.MONSTERS).filter(k => !inList(k, allMon)) + ' / eksik: ' + allMon.filter(k => !D.MONSTERS[k]));
for (const id in D.MONSTERS) {
  const m = D.MONSTERS[id];
  const w = 'MONSTERS.' + id;
  if (m.id !== id) fail(w + ' id uyumsuz');
  if (!m.name || !m.desc) fail(w + ' ad/açıklama eksik');
  if (!inList(m.ai, AIS)) fail(w + ' ai geçersiz: ' + m.ai);
  if (!inList(m.element, ELEMENTS)) fail(w + ' element geçersiz');
  if (!Array.isArray(m.gold) || m.gold.length !== 2 || m.gold[0] > m.gold[1]) fail(w + ' gold aralığı');
  if (m.minFloor < 1 || m.maxFloor > D.FLOORS || m.minFloor > m.maxFloor) fail(w + ' kat aralığı');
  if (!inList(m.speed, [0.5, 1, 2])) fail(w + ' hız: ' + m.speed);
  if (m.onHit) {
    if (!inList(m.onHit.status, STATUSES)) fail(w + ' onHit durumu');
    if (!(m.onHit.chance > 0 && m.onHit.chance <= 1) || !(m.onHit.turns >= 1)) fail(w + ' onHit şans/tur');
  }
  m.flags.forEach(f => { if (!inList(f, FLAGS)) fail(w + ' bayrak: ' + f); });
  if (m.flags.indexOf('summoner') >= 0 && !D.MONSTERS[m.summon]) fail(w + ' summon hedefi yok');
  if ((m.ai === 'ranged' || m.ai === 'caster') && !(m.range >= 3)) fail(w + ' menzilli ama range < 3');
  if (inList(id, BOSS_IDS)) {
    if (!m.boss || m.flags.indexOf('boss') < 0) fail(w + ' boss işaretli değil');
    if (m.minFloor !== m.maxFloor) fail(w + ' boss katı tek olmalı');
    if (!Array.isArray(m.phases) || !m.phases.length) fail(w + ' phases yok');
    else m.phases.forEach((p, i) => {
      if (!(p.hpBelow > 0 && p.hpBelow < 1)) fail(w + ' phase ' + i + ' hpBelow');
      if (p.summon !== null && !D.MONSTERS[p.summon]) fail(w + ' phase ' + i + ' summon yok');
      if (!p.msg) fail(w + ' phase ' + i + ' msg yok');
    });
    if (!m.special) fail(w + ' special yok');
  } else if (m.boss) fail(w + ' boss olmamalı');
  if (inList(id, NPC_IDS)) { if (m.ai !== 'npc' || m.hostile !== false) fail(w + ' NPC düşman görünüyor'); }
}
if (![5, 10, 15].every(f => BOSS_IDS.some(b => D.MONSTERS[b] && D.MONSTERS[b].minFloor === f))) fail('5/10/15 katlarının her birinde boss yok');
ok(MONSTER_IDS.length + ' canavar + ' + BOSS_IDS.length + ' boss + ' + NPC_IDS.length + ' NPC');

/* ---- kat havuzları ---- */
console.log('[4] Kat havuzları');
for (let f = 1; f <= D.FLOORS; f++) {
  const pool = D.monsterPool(f);
  if (pool.length < 4) fail('kat ' + f + ' havuzunda ' + pool.length + ' canavar');
  pool.forEach(p => {
    if (!D.MONSTERS[p.id]) fail('kat ' + f + ' havuzunda bilinmeyen id ' + p.id);
    if (!(p.weight > 0)) fail('kat ' + f + ' ' + p.id + ' ağırlık');
    if (D.MONSTERS[p.id].boss || D.MONSTERS[p.id].ai === 'npc') fail('kat ' + f + ' havuzunda boss/NPC: ' + p.id);
  });
  if (!inList(D.floorTheme(f), THEME_IDS)) fail('kat ' + f + ' tema geçersiz');
  const lt = D.lootTable(f);
  if (!(lt.gold[0] <= lt.gold[1]) || ['potion', 'scroll', 'equip', 'food'].some(k => !(lt[k] > 0))) fail('kat ' + f + ' lootTable');
}
ok('15 katın hepsinde >= 4 canavar, tema ve ganimet tablosu geçerli');
// scaleMonster: flags/phases korunmalı, kopya dönmeli
['ejderha', 'saman', 'sican'].forEach(id => {
  const o = D.MONSTERS[id], c = D.scaleMonster(o, 15);
  if (c === o || !Array.isArray(c.flags) || c.flags.join() !== o.flags.join() || c.flags === o.flags) fail('scaleMonster flags korumuyor: ' + id);
  if (o.phases && (!Array.isArray(c.phases) || c.phases.length !== o.phases.length)) fail('scaleMonster phases korumuyor: ' + id);
  if (c.summon !== o.summon || c.special !== o.special) fail('scaleMonster ek alanları korumuyor: ' + id);
});
for (const id in D.MONSTERS) if (!Array.isArray(D.MONSTERS[id].flags)) fail(id + ' flags dizi değil');
for (const id in D.CLASSES) if (D.CLASSES[id].skills.length !== 3) fail(id + ' tam 3 beceri olmalı');
if (!Object.values(D.CONSUMABLES).some(c => c.kind === 'potion' && c.effect === 'heal')) fail('heal iksiri yok');
D.PERKS.forEach(p => { if (!p.mods || !Object.keys(p.mods).length) fail('perk mods boş: ' + p.id); });
const gobHp = D.MONSTERS.goblin.hp;
const sc = D.scaleMonster(D.MONSTERS.goblin, 9);
if (!(sc.hp > D.MONSTERS.goblin.hp && sc.atk > D.MONSTERS.goblin.atk) || sc === D.MONSTERS.goblin) fail('scaleMonster derin katta güçlendirmiyor');
if (D.scaleMonster(D.MONSTERS.goblin, 2).hp !== D.MONSTERS.goblin.hp) fail('scaleMonster kendi aralığında değiştirmemeli');
if (D.MONSTERS.goblin.hp !== gobHp) fail('scaleMonster orijinali bozdu');

/* ---- eşyalar ---- */
console.log('[5] Eşya tabanları');
const nItems = Object.keys(D.ITEM_BASES).length;
if (nItems < 30) fail('ITEM_BASES < 30: ' + nItems);
const perSlot = {};
for (const id in D.ITEM_BASES) {
  const it = D.ITEM_BASES[id];
  const w = 'ITEM_BASES.' + id;
  if (it.id !== id) fail(w + ' id uyumsuz');
  if (!inList(it.slot, SLOTS)) fail(w + ' slot');
  if (!inList(it.sprite, ITEM_SPRITES)) fail(w + ' sprite: ' + it.sprite);
  if (!inList(it.kind, KINDS)) fail(w + ' kind');
  if (it.minFloor < 1 || it.minFloor > D.FLOORS) fail(w + ' minFloor');
  if (!(it.value > 0)) fail(w + ' value');
  if (it.ranged && !(it.range >= 4)) fail(w + ' menzilli ama range kısa');
  if (it.classes) { if (!it.classes.every(c => inList(c, CLASS_IDS))) fail(w + ' classes'); }
  else if (it.classes !== null) fail(w + ' classes null olmalı');
  if (!it.name) fail(w + ' ad yok');
  perSlot[it.slot] = (perSlot[it.slot] || 0) + 1;
}
SLOTS.forEach(s => { if ((perSlot[s] || 0) < 3) fail('slot ' + s + ' için 3\'ten az eşya'); });
ok(nItems + ' eşya tabanı (' + SLOTS.map(s => s + ':' + perSlot[s]).join(' ') + ')');

/* ---- tüketilebilirler ---- */
console.log('[6] Tüketilebilirler');
const cons = Object.values(D.CONSUMABLES);
const kinds = { potion: 0, scroll: 0, food: 0 };
for (const c of cons) {
  const w = 'CONSUMABLES.' + c.id;
  if (!D.CONSUMABLES[c.id] || D.CONSUMABLES[c.id] !== c) fail(w + ' id uyumsuz');
  if (!(c.kind in kinds)) fail(w + ' kind'); else kinds[c.kind]++;
  if (!inList(c.sprite, ITEM_SPRITES)) fail(w + ' sprite');
  if (c.kind === 'potion' && c.sprite.indexOf('iksir_') !== 0) fail(w + ' iksir sprite\'ı iksir değil');
  if (!inList(c.effect, EFFECTS)) fail(w + ' effect');
  if (!(c.weight > 0) || !(c.value > 0)) fail(w + ' weight/value');
  if (!c.desc || !c.name) fail(w + ' ad/açıklama');
}
if (cons.length < 14) fail('CONSUMABLES < 14');
if (kinds.potion < 6 || kinds.scroll < 6 || kinds.food < 2) fail('iksir/parşömen/yemek sayıları yetersiz: ' + JSON.stringify(kinds));
ok(cons.length + ' tüketilebilir (iksir:' + kinds.potion + ' parşömen:' + kinds.scroll + ' yemek:' + kinds.food + ')');

/* ---- ekler ---- */
console.log('[7] Ekler');
if (D.AFFIXES.length < 24) fail('AFFIXES < 24');
const affIds = new Set();
for (const a of D.AFFIXES) {
  const w = 'AFFIX ' + a.id;
  if (affIds.has(a.id)) fail(w + ' tekrar'); affIds.add(a.id);
  if (!inList(a.pos, ['prefix', 'suffix'])) fail(w + ' pos');
  if (!inList(a.stat, AFFIX_STATS)) fail(w + ' stat');
  if (!(a.min <= a.max) || !(a.min > 0)) fail(w + ' min/max');
  if (!Array.isArray(a.slots) || !a.slots.length || !a.slots.every(s => inList(s, SLOTS))) fail(w + ' slots');
  if (!(a.weight > 0) || !(a.minFloor >= 1)) fail(w + ' weight/minFloor');
  if (inList(a.stat, ['crit', 'dodge', 'lifesteal', 'goldFind', 'xpBonus']) && a.max > 1) fail(w + ' yüzde değeri 0..1 olmalı');
}
SLOTS.forEach(s => {
  const n = D.AFFIXES.filter(a => a.slots.indexOf(s) >= 0 && a.minFloor <= 1).length;
  if (n < 2) fail('slot ' + s + ' için kat 1\'de ' + n + ' ek var');
});
ok(D.AFFIXES.length + ' ek (' + D.AFFIXES.filter(a => a.pos === 'prefix').length + ' önek, ' + D.AFFIXES.filter(a => a.pos === 'suffix').length + ' sonek)');

/* ---- nadirlik ---- */
console.log('[8] Nadirlik');
const rsum = D.RARITIES.reduce((s, r) => s + r.weight, 0);
if (rsum !== 100) fail('nadirlik ağırlıkları toplamı ' + rsum);
if (!sameSet(D.RARITIES.map(r => r.id), ['siradan', 'buyulu', 'nadir', 'efsanevi'])) fail('nadirlik idleri');
D.RARITIES.forEach((r, i) => { if (r.affixes !== i) fail('nadirlik ' + r.id + ' ek sayısı ' + r.affixes); });
ok('4 nadirlik, ağırlık toplamı 100');

/* ---- temalar ---- */
console.log('[9] Temalar');
if (!sameSet(Object.keys(D.THEMES), THEME_IDS)) fail('THEMES anahtarları');
const covered = new Array(D.FLOORS + 1).fill(0);
for (const id in D.THEMES) {
  const t = D.THEMES[id];
  if (t.id !== id) fail('tema ' + id + ' id');
  for (let f = t.floors[0]; f <= t.floors[1]; f++) covered[f]++;
  if (!inList(t.water, ['su', 'lav_havuz', null])) fail('tema ' + id + ' water');
  t.decor.forEach(d => { if (!inList(d, DECOR_IDS)) fail('tema ' + id + ' dekor ' + d); });
  if (!t.ambient || !t.light || !t.fog || !t.name) fail('tema ' + id + ' renk/ad eksik');
}
for (let f = 1; f <= D.FLOORS; f++) if (covered[f] !== 1) fail('kat ' + f + ' ' + covered[f] + ' temaya ait');
ok('5 tema, her kat tam bir temaya ait');

/* ---- yetenekler ---- */
console.log('[10] Yetenekler');
if (D.PERKS.length < 20) fail('PERKS < 20');
const perkIds = new Set();
for (const p of D.PERKS) {
  if (perkIds.has(p.id)) fail('perk tekrar ' + p.id); perkIds.add(p.id);
  if (!p.name || !p.desc || !p.icon) fail('perk ' + p.id + ' metin eksik');
  if (p.classes !== null && !p.classes.every(c => inList(c, CLASS_IDS))) fail('perk ' + p.id + ' classes');
  if (!(p.max >= 1)) fail('perk ' + p.id + ' max');
  for (const k in p.mods) if (!inList(k, PERK_MODS)) fail('perk ' + p.id + ' mod ' + k);
}
CLASS_IDS.forEach(c => {
  const n = D.PERKS.filter(p => p.classes && p.classes.indexOf(c) >= 0).length;
  if (n < 3) fail(c + ' için ' + n + ' özel yetenek');
});
ok(D.PERKS.length + ' yetenek (' + D.PERKS.filter(p => !p.classes).length + ' genel)');

/* ---- XP eğrisi ---- */
console.log('[11] XP eğrisi');
if (D.xpForLevel(1) < 15 || D.xpForLevel(1) > 25) fail('xpForLevel(1) ~20 olmalı: ' + D.xpForLevel(1));
for (let l = 1; l < 30; l++) if (!(D.xpForLevel(l + 1) > D.xpForLevel(l))) fail('xpForLevel artmıyor: ' + l);

/* =================== DENGE SİMÜLASYONU =================== */
console.log('\n[12] Denge tablosu (Savaşçı; hasar = atk - def*' + D.DEF_MULT + ', krit x' + D.CRIT_MULT + ', kaçınma dahil; kat başına 6+kat*1.3 canavar)');
const C = D.CLASSES.savasci;
// Gerçekçi kahraman: ekipman ~2 kat geriden gelir (kat 1-2'de başlangıç eşyası).
const itemsOf = (slot, f) => Object.values(D.ITEM_BASES).filter(it => it.slot === slot && it.minFloor <= Math.max(1, f - 2) && (!it.classes || it.classes.indexOf('savasci') >= 0));
const best = (slot, f, key) => itemsOf(slot, f).sort((a, b) => key(b) - key(a))[0];
// Beklenen XP: kat başına 6 + kat*1.3 canavarın %80'i öldürülür, boss XP'si de eklenir.
function floorXp(f) {
  const pool = D.monsterPool(f);
  const tw = pool.reduce((s, p) => s + p.weight, 0);
  const avg = pool.reduce((s, p) => s + D.scaleMonster(D.MONSTERS[p.id], f).xp * p.weight, 0) / tw;
  const n = 6 + f * 1.3;
  let xp = avg * n * 0.8;
  const boss = BOSS_IDS.map(b => D.MONSTERS[b]).find(b => b.minFloor === f);
  if (boss) xp += boss.xp;
  return xp;
}
let level = 1, xp = 0, totalXp = 0;
const rows = [];
let worst = [];
for (let f = 1; f <= D.FLOORS; f++) {
  // ekipman: kata uygun en iyi tabanlar (büyülü ekler ve yetenekler ayrıca eklenir)
  const wpn = best('weapon', f, i => i.atk), arm = best('armor', f, i => i.def), hd = best('head', f, i => i.def);
  const rg = best('ring', f, i => i.atk * 2 + i.def * 2 + i.hp / 5), am = best('amulet', f, i => i.atk * 2 + i.def * 2 + i.hp / 5);
  const eq = [wpn, arm, hd, rg, am].filter(Boolean);
  const sum = k => eq.reduce((s, i) => s + (i[k] || 0), 0);
  // yetenek kartları: kartlar kuvvet / canlılık / kaya / diğerleri arasında dağılır
  const pkA = Math.min(3, Math.floor((level - 1) / 3)), pkH = Math.min(3, Math.floor((level - 1) / 4)), pkD = Math.min(2, Math.floor((level - 1) / 5));
  // büyülü ekler: kat ilerledikçe ortalama küçük bonus
  const affAtk = Math.floor(f / 4), affDef = Math.floor(f / 5);
  const hero = {
    hp: C.hp + C.hpPerLevel * (level - 1) + sum('hp') + pkH * 12,
    atk: C.atk + C.atkPerLevel * (level - 1) + sum('atk') + pkA * 2 + affAtk,
    def: C.def + C.defPerLevel * (level - 1) + sum('def') + pkD * 2 + affDef,
    crit: C.crit + sum('crit'), dodge: C.dodge + sum('dodge')
  };
  const pool = D.monsterPool(f);
  const tw = pool.reduce((s, p) => s + p.weight, 0);
  let htk = 0, htd = 0, avgDmg = 0, minHtd = 99, maxHtk = 0, minName = '', maxName = '';
  for (const p of pool) {
    const m = D.scaleMonster(D.MONSTERS[p.id], f);
    const hDmg = D.damage(hero.atk * (1 + hero.crit * (D.CRIT_MULT - 1)), m.def);
    const mDmg = D.damage(m.atk, hero.def) * (1 - hero.dodge);
    const k = Math.ceil(m.hp / hDmg), d = hero.hp / mDmg;
    htk += k * p.weight / tw; avgDmg += mDmg * p.weight / tw;
    if (d < minHtd) { minHtd = d; minName = m.name; }
    if (k > maxHtk) { maxHtk = k; maxName = m.name; }
  }
  htd = hero.hp / avgDmg; // ortalama canavar vuruşuyla kaç vuruşta ölür
  const boss = BOSS_IDS.map(b => D.MONSTERS[b]).find(b => b.minFloor === f);
  let bossTxt = '';
  if (boss) {
    const bk = Math.ceil(boss.hp / D.damage(hero.atk * (1 + hero.crit * (D.CRIT_MULT - 1)), boss.def));
    const bd = hero.hp / (D.damage(boss.atk, hero.def) * (1 - hero.dodge));
    bossTxt = boss.name + ' öldür ' + bk + ' / ölüm ' + bd.toFixed(1);
    if (bk > 32 || bd < 6) fail('boss ' + boss.id + ' dengesiz (öldür ' + bk + ', ölüm ' + bd.toFixed(1) + ')');
  }
  rows.push({ kat: f, sev: level, can: Math.round(hero.hp), sal: Math.round(hero.atk), sav: Math.round(hero.def), silah: wpn.name, zirh: arm.name,
    oldur: htk.toFixed(1), olum: htd.toFixed(1), enZor: maxName + ' ' + maxHtk, enTehlikeli: minName + ' ' + minHtd.toFixed(1), boss: bossTxt });
  // kuralları doğrula: erken 2-4 / geç 3-6 vuruş, kahramanı öldürmek 8-15 (geç katlarda 6+)
  const loK = f <= 6 ? 2 : 3, hiK = f <= 6 ? 4.5 : 6.5;
  if (htk < loK || htk > hiK) worst.push('kat ' + f + ' ortalama öldürme vuruşu ' + htk.toFixed(1));
  if (htd < (f <= 6 ? 8 : 6.5) || htd > 18) worst.push('kat ' + f + ' kahramanın ölme vuruşu ' + htd.toFixed(1));
  if (f === 1) {
    const sk = Math.ceil(D.MONSTERS.sican.hp / D.damage(hero.atk, 0));
    if (sk < 2 || sk > 3) fail('kat 1 sıçan ' + sk + ' vuruşta ölüyor (2-3 olmalı)');
    pool.forEach(p => { const dm = D.damage(D.MONSTERS[p.id].atk, hero.def); if (dm < 1 || dm > 4) fail('kat 1 ' + p.id + ' vuruş başına ' + dm + ' hasar (1-4 olmalı)'); });
  }
  // sonraki kat için seviye
  xp += floorXp(f); totalXp += floorXp(f);
  while (xp >= D.xpForLevel(level)) { xp -= D.xpForLevel(level); level++; }
}
console.table(rows);
console.log('  Kat 15 sonunda tahmini seviye: ' + level + ' (toplam XP ~' + Math.round(totalXp) + ')');
if (level < 15 || level > 19) fail('seviye eğrisi hedef dışı (15-18 beklenir): ' + level);
const dragon = D.MONSTERS.ejderha;
if (dragon.hp < 600 || dragon.hp > 900) fail('ejderha canı 600-900 olmalı');
worst.forEach(w => console.log('  UYARI: ' + w));
if (worst.length > 2) fail('denge eğrisi çok sapıyor (' + worst.length + ' uyarı)');

console.log('\nSonuç: ' + (fails ? fails + ' HATA' : 'tüm kontroller geçti'));
process.exit(fails ? 1 : 0);
