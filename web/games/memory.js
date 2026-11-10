/* Emoji Hafıza - eşini bul */
(function () {
  const U = Platform.util;
  const EMO = ['🍎', '🍌', '🍇', '🍉', '🍒', '🍓', '🥝', '🍍', '🥥', '🍋', '🚀', '⚽', '🎸', '🎲', '🐱', '🐶', '🦊', '🐼', '🐸', '🦄', '🌈', '⭐', '🔥', '💎', '🎈', '🍕', '🍩', '🐙', '🦋', '🌻', '🐢', '🍔'];
  const SIZES = { easy: [3, 4], mid: [4, 4], hard: [4, 5], pro: [5, 6] };

  Platform.register({
    id: 'memory', name: 'Emoji Hafıza', gen: 'modern', genre: 'Hafıza',
    colors: ['#10b981', '#0e7490'], bestMode: 'low', scoreLabel: 'HAMLE', bestLabel: 'EN AZ',
    desc: 'Kartları çevir, aynı emojileri eşleştir. En az hamlede bitir!',
    help: '<ul><li>Bir karta dokun, sonra bir tane daha. Aynıysa açık kalırlar.</li><li>Farklıysa kısa süre sonra kapanırlar – yerlerini aklında tut!</li><li>Arka arkaya eşleşmeler <b>seri</b> yapar.</li><li>Rekorun, en az hamlede bitirdiğin oyundur.</li></ul>',
    options: [{ key: 'size', label: 'TAHTA', choices: [['easy', '3×4'], ['mid', '4×4'], ['hard', '4×5'], ['pro', '5×6']], def: 'mid' }],
    bestKey: o => o.size,
    icon: '<rect x="6" y="8" width="24" height="30" rx="5" fill="#fff"/><rect x="34" y="8" width="24" height="30" rx="5" fill="#6d4cff"/><rect x="6" y="42" width="24" height="16" rx="5" fill="#6d4cff"/><rect x="34" y="42" width="24" height="16" rx="5" fill="#fff"/><text x="18" y="29" font-size="16" text-anchor="middle">🦊</text><text x="46" y="55" font-size="11" text-anchor="middle">🦊</text>',
    create(s, o) {
      const [cols, rows] = SIZES[o.size];
      const pairs = cols * rows / 2;
      const icons = U.shuffle(EMO.slice()).slice(0, pairs);
      const deck = U.shuffle(icons.concat(icons));
      let first = null, lock = true, moves = 0, found = 0, streak = 0, maxStreak = 0, time = 0, done = false, started = false;

      const wrap = document.createElement('div');
      wrap.className = 'cv-wrap';
      s.stage.appendChild(wrap);
      const grid = document.createElement('div');
      grid.className = 'mem-grid';
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
      wrap.appendChild(grid);
      const ctrl = s.controls();
      const info = document.createElement('div'); info.className = 'pill'; ctrl.appendChild(info);
      const updInfo = () => { info.textContent = '⏱ ' + U.fmtTime(time) + ' · Eşleşen ' + found + '/' + pairs + (streak > 1 ? ' · 🔥 Seri x' + streak : ''); };

      const cards = deck.map((em, i) => {
        const c = document.createElement('div');
        c.className = 'mcard flip';
        c.innerHTML = '<div class="in"><div class="b"></div><div class="f">' + em + '</div></div>';
        c.dataset.i = i;
        grid.appendChild(c);
        return { el: c, em, open: true, done: false };
      });
      function layout() {
        const w = wrap.clientWidth - 20, h = wrap.clientHeight - 20;
        if (w < 10 || h < 10) return;
        const gap = 8;
        const cw = Math.min((w - gap * (cols - 1)) / cols, ((h - gap * (rows - 1)) / rows) * 0.82, 120);
        const ch = cw / 0.82;
        grid.style.width = (cw * cols + gap * (cols - 1)) + 'px';
        grid.style.gridTemplateRows = 'repeat(' + rows + ', ' + ch + 'px)';
        cards.forEach(c => { c.el.querySelector('.f').style.fontSize = Math.floor(cw * 0.55) + 'px'; });
      }
      layout();
      if (window.ResizeObserver) { const ro = new ResizeObserver(layout); ro.observe(wrap); s.cleanup(() => ro.disconnect()); }
      else s.on(window, 'resize', layout);

      // başlangıçta kısa bir bakış
      s.timeout(() => {
        cards.forEach(c => { c.open = false; c.el.classList.remove('flip'); });
        lock = false;
        started = true;
      }, 1300 + pairs * 40);
      updInfo();
      s.score(0);

      function tap(c) {
        if (lock || c.open || c.done || done || !s.active()) return;
        c.open = true;
        c.el.classList.add('flip');
        s.sfx('flip');
        if (!first) { first = c; return; }
        moves++;
        s.score(moves);
        const a = first, b = c;
        first = null;
        if (a.em === b.em) {
          a.done = b.done = true;
          found++; streak++;
          maxStreak = Math.max(maxStreak, streak);
          s.timeout(() => { a.el.classList.add('done'); b.el.classList.add('done'); }, 250);
          s.sfx(streak > 2 ? 'power' : 'coin');
          s.vibe(20);
          updInfo();
          if (found === pairs) {
            done = true;
            s.over({ win: true, score: moves, title: 'Hepsini buldun!', msg: moves + ' hamle · ' + U.fmtTime(time) + ' · En iyi seri: ' + bestStreak(), delay: 900 });
          }
        } else {
          streak = 0;
          lock = true;
          s.timeout(() => { a.el.classList.add('bad'); b.el.classList.add('bad'); }, 300);
          s.timeout(() => {
            for (const x of [a, b]) { x.open = false; x.el.classList.remove('flip', 'bad'); }
            lock = false;
            updInfo();
          }, 850);
        }
      }
      const bestStreak = () => maxStreak;
      cards.forEach(c => s.on(c.el, 'pointerdown', e => { e.preventDefault(); tap(c); }));

      s.loop(dt => {
        if (started && !done) {
          const b4 = Math.floor(time);
          time += dt;
          if (Math.floor(time) !== b4) updInfo();
        }
      }, null);
      return {};
    }
  });
})();
