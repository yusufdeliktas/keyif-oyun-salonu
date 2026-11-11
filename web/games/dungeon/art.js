/* Zindan Kaşifi - sanat (prosedürel 16x16 piksel sprite atlası) */
(function () {
  'use strict';
  const DG = window.DG = window.DG || {};

  // Karo kodları (gen.js yüklüyse DG.T, yoksa yerel kopya)
  const T = DG.T || { WALL: 0, FLOOR: 1, DOOR: 2, DOOR_OPEN: 3, STAIRS: 4, STAIRS_UP: 5, WATER: 6, LAVA: 7, CHASM: 8 };

  /* ---------- Ortak palet (sprite içinde p ile ezilebilir) ---------- */
  const PAL = {
    k: '#1a1223', // kontur
    x: '#06050a', // göz bebeği / en koyu
    w: '#f8f5ee', W: '#d5dae2', g: '#9aa1ad', G: '#5a6070', d: '#343846',
    r: '#e5383b', R: '#9d1b24',
    o: '#ff8c2b', O: '#d1480a',
    y: '#ffd23f', Y: '#d49a0b', f: '#fff1a8',
    n: '#5ad15f', N: '#2a8a3a', v: '#1c5a2a',
    b: '#4ea8f5', B: '#1f5fb0',
    c: '#a6ecf7', C: '#2fb8d6',
    m: '#b393f7', M: '#6b3fd1', q: '#3b2a4a',
    p: '#f77fb0', P: '#c0346f',
    t: '#f3c79a', T: '#d3975e',
    h: '#9a6232', H: '#5e3a1a', l: '#d1a56a',
    e: '#f2ebd8', E: '#c8bc9c',
    s: '#b6c0cf', S: '#73809a',
    i: '#ffffff',
    a: '#bfe6ffaa', A: '#8fc8ff77', // yarı saydam hayalet tonları
    z: '#2a1f3a99' // yarı saydam gölge
  };

  /* ---------- Sprite tanımları ----------
     rows: 16 (veya 32) satır; p: palet ezmeleri; anim: 'bob' (canlı) | 'none';
     rows2: açık 2. kare (yoksa bob ile türetilir); big: 32x32 */
  const SPR = {};
  const L = (id, rows, extra) => { SPR[id] = Object.assign({ rows: rows, anim: 'bob' }, extra || {}); };
  const I = (id, rows, extra) => { SPR[id] = Object.assign({ rows: rows, anim: 'none' }, extra || {}); };

  /* --- Kahramanlar --- */
  L('savasci', [
    '......kk........',
    '.....krrk.......',
    '....ksssssk.....',
    '...kssssssSk....',
    '...ksSSSSSSk.k..',
    '...kttxttxtkkwk.',
    '...kTttttTk.kwk.',
    '..kkssssssk.kwk.',
    'kbbksssssssskwk.',
    'kbskssSsssssswk.',
    'kbbkssssssskyyyk',
    'kkk.kHhhhHk.kyk.',
    '....ksskssk.kkk.',
    '....kSsksSk.....',
    '....kkk.kkk.....',
    '................'
  ]);
  L('okcu', [
    '................',
    '.....kkkkk......',
    '....kNNNNNk.....',
    '...kNnnnnnNk.k..',
    '...kNttxtxtNkwhk',
    '...kNtttttNkwhk.',
    '....kNNNNNk.whk.',
    '...kknnnnnkkwhk.',
    '..khknnnnnhhhhk.',
    '..khknnNnnnkwhk.',
    '..kkknnnnnk.whk.',
    '....kHhhHk..whk.',
    '....khkkhk..kwhk',
    '....khk.khk..kk.',
    '....kkk.kkk.....',
    '................'
  ]);
  L('buyucu', [
    '.......k........',
    '......kBk.......',
    '.....kBBbk......',
    '....kBBbbBk.k...',
    '...kkkkkkkkkkmk.',
    '....kttxtxkkmmmk',
    '....kwwwwk..kmk.',
    '...kkwbwwkk.khk.',
    '..kbbkbbbkbkkhk.',
    '..kBbkbBbkbbkhk.',
    '..kkkkbbbbkkkhk.',
    '....kbbBbbk.khk.',
    '....kbbbbbk.khk.',
    '....kBBBBBk.khk.',
    '....kkkkkkk.kkk.',
    '................'
  ]);

  /* --- Mahzen canavarları --- */
  L('sican', [
    '................',
    '................',
    '................',
    '................',
    '................',
    '........kk..kk..',
    '.......khhkkhhk.',
    '......khphhhhphk',
    'kpk..khhhhhxhhhk',
    '.kpkkhhhhhhhhkkk',
    '..kphhhhhHhhhhpk',
    '...khHHHhhhHhkk.',
    '...kHhhhhhhhhk..',
    '....kkHkkkHkk...',
    '......kk..kk....',
    '................'
  ]);
  L('yarasa', [
    '................',
    '................',
    '.kk..........kk.',
    'kqqk........kqqk',
    'kqqqk......kqqqk',
    'kqqqqk....kqqqqk',
    '.kqqqqkkkkqqqqk.',
    '..kqqqqMMqqqqk..',
    '...kqqMrMrMqqk..',
    '....kqMMMMMqk...',
    '.....kMwMwMk....',
    '......kMMMk.....',
    '.......kkk......',
    '................',
    '................',
    '................'
  ], { rows2: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '......kkkkkk....',
    '.....kqMMMMqk...',
    '...kkqqMrMrMqkk.',
    '..kqqqqMMMMMqqqk',
    '.kqqqqkMwMwMkqqk',
    'kqqqk..kMMMk.kqk',
    'kqk.....kkk...kk',
    '................',
    '................',
    '................',
    '................'
  ] });
  L('balcik', [
    '................',
    '................',
    '................',
    '................',
    '................',
    '......kkkkk.....',
    '....kk11111kk...',
    '...k1i1111111k..',
    '..k1i111111111k.',
    '..k11x1111x111k.',
    '.k1111111111112k',
    '.k111222111222k.',
    '.k11111111111k..',
    '..k2222222222k..',
    '...kkkkkkkkkk...',
    '................'
  ], { p: { 1: '#5ad15fd9', 2: '#2a8a3ad9' }, rows2: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....kkkkkkk....',
    '...kk1i11111kk..',
    '..k11i11111111k.',
    '.k111x1111x1111k',
    'k11111111111112k',
    'k11112221112221k',
    'k11111111111111k',
    '.k222222222222k.',
    '..kkkkkkkkkkkk..',
    '................'
  ] });
  L('goblin', [
    '................',
    '................',
    '...kk...........',
    '..knnkkkkk......',
    '..knnnnnnnk.....',
    '..kknrnnrnnk....',
    '...kxnnnxnnk....',
    '...knnnnnnk.k...',
    '....kwkwkk.ksk..',
    '...kknnnnkksk...',
    '..knknnnnnhhk...',
    '..kkkHhhHkhk....',
    '....khhhhhk.....',
    '....knkknk......',
    '....kkk.kkk.....',
    '................'
  ]);
  L('iskelet', [
    '................',
    '.....kkkkk......',
    '....keeeeek.....',
    '....keeeeeek..k.',
    '....kxekxekk.ksk',
    '....keeeeek..ksk',
    '.....kkxkk...ksk',
    '....kkeeekk..ksk',
    '...kekekeekek.k.',
    '...kekeeeeekek..',
    '...kekekeekekk..',
    '...kkkeeeekkk...',
    '.....keekek.....',
    '.....kekkek.....',
    '.....kkk.kkk....',
    '................'
  ]);

  /* --- Mağara canavarları --- */
  L('orumcek', [
    '................',
    '................',
    '................',
    '.k.....kk.....k.',
    '.kk...kqqk...kk.',
    '..kk.kqMMqk.kk..',
    '..kkkkqqqqkkkk..',
    '.kkqqqqrqqrqqkk.',
    'kkqqqqqqqqqqqqkk',
    'k.kqqqqqqqqqqk.k',
    '..kqqqqqqqqqqk..',
    '.k.kqqqqqqqqk.k.',
    '.k..kkkkkkkk..k.',
    'k..k..k..k..k..k',
    '...k...k..k..k..',
    '................'
  ]);
  L('goblin_okcu', [
    '................',
    '....kkkk........',
    '...khhhhk.......',
    '..khhhhhhk......',
    '..knnnnnnnk.k...',
    '..kknrnnrnnkwhk.',
    '...kxnnnxnnkwhk.',
    '...knnnnnnk.whk.',
    '....kkkkkkkkwhk.',
    '...khnnnnnhhhhk.',
    '..khknnnnnhkwhk.',
    '..kkkHhhHkk.whk.',
    '....khhhhhk.kwhk',
    '....knkknk...kk.',
    '....kkk.kkk.....',
    '................'
  ]);
  L('ork', [
    '................',
    '....kkkkkk......',
    '...kNnnnnnk.....',
    '...knnnnnnnk.k..',
    '..kknrnnnrnkkGk.',
    '..kxnnnxnnnnkGk.',
    '..knnnnnnnnkksk.',
    '...kwnnnnwkkssk.',
    '.kkknNnnNnkkGk..',
    'knnknnnnnnnkGk..',
    'knnknnnnnnnhhk..',
    'kkkkHHhhhhHkk...',
    '..knkhhhhhknk...',
    '..knkkhkkhkkk...',
    '..kkkkkk.kkk....',
    '................'
  ]);
  L('saman', [
    '................',
    '.......k...k....',
    '......krk.kyk...',
    '....kkkrkkknk...',
    '...keeeeeekknk..',
    '...kexeexekkhk..',
    '...keeeeeek.hk..',
    '....kxxxk..khk..',
    '...kklllkk.khk..',
    '..klkllllllhhk..',
    '..klkllllllkhk..',
    '..kkkHhhHk.khk..',
    '....kllllk.khk..',
    '....klkklk.kkk..',
    '....kkk.kkk.....',
    '................'
  ]);
  L('kurt', [
    '................',
    '................',
    '................',
    '................',
    '.........kk.kk..',
    '........kggkggk.',
    '.......kggggggxk',
    '.kk...kgGgggggkk',
    'kggk.kgggggggwwk',
    'kggkkgggggggggk.',
    '.kggggggGgggggk.',
    '..kggGGgggGgggk.',
    '...kGggggGgggk..',
    '...kkkGkkkGkk...',
    '....kk.kk.kk....',
    '................'
  ]);

  /* --- Mezar canavarları --- */
  L('zombi', [
    '................',
    '.....kkkkk......',
    '....k11111k.....',
    '....k1x11xk.....',
    '....k11111k.....',
    '....kk2x2kk.....',
    '...kkSSSSSkkkkk.',
    '..k1kSSsSSk1111k',
    '..k1kSSSSSk1kkk.',
    '..kkkSSsSSkk....',
    '....kSSSSSk.....',
    '....kkkkkkk.....',
    '....kGGkGGk.....',
    '....kGGk.GGk....',
    '....kkk..kkk....',
    '................'
  ], { p: { 1: '#8fb57a', 2: '#5c7f4c' } });
  L('hayalet', [
    '................',
    '................',
    '.....kkkkkk.....',
    '....kaaaaaak....',
    '...kaaaaaaaak...',
    '..kaaaxaaxaaak..',
    '..kaaaaaaaaaak..',
    '..kaaaaxxaaaak..',
    '..kaaaaaaaaaak..',
    '..kAaaaaaaaaAk..',
    '..kAAaaaaaaAAk..',
    '..kAAAAAAAAAAk..',
    '...kAAkAAkAAk...',
    '....kk.kk.kk....',
    '................',
    '................'
  ]);
  L('iskelet_buyucu', [
    '......kkk.......',
    '.....kqqqk......',
    '....kqqqqqk..k..',
    '....kkkkkkk.knk.',
    '....keeeeek.knk.',
    '....kxekxek..k..',
    '....keeeeek.khk.',
    '.....kkxkk..khk.',
    '...kkMMMMMkkkhk.',
    '..kekMMmMMkehhk.',
    '..kkkMMMMMkkkhk.',
    '....kMMmMMk.khk.',
    '....kMMMMMk.khk.',
    '....kqqqqqk.khk.',
    '....kkkkkkk.kkk.',
    '................'
  ]);
  L('gulyabani', [
    '................',
    '................',
    '......kkkkkk....',
    '.....k111111k...',
    '....k1w11w111k..',
    '....k111111111k.',
    '....kk2xxx2k1k..',
    '...kk111111kk...',
    '..k1k111111k11k.',
    '..k1k111111kk1k.',
    '..kkk111111k.wk.',
    '....k2222k..kwk.',
    '....k11k11k.k...',
    '....k1k.k1k.....',
    '....kkk.kkk.....',
    '................'
  ], { p: { 1: '#9b8fb0', 2: '#5f5476' } });
  L('tarikatci', [
    '................',
    '......kk........',
    '.....kRRk.......',
    '....kRRRRk......',
    '....kRdddRk.....',
    '....kdydydk.....',
    '....kRdddRk.....',
    '...kkRRRRRkk....',
    '..kRkRRRRRkRkk..',
    '..kRkRRrRRkRsk..',
    '..kkkRRRRRkkk...',
    '....kRRrRRk.....',
    '....kRRRRRk.....',
    '....kRRRRRk.....',
    '....kkkkkkk.....',
    '................'
  ]);

  /* --- Lav canavarları --- */
  L('ates_cini', [
    '......k...k.....',
    '.....kyk.kyk....',
    '....kyokkoyk....',
    '....koooooook...',
    '...kooyooyooook.',
    '...koxoooxoook..',
    '...koooooooook..',
    '...kooyyyyook...',
    '....kooooook....',
    '...kkOoooOkk....',
    '..kOkooooookOk..',
    '..kkkOoooOkkk...',
    '....kOOkOOk.....',
    '....kOk.kOk.....',
    '....kkk.kkk.....',
    '................'
  ], { rows2: [
    '.....k...k......',
    '....kyk.kyk.....',
    '....kyokkoyk....',
    '....kooooook....',
    '...koyooyoook...',
    '...koxoooxoook..',
    '...koooooooook..',
    '...kooyyyyook...',
    '....kooooook....',
    '...kkOoooOkk....',
    '..kOkooooookOk..',
    '..kkkOoooOkkk...',
    '....kOOkOOk.....',
    '....kOk.kOk.....',
    '....kkk.kkk.....',
    '................'
  ] });
  L('semender', [
    '................',
    '................',
    '................',
    '.......k........',
    '......kyk..k....',
    '.....kyoyk.kk.k.',
    '....kyooooykoyk.',
    '...koooooooooxk.',
    '.kkoooOooooooook',
    'kooOoooooOooookk',
    'koooooooooooook.',
    '.kkoOoooooOook..',
    '...kooooooook...',
    '...kkOkkkkOkk...',
    '....kk....kk....',
    '................'
  ]);
  L('golem', [
    '................',
    '....kkkkkkk.....',
    '...kGggggggk....',
    '...kgoggogggk...',
    '...kGgggggGgk...',
    '....kkkgkkk.....',
    '.kkkGggggggGkkk.',
    'kggkGgGggGgGkggk',
    'kgGkggggggggkGgk',
    'kggkgGggggGgkggk',
    'kkkkGggggggGkkkk',
    '...kgggGGgggk...',
    '...kGggkkgGgk...',
    '...kgggk.kggk...',
    '...kkkkk.kkkk...',
    '................'
  ]);
  L('alev_buyucu', [
    '.......k........',
    '......kRk.......',
    '.....kRRrk...k..',
    '....kRRrrRk.kyk.',
    '...kkkkkkkkkkyok',
    '....kTtxtxkkyok.',
    '....kTtttTk.kok.',
    '...kkRRrRRkkkhk.',
    '..kRkRrrrRkRkhk.',
    '..kRkRrrrRkRkhk.',
    '..kkkRRRRRkkkhk.',
    '....kRrRrRk.khk.',
    '....kRRRRRk.khk.',
    '....kRRRRRk.khk.',
    '....kkkkkkk.kkk.',
    '................'
  ]);
  L('cehennem_kopegi', [
    '................',
    '................',
    '....k.k...k.....',
    '...koyokk.kk.kk.',
    '..koyoyok.kdkdk.',
    '.kyoooooookddrdk',
    'kooyoooodddddddk',
    'koooooddddddddwk',
    '.kkoodddddddddk.',
    '.kdkdddddddddk..',
    'kdkkdddddddddk..',
    'kk.kddGdddGddk..',
    '...kdGkddkGdk...',
    '...kdk.kkkkdk...',
    '...kkk....kkk...',
    '................'
  ]);

  /* --- Buz canavarları --- */
  L('buz_trolu', [
    '....kkkkkkk.....',
    '...kcccccccck...',
    '..kcccccccccck..',
    '..kcwccbccbcck..',
    '..kcccccccccck..',
    '..kkwcccccwckk..',
    '.k.kcccccccck.k.',
    'kcckkCccccCkkcck',
    'kccckcccccckcCck',
    'kcCckcccccckcc.k',
    'kcc.kCccccCkkk..',
    'kkk.kccccccck...',
    '....kccckcccck..',
    '....kCckkkCck...',
    '....kkkk.kkkk...',
    '................'
  ]);
  L('ruh', [
    '................',
    '.....kkkkkk.....',
    '....k111111k....',
    '...k11111111k...',
    '..k1111111111k..',
    '..k11w1111w11k..',
    '..k11ww11ww11k..',
    '..k1111111111k..',
    '..k1111221111k..',
    '...k11111111k...',
    '..k1k111111k1k..',
    '.k2k1k1111k1k2k.',
    '.kk.k1k11k1k.kk.',
    '.....k.kk.k.....',
    '................',
    '................'
  ], { p: { 1: '#3b2a4acc', 2: '#5a3f7acc' } });
  L('kara_sovalye', [
    '......kk........',
    '.....krrk.......',
    '....kddddddk....',
    '...kdGGGGGGdk...',
    '...kdkkkkkkdk.k.',
    '...kdrkkkrkdkksk',
    '...kdkkkkkkdkksk',
    '..kkddddddkkkssk',
    'kGdkddGddddddssk',
    'kdrkdddddddddssk',
    'kGdkddddddkkyyyk',
    'kkk.kRRRRRk.kyk.',
    '....kddkddk.kkk.',
    '....kGdkkGdk....',
    '....kkkk.kkk....',
    '................'
  ]);
  L('minotor', [
    'kk...........kk.',
    'kek.........kek.',
    '.kek.kkkkkk.kek.',
    '.kekkhhhhhhkkek.',
    '..kkhhhhhhhhkk..',
    '..khhrhhhhrhhk..',
    '..khhhhhhhhhhk.k',
    '..kkhTTTTTThkkGk',
    '...kTxTTTxTk.kGk',
    '.kkkkTTTTTkkkksk',
    'khhkhhhhhhhhhssk',
    'khhkhhhHhhhhkGk.',
    'kkkkHHhhhhHHkGk.',
    '...khhhkkhhhkkk.',
    '...kkkk..kkkk...',
    '................'
  ]);
  L('ejder_yavrusu', [
    '................',
    '................',
    '...kk...........',
    '..kCCk.....kkk..',
    '..kCCCk...kCCCk.',
    '...kCCCk.kCCCCk.',
    '..kkkCCCkkCCCCCk',
    '.kccckCCCCCCxCCk',
    'kccccckCCCCCkkk.',
    '.kcccckCCCCCCk..',
    '..kkkkCcccCCk...',
    '....kCCccccCCk..',
    '....kCCCCCCCCk..',
    '....kCCkkkkCCk..',
    '....kkk....kkk..',
    '................'
  ]);

  /* --- Bosslar (32x32) --- */
  L('goblin_kral', [
    '................................',
    '..........k...k...k...k.........',
    '.........kyk.kyk.kyk.kyk........',
    '.........kyykkyykkyykkyyk.......',
    '.........kyyyyyyyyyyyyyyk.......',
    '.........kyyyryyyyyyryyyk.......',
    '.........kyyyyyyyyyyyyyyk.......',
    '.........kkkkkkkkkkkkkkkk.......',
    '.......kknnnnnnnnnnnnnnnkk......',
    '......knnnnnnnnnnnnnnnnnnnk.....',
    '.....knnnnrnnnnnnnnnnrnnnnnk....',
    '.....knnnxxnnnnnnnnnnxxnnnnk....',
    '.....knnnnnnnnnnnnnnnnnnnnnk.k..',
    '......knnnnnnnnnnnnnnnnnnnk.kek.',
    '......knnnnkkkkkkkkkknnnnk..kek.',
    '.......knnkwwkwwkwwkwwknk..khhk.',
    '........kknnnnnnnnnnnkk...khhhk.',
    '......kkkRRRRRRRRRRRRRkkk..khk..',
    '....kkRRkRRRrRRRRrRRRkRRkk.khk..',
    '...kRRRRkRRRRRRRRRRRRkRRRRkkhk..',
    '..kRRRRRkRRRRrRRrRRRRkRRRRkkhk..',
    '..kRRRRRkRRRRRRRRRRRRkRRRRkhhhk.',
    '.kRRRRRRkRRRRRRRRRRRRkRRRRkkhk..',
    '.kRRRRRRkRRRRRRRRRRRRkRRRRkkhk..',
    '.kRRRRRRkkHHHHHHHHHHkkRRRRk.khk.',
    '.kkRRRRRRkhhhhhhhhhhkRRRRRk.khk.',
    '..kkRRRRRkhhhhhhhhhhkRRRRk..khk.',
    '....kkkkkkhhhhkkhhhhkkkkk...khk.',
    '.........khhhhkkhhhhk.......kkk.',
    '.........kHHHHk.kHHHHk..........',
    '.........kkkkkk.kkkkkk..........',
    '................................'
  ], { big: true });
  L('lich', [
    '..............kkkk..............',
    '............kkqqqqkk............',
    '...........kqqqqqqqqk....kkk....',
    '..........kqqqqqqqqqqk..kCcCk...',
    '..........kqkkkkkkkkqk..kcccCk..',
    '..........kkeeeeeeeekk..kCcCk...',
    '..........keeeeeeeeeek...khk....',
    '..........keeCeeeeCeek...khk....',
    '..........keecceecceek...khk....',
    '..........keeeeeeeeeek...khk....',
    '..........keeekeekeeek...khk....',
    '...........keeekkeeek....khk....',
    '...........kkxexexexk....khk....',
    '............kkkkkkkk.....khk....',
    '..........kkqqqqqqqqkk...khk....',
    '........kkqqqqqqqqqqqqkk.khk....',
    '......kkqqqqqqqqqqqqqqqqkkhk....',
    '.....kqqqqkqqqqqqqqqqkqqqqhk....',
    '....kqqqqqkqqMqqqqMqqkqqqqhk....',
    '....keqqqqkqqqMqqMqqqkqqqqhk....',
    '....kEeqqqkqqqqMMqqqqkqqqehk....',
    '....kkeqqqkqqqqMMqqqqkqqehhk....',
    '.....kkqqqkqqqqqqqqqqkqqkkhk....',
    '......kkqqkqqqqqqqqqqkkk.khk....',
    '........kkqqqqqqqqqqqqk..khk....',
    '.........kqqqqqqqqqqqqk..khk....',
    '.........kqqqqqqqqqqqqk..khk....',
    '.........kqqqqqqqqqqqqk..khk....',
    '.........kqqqqqqqqqqqqk..khk....',
    '.........kqkqqkqqkqqkqk..khk....',
    '.........kkkkkkkkkkkkkk..kkk....',
    '................................'
  ], { big: true });
  L('ejderha', [
    '................................',
    '...........kk.......kk..........',
    '..........kyyk.....kyyk.........',
    '...........kyykkkkkkyyk.........',
    '...........kkrrrrrrrrk..........',
    '..........krrrrrrrrrrrrk........',
    '..........krryrrrrrryrrk........',
    '..........krrxrrrrrrxrrk........',
    '..........krrrrrrrrrrrrk........',
    '...........krrrrrrrrrrk.........',
    'kk..........krrkwkwkrrk......kk.',
    'kRkk.........kRRRRRRk......kkRk.',
    'kRRRkk.......kkrrrrkk....kkRRRk.',
    'kRRRRRkk...kkrrrrrrrrkk.kkRRRRk.',
    'kRRRRRRRkkkrrrrrrrrrrrrkkRRRRRk.',
    'kRRRRRRRRkrrrOOOOOOrrrrkRRRRRRk.',
    '.kRRRRRRRkrrOOooooOOrrrkRRRRRk..',
    '.kRRRRRRRkrrOooooooOrrrkRRRRRk..',
    '..kRRRRRRkrrOooooooOrrrkRRRRk...',
    '..kRRRRRRkrrOOooooOOrrrkRRRRk...',
    '...kRRRRkrrrrOOOOOOrrrrkRRRk....',
    '....kkkkkrrrrrrrrrrrrrrkkkk.....',
    '.........krrrrrrrrrrrrk.........',
    '........krrkrrrrrrrrkrrk........',
    '.......krrk.krrrrrrk.krrk.......',
    '......krrk..krrrrrrk..krrk......',
    '......kkk...kkrrrrkk...kkk......',
    '.............krrrrk.kk..........',
    '.............krrrrrkrrk.........',
    '..............krrrrrrk..........',
    '...............kkkkkk...........',
    '................................'
  ], { big: true });

  /* --- NPC --- */
  L('tuccar', [
    '................',
    '.....kkkkk......',
    '....kMmMmMk.....',
    '...kMmmmmmMk....',
    '...kkkkkkkkk....',
    '....kttxtxk.....',
    '....kTtttTk.....',
    '.....kkkkk......',
    '..kkkhlllhkkkk..',
    '.kllklllllkhhhk.',
    '.kllklllllkhHhk.',
    '.kkkklllllkhhhk.',
    '....kyyyyykkkk..',
    '....khhkhhk.....',
    '....kkk.kkk.....',
    '................'
  ]);

  /* --- Eşyalar --- */
  I('kilic', [
    '..............k.',
    '.............kwk',
    '............kwsk',
    '...........kwskk',
    '..........kwsk..',
    '.........kwsk...',
    '........kwsk....',
    '.......kwsk.....',
    '..kk..kwsk......',
    '..kykkwsk.......',
    '...kyyyk........',
    '...kkyk.........',
    '..khkkyk........',
    '.khhk.kk........',
    '.khk............',
    '.kk.............'
  ]);
  I('balta', [
    '..............k.',
    '.............khk',
    '........kkkkkhk.',
    '.......kssskhhk.',
    '......ksssskhk..',
    '.....kssssShk...',
    '....kssssSkhk...',
    '....kssssSkhk...',
    '....kSSSSkkhk...',
    '.....kkkkkhk....',
    '.........khk....',
    '........khk.....',
    '.......khk......',
    '......khk.......',
    '.....khk........',
    '.....kk.........'
  ]);
  I('hancer', [
    '................',
    '................',
    '...........kk...',
    '..........kwsk..',
    '.........kwssk..',
    '........kwssk...',
    '.......kwssk....',
    '......kwssk.....',
    '.....kwssk......',
    '...kkkwsk.......',
    '...kyyyk........',
    '...kkykk........',
    '..khkkyk........',
    '.khhk.kk........',
    '.khk............',
    '.kk.............'
  ]);
  I('topuz', [
    '.........k......',
    '.......kkgkk....',
    '......kggggggk..',
    '.....kggssssggk.',
    '....kkgsSSSSsgk.',
    '....kgsSSsSSsgkk',
    '...kkgsSsSsSsggk',
    '....kgsSSsSSsgk.',
    '....kkgsSSSSsgk.',
    '.....kggssssggk.',
    '....khkggggggk..',
    '...khhkkkgkkk...',
    '..khhk..........',
    '.khhk...........',
    '.khk............',
    '.kk.............'
  ]);
  I('mizrak', [
    '.............kk.',
    '............kwsk',
    '...........kwssk',
    '..........kwssk.',
    '..........kssk..',
    '.........kskk...',
    '........khk.....',
    '.......khk......',
    '......khk.......',
    '.....khk........',
    '....khk.........',
    '...khk..........',
    '..khk...........',
    '.khk............',
    'khk.............',
    'kk..............'
  ]);
  I('yay', [
    '......kkk.......',
    '.....khhhk......',
    '....khkkkhk.....',
    '...khk..kkhk....',
    '..khk...k.khk...',
    '..khk...k..khk..',
    '.khk....k...khk.',
    '.khk....k....khk',
    '.khk...kwk...khk',
    '.khk....k....khk',
    '.khk....k...khk.',
    '..khk...k..khk..',
    '..khk...k.khk...',
    '...khk..kkhk....',
    '....khkkkhk.....',
    '.....kkkkk......'
  ]);
  I('arbalet', [
    '.......kk.......',
    '......kwsk......',
    '......kssk......',
    '.kk...kssk...kk.',
    'khhk..kssk..khhk',
    'khhhk.kssk.khhhk',
    'kkhhhkkkkkkhhhkk',
    '.kkhhhhhhhhhhkk.',
    '..kkkkkhhkkkkk..',
    '......khhk......',
    '......khhk......',
    '......kkhhk.....',
    '.......khhk.....',
    '.......khhk.....',
    '.......kkkk.....',
    '................'
  ]);
  I('asa', [
    '..........kkk...',
    '.........kmmmk..',
    '........kmimmmk.',
    '........kmmmmmk.',
    '........kkmmmkk.',
    '.........khkhk..',
    '.........khhk...',
    '........khhk....',
    '.......khhk.....',
    '......khhk......',
    '.....khhk.......',
    '....khhk........',
    '...khhk.........',
    '..khhk..........',
    '.khhk...........',
    '.kkk............'
  ]);
  I('degnek', [
    '...........kk...',
    '..........kyyk..',
    '.........kyiyk..',
    '.........kkyk...',
    '........khkk....',
    '.......khhk.....',
    '......khlhk.....',
    '......khhk......',
    '.....khlhk......',
    '.....khhk.......',
    '....khlhk.......',
    '....khhk........',
    '...khlhk........',
    '...khhk.........',
    '..khhk..........',
    '..kkk...........'
  ]);
  I('cubbe', [
    '................',
    '.....kkkkkk.....',
    '....kBBkkBBk....',
    '...kBBBkkBBBk...',
    '..kBbBBBBBBbBk..',
    '..kBbBBBBBBbBk..',
    '..kBbBBBBBBbBk..',
    '..kkBBBBBBBBkk..',
    '...kBBBBBBBBk...',
    '...kBBbBBbBBk...',
    '...kBBbBBbBBk...',
    '...kBBBBBBBBk...',
    '..kBBBBBBBBBBk..',
    '..kBBBBBBBBBBk..',
    '..kkkkkkkkkkkk..',
    '................'
  ]);
  I('deri_zirh', [
    '................',
    '....kk....kk....',
    '...khhkkkkhhk...',
    '..khhhhkkhhhhk..',
    '..khlhhhhhhlhk..',
    '..kkhhhhhhhhkk..',
    '...khhHHHHhhk...',
    '...khhhHHhhhk...',
    '...khhHkkHhhk...',
    '...khhhkkhhhk...',
    '...khhHHHHhhk...',
    '...khhhhhhhhk...',
    '...kHhhhhhhHk...',
    '...kkkkkkkkkk...',
    '................',
    '................'
  ]);
  I('zincir_zirh', [
    '................',
    '....kk....kk....',
    '...kssksskssk...',
    '..ksSsSskSsSsk..',
    '..kSsSsSsSsSSk..',
    '..kkSsSsSsSskk..',
    '...ksSsSsSsSk...',
    '...kSsSsSsSsk...',
    '...ksSsSsSsSk...',
    '...kSsSsSsSsk...',
    '...ksSsSsSsSk...',
    '...kSsSsSsSsk...',
    '...ksSsSsSsSk...',
    '...kkkkkkkkkk...',
    '................',
    '................'
  ]);
  I('plaka_zirh', [
    '................',
    '....kk....kk....',
    '...kssksskssk...',
    '..kssssskssssk..',
    '..kisssssssssk..',
    '..kksssssssskk..',
    '...kssSSSSssk...',
    '...kssSyySssk...',
    '...kssSyySssk...',
    '...kssSSSSssk...',
    '...kSssssssSk...',
    '...kSSSkkSSSk...',
    '...kSSSk.SSSk...',
    '...kkkkk.kkkk...',
    '................',
    '................'
  ]);
  I('bere', [
    '................',
    '................',
    '................',
    '.......kk.......',
    '.....kkhhkk.....',
    '...kkhhhhhhkk...',
    '..khhhhhhhhhhk..',
    '..khhlhhhhhhhk..',
    '.khhhhhhhhhhhhk.',
    '.kHHHHHHHHHHHHk.',
    '..kkHHHHHHHHkk..',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
    '................'
  ]);
  I('migfer', [
    '................',
    '.......kk.......',
    '......krrk......',
    '.....kkrrkk.....',
    '....ksssssskk...',
    '...kssssssssSk..',
    '..kssssssssssSk.',
    '..kssssssssssSk.',
    '..kskkkkkkkkksk.',
    '..kskxxkkkxxksk.',
    '..kskkkkkkkkksk.',
    '..kSsssskkssSSk.',
    '...kSSSSkkSSSk..',
    '....kkkk..kkk...',
    '................',
    '................'
  ]);
  I('yuzuk', [
    '................',
    '................',
    '................',
    '......kkk.......',
    '.....kbbck......',
    '....kkbcckk.....',
    '...kyykkkkyyk...',
    '..kyyk....kyyk..',
    '..kyk......kyk..',
    '..kyk......kyk..',
    '..kYyk....kyYk..',
    '...kYyk..kyYk...',
    '....kYyyyyYk....',
    '.....kkkkkk.....',
    '................',
    '................'
  ]);
  I('kolye', [
    '................',
    '....kkkkkkkk....',
    '...kykkkkkkyk...',
    '..kyk......kyk..',
    '..kyk......kyk..',
    '..kyk......kyk..',
    '...kyk....kyk...',
    '....kyk..kyk....',
    '.....kykkyk.....',
    '......kyyk......',
    '......kkkk......',
    '.....krrrrk.....',
    '.....krirrk.....',
    '.....krrrRk.....',
    '......kRRk......',
    '.......kk.......'
  ]);
  const POTION = [
    '................',
    '......kkkk......',
    '.....kllllk.....',
    '......kllk......',
    '.....k3333k.....',
    '.....k3333k.....',
    '....k333333k....',
    '...k33333333k...',
    '..k3111111113k..',
    '..k1i11111111k..',
    '..k1i11111121k..',
    '..k1111111221k..',
    '..k1111112221k..',
    '...k12222222k...',
    '....kkkkkkkk....',
    '................'
  ];
  const POT_COL = {
    iksir_kirmizi: ['#e5383b', '#9d1b24'], iksir_mavi: ['#4ea8f5', '#1f5fb0'], iksir_yesil: ['#5ad15f', '#2a8a3a'],
    iksir_mor: ['#b393f7', '#6b3fd1'], iksir_sari: ['#ffd23f', '#d49a0b'], iksir_turuncu: ['#ff8c2b', '#d1480a']
  };
  Object.keys(POT_COL).forEach(id => I(id, POTION, { p: { 1: POT_COL[id][0], 2: POT_COL[id][1], 3: '#e6f4ffbb' } }));
  I('parsomen', [
    '................',
    '..kkkkkkkkkkk...',
    '.kllkeeeeeekllk.',
    '.klkeeeeeeeeklk.',
    '.kkkeEEEEEeekkk.',
    '...keeeeeeeek...',
    '...keEEEEEeek...',
    '...keeeeeeeek...',
    '...keEEEEeeek...',
    '...keeeeeeeek...',
    '...keEEEEEeek...',
    '...keeeeeeeek...',
    '.kkkeeeeeeeekkk.',
    '.klkeeeeeeeeklk.',
    '.kllkkkkkkkkllk.',
    '..kkk......kkk..'
  ]);
  I('altin', [
    '................',
    '................',
    '................',
    '.......kkkk.....',
    '.....kkyyyykk...',
    '....kyyyyyyyyk..',
    '...kyyyYYYyyyyk.',
    '...kyyyYyyYyyyk.',
    '..kkyyYyyyyyyykk',
    '.kyykyyYYYyyykyk',
    'kyyyykkkkkkkkyyk',
    'kyyYyyyyyyyyyYyk',
    'kyYyyyyyyyyyyyYk',
    '.kyyyyyyyyyyyyk.',
    '..kkkkkkkkkkkk..',
    '................'
  ]);
  I('anahtar', [
    '................',
    '................',
    '....kkkk........',
    '...kyyyyk.......',
    '..kyykkyyk......',
    '..kyk..kyk......',
    '..kyk..kyk......',
    '..kyykkyyk......',
    '...kyyyykk......',
    '....kkkyyk......',
    '......kyyk......',
    '......kyykk.....',
    '......kyyyyk....',
    '......kyykkk....',
    '......kyyyk.....',
    '......kkkkk.....'
  ]);
  I('yemek', [
    '................',
    '................',
    '....kkk.........',
    '...kkkkkk.......',
    '..kkeeeekkkk....',
    '..keeeeeeeekk...',
    '..kkeeelllllk...',
    '...kklllllllk...',
    '....kllllhllk...',
    '....klllhhlhk...',
    '....khlhhhhhk...',
    '....khhhhhhhk...',
    '.....kHhhhHk....',
    '......kkkkk.....',
    '................',
    '................'
  ]);

  /* --- Dekor / karo nesneleri --- */
  I('kapi', [
    'kkkkkkkkkkkkkkkk',
    'kHHkhhhhhhhhkHHk',
    'kHkhlhhhhhhlhkHk',
    'kkhhhhhhhhhhhhkk',
    'khhhhhhkhhhhhhhk',
    'khHHHHHkHHHHHhhk',
    'khhhhhhkhhhhhhhk',
    'khhhhhhkhhhhhhhk',
    'khhhhhhkhhhyyhhk',
    'khhhhhhkhhhkyhhk',
    'khHHHHHkHHHHHhhk',
    'khhhhhhkhhhhhhhk',
    'khhhhhhkhhhhhhhk',
    'khhhhhhkhhhhhhhk',
    'kHhhhhhkhhhhhhHk',
    'kkkkkkkkkkkkkkkk'
  ]);
  I('kapi_acik', [
    'kkkkkkkkkkkkkkkk',
    'kHHk........kHHk',
    'kHk..........kHk',
    'kk............kk',
    'k..............k',
    'k..............k',
    'k..............k',
    'k..............k',
    'k..............k',
    'k..............k',
    'k..............k',
    'k..............k',
    'k..............k',
    'k..............k',
    'kH............Hk',
    'kkkkkkkkkkkkkkkk'
  ]);
  I('merdiven', [
    'kkkkkkkkkkkkkkkk',
    'kggggggggggggggk',
    'kgkkkkkkkkkkkkgk',
    'kgkxxxxxxxxxxkgk',
    'kgkGGGGGGGGGGkgk',
    'kgkxxxxxxxxxxkgk',
    'kgkxxxxxxxxxxkgk',
    'kgkdGGGGGGGGdkgk',
    'kgkxxxxxxxxxxkgk',
    'kgkxxxxxxxxxxkgk',
    'kgkdGGGGGGGGdkgk',
    'kgkxxxxxxxxxxkgk',
    'kgkxxxxxxxxxxkgk',
    'kgkkkkkkkkkkkkgk',
    'kggggggggggggggk',
    'kkkkkkkkkkkkkkkk'
  ]);
  I('merdiven_yukari', [
    'kkkkkkkkkkkkkkkk',
    'kggggggggggggggk',
    'kgWWWWWWWWWWWWgk',
    'kgWgggggggggggSk',
    'kgWgWWWWWWWWggSk',
    'kgWgWgggggggSgSk',
    'kgWgWgWWWWWgSgSk',
    'kgWgWgWgggWgSgSk',
    'kgWgWgWgwwWgSgSk',
    'kgWgWgWgwwWgSgSk',
    'kgWgWgWWWWWgSgSk',
    'kgWgWgggggggSgSk',
    'kgWgSSSSSSSSSgSk',
    'kgWggggggggggSSk',
    'kgSSSSSSSSSSSSSk',
    'kkkkkkkkkkkkkkkk'
  ]);
  I('su', [
    'BBBBBBBBBBBBBBBB',
    'BBbbBBBBBBBBBBBB',
    'BbccbBBBBBBbbBBB',
    'BBbbBBBBBBbccbBB',
    'BBBBBBBBBBBbbBBB',
    'BBBBBBbbBBBBBBBB',
    'BBBBBbccbBBBBBBB',
    'BBBBBBbbBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BbbBBBBBBBBbbBBB',
    'bccbBBBBBBbccbBB',
    'BbbBBBBBBBBbbBBB',
    'BBBBBBbbBBBBBBBB',
    'BBBBBbccbBBBBBBB',
    'BBBBBBbbBBBBBBBB',
    'BBBBBBBBBBBBBBBB'
  ], { p: { B: '#1e4f8f', b: '#3f82c9' }, rows2: [
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBBbbBBBBBBBBBBB',
    'BBbccbBBBBBbbBBB',
    'BBBbbBBBBBbccbBB',
    'BBBBBBBBBBBbbBBB',
    'BBBBBBBbbBBBBBBB',
    'BBBBBBbccbBBBBBB',
    'BBBBBBBbbBBBBBBB',
    'BBBBBBBBBBBBBBBB',
    'BBbbBBBBBBBBbbBB',
    'BbccbBBBBBBbccbB',
    'BBbbBBBBBBBBbbBB',
    'BBBBBBBbbBBBBBBB',
    'BBBBBBbccbBBBBBB',
    'BBBBBBBbbBBBBBBB'
  ] });
  I('lav_havuz', [
    'OOOOOOOOOOOOOOOO',
    'OOooOOOOOOOOOOOO',
    'OoyyoOOOOOOooOOO',
    'OOooOOOOOOoyyoOO',
    'OOOOOOOOOOOooOOO',
    'OOOOOOooOOOOOOOO',
    'OOOOOoyyoOOOOOOO',
    'OOOOOOooOOOOOORO',
    'OOOOOOOOOOOOORRO',
    'OooOOOOOOOOooOOO',
    'oyyoOOOOOOoyyoOO',
    'OooOOOOOOOOooOOO',
    'OROOOOooOOOOOOOO',
    'ORROOoyyoOOOOOOO',
    'OOOOOOooOOOOOOOO',
    'OOOOOOOOOOOOOOOO'
  ], { p: { O: '#c43d0b', o: '#ff8c2b', y: '#ffd23f', R: '#8a1f08' }, rows2: [
    'OOOOOOOOOOOOOOOO',
    'OOOOOOOOOOOOOOOO',
    'OOOooOOOOOOOOOOO',
    'OOoyyoOOOOOooOOO',
    'OOOooOOOOOoyyoOO',
    'OOOOOOOOOOOooOOO',
    'OOOOOOOooOOOOOOO',
    'OOOOOOoyyoOOOORO',
    'OOOOOOOooOOOORRO',
    'OOOOOOOOOOOOOOOO',
    'OOooOOOOOOOOooOO',
    'OoyyoOOOOOOoyyoO',
    'OROooOOOOOOOooOO',
    'ORROOOOooOOOOOOO',
    'OOOOOOoyyoOOOOOO',
    'OOOOOOOooOOOOOOO'
  ] });
  I('tuzak', [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kGGGGGGGGGGGGk.',
    '.kGkGkGkGkGkGGk.',
    '.kGsGsGsGsGsGGk.',
    '.kGsGsGsGsGsGGk.',
    '.kGsGsGsGsGsGGk.',
    '.kGsGsGsGsGsGGk.',
    '.kGsGsGsGsGsGGk.',
    '.kGkGkGkGkGkGGk.',
    '.kGGGGGGGGGGGGk.',
    '.kddddddddddddk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................'
  ]);
  I('tuzak_gizli', [
    '................',
    '................',
    '................',
    '................',
    '....k......k....',
    '................',
    '................',
    '......k.........',
    '.........k......',
    '................',
    '................',
    '....k......k....',
    '................',
    '................',
    '................',
    '................'
  ], { p: { k: '#1a122355' } });
  I('sandik', [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.khhhhhhhhhhhhk.',
    '.khyhhhhhhhhyhk.',
    '.khhhhhhhhhhhhk.',
    '.kkkkkkyykkkkkk.',
    '.kHHHHHkykHHHHk.',
    '.kHyHHHkkkHHyHk.',
    '.kHHHHHHHHHHHHk.',
    '.kHHHHHHHHHHHHk.',
    '.kHyHHHHHHHHyHk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................'
  ]);
  I('sandik_acik', [
    '................',
    '..kkkkkkkkkkkk..',
    '.kHHHHHHHHHHHHk.',
    '.kHyHHHHHHHHyHk.',
    '.kHHHHHHHHHHHHk.',
    '.kkkkkkkkkkkkkk.',
    '.kxxxxxxxxxxxxk.',
    '.kxxxyyxxyxxxxk.',
    '.kkkkkkkkkkkkkk.',
    '.kHHHHHkykHHHHk.',
    '.kHyHHHHHHHHyHk.',
    '.kHHHHHHHHHHHHk.',
    '.kHyHHHHHHHHyHk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................'
  ]);
  I('mesale', [
    '................',
    '......k.k.......',
    '.....kykyk......',
    '.....kyoyk......',
    '....kyoooyk.....',
    '....kooooook....',
    '....kooyook.....',
    '.....koook......',
    '.....kkkkk......',
    '.....khhhk......',
    '......khk.......',
    '......khk.......',
    '......khk.......',
    '......khk.......',
    '......kkk.......',
    '................'
  ], { anim: 'bob', rows2: [
    '................',
    '.......k........',
    '......kyk.k.....',
    '.....kyoykyk....',
    '....kyooooyk....',
    '....kooyoook....',
    '....kooooook....',
    '.....koook......',
    '.....kkkkk......',
    '.....khhhk......',
    '......khk.......',
    '......khk.......',
    '......khk.......',
    '......khk.......',
    '......kkk.......',
    '................'
  ] });
  I('kemik', [
    '................',
    '................',
    '................',
    '................',
    '..kk............',
    '.keekk..........',
    '.keeeek.........',
    '..kkeeek........',
    '....keeek.......',
    '.....keeek......',
    '......keeek..kk.',
    '.......keeekkeek',
    '........keeeeeek',
    '.........kkeeek.',
    '...........kkk..',
    '................'
  ]);
  I('fici', [
    '................',
    '................',
    '....kkkkkkkk....',
    '...khhhhhhhhk...',
    '..kSSSSSSSSSSk..',
    '..khlhhhhhhhhk..',
    '..khlhhhhhhhhk..',
    '..kSSSSSSSSSSk..',
    '..khlhhhhhhhhk..',
    '..khlhhhhhhhhk..',
    '..kSSSSSSSSSSk..',
    '..khhhhhhhhhhk..',
    '...kHhhhhhhHk...',
    '....kkkkkkkk....',
    '................',
    '................'
  ]);
  I('sandik_kirik', [
    '................',
    '................',
    '................',
    '................',
    '..kkkk....kkkk..',
    '.khhhhk..khhhhk.',
    '.khhhhhkkhhhhhk.',
    '.kkkkhhkkhhkkkk.',
    '.kHHkkkk.kkkHHk.',
    '.kHHHHk...kHHHk.',
    '.kHHHHHk.kHHHHk.',
    '.kHHHHHHkHHHHHk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................'
  ]);
  I('ot', [
    '................',
    '................',
    '................',
    '................',
    '................',
    '......k.........',
    '.k...knk..k.....',
    '.kn..knk.knk....',
    '.knk.knk.knk.k..',
    '..knkknkknk.kn..',
    '..knknnknnkknk..',
    '...knnnnnnknnk..',
    '....knNnNnNnk...',
    '.....kNNNNNk....',
    '......kkkkk.....',
    '................'
  ]);
  I('kristal', [
    '................',
    '.......kk.......',
    '......kmck......',
    '......kmmck.....',
    '.....kmimmck....',
    '.....kmimmck....',
    '..kk.kmmmmmk.k..',
    '.kmck.kmmmk.kck.',
    '.kmmckkmmmkkmck.',
    '.kmmmkmmmmmkmmk.',
    '.kMmmkmMmmMkmMk.',
    '..kMmkMmmmMkMk..',
    '..kkMkMMMMMkk...',
    '....kkkkkkkk....',
    '................',
    '................'
  ]);
  I('sunak', [
    '................',
    '.......kk.......',
    '......kmmk......',
    '......kmmk......',
    '....kkkmmkkk....',
    '...kgggggggggk..',
    '...kgWWWWWWWgk..',
    '...kGgggggggGk..',
    '....kkGgggGkk...',
    '.....kggggk.....',
    '.....kgGggk.....',
    '.....kggggk.....',
    '...kkkggggkkk...',
    '..kgggggggggggk.',
    '..kGGGGGGGGGGGk.',
    '...kkkkkkkkkkk..'
  ]);
  I('ucurum', [
    'dddddddddddddddd',
    'dxxxxxxxxxxxxxxd',
    'dxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxx'
  ], { p: { d: '#1c1a26', x: '#07060c' } });

  /* ---------- Tema karoları (şablon + tema paleti) ----------
     Duvar: T/t üst kenar (açık, 3/4 bakış), F yüz, f yüz gölgesi, L derz, k alt kontur, m/c tema aksanı
     Zemin: F taban, f koyu benek, g açık benek, L çatlak/çizgi */
  const WALL_TPL = {
    tugla: [ // mahzen, mezar
      'TTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTT',
      'tttttttttttttttt',
      'LLLLLLLLLLLLLLLL',
      'FFFFFFFLFFFFFFFL',
      'FFfFFFFLFFmFFFFL',
      'FFFFFFfLFFFFFfFL',
      'LLLLLLLLLLLLLLLL',
      'FFFLFFFFFFFLFFFF',
      'FfFLFFFFmFFLFFfF',
      'FFFLFFfFFFFLFFFF',
      'LLLLLLLLLLLLLLLL',
      'FFFFFFFLFFFFFFFL',
      'FmFFfFFLFFFFfFFL',
      'FFFFFFFLFFFFFFFL',
      'kkkkkkkkkkkkkkkk'
    ],
    kaya: [ // mağara
      'TTTTTTTTTTTTTTTT',
      'TTTTTTtTTTTTTTTT',
      'tttttttttttttttt',
      'LLLLLLLLLLLLLLLL',
      'FFFFfLFFFFFFFLFF',
      'FFFFFLFFmFFFFLFF',
      'FLLLLFFFFFfFFFLL',
      'FFFFFFFLLLLLFFFF',
      'FFfFFFFFFFFFLFFF',
      'LLLLFFFmFFFFLFFF',
      'FFFFLLLLFFFFFLFF',
      'FFFFFFFFLLLLLFFF',
      'FFLLLFfFFFFFFFFL',
      'FFFFFLLLLFmFFFLF',
      'FfFFFFFFFLLLLLFF',
      'kkkkkkkkkkkkkkkk'
    ],
    catlak: [ // lav
      'TTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTT',
      'tttttttttttttttt',
      'FFFFFFFFFFFFFFFF',
      'FFFcFFFFFFFFFFFF',
      'FFFFcFFFFFFccFFF',
      'FFFFFcFFFFcFFcFF',
      'FFFFFFcFFcFFFFFF',
      'FfFFFFFccFFFFFFF',
      'FFFFFFcFFFFfFFFF',
      'FFFFFcFFFFFFFFFF',
      'FFFFcFFFFFFFFFcF',
      'FFFcFFFfFFFFFcFF',
      'FFcFFFFFFFFFcFFF',
      'FFFFFFFFFFFcFFFF',
      'kkkkkkkkkkkkkkkk'
    ],
    buz: [ // buz
      'TTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTT',
      'tttttttttttttttt',
      'LLLLLLLLLLLLLLLL',
      'FFFFFFFFFLFFFFFF',
      'FmFFFFFFFLFFmFFF',
      'FFmFFFFFFLFFFmFF',
      'FFFFFFFFFLFFFFFF',
      'LLLLLLLLLLLLLLLL',
      'FFFFFLFFFFFFFFFF',
      'FmFFFLFFFFmFFFFF',
      'FFmFFLFFFFFmFFFF',
      'FFFFFLFFFFFFFFFF',
      'FFFFFLFFFFFFFFFF',
      'LLLLLLLLLLLLLLLL',
      'kkkkkkkkkkkkkkkk'
    ]
  };
  const FLOOR_TPL = [
    [
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFfFFFF',
      'FFgFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFfFFFFFFFF',
      'FFFFFFFFFFFFFFgF',
      'FFFFFFFFFFFFFFFF',
      'FfFFFFFFFFFFFFFF',
      'FFFFFFFFFFfFFFFF',
      'FFFFFgFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFfFF',
      'FFFFFFFFFFFFFFFF',
      'FFFfFFFFFgFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF'
    ],
    [
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFgFFFFF',
      'FFFFFLLFFFFFFFFF',
      'FFFFLFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFfFF',
      'FFgFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFfFFFFFFFF',
      'FFFFFFFFFFFLLFFF',
      'FFFFFFFFFFLFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFfFFFFFFFFFFgFF',
      'FFFFFFFFFFFFFFFF'
    ],
    [
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFfFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFF'
    ]
  ];
  const THEMES = {
    mahzen: { wall: 'tugla', wp: { T: '#a98462', t: '#8d6b4b', F: '#6e4c31', f: '#5a3b24', L: '#3d2616', m: '#5a3b24', k: '#2a1a10' },
      fp: { F: '#4a3426', f: '#3d2a1e', g: '#59402f', L: '#3a2819' } },
    magara: { wall: 'kaya', wp: { T: '#8f8aa3', t: '#746f88', F: '#5a566d', f: '#4a4659', L: '#36334a', m: '#6b6584', k: '#241f33' },
      fp: { F: '#3f3b4e', f: '#34303f', g: '#4b4760', L: '#2d2a3a' } },
    mezar: { wall: 'tugla', wp: { T: '#8ea08c', t: '#748670', F: '#5b6b5a', f: '#4a5848', L: '#303c30', m: '#4f9a47', k: '#1d2820' },
      fp: { F: '#3c473c', f: '#303a30', g: '#4a7a46', L: '#2a332a' } },
    lav: { wall: 'catlak', wp: { T: '#7a3a34', t: '#5e2a26', F: '#3a1f1f', f: '#2c1616', L: '#2c1616', c: '#ff7a2b', m: '#3a1f1f', k: '#1a0c0c' },
      fp: { F: '#2b1c1c', f: '#1f1313', g: '#3a2626', L: '#b8431a' } },
    buz: { wall: 'buz', wp: { T: '#f1fbff', t: '#cfeefb', F: '#9ed6f0', f: '#86c3e3', L: '#5fa6cf', m: '#ffffff', k: '#3a6f91' },
      fp: { F: '#bfe3f4', f: '#a7d2e9', g: '#ecf8fe', L: '#93c4de' } }
  };
  Object.keys(THEMES).forEach(th => {
    const d = THEMES[th];
    I('duvar_' + th, WALL_TPL[d.wall], { p: d.wp });
    I('zemin_' + th, FLOOR_TPL[0], { p: d.fp });
    I('zemin_' + th + '#1', FLOOR_TPL[1], { p: d.fp, hidden: true });
    I('zemin_' + th + '#2', FLOOR_TPL[2], { p: d.fp, hidden: true });
  });

  /* ---------- Atlas oluşturma ---------- */
  const atlas = {};   // id -> { f: [canvas0, canvas1], n: 16|32 }
  const cache = {};   // varyant önbelleği
  const tileCache = {};
  let ready = false;

  const parseColor = hex => {
    const n = hex.length;
    const v = parseInt(hex.slice(1), 16);
    if (n === 9) return [v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255];
    return [v >> 16 & 255, v >> 8 & 255, v & 255, 255];
  };
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  function rasterize(rows, pal, n) {
    const c = mkCanvas(n, n);
    const g = c.getContext('2d');
    const img = g.createImageData(n, n);
    const d = img.data;
    const cols = {};
    for (let y = 0; y < n; y++) {
      const row = rows[y] || '';
      for (let x = 0; x < n; x++) {
        const ch = row[x] || '.';
        if (ch === '.') continue;
        let col = cols[ch];
        if (!col) { const hex = pal[ch]; if (!hex) continue; col = cols[ch] = parseColor(hex); }
        const o = (y * n + x) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = col[3];
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // 2. kare: açıkça verilmişse o, yoksa gövdeyi 1px yukarı kaydır (hafif zıplama)
  function frame2(def, n) {
    if (def.rows2) return def.rows2;
    if (def.anim === 'none') return def.rows;
    const r = def.rows.slice(1);
    r.push('');
    return r;
  }

  function build(id) {
    const def = SPR[id];
    const n = def.big ? 32 : 16;
    const pal = def.p ? Object.assign({}, PAL, def.p) : PAL;
    const f0 = rasterize(def.rows, pal, n);
    const f1 = def.anim === 'none' && !def.rows2 ? f0 : rasterize(frame2(def, n), pal, n);
    atlas[id] = { f: [f0, f1], n: n };
  }

  function init() {
    if (ready) return;
    Object.keys(SPR).forEach(build);
    ready = true;
  }

  // Varyant: flip / tint / outline birleşimi (tembel, önbellekli)
  function variant(id, frame, flip, tint, outline) {
    const key = id + '|' + frame + '|' + (flip ? 1 : 0) + '|' + (tint || '') + '|' + (outline || '');
    let c = cache[key];
    if (c) return c;
    const a = atlas[id];
    const n = a.n;
    const src = a.f[frame];
    const pad = outline ? 1 : 0;
    c = mkCanvas(n + pad * 2, n + pad * 2);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (outline) {
      // 4 yönde kaydırılmış kopyalar -> kontur rengiyle boya
      const tmp = mkCanvas(n + 2, n + 2);
      const tg = tmp.getContext('2d');
      [[0, 1], [2, 1], [1, 0], [1, 2]].forEach(o => tg.drawImage(src, o[0], o[1]));
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = outline;
      tg.fillRect(0, 0, n + 2, n + 2);
      g.drawImage(tmp, 0, 0);
    }
    if (flip) { g.save(); g.translate(c.width, 0); g.scale(-1, 1); }
    if (tint) {
      const tmp2 = mkCanvas(n, n);
      const t2 = tmp2.getContext('2d');
      t2.drawImage(src, 0, 0);
      t2.globalCompositeOperation = 'source-atop';
      t2.fillStyle = tint;
      t2.fillRect(0, 0, n, n);
      g.drawImage(tmp2, pad, pad);
    } else {
      g.drawImage(src, pad, pad);
    }
    if (flip) g.restore();
    c._pad = pad;
    cache[key] = c;
    return c;
  }

  /* ---------- Genel API ---------- */
  function has(id) { return !!atlas[id]; }
  function big(id) { return !!(SPR[id] && SPR[id].big); }
  function ids() { return Object.keys(SPR).filter(id => !SPR[id].hidden); }

  // draw: tek drawImage. 32x32 sprite'lar karonun ortasına, alt hizalı ve 2x2 karo boyutunda çizilir.
  function draw(g, id, x, y, size, opts) {
    if (!ready) init();
    const a = atlas[id];
    if (!a) return;
    opts = opts || {};
    const frame = opts.frame ? 1 : 0;
    const c = variant(id, frame, !!opts.flip, opts.tint || null, opts.outline || null);
    const scale = size / 16;
    const pad = c._pad * scale;
    let px = x, py = y;
    if (a.n === 32) { px = x - size / 2; py = y - size; }
    const prevA = g.globalAlpha;
    if (opts.alpha != null && opts.alpha !== 1) g.globalAlpha = prevA * opts.alpha;
    g.imageSmoothingEnabled = false;
    g.drawImage(c, px - pad, py - pad, c.width * scale, c.height * scale);
    if (opts.alpha != null && opts.alpha !== 1) g.globalAlpha = prevA;
  }

  // Karo: tema + kod -> hazır birleştirilmiş 16x16 (zemin + üst nesne) önbellekten tek drawImage
  function tileSprite(themeId, code, variant) {
    const th = THEMES[themeId] ? themeId : 'mahzen';
    let v = 0;
    if (code === T.FLOOR) { const r = variant % 7; v = r < 4 ? 2 : (r < 6 ? 0 : 1); }
    else if (code === T.WATER || code === T.LAVA) v = variant % 2;
    const key = th + '|' + code + '|' + v;
    let c = tileCache[key];
    if (c) return c;
    c = mkCanvas(16, 16);
    const g = c.getContext('2d');
    const floor = v === 0 ? 'zemin_' + th : 'zemin_' + th + '#' + v;
    const put = id => { if (atlas[id]) g.drawImage(atlas[id].f[0], 0, 0); };
    switch (code) {
      case T.WALL: put('duvar_' + th); break;
      case T.FLOOR: put(floor); break;
      case T.DOOR: put('zemin_' + th); put('kapi'); break;
      case T.DOOR_OPEN: put('zemin_' + th); put('kapi_acik'); break;
      case T.STAIRS: put('zemin_' + th); put('merdiven'); break;
      case T.STAIRS_UP: put('zemin_' + th); put('merdiven_yukari'); break;
      case T.WATER: g.drawImage(atlas.su.f[v], 0, 0); break;
      case T.LAVA: g.drawImage(atlas.lav_havuz.f[v], 0, 0); break;
      case T.CHASM: put('ucurum'); break;
      default: put(floor);
    }
    tileCache[key] = c;
    return c;
  }

  function tile(g, themeId, code, x, y, size, variant) {
    if (!ready) init();
    const c = tileSprite(themeId, code, (variant | 0) >>> 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(c, x, y, size, size);
  }

  function icon(id, px) {
    if (!ready) init();
    const c = mkCanvas(px, px);
    const a = atlas[id];
    if (a) {
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(a.f[0], 0, 0, px, px);
    }
    return c;
  }

  // outerHTML ile DOM'a konacak yerler için: aynı ikonun dataURL hali (önbellekli)
  const urlCache = {};
  function iconUrl(id, px) {
    const key = id + '|' + px;
    if (urlCache[key] == null) {
      let u = '';
      try { u = icon(id, px).toDataURL('image/png'); } catch (e) { u = ''; }
      urlCache[key] = u;
    }
    return urlCache[key];
  }

  // Test yardımcısı: satır uzunluğu / bilinmeyen karakter sorunlarını listeler
  function lint() {
    const out = [];
    Object.keys(SPR).forEach(id => {
      const def = SPR[id];
      const n = def.big ? 32 : 16;
      const pal = def.p ? Object.assign({}, PAL, def.p) : PAL;
      [def.rows, def.rows2].forEach((rows, fi) => {
        if (!rows) return;
        if (rows.length !== n) out.push(id + ' kare' + fi + ': satır sayısı ' + rows.length);
        rows.forEach((r, y) => {
          if (r.length !== n) out.push(id + ' kare' + fi + ' satır ' + y + ': uzunluk ' + r.length);
          for (let x = 0; x < r.length; x++) if (r[x] !== '.' && !pal[r[x]]) out.push(id + ' kare' + fi + ' satır ' + y + ': bilinmeyen "' + r[x] + '"');
        });
      });
    });
    return out;
  }

  DG.art = { init, has, big, ids, draw, tile, icon, iconUrl, lint, themes: Object.keys(THEMES) };
})();
