/* Neon Koşucu - sonsuz koşu */
(function () {
  const U = Platform.util;
  Platform.register({
    id: 'runner', name: 'Neon Koşucu', gen: 'modern', genre: 'Refleks',
    colors: ['#ec4899', '#4c1d95'],
    desc: 'Neon şehirde koş, dikenlerin ve çukurların üzerinden zıpla, altınları topla.',
    help: '<ul><li><b>Dokun</b> veya <b>Boşluk / ↑</b>: zıpla. Havadayken bir kez daha dokunursan <b>çift zıplama</b>!</li><li>Kısa dokunuş alçak, uzun basış yüksek zıplatır.</li><li>Kutuların ve platformların <b>üstüne basabilirsin</b> ama yanına çarpma.</li><li>Dikenler ve çukurlar oyunu bitirir. Her altın +10 puan.</li></ul>',
    icon: '<rect x="4" y="44" width="56" height="3" fill="#22d3ee"/><circle cx="44" cy="20" r="11" fill="#fb7185"/><rect x="38" y="25" width="12" height="3" fill="#fde047"/><rect x="38" y="31" width="12" height="3" fill="#fde047"/><rect x="14" y="20" width="16" height="16" rx="3" fill="#0f172a" stroke="#22d3ee" stroke-width="2.5" transform="rotate(-15 22 28)"/><circle cx="25" cy="25" r="2" fill="#fff"/><path d="M40 44l5-9 5 9z" fill="#ec4899"/><path d="M50 44l5-9 5 9z" fill="#ec4899"/>',
    create(s) {
      const W = 360, H = 640, GROUND = 470, G = 2300, JUMP = -760, DJUMP = -640;
      const view = s.canvas(W, H);
      const g = view.g;
      const fx = new U.Particles();
      const pl = { x: 64, y: GROUND - 32, w: 28, h: 32, vy: 0, ground: true, jumps: 0, rot: 0 };
      let objs = [], speed = 280, dist = 0, coins = 0, score = 0, state = 'ready', deadT = 0, gapLeft = 260, t = 0, held = false;
      const trail = [];
      const bldg = [];
      for (let i = 0; i < 10; i++) bldg.push({ x: i * 44, h: U.rand(40, 150), w: U.rand(28, 44) });

      function jump() {
        if (state === 'ready') state = 'play';
        if (state !== 'play') return;
        if (pl.ground) { pl.vy = JUMP; pl.ground = false; pl.jumps = 1; s.sfx('jump'); }
        else if (pl.jumps < 2) { pl.vy = DJUMP; pl.jumps = 2; s.sfx('flap'); fx.burst(pl.x + pl.w / 2, pl.y + pl.h, '#22d3ee', 10, 120, 0.4, 3); }
      }
      function release() { if (pl.vy < -260) pl.vy = -260; }
      function coinArc(x0, n, baseY, arc) {
        for (let i = 0; i < n; i++) {
          const k = n > 1 ? i / (n - 1) : 0.5;
          objs.push({ type: 'coin', x: x0 + i * 26, y: baseY - Math.sin(k * Math.PI) * arc, got: false });
        }
      }
      function spawn() {
        const lvl = Math.min(1, dist / 9000);
        const x = W + 30;
        const r = Math.random();
        let width = 0;
        const choices = [];
        choices.push('spike', 'spike', 'box', 'coins');
        if (dist > 600) choices.push('pit', 'box2');
        if (dist > 1500) choices.push('tall', 'spike3', 'plat', 'pit');
        if (dist > 3000) choices.push('combo', 'plat', 'spike3');
        const c = U.pick(choices);
        if (c === 'spike') { const n = U.randi(1, 2); objs.push({ type: 'spike', x, w: n * 22, h: 24 }); width = n * 22; coinArc(x - 10, 3, GROUND - 70, 50); }
        else if (c === 'spike3') { objs.push({ type: 'spike', x, w: 66, h: 24 }); width = 66; coinArc(x, 3, GROUND - 100, 30); }
        else if (c === 'box') { objs.push({ type: 'box', x, w: 40, h: 40 }); width = 40; coinArc(x + 8, 1, GROUND - 70, 0); }
        else if (c === 'box2') { objs.push({ type: 'box', x, w: 40, h: 40 }, { type: 'box', x: x + 40, w: 40, h: 76 }); width = 80; coinArc(x + 50, 1, GROUND - 106, 0); }
        else if (c === 'tall') { objs.push({ type: 'box', x, w: 44, h: 86 }); width = 44; }
        else if (c === 'pit') { const w = U.rand(70, 95 + lvl * 30); objs.push({ type: 'pit', x, w }); width = w; coinArc(x, Math.max(2, Math.round(w / 30)), GROUND - 70, 50); }
        else if (c === 'plat') {
          objs.push({ type: 'spike', x, w: 132, h: 24 }, { type: 'plat', x: x + 10, y: GROUND - 104, w: 112, h: 14 });
          width = 132; coinArc(x + 20, 4, GROUND - 130, 0);
        } else if (c === 'combo') {
          objs.push({ type: 'box', x, w: 40, h: 46 }, { type: 'spike', x: x + 40, w: 44, h: 24 });
          width = 84; coinArc(x + 30, 3, GROUND - 110, 20);
        } else { coinArc(x, 5, GROUND - 40, 60); width = 130; }
        gapLeft = width + speed * U.rand(0.8, 1.3) + 110 - lvl * 40;
      }
      function die() {
        if (state !== 'play') return;
        state = 'dead'; deadT = 0;
        s.sfx('explode'); s.vibe(200);
        fx.burst(pl.x + pl.w / 2, pl.y + pl.h / 2, ['#22d3ee', '#ec4899', '#fde047', '#fff'], 40, 260, 0.9, 4);
      }
      s.on(view.cv, 'pointerdown', e => { if (s.active()) { e.preventDefault(); held = true; jump(); } });
      s.on(view.cv, 'pointerup', () => { if (held) { held = false; release(); } });
      s.on(view.cv, 'pointercancel', () => { held = false; });
      s.key(e => { if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && !e.repeat) { held = true; jump(); } });
      s.keyup(e => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { held = false; release(); } });

      s.loop(dt => {
        t += dt;
        fx.update(dt);
        if (state === 'ready') { pl.y = GROUND - pl.h; return; }
        if (state === 'dead') {
          deadT += dt;
          if (deadT > 1.1) { state = 'over'; s.over({ score, msg: Math.floor(dist / 10) + ' m koştun, ' + coins + ' altın topladın.' }); }
          return;
        }
        if (state !== 'play') return;
        speed = Math.min(540, 280 + dist / 40);
        const dx = speed * dt;
        dist += dx;
        for (const o of objs) o.x -= dx;
        objs = objs.filter(o => o.x + (o.w || 20) > -40);
        for (const b of bldg) { b.x -= dx * 0.25; if (b.x < -50) { b.x += 440; b.h = U.rand(40, 150); } }
        gapLeft -= dx;
        if (gapLeft <= 0) spawn();

        // fizik
        const prevBottom = pl.y + pl.h;
        pl.vy += G * dt;
        if (pl.vy > 1400) pl.vy = 1400;
        let ny = pl.y + pl.vy * dt;
        const L = pl.x + 4, R = pl.x + pl.w - 4;
        let landed = false;
        if (pl.vy >= 0) {
          const surfaces = [];
          const overPit = objs.some(o => o.type === 'pit' && L >= o.x && R <= o.x + o.w);
          if (!overPit) surfaces.push(GROUND);
          for (const o of objs) {
            if ((o.type === 'box' || o.type === 'plat') && R > o.x && L < o.x + o.w) surfaces.push(o.type === 'box' ? GROUND - o.h : o.y);
          }
          let best = Infinity;
          for (const sy of surfaces) if (prevBottom <= sy + 0.5 && ny + pl.h >= sy && sy < best) best = sy;
          if (best !== Infinity) { ny = best - pl.h; pl.vy = 0; landed = true; }
        }
        pl.y = ny;
        if (landed && !pl.ground) { fx.burst(pl.x + pl.w / 2, pl.y + pl.h, '#a5f3fc', 6, 80, 0.3, 2); }
        pl.ground = landed;
        if (landed) { pl.jumps = 0; pl.rot = Math.round(pl.rot / (Math.PI / 2)) * (Math.PI / 2); }
        else pl.rot += dt * 7;
        // çarpışmalar
        const px1 = pl.x + 3, px2 = pl.x + pl.w - 3, py1 = pl.y + 3, py2 = pl.y + pl.h - 1;
        for (const o of objs) {
          if (o.type === 'box') {
            const top = GROUND - o.h;
            if (px2 > o.x + 2 && px1 < o.x + o.w - 2 && py2 > top + 4 && py1 < GROUND) die();
          } else if (o.type === 'spike') {
            if (px2 > o.x + 5 && px1 < o.x + o.w - 5 && py2 > GROUND - o.h + 8) die();
          } else if (o.type === 'coin' && !o.got) {
            if (Math.abs(o.x - (pl.x + pl.w / 2)) < 20 && Math.abs(o.y - (pl.y + pl.h / 2)) < 24) {
              o.got = true; coins++;
              s.sfx('coin');
              fx.burst(o.x, o.y, ['#fde047', '#fff'], 8, 100, 0.35, 2);
            }
          }
        }
        if (pl.y > H + 40) die();
        if (pl.y + pl.h > GROUND + 40) die(); // çukura düştü
        const ns = Math.floor(dist / 10) + coins * 10;
        if (ns !== score) { score = ns; s.score(score); }
        trail.push({ x: pl.x + pl.w / 2, y: pl.y + pl.h / 2 });
        if (trail.length > 10) trail.shift();
        for (const tp of trail) tp.x -= dx;
      }, () => {
        const sky = g.createLinearGradient(0, 0, 0, GROUND);
        sky.addColorStop(0, '#0d0221'); sky.addColorStop(0.6, '#2a0a4a'); sky.addColorStop(1, '#ff2e88');
        g.fillStyle = sky; g.fillRect(0, 0, W, GROUND);
        // güneş
        const sx = W * 0.62, sy = GROUND - 120, sr = 86;
        const sun = g.createLinearGradient(0, sy - sr, 0, sy + sr);
        sun.addColorStop(0, '#fde047'); sun.addColorStop(1, '#f43f5e');
        g.save();
        g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.clip();
        g.fillStyle = sun; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
        g.fillStyle = '#2a0a4a';
        for (let i = 0; i < 7; i++) { const yy = sy + 6 + i * 13; g.fillRect(sx - sr, yy, sr * 2, 2 + i * 1.2); }
        g.restore();
        // binalar
        for (const b of bldg) {
          g.fillStyle = '#12052b';
          g.fillRect(b.x, GROUND - b.h, b.w, b.h);
          g.fillStyle = 'rgba(34,211,238,.35)';
          for (let wy = GROUND - b.h + 8; wy < GROUND - 10; wy += 14) for (let wx = b.x + 5; wx < b.x + b.w - 6; wx += 9) if ((wx * 7 + wy * 3) % 5 < 2) g.fillRect(wx, wy, 4, 5);
        }
        // zemin ızgarası
        g.fillStyle = '#0b0218'; g.fillRect(0, GROUND, W, H - GROUND);
        g.strokeStyle = 'rgba(236,72,153,.45)'; g.lineWidth = 1.5;
        const off = (dist * 0.6) % 40;
        for (let i = -12; i <= 12; i++) {
          const x0 = W / 2 + i * 40 - off;
          g.beginPath(); g.moveTo(W / 2 + (x0 - W / 2) * 0.3, GROUND); g.lineTo(W / 2 + (x0 - W / 2) * 2.4, H); g.stroke();
        }
        for (let k = 0; k < 8; k++) {
          const yy = GROUND + Math.pow((k + ((dist * 0.02) % 1)) / 8, 2) * (H - GROUND);
          g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke();
        }
        // çukurlar
        for (const o of objs) if (o.type === 'pit') {
          g.fillStyle = '#000'; g.fillRect(o.x, GROUND - 1, o.w, H - GROUND + 1);
          g.fillStyle = 'rgba(244,63,94,.6)'; g.fillRect(o.x, GROUND, 3, H - GROUND); g.fillRect(o.x + o.w - 3, GROUND, 3, H - GROUND);
        }
        // zemin çizgisi (çukurlarda kesik)
        g.strokeStyle = '#22d3ee'; g.lineWidth = 3; g.shadowColor = '#22d3ee'; g.shadowBlur = 10;
        const pits = objs.filter(o => o.type === 'pit').sort((a, b) => a.x - b.x);
        let cx = 0;
        g.beginPath();
        for (const p of pits) { if (p.x > cx) { g.moveTo(cx, GROUND); g.lineTo(p.x, GROUND); } cx = Math.max(cx, p.x + p.w); }
        if (cx < W) { g.moveTo(cx, GROUND); g.lineTo(W, GROUND); }
        g.stroke();
        g.shadowBlur = 0;
        // nesneler
        for (const o of objs) {
          if (o.type === 'spike') {
            g.fillStyle = '#ec4899'; g.shadowColor = '#ec4899'; g.shadowBlur = 10;
            const n = Math.round(o.w / 22);
            for (let i = 0; i < n; i++) {
              const x = o.x + i * (o.w / n);
              g.beginPath(); g.moveTo(x, GROUND); g.lineTo(x + o.w / n / 2, GROUND - o.h); g.lineTo(x + o.w / n, GROUND); g.closePath(); g.fill();
            }
            g.shadowBlur = 0;
          } else if (o.type === 'box') {
            g.fillStyle = '#1e1145';
            g.fillRect(o.x, GROUND - o.h, o.w, o.h);
            g.strokeStyle = '#a78bfa'; g.lineWidth = 2.5; g.shadowColor = '#a78bfa'; g.shadowBlur = 8;
            g.strokeRect(o.x + 1.5, GROUND - o.h + 1.5, o.w - 3, o.h - 3);
            g.shadowBlur = 0;
            g.strokeStyle = 'rgba(167,139,250,.35)'; g.lineWidth = 1.5;
            g.beginPath(); g.moveTo(o.x + 4, GROUND - o.h + 4); g.lineTo(o.x + o.w - 4, GROUND - 4); g.moveTo(o.x + o.w - 4, GROUND - o.h + 4); g.lineTo(o.x + 4, GROUND - 4); g.stroke();
          } else if (o.type === 'plat') {
            g.fillStyle = '#22d3ee'; g.shadowColor = '#22d3ee'; g.shadowBlur = 10;
            U.rr(g, o.x, o.y, o.w, o.h, 6); g.fill();
            g.shadowBlur = 0;
            g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(o.x + 6, o.y + 3, o.w - 12, 3);
          } else if (o.type === 'coin' && !o.got) {
            const w = Math.abs(Math.cos(t * 5 + o.x * 0.05)) * 9 + 2;
            g.fillStyle = '#fde047'; g.shadowColor = '#fde047'; g.shadowBlur = 8;
            g.beginPath(); g.ellipse(o.x, o.y, w, 10, 0, 0, Math.PI * 2); g.fill();
            g.shadowBlur = 0;
            g.fillStyle = '#ca8a04'; g.beginPath(); g.ellipse(o.x, o.y, w * 0.45, 5, 0, 0, Math.PI * 2); g.fill();
          }
        }
        // iz
        trail.forEach((tp, i) => { g.globalAlpha = i / trail.length * 0.35; g.fillStyle = '#22d3ee'; g.fillRect(tp.x - 8, tp.y - 8, 16, 16); });
        g.globalAlpha = 1;
        // oyuncu
        if (state !== 'dead' && state !== 'over') {
          g.save(); g.translate(pl.x + pl.w / 2, pl.y + pl.h / 2); g.rotate(pl.rot);
          g.fillStyle = '#0f172a'; g.strokeStyle = '#22d3ee'; g.lineWidth = 3; g.shadowColor = '#22d3ee'; g.shadowBlur = 14;
          U.rr(g, -pl.w / 2, -pl.h / 2, pl.w, pl.h, 6); g.fill(); g.stroke();
          g.shadowBlur = 0;
          g.fillStyle = '#fff'; g.fillRect(3, -7, 6, 6);
          g.fillStyle = '#ec4899'; g.fillRect(-10, 6, 20, 3);
          g.restore();
        }
        fx.draw(g);
        U.text(g, Math.floor(dist / 10) + ' m', 14, 24, 16, '#a5f3fc', 'left');
        U.text(g, '● ' + coins, W - 14, 24, 16, '#fde047', 'right');
        if (state === 'ready') {
          g.fillStyle = 'rgba(0,0,0,.4)'; U.rr(g, W / 2 - 130, 160, 260, 70, 18); g.fill();
          U.text(g, 'Koşmak için dokun', W / 2, 186, 20, '#fff');
          U.text(g, 'Havadayken tekrar dokun: çift zıplama', W / 2, 212, 12, '#f9a8d4', 'center', 600);
        }
      });
      return {};
    }
  });
})();
