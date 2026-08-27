/* ══════════════════════════════════════════════════════════════════
   F-ATICS · ROOM CONTROLLER
   Turns the long scrolling page into one static scene plus drawers.

   The sections are NOT rewritten — they are relocated. Every existing
   script (standings, calendar, predictor, telemetry, car anatomy) keeps
   working because its elements keep their ids and stay in the document;
   they just live inside a closed drawer instead of a scroll position.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const ROOMS = [
        { id: 'tracker',        from: '#tracker',        title: 'Championship standings', dot: '#4FD1C5' },
        { id: 'calendar',       from: '#calendar',       title: '2026 race calendar',     dot: '#E8112D' },
        { id: 'showcase',       from: '#showcase',       title: 'The 2026 grid',          dot: '#FF8700' },
        { id: 'circuits',       from: '#circuits',       title: 'Circuits',               dot: '#F6A61C' },
        { id: 'predictor',      from: '#predictor',      title: 'Race predictor',         dot: '#F04A5A' },
        { id: 'live-telemetry', from: '#live-telemetry', title: 'Live telemetry',         dot: '#F6A61C' },
        { id: 'anatomy',        from: '.anat',           title: 'The 2026 car',           dot: '#C4622A' },
        { id: 'quiz',           from: null,              title: 'F1 trivia',              dot: '#9B7BE0' },
    ];

    let openId = null;
    const drawers = new Map();

    /* ── Quiz ───────────────────────────────────────────────────── */

    const QUIZ_LEN = 10;

    function buildQuiz(host) {
        // quiz-data.js declares `const quizData` at the top level of a
        // classic script, which creates a global *lexical* binding — it
        // never appears on `window`. Reference it bare, guarded by typeof.
        const bank = (typeof quizData !== 'undefined' && Array.isArray(quizData)) ? quizData : null;
        if (!bank || !bank.length) {
            host.innerHTML = '<div class="section"><div class="container">' +
                '<p class="section-subtitle">The question bank did not load.</p></div></div>';
            return;
        }

        host.innerHTML =
            '<div class="section band-dark"><div class="container">' +
            '<div class="section-header"><h2 class="section-title">F1 Trivia</h2>' +
            '<p class="section-subtitle">Ten questions, drawn at random from ' + bank.length +
            '. No timer — the point is whether you know it.</p></div>' +
            '<div class="quiz" id="quiz-host"></div></div></div>';

        const wrap = host.querySelector('#quiz-host');
        let picks = [];
        let at = 0;
        let score = 0;
        let locked = false;

        function draw() {
            // Fisher-Yates on a copy: sorting by Math.random() is biased and
            // can repeat questions inside one round.
            const pool = bank.slice();
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            picks = pool.slice(0, Math.min(QUIZ_LEN, pool.length));
            at = 0;
            score = 0;
            locked = false;
            render();
        }

        function render() {
            if (at >= picks.length) {
                wrap.innerHTML =
                    '<div class="quiz__done">' +
                    '<p class="quiz__step">Round complete</p>' +
                    '<div class="quiz__ring" style="--p:' + Math.round((score / picks.length) * 100) + '">' +
                    '<span>' + Math.round((score / picks.length) * 100) + '<i>%</i></span></div>' +
                    '<p class="quiz__score">' + score + ' / ' + picks.length + '</p>' +
                    '<p class="quiz__verdict">' + verdict(score, picks.length) + '</p>' +
                    '<button type="button" class="quiz__again">Play again</button></div>';
                wrap.querySelector('.quiz__again').addEventListener('click', draw);
                return;
            }

            const q = picks[at];
            const pct = Math.round((at / picks.length) * 100);
            wrap.innerHTML =
                '<div class="quiz__card">' +
                '<div class="quiz__meter"><i style="width:' + pct + '%"></i></div>' +
                '<p class="quiz__step">Question ' + (at + 1) + ' of ' + picks.length +
                '<span class="quiz__running">' + score + ' correct</span></p>' +
                '<h3 class="quiz__q">' + esc(q.question) + '</h3>' +
                '<div class="quiz__opts">' +
                q.options.map((o, i) =>
                    '<button type="button" class="quiz__opt" data-i="' + i + '">' +
                    '<span class="quiz__key">' + 'ABCD'[i] + '</span>' +
                    '<span class="quiz__txt">' + esc(o) + '</span></button>'
                ).join('') +
                '</div><div class="quiz__foot"></div></div>';

            locked = false;
            wrap.querySelectorAll('.quiz__opt').forEach((btn) => {
                btn.addEventListener('click', () => answer(btn, q));
            });
        }

        function answer(btn, q) {
            if (locked) return;
            locked = true;
            // Compare the option text only — the button now also contains its
            // A/B/C/D key, so btn.textContent would never match the answer.
            const textOf = (b) => (b.querySelector('.quiz__txt') || b).textContent;
            const right = textOf(btn) === q.answer;
            if (right) score++;

            wrap.querySelectorAll('.quiz__opt').forEach((b) => {
                b.disabled = true;
                if (textOf(b) === q.answer) b.classList.add('is-right');
                else if (b === btn) b.classList.add('is-wrong');
            });

            const foot = wrap.querySelector('.quiz__foot');
            foot.innerHTML = '<p class="quiz__mark ' + (right ? 'is-right' : 'is-wrong') + '">' +
                (right ? 'Correct' : 'Answer: ' + esc(q.answer)) + '</p>' +
                '<button type="button" class="quiz__next">' +
                (at + 1 >= picks.length ? 'See result' : 'Next question') + '</button>';
            foot.querySelector('.quiz__next').addEventListener('click', () => { at++; render(); });
        }

        function verdict(s, n) {
            const p = s / n;
            if (p === 1) return 'Perfect round.';
            if (p >= 0.8) return 'Strong — you follow this properly.';
            if (p >= 0.5) return 'Respectable. The technical ones catch most people.';
            return 'Plenty left to learn. Try the shelves.';
        }

        function esc(t) {
            const d = document.createElement('div');
            d.textContent = t;
            return d.innerHTML;
        }

        draw();
    }

    /* ── Drawers ────────────────────────────────────────────────── */

    function makeDrawer(spec) {
        const el = document.createElement('div');
        el.className = 'drawer';
        el.id = 'drawer-' + spec.id;
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-label', spec.title);
        el.innerHTML =
            '<div class="drawer__bar">' +
            '<span class="drawer__dot" style="--dot:' + spec.dot + '"></span>' +
            '<span class="drawer__title">' + spec.title + '</span>' +
            '<button type="button" class="drawer__back">Back to the room</button>' +
            '</div><div class="drawer__body"></div>';

        const body = el.querySelector('.drawer__body');
        if (spec.from) {
            const node = document.querySelector(spec.from);
            if (node) body.appendChild(node);
        } else if (spec.id === 'quiz') {
            buildQuiz(body);
        }

        el.querySelector('.drawer__back').addEventListener('click', close);
        document.body.appendChild(el);
        drawers.set(spec.id, el);
        return el;
    }

    function open(id) {
        const el = drawers.get(id);
        if (!el) return;
        if (openId && openId !== id) close(true);
        openId = id;

        // Push the camera toward the object that was clicked, so the drawer
        // reads as arriving at it rather than covering it.
        const room = document.getElementById('room');
        const spot = document.querySelector('.room__spot[data-room="' + id + '"]');
        const svg = room && room.querySelector('.room__svg');
        if (room && spot && svg && svg.viewBox && svg.viewBox.baseVal) {
            try {
                const b = spot.getBBox();
                const vb = svg.viewBox.baseVal;
                room.style.setProperty('--zx', (((b.x + b.width / 2) - vb.x) / vb.width * 100).toFixed(1) + '%');
                room.style.setProperty('--zy', (((b.y + b.height / 2) - vb.y) / vb.height * 100).toFixed(1) + '%');
            } catch (_) { /* getBBox throws on an unrendered node */ }
            room.classList.add('is-zooming');
        }

        el.classList.add('is-open');
        document.querySelectorAll('.room__spot').forEach((s) => {
            s.classList.toggle('is-open', s.dataset.room === id);
        });
        // Charts laid out while the drawer was off-screen are already sized
        // correctly, but a resize nudges anything that measured at zero.
        window.dispatchEvent(new Event('resize'));
        // A generic hook so a section can do work the first time it is seen
        // without room.js needing to know anything about that section.
        document.dispatchEvent(new CustomEvent('room:open', { detail: { id } }));
        // aria-modal="true" was a promise the DOM did not keep: every room
        // object stayed tabbable behind the panel, so keyboard focus walked
        // straight out of the "modal" into content the reader cannot see.
        // (`room` is already in scope from the camera-push block above.)
        if (room) {
            room.setAttribute('aria-hidden', 'true');
            if ('inert' in HTMLElement.prototype) room.inert = true;
            else room.querySelectorAll('.room__spot').forEach((sp) => sp.setAttribute('tabindex', '-1'));
        }

        const back = el.querySelector('.drawer__back');
        if (back) back.focus();
    }

    function close(silent) {
        if (!openId) return;
        const el = drawers.get(openId);
        if (el) el.classList.remove('is-open');
        const roomEl = document.getElementById('room');
        if (roomEl) {
            roomEl.classList.remove('is-zooming');
            roomEl.removeAttribute('aria-hidden');
            if ('inert' in HTMLElement.prototype) roomEl.inert = false;
            else roomEl.querySelectorAll('.room__spot').forEach((sp) => sp.setAttribute('tabindex', '0'));
        }
        document.querySelectorAll('.room__spot').forEach((s) => s.classList.remove('is-open'));
        openId = null;
        if (!silent) {
            const spot = document.querySelector('.room__spot');
            if (spot) spot.focus({ preventScroll: true });
        }
    }

    /* ── Boot ───────────────────────────────────────────────────── */

    function init() {
        const room = document.getElementById('room');
        if (!room) return;

        document.documentElement.classList.add('room-mode');

        ROOMS.forEach(makeDrawer);

        // The old page shell has nothing left in it once the sections move.
        ['#main-content', '.apex-hero', '.pw-nav', '.footer'].forEach((sel) => {
            const n = document.querySelector(sel);
            if (n) n.remove();
        });
        document.querySelectorAll('.apex-break').forEach((n) => n.remove());

        // Chrome above and below the scene.
        const bar = document.createElement('div');
        bar.className = 'room__bar';
        bar.innerHTML =
            '<div class="room__bar-in">' +
            '  <span class="room__brand" role="img" aria-label="F-ATICS">' +
            '    <svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
            '      <rect width="32" height="32" rx="8" fill="#E2503C"/>' +
            '      <path d="M10 8 H24 L21.6 12.6 H14.5 V15.4 H21.4 L19 20 H14.5 V24 H10 Z" fill="#F7F3EC"/>' +
            '    </svg>' +
            // The mark carries the F, so the wordmark completes it rather
            // than repeating it — the lockup reads F-ATICS.
            '    <span class="brand__word">Atics</span>' +
            '  </span>' +
            '  <span class="room__rule" aria-hidden="true"></span>' +
            '  <span class="room__sub">The paddock office · Formula 1 2026</span>' +
            '  <span class="room__hint">Hover an object · click to open</span>' +
            '</div>';
        room.insertBefore(bar, room.firstElementChild);

        const foot = document.createElement('div');
        foot.className = 'room__foot';
        const now = document.getElementById('now-block');
        if (now) foot.appendChild(now);
        room.appendChild(foot);

        // Touch fallback: the objects are too small to hit on a phone.
        const menu = document.createElement('div');
        menu.className = 'room__menu';
        ROOMS.forEach((r) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = r.title;
            b.addEventListener('click', () => open(r.id));
            menu.appendChild(b);
        });
        // Before the live strip: the menu is the row that absorbs spare
        // height on a phone, and grid assigns that to the third row.
        room.insertBefore(menu, foot);

        // The chrome above and below is aligned to the painting's own edges
        // rather than the viewport's, so the three bands read as one object.
        // The scene is aspect-locked, so its rendered width has to be
        // measured — it cannot be expressed in CSS alone.
        const svg = room.querySelector('.room__svg');
        if (svg) {
            const syncWidth = () => {
                room.style.setProperty('--scene-w', Math.round(svg.getBoundingClientRect().width) + 'px');
            };
            syncWidth();
            if ('ResizeObserver' in window) new ResizeObserver(syncWidth).observe(svg);
            else window.addEventListener('resize', syncWidth, { passive: true });
        }

        const spots = [...document.querySelectorAll('.room__spot')];
        spots.forEach((spot) => {
            const id = spot.dataset.room;
            spot.addEventListener('click', () => open(id));
            spot.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(id); }
            });
            spot.addEventListener('mouseenter', () => room.classList.add('is-hovering'));
            spot.addEventListener('mouseleave', () => room.classList.remove('is-hovering'));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && openId) { close(); return; }
            if (e.key !== 'Tab' || !openId) return;

            const panel = drawers.get(openId);
            if (!panel) return;
            const focusable = [...panel.querySelectorAll(
                'a[href], button:not([disabled]), select, input, textarea, [tabindex]:not([tabindex="-1"])'
            )].filter((n) => n.offsetParent !== null || n === document.activeElement);
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        });

        // The entrance curtain is a full-bleed black rect faded out by CSS.
        // If that animation never runs — stylesheet blocked, animation
        // suppressed, anything — the room would stay black forever. Remove
        // it from the document regardless once the entrance is over.
        const curtain = room.querySelector('.room__curtain');
        if (curtain) setTimeout(() => curtain.remove(), 2000);

        // Deep links still work: /#tracker opens that drawer directly.
        function fromHash() {
            const id = location.hash.replace(/^#/, '');
            if (drawers.has(id)) open(id);
        }
        fromHash();
        window.addEventListener('hashchange', fromHash);

        // Drawers exist and the sections have been relocated — anything that
        // decorates a drawer can safely run now.
        document.dispatchEvent(new CustomEvent('room:ready'));
    }

    if (document.readyState === 'loading') {
        // After DOMContentLoaded listeners of the section scripts, so their
        // containers are populated before anything moves.
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once: true });
    } else {
        setTimeout(init, 0);
    }
})();
