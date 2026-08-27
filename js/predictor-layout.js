/* ══════════════════════════════════════════════════════════════════
   F-ATICS · PREDICTOR LAYOUT
   What this section presented first was wrong in five ways.

   1. Seven tool panels — backtest, GBT, OpenF1, Bayesian, self-check,
      priors, pace override — stood in front of the prediction. That
      is the apparatus before the answer.
   2. The constructor projection led with ten blank number fields
      asking you to type the championship standings in by hand. The
      site already fetches them live.
   3. The results area was an unexplained void until you pressed run.
   4. Each result row had SEVEN children inside a grid that declared
      SIX columns, so "fair odds" wrapped onto a line of its own and
      every remaining value sat under the wrong heading — pole under
      podium, podium under DNF. The header bar was a second, separate
      grid with its own widths (389px against the row's 370px), so
      even the six that fitted were pixels out.
   5. The podium's three tall boxes were empty <div
      class="podium-canvas"> left over from the 3D car that was
      removed — 140px of nothing each, three times over.

   None of the modelling changes. It just stops being the first thing
   you meet, and the numbers land under their own headings.

   Styles are injected from here rather than added to room.css so the
   module stands on its own.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const APPARATUS = [
        '.pred-walkforward', '.pred-gbt', '.pred-openf1', '.pred-bayesian',
        '.pred-calibration', '.pred-priors', '.pred-paceoverride', '.pred-bookmaker',
    ];

    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
    const same = (a, b) => a && b && (a === b || a.startsWith(b) || b.startsWith(a));

    /* ── Styles ─────────────────────────────────────────────────── */

    const CSS = `
/* Apparatus disclosure */
.appx { margin-top: clamp(28px,4vw,44px); border:1px solid var(--line);
        border-radius:8px; background:var(--surface); overflow:hidden; }
.appx__sum { display:grid; grid-template-columns:auto minmax(0,1fr) auto auto;
        align-items:center; gap:16px; padding:20px 24px; cursor:pointer; list-style:none; }
.appx__sum::-webkit-details-marker { display:none; }
.appx__sum:hover { background:var(--surface-2); }
.appx__k { font-family:var(--font-display); font-size:17px; font-weight:700;
        letter-spacing:-0.02em; text-transform:uppercase; color:var(--fg); }
.appx__t { font-size:13px; color:var(--fg-dim); }
.appx__n { font-family:var(--font-mono); font-size:10px; letter-spacing:0.16em;
        text-transform:uppercase; color:var(--fg-mute); }
.appx__c { width:10px; height:10px; border-right:2px solid var(--fg-mute);
        border-bottom:2px solid var(--fg-mute); transform:rotate(45deg) translateY(-2px);
        transition:transform 260ms ease; }
.appx[open] .appx__c { transform:rotate(225deg) translateY(-2px); }
.appx__body { display:grid; gap:16px; padding:4px 20px 22px; border-top:1px solid var(--line); }
.appx__body > * { box-shadow:none !important; background:var(--surface-2) !important; }

/* The self-consistency numbers were accent-red, drawing the eye straight
   to the least trustworthy figures on the page. */
.drawer .pred-calibration .pred-cal-stat__val { color:var(--fg-dim); }

/* Live-standings fold */
.pcc-fold { border:1px solid var(--line); border-radius:6px;
        background:var(--surface); margin:4px 0 16px; }
.pcc-fold__sum { display:grid; grid-template-columns:auto minmax(0,1fr) auto;
        align-items:center; gap:14px; padding:14px 18px; cursor:pointer; list-style:none; }
.pcc-fold__sum::-webkit-details-marker { display:none; }
.pcc-fold__sum:hover { background:var(--surface-2); }
.pcc-fold__k { font-family:var(--font-mono); font-size:10px; letter-spacing:0.16em;
        text-transform:uppercase; color:var(--fg-mute); }
.pcc-fold__v { font-size:13px; color:var(--fg-dim); }
.pcc-fold__e { font-family:var(--font-mono); font-size:10px; letter-spacing:0.14em;
        text-transform:uppercase; color:var(--accent-text,var(--accent)); }
.pcc-fold[open] .pcc-fold__e { color:var(--fg-mute); }
.pcc-fold > div { padding:0 18px 18px; }
.drawer .pcc-ytd-input[data-autofilled="1"] { color:var(--fg);
        border-color:color-mix(in srgb, var(--accent) 26%, var(--line)); }

/* Empty state */
.pred-empty { border:1px dashed var(--line-strong,var(--line)); border-radius:8px;
        padding:clamp(28px,4vw,44px); text-align:center; background:var(--surface); }
.pred-empty__k { font-family:var(--font-display); font-size:clamp(18px,2.4vw,24px);
        font-weight:700; letter-spacing:-0.02em; text-transform:uppercase;
        color:var(--fg); margin-bottom:10px; }
.pred-empty__p { max-width:54ch; margin:0 auto; font-size:14px; line-height:1.65; color:var(--fg-dim); }
.pred-empty__p b { color:var(--fg); font-weight:600; }

/* Results table — one grid, seven columns, shared by header and rows */
.drawer .pred-result-cols,
.drawer .pred-result-row {
        display:grid;
        grid-template-columns:54px minmax(0,2.3fr) repeat(5, minmax(0,1fr));
        align-items:center; gap:0 16px; padding-left:16px; padding-right:16px; }
.drawer .pred-result-cols > *:first-child { grid-column:1 / 3; }
.drawer .pred-result-cols { padding-top:10px; padding-bottom:10px;
        border-bottom:1px solid var(--line); }
.drawer .pred-result-cols > * { font-family:var(--font-mono); font-size:9.5px;
        letter-spacing:0.16em; text-transform:uppercase; color:var(--fg-mute); }
.drawer .pred-result-row { padding-top:14px; padding-bottom:14px; }
.drawer .pred-driver-info { display:flex; align-items:baseline; gap:7px;
        min-width:0; white-space:nowrap; }
.drawer .pred-driver-team { overflow:hidden; text-overflow:ellipsis; }
.drawer .pred-stat-val { font-variant-numeric:tabular-nums; }

/* Podium — the empty 3D-car canvases become the data */
.drawer .podium-col { position:relative; display:flex; flex-direction:column;
        justify-content:flex-end; align-items:center; gap:2px; height:100%;
        padding:0 10px 14px; overflow:hidden; border-radius:4px 4px 0 0; }
.drawer .podium-col__fill { position:absolute; left:0; right:0; bottom:0;
        height:var(--h,40%);
        background:linear-gradient(180deg,
            color-mix(in srgb, var(--team) 34%, transparent) 0%,
            color-mix(in srgb, var(--team) 10%, transparent) 100%);
        border-top:2px solid var(--team); }
.drawer .podium-col__v, .drawer .podium-col__l, .drawer .podium-col__t {
        position:relative; z-index:1; }
.drawer .podium-col__v { font-family:var(--font-display); font-size:clamp(24px,3vw,34px);
        font-weight:700; line-height:1; letter-spacing:-0.03em; color:var(--fg);
        font-variant-numeric:tabular-nums; }
.drawer .podium-col__v i { font-style:normal; font-size:0.48em; color:var(--fg-mute); margin-left:2px; }
.drawer .podium-col__l { font-family:var(--font-mono); font-size:8.5px;
        letter-spacing:0.16em; text-transform:uppercase; color:var(--fg-mute); }
.drawer .podium-col__t { margin-top:6px; font-size:11px; color:var(--fg-dim); }
/* Circuit meta: the middot separators are text nodes in a flex row with
   gap:normal, so every fact ran flush into the next. */
.drawer .circuit-meta { display:flex; flex-wrap:wrap; gap:4px 10px; align-items:center; }

.drawer .podium-spot.p1 .podium-canvas { min-height:190px; }
.drawer .podium-spot.p2 .podium-canvas { min-height:158px; }
.drawer .podium-spot.p3 .podium-canvas { min-height:138px; }
`;

    function injectCSS() {
        if (document.getElementById('predictor-layout-css')) return;
        const el = document.createElement('style');
        el.id = 'predictor-layout-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    /* ── 2. Fill the standings in from the live season ──────────── */
    function fillConstructors() {
        const rows = window.__seasonCtors;
        const inputs = document.querySelectorAll('.pcc-ytd-input');
        if (!Array.isArray(rows) || !rows.length || !inputs.length) return 0;

        let n = 0;
        inputs.forEach((inp) => {
            const want = norm(inp.dataset.team);
            const hit = rows.find((r) => same(want, norm(r.team)));
            if (!hit) return;
            inp.value = hit.points;
            inp.dataset.autofilled = '1';
            n++;
        });
        if (!n) return 0;

        // The grid becomes a correction affordance, not a data-entry chore.
        const grid = document.querySelector('#pred-constructor .pcc-ytd-grid')
                  || (inputs[0].closest('.pcc-ytd-row') || {}).parentElement;
        if (grid && !grid.closest('.pcc-fold')) {
            const fold = document.createElement('details');
            fold.className = 'pcc-fold';
            fold.innerHTML =
                '<summary class="pcc-fold__sum">' +
                '<span class="pcc-fold__k">Starting points</span>' +
                '<span class="pcc-fold__v">Auto-filled from the live ' +
                new Date().getFullYear() + ' standings</span>' +
                '<span class="pcc-fold__e">Adjust</span></summary>';
            grid.parentElement.insertBefore(fold, grid);
            fold.appendChild(grid);
        }

        const help = document.querySelector('#pred-constructor .pred-constructor__ytd-hint');
        if (help) {
            help.textContent = 'Anchored to the real championship as it stands today. ' +
                               'Open “Starting points” above to override any team.';
        }
        console.info('[predictor] constructor standings auto-filled (' + n + ' teams)');
        return n;
    }

    /* ── 4 & 5. Table headings, and a podium that means something ── */

    function stripBrackets(root) {
        root.querySelectorAll('.pred-result-cols > *').forEach((el) => {
            if (el.children.length) return;
            const out = el.textContent.replace(/^\s*\[\s*|\s*\]\s*$/g, '').trim();
            if (out !== el.textContent) el.textContent = out;
        });
    }

    function buildPodium() {
        const rows = [...document.querySelectorAll('#prediction-results .pred-result-row')];
        if (!rows.length) return;

        const info = new Map();
        rows.forEach((r) => {
            const n = r.querySelector('.pred-driver-name');
            const v = r.querySelector('.pred-stat-win .pred-stat-val');
            if (!n) return;
            info.set((n.dataset.driver || n.textContent).trim(), {
                win: parseFloat((v && v.textContent) || '') || 0,
                team: ((r.querySelector('.pred-driver-team') || {}).textContent || '').trim(),
            });
        });
        if (!info.size) return;
        const max = Math.max(...[...info.values()].map((v) => v.win), 1);

        [1, 2, 3].forEach((i) => {
            const nameEl = document.getElementById('podium-d' + i);
            const slot = document.getElementById('podium-c' + i);
            if (!nameEl || !slot) return;
            const d = info.get(nameEl.textContent.trim());
            if (!d) return;
            const colour = getComputedStyle(nameEl).borderLeftColor || 'currentColor';
            slot.className = 'podium-canvas podium-col';
            slot.style.setProperty('--team', colour);
            // A floor of 18% so a long-shot third place is still a column.
            slot.style.setProperty('--h', (18 + (d.win / max) * 74).toFixed(1) + '%');
            slot.innerHTML =
                '<i class="podium-col__fill"></i>' +
                '<span class="podium-col__v">' + d.win.toFixed(1) + '<i>%</i></span>' +
                '<span class="podium-col__l">win probability</span>' +
                '<span class="podium-col__t">' + d.team + '</span>';
        });
    }

    function watchResults() {
        const res = document.getElementById('prediction-results');
        if (res && !res.dataset.watched) {
            res.dataset.watched = '1';
            const apply = () => {
                if (!res.children.length) return;
                stripBrackets(res);
                buildPodium();
            };
            new MutationObserver(apply).observe(res, { childList: true, subtree: true });
            apply();
        }
    }

    /* ── 1 & 3. Order, and an empty state that says something ───── */
    function layout() {
        const wrap = document.querySelector('#predictor .predictor-wrapper');
        if (!wrap || wrap.querySelector('.appx')) return;

        const results = wrap.querySelector('#prediction-results');
        const ctor = wrap.querySelector('#pred-constructor');

        // The driver prediction is the headline; the season projection
        // is a second act, not a prologue.
        if (results && ctor) wrap.insertBefore(ctor, results.nextSibling);

        if (results && !wrap.querySelector('.pred-empty')) {
            const empty = document.createElement('div');
            empty.className = 'pred-empty';
            empty.innerHTML =
                '<div class="pred-empty__k">No simulation run yet</div>' +
                '<p class="pred-empty__p">Pick a circuit and press <b>Run simulation</b>. ' +
                'Five thousand Monte-Carlo races are sampled from current form, ' +
                'track affinity and grid position — you get win and podium ' +
                'probabilities for the full field, not a single guessed order.</p>';
            results.parentElement.insertBefore(empty, results);
            const sync = () => { empty.hidden = results.children.length > 0; };
            new MutationObserver(sync).observe(results, { childList: true });
            sync();
        }

        const panels = APPARATUS.map((s) => wrap.querySelector(s)).filter(Boolean);
        if (!panels.length) return;

        const box = document.createElement('details');
        box.className = 'appx';
        box.innerHTML =
            '<summary class="appx__sum">' +
            '<span class="appx__k">Model apparatus</span>' +
            '<span class="appx__t">Validation, training and priors</span>' +
            '<span class="appx__n">' + panels.length + ' panels</span>' +
            '<span class="appx__c" aria-hidden="true"></span></summary>' +
            '<div class="appx__body"></div>';
        const body = box.querySelector('.appx__body');
        panels.forEach((p) => body.appendChild(p));
        wrap.appendChild(box);
        console.info('[predictor] apparatus collapsed (' + panels.length + ' panels)');
    }

    function boot() {
        injectCSS();
        layout();
        watchResults();
        if (!fillConstructors()) {
            let n = 0;
            const t = setInterval(() => {
                if (fillConstructors() || ++n > 40) clearInterval(t);
            }, 800);
        }
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 400), { once: true });
    setTimeout(boot, 1600);
})();
