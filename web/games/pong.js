/* Raket Düellosu */
(function () {
  const U = Platform.util;
  Platform.register({
    id: 'pong', name: 'Raket Düellosu', gen: 'retro', genre: 'Spor',
    colors: ['#06b6d4', '#164e63'], bestMode: 'wins',
    desc: 'Bilgisayara ya da aynı cihazda arkadaşına karşı 7 sayıya kadar raket düellosu.',
    help: '<ul><li>Alttaki raketi <b>parmağınla sürükle</b> veya <b>← →</b> ile oynat.</li><li><b>2 Oyuncu</b> modunda ekranın üst yarısı üstteki oyuncuya, alt yarısı alttaki oyuncuya aittir (üst oyuncu klavyede <b>A / D</b>).</li><li>Topa raketin kenarıyla vurursan daha keskin açıyla gider. Her vuruşta top hızlanır.</li><li>İlk 7 sayıya ulaşan kazanır.</li></ul>',
    options: [{ key: 'mode', label: 'RAKİP', choices: [['easy', 'Kolay'], ['mid', 'Orta'], ['hard', 'Zor'], ['pvp', '2 Oyuncu']], def: 'mid' }],
    icon: '<rect x="18" y="6" width="28" height="6" rx="3" fill="#fff"/><rect x="18" y="52" width="28" height="6" rx="3" fill="#fff"/><circle cx="38" cy="30" r="5" fill="#fde047"/><path d="M4 32h56" stroke="#ffffff55" stroke-width="2" stroke-dasharray="4 4"/>',
    create(s, o) {
      const W = 360, H = 600, TARGET = 7;
      const view = s.canvas(W, H);
      const g = view.g;
      const pvp = o.mode === 'pvp';
      const AI = { easy: { sp: 210, err: 46, predict: false }, mid: { sp: 330, err: 22, predict: true }, hard: { sp: 470, err: 8, predict: true } }[o.mode] || null;
      const fx = new U.Particles();
      const top = { x: W / 2, y: 44, w: 76, h: 12, vx: 0, px: W / 2 };
      const bot = { x: W / 2, y: H - 44, w: 76, h: 12, vx: 0, px: W / 2 };
      const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 8, sp: 300 };
      let sTop = 0, sBot = 0, serveT = 1.2, serveDir = 1, state = 'serve', aiTarget = W / 2, aiErr = 0, trail = [];
      const kb = { l: 0, r: 0, a: 0, d: 0 };

      function serve(dir) {
        ball.x = W / 2; ball.y = H / 2; ball.vx = 0; ball.vy = 0; ball.sp = 300;
        serveDir = dir; serveT = 1.1; state = 'serve'; trail = [];
      }
      function launch() {
        const a = U.rand(-0.5, 0.5);
        ball.vx = Math.sin(a) * ball.sp; ball.vy = Math.cos(a) * ball.sp * serveDir;
        state = 'play';
        aiErr = U.rand(-1, 1) * (AI ? AI.err : 0);
      }
      function predictX() {
        // topun üst rakete ulaştığında nerede olacağını duvar sekmeleriyle hesapla
        if (ball.vy >= 0) return W / 2;
        const t = (ball.y - top.y - top.h / 2 - ball.r) / -ball.vy;
        let x = ball.x + ball.vx * t;
        const L = ball.r, R = W - ball.r, span = R - L;
        x -= L;
        x = ((x % (2 * span)) + 2 * span) % (2 * span);
        if (x > span) x = 2 * span - x;
        return x + L;
      }
      function hitPaddle(p, dir) {
        const rel = U.clamp((ball.x - p.x) / (p.w / 2), -1, 1);
        const ang = rel * 1.0 + U.clamp(p.vx / 1600, -0.25, 0.25);
        ball.sp = Math.min(760, ball.sp * 1.06);
        ball.vx = Math.sin(ang) * ball.sp;
        ball.vy = Math.cos(ang) * ball.sp * dir;
        fx.burst(ball.x, ball.y, '#67e8f9', 10, 140, 0.35, 3);
        s.sfx('bounce'); s.vibe(10);
        aiErr = U.rand(-1, 1) * (AI ? AI.err : 0);
      }
      function point(winner) {
        if (winner === 'bot') sBot++; else sTop++;
        s.sfx(winner === 'bot' ? 'point' : 'hit');
        s.vibe(winner === 'bot' ? 30 : 120);
        fx.burst(ball.x, U.clamp(ball.y, 0, H), winner === 'bot' ? '#4ade80' : '#f87171', 30, 220, 0.7, 4);
        if (sBot >= TARGET || sTop >= TARGET) {
          state = 'end';
          const botWon = sBot >= TARGET;
          if (pvp) s.over({ win: false, count: false, emoji: '🏓', title: botWon ? 'Alttaki oyuncu kazandı!' : 'Üstteki oyuncu kazandı!', msg: 'Skor: ' + sBot + ' – ' + sTop, delay: 700 });
          else s.over({ win: botWon, title: botWon ? 'Kazandın!' : 'Kaybettin', msg: 'Skor: ' + sBot + ' – ' + sTop, delay: 700 });
          if (!botWon && !pvp) s.sfx('lose');
          return;
        }
        serve(winner === 'bot' ? -1 : 1);
      }

      // dokunma: her parmak kendi raketini kontrol eder
      const ptrs = new Map();
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active()) return;
        const p = view.pt(e);
        const which = pvp && p.y < H / 2 ? top : bot;
        ptrs.set(e.pointerId, { pad: which, off: which.x - p.x });
        try { view.cv.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      });
      s.on(view.cv, 'pointermove', e => {
        const d = ptrs.get(e.pointerId);
        if (!d || !s.active()) return;
        const p = view.pt(e);
        d.pad.x = U.clamp(p.x + d.off, d.pad.w / 2, W - d.pad.w / 2);
      });
      const up = e => ptrs.delete(e.pointerId);
      s.on(view.cv, 'pointerup', up);
      s.on(view.cv, 'pointercancel', up);
      s.key(e => {
        const k = e.key.toLowerCase();
        if (k === 'arrowleft') kb.l = 1; else if (k === 'arrowright') kb.r = 1;
        else if (k === 'a') kb.a = 1; else if (k === 'd') kb.d = 1;
      });
      s.keyup(e => {
        const k = e.key.toLowerCase();
        if (k === 'arrowleft') kb.l = 0; else if (k === 'arrowright') kb.r = 0;
        else if (k === 'a') kb.a = 0; else if (k === 'd') kb.d = 0;
      });

      serve(Math.random() < 0.5 ? 1 : -1);

      s.loop(dt => {
        fx.update(dt);
        bot.x = U.clamp(bot.x + (kb.r - kb.l) * 520 * dt, bot.w / 2, W - bot.w / 2);
        if (pvp) top.x = U.clamp(top.x + (kb.d - kb.a) * 520 * dt, top.w / 2, W - top.w / 2);
        else {
          // yapay zeka
          let target = W / 2;
          if (state === 'play' && ball.vy < 0) target = (AI.predict ? predictX() : ball.x) + aiErr;
          else if (state === 'play') target = U.lerp(W / 2, ball.x, 0.3);
          aiTarget = target;
          const d = aiTarget - top.x;
          const mv = U.clamp(d, -AI.sp * dt, AI.sp * dt);
          top.x = U.clamp(top.x + mv, top.w / 2, W - top.w / 2);
        }
        for (const p of [top, bot]) { p.vx = (p.x - p.px) / Math.max(dt, 0.001); p.px = p.x; }
        if (state === 'serve') {
          serveT -= dt;
          if (serveT <= 0) launch();
          return;
        }
        if (state !== 'play') return;
        const steps = Math.ceil(ball.sp * dt / 5);
        const sdt = dt / steps;
        for (let i = 0; i < steps && state === 'play'; i++) {
          ball.x += ball.vx * sdt; ball.y += ball.vy * sdt;
          if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); s.sfx('hit'); }
          if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); s.sfx('hit'); }
          if (ball.vy > 0 && ball.y + ball.r >= bot.y - bot.h / 2 && ball.y - ball.r <= bot.y + bot.h / 2 && Math.abs(ball.x - bot.x) <= bot.w / 2 + ball.r) {
            ball.y = bot.y - bot.h / 2 - ball.r; hitPaddle(bot, -1);
          }
          if (ball.vy < 0 && ball.y - ball.r <= top.y + top.h / 2 && ball.y + ball.r >= top.y - top.h / 2 && Math.abs(ball.x - top.x) <= top.w / 2 + ball.r) {
            ball.y = top.y + top.h / 2 + ball.r; hitPaddle(top, 1);
          }
          if (ball.y > H + 20) point('top');
          else if (ball.y < -20) point('bot');
        }
        trail.push({ x: ball.x, y: ball.y });
        if (trail.length > 12) trail.shift();
      }, () => {
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#082f49'); bg.addColorStop(0.5, '#0c1a2e'); bg.addColorStop(1, '#082f49');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(103,232,249,.25)'; g.lineWidth = 2;
        g.setLineDash([10, 10]);
        g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
        g.setLineDash([]);
        g.beginPath(); g.arc(W / 2, H / 2, 46, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = 'rgba(103,232,249,.4)'; g.strokeRect(2, 2, W - 4, H - 4);
        // skorlar
        U.text(g, String(sTop), W / 2, H / 2 - 70, 64, 'rgba(255,255,255,.12)', 'center', 900);
        U.text(g, String(sBot), W / 2, H / 2 + 74, 64, 'rgba(255,255,255,.12)', 'center', 900);
        U.text(g, pvp ? 'OYUNCU 2' : 'BİLGİSAYAR', 12, H / 2 - 16, 11, 'rgba(255,255,255,.35)', 'left');
        U.text(g, pvp ? 'OYUNCU 1' : 'SEN', 12, H / 2 + 16, 11, 'rgba(255,255,255,.35)', 'left');
        // iz
        trail.forEach((t, i) => {
          g.globalAlpha = i / trail.length * 0.4;
          g.fillStyle = '#fde047';
          g.beginPath(); g.arc(t.x, t.y, ball.r * (i / trail.length), 0, Math.PI * 2); g.fill();
        });
        g.globalAlpha = 1;
        // raketler
        const pad = (p, col) => {
          g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 16;
          U.rr(g, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 6); g.fill();
          g.shadowBlur = 0;
        };
        pad(top, '#f472b6');
        pad(bot, '#22d3ee');
        // top
        g.fillStyle = '#fde047'; g.shadowColor = '#fde047'; g.shadowBlur = 14;
        g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
        fx.draw(g);
        if (state === 'serve') U.text(g, String(Math.max(1, Math.ceil(serveT))), W / 2, H / 2, 30, '#fff');
      });
      return {};
    }
  });
})();
