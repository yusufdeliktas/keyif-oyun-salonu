# Zindan Kaşifi — Teknik Tasarım (ajanlar için ortak sözleşme)

Keyif Oyun Salonu'na eklenecek, sıra tabanlı, internetsiz çalışan bir roguelike zindan RPG'si.
Platform: düz HTML5 canvas + klasik `<script>` dosyaları (ES modülü YOK, `import/export` YOK, derleme YOK).
`file://` üzerinden ve Android WebView içinde de çalışmalı. Harici dosya / resim / ses / CDN YOK.
Tüm oyuncuya görünen metinler **Türkçe**.

## Dosyalar ve sahipleri

| Dosya | İçerik | Sahibi |
|---|---|---|
| `web/games/dungeon/data.js` | Sınıflar, canavarlar, eşyalar, ekler (affix), iksir/parşömen, temalar, denge tabloları | Ajan A (veri) |
| `web/games/dungeon/gen.js` | Rastgele sayı üretici, zindan üretimi, görüş alanı (FOV), yol bulma | Ajan B (üretim) |
| `web/games/dungeon/art.js` | Prosedürel piksel-sanat sprite atlası ve çizim fonksiyonları | Ajan C (sanat) |
| `web/games/dungeon.js` | `Platform.register`, oyun döngüsü, sıra sistemi, savaş, yapay zeka, arayüz, kayıt | Ana geliştirici |

Yükleme sırası (index.html): `dungeon/data.js`, `dungeon/gen.js`, `dungeon/art.js`, `dungeon.js`.

Her dosya şu kalıpla başlar:

```js
/* Zindan Kaşifi - <modül adı> */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};
  // ...
})();
```

Kod stili: 2 boşluk girinti, tek tırnak, noktalı virgül, ES2017 (const/let, ok fonksiyonları, şablon dizgileri serbest).
`window.DG` dışında global değişken bırakma. Konsola hata/uyarı basma.
Yorumlar kısa ve Türkçe.

---

## 1) Ortak kimlikler (ID listesi) — DEĞİŞTİRME

Bu ID'ler hem `data.js` hem `art.js` tarafından birebir kullanılır.

### Kahraman sınıfları (sprite ID = sınıf ID)
- `savasci` — Savaşçı (yakın dövüş, yüksek can)
- `okcu` — Okçu (menzilli, kritik vuruş, kaçınma)
- `buyucu` — Büyücü (büyü, düşük can, yüksek mana)

### Canavarlar (sprite ID = canavar ID)
Kat 1-3 · tema `mahzen`: `sican` (Dev Sıçan), `yarasa` (Yarasa), `balcik` (Balçık), `goblin` (Goblin), `iskelet` (İskelet)
Kat 4-6 · tema `magara`: `orumcek` (Dev Örümcek), `goblin_okcu` (Goblin Okçu), `ork` (Ork), `saman` (Kobold Şaman), `kurt` (Mağara Kurdu)
Kat 7-9 · tema `mezar`: `zombi` (Zombi), `hayalet` (Hayalet), `iskelet_buyucu` (İskelet Büyücü), `gulyabani` (Gulyabani), `tarikatci` (Tarikatçı)
Kat 10-12 · tema `lav`: `ates_cini` (Ateş Cini), `semender` (Semender), `golem` (Taş Golem), `alev_buyucu` (Alev Büyücüsü), `cehennem_kopegi` (Cehennem Köpeği)
Kat 13-15 · tema `buz`: `buz_trolu` (Buz Trolü), `ruh` (Kara Ruh), `kara_sovalye` (Kara Şövalye), `minotor` (Minotor), `ejder_yavrusu` (Ejder Yavrusu)
Bosslar: `goblin_kral` (Goblin Kralı, kat 5), `lich` (Lich, kat 10), `ejderha` (Kızıl Ejderha, kat 15)
NPC: `tuccar` (Gezgin Tüccar)

### Eşya sprite ID'leri
Silah: `kilic`, `balta`, `hancer`, `topuz`, `mizrak`, `yay`, `arbalet`, `asa`, `degnek`
Zırh: `cubbe`, `deri_zirh`, `zincir_zirh`, `plaka_zirh`
Başlık: `bere`, `migfer`
Aksesuar: `yuzuk`, `kolye`
İksir: `iksir_kirmizi`, `iksir_mavi`, `iksir_yesil`, `iksir_mor`, `iksir_sari`, `iksir_turuncu`
Diğer: `parsomen`, `altin`, `anahtar`, `yemek`

### Karo / dekor sprite ID'leri
Temalar: `mahzen`, `magara`, `mezar`, `lav`, `buz`
Her tema için: `duvar_<tema>`, `zemin_<tema>` (ör. `duvar_lav`, `zemin_buz`)
Ortak: `kapi`, `kapi_acik`, `merdiven`, `merdiven_yukari`, `su`, `lav_havuz`, `tuzak`, `tuzak_gizli` (gizli tuzak, genelde çizilmez), `sandik`, `sandik_acik`, `mesale`, `kemik`, `fici`, `sandik_kirik`, `ot`, `kristal`, `sunak`

---

## 2) `data.js` — `DG.data`

```js
DG.data = {
  CLASSES: { savasci: {...}, okcu: {...}, buyucu: {...} },
  MONSTERS: { sican: {...}, ... },          // tüm canavarlar + bosslar
  ITEM_BASES: { kisa_kilic: {...}, ... },   // ekipman tabanları
  CONSUMABLES: { iksir_can: {...}, ... },   // iksir/parşömen/yemek
  AFFIXES: [ {...}, ... ],
  RARITIES: [ {...}, ... ],
  THEMES: { mahzen: {...}, ... },
  FLOORS: 15,
  xpForLevel(level) -> number,             // level -> bir sonrakine gereken toplam XP
  floorTheme(floor) -> themeId,
  monsterPool(floor) -> [{id, weight}],
  lootTable(floor) -> { gold:[min,max], potion:w, scroll:w, equip:w, food:w },
  PERKS: [ {...}, ... ]                     // seviye atlayınca seçilen yetenek kartları
};
```

### CLASSES[id]
```js
{ id, name, desc, color: '#hex',
  hp, mp, atk, def, crit /*0..1*/, dodge /*0..1*/,
  hpPerLevel, mpPerLevel, atkPerLevel, defPerLevel,
  regenMp /* tur başına mana yenilenmesi, ondalık olabilir */,
  startItems: ['kisa_kilic', 'deri_yelek', ...],   // ITEM_BASES/CONSUMABLES anahtarları
  skills: ['kukreme', 'kalkan_duvari', 'girdap'] } // aşağıdaki sabit beceri ID'leri
```
Beceri ID'leri (uygulaması ana dosyada; data sadece ID'leri listeler):
- savasci: `girdap` (çevredeki tüm düşmanlara vur), `kalkan_duvari` (3 tur %60 hasar azaltma), `hucum` (düz çizgide 4 kareye atıl, ilk düşmana çift hasar + sersemlet)
- okcu: `coklu_ok` (görüşteki en yakın 3 düşmana ok), `zehirli_ok` (zehir 5 tur), `geri_sicra` (düşmandan 3 kare uzağa sıçra)
- buyucu: `ates_topu` (hedef + çevresine 3x3 ateş hasarı, yanık), `buz_halkasi` (çevredeki düşmanları 2 tur dondur), `isinlanma` (görüşteki boş kareye ışınlan)

### MONSTERS[id]
```js
{ id, name, desc,
  hp, atk, def, xp, gold: [min, max],
  minFloor, maxFloor,          // bosslarda ikisi de boss katı
  speed: 1,                    // 0.5 = iki turda bir hareket, 1 = normal, 2 = turda iki hareket
  ai: 'melee' | 'ranged' | 'caster' | 'coward' | 'erratic' | 'ambush',
  range: 1,                    // menzilli/büyücüler için 4-6
  element: null | 'ates' | 'buz' | 'zehir' | 'karanlik',
  onHit: null | { status: 'zehir'|'yanik'|'donma'|'sersem'|'zayif', chance: 0..1, turns: n },
  flags: [],                   // 'undead','flying','regen','split','summoner','explode','phase','boss','pack'
  sight: 7,                    // fark etme mesafesi
  boss: false }
```
Bayrak anlamları (ana dosya uygular): `regen` tur başına %5 can; `split` ölünce 2 küçük kopya (yarı can, `split` olmadan); `summoner` 6 turda bir yanına `summon` alanındaki ID'den çağırır (alan ekle: `summon: 'iskelet'`); `explode` ölünce çevresine `atk` kadar hasar; `phase` duvardan geçebilir; `pack` sürü halinde (2-4) doğar; `flying` su/lavdan etkilenmez.
Bosslar için ek alan: `phases: [{ hpBelow: 0.5, summon: 'goblin', count: 3, msg: '...' }]` ve `special` kısa açıklama dizgisi (ör. `'ates_nefesi'`, `'olu_cagir'`, `'yer_sarsintisi'`).
Denge: kat 1'de oyuncu (Savaşçı ~40 can, 6 saldırı) bir `sican`ı 2-3 vuruşta öldürmeli; ortalama canavar kat 1'de oyuncuya vuruş başına 1-4 hasar vermeli. Kat 15 ejderhası 15. seviye, iyi donanımlı bir oyuncu için zor ama yenilebilir olmalı (~600-900 can).

### ITEM_BASES[id]
```js
{ id, name, slot: 'weapon' | 'armor' | 'head' | 'ring' | 'amulet',
  sprite: 'kilic',             // bölüm 1'deki eşya sprite ID'si
  kind: 'kilic'|'balta'|'hancer'|'topuz'|'mizrak'|'yay'|'arbalet'|'asa'|'degnek'|'hafif'|'agir'|'cubbe'|null,
  atk: 0, def: 0, hp: 0, mp: 0, crit: 0, dodge: 0,
  ranged: false, range: 1,     // yay/arbalet: true, 5-7; asa/degnek: false (büyücü büyü gücü verir)
  spell: 0,                    // büyü gücü (asa/değnek/kolye)
  twoHanded: false,
  minFloor, value,             // value = altın değeri (satış = value/2)
  classes: null | ['okcu'] }   // null = herkes kullanabilir
```
En az 30 taban eşya; her slot için kat ilerledikçe güçlenen 3-5 kademe (ör. Kısa Kılıç → Uzun Kılıç → Şövalye Kılıcı → Ejder Kılıcı).

### CONSUMABLES[id]
```js
{ id, name, kind: 'potion' | 'scroll' | 'food', sprite, desc,
  effect: 'heal' | 'mana' | 'cure' | 'strength' | 'regen' | 'invis' | 'fireres' | 'xp'
        | 'teleport' | 'map' | 'enchant' | 'fire' | 'freeze' | 'identify' | 'return' | 'food',
  power: number, turns: number /* süreli etkiler için */, minFloor, value, weight /* düşme sıklığı */ }
```
İksirler en az 6, parşömenler en az 6, yemek 2 çeşit. İksirler oyunda **tanımlanmamış** başlar (renkleri her oyunda karışır; ana dosya yönetir), bu yüzden `sprite` alanı yalnızca varsayılan renktir.

### AFFIXES (rastgele büyülü ekler)
```js
{ id, name: 'Keskin', pos: 'prefix' | 'suffix',   // suffix ör. 'Ejderin'
  stat: 'atk'|'def'|'hp'|'mp'|'crit'|'dodge'|'lifesteal'|'fireDmg'|'iceDmg'|'poisonDmg'|'spell'|'regen'|'thorns'|'goldFind'|'xpBonus',
  min, max,                     // yüzde istatistikler 0..1 ondalık
  slots: ['weapon', ...], minFloor, weight }
```
En az 24 ek. İsimlendirme: prefix + taban adı + suffix, ör. "Keskin Uzun Kılıç (Ejderin)" — ana dosya birleştirir.

### RARITIES
```js
[ { id: 'siradan', name: 'Sıradan', color: '#cfd4dc', affixes: 0, weight: 60 },
  { id: 'buyulu',  name: 'Büyülü',  color: '#4dabf7', affixes: 1, weight: 28 },
  { id: 'nadir',   name: 'Nadir',   color: '#ffd43b', affixes: 2, weight: 10 },
  { id: 'efsanevi',name: 'Efsanevi',color: '#ff922b', affixes: 3, weight: 2 } ]
```
`weight` değerleri kat ilerledikçe ana dosyada daha nadirlere kaydırılır.

### THEMES[id]
```js
{ id, name: 'Mahzen', floors: [1, 3],
  ambient: '#1a1420',          // arka plan / görülmemiş alan rengi
  light: '#ffd8a8',            // meşale ışığı tonu
  fog: 'rgba(8,6,12,0.6)',     // hatırlanan ama şu an görünmeyen karo örtüsü
  water: 'su' | 'lav_havuz' | null,
  decor: ['kemik', 'fici', 'mesale'] }
```

### PERKS (seviye atlayınca 3 karttan biri seçilir)
```js
{ id, name, desc, icon: '⚔️', classes: null | ['savasci'], max: 3 /* kaç kez alınabilir */,
  mods: { atk: 2 } /* toplanır; yüzdeler ondalık: crit: 0.05 */ }
```
En az 20 yetenek (genel + sınıfa özel). `mods` anahtarları: `atk, def, hp, mp, crit, dodge, lifesteal, regen, spell, thorns, goldFind, xpBonus, sight, skillCost` (skillCost negatif = mana indirimi oranı, ör. -0.15).

### Fonksiyonlar
- `xpForLevel(l)`: 1→2 için ~20 XP, katlanarak artsın; 15. kata gelen oyuncu ~15-18. seviyede olsun.
- `monsterPool(floor)`: o kata uygun canavarlar ve ağırlıkları (boss hariç).
- `lootTable(floor)`.
- `scaleMonster(def, floor)`: kendi tema aralığından derin katlarda bulunursa istatistikleri hafif artıran kopya döndürür.

Ajan A ayrıca `docs/zindan-data-check.js` (node ile çalışan) bir doğrulama betiği yazar: tüm ID'ler bölüm 1 ile eşleşiyor mu, sınıf başlangıç eşyaları var mı, her katta en az 4 canavar var mı, sayılar NaN değil mi.

---

## 3) `gen.js` — `DG.gen`, `DG.fov`, `DG.path`, `DG.rng`

### Karo kodları (tam olarak bunlar)
```js
DG.T = { WALL: 0, FLOOR: 1, DOOR: 2, DOOR_OPEN: 3, STAIRS: 4, STAIRS_UP: 5, WATER: 6, LAVA: 7, CHASM: 8 };
DG.passable(t)  // FLOOR, DOOR, DOOR_OPEN, STAIRS, STAIRS_UP, WATER -> true (DOOR kapalı ama yürüyünce açılır)
DG.opaque(t)    // WALL, DOOR -> true
```

### Rastgele sayı üretici
`DG.rng(seed)` → `{ next() /*0..1*/, int(a,b) /*dahil*/, pick(arr), chance(p), shuffle(arr), seed /*mevcut durum, kayıt için*/ }`.
Aynı tohum = aynı dizi. Durum `rng.state()` ile alınıp `DG.rng.fromState(s)` ile geri yüklenebilmeli.

### `DG.gen.generate(floor, seed, opts)`
`opts = { boss: bool, shop: bool, themeWater: 'su'|'lav_havuz'|null }`
Dönüş:
```js
{ w, h, tiles: Uint8Array(w*h),       // indeks = y*w + x
  rooms: [{ x, y, w, h, cx, cy, kind: 'normal'|'start'|'stairs'|'treasure'|'shop'|'boss'|'cave' }],
  start: { x, y },                    // STAIRS_UP karosu bunun üstünde
  stairs: { x, y },                   // STAIRS (boss katında boss ölünce açılır: ana dosya yönetir; gen yine koyar)
  spawns: [{ x, y }],                 // canavar doğabilecek FLOOR karoları (başlangıç odası hariç, karışık sırada)
  items: [{ x, y }],                  // yerde eşya için uygun noktalar
  chests: [{ x, y }],                 // 1-3 sandık (hazine odasında 1 garanti)
  traps: [{ x, y, kind: 'diken'|'zehir'|'alev'|'alarm'|'isinlanma' }],
  decor: [{ x, y, kind: 'mesale'|'kemik'|'fici'|'sandik_kirik'|'ot'|'kristal'|'sunak' }], // mesale duvar karosuna, diğerleri zemine
  shop: null | { x, y },              // tüccar konumu (opts.shop ise, kendi odasında)
  boss: null | { x, y } }             // boss doğum noktası (opts.boss ise büyük arena odası)
```
Gereksinimler:
- Boyut 44x44 ile 60x60 arası (kat derinleştikçe büyüyebilir). Kenarlar her zaman WALL.
- 8-14 oda + koridorlar; bazı katlarda (özellikle `magara` temalı 4-6 ve `buz`) hücresel otomat ile doğal mağara bölümleri.
- **Bağlantı garantisi**: başlangıçtan merdivene ve tüm `spawns/items/chests/shop` noktalarına yürünerek ulaşılabilmeli (kapalı kapılar geçilebilir sayılır). WATER geçilebilir; LAVA ve CHASM geçilemez — bunlar yolu asla kesmesin.
- Merdiven başlangıçtan uzak olsun (yol uzunluğu en uzak odaların arasından).
- Kapılar oda-koridor birleşimlerinde, gerçekçi (iki yanı duvar).
- Ara sıra döngüler (çıkmaz sokaktan kaçınmak için %15-25 ek koridor).
- `opts.boss`: büyük (en az 13x11) arena odası, `boss` noktası arenanın ortası, merdiven arenanın içinde ya da hemen arkasında.
- Hızlı: tek üretim < 30 ms (orta seviye telefonda).

### `DG.fov.compute(w, h, isOpaque(x,y), ox, oy, radius)` → `Uint8Array(w*h)` (1 = görünür)
Simetrik gölge döküm (recursive shadowcasting, 8 oktant), dairesel menzil. Duvarların kendisi görünür sayılır.

### `DG.path.find(w, h, passable(x,y), sx, sy, tx, ty, maxNodes)` → `[{x,y}, ...]` (başlangıç hariç, hedef dahil) veya `null`
A*, 8 yönlü hareket; çapraz geçişte iki ortogonal komşudan biri duvarsa köşe kesmeye izin verme. `maxNodes` varsayılan 4000.
`DG.path.dijkstra(w, h, passable, sources:[{x,y}], maxDist)` → `Int16Array` mesafe haritası (ulaşılamaz = -1). (Kaçan canavarlar ve otomatik keşif için.)
`DG.path.line(x0,y0,x1,y1)` → Bresenham karo listesi (mermi/görüş hattı).

Ajan B ayrıca `docs/zindan-gen-test.js` (node) yazar: 15 kat × 200 tohum üretir; bağlantıyı, kenar duvarlarını, merdiven ≠ başlangıç, ortalama süreyi doğrular ve özet basar. Ayrıca bir haritayı ASCII olarak yazdırır.

---

## 4) `art.js` — `DG.art`

Tamamen kodla üretilen **16×16 piksel-sanat** sprite'lar (resim dosyası yok). Önerilen yol: her sprite 16 satırlık karakter dizgisi + palet; başlangıçta offscreen canvas'lara çizilir, sonra `drawImage` ile ölçeklenir (`imageSmoothingEnabled = false`).

```js
DG.art.init()                                   // tüm atlas hazırlanır (bir kez; ~50ms altında)
DG.art.has(id) -> bool
DG.art.draw(g, id, x, y, size, opts)            // opts: { flip: bool, alpha: 0..1, tint: '#hex'|null, frame: 0|1, outline: '#hex'|null }
DG.art.tile(g, themeId, tileCode, x, y, size, variant)  // karo çizimi (tileCode = DG.T değerleri), variant = (x*7+y*13) gibi sabit sayı -> zemin çeşitliliği
DG.art.icon(id, px) -> canvas                   // arayüz/envanter için tek sprite'ın px boyutlu kopyası (DOM'a eklenebilir)
DG.art.ids()                                    // tüm sprite ID listesi (test için)
```
Gereksinimler:
- Bölüm 1'deki **her ID** için sprite (kahraman, canavar, boss, NPC, eşya, karo, dekor). Bosslar 16×16 sığmazsa 32×32 olabilir (`size` ile ölçeklenince çift kare kaplar; `DG.art.big(id)` → true döndürsün).
- Canlılar için 2 karelik boşta animasyon (`frame: 0|1`; ör. hafif zıplama / kanat çırpma).
- Her temanın duvarı ve zemini belirgin şekilde farklı renk/doku (mahzen: kahverengi taş, mağara: gri-mor kaya, mezar: yeşilimsi gri taş + yosun, lav: koyu kırmızı-siyah + çatlaklar, buz: açık mavi-beyaz).
- Duvarlar üstten 3/4 bakış hissi versin (üst kenar daha açık).
- `tint` hasar flaşı (beyaz/kırmızı) ve dondurma (mavi) için kullanılacak: sprite'ın opak piksellerini o renge boyar.
- `outline`: seçili/elit canavarlar için 1px kontur.
- Okunaklı silüetler: telefonda 32px boyutunda bile ne olduğu anlaşılsın.
- Performans: `draw` çağrısı başına yalnızca 1 `drawImage` (tint/outline önbelleğe alınmış varyantlardan).

Ajan C ayrıca `docs/zindan-art-preview.html` yazar: tüm sprite'ları ve karoları ızgara halinde 2× ve 4× gösteren önizleme sayfası (art.js'i `../web/games/dungeon/art.js` yolundan yükler; data.js/gen.js'e bağımlı olmasın — DG.T sabitleri art.js içinde yoksa yerel varsayılan kullan).

---

## 5) Ana dosya (bilgi amaçlı)

- 15 kat, 5/10/15'te boss. 15. kat bossu ölünce zafer.
- Sıra tabanlı: oyuncu 1 eylem → tüm canavarlar hız değerlerine göre hareket.
- Dokunmatik: karoya dokun = oraya yürü (yol bulma), bitişik düşmana dokun = saldır, uzaktaki düşmana dokun (menzilli) = ateş et. Alt çubuk: Envanter, Beceriler (3), Bekle, Ara/Topla, Merdiven, Harita.
- Sis/keşif belleği, mini harita, otomatik keşif düğmesi.
- Kalıcı ölüm; otomatik kayıt. Kalıcı ilerleme: "Ruh Taşı" ile kalıcı küçük bonuslar.
