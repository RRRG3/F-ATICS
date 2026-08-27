/* ══════════════════════════════════════════════════════════════════
   F-ATICS · DRAWER UPGRADES
   Three fixes across two drawers.

   1. SHOWCASE ORDER. The cards ran 01–11 in a fixed authoring order
      while the championship position sat in 10px type in the footer.
      Mercedes led the title with 425 points and was card 04, below
      McLaren at 01. The big numeral was the meaningless one. Cards
      are now ordered by championship position, and the numeral IS
      the position.

   2. PACE HAS NO SHAPE. The session table printed median pace as bare
      numerals — 1:16.201 down to 1:18.433, a 2.2-second spread you
      had to compute in your head. Each row now carries the gap to
      the session's best median and a bar scaled to it.

   3. TEAM RADIO. Eight default browser <audio controls> players, each
      a grey slab of native chrome, stacked down the page. Same audio,
      driven by a compact control that belongs to this design.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const CSS = `
/* Pace bars */
.sess__pace { display: block; font-variant-numeric: tabular-nums; }
.sess__gap { display: block; font-family: var(--font-mono); font-size: 9.5px;
    letter-spacing: 0.04em; color: var(--fg-mute); margin-top: 2px; }
.sess__gap.is-best { color: var(--accent-text, var(--accent)); }
.sess__pacebar { display: block; height: 3px; margin-top: 5px; border-radius: 2px;
    background: var(--line); overflow: hidden; max-width: 132px; }
.sess__pacebar i { display: block; height: 100%; border-radius: 2px;
    background: var(--accent); opacity: 0.75; }

/* Team radio */
.radio { display: grid; gap: 8px; }
.radio__i { display: grid !important;
    grid-template-columns: auto 46px 52px auto minmax(0, 1fr) auto;
    align-items: center; gap: 12px; padding: 10px 14px;
    border: 1px solid var(--line); border-radius: 6px; background: var(--surface); }
.radio__i:hover { background: var(--surface-2); }
.radio__d { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; color: var(--fg); }
.radio__t { font-family: var(--font-mono); font-size: 10px; color: var(--fg-mute); }
.radio__a { display: none !important; }

.radio__play { width: 30px; height: 30px; flex: 0 0 auto; border-radius: 50%;
    border: 1px solid var(--line-strong, var(--line)); background: var(--surface-2);
    color: var(--fg); cursor: pointer; display: flex; align-items: center;
    justify-content: center; padding: 0; transition: background 160ms ease, border-color 160ms ease; }
.radio__play:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
.radio__play svg { width: 11px; height: 11px; fill: currentColor; }

.radio__track { height: 3px; border-radius: 2px; background: var(--line);
    overflow: hidden; cursor: pointer; }
.radio__track i { display: block; height: 100%; width: 0%; background: var(--accent); }
.radio__time { font-family: var(--font-mono); font-size: 10px; color: var(--fg-mute);
    font-variant-numeric: tabular-nums; min-width: 34px; text-align: right; }

@media (max-width: 700px) {
  .radio__i { grid-template-columns: auto 44px auto minmax(0,1fr) auto; }
  .radio__t { display: none; }
}
`;

    function injectCSS() {
        if (document.getElementById('drawer-upgrades-css')) return;
        const el = document.createElement('style');
        el.id = 'drawer-upgrades-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    /* ── 1. Order the grid by championship position ──────────────── */
    function orderShowcase() {
        const grid = document.querySelector('#showcase .team-grid');
        if (!grid || grid.dataset.ordered === '1') return false;
        const cards = [...grid.querySelectorAll('.lab-team-card')];
        if (cards.length < 2) return false;

        const rank = (card) => {
            // The label and value have no separator between them, so
            // textContent reads "ConstructorsP3 · 263 pts" — a \b before
            // the P never matches, because "s" to "P" is letter to letter.
            const m = (card.textContent || '').match(/P(\d+)\s*·\s*[\d,]+\s*pts/i);
            return m ? +m[1] : 999;          // unranked teams fall to the back
        };
        const ranks = cards.map(rank);
        // Nothing to order until the standings have actually landed.
        if (!ranks.some((r) => r !== 999)) return false;

        // The plates are injected asynchronously, so a card can still be
        // unranked on an early pass. Re-order when that changes rather
        // than freezing a team at "—".
        const sig = ranks.join(',');
        if (grid.dataset.rankSig === sig) return ranks.every((r) => r !== 999);
        grid.dataset.rankSig = sig;

        cards.slice().sort((a, b) => rank(a) - rank(b)).forEach((c) => grid.appendChild(c));

        cards.forEach((c) => {
            const idx = c.querySelector('.lab-team-card__index');
            if (!idx) return;
            const r = rank(c);
            idx.textContent = r === 999 ? '—' : String(r).padStart(2, '0');
        });

        // Only call it done once every card has a position.
        if (!ranks.every((r) => r !== 999)) return false;
        grid.dataset.ordered = '1';
        console.info('[showcase] ordered by championship position');
        return true;
    }

    /* ── 2. Give median pace a shape ─────────────────────────────── */
    const toSec = (t) => {
        const m = String(t || '').trim().match(/^(?:(\d+):)?(\d+)\.(\d+)$/);
        if (!m) return NaN;
        return (+(m[1] || 0)) * 60 + +m[2] + +('0.' + m[3]);
    };

    function paceBars() {
        const table = document.querySelector('#live-telemetry .sess__table');
        if (!table || table.dataset.paced === '1') return false;

        const rows = [...table.querySelectorAll('tbody tr')];
        if (!rows.length) return false;

        // Median pace is column 4 in this table's header order.
        const head = [...table.querySelectorAll('thead th')].map((t) => t.textContent.trim().toLowerCase());
        const col = head.indexOf('median pace');
        if (col < 0) return false;

        const vals = rows.map((r) => toSec((r.children[col] || {}).textContent));
        const ok = vals.filter(Number.isFinite);
        if (ok.length < 2) return false;
        const best = Math.min(...ok), worst = Math.max(...ok);
        const span = worst - best || 1;

        rows.forEach((r, i) => {
            const cell = r.children[col];
            const v = vals[i];
            if (!cell || !Number.isFinite(v)) return;
            const gap = v - best;
            // Fastest fills the bar; the slowest keeps a visible sliver.
            const w = 8 + (1 - gap / span) * 92;
            cell.innerHTML =
                '<span class="sess__pace">' + cell.textContent.trim() + '</span>' +
                '<span class="sess__gap' + (gap < 0.0005 ? ' is-best' : '') + '">' +
                    (gap < 0.0005 ? 'session best' : '+' + gap.toFixed(3)) + '</span>' +
                '<span class="sess__pacebar"><i style="width:' + w.toFixed(1) + '%"></i></span>';
        });

        table.dataset.paced = '1';
        console.info('[telemetry] pace bars on ' + rows.length + ' rows');
        return true;
    }

    /* ── 3. A radio player that belongs to this design ───────────── */
    const PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>';
    const PAUSE = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>';
    const mmss = (s) => {
        if (!Number.isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    };

    function radioPlayers() {
        const items = [...document.querySelectorAll('.radio__i')];
        if (!items.length) return false;
        let built = 0;

        items.forEach((li) => {
            const audio = li.querySelector('audio');
            if (!audio || li.dataset.player === '1') return;
            audio.removeAttribute('controls');

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'radio__play';
            btn.innerHTML = PLAY;
            btn.setAttribute('aria-label', 'Play team radio');

            const track = document.createElement('div');
            track.className = 'radio__track';
            track.innerHTML = '<i></i>';
            const fill = track.querySelector('i');

            const time = document.createElement('span');
            time.className = 'radio__time';
            time.textContent = '0:00';

            li.insertBefore(btn, audio);
            li.insertBefore(track, audio);
            li.insertBefore(time, audio);

            btn.addEventListener('click', () => {
                if (audio.paused) {
                    // Only one clip at a time.
                    document.querySelectorAll('.radio__i audio').forEach((a) => {
                        if (a !== audio) a.pause();
                    });
                    audio.play().catch(() => {});
                } else {
                    audio.pause();
                }
            });

            audio.addEventListener('play', () => { btn.innerHTML = PAUSE; });
            audio.addEventListener('pause', () => { btn.innerHTML = PLAY; });
            audio.addEventListener('ended', () => { btn.innerHTML = PLAY; fill.style.width = '0%'; });
            audio.addEventListener('timeupdate', () => {
                const d = audio.duration;
                if (Number.isFinite(d) && d > 0) fill.style.width = ((audio.currentTime / d) * 100) + '%';
                time.textContent = mmss(audio.currentTime);
            });
            audio.addEventListener('loadedmetadata', () => { time.textContent = mmss(audio.duration); });

            track.addEventListener('click', (e) => {
                const d = audio.duration;
                if (!Number.isFinite(d) || d <= 0) return;
                const r = track.getBoundingClientRect();
                audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * d;
            });

            li.dataset.player = '1';
            built++;
        });

        if (built) console.info('[telemetry] ' + built + ' radio players restyled');
        return built > 0;
    }

    /* ── Boot ─────────────────────────────────────────────────────
       The telemetry extras are fetched from OpenF1 after the section
       renders, and on a cold cache the team radio can arrive well after
       any fixed polling window closes — it was absent entirely on one
       load and present with eight clips on another. So the DOM is
       watched as well as polled, and every job is idempotent. */
    const JOBS = [orderShowcase, paceBars, radioPlayers];

    function runAll() {
        JOBS.forEach((fn) => { try { fn(); } catch (e) { console.warn('[upgrades]', e && e.message); } });
    }

    function boot() {
        injectCSS();
        runAll();

        let n = 0;
        const t = setInterval(() => { runAll(); if (++n > 60) clearInterval(t); }, 700);

        const host = document.getElementById('live-telemetry')
                  || document.querySelector('#drawer-live-telemetry');
        if (host && !host.dataset.upgradeWatched) {
            host.dataset.upgradeWatched = '1';
            let queued = false;
            new MutationObserver(() => {
                if (queued) return;
                queued = true;
                // Coalesce: the extras land as four separate insertions.
                setTimeout(() => { queued = false; paceBars(); radioPlayers(); }, 120);
            }).observe(host, { childList: true, subtree: true });
        }
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 500), { once: true });
    document.addEventListener('room:open', () => setTimeout(boot, 400));
    setTimeout(boot, 1800);
})();
