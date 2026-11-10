/* Mayın Tarlası */
(function () {
  const U = Platform.util;
  const NUMC = ['', '#4dabf7', '#51cf66', '#ff6b6b', '#b197fc', '#ffa94d', '#3bc9db', '#f783ac', '#ced4da'];
  const DIFF = { easy: [9, 9, 10], mid: [12, 16, 32], hard: [16, 26, 85] };

  Platform.register({
    id: 'mines', name: 'Mayın Tarlası', gen: 'retro', genre: 'Bulmaca',
    colors: ['#64748b', '#1e293b'], fmt: 'time', bestMode: 'low', scoreLabel: 'SÜRE', bestLabel: 'EN İYİ',
    desc: 'Sayılardan yola çıkarak tüm mayınları bul, hiçbirine basma!',
    help: '<ul><li><b>Dokun</b>: kareyi aç. <b>Uzun bas</b> ya da <b>sağ tık</b>: bayrak koy.</li><li>Alttaki düğmeyle <b>Bayrak modu</b>na geçersen dokunuşlar bayrak koyar.</li><li>Sayı, o karenin çevresindeki 8 karede kaç mayın olduğunu gösterir.</li><li>Etrafındaki bayrak sayısı tamamlanmış bir sayıya dokunursan kalan kareler otomatik açılır.</li><li>İlk dokunuş her zaman güvenlidir.</li></ul>',
    options: [{ key: 'diff', label: 'ZORLUK', choices: [['easy', 'Kolay 9×9'], ['mid', 'Orta 12×16'], ['hard', 'Zor 16×26']], def: 'easy' }],
    bestKey: o => o.diff,
    icon: '<rect x="6" y="6" width="52" height="52" rx="8" fill="#334155"/><rect x="10" y="10" width="20" height="20" rx="3" fill="#94a3b8"/><rect x="34" y="34" width="20" height="20" rx="3" fill="#94a3b8"/><text x="44" y="27" font-size="16" font-weight="900" fill="#4dabf7" text-anchor="middle" font-family="sans-serif">1</text><text x="20" y="51" font-size="16" font-weight="900" fill="#51cf66" text-anchor="middle" font-family="sans-serif">2</text><circle cx="20" cy="20" r="5" fill="#111"/><path d="M20 12v16M12 20h16" stroke="#111" stroke-width="2"/><path d="M41 38v13" stroke="#e2e8f0" stroke-width="2"/><path d="M41 38l9 4-9 4z" fill="#ef4444"/>',
    create(s, o) {
      const [COLS, ROWS, MINES] = DIFF[o.diff];
      const C = 32, W = COLS * C, H = ROWS * C;
      const view = s.canvas(W, H);
      const g = view.g;
      const N = COLS * ROWS;
      const mine = new Uint8Array(N), open = new Uint8Array(N), flag = new Uint8Array(N), num = new Uint8Array(N);
      let state = 'ready', time = 0, opened = 0, flags = 0, boom = -1, flagMode = false, shown = -1, anim = new Float32Array(N);
      const fx = new U.Particles();

      const ctrl = s.controls();
      const modeBtn = s.button(ctrl, '⛏️ Kaz', () => {
        flagMode = !flagMode;
        modeBtn.innerHTML = flagMode ? '🚩 Bayrak' : '⛏️ Kaz';
        modeBtn.classList.toggle('on', flagMode);
        s.sfx('click');
      }, '');
      modeBtn.style.minWidth = '120px';
      const cnt = document.createElement('div');
      cnt.className = 'pill';
      ctrl.appendChild(cnt);
      const updCnt = () => { cnt.textContent = '💣 ' + (MINES - flags); };
      updCnt();

      function nb(i, fn) {
        const x = i % COLS, y = (i / COLS) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) fn(ny * COLS + nx);
        }
      }
      function place(first) {
        const banned = new Set([first]);
        nb(first, j => banned.add(j));
        const cand = [];
        for (let i = 0; i < N; i++) if (!banned.has(i)) cand.push(i);
        U.shuffle(cand);
        for (let k = 0; k < MINES; k++) mine[cand[k]] = 1;
        for (let i = 0; i < N; i++) { let c = 0; nb(i, j => { c += mine[j]; }); num[i] = c; }
      }
      function reveal(i) {
        if (open[i] || flag[i]) return;
        if (state === 'ready') { place(i); state = 'run'; }
        if (mine[i]) { lose(i); return; }
        const q = [i];
        open[i] = 1; opened++; anim[i] = 0;
        let n = 0;
        while (q.length) {
          const c = q.shift();
          n++;
          if (num[c] === 0) nb(c, j => {
            if (!open[j] && !flag[j] && !mine[j]) { open[j] = 1; opened++; anim[j] = -Math.min(0.4, n * 0.004); q.push(j); }
          });
        }
        s.sfx(n > 1 ? 'pop' : 'flip');
        checkWin();
      }
      function chord(i) {
        let f = 0; nb(i, j => { f += flag[j]; });
        if (f !== num[i]) { s.sfx('error'); return; }
        const list = []; nb(i, j => { if (!open[j] && !flag[j]) list.push(j); });
        for (const j of list) { if (state !== 'run') break; reveal(j); }
      }
      function toggleFlag(i) {
        if (open[i] || state === 'lost' || state === 'won') return;
        flag[i] ^= 1;
        flags += flag[i] ? 1 : -1;
        updCnt();
        s.sfx('place'); s.vibe(25);
      }
      function lose(i) {
        state = 'lost'; boom = i;
        open[i] = 1;
        s.sfx('boom'); s.vibe(300);
        const x = (i % COLS) * C + C / 2, y = ((i / COLS) | 0) * C + C / 2;
        fx.burst(x, y, ['#ef4444', '#fb923c', '#fde047', '#fff'], 50, 260, 1, 4);
        let d = 0;
        for (let j = 0; j < N; j++) if (mine[j] && j !== i && !flag[j]) { anim[j] = -(0.1 + (d++) * 0.02); }
        s.over({ win: false, score: Math.floor(time), title: 'Mayına bastın!', msg: 'Açılan güvenli kare: ' + opened + ' / ' + (N - MINES), delay: 1300 });
      }
      function checkWin() {
        if (opened === N - MINES && state === 'run') {
          state = 'won';
          for (let j = 0; j < N; j++) if (mine[j] && !flag[j]) { flag[j] = 1; flags++; }
          updCnt();
          s.score(Math.floor(time));
          s.over({ win: true, score: Math.max(1, Math.floor(time)), title: 'Tarlayı temizledin!', msg: 'Süre: ' + U.fmtTime(time), delay: 700 });
        }
      }
      function act(i, isFlag) {
        if (state === 'lost' || state === 'won') return;
        if (isFlag) { toggleFlag(i); return; }
        if (open[i]) { if (num[i] > 0) chord(i); return; }
        if (flag[i]) return;
        reveal(i);
      }
      function cellAt(e) {
        const p = view.pt(e);
        const x = Math.floor(p.x / C), y = Math.floor(p.y / C);
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return -1;
        return y * COLS + x;
      }
      let press = null;
      s.on(view.cv, 'pointerdown', e => {
        if (!s.active()) return;
        const i = cellAt(e);
        if (i < 0) return;
        if (e.button === 2) { act(i, true); return; }
        shown = i;
        press = { id: e.pointerId, i, x: e.clientX, y: e.clientY, done: false };
        press.timer = s.timeout(() => {
          if (press && !press.done && s.active()) {
            press.done = true;
            if (!open[press.i]) act(press.i, !flagMode);
            else act(press.i, false);
            s.vibe(40);
          }
        }, 380);
      });
      s.on(view.cv, 'pointermove', e => {
        if (press && press.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 12) { clearTimeout(press.timer); press = null; shown = -1; }
      });
      s.on(view.cv, 'pointerup', e => {
        shown = -1;
        if (!press || press.id !== e.pointerId) return;
        clearTimeout(press.timer);
        if (!press.done && s.active()) act(press.i, flagMode && !open[press.i]);
        press = null;
      });
      s.on(view.cv, 'pointercancel', () => { if (press) clearTimeout(press.timer); press = null; shown = -1; });

      function drawMine(cx, cy, r) {
        g.strokeStyle = '#111'; g.lineWidth = r * 0.28;
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 4;
          g.beginPath(); g.moveTo(cx - Math.cos(a) * r * 1.35, cy - Math.sin(a) * r * 1.35); g.lineTo(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35); g.stroke();
        }
        g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.35, r * 0.25, 0, Math.PI * 2); g.fill();
      }
      function drawFlag(x, y) {
        g.strokeStyle = '#e2e8f0'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x + C * 0.4, y + C * 0.2); g.lineTo(x + C * 0.4, y + C * 0.8); g.stroke();
        g.fillStyle = '#ef4444';
        g.beginPath(); g.moveTo(x + C * 0.42, y + C * 0.2); g.lineTo(x + C * 0.78, y + C * 0.36); g.lineTo(x + C * 0.42, y + C * 0.52); g.closePath(); g.fill();
        g.fillStyle = '#e2e8f0'; g.fillRect(x + C * 0.26, y + C * 0.76, C * 0.3, C * 0.08);
      }

      s.loop(dt => {
        fx.update(dt);
        for (let i = 0; i < N; i++) if (anim[i] < 1) anim[i] = Math.min(1, anim[i] + dt * 6);
        if (state === 'run') {
          const before = Math.floor(time);
          time += dt;
          if (Math.floor(time) !== before) s.score(Math.floor(time));
        }
      }, dt => {
        if (!s.active()) { fx.update(dt || 0); for (let i = 0; i < N; i++) if (anim[i] < 1) anim[i] = Math.min(1, anim[i] + (dt || 0) * 6); }
        g.fillStyle = '#0f172a'; g.fillRect(0, 0, W, H);
        for (let i = 0; i < N; i++) {
          const x = (i % COLS) * C, y = ((i / COLS) | 0) * C;
          if (open[i] || (state === 'lost' && mine[i])) {
            const a = Math.max(0, anim[i]);
            g.fillStyle = i === boom ? '#dc2626' : ((i % COLS + ((i / COLS) | 0)) % 2 ? '#1e293b' : '#223047');
            g.fillRect(x, y, C, C);
            if (a <= 0) {
              g.fillStyle = '#64748b'; g.fillRect(x + 1, y + 1, C - 2, C - 2);
              continue;
            }
            const sc = U.easeOutBack(a);
            if (mine[i]) {
              if (flag[i] && i !== boom) { drawFlag(x, y); continue; }
              drawMine(x + C / 2, y + C / 2, C * 0.22 * sc);
            } else if (num[i]) {
              g.save(); g.translate(x + C / 2, y + C / 2 + 1); g.scale(sc, sc);
              U.text(g, String(num[i]), 0, 0, C * 0.58, NUMC[num[i]], 'center', 900);
              g.restore();
            }
          } else {
            const grd = g.createLinearGradient(x, y, x, y + C);
            grd.addColorStop(0, i === shown ? '#94a3b8' : '#71839c'); grd.addColorStop(1, i === shown ? '#7b8ba3' : '#4f5f78');
            g.fillStyle = grd;
            U.rr(g, x + 1.5, y + 1.5, C - 3, C - 3, 5); g.fill();
            g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 4, y + 3, C - 8, 2);
            if (flag[i]) {
              drawFlag(x, y);
              if (state === 'lost' && !mine[i]) {
                g.strokeStyle = '#fde047'; g.lineWidth = 3;
                g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(x + C - 6, y + C - 6); g.moveTo(x + C - 6, y + 6); g.lineTo(x + 6, y + C - 6); g.stroke();
              }
            }
          }
        }
        fx.draw(g);
      });
      return {};
    }
  });
})();
