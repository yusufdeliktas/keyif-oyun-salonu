/* Vızz! - tek dokunuşla uçma oyunu */
(function () {
  const U = Platform.util;
  Platform.register({
    id: 'bee', name: 'Vızz!', gen: 'modern', genre: 'Refleks',
    colors: ['#facc15', '#ea580c'],
    desc: 'Minik arıyı kanat çırptır, ağaç gövdeleri arasından geçir.',
    help: '<ul><li>Ekrana <b>dokun</b> (veya <b>Boşluk / ↑</b>) – arı kanat çırpıp yükselir.</li><li>Gövdelerin arasındaki boşluktan geçtikçe <b>+1 puan</b>.</li><li>Gövdelere ya da yere çarparsan oyun biter.</li><li>10 puan bronz, 25 gümüş, 50 altın, 100 elmas madalya!</li></ul>',
    icon: '<ellipse cx="34" cy="36" rx="16" ry="13" fill="#facc15"/><path d="M26 25v22M34 23v26M42 25v22" stroke="#1c1917" stroke-width="4"/><ellipse cx="30" cy="20" rx="9" ry="7" fill="#e0f2fe" opacity=".9"/><ellipse cx="42" cy="21" rx="7" ry="6" fill="#e0f2fe" opacity=".9"/><circle cx="46" cy="34" r="3" fill="#1c1917"/><path d="M17 37l-6 2 6 2z" fill="#1c1917"/>',
    create(s) {
      const W = 360, H = 640, GROUND = 580;
      const view = s.canvas(W, H);
      const g = view.g;
      const fx = new U.Particles();
      const bee = { x: 100, y: H * 0.42, vy: 0, r: 13, rot: 0 };
      let pipes = [], score = 0, state = 'ready', t = 0, deadT = 0, dist = 0, speed = 150, flapT = 0;
      const clouds = [];
      for (let i = 0; i < 6; i++) clouds.push({ x: Math.random() * W, y: U.rand(40, 260), s: U.rand(0.6, 1.3) });
      const hills = [];
      for (let i = 0; i < 8; i++) hills.push({ x: i * 70, h: U.rand(60, 120) });

      const GAP = () => Math.max(128, 162 - score * 0.9);
      function addPipe(x) {
        const gap = GAP();
        const top = U.rand(90, GROUND - gap - 70);
        pipes.push({ x, top, gap, passed: false });
      }
      function flap() {
        if (state === 'ready') { state = 'play'; addPipe(W + 60); }
        if (state !== 'play') return;
        bee.vy = -385;
        flapT = 0.18;
        s.sfx('flap');
      }
      function die() {
        if (state !== 'play') return;
        state = 'dead'; deadT = 0;
        s.sfx('hit'); s.vibe(180);
        s.timeout(() => s.sfx('lose'), 180);
        fx.burst(bee.x, bee.y, ['#facc15', '#fff', '#1c1917'], 24, 200, 0.7, 3);
      }
      function medal(sc) {
        if (sc >= 100) return '💎 Elmas madalya!';
        if (sc >= 50) return '🥇 Altın madalya!';
        if (sc >= 25) return '🥈 Gümüş madalya!';
        if (sc >= 10) return '🥉 Bronz madalya!';
        return 'Bir dahakine 10 puanı geç!';
      }
      s.on(view.cv, 'pointerdown', e => { if (s.active()) { e.preventDefault(); flap(); } });
      s.key(e => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { if (!e.repeat) flap(); } });

      s.loop(dt => {
        t += dt;
        fx.update(dt);
        if (flapT > 0) flapT -= dt;
        if (state === 'ready') { bee.y = H * 0.42 + Math.sin(t * 3) * 10; bee.rot = 0; }
        if (state === 'play' || state === 'dead') {
          bee.vy += 1250 * dt;
          if (bee.vy > 620) bee.vy = 620;
          bee.y += bee.vy * dt;
          bee.rot = U.clamp(bee.vy / 600, -0.5, 1.2);
          if (bee.y < bee.r) { bee.y = bee.r; bee.vy = 0; }
          if (bee.y > GROUND - bee.r) {
            bee.y = GROUND - bee.r;
            if (state === 'play') die();
          }
        }
        if (state === 'play') {
          speed = Math.min(215, 150 + score * 1.4);
          dist += speed * dt;
          for (const p of pipes) p.x -= speed * dt;
          const lastP = pipes[pipes.length - 1];
          if (lastP && lastP.x < W - 205) addPipe(W + 40);
          pipes = pipes.filter(p => p.x > -80);
          for (const p of pipes) {
            if (!p.passed && p.x + 30 < bee.x) { p.passed = true; score++; s.score(score); s.sfx('point'); }
            // çarpışma (daire - dikdörtgen)
            const rects = [[p.x, -50, 60, p.top + 50], [p.x, p.top + p.gap, 60, GROUND - p.top - p.gap]];
            for (const [rx, ry, rw, rh] of rects) {
              const cx = U.clamp(bee.x, rx, rx + rw), cy = U.clamp(bee.y, ry, ry + rh);
              if ((bee.x - cx) ** 2 + (bee.y - cy) ** 2 < (bee.r - 2) ** 2) die();
            }
          }
          for (const c of clouds) { c.x -= speed * 0.15 * c.s * dt; if (c.x < -80) { c.x = W + 60; c.y = U.rand(40, 260); } }
          for (const hh of hills) { hh.x -= speed * 0.35 * dt; if (hh.x < -80) { hh.x += 8 * 70; hh.h = U.rand(60, 120); } }
        }
        if (state === 'dead') {
          deadT += dt;
          if (deadT > 1.1) { state = 'over'; s.over({ score, msg: medal(score) }); }
        }
      }, () => {
        // gökyüzü (puana göre gün batımına döner)
        const k = U.clamp(score / 60, 0, 1);
        const sky = g.createLinearGradient(0, 0, 0, GROUND);
        sky.addColorStop(0, k < 0.5 ? '#38bdf8' : '#7c3aed');
        sky.addColorStop(1, k < 0.5 ? '#bae6fd' : '#fb923c');
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.beginPath(); g.arc(290, 90, 30, 0, Math.PI * 2); g.fillStyle = k < 0.5 ? 'rgba(255,250,200,.9)' : 'rgba(255,200,120,.9)'; g.fill();
        for (const c of clouds) {
          g.fillStyle = 'rgba(255,255,255,.8)';
          g.beginPath();
          g.arc(c.x, c.y, 18 * c.s, 0, Math.PI * 2); g.arc(c.x + 20 * c.s, c.y - 8 * c.s, 22 * c.s, 0, Math.PI * 2); g.arc(c.x + 42 * c.s, c.y, 16 * c.s, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = k < 0.5 ? '#86efac' : '#a16207';
        for (const hh of hills) { g.beginPath(); g.arc(hh.x + 35, GROUND, hh.h, Math.PI, 0); g.fill(); }
        // gövdeler
        for (const p of pipes) {
          const drawTrunk = (y, h, capY) => {
            const gr = g.createLinearGradient(p.x, 0, p.x + 60, 0);
            gr.addColorStop(0, '#78350f'); gr.addColorStop(0.45, '#b45309'); gr.addColorStop(1, '#5c2a0b');
            g.fillStyle = gr; g.fillRect(p.x + 4, y, 52, h);
            g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
            for (let yy = y + 14; yy < y + h; yy += 26) { g.beginPath(); g.moveTo(p.x + 14, yy); g.quadraticCurveTo(p.x + 30, yy + 6, p.x + 46, yy); g.stroke(); }
            // yapraklı uç
            g.fillStyle = '#16a34a';
            U.rr(g, p.x - 4, capY, 68, 22, 11); g.fill();
            g.fillStyle = '#4ade80';
            U.rr(g, p.x, capY + 3, 60, 7, 4); g.fill();
          };
          drawTrunk(-10, p.top + 10, p.top - 22);
          drawTrunk(p.top + p.gap, GROUND - p.top - p.gap, p.top + p.gap);
        }
        // zemin
        g.fillStyle = '#65a30d'; g.fillRect(0, GROUND, W, 14);
        g.fillStyle = '#a16207'; g.fillRect(0, GROUND + 14, W, H - GROUND);
        g.fillStyle = '#4d7c0f';
        const off = dist % 24;
        for (let x = -off; x < W; x += 24) { g.beginPath(); g.moveTo(x, GROUND + 14); g.lineTo(x + 12, GROUND); g.lineTo(x + 24, GROUND + 14); g.fill(); }
        // arı
        g.save(); g.translate(bee.x, bee.y); g.rotate(bee.rot);
        const wing = state === 'dead' || state === 'over' ? 0 : Math.sin(t * (flapT > 0 ? 60 : 30)) * 0.6;
        g.fillStyle = 'rgba(224,242,254,.85)';
        g.save(); g.rotate(-0.4 + wing); g.beginPath(); g.ellipse(-2, -14, 9, 6, -0.3, 0, Math.PI * 2); g.fill(); g.restore();
        g.fillStyle = '#facc15';
        g.beginPath(); g.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2); g.fill();
        g.save(); g.beginPath(); g.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2); g.clip();
        g.fillStyle = '#1c1917'; g.fillRect(-9, -14, 4, 28); g.fillRect(-1, -14, 4, 28);
        g.restore();
        g.fillStyle = 'rgba(224,242,254,.95)';
        g.save(); g.rotate(0.2 - wing); g.beginPath(); g.ellipse(4, -15, 8, 5.5, 0.3, 0, Math.PI * 2); g.fill(); g.restore();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(9, -3, 4.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1c1917'; g.beginPath(); g.arc(10.5, -3, 2.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1c1917'; g.beginPath(); g.moveTo(-15, 1); g.lineTo(-22, 3); g.lineTo(-15, 5); g.fill();
        g.fillStyle = '#fb7185'; g.beginPath(); g.arc(8, 5, 2.4, 0, Math.PI * 2); g.fill();
        g.restore();
        fx.draw(g);
        if (state !== 'ready') {
          g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.35)';
          g.font = U.font(52, 900); g.textAlign = 'center'; g.textBaseline = 'middle';
          g.strokeText(String(score), W / 2, 80);
          U.text(g, String(score), W / 2, 80, 52, '#fff', 'center', 900);
        } else {
          g.fillStyle = 'rgba(0,0,0,.3)'; U.rr(g, W / 2 - 120, H * 0.6 - 30, 240, 60, 18); g.fill();
          U.text(g, 'Uçmak için dokun', W / 2, H * 0.6, 20, '#fff');
        }
      });
      return {};
    }
  });
})();
