/* Yılan */
(function () {
  const U = Platform.util;
  Platform.register({
    id: 'snake', name: 'Yılan', gen: 'retro', genre: 'Arcade',
    colors: ['#22c55e', '#0b6e4f'],
    desc: 'Elmaları topla, uza ve kendi kuyruğuna çarpma!',
    help: '<ul><li><b>Yön tuşları</b>, <b>WASD</b>, ekranda <b>kaydırma</b> ya da alttaki tuşlarla yönlendir.</li><li>Kırmızı elma <b>+10</b>, altın elma <b>+50</b> puan (kısa süre görünür).</li><li><b>Duvarsız</b> modda kenardan çıkınca karşı taraftan girersin.</li><li>Uzadıkça yılan hızlanır.</li></ul>',
    options: [
      { key: 'speed', label: 'HIZ', choices: [['slow', 'Yavaş'], ['normal', 'Normal'], ['fast', 'Hızlı']], def: 'normal' },
      { key: 'walls', label: 'DUVARLAR', choices: [['on', 'Duvarlı'], ['off', 'Duvarsız']], def: 'on' }
    ],
    bestKey: o => o.speed + '-' + o.walls,
    icon: '<rect x="8" y="34" width="34" height="12" rx="6" fill="#bbf7d0"/><rect x="30" y="16" width="12" height="30" rx="6" fill="#bbf7d0"/><rect x="30" y="16" width="22" height="12" rx="6" fill="#ecfccb"/><circle cx="47" cy="21" r="2.2" fill="#14532d"/><circle cx="16" cy="18" r="7" fill="#ef4444"/><path d="M16 11c1-3 3-4 5-4" stroke="#16a34a" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    create(s, o) {
      const COLS = 18, ROWS = 24, C = 20, W = COLS * C, H = ROWS * C;
      const view = s.canvas(W, H);
      const g = view.g;
      const wrapMode = o.walls === 'off';
      const base = { slow: 150, normal: 112, fast: 80 }[o.speed];
      const fx = new U.Particles();
      let snake, prev, dir, queue, food, bonus, score, stepT, interval, state, deadT, eaten, pulse = 0;

      function reset() {
        snake = [{ x: 6, y: 11 }, { x: 5, y: 11 }, { x: 4, y: 11 }];
        prev = snake.map(p => ({ x: p.x, y: p.y }));
        dir = { x: 1, y: 0 };
        queue = [];
        score = 0; s.score(0);
        interval = base; stepT = 0; state = 'ready'; deadT = 0; eaten = 0;
        bonus = null;
        food = freeCell();
      }
      function occupied(x, y) {
        for (const p of snake) if (p.x === x && p.y === y) return true;
        return false;
      }
      function freeCell() {
        const cells = [];
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (occupied(x, y)) continue;
          if (food && food.x === x && food.y === y) continue;
          if (bonus && bonus.x === x && bonus.y === y) continue;
          cells.push({ x, y });
        }
        return cells.length ? U.pick(cells) : null;
      }
      function setDir(dx, dy) {
        if (state === 'dead') return;
        const last = queue.length ? queue[queue.length - 1] : dir;
        if (last.x === -dx && last.y === -dy) return;
        if (last.x === dx && last.y === dy) { if (state === 'ready') state = 'run'; return; }
        if (queue.length < 3) queue.push({ x: dx, y: dy });
        if (state === 'ready') state = 'run';
      }
      function die() {
        state = 'dead'; deadT = 0;
        s.sfx('lose'); s.vibe(200);
        const h = snake[0];
        fx.burst(h.x * C + C / 2, h.y * C + C / 2, ['#4ade80', '#bbf7d0', '#facc15'], 30, 200, 0.8, 4);
      }
      function step() {
        if (queue.length) dir = queue.shift();
        const h = snake[0];
        let nx = h.x + dir.x, ny = h.y + dir.y;
        if (wrapMode) { nx = (nx + COLS) % COLS; ny = (ny + ROWS) % ROWS; }
        else if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { prev = snake.map(p => ({ x: p.x, y: p.y })); die(); return; }
        const eatF = food && food.x === nx && food.y === ny;
        const eatB = bonus && bonus.x === nx && bonus.y === ny;
        const grow = eatF || eatB;
        const body = grow ? snake : snake.slice(0, -1);
        for (const p of body) if (p.x === nx && p.y === ny) { prev = snake.map(p => ({ x: p.x, y: p.y })); die(); return; }
        prev = snake.map(p => ({ x: p.x, y: p.y }));
        snake.unshift({ x: nx, y: ny });
        if (!grow) snake.pop();
        if (eatF) {
          score += 10; eaten++;
          s.sfx('eat'); s.vibe(15);
          fx.burst(nx * C + C / 2, ny * C + C / 2, ['#f87171', '#fecaca'], 12, 120, 0.5, 3);
          food = freeCell();
          interval = Math.max(base * 0.55, base - eaten * 1.6);
          if (eaten % 5 === 0 && !bonus) { bonus = freeCell(); if (bonus) bonus.t = 6; }
          if (!food) { state = 'won'; s.score(score); s.over({ win: true, title: 'Tahta doldu!', msg: 'Mükemmel oyun!' }); return; }
        }
        if (eatB) {
          score += 50;
          s.sfx('coin'); s.vibe(25);
          fx.burst(nx * C + C / 2, ny * C + C / 2, ['#facc15', '#fff7ae'], 20, 160, 0.6, 3);
          bonus = null;
        }
        s.score(score);
      }

      s.key(e => {
        const k = e.key;
        if (k === 'ArrowUp' || k === 'w' || k === 'W') setDir(0, -1);
        else if (k === 'ArrowDown' || k === 's' || k === 'S') setDir(0, 1);
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') setDir(-1, 0);
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') setDir(1, 0);
      });
      s.swipe(s.stage, d => {
        if (d === 'U') setDir(0, -1); else if (d === 'D') setDir(0, 1);
        else if (d === 'L') setDir(-1, 0); else setDir(1, 0);
      }, null, { continuous: true, min: 18 });

      const pad = document.createElement('div');
      pad.className = 'dpad';
      s.stage.appendChild(pad);
      s.button(pad, '▲', () => setDir(0, -1), 'up');
      s.button(pad, '◀', () => setDir(-1, 0), 'left');
      s.button(pad, '▼', () => setDir(0, 1), 'down');
      s.button(pad, '▶', () => setDir(1, 0), 'right');

      reset();

      s.loop(dt => {
        pulse += dt;
        fx.update(dt);
        if (state === 'run') {
          stepT += dt * 1000;
          while (stepT >= interval && state === 'run') { stepT -= interval; step(); }
          if (bonus) { bonus.t -= dt; if (bonus.t <= 0) bonus = null; }
        } else if (state === 'dead') {
          deadT += dt;
          if (deadT > 0.9) { state = 'over'; s.over({ score, msg: 'Uzunluk: ' + snake.length }); }
        }
      }, () => {
        // zemin
        g.fillStyle = '#0d1f17';
        g.fillRect(0, 0, W, H);
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0) { g.fillStyle = '#10261c'; g.fillRect(x * C, y * C, C, C); }
        }
        if (!wrapMode) { g.strokeStyle = '#22c55e88'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3); }
        else { g.strokeStyle = '#22c55e33'; g.setLineDash([6, 6]); g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2); g.setLineDash([]); }

        // elma
        if (food) {
          const cx = food.x * C + C / 2, cy = food.y * C + C / 2 + 1, r = C * 0.36 + Math.sin(pulse * 6) * 0.8;
          g.fillStyle = '#ef4444';
          g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fca5a5';
          g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.35, r * 0.28, 0, Math.PI * 2); g.fill();
          g.strokeStyle = '#22c55e'; g.lineWidth = 2.2;
          g.beginPath(); g.moveTo(cx, cy - r); g.quadraticCurveTo(cx + 2, cy - r - 5, cx + 6, cy - r - 5); g.stroke();
        }
        if (bonus) {
          const cx = bonus.x * C + C / 2, cy = bonus.y * C + C / 2;
          const blink = bonus.t < 2 && Math.floor(pulse * 8) % 2 === 0;
          if (!blink) {
            g.fillStyle = '#facc15';
            g.shadowColor = '#facc15'; g.shadowBlur = 14;
            g.beginPath(); g.arc(cx, cy, C * 0.4, 0, Math.PI * 2); g.fill();
            g.shadowBlur = 0;
            g.fillStyle = '#fff7ae';
            g.beginPath(); g.arc(cx - 3, cy - 3, 3, 0, Math.PI * 2); g.fill();
          }
          g.strokeStyle = '#facc15aa'; g.lineWidth = 2;
          g.beginPath(); g.arc(cx, cy, C * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (bonus.t / 6)); g.stroke();
        }

        // yılan (yumuşak hareket için ara konum)
        const t = state === 'run' ? Math.min(1, stepT / interval) : 1;
        const pts = snake.map((p, i) => {
          const a = prev[i] || prev[prev.length - 1] || p;
          if (Math.abs(a.x - p.x) > 1 || Math.abs(a.y - p.y) > 1) return { x: p.x * C + C / 2, y: p.y * C + C / 2, brk: true };
          return { x: U.lerp(a.x, p.x, t) * C + C / 2, y: U.lerp(a.y, p.y, t) * C + C / 2 };
        });
        g.lineCap = 'round'; g.lineJoin = 'round';
        const n = pts.length;
        for (let i = n - 1; i > 0; i--) {
          const a = pts[i], b = pts[i - 1];
          const k = i / n;
          g.strokeStyle = 'hsl(' + (140 - k * 40) + ',70%,' + (55 - k * 18) + '%)';
          g.lineWidth = C * (0.78 - k * 0.22);
          if (Math.abs(a.x - b.x) > C * 1.5 || Math.abs(a.y - b.y) > C * 1.5) continue;
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
        // baş
        const h = pts[0];
        const dead = state === 'dead' || state === 'over';
        g.fillStyle = dead ? '#9ca3af' : '#86efac';
        g.beginPath(); g.arc(h.x, h.y, C * 0.46, 0, Math.PI * 2); g.fill();
        const ex = dir.y !== 0 ? 1 : 0, ey = dir.x !== 0 ? 1 : 0;
        const fxo = dir.x * C * 0.16, fyo = dir.y * C * 0.16;
        for (const sg of [-1, 1]) {
          const x = h.x + fxo + ex * sg * C * 0.2, y = h.y + fyo + ey * sg * C * 0.2;
          g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#052e16'; g.beginPath(); g.arc(x + dir.x * 1.2, y + dir.y * 1.2, 1.8, 0, Math.PI * 2); g.fill();
        }
        fx.draw(g);

        if (state === 'ready') {
          g.fillStyle = 'rgba(0,0,0,.45)';
          U.rr(g, W / 2 - 130, H / 2 - 34, 260, 68, 16); g.fill();
          U.text(g, 'Başlamak için bir yön seç', W / 2, H / 2 - 8, 17, '#fff');
          U.text(g, 'kaydır · ok tuşları · alttaki tuşlar', W / 2, H / 2 + 16, 12, '#bbf7d0', 'center', 600);
        }
      });
      return {};
    }
  });
})();
