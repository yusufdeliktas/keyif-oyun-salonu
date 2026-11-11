/* Keyif Oyun Salonu - platform çekirdeği (çevrimdışı, bağımlılıksız) */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------------- Kalıcı kayıt ---------------- */
  const PREFIX = 'keyif:';
  const Store = {
    get(k, d) {
      try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* yoksay */ } },
    clearAll(keep) {
      try {
        const del = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0 && (!keep || keep.indexOf(k.slice(PREFIX.length)) < 0)) del.push(k);
        }
        del.forEach(k => localStorage.removeItem(k));
      } catch (e) { /* yoksay */ }
    }
  };

  const Settings = Object.assign({ sound: true, vibe: true }, Store.get('settings', {}));
  const saveSettings = () => Store.set('settings', Settings);
  let Stats = Object.assign({ plays: {}, favs: [], last: null, total: 0 }, Store.get('stats', {}));
  const saveStats = () => Store.set('stats', Stats);

  /* ---------------- Yardımcılar ---------------- */
  const U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: a => a[Math.floor(Math.random() * a.length)],
    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    },
    easeOut: t => 1 - Math.pow(1 - t, 3),
    easeOutBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    rr(g, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    },
    fmtTime(s) {
      s = Math.max(0, Math.floor(s || 0));
      const m = Math.floor(s / 60);
      return m + ':' + String(s % 60).padStart(2, '0');
    },
    font(px, w) { return (w || 800) + ' ' + px + 'px system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif'; },
    text(g, str, x, y, px, color, align, w, base) {
      g.font = U.font(px, w);
      g.fillStyle = color;
      g.textAlign = align || 'center';
      g.textBaseline = base || 'middle';
      g.fillText(str, x, y);
    },
    hexA(hex, a) {
      const h = hex.replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
      return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
    }
  };

  /* Basit parçacık sistemi */
  class Particles {
    constructor() { this.list = []; }
    burst(x, y, color, n, spd, life, size, grav) {
      n = n || 12; spd = spd || 160; life = life || 0.6; size = size || 3;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.7);
        this.list.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.4), max: life,
          size: size * (0.6 + Math.random() * 0.8), color: Array.isArray(color) ? U.pick(color) : color, g: grav || 0
        });
      }
    }
    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.life -= dt;
        if (p.life <= 0) { L.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    draw(g) {
      for (const p of this.list) {
        g.globalAlpha = Math.max(0, p.life / p.max);
        g.fillStyle = p.color;
        g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      g.globalAlpha = 1;
    }
    clear() { this.list.length = 0; }
  }
  U.Particles = Particles;

  /* ---------------- Ses (WebAudio ile sentezlenir, dosya yok) ---------------- */
  const Sound = (function () {
    let ac = null, master = null, noiseBuf = null;
    function ensure() {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.32;
        master.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.8), ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* */ } }
      return ac;
    }
    function tone(freq, dur, type, vol, slide, delay) {
      const t = ac.currentTime + (delay || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    }
    function noise(dur, vol, freq, delay) {
      const t = ac.currentTime + (delay || 0);
      const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(freq || 1500, t);
      f.frequency.exponentialRampToValueAtTime(80, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(vol || 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t); s.stop(t + dur + 0.03);
    }
    const lib = {
      click: () => tone(720, 0.05, 'square', 0.15),
      move: () => tone(320, 0.04, 'triangle', 0.3),
      rotate: () => tone(540, 0.035, 'square', 0.14),
      eat: () => { tone(520, 0.07, 'square', 0.22); tone(780, 0.08, 'square', 0.2, 0, 0.06); },
      point: () => tone(880, 0.12, 'square', 0.18, 1.5),
      coin: () => { tone(988, 0.06, 'square', 0.18); tone(1319, 0.14, 'square', 0.18, 0, 0.06); },
      hit: () => tone(240, 0.06, 'square', 0.25),
      bounce: () => tone(460, 0.05, 'triangle', 0.4),
      shoot: () => tone(980, 0.07, 'sawtooth', 0.08, 0.35),
      explode: () => noise(0.35, 0.5, 2200),
      boom: () => { noise(0.7, 0.75, 900); tone(90, 0.5, 'sine', 0.5, 0.4); },
      lose: () => { tone(420, 0.16, 'square', 0.22, 0.85); tone(320, 0.16, 'square', 0.22, 0.85, 0.16); tone(220, 0.4, 'square', 0.22, 0.6, 0.32); },
      win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.17, 0, i * 0.1)); },
      line: () => { tone(620, 0.09, 'square', 0.2, 2); tone(930, 0.14, 'square', 0.17, 1.5, 0.07); },
      drop: () => tone(140, 0.07, 'square', 0.3),
      flip: () => tone(1300, 0.025, 'triangle', 0.25),
      pop: () => tone(680 + Math.random() * 200, 0.07, 'sine', 0.4, 2.2),
      jump: () => tone(330, 0.16, 'square', 0.17, 2.3),
      flap: () => tone(520, 0.08, 'triangle', 0.3, 1.7),
      power: () => { [440, 554, 659, 880].forEach((f, i) => tone(f, 0.09, 'square', 0.16, 0, i * 0.055)); },
      error: () => tone(130, 0.16, 'square', 0.22),
      merge: () => tone(420, 0.09, 'sine', 0.38, 1.9),
      place: () => tone(250, 0.06, 'triangle', 0.4),
      tick: () => tone(1100, 0.02, 'square', 0.08),
      check: () => { tone(880, 0.1, 'square', 0.18); tone(660, 0.14, 'square', 0.18, 0, 0.1); },
      capture: () => { tone(300, 0.05, 'square', 0.25); noise(0.1, 0.25, 3000); }
    };
    return {
      unlock() { if (Settings.sound) { try { ensure(); } catch (e) { /* */ } } },
      play(n) {
        if (!Settings.sound) return;
        try { if (!ensure()) return; const f = lib[n]; if (f) f(); } catch (e) { /* */ }
      }
    };
  })();

  function vibrate(ms) {
    if (!Settings.vibe) return;
    try {
      if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(Math.round(ms || 20));
      else if (navigator.vibrate) navigator.vibrate(ms || 20);
    } catch (e) { /* */ }
  }

  /* ---------------- SVG ikonları ---------------- */
  const IC = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.2" height="14" rx="1.5" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.5" fill="currentColor"/></svg>',
    help: '<svg viewBox="0 0 24 24"><path d="M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9v.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18.3" r="1.5" fill="currentColor"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2 1.2l-.3 2h-4l-.3-2a7.6 7.6 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-3L2.6 9.3l2-3.4 1.9.7a7.6 7.6 0 0 1 2-1.2l.3-2h4l.3 2a7.6 7.6 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="currentColor"/></svg>',
    starO: '<svg viewBox="0 0 24 24"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="#fff"/></svg>',
    dice: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2.1"/><circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.6" fill="currentColor"/></svg>'
  };

  /* ---------------- Platform ---------------- */
  const P = window.Platform = {
    games: [],
    util: U,
    store: Store,
    sound: Sound,
    vibrate,
    icons: IC,
    register(def) {
      const d = Object.assign({ gen: 'retro', genre: 'Arcade', colors: ['#7c5cff', '#3b2c99'], options: [], bestMode: 'high', scoreLabel: 'SKOR', bestLabel: 'EN İYİ' }, def);
      this.games.push(d);
    }
  };

  const UI = { ovOpen: false };
  let session = null;      // aktif oyun oturumu
  let curGame = null;      // açık olan oyun tanımı
  let curOpts = null;

  /* ---- skor ---- */
  function bestKeyOf(game, opts) { return 'best:' + game.id + (game.bestKey ? ':' + game.bestKey(opts) : ''); }
  function getBest(game, opts) { return Store.get(bestKeyOf(game, opts), null); }
  function fmtVal(game, v) {
    if (v == null) return '–';
    if (game.fmt === 'time') return U.fmtTime(v);
    return String(v);
  }
  function loadOpts(game) {
    const saved = Store.get('opts:' + game.id, {});
    const o = {};
    (game.options || []).forEach(op => {
      const ok = op.choices.some(c => c[0] === saved[op.key]);
      o[op.key] = ok ? saved[op.key] : (op.def != null ? op.def : op.choices[0][0]);
    });
    return o;
  }

  function setTopScore(txt) {
    const b = $('#gScore');
    if (b.textContent !== String(txt)) b.textContent = txt;
  }
  function setTopBest() {
    if (!curGame) return;
    const v = getBest(curGame, curOpts);
    $('#gBest').textContent = curGame.bestMode === 'wins' ? (v || 0) : fmtVal(curGame, v);
  }

  /* ---- oturum ---- */
  let restartFlag = false;
  function createSession(game, opts) {
    const stage = $('#stage');
    stage.innerHTML = '';
    const s = {
      game, opts, stage, alive: true, paused: false, ended: false,
      _l: [], _t: [], _i: [], _ro: [], _c: [], _raf: 0, _score: 0
    };
    s.active = () => s.alive && !s.paused && !UI.ovOpen && !s.ended;
    s.on = (target, type, fn, o) => { target.addEventListener(type, fn, o); s._l.push([target, type, fn, o]); };
    s.key = fn => s.on(window, 'keydown', e => { if (s.active()) fn(e); });
    s.keyup = fn => s.on(window, 'keyup', e => { if (s.alive) fn(e); });
    s.timeout = (fn, ms) => { const id = setTimeout(() => { if (s.alive) fn(); }, ms); s._t.push(id); return id; };
    s.every = (fn, ms) => { const id = setInterval(() => { if (s.active()) fn(); }, ms); s._i.push(id); return id; };
    s.cleanup = fn => s._c.push(fn);
    s.sfx = n => Sound.play(n);
    s.vibe = ms => vibrate(ms);
    s.toast = (m, ms) => toast(m, ms);
    s.store = {
      get: (k, d) => Store.get('g:' + game.id + ':' + k, d),
      set: (k, v) => Store.set('g:' + game.id + ':' + k, v)
    };
    s.score = n => {
      s._score = n;
      setTopScore(game.fmt === 'time' ? U.fmtTime(n) : n);
    };
    s.best = () => getBest(game, opts);
    s.restart = !!restartFlag;
    /* Oyun bitmeden rekor güncelle (sonsuz/ilerlemeli oyunlar için) */
    s.record = v => {
      if (game.bestMode !== 'high' || !(v > 0)) return false;
      const b = getBest(game, opts);
      if (b != null && v <= b) return false;
      Store.set(bestKeyOf(game, opts), v);
      setTopBest();
      return true;
    };
    /* Sahne oranına göre yükseklik seçen tuval (tam ekran oyunlar için) */
    s.canvasFill = (W, minH, maxH) => {
      const r = (stage.clientHeight || 640) / Math.max(1, stage.clientWidth || 360);
      return s.canvas(W, Math.round(U.clamp(W * r, minH, maxH)));
    };
    s.loop = (update, render) => {
      let last = performance.now();
      const frame = t => {
        if (!s.alive) return;
        s._raf = requestAnimationFrame(frame);
        let dt = (t - last) / 1000;
        last = t;
        if (!(dt > 0)) dt = 0;
        if (dt > 0.05) dt = 0.05;
        try {
          if (update && s.active()) update(dt);
          if (render) render(dt);
        } catch (err) { console.error(err); }
      };
      s._raf = requestAnimationFrame(frame);
    };
    s.canvas = (W, H, parent) => {
      const wrap = el('div', 'cv-wrap');
      const cv = el('canvas');
      wrap.appendChild(cv);
      (parent || stage).appendChild(wrap);
      const g = cv.getContext('2d');
      const v = { cv, g, W, H, wrap, scale: 1, onfit: null };
      v.fit = () => {
        const w = wrap.clientWidth - 8, h = wrap.clientHeight - 8;
        if (w < 4 || h < 4) return;
        const sc = Math.min(w / W, h / H);
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const cw = Math.floor(W * sc), ch = Math.floor(H * sc);
        cv.style.width = cw + 'px';
        cv.style.height = ch + 'px';
        cv.width = Math.max(1, Math.round(cw * dpr));
        cv.height = Math.max(1, Math.round(ch * dpr));
        g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
        v.scale = sc;
        if (v.onfit) v.onfit();
      };
      v.pt = e => {
        const r = cv.getBoundingClientRect();
        return { x: (e.clientX - r.left) * W / (r.width || 1), y: (e.clientY - r.top) * H / (r.height || 1) };
      };
      v.fit();
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => v.fit());
        ro.observe(wrap);
        s._ro.push(ro);
      } else s.on(window, 'resize', v.fit);
      s.on(cv, 'contextmenu', e => e.preventDefault());
      return v;
    };
    s.controls = (cls, parent) => {
      const d = el('div', 'ctrl ' + (cls || ''));
      (parent || stage).appendChild(d);
      return d;
    };
    s.button = (parent, label, fn, cls, opt) => {
      opt = opt || {};
      const b = el('button', 'btn ' + (cls || ''), label);
      parent.appendChild(b);
      let del = 0, rep = 0;
      const stop = () => { clearTimeout(del); clearInterval(rep); del = rep = 0; b.classList.remove('press'); };
      s.on(b, 'pointerdown', e => {
        e.preventDefault();
        if (!s.active() || b.disabled) return;
        Sound.unlock();
        stop();
        b.classList.add('press');
        fn();
        if (opt.repeat) {
          del = setTimeout(() => {
            rep = setInterval(() => { if (s.active()) fn(); else stop(); }, opt.rate || 55);
          }, opt.delay || 180);
        }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => s.on(b, t, stop));
      s.cleanup(stop);
      return b;
    };
    /* Kaydırma (swipe) algılayıcı */
    s.swipe = (target, onSwipe, onTap, opt) => {
      opt = opt || {};
      const min = opt.min || 22;
      let sx = 0, sy = 0, st = 0, down = false, fired = false, pid = null;
      s.on(target, 'pointerdown', e => {
        if (!s.active()) return;
        Sound.unlock();
        down = true; fired = false; pid = e.pointerId;
        sx = e.clientX; sy = e.clientY; st = performance.now();
      });
      s.on(target, 'pointermove', e => {
        if (!down || e.pointerId !== pid || !s.active()) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= min) {
          if (opt.continuous || !fired) {
            onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
            fired = true;
          }
          sx = e.clientX; sy = e.clientY;
        }
      });
      const end = e => {
        if (!down || e.pointerId !== pid) return;
        down = false;
        if (!fired && onTap && s.active() && performance.now() - st < 400) onTap(e);
      };
      s.on(target, 'pointerup', end);
      s.on(target, 'pointercancel', () => { down = false; });
    };

    s.over = o => {
      if (s.ended || !s.alive) return;
      o = o || {};
      s.ended = true;
      const g = game;
      const sc = o.score != null ? o.score : s._score;
      let best = getBest(g, opts), rec = false;
      const key = bestKeyOf(g, opts);
      if (g.bestMode === 'high') {
        if (sc > 0 && (best == null || sc > best)) { best = sc; rec = true; Store.set(key, sc); }
      } else if (g.bestMode === 'low') {
        if (o.win && sc > 0 && (best == null || sc < best)) { best = sc; rec = true; Store.set(key, sc); }
      } else if (g.bestMode === 'wins') {
        if (o.win && o.count !== false) { best = (best || 0) + 1; Store.set(key, best); }
      }
      setTopBest();
      s.timeout(() => showOver(o, sc, best, rec), o.delay != null ? o.delay : 250);
    };

    s.destroy = () => {
      if (!s.alive) return;
      s.alive = false;
      cancelAnimationFrame(s._raf);
      s._t.forEach(clearTimeout);
      s._i.forEach(clearInterval);
      s._ro.forEach(r => { try { r.disconnect(); } catch (e) { /* */ } });
      s._l.forEach(([t, ty, fn, o]) => t.removeEventListener(ty, fn, o));
      s._c.forEach(fn => { try { fn(); } catch (e) { /* */ } });
      try { if (s.inst && s.inst.destroy) s.inst.destroy(); } catch (e) { console.error(e); }
      stage.innerHTML = '';
    };
    return s;
  }

  function startGame(restart) {
    restartFlag = restart === true;
    if (session) session.destroy();
    hideOverlay();
    const game = curGame;
    session = createSession(game, curOpts);
    session.score(game.fmt === 'time' ? 0 : 0);
    if (game.bestMode === 'wins' || game.noScore) $('#boxScore').classList.add('hidden');
    else $('#boxScore').classList.remove('hidden');
    $('#gScoreLbl').textContent = game.scoreLabel;
    $('#gBestLbl').textContent = game.bestMode === 'wins' ? 'GALİBİYET' : game.bestLabel;
    setTopBest();
    Stats.plays[game.id] = (Stats.plays[game.id] || 0) + 1;
    Stats.total = (Stats.total || 0) + 1;
    Stats.last = game.id;
    saveStats();
    try {
      session.inst = game.create(session, curOpts) || {};
    } catch (err) {
      console.error(err);
      toast('Oyun başlatılamadı: ' + err.message, 4000);
    }
  }

  /* ---- overlay paneli ---- */
  function showOverlay(build) {
    const ov = $('#overlay'), pn = $('#panel');
    pn.innerHTML = '';
    build(pn);
    ov.classList.remove('hidden');
    UI.ovOpen = true;
    pn.scrollTop = 0;
  }
  function hideOverlay() {
    $('#overlay').classList.add('hidden');
    UI.ovOpen = false;
  }
  function btn(label, cls, fn) {
    const b = el('button', 'btn ' + (cls || ''), label);
    b.addEventListener('click', () => { Sound.unlock(); Sound.play('click'); fn(); });
    return b;
  }

  function iconBox(game, size) {
    const d = el('div', 'ov-icon');
    d.style.background = 'linear-gradient(150deg,' + game.colors[0] + ',' + game.colors[1] + ')';
    if (size) { d.style.width = d.style.height = size + 'px'; }
    d.innerHTML = '<svg viewBox="0 0 64 64">' + game.icon + '</svg>';
    return d;
  }

  function buildOptions(pn, game) {
    (game.options || []).forEach(op => {
      if (op.choices.length < 2) return;
      pn.appendChild(el('div', 'opt-label', op.label));
      const seg = el('div', 'seg');
      op.choices.forEach(([val, lbl]) => {
        const b = el('button', curOpts[op.key] === val ? 'on' : '', lbl);
        b.addEventListener('click', () => {
          Sound.play('click');
          curOpts[op.key] = val;
          Store.set('opts:' + game.id, curOpts);
          seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
          setTopBest();
        });
        seg.appendChild(b);
      });
      pn.appendChild(seg);
    });
  }

  function showStart() {
    const game = curGame;
    if (session) { session.destroy(); session = null; }
    setTopScore(game.fmt === 'time' ? '0:00' : 0);
    showOverlay(pn => {
      pn.appendChild(iconBox(game));
      pn.appendChild(el('h2', '', game.name));
      pn.appendChild(el('p', '', game.desc));
      buildOptions(pn, game);
      const help = el('div', 'help hidden', game.help);
      const bs = el('div', 'btns');
      bs.appendChild(btn('▶&nbsp; BAŞLA', 'primary', () => startGame(false)));
      const hb = btn('Nasıl Oynanır?', 'ghost', () => {
        help.classList.toggle('hidden');
        hb.innerHTML = help.classList.contains('hidden') ? 'Nasıl Oynanır?' : 'Kuralları Gizle';
      });
      bs.appendChild(hb);
      pn.appendChild(bs);
      pn.appendChild(help);
    });
  }

  function pauseGame() {
    if (!session || session.ended || UI.ovOpen) return;
    session.paused = true;
    showOverlay(pn => {
      pn.appendChild(el('div', 'ov-emoji', '⏸️'));
      pn.appendChild(el('h2', '', 'Duraklatıldı'));
      pn.appendChild(el('p', '', curGame.name));
      const bs = el('div', 'btns');
      bs.appendChild(btn('▶&nbsp; Devam Et', 'primary', resumeGame));
      bs.appendChild(btn('↻&nbsp; Yeniden Başlat', '', () => startGame(true)));
      if (curGame.options.length) bs.appendChild(btn('⚙&nbsp; Ayarları Değiştir', '', showStart));
      bs.appendChild(btn('Ana Menü', 'ghost', goHome));
      pn.appendChild(bs);
    });
  }
  function resumeGame() {
    hideOverlay();
    if (session) {
      session.paused = false;
      if (session.inst && session.inst.resume) session.inst.resume();
    }
  }
  function showHelp() {
    if (!curGame) return;
    const wasOpen = UI.ovOpen;
    if (wasOpen) return;
    if (session && !session.ended) session.paused = true;
    showOverlay(pn => {
      pn.appendChild(iconBox(curGame, 64));
      pn.appendChild(el('h2', '', curGame.name));
      pn.appendChild(el('div', 'help', curGame.help));
      const bs = el('div', 'btns');
      bs.appendChild(btn('Tamam', 'primary', () => {
        if (session && !session.ended) resumeGame(); else hideOverlay();
      }));
      pn.appendChild(bs);
    });
  }

  function showOver(o, sc, best, rec) {
    if (!session || session.game !== curGame) return;
    const game = curGame;
    showOverlay(pn => {
      pn.appendChild(el('div', 'ov-emoji', o.emoji || (o.win ? '🏆' : '💥')));
      pn.appendChild(el('h2', '', o.title || (o.win ? 'Tebrikler!' : 'Oyun Bitti')));
      if (o.msg) pn.appendChild(el('p', '', o.msg));
      if ((game.bestMode === 'high' || game.bestMode === 'low') && !(game.bestMode === 'low' && !o.win)) {
        pn.appendChild(el('div', 'big-score', fmtVal(game, sc)));
        pn.appendChild(el('div', 'sub', game.bestLabel + ': ' + fmtVal(game, best)));
        if (rec) pn.appendChild(el('div', 'record', '★ YENİ REKOR ★'));
      } else if (game.bestMode === 'wins') {
        pn.appendChild(el('div', 'sub', 'Toplam galibiyet: ' + (best || 0)));
      }
      const bs = el('div', 'btns');
      bs.appendChild(btn('↻&nbsp; Tekrar Oyna', 'primary', () => startGame(true)));
      if (game.options.length) bs.appendChild(btn('⚙&nbsp; Ayarları Değiştir', '', showStart));
      bs.appendChild(btn('Ana Menü', 'ghost', goHome));
      pn.appendChild(bs);
    });
    if (o.win) Sound.play('win');
  }

  /* ---- ekranlar ---- */
  function openGame(game) {
    curGame = game;
    curOpts = loadOpts(game);
    $('#home').classList.remove('active');
    $('#play').classList.add('active');
    $('#gTitle').textContent = game.name;
    $('#gScoreLbl').textContent = game.scoreLabel;
    $('#gBestLbl').textContent = game.bestMode === 'wins' ? 'GALİBİYET' : game.bestLabel;
    if (game.bestMode === 'wins' || game.noScore) $('#boxScore').classList.add('hidden');
    else $('#boxScore').classList.remove('hidden');
    setTopBest();
    showStart();
  }
  function goHome() {
    if (P._reloadOnHome) { location.reload(); return; }
    if (session) { session.destroy(); session = null; }
    hideOverlay();
    curGame = null;
    $('#play').classList.remove('active');
    $('#home').classList.add('active');
    renderHome();
  }

  let tab = Store.get('tab', 'all');
  function cardFor(game, i) {
    const c = el('div', 'card');
    c.style.setProperty('--c1', game.colors[0]);
    c.style.setProperty('--c2', game.colors[1]);
    c.style.animationDelay = (i * 0.03) + 's';
    const opts = loadOpts(game);
    const b = getBest(game, opts);
    let meta = game.genre;
    if (b != null) meta += ' · ' + (game.bestMode === 'wins' ? b + ' galibiyet' : '★ ' + fmtVal(game, b));
    const fav = Stats.favs.indexOf(game.id) >= 0;
    c.innerHTML =
      '<span class="badge">' + (game.gen === 'retro' ? 'Eski Nesil' : 'Yeni Nesil') + '</span>' +
      (game.isNew ? '<span class="badge new">' + (game.isNew === true ? 'Yeni' : game.isNew) + '</span>' : '') +
      '<svg class="ic" viewBox="0 0 64 64">' + game.icon + '</svg>' +
      '<h3>' + game.name + '</h3><div class="meta">' + meta + '</div>' +
      '<button class="fav' + (fav ? ' on' : '') + '" aria-label="Favori">' + (fav ? IC.star : IC.starO) + '</button>';
    c.addEventListener('click', e => {
      Sound.unlock();
      if (e.target.closest('.fav')) {
        e.stopPropagation();
        const k = Stats.favs.indexOf(game.id);
        if (k >= 0) Stats.favs.splice(k, 1); else Stats.favs.push(game.id);
        saveStats();
        Sound.play('click');
        if (tab === 'fav') renderHome();
        else {
          const on = Stats.favs.indexOf(game.id) >= 0;
          const fb = c.querySelector('.fav');
          fb.classList.toggle('on', on);
          fb.innerHTML = on ? IC.star : IC.starO;
          toast(on ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı', 1200);
        }
        return;
      }
      Sound.play('click');
      openGame(game);
    });
    return c;
  }

  function renderHome() {
    const grid = $('#grid'), empty = $('#empty');
    const q = ($('#search').value || '').trim().toLocaleLowerCase('tr');
    grid.innerHTML = '';
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    let list = P.games.filter(g => {
      if (tab === 'retro' && g.gen !== 'retro') return false;
      if (tab === 'modern' && g.gen !== 'modern') return false;
      if (tab === 'fav' && Stats.favs.indexOf(g.id) < 0) return false;
      if (q) {
        const hay = (g.name + ' ' + g.genre + ' ' + g.desc).toLocaleLowerCase('tr');
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    list.forEach((g, i) => grid.appendChild(cardFor(g, i)));
    if (!list.length) {
      empty.classList.remove('hidden');
      empty.textContent = tab === 'fav' && !q ? 'Henüz favori oyunun yok. Kartlardaki ☆ simgesine dokunarak ekleyebilirsin.' : 'Aramana uygun oyun bulunamadı.';
    } else empty.classList.add('hidden');

    const cont = $('#continue');
    cont.innerHTML = '';
    const last = P.games.find(g => g.id === Stats.last);
    if (last && !q) {
      const d = el('div', 'continue');
      d.innerHTML = '<div class="ci" style="background:linear-gradient(150deg,' + last.colors[0] + ',' + last.colors[1] + ')"><svg viewBox="0 0 64 64">' + last.icon + '</svg></div>' +
        '<div class="ct"><small>SON OYNADIĞIN</small><b>' + last.name + '</b></div><div class="go">' + IC.play + '</div>';
      d.addEventListener('click', () => { Sound.unlock(); Sound.play('click'); openGame(last); });
      cont.appendChild(d);
    }
    const retro = P.games.filter(g => g.gen === 'retro').length;
    $('#footInfo').textContent = P.games.length + ' oyun (' + retro + ' eski nesil, ' + (P.games.length - retro) + ' yeni nesil) · İnternetsiz çalışır · Toplam ' + (Stats.total || 0) + ' oyun oynandı';
  }

  /* ---- ayarlar ---- */
  function openModal(build) {
    const m = $('#modal'), pn = $('#mpanel');
    pn.innerHTML = '';
    build(pn);
    m.classList.remove('hidden');
  }
  function closeModal() { $('#modal').classList.add('hidden'); }

  function openSettings() {
    openModal(pn => {
      pn.appendChild(el('div', 'ov-emoji', '⚙️'));
      pn.appendChild(el('h2', '', 'Ayarlar'));
      const row = (title, sub, key) => {
        const r = el('div', 'set-row', '<div>' + title + '<small>' + sub + '</small></div>');
        const sw = el('button', 'switch' + (Settings[key] ? ' on' : ''));
        sw.setAttribute('aria-label', title);
        sw.addEventListener('click', () => {
          Settings[key] = !Settings[key];
          saveSettings();
          sw.classList.toggle('on', Settings[key]);
          Sound.unlock();
          Sound.play('click');
          if (key === 'vibe' && Settings.vibe) vibrate(40);
        });
        r.appendChild(sw);
        return r;
      };
      pn.appendChild(row('Ses efektleri', 'Oyun içi sesler', 'sound'));
      pn.appendChild(row('Titreşim', 'Dokunsal geri bildirim', 'vibe'));
      const played = Object.keys(Stats.plays).length;
      const sg = el('div', 'statgrid',
        '<div><b>' + (Stats.total || 0) + '</b><small>Oynanan oyun</small></div>' +
        '<div><b>' + played + ' / ' + P.games.length + '</b><small>Denenen oyun</small></div>' +
        '<div><b>' + Stats.favs.length + '</b><small>Favori</small></div>' +
        '<div><b>' + (favGameName() || '–') + '</b><small>En çok oynanan</small></div>');
      pn.appendChild(sg);
      const bs = el('div', 'btns');
      bs.appendChild(btn('Kapat', 'primary', closeModal));
      const rb = btn('Tüm rekorları ve istatistikleri sıfırla', 'ghost', () => {
        if (rb.dataset.sure) {
          Store.clearAll(['settings']);
          Stats = { plays: {}, favs: [], last: null, total: 0 };
          saveStats();
          closeModal();
          renderHome();
          toast('Tüm kayıtlar sıfırlandı');
        } else {
          rb.dataset.sure = '1';
          rb.innerHTML = 'Emin misin? Tekrar dokun';
          rb.style.color = '#ff8fa3';
        }
      });
      bs.appendChild(rb);
      pn.appendChild(bs);
      pn.appendChild(el('p', '', '<small>Keyif Oyun Salonu · Sürüm 1.2<br>Tüm oyunlar cihazında, internetsiz çalışır.</small>'));
    });
  }
  function favGameName() {
    let best = null, n = 0;
    for (const id in Stats.plays) if (Stats.plays[id] > n) { n = Stats.plays[id]; best = id; }
    const g = P.games.find(x => x.id === best);
    return g ? g.name : null;
  }

  let toastT = 0;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), ms || 1800);
  }

  /* Android geri tuşu: true dönerse olay işlendi demektir */
  P.back = function () {
    if (!$('#modal').classList.contains('hidden')) { closeModal(); return true; }
    if ($('#play').classList.contains('active')) {
      if (session && !session.ended && !UI.ovOpen && !session.paused) { pauseGame(); return true; }
      if (UI.ovOpen && session && session.paused && !session.ended) {
        const pn = $('#panel');
        if (pn && pn.querySelector('.help')) { resumeGame(); return true; }
      }
      goHome();
      return true;
    }
    return false;
  };
  P.onHide = function () {
    if ($('#play').classList.contains('active') && session && !session.ended && !UI.ovOpen) pauseGame();
  };

  /* ---- başlangıç ---- */
  function init() {
    $('#btnBack').innerHTML = IC.back;
    $('#btnPause').innerHTML = IC.pause;
    $('#btnHelp').innerHTML = IC.help;
    $('#btnSettings').innerHTML = IC.gear;
    $('#btnRandom').innerHTML = IC.dice;
    $('#btnBack').addEventListener('click', () => { Sound.play('click'); goHome(); });
    $('#btnPause').addEventListener('click', () => { Sound.unlock(); Sound.play('click'); pauseGame(); });
    $('#btnHelp').addEventListener('click', () => { Sound.play('click'); showHelp(); });
    $('#btnSettings').addEventListener('click', () => { Sound.unlock(); Sound.play('click'); openSettings(); });
    $('#btnRandom').addEventListener('click', () => { Sound.unlock(); Sound.play('click'); openGame(U.pick(P.games)); });
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
    $('#tabs').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      tab = b.dataset.tab;
      Store.set('tab', tab);
      Sound.unlock(); Sound.play('click');
      renderHome();
    });
    $('#search').addEventListener('input', renderHome);
    document.addEventListener('visibilitychange', () => { if (document.hidden) P.onHide(); });
    window.addEventListener('blur', () => P.onHide());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!P.back()) { /* ana menüde */ }
      } else if ((e.key === 'p' || e.key === 'P') && session && !UI.ovOpen && !session.ended) {
        pauseGame();
      }
      // oyun sırasında ok tuşları / boşluk sayfayı kaydırmasın
      if ($('#play').classList.contains('active') && [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) e.preventDefault();
    });
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
    // çift dokunma yakınlaştırmasını ve uzun basma menüsünü engelle
    document.addEventListener('dblclick', e => e.preventDefault());
    document.addEventListener('contextmenu', e => { if (!e.target.closest('input')) e.preventDefault(); });
    document.addEventListener('gesturestart', e => e.preventDefault());
    renderHome();
  }
  // Web sürümünde (http/https) çevrimdışı önbelleği etkinleştir. APK ve file:// açılışta gerek yok.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* yoksay */ }); });
    // Yeni sürüm yüklendiğinde: ana menüdeysek hemen, oyundaysak menüye dönünce yenile
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      if ($('#home').classList.contains('active')) location.reload();
      else { P._reloadOnHome = true; toast('Yeni sürüm hazır. Ana menüye dönünce yüklenecek.', 2600); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0);
})();
