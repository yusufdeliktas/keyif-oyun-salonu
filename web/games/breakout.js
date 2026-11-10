/* Tuğla Kırıcı */
(function () {
  const U = Platform.util;
  const LEVELS = [
    ['1111111111', '1111111111', '2222222222', '1111111111', '1111111111'],
    ['....11....', '...1221...', '..123321..', '.12333321.', '1111111111'],
    ['2.2.2.2.2.', '.1.1.1.1.1', '2.2.2.2.2.', '.1.1.1.1.1', '3333333333'],
    ['3333333333', '1........1', '1.222222.1', '1.2XXXX2.1', '1.222222.1', '1........1', '1111111111'],
    ['....33....', '...3223...', '..321123..', '.32111123.', '..321123..', '...3223...', '....33....'],
    ['X1X1X1X1X1', '2222222222', '1X1X1X1X1X', '3333333333', '1111111111', '2222222222'],
    ['11.1111.11', '22.2222.22', '33.3333.33', '..........', 'XX11XX11XX', '2222222222']
  ];
  const ROW_COL = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#3bc9db', '#ff8787'];
  const PW = { W: { c: '#40c057', t: 'G', name: 'Geniş raket' }, M: { c: '#4dabf7', t: '3', name: 'Çoklu top' }, S: { c: '#fcc419', t: 'Y', name: 'Yavaş top' }, L: { c: '#f06595', t: '♥', name: '+1 can' } };

  Platform.register({
    id: 'breakout', name: 'Tuğla Kırıcı', gen: 'retro', genre: 'Arcade',
    colors: ['#f97316', '#9a3412'],
    desc: 'Topu raketle sektir, tüm tuğlaları kır, güçlendirmeleri yakala.',
    help: '<ul><li>Raketi <b>parmağınla sürükle</b> ya da <b>← →</b> tuşlarıyla oynat.</li><li>Topu fırlatmak için <b>dokun</b> veya <b>Boşluk</b>.</li><li>Koyu tuğlalar birden fazla vuruş ister, gri metal tuğlalar kırılmaz.</li><li>Düşen kapsüller: <b>G</b> geniş raket, <b>3</b> çoklu top, <b>Y</b> yavaş top, <b>♥</b> +1 can.</li></ul>',
    icon: '<rect x="6" y="8" width="16" height="8" rx="2" fill="#ff6b6b"/><rect x="24" y="8" width="16" height="8" rx="2" fill="#ffd43b"/><rect x="42" y="8" width="16" height="8" rx="2" fill="#69db7c"/><rect x="6" y="18" width="16" height="8" rx="2" fill="#4dabf7"/><rect x="42" y="18" width="16" height="8" rx="2" fill="#9775fa"/><circle cx="34" cy="40" r="5" fill="#fff"/><rect x="18" y="50" width="28" height="7" rx="3.5" fill="#fff"/>',
    create(s) {
      const W = 360, H = 600, BW = 32, BH = 15, GAP = 2, OX = (W - (10 * (BW + GAP) - GAP)) / 2, OY = 70;
      const view = s.canvas(W, H);
      const g = view.g;
      const fx = new U.Particles();
      let level = 0, lives = 3, score = 0, bricks = [], balls = [], caps = [], paddle, wideT = 0, slowT = 0, state = 'serve', msgT = 0, keyDir = 0;
      paddle = { x: W / 2, y: 562, w: 74, h: 12 };

      function baseSpeed() { return 320 * (1 + Math.min(level, 12) * 0.05); }
      function loadLevel() {
        const L = LEVELS[level % LEVELS.length];
        bricks = [];
        L.forEach((row, r) => {
          for (let c = 0; c < 10; c++) {
            const ch = row[c];
            if (!ch || ch === '.') continue;
            const hp = ch === 'X' ? Infinity : +ch;
            bricks.push({ x: OX + c * (BW + GAP), y: OY + r * (BH + GAP), w: BW, h: BH, hp, max: hp, col: ROW_COL[r % ROW_COL.length], flash: 0 });
          }
        });
        caps = [];
        serve();
        msgT = 1.6;
      }
      function serve() {
        balls = [{ x: paddle.x, y: paddle.y - 10, vx: 0, vy: 0, r: 6, stuck: true }];
        state = 'serve';
      }
      function launch() {
        for (const b of balls) if (b.stuck) {
          b.stuck = false;
          const a = U.rand(-0.35, 0.35), sp = baseSpeed();
          b.vx = Math.sin(a) * sp; b.vy = -Math.cos(a) * sp;
        }
        state = 'play';
        s.sfx('bounce');
      }
      function breakables() { return bricks.filter(b => b.hp !== Infinity).length; }
      function hitBrick(br, b) {
        if (br.hp === Infinity) { br.flash = 0.15; s.sfx('hit'); return; }
        br.hp--; br.flash = 0.12;
        score += 10;
        if (br.hp <= 0) {
          score += 10 * br.max;
          fx.burst(br.x + br.w / 2, br.y + br.h / 2, [br.col, '#fff'], 14, 160, 0.5, 3, 400);
          bricks.splice(bricks.indexOf(br), 1);
          s.sfx('pop');
          if (Math.random() < 0.13) {
            const k = U.pick(['W', 'W', 'M', 'M', 'S', 'L']);
            caps.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, k });
          }
        } else s.sfx('hit');
        s.score(score);
      }
      function speedUp(b, f) {
        const sp = Math.hypot(b.vx, b.vy), max = baseSpeed() * 1.6;
        const ns = Math.min(max, sp * f);
        b.vx *= ns / sp; b.vy *= ns / sp;
      }
      function stepBall(b, dt) {
        const pw = paddle.w;
        const dist = Math.hypot(b.vx, b.vy) * dt;
        const steps = Math.max(1, Math.ceil(dist / (b.r * 0.6)));
        const sdt = dt / steps;
        for (let i = 0; i < steps; i++) {
          const px = b.x, py = b.y;
          b.x += b.vx * sdt; b.y += b.vy * sdt;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); s.sfx('bounce'); }
          if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); s.sfx('bounce'); }
          if (b.y < b.r + 40) { b.y = b.r + 40; b.vy = Math.abs(b.vy); s.sfx('bounce'); }
          // raket
          if (b.vy > 0 && b.y + b.r >= paddle.y - paddle.h / 2 && b.y - b.r <= paddle.y + paddle.h / 2 && b.x >= paddle.x - pw / 2 - b.r && b.x <= paddle.x + pw / 2 + b.r) {
            const rel = U.clamp((b.x - paddle.x) / (pw / 2), -1, 1);
            const ang = rel * 1.05;
            const sp = Math.hypot(b.vx, b.vy);
            b.vx = Math.sin(ang) * sp; b.vy = -Math.cos(ang) * sp;
            b.y = paddle.y - paddle.h / 2 - b.r;
            speedUp(b, 1.015);
            s.sfx('bounce'); s.vibe(8);
          }
          // tuğlalar
          for (let k = 0; k < bricks.length; k++) {
            const br = bricks[k];
            const cx = U.clamp(b.x, br.x, br.x + br.w), cy = U.clamp(b.y, br.y, br.y + br.h);
            const dx = b.x - cx, dy = b.y - cy;
            if (dx * dx + dy * dy < b.r * b.r) {
              const wasOutX = px < br.x || px > br.x + br.w;
              const wasOutY = py < br.y || py > br.y + br.h;
              if (wasOutX && !wasOutY) b.vx = -b.vx;
              else if (wasOutY && !wasOutX) b.vy = -b.vy;
              else { b.vx = -b.vx; b.vy = -b.vy; }
              b.x = px; b.y = py;
              hitBrick(br, b);
              break;
            }
          }
          if (b.y > H + 20) return false;
        }
        // çok yatay gitmesin
        const sp = Math.hypot(b.vx, b.vy);
        if (Math.abs(b.vy) < sp * 0.28) { b.vy = Math.sign(b.vy || -1) * sp * 0.28; b.vx = Math.sign(b.vx || 1) * Math.sqrt(sp * sp - b.vy * b.vy); }
        return true;
      }

      // kontrol
      let dragging = null;
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active()) return;
        const p = view.pt(e);
        dragging = { id: e.pointerId, ox: paddle.x - p.x, sx: p.x, sy: p.y, t: performance.now() };
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      });
      s.on(view.cv, 'pointermove', e => {
        if (!dragging || dragging.id !== e.pointerId || !s.active()) return;
        const p = view.pt(e);
        paddle.x = U.clamp(p.x + dragging.ox, paddle.w / 2, W - paddle.w / 2);
      });
      s.on(view.cv, 'pointerup', e => {
        if (!dragging || dragging.id !== e.pointerId) return;
        const p = view.pt(e);
        if (s.active() && state === 'serve' && Math.abs(p.x - dragging.sx) < 12 && performance.now() - dragging.t < 400) launch();
        dragging = null;
      });
      s.on(view.cv, 'pointercancel', () => { dragging = null; });
      s.key(e => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyDir = -1;
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyDir = 1;
        else if ((e.key === ' ' || e.key === 'ArrowUp') && state === 'serve') launch();
      });
      s.keyup(e => {
        if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && keyDir === -1) keyDir = 0;
        if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && keyDir === 1) keyDir = 0;
      });

      loadLevel();

      s.loop(dt => {
        fx.update(dt);
        if (msgT > 0) msgT -= dt;
        if (keyDir) paddle.x = U.clamp(paddle.x + keyDir * 480 * dt, paddle.w / 2, W - paddle.w / 2);
        if (wideT > 0) { wideT -= dt; paddle.w = U.lerp(paddle.w, 112, 0.2); } else paddle.w = U.lerp(paddle.w, 74, 0.2);
        paddle.x = U.clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
        for (const br of bricks) if (br.flash > 0) br.flash -= dt;
        if (state === 'dead' || state === 'next') return;
        const sdt = slowT > 0 ? dt * 0.65 : dt;
        if (slowT > 0) slowT -= dt;
        if (state === 'serve') { for (const b of balls) { b.x = paddle.x; b.y = paddle.y - paddle.h / 2 - b.r - 1; } }
        else {
          for (let i = balls.length - 1; i >= 0; i--) if (!stepBall(balls[i], sdt)) balls.splice(i, 1);
          if (!balls.length) {
            lives--;
            s.sfx('lose'); s.vibe(150);
            if (lives <= 0) {
              state = 'dead';
              s.over({ score, msg: 'Seviye ' + (level + 1) + ' bölümüne ulaştın.' , delay: 600 });
              return;
            }
            wideT = 0; slowT = 0; caps = [];
            serve();
          }
        }
        // kapsüller
        for (let i = caps.length - 1; i >= 0; i--) {
          const c = caps[i];
          c.y += 140 * dt;
          if (c.y > paddle.y - 14 && c.y < paddle.y + 14 && Math.abs(c.x - paddle.x) < paddle.w / 2 + 12) {
            caps.splice(i, 1);
            s.sfx('power'); s.vibe(30);
            s.toast(PW[c.k].name, 900);
            score += 25; s.score(score);
            if (c.k === 'W') wideT = 12;
            else if (c.k === 'S') slowT = 10;
            else if (c.k === 'L') lives = Math.min(6, lives + 1);
            else if (c.k === 'M') {
              const src = balls.find(b => !b.stuck) || balls[0];
              if (src) {
                if (src.stuck) launch();
                const sp = Math.hypot(src.vx, src.vy) || baseSpeed();
                for (const a of [-0.5, 0.5]) {
                  if (balls.length >= 8) break;
                  const base = Math.atan2(src.vx, -src.vy) + a;
                  balls.push({ x: src.x, y: src.y, r: 6, stuck: false, vx: Math.sin(base) * sp, vy: -Math.abs(Math.cos(base) * sp) });
                }
              }
            }
          } else if (c.y > H + 20) caps.splice(i, 1);
        }
        if (breakables() === 0 && state === 'play') {
          state = 'next';
          score += 100 + lives * 50; s.score(score);
          s.sfx('win');
          s.toast('Bölüm tamamlandı!', 1300);
          s.timeout(() => { level++; loadLevel(); }, 1400);
        }
      }, () => {
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#1a1033'); bg.addColorStop(1, '#0a0716');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        // üst bilgi
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, W, 40);
        U.text(g, 'BÖLÜM ' + (level + 1), 12, 20, 14, '#ffd8a8', 'left');
        for (let i = 0; i < lives; i++) {
          const x = W - 18 - i * 20, y = 20;
          g.fillStyle = '#ff6b9d';
          g.beginPath(); g.moveTo(x, y + 6); g.bezierCurveTo(x - 9, y - 1, x - 5, y - 9, x, y - 4); g.bezierCurveTo(x + 5, y - 9, x + 9, y - 1, x, y + 6); g.fill();
        }
        if (slowT > 0) U.text(g, 'YAVAŞ ' + Math.ceil(slowT), W / 2, 20, 12, '#fcc419');
        // tuğlalar
        for (const br of bricks) {
          let col = br.col;
          if (br.hp === Infinity) col = '#868e96';
          g.fillStyle = col;
          U.rr(g, br.x, br.y, br.w, br.h, 3); g.fill();
          g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(br.x + 2, br.y + 2, br.w - 4, 3);
          if (br.hp !== Infinity && br.hp > 1) {
            // kalan vuruş sayısı kadar nokta
            g.fillStyle = 'rgba(255,255,255,.9)';
            for (let k = 0; k < br.hp; k++) { g.beginPath(); g.arc(br.x + br.w / 2 + (k - (br.hp - 1) / 2) * 7, br.y + br.h / 2 + 1, 2.2, 0, Math.PI * 2); g.fill(); }
            g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2;
            U.rr(g, br.x + 1, br.y + 1, br.w - 2, br.h - 2, 3); g.stroke();
          }
          if (br.hp === Infinity) { g.strokeStyle = '#ced4da'; g.lineWidth = 1; g.strokeRect(br.x + 3.5, br.y + 3.5, br.w - 7, br.h - 7); }
          if (br.flash > 0) { g.fillStyle = 'rgba(255,255,255,.7)'; U.rr(g, br.x, br.y, br.w, br.h, 3); g.fill(); }
        }
        // kapsüller
        for (const c of caps) {
          g.fillStyle = PW[c.k].c;
          U.rr(g, c.x - 14, c.y - 8, 28, 16, 8); g.fill();
          g.fillStyle = 'rgba(255,255,255,.35)'; U.rr(g, c.x - 11, c.y - 6, 22, 5, 3); g.fill();
          U.text(g, PW[c.k].t, c.x, c.y + 1, 11, '#fff');
        }
        // raket
        const pg = g.createLinearGradient(0, paddle.y - 6, 0, paddle.y + 6);
        pg.addColorStop(0, wideT > 0 ? '#8ce99a' : '#ffe8cc'); pg.addColorStop(1, wideT > 0 ? '#2f9e44' : '#f76707');
        g.fillStyle = pg;
        g.shadowColor = '#ff922b'; g.shadowBlur = 12;
        U.rr(g, paddle.x - paddle.w / 2, paddle.y - paddle.h / 2, paddle.w, paddle.h, 6); g.fill();
        g.shadowBlur = 0;
        // toplar
        for (const b of balls) {
          g.fillStyle = '#fff';
          g.shadowColor = '#fff'; g.shadowBlur = 10;
          g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
          g.shadowBlur = 0;
        }
        fx.draw(g);
        if (state === 'serve' && msgT <= 0) U.text(g, 'Fırlatmak için dokun', W / 2, 470, 15, 'rgba(255,255,255,.7)');
        if (msgT > 0) {
          g.globalAlpha = Math.min(1, msgT);
          U.text(g, 'BÖLÜM ' + (level + 1), W / 2, 420, 34, '#ffd8a8');
          g.globalAlpha = 1;
        }
      });
      return {};
    }
  });
})();
