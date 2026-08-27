/* ============================================================
   LAB Chrome — terminal corner readouts + loader bar
   No deps, lightweight, runs on DOMContentLoaded.
   ============================================================ */
(function () {
    'use strict';

    // ── Loader bar — animate to 100% on full load ───────────────
    const bar = document.getElementById('lab-loader-bar');
    if (bar) {
        let p = 0;
        const tick = setInterval(() => {
            p = Math.min(p + Math.random() * 14, 88);
            bar.style.width = p + '%';
        }, 120);

        const finish = () => {
            clearInterval(tick);
            bar.style.width = '100%';
            setTimeout(() => { bar.style.opacity = '0'; bar.style.transition = 'opacity 0.4s'; }, 280);
        };
        if (document.readyState === 'complete') finish();
        else window.addEventListener('load', finish, { once: true });
    }

    // ── Live clock (UTC) ────────────────────────────────────────
    const clockEl = document.getElementById('lab-clock');
    if (clockEl) {
        const fmt = n => String(n).padStart(2, '0');
        const update = () => {
            const d = new Date();
            clockEl.textContent = `${fmt(d.getUTCHours())}:${fmt(d.getUTCMinutes())}:${fmt(d.getUTCSeconds())} UTC`;
        };
        update();
        setInterval(update, 1000);
    }

    // ── Scroll percent ──────────────────────────────────────────
    const scrollEl = document.getElementById('lab-scroll');
    if (scrollEl) {
        const update = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
            scrollEl.textContent = String(pct).padStart(2, '0') + '%';
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
    }

    // ── Coordinates of the next race (top-right readout) ───────
    const coordsEl = document.getElementById('lab-coords');
    if (coordsEl && typeof raceCalendar !== 'undefined') {
        // Lat/Lng map keyed by circuit short name — accurate to the city
        const COORDS = {
            'Albert Park Circuit':              [-37.8497, 144.968,  'MELBOURNE / AU'],
            'Shanghai International Circuit':   [ 31.3389, 121.220,  'SHANGHAI / CN'],
            'Suzuka Circuit':                   [ 34.8431, 136.541,  'SUZUKA / JP'],
            'Bahrain International Circuit':    [ 26.0325,  50.510,  'SAKHIR / BH'],
            'Jeddah Corniche Circuit':          [ 21.6319,  39.103,  'JEDDAH / SA'],
            'Miami International Autodrome':    [ 25.9581, -80.239,  'MIAMI / US'],
            'Circuit Gilles Villeneuve':        [ 45.5000, -73.522,  'MONTREAL / CA'],
            'Circuit de Monaco':                [ 43.7347,   7.420,  'MONTE CARLO / MC'],
            'Circuit de Barcelona-Catalunya':   [ 41.5700,   2.261,  'BARCELONA / ES'],
            'Red Bull Ring':                    [ 47.2197,  14.764,  'SPIELBERG / AT'],
            'Silverstone Circuit':              [ 52.0786,  -1.016,  'SILVERSTONE / GB'],
            'Circuit de Spa-Francorchamps':     [ 50.4372,   5.971,  'SPA / BE'],
            'Hungaroring':                      [ 47.5789,  19.250,  'BUDAPEST / HU'],
            'Circuit Zandvoort':                [ 52.3888,   4.541,  'ZANDVOORT / NL'],
            'Autodromo Nazionale di Monza':     [ 45.6156,   9.281,  'MONZA / IT'],
            'Circuito Urbano de Madrid':        [ 40.4720,  -3.560,  'MADRID / ES'],
            'Baku City Circuit':                [ 40.3725,  49.853,  'BAKU / AZ'],
            'Marina Bay Street Circuit':        [  1.2914, 103.864,  'SINGAPORE / SG'],
            'Circuit of the Americas':          [ 30.1328, -97.641,  'AUSTIN / US'],
            'Autódromo Hermanos Rodríguez':     [ 19.4042, -99.092,  'MEXICO CITY / MX'],
        };
        const now = new Date();
        const next = raceCalendar.find(r => new Date(r.date) >= now) || raceCalendar[0];
        if (next) {
            const m = COORDS[next.circuit];
            if (m) {
                const fmt = (n, dec=4) => (n >= 0 ? '+' : '') + n.toFixed(dec);
                coordsEl.textContent = `LAT ${fmt(m[0])} / LNG ${fmt(m[1])} / ${m[2]}`;
            } else {
                coordsEl.textContent = (next.country || '—').toUpperCase();
            }
        }
    }

    // ── Hero readout — round + next race ─────────────────────────
    if (typeof raceCalendar !== 'undefined') {
        const now = new Date();
        const next = raceCalendar.find(r => new Date(r.date) >= now) || raceCalendar[raceCalendar.length - 1];
        const past = raceCalendar.filter(r => new Date(r.date) < now);
        const round = next ? next.round : raceCalendar.length;
        const roundEl = document.getElementById('hero-round');
        const nextEl  = document.getElementById('hero-next');
        if (roundEl) roundEl.textContent = `R${String(round).padStart(2, '0')} / ${past.length + 1}-OF-${raceCalendar.length}`;
        if (nextEl)  nextEl.textContent  = (next?.country || '2026').toUpperCase();
    }

    // ── Auto-number all section titles: [02] PREDICTIONS, etc. ──
    const sectionTitles = document.querySelectorAll('main .section .section-title');
    sectionTitles.forEach((el, i) => {
        el.setAttribute('data-num', `[${String(i + 2).padStart(2, '0')}]`);
    });

    // ── Status badge propagation ─────────────────────────────────
    // Mirror the telemetry-section live status into:
    //   • #hero-status (hero readout)
    //   • #lab-live-status (top-right corner chrome)
    // Tracks whether feed is LIVE / REPLAY / OFFLINE.
    (function mirrorStatus() {
        const src = document.getElementById('tele-session-status');
        const heroStatus = document.getElementById('hero-status');
        const cornerStatus = document.getElementById('lab-live-status');
        if (!heroStatus && !cornerStatus) return;

        function classify(text) {
            const t = (text || '').toLowerCase();
            if (t.includes('[live]') || (t.includes('connected') && !t.includes('disconnected'))) return 'LIVE';
            if (t.includes('[replay]') || t.includes('replay')) return 'REPLAY';
            if (t.includes('simulation')) return 'SIM';
            if (t.includes('connecting')) return 'CONNECTING';
            return 'OFFLINE';
        }

        function paint(label) {
            const cls = label === 'LIVE' ? 'lab-badge--live'
                      : label === 'REPLAY' ? 'lab-badge--replay'
                      : label === 'SIM' ? 'lab-badge--replay'
                      : 'lab-badge--offline';
            if (heroStatus) {
                heroStatus.textContent = label;
                heroStatus.style.color = (label === 'LIVE') ? 'var(--red)'
                                       : (label === 'REPLAY' || label === 'SIM') ? '#FFC700'
                                       : 'var(--text-3)';
            }
            if (cornerStatus) {
                cornerStatus.textContent = label;
                cornerStatus.className = `lab-badge ${cls}`;
            }
        }

        // Initial paint based on current src text, or OFFLINE
        paint(src ? classify(src.textContent) : 'OFFLINE');

        // Watch for changes via MutationObserver (telemetry updates the status text)
        if (src && 'MutationObserver' in window) {
            const obs = new MutationObserver(() => paint(classify(src.textContent)));
            obs.observe(src, { childList: true, characterData: true, subtree: true });
        }
    })();

    // ── Calendar status banner — show "RACE WEEK" / "RACE DAY" near hero ──
    (function calendarStatus() {
        if (typeof raceCalendar === 'undefined') return;
        const banner = document.getElementById('tele-weekend-banner');
        if (!banner) return;
        const now = new Date();
        const todayStr = now.toDateString();
        const raceToday = raceCalendar.find(r => new Date(r.date).toDateString() === todayStr);
        if (raceToday) {
            banner.innerHTML = `[ RACE DAY ] · ${raceToday.name.toUpperCase()} · ${raceToday.circuit.toUpperCase()} — TELEMETRY ACTIVE`;
            return;
        }
        const upcoming = raceCalendar.find(r => new Date(r.date) > now);
        if (upcoming) {
            const ms = new Date(upcoming.date) - now;
            const days = Math.ceil(ms / 86400000);
            if (days <= 7) {
                banner.innerHTML = `[ RACE WEEK ] · ${upcoming.name.toUpperCase()} IN ${days}D — STREAM AVAILABLE`;
            } else {
                banner.innerHTML = `[ OFF-WEEK ] · NEXT: ${upcoming.name.toUpperCase()} IN ${days}D — REPLAY MODE ONLY`;
            }
        }
    })();

    // ── [DRIVE] — superseded by js/apex-showroom.js (WebGL showroom).
    // The Sketchfab embed below is kept as a manual fallback only.
    // initDrive();
    function initDrive() {
        const stage = document.getElementById('drive-stage');
        if (!stage) return;

        // 2026 grid → Sketchfab model IDs (real models already used elsewhere)
        const CARS = [
            { team: 'McLaren',      model: 'MCL40',   pu: 'Mercedes',        color: '#FF8700', id: '902384ddbec64d86b608881bf44e366f' },
            { team: 'Ferrari',      model: 'SF-26',   pu: 'Ferrari',         color: '#DC0000', id: 'f5f6391749814819a60546f57b10b5f9' },
            { team: 'Red Bull',     model: 'RB22',    pu: 'Ford / RBPT',     color: '#0600EF', id: '621f884d9aee4efdaa54309e6b08bdd1' },
            { team: 'Mercedes',     model: 'W17',     pu: 'Mercedes',        color: '#00D2BE', id: '0ffecbff3b814d308f30abba8b5fd8e7' },
            { team: 'Aston Martin', model: 'AMR26',   pu: 'Honda',           color: '#006F62', id: '6eb43dd1b0f6404e90ff8f0a87162636' },
            { team: 'Alpine',       model: 'A526',    pu: 'Mercedes',        color: '#FF69B4', id: '33c7b240d04f480da57183ccb6fc5ea8' },
            { team: 'Williams',     model: 'FW48',    pu: 'Mercedes',        color: '#005AFF', id: 'a7b48019a6ce43a7ab93cd01efda9739' },
            { team: 'Racing Bulls', model: 'VCARB03', pu: 'Ford / RBPT',     color: '#4E5D9F', id: 'a5927538612642f697650a2dcf67fdde' },
            { team: 'Haas',         model: 'VF-26',   pu: 'Ferrari',         color: '#B6BABD', id: 'b211ec88d4884ffbb7c4133054d1bd2d' },
            { team: 'Audi',         model: 'A26',     pu: 'Audi (NEW PU)',   color: '#C0C0C0', id: '39d08c4788e244de870dd4b9540d8bda' },
            { team: 'Cadillac',     model: 'C26',     pu: 'Ferrari',         color: '#CC0033', id: '05965d76f34048fc94b8189442acbd95' },
        ];

        // Build markup — iframe + HUD + team chip rail
        stage.innerHTML = '';
        stage.style.position = 'relative';
        stage.classList.add('is-loaded');

        // Sketchfab iframe — autospin, no UI, transparent, dark theme
        const iframe = document.createElement('iframe');
        iframe.title = '3D F1 car viewer';
        iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('mozallowfullscreen', 'true');
        iframe.setAttribute('webkitallowfullscreen', 'true');
        iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;display:block;';
        stage.appendChild(iframe);

        // HUD top: [TEAM] / [MODEL] / [PU] + interaction hint
        const hud = document.createElement('div');
        hud.style.cssText = `
            position:absolute; top:12px; left:12px; right:12px;
            display:flex; gap:18px; flex-wrap:wrap;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px; letter-spacing: 0.14em;
            text-transform: uppercase; color: rgba(255,255,255,0.55);
            pointer-events: none; z-index:2;
        `;
        hud.innerHTML = `
            <span>[TEAM] <b style="color:#fff" id="drive-team">McLaren</b></span>
            <span>[MODEL] <b style="color:#fff" id="drive-model">MCL40</b></span>
            <span>[PU] <b style="color:#fff" id="drive-pu">Mercedes</b></span>
            <span style="margin-left:auto; color:#FF1F1F">[ DRAG · ROTATE · ZOOM ]</span>
        `;
        stage.appendChild(hud);

        // Team-chip rail at bottom — click to swap car
        const chipRail = document.createElement('div');
        chipRail.setAttribute('role', 'tablist');
        chipRail.setAttribute('aria-label', 'Select F1 team car');
        chipRail.style.cssText = `
            position:absolute; bottom:12px; left:12px; right:12px;
            display:flex; gap:6px; flex-wrap:wrap; z-index:2;
            background: linear-gradient(0deg, rgba(0,0,0,0.85), transparent);
            padding: 8px;
        `;
        const teamEl  = hud.querySelector('#drive-team');
        const modelEl = hud.querySelector('#drive-model');
        const puEl    = hud.querySelector('#drive-pu');

        const idleStyle = 'background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.55);padding:5px 9px;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border-radius:0;transition:all 0.15s;';
        const makeActiveStyle = (c) => `background:${c};border:1px solid ${c};color:#000;padding:5px 9px;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border-radius:0;font-weight:500;`;

        const loadCar = (car) => {
            const params = new URLSearchParams({
                autospin: '0.3', autostart: '1', ui_theme: 'dark', transparent: '1',
                ui_controls: '0', ui_infos: '0', ui_inspector: '0', ui_stop: '0',
                ui_watermark_link: '0', ui_watermark: '0', ui_help: '0', ui_settings: '0',
                ui_fullscreen: '0', ui_annotations: '0', ui_loading: '0', ui_hint: '0', dnt: '1'
            });
            iframe.src = `https://sketchfab.com/models/${car.id}/embed?${params}`;
            teamEl.textContent  = car.team;
            modelEl.textContent = car.model;
            puEl.textContent    = car.pu;
            chipRail.querySelectorAll('.drive-chip').forEach(c => {
                const on = c.dataset.team === car.team;
                c.classList.toggle('is-active', on);
                c.setAttribute('aria-selected', on ? 'true' : 'false');
                c.style.cssText = on ? c._activeStyle : c._idleStyle;
            });
        };

        CARS.forEach((car, i) => {
            const chip = document.createElement('button');
            chip.className = 'drive-chip';
            chip.dataset.team = car.team;
            chip.setAttribute('role', 'tab');
            chip._idleStyle   = idleStyle;
            chip._activeStyle = makeActiveStyle(car.color);
            chip.style.cssText = idleStyle;
            chip.textContent = `[${String(i + 1).padStart(2, '0')}] ${car.team}`;
            chip.addEventListener('mouseenter', () => {
                if (!chip.classList.contains('is-active')) {
                    chip.style.borderColor = car.color;
                    chip.style.color = '#fff';
                }
            });
            chip.addEventListener('mouseleave', () => {
                if (!chip.classList.contains('is-active')) chip.style.cssText = idleStyle;
            });
            chip.addEventListener('click', () => loadCar(car));
            chipRail.appendChild(chip);
        });
        stage.appendChild(chipRail);

        // Boot with McLaren MCL40
        loadCar(CARS[0]);
    }

    // ── Active nav highlight on scroll ──────────────────────────
    const navLinks = document.querySelectorAll('.pw-nav__link[href^="#"]');
    if (navLinks.length && 'IntersectionObserver' in window) {
        const sections = Array.from(navLinks)
            .map(a => document.querySelector(a.getAttribute('href')))
            .filter(Boolean);
        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = '#' + entry.target.id;
                    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === id));
                }
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        sections.forEach(s => obs.observe(s));
    }
})();
