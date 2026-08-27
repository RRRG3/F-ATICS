/* ══════════════════════════════════════════════════════════════════
   F-ATICS · TRIVIA LAYOUT
   The deck was a 720px card with margin:0 sitting in a 1240px rail —
   pinned to the top-left corner with roughly 900px of dead space
   below and to the right of it. It read like a rendering failure.

   It becomes a two-column spread: a scoreboard rail that actually
   tracks the run, and the question card beside it at a readable
   measure. The rail records which questions you got right, which the
   old "0 correct" in 9px mono never did — it only ever showed a
   running total with no sense of the arc through ten questions.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const TOTAL_FALLBACK = 10;

    const CSS = `
.quiz { max-width: 1120px !important; margin: 0 auto !important; }

.qx { display: grid; grid-template-columns: 264px minmax(0, 1fr);
      gap: clamp(20px, 2.6vw, 34px); align-items: start; }

/* Scoreboard rail */
.qx__rail { position: sticky; top: 96px; display: grid; gap: 22px;
      padding: 24px; border: 1px solid var(--line); border-radius: 8px;
      background: var(--surface); }
.qx__k { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.18em;
      text-transform: uppercase; color: var(--fg-mute); display: block; margin-bottom: 8px; }
.qx__count { font-family: var(--font-display); font-weight: 700; letter-spacing: -0.04em;
      line-height: 1; color: var(--fg); font-variant-numeric: tabular-nums; font-size: 46px; }
.qx__count i { font-style: normal; color: var(--fg-mute); font-size: 0.5em; margin-left: 4px; }

/* One pip per question: the arc through the round, at a glance. */
.qx__pips { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.qx__pip { height: 26px; border-radius: 3px; border: 1px solid var(--line);
      background: var(--surface-2); display: flex; align-items: center;
      justify-content: center; font-family: var(--font-mono); font-size: 9px;
      color: var(--fg-mute); transition: background 200ms ease, border-color 200ms ease; }
.qx__pip.is-now { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); color: var(--fg); }
.qx__pip.is-right { background: color-mix(in srgb, #3E8E5A 34%, transparent);
      border-color: #3E8E5A; color: var(--fg); }
.qx__pip.is-wrong { background: color-mix(in srgb, var(--accent) 26%, transparent);
      border-color: var(--accent); color: var(--fg); }

.qx__score { display: flex; align-items: baseline; gap: 10px; }
.qx__score b { font-family: var(--font-display); font-size: 40px; font-weight: 700;
      line-height: 1; letter-spacing: -0.03em; color: var(--fg); font-variant-numeric: tabular-nums; }
.qx__score span { font-size: 12px; color: var(--fg-dim); }

/* The card itself had room to breathe and never used it. */
.qx .quiz__card { padding: clamp(26px, 3vw, 38px) !important; }
.qx .quiz__q { font-size: clamp(21px, 2.5vw, 30px) !important; line-height: 1.25 !important;
      letter-spacing: -0.02em; margin-bottom: 22px !important; max-width: 34ch; }
.qx .quiz__opt { min-height: 62px !important; font-size: 15px !important; }
.qx .quiz__key { flex: 0 0 auto; }

/* The rail carries the counter now, so the card stops repeating it. */
.qx .quiz__step { display: none !important; }

@media (max-width: 900px) {
  .qx { grid-template-columns: 1fr; }
  .qx__rail { position: static; }
  .qx__pips { grid-template-columns: repeat(10, 1fr); }
}
`;

    function injectCSS() {
        if (document.getElementById('quiz-layout-css')) return;
        const el = document.createElement('style');
        el.id = 'quiz-layout-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    // "Question 3 of 10" / "2 correct" is all the DOM exposes, so the
    // per-question record is reconstructed from how those two move: when
    // the index advances, the question just left was right if the score
    // went up with it.
    const state = { n: 0, correct: 0, marks: [], total: TOTAL_FALLBACK };

    function readStep(card) {
        const step = card.querySelector('.quiz__step');
        if (!step) return null;
        // The score lives in a child span with no separator before it, so
        // step.textContent reads "Question 1 of 10" + "0 correct" as the
        // single string "Question 1 of 100 correct" — which parses as
        // question 1 of ONE HUNDRED. Read the two parts separately.
        const run = step.querySelector('.quiz__running');
        const runText = run ? (run.textContent || '') : '';
        const head = run
            ? (step.textContent || '').replace(runText, '')
            : (step.textContent || '');

        const q = head.match(/Question\s+(\d+)\s+of\s+(\d+)/i);
        const c = (runText || head).match(/(\d+)\s*correct/i);
        if (!q) return null;
        return { n: +q[1], total: +q[2], correct: c ? +c[1] : 0 };
    }

    const setHTML = (el, html) => { if (el && el.innerHTML !== html) el.innerHTML = html; };

    function render(rail) {
        const { n, correct, marks, total } = state;
        setHTML(rail.querySelector('.qx__count'),
            String(Math.min(n, total)).padStart(2, '0') + '<i>/ ' + total + '</i>');

        const pips = rail.querySelector('.qx__pips');
        if (pips.children.length !== total) {
            setHTML(pips, Array.from({ length: total },
                (_, i) => '<i class="qx__pip">' + (i + 1) + '</i>').join(''));
        }
        [...pips.children].forEach((p, i) => {
            const cls = 'qx__pip' +
                (marks[i] === true ? ' is-right' : marks[i] === false ? ' is-wrong' : '') +
                (i === n - 1 && marks[i] === undefined ? ' is-now' : '');
            if (p.className !== cls) p.className = cls;
        });

        const answered = marks.filter((m) => m !== undefined).length;
        const pct = answered ? Math.round((correct / answered) * 100) : 0;
        setHTML(rail.querySelector('.qx__score'), answered
            ? '<b>' + correct + '</b><span>of ' + answered + ' answered · ' + pct + '%</span>'
            : '<b>0</b><span>nothing answered yet</span>');
    }

    function sync(card, rail) {
        const s = readStep(card);
        if (!s) return;
        if (s.total) state.total = s.total;

        if (s.n > state.n) {
            // The question we just left: right if the tally moved with it.
            if (state.n > 0) state.marks[state.n - 1] = s.correct > state.correct;
            state.n = s.n;
        } else if (s.n < state.n) {
            // A fresh round.
            state.marks = [];
            state.n = s.n;
        }
        state.correct = s.correct;
        render(rail);
    }

    /* The deck re-renders .quiz__card on every "next question", which
       destroyed the wrapper the first version had moved it into. So the
       rail is built once and the card is re-adopted each time it is
       replaced, rather than assuming it stays put. */
    function ensure() {
        const host = document.getElementById('quiz-host');
        if (!host) return null;

        let wrap = host.querySelector('.qx');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'qx';
            wrap.innerHTML =
                '<aside class="qx__rail">' +
                '  <div><span class="qx__k">Question</span>' +
                '       <div class="qx__count">01<i>/ 10</i></div></div>' +
                '  <div><span class="qx__k">Progress</span><div class="qx__pips"></div></div>' +
                '  <div><span class="qx__k">Score</span><div class="qx__score"></div></div>' +
                '</aside>';
            host.appendChild(wrap);
            console.info('[quiz] two-column layout with scoreboard rail');
        }

        // Adopt whichever card is currently live.
        const card = host.querySelector('.quiz__card');
        if (card && card.parentElement !== wrap) wrap.appendChild(card);
        return { wrap, card, rail: wrap.querySelector('.qx__rail') };
    }

    let observer = null;

    function tick() {
        if (observer) observer.disconnect();
        try {
            const parts = ensure();
            if (parts && parts.card) sync(parts.card, parts.rail);
        } finally {
            const host = document.getElementById('quiz-host');
            if (observer && host) {
                observer.observe(host, { childList: true, subtree: true, characterData: true });
            }
        }
    }

    function boot() {
        injectCSS();
        const host = document.getElementById('quiz-host');
        if (!host) return;
        const parts = ensure();
        if (!parts) return;

        if (parts.card) {
            const s = readStep(parts.card);
            if (s) { state.n = s.n; state.correct = s.correct; state.total = s.total || TOTAL_FALLBACK; }
        }
        render(parts.rail);

        if (!host.dataset.qxWatched) {
            host.dataset.qxWatched = '1';
            observer = new MutationObserver(tick);
            observer.observe(host, { childList: true, subtree: true, characterData: true });
        }
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 500), { once: true });
    setTimeout(boot, 1800);
    // The deck is built lazily when the drawer first opens.
    document.addEventListener('room:open', () => setTimeout(boot, 300));
})();
