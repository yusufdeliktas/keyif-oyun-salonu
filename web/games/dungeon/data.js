/* Zindan Kaşifi - veri (sınıflar, canavarlar, eşyalar, ekler, temalar, denge) */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};

  /* ---- yardımcılar (tablo satırlarını kısa yazmak için) ---- */
  const cls = (id, name, desc, color, s, startItems, skills) => ({
    id, name, desc, color,
    hp: s[0], mp: s[1], atk: s[2], def: s[3], crit: s[4], dodge: s[5],
    hpPerLevel: s[6], mpPerLevel: s[7], atkPerLevel: s[8], defPerLevel: s[9], regenMp: s[10],
    startItems, skills
  });
  // mon(id, ad, açıklama, [hp, atk, def, xp, goldMin, goldMax], [minKat, maxKat], ek alanlar)
  const mon = (id, name, desc, s, f, o) => Object.assign({
    id, name, desc,
    hp: s[0], atk: s[1], def: s[2], xp: s[3], gold: [s[4], s[5]],
    minFloor: f[0], maxFloor: f[1],
    speed: 1, ai: 'melee', range: 1, element: null, onHit: null, flags: [], sight: 7, boss: false
  }, o || {});
  // item(id, ad, slot, sprite, kind, {atk,def,...}, minKat, değer, sınıflar)
  const item = (id, name, slot, sprite, kind, st, minFloor, value, classes) => Object.assign({
    id, name, slot, sprite, kind,
    atk: 0, def: 0, hp: 0, mp: 0, crit: 0, dodge: 0,
    ranged: false, range: 1, spell: 0, twoHanded: false,
    minFloor, value, classes: classes || null
  }, st);
  const con = (id, name, kind, sprite, desc, effect, power, turns, minFloor, value, weight) =>
    ({ id, name, kind, sprite, desc, effect, power, turns, minFloor, value, weight });
  const aff = (id, name, pos, stat, min, max, slots, minFloor, weight) =>
    ({ id, name, pos, stat, min, max, slots, minFloor, weight });
  const perk = (id, name, desc, icon, classes, max, mods) => ({ id, name, desc, icon, classes, max, mods });

  const W = ['weapon'], A = ['armor'], H = ['head'], R = ['ring'], K = ['amulet'];
  const ARM = ['armor', 'head'], ACC = ['ring', 'amulet'], ALL = ['weapon', 'armor', 'head', 'ring', 'amulet'];
  const ODG = ['armor', 'head', 'ring', 'amulet'];

  /* ======================= SINIFLAR ======================= */
  const CLASSES = {
    savasci: cls('savasci', 'Savaşçı', 'Kalın zırh, ağır silah. Düşmanın gözünün içine bakarak dövüşür.', '#f08c00',
      //  hp  mp atk def crit  dodge hpL mpL atkL defL regenMp
      [40, 10, 4, 1, 0.05, 0.03, 6, 1, 1, 0.5, 0.3],
      ['kisa_kilic', 'deri_yelek', 'iksir_can', 'iksir_can', 'ekmek'],
      ['girdap', 'kalkan_duvari', 'hucum']),
    okcu: cls('okcu', 'Okçu', 'Uzaktan vurur, yakına gelmeden kaçar. Kritik vuruş ustası.', '#40c057',
      [32, 14, 3, 1, 0.12, 0.10, 5, 1.5, 1, 0.4, 0.4],
      ['kisa_yay', 'deri_yelek', 'iksir_can', 'ekmek', 'ekmek'],
      ['coklu_ok', 'zehirli_ok', 'geri_sicra']),
    buyucu: cls('buyucu', 'Büyücü', 'Kırılgan ama yıkıcı. Mana bitince başı dertte demektir.', '#845ef7',
      [26, 30, 2, 0, 0.05, 0.05, 4, 4, 0.6, 0.3, 1],
      ['cirak_asasi', 'keten_cubbe', 'iksir_mana', 'iksir_can', 'ekmek'],
      ['ates_topu', 'buz_halkasi', 'isinlanma'])
  };

  /* ======================= CANAVARLAR ======================= */
  // Hasar modeli (ana dosya): hasar = max(1, round(atk * rastgele(0.85..1.15) - def * 0.6)), kritik x1.8.
  const MONSTERS = {};
  [
    /* --- Kat 1-3 · Mahzen --- */
    mon('sican', 'Dev Sıçan', 'Kedi boyunda, sarı dişli. Tek başına korkak, sürü halinde cüretkâr.',
      [12, 4, 0, 5, 0, 3], [1, 4], { flags: ['pack'], sight: 6 }),
    mon('yarasa', 'Yarasa', 'Karanlıkta zikzak çizer; vurması zor, ısırığı ufak.',
      [8, 4, 0, 5, 0, 2], [1, 4], { speed: 2, ai: 'erratic', flags: ['flying'] }),
    mon('balcik', 'Balçık', 'Yeşil, yapışkan bir yığın. Kesince ikiye bölünür, bu bir çözüm değildir.',
      [24, 5, 1, 9, 0, 4], [1, 4], { speed: 0.5, element: 'zehir', onHit: { status: 'zehir', chance: 0.2, turns: 3 }, flags: ['split'], sight: 5 }),
    mon('goblin', 'Goblin', 'Paslı bıçak, kirli sırıtış. Cebinde her zaman birkaç çalıntı altın vardır.',
      [18, 5, 1, 8, 2, 7], [1, 5], {}),
    mon('iskelet', 'İskelet', 'Eski bir muhafızın kemikleri. Zehirlenmez, yorulmaz, pes etmez.',
      [26, 9, 2, 12, 1, 5], [2, 5], { flags: ['undead'] }),

    /* --- Kat 4-6 · Mağara --- */
    mon('orumcek', 'Dev Örümcek', 'Tavanda bekler, ağına takılanı zehirler. Sekiz göz hepsi sende.',
      [42, 14, 2, 20, 0, 6], [4, 7], { ai: 'ambush', onHit: { status: 'zehir', chance: 0.35, turns: 3 }, sight: 6 }),
    mon('goblin_okcu', 'Goblin Okçu', 'Yaklaştığında kaçar, uzaklaştığında ok yağdırır. Sinir bozucu.',
      [32, 15, 1, 21, 3, 9], [4, 7], { ai: 'ranged', range: 5, sight: 8 }),
    mon('ork', 'Ork', 'İri, öfkeli ve sabırsız. Her vuruşu bir kapı kırar gibi gelir.',
      [68, 18, 3, 32, 4, 12], [5, 7], {}),
    mon('saman', 'Kobold Şaman', 'Kemik tılsımlarıyla ateş fısıldar ve dostlarını çağırır. Önce onu vur.',
      [36, 13, 1, 26, 5, 14], [4, 7], { ai: 'caster', range: 5, element: 'ates', flags: ['summoner'], summon: 'goblin' }),
    mon('kurt', 'Mağara Kurdu', 'Hızlı ve asla yalnız değil. Birini gördüysen diğerleri çoktan arkandadır.',
      [46, 16, 2, 22, 0, 4], [4, 7], { speed: 2, flags: ['pack'], sight: 9 }),

    /* --- Kat 7-9 · Mezar --- */
    mon('zombi', 'Zombi', 'Yavaş ama durdurulamaz. Çürümüş eli değdiğinde güç damarlarından çekilir.',
      [135, 20, 3, 40, 1, 6], [7, 10], { speed: 0.5, onHit: { status: 'zayif', chance: 0.25, turns: 4 }, flags: ['undead', 'regen'], sight: 6 }),
    mon('hayalet', 'Hayalet', 'Duvarlardan süzülür, dokunuşu iliklere işler. Kılıç ona pek dokunmaz.',
      [68, 21, 2, 44, 0, 0], [7, 10], { element: 'karanlik', onHit: { status: 'zayif', chance: 0.3, turns: 3 }, flags: ['undead', 'phase', 'flying'] }),
    mon('iskelet_buyucu', 'İskelet Büyücü', 'Ölüm onu durdurmadı, yalnızca sabırsızlaştırdı. Kemik orduları çağırır.',
      [72, 23, 3, 52, 6, 18], [7, 10], { ai: 'caster', range: 5, element: 'karanlik', flags: ['undead', 'summoner'], summon: 'iskelet' }),
    mon('gulyabani', 'Gulyabani', 'Mezar eti yiyen pençeli yaratık. Vuruşu insanı yerinde dondurur.',
      [106, 25, 4, 56, 2, 9], [7, 10], { onHit: { status: 'sersem', chance: 0.25, turns: 1 }, flags: ['undead'] }),
    mon('tarikatci', 'Tarikatçı', 'Kapüşonlu bir fanatik. Mırıldandığı dualar alev alev yanar.',
      [84, 22, 3, 48, 8, 20], [7, 10], { ai: 'caster', range: 4, element: 'ates', onHit: { status: 'yanik', chance: 0.3, turns: 3 } }),

    /* --- Kat 10-12 · Lav --- */
    mon('ates_cini', 'Ateş Cini', 'Yaşayan bir kıvılcım. Öldüğünde bile son bir kez patlar.',
      [95, 30, 4, 65, 5, 15], [10, 13], { ai: 'erratic', element: 'ates', onHit: { status: 'yanik', chance: 0.4, turns: 3 }, flags: ['flying', 'explode'] }),
    mon('semender', 'Semender', 'Lavda yüzen kalın derili sürüngen. Yaraları gözünün önünde kapanır.',
      [110, 27, 5, 60, 3, 12], [10, 13], { element: 'ates', flags: ['regen', 'flying'], sight: 6 }),
    mon('golem', 'Taş Golem', 'Yürüyen bir kaya yığını. Yavaştır ama her adımı yeri titretir.',
      [165, 32, 9, 90, 10, 30], [10, 13], { speed: 0.5, onHit: { status: 'sersem', chance: 0.2, turns: 1 }, sight: 5 }),
    mon('alev_buyucu', 'Alev Büyücüsü', 'Lavı bir çeşme gibi kullanır. Menzilinde kalmak akıllıca değil.',
      [90, 35, 4, 85, 12, 32], [10, 13], { ai: 'caster', range: 5, element: 'ates', onHit: { status: 'yanik', chance: 0.4, turns: 3 } }),
    mon('cehennem_kopegi', 'Cehennem Köpeği', 'Kor gözlü, sürü halinde avlanan köpek. Isırığı yakar.',
      [105, 31, 5, 70, 0, 6], [10, 13], { speed: 2, element: 'ates', onHit: { status: 'yanik', chance: 0.25, turns: 2 }, flags: ['pack'], sight: 9 }),

    /* --- Kat 13-15 · Buz --- */
    mon('buz_trolu', 'Buz Trolü', 'Devasa ve inatçı. Kestiğin yerden buz gibi yeni et büyür.',
      [200, 37, 8, 130, 8, 24], [13, 15], { element: 'buz', onHit: { status: 'donma', chance: 0.2, turns: 1 }, flags: ['regen'], sight: 6 }),
    mon('ruh', 'Kara Ruh', 'Donmuş bir çığlık. Duvarlar onu durdurmaz, dokunuşu gücünü emer.',
      [120, 39, 5, 120, 0, 0], [13, 15], { element: 'karanlik', onHit: { status: 'zayif', chance: 0.3, turns: 4 }, flags: ['undead', 'phase', 'flying'] }),
    mon('kara_sovalye', 'Kara Şövalye', 'Lanetli zırhının içinde kim var, kimse bilmiyor. Kalkanı sağlam, kılıcı keskin.',
      [180, 38, 11, 150, 20, 50], [13, 15], { element: 'karanlik' }),
    mon('minotor', 'Minotor', 'Boynuzları duvarları deler. Boynuz darbesi yediğinde yıldızları görürsün.',
      [220, 42, 7, 160, 15, 40], [13, 15], { onHit: { status: 'sersem', chance: 0.3, turns: 1 }, sight: 8 }),
    mon('ejder_yavrusu', 'Ejder Yavrusu', 'Annesinin nefesinden küçük bir parça. Yine de yeterince yakar.',
      [160, 40, 8, 170, 25, 60], [13, 15], { ai: 'ranged', range: 3, element: 'ates', onHit: { status: 'yanik', chance: 0.35, turns: 3 }, flags: ['flying'] }),

    /* --- Bosslar --- */
    mon('goblin_kral', 'Goblin Kralı', 'Çalıntı bir taçla oturan şişko zorba. Narası mahzeni goblinle doldurur.',
      [220, 17, 3, 120, 40, 80], [5, 5], {
        boss: true, flags: ['boss'], sight: 10, special: 'savas_narasi',
        phases: [
          { hpBelow: 0.6, summon: 'goblin', count: 3, msg: 'Goblin Kralı nara attı: "Muhafızlar, bana!"' },
          { hpBelow: 0.25, summon: 'goblin_okcu', count: 2, msg: 'Goblin Kralı tacını düzeltip okçularını çağırdı!' }
        ]
      }),
    mon('lich', 'Lich', 'Ölümü yenen büyücü. Ruhu bir yerde saklı; bedeni ise saldırgan.',
      [420, 32, 6, 350, 120, 200], [10, 10], {
        boss: true, ai: 'caster', range: 5, element: 'karanlik', flags: ['boss', 'undead', 'summoner'], summon: 'iskelet', sight: 10,
        special: 'olu_cagir', onHit: { status: 'zayif', chance: 0.3, turns: 3 },
        phases: [
          { hpBelow: 0.66, summon: 'iskelet', count: 3, msg: 'Lich kemiklere seslendi: "Kalkın!"' },
          { hpBelow: 0.33, summon: 'hayalet', count: 2, msg: 'Lich\'in çevresinde hayaletler belirdi!' }
        ]
      }),
    mon('ejderha', 'Kızıl Ejderha', 'Zindanın en dibinde, hazinesinin üstünde uyuyan kadim felaket.',
      [720, 46, 8, 800, 300, 500], [15, 15], {
        boss: true, range: 3, element: 'ates', flags: ['boss', 'flying'], sight: 12,
        special: 'ates_nefesi', onHit: { status: 'yanik', chance: 0.4, turns: 3 },
        phases: [
          { hpBelow: 0.6, summon: 'ejder_yavrusu', count: 2, msg: 'Ejderha kükredi; yavruları mağaraya daldı!' },
          { hpBelow: 0.3, summon: null, count: 0, msg: 'Ejderha öfkeyle alevlendi! Nefesi artık daha sık geliyor.' }
        ]
      }),

    /* --- NPC --- */
    mon('tuccar', 'Gezgin Tüccar', 'Her katta bir şekilde senden önce gelmiş olur. Pazarlık yapmaz.',
      [999, 0, 50, 0, 0, 0], [1, 15], { ai: 'npc', hostile: false, sight: 0 })
  ].forEach(m => { MONSTERS[m.id] = m; });

  /* ======================= EŞYA TABANLARI ======================= */
  const ITEM_BASES = {};
  [
    /* Kılıçlar */
    item('kisa_kilic', 'Kısa Kılıç', 'weapon', 'kilic', 'kilic', { atk: 2 }, 1, 20),
    item('uzun_kilic', 'Uzun Kılıç', 'weapon', 'kilic', 'kilic', { atk: 6 }, 4, 80),
    item('sovalye_kilici', 'Şövalye Kılıcı', 'weapon', 'kilic', 'kilic', { atk: 11, def: 1 }, 8, 220),
    item('ejder_kilici', 'Ejder Kılıcı', 'weapon', 'kilic', 'kilic', { atk: 17, crit: 0.05 }, 12, 600),
    /* Baltalar */
    item('el_baltasi', 'El Baltası', 'weapon', 'balta', 'balta', { atk: 4, crit: 0.03 }, 2, 35),
    item('savas_baltasi', 'Savaş Baltası', 'weapon', 'balta', 'balta', { atk: 9, crit: 0.05, twoHanded: true }, 6, 150, ['savasci']),
    item('cift_agizli_balta', 'Çift Ağızlı Balta', 'weapon', 'balta', 'balta', { atk: 15, crit: 0.08, twoHanded: true }, 11, 500, ['savasci']),
    /* Hançerler */
    item('hancer', 'Hançer', 'weapon', 'hancer', 'hancer', { atk: 2, crit: 0.10 }, 1, 25),
    item('suikastci_hanceri', 'Suikastçı Hançeri', 'weapon', 'hancer', 'hancer', { atk: 7, crit: 0.15, dodge: 0.03 }, 7, 200),
    /* Topuzlar */
    item('topuz', 'Topuz', 'weapon', 'topuz', 'topuz', { atk: 5 }, 3, 60),
    item('savas_cekici', 'Savaş Çekici', 'weapon', 'topuz', 'topuz', { atk: 12, def: 1, twoHanded: true }, 9, 300, ['savasci']),
    /* Mızrak */
    item('mizrak', 'Mızrak', 'weapon', 'mizrak', 'mizrak', { atk: 7, range: 2 }, 5, 120),
    item('ejder_mizragi', 'Ejder Mızrağı', 'weapon', 'mizrak', 'mizrak', { atk: 14, range: 2, crit: 0.04 }, 11, 480),
    /* Yaylar / arbaletler (okçu) */
    item('kisa_yay', 'Kısa Yay', 'weapon', 'yay', 'yay', { atk: 3, ranged: true, range: 5 }, 1, 30, ['okcu']),
    item('uzun_yay', 'Uzun Yay', 'weapon', 'yay', 'yay', { atk: 7, ranged: true, range: 6 }, 5, 130, ['okcu']),
    item('elf_yayi', 'Elf Yayı', 'weapon', 'yay', 'yay', { atk: 12, ranged: true, range: 6, crit: 0.08 }, 10, 420, ['okcu']),
    item('arbalet', 'Arbalet', 'weapon', 'arbalet', 'arbalet', { atk: 9, ranged: true, range: 5 }, 6, 160, ['okcu']),
    item('agir_arbalet', 'Ağır Arbalet', 'weapon', 'arbalet', 'arbalet', { atk: 16, ranged: true, range: 5, twoHanded: true }, 12, 550, ['okcu']),
    /* Asalar / değnekler (büyücü) */
    item('cirak_asasi', 'Çırak Asası', 'weapon', 'asa', 'asa', { atk: 2, spell: 4 }, 1, 30, ['buyucu']),
    item('bilge_asasi', 'Bilge Asası', 'weapon', 'asa', 'asa', { atk: 4, spell: 9, mp: 10 }, 6, 170, ['buyucu']),
    item('buyuk_asa', 'Büyük Asa', 'weapon', 'asa', 'asa', { atk: 6, spell: 15, mp: 20, twoHanded: true }, 11, 520, ['buyucu']),
    item('mese_degnegi', 'Meşe Değneği', 'weapon', 'degnek', 'degnek', { atk: 3, spell: 2 }, 2, 25),
    item('kristal_degnek', 'Kristal Değnek', 'weapon', 'degnek', 'degnek', { atk: 5, spell: 7, mp: 6 }, 7, 180),

    /* Zırhlar */
    item('keten_cubbe', 'Keten Cübbe', 'armor', 'cubbe', 'cubbe', { def: 0, mp: 5, spell: 1 }, 1, 15),
    item('buyucu_cubbesi', 'Büyücü Cübbesi', 'armor', 'cubbe', 'cubbe', { def: 2, mp: 15, spell: 3 }, 6, 140),
    item('yildiz_cubbesi', 'Yıldız Cübbesi', 'armor', 'cubbe', 'cubbe', { def: 4, mp: 30, spell: 6 }, 11, 450),
    item('deri_yelek', 'Deri Yelek', 'armor', 'deri_zirh', 'hafif', { def: 1 }, 1, 20),
    item('sert_deri', 'Sertleştirilmiş Deri', 'armor', 'deri_zirh', 'hafif', { def: 3, dodge: 0.04 }, 5, 110),
    item('golge_zirhi', 'Gölge Zırhı', 'armor', 'deri_zirh', 'hafif', { def: 5, dodge: 0.08, crit: 0.03 }, 10, 400),
    item('zincir_zirh', 'Zincir Zırh', 'armor', 'zincir_zirh', 'agir', { def: 3 }, 4, 90),
    item('plaka_zirh', 'Plaka Zırh', 'armor', 'plaka_zirh', 'agir', { def: 6, hp: 5 }, 8, 260, ['savasci']),
    item('ejder_pulu', 'Ejder Pulu Zırh', 'armor', 'plaka_zirh', 'agir', { def: 9, hp: 15 }, 12, 650, ['savasci']),

    /* Başlıklar */
    item('deri_bere', 'Deri Bere', 'head', 'bere', null, { def: 1 }, 2, 25),
    item('buyucu_beresi', 'Büyücü Beresi', 'head', 'bere', null, { def: 1, mp: 8, spell: 2 }, 5, 90),
    item('migfer', 'Miğfer', 'head', 'migfer', null, { def: 2 }, 4, 70),
    item('sovalye_migferi', 'Şövalye Miğferi', 'head', 'migfer', null, { def: 4, hp: 10 }, 9, 240),
    item('ejder_migferi', 'Ejder Miğferi', 'head', 'migfer', null, { def: 6, hp: 20 }, 13, 520),

    /* Yüzükler */
    item('demir_yuzuk', 'Demir Yüzük', 'ring', 'yuzuk', null, { hp: 5 }, 1, 30),
    item('guc_yuzugu', 'Güç Yüzüğü', 'ring', 'yuzuk', null, { atk: 2 }, 4, 100),
    item('koruma_yuzugu', 'Koruma Yüzüğü', 'ring', 'yuzuk', null, { def: 2 }, 6, 130),
    item('keskinlik_yuzugu', 'Keskinlik Yüzüğü', 'ring', 'yuzuk', null, { crit: 0.06 }, 8, 220),
    item('ejder_yuzugu', 'Ejder Yüzüğü', 'ring', 'yuzuk', null, { atk: 4, def: 2 }, 13, 560),

    /* Kolyeler */
    item('tilsim', 'Tılsım', 'amulet', 'kolye', null, { hp: 8 }, 2, 40),
    item('mana_kolyesi', 'Mana Kolyesi', 'amulet', 'kolye', null, { mp: 15, spell: 2 }, 4, 110),
    item('yasam_kolyesi', 'Yaşam Kolyesi', 'amulet', 'kolye', null, { hp: 25 }, 8, 240),
    item('ruh_kolyesi', 'Ruh Kolyesi', 'amulet', 'kolye', null, { mp: 20, spell: 6 }, 11, 460),
    item('kahraman_kolyesi', 'Kahraman Kolyesi', 'amulet', 'kolye', null, { atk: 3, def: 3, hp: 15 }, 14, 700)
  ].forEach(it => { ITEM_BASES[it.id] = it; });

  /* ======================= TÜKETİLEBİLİRLER ======================= */
  const CONSUMABLES = {};
  [
    /* İksirler (renkler her oyunda karıştırılır; sprite yalnızca varsayılan) */
    con('iksir_can', 'Can İksiri', 'potion', 'iksir_kirmizi', '30 can yeniler.', 'heal', 30, 0, 1, 25, 30),
    con('buyuk_can_iksiri', 'Büyük Can İksiri', 'potion', 'iksir_kirmizi', '80 can yeniler.', 'heal', 80, 0, 6, 70, 14),
    con('iksir_mana', 'Mana İksiri', 'potion', 'iksir_mavi', '20 mana yeniler.', 'mana', 20, 0, 1, 25, 18),
    con('buyuk_mana_iksiri', 'Büyük Mana İksiri', 'potion', 'iksir_mavi', '50 mana yeniler.', 'mana', 50, 0, 6, 65, 8),
    con('iksir_sifa', 'Şifa İksiri', 'potion', 'iksir_yesil', 'Zehir, yanık ve zayıflığı giderir, 10 can verir.', 'cure', 10, 0, 1, 30, 12),
    con('iksir_guc', 'Güç İksiri', 'potion', 'iksir_turuncu', '20 tur boyunca saldırı +5.', 'strength', 5, 20, 2, 45, 9),
    con('iksir_yenilenme', 'Yenilenme İksiri', 'potion', 'iksir_sari', '15 tur boyunca her tur 3 can.', 'regen', 3, 15, 2, 45, 9),
    con('iksir_gorunmezlik', 'Görünmezlik İksiri', 'potion', 'iksir_mor', '12 tur boyunca canavarlar seni göremez.', 'invis', 0, 12, 3, 60, 6),
    con('iksir_ates_direnci', 'Ateş Direnci İksiri', 'potion', 'iksir_turuncu', '30 tur boyunca ateş hasarı yarıya iner, lav yakmaz.', 'fireres', 0.5, 30, 7, 60, 6),
    con('iksir_tecrube', 'Tecrübe İksiri', 'potion', 'iksir_mor', 'Anında 60 tecrübe puanı.', 'xp', 60, 0, 3, 90, 4),

    /* Parşömenler */
    con('parsomen_isinlanma', 'Işınlanma Parşömeni', 'scroll', 'parsomen', 'Seni katta rastgele bir yere ışınlar.', 'teleport', 0, 0, 1, 40, 14),
    con('parsomen_harita', 'Harita Parşömeni', 'scroll', 'parsomen', 'Katın tamamını haritaya işler.', 'map', 0, 0, 1, 50, 10),
    con('parsomen_buyuleme', 'Büyüleme Parşömeni', 'scroll', 'parsomen', 'Kuşanılan bir eşyaya +1 güç ekler.', 'enchant', 1, 0, 3, 120, 7),
    con('parsomen_ates', 'Ateş Parşömeni', 'scroll', 'parsomen', 'Görüşteki tüm düşmanlara 30 ateş hasarı.', 'fire', 30, 0, 2, 70, 10),
    con('parsomen_donma', 'Donma Parşömeni', 'scroll', 'parsomen', 'Görüşteki tüm düşmanları 3 tur dondurur.', 'freeze', 0, 3, 2, 70, 9),
    con('parsomen_tanimlama', 'Tanımlama Parşömeni', 'scroll', 'parsomen', 'Çantandaki tüm iksirleri tanımlar.', 'identify', 0, 0, 1, 35, 11),
    con('parsomen_donus', 'Dönüş Parşömeni', 'scroll', 'parsomen', 'Seni katın başlangıç merdivenine geri götürür.', 'return', 0, 0, 2, 45, 7),

    /* Yemek */
    con('ekmek', 'Ekmek', 'food', 'yemek', 'Bayat ama doyurucu: 15 can.', 'food', 15, 0, 1, 10, 20),
    con('kurutulmus_et', 'Kurutulmuş Et', 'food', 'yemek', 'Tuzlu ve sert: 40 can.', 'food', 40, 0, 4, 25, 12)
  ].forEach(c => { CONSUMABLES[c.id] = c; });

  /* ======================= EKLER (AFFIX) ======================= */
  const AFFIXES = [
    /* önekler */
    aff('keskin', 'Keskin', 'prefix', 'atk', 1, 3, W, 1, 20),
    aff('olumcul', 'Ölümcül', 'prefix', 'atk', 4, 8, W, 8, 8),
    aff('saglam', 'Sağlam', 'prefix', 'def', 1, 2, ARM, 1, 20),
    aff('kalin', 'Kalın', 'prefix', 'def', 3, 5, ARM, 8, 8),
    aff('dayanikli', 'Dayanıklı', 'prefix', 'hp', 6, 15, ODG, 1, 16),
    aff('dev', 'Dev', 'prefix', 'hp', 18, 35, ODG, 9, 7),
    aff('bilge', 'Bilge', 'prefix', 'mp', 6, 15, ALL, 1, 12),
    aff('isabetli', 'İsabetli', 'prefix', 'crit', 0.03, 0.07, W, 2, 12),
    aff('cevik', 'Çevik', 'prefix', 'dodge', 0.03, 0.06, ARM, 2, 12),
    aff('vampirik', 'Vampirik', 'prefix', 'lifesteal', 0.05, 0.12, W, 5, 7),
    aff('alevli', 'Alevli', 'prefix', 'fireDmg', 2, 6, W, 3, 10),
    aff('buzlu', 'Buzlu', 'prefix', 'iceDmg', 2, 6, W, 4, 10),
    aff('zehirli', 'Zehirli', 'prefix', 'poisonDmg', 2, 5, W, 2, 10),
    aff('buyulu', 'Büyülü', 'prefix', 'spell', 2, 5, ['weapon', 'amulet', 'head'], 2, 12),
    aff('yenileyen', 'Yenileyen', 'prefix', 'regen', 1, 2, ODG, 4, 8),
    aff('dikenli', 'Dikenli', 'prefix', 'thorns', 1, 4, ARM, 3, 9),
    aff('parlak', 'Parlak', 'prefix', 'goldFind', 0.1, 0.3, ACC, 1, 8),

    /* sonekler */
    aff('ayinin', 'Ayının', 'suffix', 'hp', 8, 20, ALL, 1, 14),
    aff('kaplumbaganin', 'Kaplumbağanın', 'suffix', 'def', 1, 3, ODG, 1, 14),
    aff('kurdun', 'Kurdun', 'suffix', 'atk', 1, 4, ['weapon', 'ring'], 2, 12),
    aff('ejderin', 'Ejderin', 'suffix', 'atk', 5, 10, ALL, 11, 4),
    aff('kartalin', 'Kartalın', 'suffix', 'crit', 0.04, 0.10, ['weapon', 'ring', 'head'], 4, 9),
    aff('tilkinin', 'Tilkinin', 'suffix', 'dodge', 0.04, 0.09, ODG, 4, 9),
    aff('baykusun', 'Baykuşun', 'suffix', 'mp', 10, 30, ['head', 'ring', 'amulet', 'armor'], 3, 10),
    aff('kahinin', 'Kâhinin', 'suffix', 'spell', 4, 10, ['weapon', 'amulet'], 7, 6),
    aff('vampirin', 'Vampirin', 'suffix', 'lifesteal', 0.08, 0.18, ['weapon', 'amulet'], 9, 4),
    aff('anka_kusunun', 'Anka Kuşunun', 'suffix', 'regen', 2, 4, ACC, 8, 5),
    aff('kirpinin', 'Kirpinin', 'suffix', 'thorns', 3, 8, ARM, 8, 6),
    aff('yilanin', 'Yılanın', 'suffix', 'poisonDmg', 4, 9, W, 7, 7),
    aff('buzulun', 'Buzulun', 'suffix', 'iceDmg', 5, 10, W, 10, 6),
    aff('cehennemin', 'Cehennemin', 'suffix', 'fireDmg', 5, 10, W, 10, 6),
    aff('cimrinin', 'Cimrinin', 'suffix', 'goldFind', 0.25, 0.5, ACC, 5, 5),
    aff('ustanin', 'Ustanın', 'suffix', 'xpBonus', 0.08, 0.2, ACC, 3, 6)
  ];

  /* ======================= NADİRLİK ======================= */
  const RARITIES = [
    { id: 'siradan', name: 'Sıradan', color: '#cfd4dc', affixes: 0, weight: 60 },
    { id: 'buyulu', name: 'Büyülü', color: '#4dabf7', affixes: 1, weight: 28 },
    { id: 'nadir', name: 'Nadir', color: '#ffd43b', affixes: 2, weight: 10 },
    { id: 'efsanevi', name: 'Efsanevi', color: '#ff922b', affixes: 3, weight: 2 }
  ];

  /* ======================= TEMALAR ======================= */
  const THEMES = {
    mahzen: { id: 'mahzen', name: 'Mahzen', floors: [1, 3], ambient: '#1a1420', light: '#ffd8a8', fog: 'rgba(8,6,12,0.6)', water: 'su', decor: ['kemik', 'fici', 'mesale', 'sandik_kirik'] },
    magara: { id: 'magara', name: 'Mağara', floors: [4, 6], ambient: '#141220', light: '#ffe3b0', fog: 'rgba(6,5,14,0.62)', water: 'su', decor: ['kristal', 'kemik', 'mesale', 'ot'] },
    mezar: { id: 'mezar', name: 'Mezar', floors: [7, 9], ambient: '#0f1612', light: '#c8f0c8', fog: 'rgba(4,10,6,0.64)', water: 'su', decor: ['kemik', 'sunak', 'mesale', 'ot', 'sandik_kirik'] },
    lav: { id: 'lav', name: 'Lav', floors: [10, 12], ambient: '#1c0a06', light: '#ffb070', fog: 'rgba(14,4,2,0.6)', water: 'lav_havuz', decor: ['kemik', 'mesale', 'sandik_kirik', 'fici'] },
    buz: { id: 'buz', name: 'Buz', floors: [13, 15], ambient: '#0c1424', light: '#d0ecff', fog: 'rgba(4,10,24,0.58)', water: 'su', decor: ['kristal', 'kemik', 'mesale', 'sunak'] }
  };

  /* ======================= YETENEKLER (PERK) ======================= */
  const PERKS = [
    /* genel */
    perk('guc', 'Kuvvet', 'Saldırı +2.', '💪', null, 3, { atk: 2 }),
    perk('kaya', 'Kaya Gibi', 'Savunma +2.', '🛡️', null, 3, { def: 2 }),
    perk('canlilik', 'Canlılık', 'Azami can +12.', '❤️', null, 3, { hp: 12 }),
    perk('zihin', 'Berrak Zihin', 'Azami mana +10.', '🔮', null, 3, { mp: 10 }),
    perk('keskin_goz', 'Keskin Göz', 'Kritik vuruş şansı +%5.', '🎯', null, 2, { crit: 0.05 }),
    perk('golge_adim', 'Gölge Adım', 'Kaçınma +%4.', '👣', null, 2, { dodge: 0.04 }),
    perk('kan_emici', 'Kan Emici', 'Verdiğin hasarın %5\'i kadar can çalarsın.', '🩸', null, 2, { lifesteal: 0.05 }),
    perk('yenilenme', 'Yenilenme', 'Her tur 1 can yenilenir.', '🌿', null, 2, { regen: 1 }),
    perk('dikenli_zirh', 'Dikenli Zırh', 'Sana vuran her düşman 2 hasar alır.', '🌵', null, 2, { thorns: 2 }),
    perk('hazine_avcisi', 'Hazine Avcısı', 'Bulunan altın +%20.', '💰', null, 2, { goldFind: 0.2 }),
    perk('hizli_ogrenen', 'Hızlı Öğrenen', 'Kazanılan tecrübe +%10.', '📜', null, 2, { xpBonus: 0.1 }),
    perk('kartal_gozu', 'Kartal Gözü', 'Görüş mesafesi +1.', '👁️', null, 2, { sight: 1 }),
    perk('verimlilik', 'Verimlilik', 'Beceri mana maliyeti %15 azalır.', '✨', null, 2, { skillCost: -0.15 }),
    perk('gezgin', 'Gezgin', 'Can +6, savunma +1, mana +4.', '🎒', null, 2, { hp: 6, def: 1, mp: 4 }),
    perk('kumarbaz', 'Kumarbaz', 'Kritik +%8, savunma -1. Ya hep ya hiç.', '🎲', null, 1, { crit: 0.08, def: -1 }),
    /* savaşçı */
    perk('demir_deri', 'Demir Deri', 'Savunma +3, can +10.', '⛓️', ['savasci'], 2, { def: 3, hp: 10 }),
    perk('berserk', 'Berserk', 'Saldırı +4, savunma -1.', '🪓', ['savasci'], 2, { atk: 4, def: -1 }),
    perk('kale', 'Kale', 'Azami can +25.', '🏰', ['savasci'], 2, { hp: 25 }),
    perk('misilleme', 'Misilleme', 'Dikenler +3, saldırı +1.', '⚔️', ['savasci'], 1, { thorns: 3, atk: 1 }),
    /* okçu */
    perk('nisanci', 'Nişancı', 'Kritik vuruş şansı +%8.', '🏹', ['okcu'], 2, { crit: 0.08 }),
    perk('ruzgar_ayagi', 'Rüzgâr Ayağı', 'Kaçınma +%6.', '🍃', ['okcu'], 2, { dodge: 0.06 }),
    perk('avci_icgudusu', 'Avcı İçgüdüsü', 'Saldırı +2, görüş +1.', '🦅', ['okcu'], 2, { atk: 2, sight: 1 }),
    perk('hafif_adim', 'Hafif Adım', 'Kaçınma +%3, kritik +%3, can +5.', '🪶', ['okcu'], 1, { dodge: 0.03, crit: 0.03, hp: 5 }),
    /* büyücü */
    perk('ark_buyu', 'Ark Büyü', 'Büyü gücü +4.', '🌟', ['buyucu'], 3, { spell: 4 }),
    perk('mana_akisi', 'Mana Akışı', 'Azami mana +15, beceri maliyeti %10 azalır.', '💧', ['buyucu'], 2, { mp: 15, skillCost: -0.1 }),
    perk('buyu_kalkani', 'Büyü Kalkanı', 'Savunma +2, mana +8.', '🔷', ['buyucu'], 2, { def: 2, mp: 8 }),
    perk('ruh_bagi', 'Ruh Bağı', 'Can çalma +%6, büyü gücü +2.', '🕯️', ['buyucu'], 1, { lifesteal: 0.06, spell: 2 })
  ];

  /* ======================= FONKSİYONLAR ======================= */
  const FLOORS = 15;

  // Seviye l'den l+1'e geçmek için gereken XP. 1→2: 20, her seviye ~%40 artar.
  function xpForLevel(level) {
    const l = Math.max(1, level | 0);
    return Math.round(20 * Math.pow(1.4, l - 1) / 5) * 5;
  }

  function floorTheme(floor) {
    const f = Math.min(FLOORS, Math.max(1, floor | 0));
    for (const id in THEMES) {
      const t = THEMES[id];
      if (f >= t.floors[0] && f <= t.floors[1]) return id;
    }
    return 'buz';
  }

  // O kata uygun canavarlar (boss ve NPC hariç). Kendi temasındakiler ağır,
  // bir önceki temadan taşanlar hafif ağırlıkta.
  function monsterPool(floor) {
    const f = Math.min(FLOORS, Math.max(1, floor | 0));
    const theme = THEMES[floorTheme(f)];
    const pool = [];
    for (const id in MONSTERS) {
      const m = MONSTERS[id];
      if (m.boss || m.ai === 'npc') continue;
      if (f < m.minFloor || f > m.maxFloor) continue;
      const home = m.minFloor >= theme.floors[0];
      let w = home ? 10 : 4;
      if (m.flags.indexOf('pack') >= 0) w -= 2;      // sürüler zaten kalabalık doğar
      if (m.flags.indexOf('summoner') >= 0) w -= 3;  // çağırıcılar seyrek
      pool.push({ id, weight: Math.max(1, w) });
    }
    return pool;
  }

  // Yerde / sandıkta çıkan ganimet ağırlıkları (ana dosya normalleştirir).
  function lootTable(floor) {
    const f = Math.min(FLOORS, Math.max(1, floor | 0));
    return {
      gold: [3 + 2 * f, 8 + 5 * f],
      potion: 30,
      scroll: 14,
      equip: 22 + f,
      food: Math.max(4, 12 - Math.floor(f / 3))
    };
  }

  // Canavar kendi tema aralığından derin bir katta ise istatistikleri hafif artmış kopya döner.
  // flags / phases / onHit gibi alanlar korunur (kopyalanır).
  function scaleMonster(def, floor) {
    const home = THEMES[floorTheme(def.minFloor)].floors[1];
    const depth = def.boss || def.ai === 'npc' ? 0 : Math.max(0, (floor | 0) - home);
    const m = Object.assign({}, def);
    m.gold = def.gold.slice();
    m.flags = (def.flags || []).slice();
    if (def.onHit) m.onHit = Object.assign({}, def.onHit);
    if (def.phases) m.phases = def.phases.map(p => Object.assign({}, p));
    if (!depth) return m;
    const k = 1 + 0.12 * depth;
    m.hp = Math.round(def.hp * k);
    m.atk = Math.round(def.atk * k);
    m.def = Math.round(def.def * (1 + 0.08 * depth));
    m.xp = Math.round(def.xp * (1 + 0.1 * depth));
    m.gold = [Math.round(def.gold[0] * k), Math.round(def.gold[1] * k)];
    return m;
  }

  // Ana dosyanın hasar formülünün beklenen değeri (rastgele çarpan ortalaması 1).
  // Denge tabloları buna göre ayarlandı; ana dosya kendi rastgele çarpanını uygular.
  const DEF_MULT = 0.6, CRIT_MULT = 1.8;
  function damage(atk, def) {
    return Math.max(1, Math.round(atk - Math.max(0, def || 0) * DEF_MULT));
  }

  DG.data = {
    CLASSES, MONSTERS, ITEM_BASES, CONSUMABLES, AFFIXES, RARITIES, THEMES, PERKS,
    FLOORS, DEF_MULT, CRIT_MULT,
    xpForLevel, floorTheme, monsterPool, lootTable, scaleMonster, damage
  };
})();
