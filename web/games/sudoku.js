/* Sudoku - benzersiz çözümlü bulmaca üretici ile */
(function () {
  const U = Platform.util;
  const popc = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
  const R = i => (i / 9) | 0, Cc = i => i % 9, B = i => ((R(i) / 3) | 0) * 3 + ((Cc(i) / 3) | 0);

  function solver(grid, limit, randomize) {
    const rows = new Int32Array(9), cols = new Int32Array(9), boxes = new Int32Array(9);
    for (let i = 0; i < 81; i++) { const v = grid[i]; if (v) { const b = 1 << v; rows[R(i)] |= b; cols[Cc(i)] |= b; boxes[B(i)] |= b; } }
    let count = 0, steps = 0;
    function rec() {
      if (++steps > 200000) return;
      let best = -1, bestMask = 0, bestCnt = 10;
      for (let i = 0; i < 81; i++) {
        if (grid[i]) continue;
        const m = ~(rows[R(i)] | cols[Cc(i)] | boxes[B(i)]) & 0x3fe;
        const n = popc(m);
        if (n < bestCnt) { best = i; bestMask = m; bestCnt = n; if (n === 0) return; }
      }
      if (best < 0) { count++; return; }
      const vals = [];
      for (let v = 1; v <= 9; v++) if (bestMask & (1 << v)) vals.push(v);
      if (randomize) U.shuffle(vals);
      const r = R(best), c = Cc(best), b = B(best);
      for (const v of vals) {
        const bit = 1 << v;
        grid[best] = v; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        rec();
        if (count >= limit) return;
        grid[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      }
    }
    rec();
    return count;
  }
  function generate(clues) {
    const sol = new Int8Array(81);
    solver(sol, 1, true);
    const puz = sol.slice();
    const order = U.shuffle([...Array(81).keys()]);
    let n = 81;
    for (const i of order) {
      if (n <= clues) break;
      const v = puz[i];
      puz[i] = 0;
      if (solver(puz.slice(), 2, false) !== 1) puz[i] = v; else n--;
    }
    return { sol, puz };
  }

  Platform.register({
    id: 'sudoku', name: 'Sudoku', gen: 'modern', genre: 'Bulmaca',
    colors: ['#0ea5e9', '#1e3a8a'], fmt: 'time', bestMode: 'low', scoreLabel: 'SÜRE',
    desc: 'Her satır, sütun ve 3×3 kutuya 1\'den 9\'a kadar rakamları yerleştir.',
    help: '<ul><li>Bir kareye dokun, ardından alttan rakam seç. Klavyede <b>1-9</b>, <b>ok tuşları</b>, <b>Sil</b>.</li><li>Her <b>satır</b>, <b>sütun</b> ve <b>3×3 kutu</b> 1-9 rakamlarını birer kez içermeli.</li><li><b>Not</b> modunda küçük aday rakamlar yazabilirsin (klavyede <b>N</b>).</li><li>Yanlış rakamlar kırmızı görünür. 3 <b>ipucu</b> hakkın var.</li><li>Her bulmacanın tek bir çözümü vardır.</li></ul>',
    options: [{ key: 'diff', label: 'ZORLUK', choices: [['easy', 'Kolay'], ['mid', 'Orta'], ['hard', 'Zor']], def: 'easy' }],
    bestKey: o => o.diff,
    icon: '<rect x="6" y="6" width="52" height="52" rx="6" fill="#e0f2fe"/><path d="M23.3 6v52M40.6 6v52M6 23.3h52M6 40.6h52" stroke="#1e3a8a" stroke-width="2.5"/><text x="14.6" y="20" font-size="11" font-weight="900" fill="#1e3a8a" text-anchor="middle" font-family="sans-serif">5</text><text x="32" y="37" font-size="11" font-weight="900" fill="#0284c7" text-anchor="middle" font-family="sans-serif">3</text><text x="49.3" y="54" font-size="11" font-weight="900" fill="#1e3a8a" text-anchor="middle" font-family="sans-serif">8</text><text x="49.3" y="20" font-size="11" font-weight="900" fill="#0284c7" text-anchor="middle" font-family="sans-serif">1</text><text x="14.6" y="54" font-size="11" font-weight="900" fill="#1e3a8a" text-anchor="middle" font-family="sans-serif">9</text>',
    create(s, o) {
      const W = 360, H = 360, CS = 40;
      const view = s.canvas(W, H);
      const g = view.g;
      const { sol, puz } = generate({ easy: 40, mid: 32, hard: 26 }[o.diff]);
      const given = puz.map(v => v > 0);
      const val = Int8Array.from(puz);
      const notes = new Uint16Array(81);
      let sel = given.indexOf(false), noteMode = false, mistakes = 0, hints = 3, time = 0, done = false, flash = 0;
      const undoSt = [];
      const fx = new U.Particles();

      // tuş takımı
      const pad1 = s.controls('tight'), pad2 = s.controls('tight'), tools = s.controls('tight');
      const numBtns = [];
      for (let n = 1; n <= 9; n++) {
        const b = s.button(n <= 5 ? pad1 : pad2, String(n), () => input(n), '');
        b.style.cssText = 'width:58px;height:50px;font-size:22px;flex-direction:column;gap:0;padding:0';
        numBtns.push(b);
      }
      const delB = s.button(pad2, '⌫', erase, 'ghost');
      delB.style.cssText = 'width:58px;height:50px;font-size:20px';
      const noteB = s.button(tools, '✏️ Not', () => { noteMode = !noteMode; noteB.classList.toggle('on', noteMode); s.sfx('click'); }, '');
      const hintB = s.button(tools, '', hint, '');
      const undoB = s.button(tools, '↶ Geri', undo, '');
      const mistakeP = document.createElement('div'); mistakeP.className = 'pill'; tools.appendChild(mistakeP);
      function updUI() {
        const cnt = new Array(10).fill(0);
        for (let i = 0; i < 81; i++) if (val[i] && val[i] === sol[i]) cnt[val[i]]++;
        numBtns.forEach((b, k) => {
          const n = k + 1, left = 9 - cnt[n];
          b.innerHTML = n + '<small>' + (left > 0 ? left : '✓') + '</small>';
          b.disabled = left <= 0;
        });
        hintB.innerHTML = '💡 İpucu <small>(' + hints + ')</small>';
        hintB.disabled = hints <= 0 || done;
        undoB.disabled = !undoSt.length || done;
        mistakeP.textContent = '✖ ' + mistakes;
      }
      function canEdit() { return sel >= 0 && !given[sel] && !done && !(val[sel] && val[sel] === sol[sel]); }
      function push() { undoSt.push({ i: sel, v: val[sel], n: notes[sel], peers: null }); if (undoSt.length > 400) undoSt.shift(); }
      function peers(i) {
        const out = [];
        for (let j = 0; j < 81; j++) if (j !== i && (R(j) === R(i) || Cc(j) === Cc(i) || B(j) === B(i))) out.push(j);
        return out;
      }
      function input(n) {
        if (!canEdit()) { if (sel >= 0 && (given[sel] || val[sel] === sol[sel])) s.sfx('error'); return; }
        if (noteMode) {
          if (val[sel]) return;
          push();
          notes[sel] ^= 1 << n;
          s.sfx('tick');
        } else {
          if (val[sel] === n) return;
          push();
          // akranlardaki notları temizle (geri alınabilir)
          const pr = peers(sel), saved = [];
          for (const j of pr) if (notes[j] & (1 << n)) { saved.push([j, notes[j]]); notes[j] &= ~(1 << n); }
          undoSt[undoSt.length - 1].peers = saved;
          val[sel] = n; notes[sel] = 0;
          if (n !== sol[sel]) { mistakes++; s.sfx('error'); s.vibe(80); }
          else {
            s.sfx('place');
            const x = Cc(sel) * CS + CS / 2, y = R(sel) * CS + CS / 2;
            fx.burst(x, y, '#7dd3fc', 6, 90, 0.35, 2);
            checkUnits(sel);
          }
          checkWin();
        }
        updUI();
      }
      function checkUnits(i) {
        const units = [
          [...Array(81).keys()].filter(j => R(j) === R(i)),
          [...Array(81).keys()].filter(j => Cc(j) === Cc(i)),
          [...Array(81).keys()].filter(j => B(j) === B(i))
        ];
        for (const u of units) if (u.every(j => val[j] === sol[j])) {
          for (const j of u) fx.burst(Cc(j) * CS + CS / 2, R(j) * CS + CS / 2, ['#38bdf8', '#fff'], 3, 80, 0.4, 2);
          s.sfx('line');
        }
      }
      function erase() {
        if (!canEdit() || (!val[sel] && !notes[sel])) return;
        push();
        val[sel] = 0; notes[sel] = 0;
        s.sfx('move');
        updUI();
      }
      function undo() {
        const u = undoSt.pop();
        if (!u || done) return;
        val[u.i] = u.v; notes[u.i] = u.n;
        if (u.peers) for (const [j, n] of u.peers) notes[j] = n;
        sel = u.i;
        s.sfx('move');
        updUI();
      }
      function hint() {
        if (hints <= 0 || done) return;
        let i = sel;
        if (i < 0 || given[i] || val[i] === sol[i]) {
          const empty = [];
          for (let j = 0; j < 81; j++) if (!given[j] && val[j] !== sol[j]) empty.push(j);
          if (!empty.length) return;
          i = U.pick(empty);
        }
        hints--;
        sel = i;
        val[i] = sol[i]; notes[i] = 0;
        given[i] = true; // ipucu sabit olur
        time += 15;
        s.sfx('power');
        s.toast('İpucu kullanıldı (+15 sn)', 1000);
        checkUnits(i);
        checkWin();
        updUI();
      }
      function checkWin() {
        for (let i = 0; i < 81; i++) if (val[i] !== sol[i]) return;
        done = true; flash = 1;
        s.score(Math.floor(time));
        s.over({ win: true, score: Math.max(1, Math.floor(time)), title: 'Bulmaca çözüldü!', msg: 'Süre: ' + U.fmtTime(time) + ' · Hata: ' + mistakes + ' · İpucu: ' + (3 - hints), delay: 1100 });
      }

      s.on(view.cv, 'pointerdown', e => {
        if (!s.active() || done) return;
        const p = view.pt(e);
        const c = Math.floor(p.x / CS), r = Math.floor(p.y / CS);
        if (c < 0 || c > 8 || r < 0 || r > 8) return;
        sel = r * 9 + c;
        s.sfx('tick');
      });
      s.key(e => {
        const k = e.key;
        if (k >= '1' && k <= '9') input(+k);
        else if (k === 'Backspace' || k === 'Delete' || k === '0') erase();
        else if (k === 'n' || k === 'N') { noteMode = !noteMode; noteB.classList.toggle('on', noteMode); }
        else if (k.indexOf('Arrow') === 0) {
          if (sel < 0) sel = 0;
          let r = R(sel), c = Cc(sel);
          if (k === 'ArrowUp') r = (r + 8) % 9; else if (k === 'ArrowDown') r = (r + 1) % 9;
          else if (k === 'ArrowLeft') c = (c + 8) % 9; else c = (c + 1) % 9;
          sel = r * 9 + c;
        } else if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey)) undo();
      });

      updUI();

      s.loop(dt => {
        fx.update(dt);
        if (!done) {
          const b4 = Math.floor(time);
          time += dt;
          if (Math.floor(time) !== b4) s.score(Math.floor(time));
        }
      }, dt => {
        if (!s.active()) fx.update(dt || 0);
        if (flash > 0) flash -= (dt || 0.016) * 0.8;
        g.fillStyle = '#f8fafc'; g.fillRect(0, 0, W, H);
        const sv = sel >= 0 ? val[sel] : 0;
        for (let i = 0; i < 81; i++) {
          const x = Cc(i) * CS, y = R(i) * CS;
          let bg = null;
          if (sel >= 0 && (R(i) === R(sel) || Cc(i) === Cc(sel) || B(i) === B(sel))) bg = '#e2ecfa';
          if (sv && val[i] === sv) bg = '#c7dcf7';
          if (i === sel) bg = '#9ec5fe';
          if (bg) { g.fillStyle = bg; g.fillRect(x, y, CS, CS); }
          if (val[i]) {
            const wrong = val[i] !== sol[i];
            if (wrong) { g.fillStyle = 'rgba(239,68,68,.15)'; g.fillRect(x, y, CS, CS); }
            const col = given[i] ? (puz[i] ? '#0f172a' : '#7c3aed') : wrong ? '#dc2626' : '#2563eb';
            U.text(g, String(val[i]), x + CS / 2, y + CS / 2 + 1, 24, col, 'center', given[i] && puz[i] ? 800 : 700);
          } else if (notes[i]) {
            for (let n = 1; n <= 9; n++) if (notes[i] & (1 << n)) {
              const nx = x + ((n - 1) % 3) * (CS / 3) + CS / 6, ny = y + (((n - 1) / 3) | 0) * (CS / 3) + CS / 6 + 0.5;
              U.text(g, String(n), nx, ny, 10, n === sv ? '#1d4ed8' : '#64748b', 'center', 700);
            }
          }
        }
        // çizgiler
        for (let k = 0; k <= 9; k++) {
          g.strokeStyle = k % 3 === 0 ? '#1e293b' : '#cbd5e1';
          g.lineWidth = k % 3 === 0 ? 2.2 : 1;
          const p = Math.min(W - 1, Math.max(1, k * CS));
          g.beginPath(); g.moveTo(p, 0); g.lineTo(p, H); g.stroke();
          g.beginPath(); g.moveTo(0, p); g.lineTo(W, p); g.stroke();
        }
        if (flash > 0) { g.fillStyle = 'rgba(56,189,248,' + flash * 0.4 + ')'; g.fillRect(0, 0, W, H); }
        fx.draw(g);
      });
      return {};
    }
  });
  Platform._sudoku = { generate, solver };
})();
