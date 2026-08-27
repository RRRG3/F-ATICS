/* ══════════════════════════════════════════════════════════════════
   F-ATICS · DRAWER POLISH
   Two additions that need live data, so they cannot live in markup:
   a superlatives strip above the circuits, and each constructor's
   actual championship position on its plate.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };
    const num = (v) => parseFloat(String(v).replace(/[^\d.]/g, '')) || 0;

    /* Circuits: the season at a glance before the 24 cards. */
    function circuitSuperlatives() {
        if (document.querySelector('.circ-sup')) return;
        const host = document.getElementById('circuits');
        if (!host || typeof circuitsData === 'undefined' || !circuitsData.length) return;

        const longest = circuitsData.reduce((a, b) => (num(a.length) > num(b.length) ? a : b));
        const shortest = circuitsData.reduce((a, b) => (num(a.length) < num(b.length) ? a : b));
        const most = circuitsData.reduce((a, b) => ((a.corners || 0) > (b.corners || 0) ? a : b));
        const fastest = circuitsData.reduce((a, b) => (num(a.topSpeed) > num(b.topSpeed) ? a : b));
        const oldest = circuitsData.reduce((a, b) => ((a.firstGP || 9999) < (b.firstGP || 9999) ? a : b));

        const cell = (l, v, s) => '<div class="circ-sup__i"><span class="circ-sup__l">' + l +
            '</span><b class="circ-sup__v">' + esc(v) + '</b>' +
            '<span class="circ-sup__s">' + esc(s) + '</span></div>';

        const html = '<div class="circ-sup">' +
            cell('Longest', longest.name.replace(/ Circuit$/, ''), longest.length) +
            cell('Shortest', shortest.name.replace(/ Circuit$/, ''), shortest.length) +
            cell('Most corners', most.name.replace(/ Circuit$/, ''), most.corners + ' turns') +
            cell('Fastest', fastest.name.replace(/ Circuit$/, ''), fastest.topSpeed) +
            cell('Oldest', oldest.name.replace(/ Circuit$/, ''), 'since ' + oldest.firstGP) +
            '</div>';

        const head = host.querySelector('.section-header');
        if (head) head.insertAdjacentHTML('afterend', html);
    }

    /* One canonical key per team, whatever the source calls it.
       Order matters: the Racing Bulls patterns are tested before the
       Red Bull one so "Oracle Red Bull Racing" cannot fall into it. */
    const TEAM_ALIASES = [
        [/racing\s*bulls|\brb\b|visa\s*cash|alphatauri|vcarb|toro\s*rosso/i, 'racingbulls'],
        [/red\s*bull/i,        'redbull'],
        [/mercedes/i,          'mercedes'],
        [/ferrari/i,           'ferrari'],
        [/mclaren/i,           'mclaren'],
        [/aston\s*martin/i,    'astonmartin'],
        [/alpine|renault/i,    'alpine'],
        [/williams/i,          'williams'],
        [/haas/i,              'haas'],
        [/audi|sauber|alfa\s*romeo/i, 'audi'],
        [/cadillac/i,          'cadillac'],
    ];

    function canon(name) {
        const s = String(name || '');
        for (const [re, key] of TEAM_ALIASES) if (re.test(s)) return key;
        return s.toLowerCase().replace(/[^a-z]/g, '');
    }

    /* Constructor plates: where each team actually stands. */
    function teamPositions(ctors) {
        if (!ctors || !ctors.length) return;
        document.querySelectorAll('.lab-team-card').forEach((card) => {
            if (card.dataset.posShown === '1') return;
            const name = (card.querySelector('.lab-team-card__name') || {}).textContent || '';
            // Team naming is genuinely inconsistent between the entry list
            // and the standings feed — the card says "Racing Bulls" while
            // the feed says "RB F1 Team", and substring matching finds no
            // overlap between them, so that team silently showed no
            // championship data at all. Both sides go through one
            // canonical key instead.
            const hit = ctors.find((c) => canon(c.team) === canon(name));
            if (!hit) return;
            const body = card.querySelector('.lab-team-card__body');
            if (!body) return;
            body.insertAdjacentHTML('beforeend',
                '<div class="team-pos"><span class="team-pos__l">Constructors</span>' +
                '<span class="team-pos__v">P' + hit.position + ' · ' + hit.points + ' pts</span></div>');
            card.dataset.posShown = '1';
        });
    }

    function run(ctors) {
        try { circuitSuperlatives(); } catch (e) { console.warn('[polish] circuits', e && e.message); }
        try { teamPositions(ctors); } catch (e) { console.warn('[polish] teams', e && e.message); }
    }

    document.addEventListener('season:loaded', (e) => run(e.detail && e.detail.ctors));

    // Same backstop pattern as the other consumers: a single event is a
    // single chance to be listening.
    let tries = 0;
    const poll = setInterval(() => {
        const ctors = window.__seasonCtors;
        if (ctors) { run(ctors); clearInterval(poll); }
        else if (++tries > 60) { run(null); clearInterval(poll); }
    }, 1000);
})();
