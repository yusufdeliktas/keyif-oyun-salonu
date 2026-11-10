/* Uzay Savunması - dikey uzay nişancı oyunu */
(function () {
  const U = Platform.util;
  Platform.register({
    id: 'shooter', name: 'Uzay Savunması', gen: 'retro', genre: 'Aksiyon',
    colors: ['#3b82f6', '#1e1b4b'],
    desc: 'Gemini yönet, düşman dalgalarını ve dev ana gemileri yok et.',
    help: '<ul><li>Gemiyi <b>parmağınla sürükle</b> (parmağın geminin altında kalmaz) ya da <b>ok tuşları / WASD</b> ile yönet. Ateş otomatik.</li><li><b>P</b> kapsülü silahını güçlendirir (5 seviye), <b>S</b> kalkan verir, <b>♥</b> can ekler.</li><li>Vurulunca silah seviyen bir düşer. Her 5. dalgada bir ana gemi gelir!</li></ul>',
    icon: '<circle cx="12" cy="10" r="1.5" fill="#fff"/><circle cx="52" cy="18" r="1.2" fill="#fff"/><circle cx="46" cy="6" r="1" fill="#fff"/><path d="M32 8l9 24 10 10-8 2-4 8h-14l-4-8-8-2 10-10z" fill="#e0e7ff"/><path d="M32 14l5 16h-10z" fill="#60a5fa"/><path d="M27 52h10l-5 10z" fill="#fb923c"/><rect x="31" y="0" width="2" height="7" fill="#fde047"/>',
    create(s) {
      const W = 360, H = 640;
      const view = s.canvas(W, H);
      const g = view.g;
      const fx = new U.Particles();
      const stars = [];
      for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: U.pick([1, 2, 3]) });
      const ship = { x: W / 2, y: H - 90, r: 13, hp: 3, inv: 0, weapon: 1, shield: 0, fireT: 0 };
      let bullets = [], ebullets = [], enemies = [], pickups = [];
      let score = 0, wave = 0, toSpawn = 0, spawnT = 0, bannerT = 0, state = 'play', deadT = 0, time = 0, boss = null;
      const keys = {};

      function nextWave() {
        wave++;
        bannerT = 2;
        boss = null;
        if (wave % 5 === 0) {
          toSpawn = 0;
          const hp = 140 + wave * 24;
          boss = { type: 'boss', x: W / 2, y: -80, r: 46, hp, max: hp, t: 0, vx: 70, fire: 1.5, alt: 0, score: 1000 + wave * 50 };
          enemies.push(boss);
        } else {
          toSpawn = 7 + wave * 2;
          spawnT = 1.2;
        }
      }
      function spawnEnemy() {
        const r = Math.random();
        const x = U.rand(30, W - 30);
        let e;
        if (wave >= 4 && r < Math.min(0.12, wave * 0.012)) e = { type: 'tank', x, y: -30, r: 24, hp: 10 + wave, vy: 40, fire: 2, score: 80 };
        else if (wave >= 2 && r < 0.32) e = { type: 'shooter', x, y: -20, r: 16, hp: 3 + Math.floor(wave / 3), vy: 70, stopY: U.rand(80, 240), vx: U.pick([-60, 60]), fire: U.rand(1, 2), score: 30 };
        else if (wave >= 3 && r < 0.55) e = { type: 'diver', x, y: -20, r: 13, hp: 2, vy: 110, score: 25, dive: false };
        else e = { type: 'drone', x, y: -20, r: 13, hp: 1 + Math.floor(wave / 4), vy: 85 + wave * 4, ph: Math.random() * 6, amp: U.rand(30, 70), bx: x, score: 10 };
        e.t = 0; e.flash = 0;
        enemies.push(e);
      }
      function fire() {
        const L = ship.weapon, x = ship.x, y = ship.y - 16;
        const add = (dx, vx) => bullets.push({ x: x + dx, y, vx: vx || 0, vy: -640, dmg: 1 });
        if (L === 1) add(0);
        else if (L === 2) { add(-6); add(6); }
        else if (L === 3) { add(0); add(-8, -90); add(8, 90); }
        else if (L === 4) { add(-5); add(5); add(-10, -120); add(10, 120); }
        else { add(0); add(-6); add(6); add(-10, -150); add(10, 150); }
        s.sfx('shoot');
      }
      function eShoot(e, ang, sp) { ebullets.push({ x: e.x, y: e.y + e.r * 0.6, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 4.5 }); }
      function aimAt(e) { return Math.atan2(ship.y - e.y, ship.x - e.x); }
      function hurt() {
        if (ship.inv > 0 || state !== 'play') return;
        if (ship.shield > 0) { ship.shield = 0; ship.inv = 1; s.sfx('hit'); s.vibe(40); fx.burst(ship.x, ship.y, '#60a5fa', 20, 180, 0.5, 3); return; }
        ship.hp--;
        ship.weapon = Math.max(1, ship.weapon - 1);
        ship.inv = 1.8;
        s.sfx('explode'); s.vibe(160);
        fx.burst(ship.x, ship.y, ['#fb923c', '#fde047', '#fff'], 30, 220, 0.7, 4);
        if (ship.hp <= 0) {
          state = 'dead'; deadT = 0;
          s.sfx('boom');
          fx.burst(ship.x, ship.y, ['#fb923c', '#fde047', '#ef4444', '#fff'], 70, 300, 1.2, 5);
        }
      }
      function kill(e) {
        score += e.score; s.score(score);
        const big = e.type === 'boss';
        fx.burst(e.x, e.y, ['#fb923c', '#fde047', '#f472b6', '#fff'], big ? 90 : 22, big ? 340 : 200, big ? 1.4 : 0.6, big ? 5 : 3);
        s.sfx(big ? 'boom' : 'explode');
        if (big) { s.vibe(250); s.toast('Ana gemi yok edildi! +' + e.score, 1500); }
        const chance = e.type === 'tank' ? 0.6 : big ? 1 : 0.07;
        if (Math.random() < chance) {
          const k = ship.weapon < 5 && Math.random() < 0.55 ? 'P' : U.pick(['S', 'H', 'P']);
          pickups.push({ x: e.x, y: e.y, k, t: 0 });
          if (big) pickups.push({ x: e.x + 30, y: e.y, k: 'H', t: 0 });
        }
      }

      // kontrol: göreli sürükleme
      let drag = null;
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active()) return;
        const p = view.pt(e);
        drag = { id: e.pointerId, px: p.x, py: p.y, sx: ship.x, sy: ship.y };
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      });
      s.on(view.cv, 'pointermove', e => {
        if (!drag || drag.id !== e.pointerId || !s.active() || state !== 'play') return;
        const p = view.pt(e);
        ship.x = U.clamp(drag.sx + (p.x - drag.px) * 1.25, 16, W - 16);
        ship.y = U.clamp(drag.sy + (p.y - drag.py) * 1.25, 60, H - 24);
      });
      const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
      s.on(view.cv, 'pointerup', endDrag);
      s.on(view.cv, 'pointercancel', endDrag);
      s.key(e => { keys[e.key.toLowerCase()] = true; });
      s.keyup(e => { keys[e.key.toLowerCase()] = false; });

      nextWave();

      s.loop(dt => {
        time += dt;
        fx.update(dt);
        for (const st of stars) { st.y += st.z * 30 * dt; if (st.y > H) { st.y = 0; st.x = Math.random() * W; } }
        if (bannerT > 0) bannerT -= dt;
        if (state === 'dead') {
          deadT += dt;
          if (deadT > 1.4) { state = 'over'; s.over({ score, msg: wave + '. dalgaya kadar dayandın.' }); }
        }
        if (state === 'play') {
          // klavye
          let kx = 0, ky = 0;
          if (keys.arrowleft || keys.a) kx--;
          if (keys.arrowright || keys.d) kx++;
          if (keys.arrowup || keys.w) ky--;
          if (keys.arrowdown || keys.s) ky++;
          ship.x = U.clamp(ship.x + kx * 300 * dt, 16, W - 16);
          ship.y = U.clamp(ship.y + ky * 300 * dt, 60, H - 24);
          ship.fireT -= dt;
          if (ship.fireT <= 0) { fire(); ship.fireT = 0.17; }
          if (ship.inv > 0) ship.inv -= dt;
        }
        // doğma
        if (toSpawn > 0) {
          spawnT -= dt;
          if (spawnT <= 0) { spawnEnemy(); toSpawn--; spawnT = Math.max(0.32, 0.85 - wave * 0.04); }
        }
        // mermiler
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.y < -10 || b.x < -10 || b.x > W + 10) { bullets.splice(i, 1); continue; }
          for (const e of enemies) {
            if (e.dead) continue;
            const dx = b.x - e.x, dy = b.y - e.y;
            if (dx * dx + dy * dy < (e.r + 3) * (e.r + 3)) {
              e.hp -= b.dmg; e.flash = 0.06;
              bullets.splice(i, 1);
              fx.burst(b.x, b.y, '#fde047', 3, 80, 0.2, 2);
              if (e.hp <= 0) { e.dead = true; kill(e); }
              break;
            }
          }
        }
        // düşmanlar
        for (const e of enemies) {
          if (e.dead) continue;
          e.t += dt;
          if (e.flash > 0) e.flash -= dt;
          if (e.type === 'drone') { e.y += e.vy * dt; e.x = e.bx + Math.sin(e.t * 2.4 + e.ph) * e.amp; e.x = U.clamp(e.x, 14, W - 14); }
          else if (e.type === 'shooter') {
            if (e.y < e.stopY) e.y += e.vy * dt;
            else { e.x += e.vx * dt; if (e.x < 20 || e.x > W - 20) e.vx = -e.vx; e.y += 8 * dt; }
            e.fire -= dt;
            if (e.fire <= 0 && state === 'play' && e.y > 0) { eShoot(e, aimAt(e), 190 + wave * 4); e.fire = U.rand(1.4, 2.4); }
          } else if (e.type === 'diver') {
            if (!e.dive && e.y > U.rand(90, 200)) { e.dive = true; const a = aimAt(e); e.dvx = Math.cos(a) * 230; e.dvy = Math.max(160, Math.sin(a) * 230); }
            if (e.dive) { e.x += e.dvx * dt; e.y += e.dvy * dt; } else e.y += e.vy * dt;
          } else if (e.type === 'tank') {
            e.y += e.vy * dt;
            e.fire -= dt;
            if (e.fire <= 0 && state === 'play' && e.y > 0) {
              const a = aimAt(e);
              for (const d of [-0.25, 0, 0.25]) eShoot(e, a + d, 170);
              e.fire = 2.2;
            }
          } else if (e.type === 'boss') {
            if (e.y < 120) e.y += 50 * dt;
            else {
              e.x += e.vx * dt;
              if (e.x < 60 || e.x > W - 60) e.vx = -e.vx;
              e.fire -= dt;
              if (e.fire <= 0 && state === 'play') {
                e.alt++;
                if (e.alt % 3 === 0) {
                  const n = 14, off = e.t;
                  for (let k = 0; k < n; k++) eShoot(e, off + k * Math.PI * 2 / n, 150);
                } else {
                  const a = aimAt(e);
                  for (const d of [-0.18, 0, 0.18]) eShoot(e, a + d, 220);
                }
                e.fire = e.hp < e.max / 2 ? 0.75 : 1.05;
              }
            }
          }
          // gemi çarpışması
          if (state === 'play') {
            const dx = e.x - ship.x, dy = e.y - ship.y;
            if (dx * dx + dy * dy < (e.r + ship.r - 3) * (e.r + ship.r - 3)) {
              hurt();
              if (e.type !== 'boss' && e.type !== 'tank') { e.dead = true; fx.burst(e.x, e.y, '#fb923c', 16, 160, 0.5, 3); s.sfx('explode'); }
            }
          }
          if (e.y > H + 40 || e.x < -60 || e.x > W + 60) e.dead = true;
        }
        enemies = enemies.filter(e => !e.dead);
        // düşman mermileri
        for (let i = ebullets.length - 1; i >= 0; i--) {
          const b = ebullets[i];
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.y > H + 10 || b.y < -10 || b.x < -10 || b.x > W + 10) { ebullets.splice(i, 1); continue; }
          if (state === 'play') {
            const dx = b.x - ship.x, dy = b.y - ship.y;
            if (dx * dx + dy * dy < (ship.r - 4 + b.r) * (ship.r - 4 + b.r)) { ebullets.splice(i, 1); hurt(); }
          }
        }
        // kapsüller
        for (let i = pickups.length - 1; i >= 0; i--) {
          const p = pickups[i];
          p.t += dt; p.y += 80 * dt;
          if (p.y > H + 20) { pickups.splice(i, 1); continue; }
          if (state === 'play' && Math.hypot(p.x - ship.x, p.y - ship.y) < 26) {
            pickups.splice(i, 1);
            s.sfx('power'); s.vibe(30);
            if (p.k === 'P') { if (ship.weapon < 5) { ship.weapon++; s.toast('Silah seviyesi ' + ship.weapon, 900); } else { score += 200; s.score(score); } }
            else if (p.k === 'S') { ship.shield = 1; s.toast('Kalkan aktif', 900); }
            else { ship.hp = Math.min(5, ship.hp + 1); s.toast('+1 can', 900); }
          }
        }
        if (state === 'play' && toSpawn === 0 && enemies.length === 0) {
          score += wave * 20; s.score(score);
          nextWave();
        }
      }, () => {
        g.fillStyle = '#05060f'; g.fillRect(0, 0, W, H);
        const neb = g.createRadialGradient(W * 0.7, H * 0.3, 10, W * 0.7, H * 0.3, 300);
        neb.addColorStop(0, 'rgba(99,102,241,.18)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = neb; g.fillRect(0, 0, W, H);
        for (const st of stars) { g.fillStyle = st.z === 3 ? '#fff' : st.z === 2 ? '#a5b4fc' : '#4c51bf'; g.fillRect(st.x, st.y, st.z * 0.8, st.z * 0.8); }

        // kapsüller
        for (const p of pickups) {
          const col = p.k === 'P' ? '#a855f7' : p.k === 'S' ? '#38bdf8' : '#f43f5e';
          g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(p.t * 3) * 0.3);
          g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 12;
          U.rr(g, -12, -12, 24, 24, 7); g.fill();
          g.shadowBlur = 0;
          U.text(g, p.k === 'H' ? '♥' : p.k, 0, 1, 14, '#fff');
          g.restore();
        }
        // düşmanlar
        for (const e of enemies) {
          g.save(); g.translate(e.x, e.y);
          const fl = e.flash > 0;
          if (e.type === 'drone') {
            g.rotate(e.t * 3);
            g.fillStyle = fl ? '#fff' : '#f472b6';
            g.beginPath();
            for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); g.lineTo(Math.cos(a + 0.78) * 6, Math.sin(a + 0.78) * 6); }
            g.closePath(); g.fill();
            g.fillStyle = '#fdf2f8'; g.beginPath(); g.arc(0, 0, 3.5, 0, Math.PI * 2); g.fill();
          } else if (e.type === 'shooter') {
            g.fillStyle = fl ? '#fff' : '#34d399';
            g.beginPath(); g.moveTo(0, 18); g.lineTo(17, -6); g.lineTo(8, -14); g.lineTo(-8, -14); g.lineTo(-17, -6); g.closePath(); g.fill();
            g.fillStyle = '#064e3b'; g.beginPath(); g.arc(0, -2, 5, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#a7f3d0'; g.beginPath(); g.arc(0, -2, 2, 0, Math.PI * 2); g.fill();
          } else if (e.type === 'diver') {
            const a = e.dive ? Math.atan2(e.dvy, e.dvx) - Math.PI / 2 : 0;
            g.rotate(a);
            g.fillStyle = fl ? '#fff' : '#fbbf24';
            g.beginPath(); g.moveTo(0, 16); g.lineTo(12, -12); g.lineTo(0, -5); g.lineTo(-12, -12); g.closePath(); g.fill();
          } else if (e.type === 'tank') {
            g.fillStyle = fl ? '#fff' : '#8b5cf6';
            U.rr(g, -24, -18, 48, 36, 10); g.fill();
            g.fillStyle = '#4c1d95'; U.rr(g, -14, -8, 28, 22, 6); g.fill();
            g.fillStyle = '#ddd6fe'; g.fillRect(-3, 6, 6, 14);
            g.fillStyle = '#c4b5fd'; g.fillRect(-20, -14, 40, 4);
          } else if (e.type === 'boss') {
            g.fillStyle = fl ? '#fff' : '#ef4444';
            g.beginPath(); g.moveTo(-60, -10); g.lineTo(-40, -36); g.lineTo(40, -36); g.lineTo(60, -10); g.lineTo(34, 30); g.lineTo(-34, 30); g.closePath(); g.fill();
            g.fillStyle = '#7f1d1d'; g.beginPath(); g.moveTo(-30, -20); g.lineTo(30, -20); g.lineTo(18, 18); g.lineTo(-18, 18); g.closePath(); g.fill();
            g.fillStyle = '#fde047'; g.beginPath(); g.arc(0, 0, 9 + Math.sin(e.t * 6) * 2, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fca5a5'; g.fillRect(-50, 22, 10, 14); g.fillRect(40, 22, 10, 14);
          }
          g.restore();
        }
        // boss can çubuğu
        if (boss && !boss.dead) {
          g.fillStyle = 'rgba(255,255,255,.12)'; U.rr(g, 40, 48, W - 80, 9, 4); g.fill();
          g.fillStyle = '#ef4444'; U.rr(g, 40, 48, (W - 80) * Math.max(0, boss.hp / boss.max), 9, 4); g.fill();
          U.text(g, 'ANA GEMİ', W / 2, 66, 10, '#fecaca');
        }
        // mermiler
        g.fillStyle = '#fde047';
        for (const b of bullets) g.fillRect(b.x - 1.5, b.y - 7, 3, 12);
        for (const b of ebullets) {
          g.fillStyle = '#fb7185'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffe4e6'; g.beginPath(); g.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); g.fill();
        }
        // gemi
        if (state === 'play' && !(ship.inv > 0 && Math.floor(time * 14) % 2 === 0)) {
          g.save(); g.translate(ship.x, ship.y);
          const fl = 8 + Math.random() * 6;
          g.fillStyle = '#fb923c'; g.beginPath(); g.moveTo(-5, 14); g.lineTo(0, 14 + fl); g.lineTo(5, 14); g.fill();
          g.fillStyle = '#fde047'; g.beginPath(); g.moveTo(-2.5, 14); g.lineTo(0, 14 + fl * 0.6); g.lineTo(2.5, 14); g.fill();
          g.fillStyle = '#e0e7ff';
          g.beginPath(); g.moveTo(0, -20); g.lineTo(7, -2); g.lineTo(18, 10); g.lineTo(16, 15); g.lineTo(5, 12); g.lineTo(-5, 12); g.lineTo(-16, 15); g.lineTo(-18, 10); g.lineTo(-7, -2); g.closePath(); g.fill();
          g.fillStyle = '#3b82f6'; g.beginPath(); g.moveTo(0, -12); g.lineTo(4, 2); g.lineTo(-4, 2); g.closePath(); g.fill();
          g.fillStyle = '#93c5fd'; g.fillRect(-17, 6, 3, 6); g.fillRect(14, 6, 3, 6);
          if (ship.shield > 0) { g.strokeStyle = 'rgba(56,189,248,' + (0.55 + Math.sin(time * 6) * 0.25) + ')'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); g.stroke(); }
          g.restore();
        }
        fx.draw(g);
        // HUD
        for (let i = 0; i < ship.hp; i++) {
          const x = 16 + i * 20, y = 22;
          g.fillStyle = '#f43f5e';
          g.beginPath(); g.moveTo(x, y + 6); g.bezierCurveTo(x - 9, y - 1, x - 5, y - 9, x, y - 4); g.bezierCurveTo(x + 5, y - 9, x + 9, y - 1, x, y + 6); g.fill();
        }
        U.text(g, 'DALGA ' + wave, W - 12, 20, 13, '#c7d2fe', 'right');
        for (let i = 0; i < 5; i++) { g.fillStyle = i < ship.weapon ? '#a855f7' : 'rgba(255,255,255,.12)'; g.fillRect(W - 70 + i * 12, 32, 9, 4); }
        if (bannerT > 0) {
          g.globalAlpha = Math.min(1, bannerT);
          U.text(g, wave % 5 === 0 ? 'ANA GEMİ YAKLAŞIYOR!' : 'DALGA ' + wave, W / 2, H * 0.42, wave % 5 === 0 ? 24 : 34, wave % 5 === 0 ? '#fca5a5' : '#c7d2fe');
          g.globalAlpha = 1;
        }
      });
      return {};
    }
  });
})();
