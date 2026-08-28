// ─── Local SVG placeholder (no network needed) ───────────────────────────────
// Generates an inline SVG data URI with team color background and short label.
// Drop-in replacement for via.placeholder.com that works fully offline.
function makeSVG(text, bg, fg) {
    // A flat saturated block with the name written across it read as a
    // broken image. This is a portrait-shaped plate: the site's own dark
    // ground, the driver's initials as a monogram in the team colour, and
    // the name underneath — so a missing photo looks deliberate.
    const accent = bg && /^#/.test(bg) ? bg : '#8894A8';
    const label = String(text || '').trim();
    const initials = label.split(/\s+/).filter(w => /[A-Za-zÀ-ÿ]/.test(w))
        .slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'F1';
    const esc = (t) => String(t).replace(/[&<>"]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
        <rect width="400" height="500" fill="#17253B"/>
        <circle cx="200" cy="205" r="96" fill="none" stroke="${accent}" stroke-width="3" opacity="0.55"/>
        <text x="200" y="205" font-family="Archivo,Helvetica,Arial,sans-serif" font-size="92"
              font-weight="800" fill="${accent}" text-anchor="middle" dominant-baseline="central"
              letter-spacing="-3">${esc(initials)}</text>
        <text x="200" y="352" font-family="Inter,Helvetica,Arial,sans-serif" font-size="20"
              fill="#EDE3CC" text-anchor="middle">${esc(label.slice(0, 24))}</text>
        <text x="200" y="384" font-family="'JetBrains Mono',monospace" font-size="12"
              fill="#8FA3BE" text-anchor="middle" letter-spacing="3">NO PORTRAIT ON FILE</text>
        <rect x="140" y="410" width="120" height="2" fill="${accent}" opacity="0.6"/>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}



// Lift a livery colour until it genuinely clears WCAG AA on the card
// ground, keeping its hue so the team stays recognisable.
//
// A fixed HSL lightness floor does not work: lightness is not perceptual
// luminance, so blue at L=0.62 lands near 2.9:1 while yellow at the same
// L is over 7:1. This raises L in small steps and MEASURES contrast each
// time, stopping at the first value that clears the target.

// Constructor colours, keyed loosely so API and local spellings both resolve.
const TEAM_HEX = {
    mclaren: '#FF8700', ferrari: '#DC0000', 'red bull': '#0600EF', mercedes: '#00D2BE',
    'aston martin': '#006F62', alpine: '#FF69B4', williams: '#005AFF', 'racing bulls': '#4E5D9F',
    'rb f1 team': '#4E5D9F', haas: '#B6BABD', 'kick sauber': '#00E701', sauber: '#00E701',
    audi: '#C0C0C0', cadillac: '#CC0033',
};

// "Bahrain Grand Prix in Malaysia" is a real 2026 race name. Stripping
// /\s*Grand Prix\s*/ ate the spaces on BOTH sides and produced
// "Bahrainin Malaysia", so the separator has to survive the cut.
function shortRaceName(name) {
    return String(name || '')
        .replace(/\s*\b(?:Formula\s*1\s*)?Grand\s+Prix\b\s*/i, ' ')
        .replace(/\s*\bGP\b\s*/i, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function teamColour(name) {
    const k = String(name || '').toLowerCase();
    const hit = Object.keys(TEAM_HEX).find((t) => k.includes(t));
    return hit ? TEAM_HEX[hit] : '#8894A8';
}

function readableInk(hex, bgHex = '#17253B', target = 5) {
    const hexToRgb = (h) => {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h || '');
        return m ? [1, 2, 3].map(i => parseInt(m[i], 16)) : null;
    };
    const rel = ([r, g, b]) => {
        const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (x, y) => {
        const A = rel(x), B = rel(y);
        return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
    };
    const rgb = hexToRgb(hex), bg = hexToRgb(bgHex);
    if (!rgb || !bg) return '#EDE3CC';

    let [r, g, b] = rgb.map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l0 = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l0 > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    const S = Math.min(s, 0.7);
    const hue2 = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const at = (L) => {
        const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
        const pp = 2 * L - q;
        return [h + 1 / 3, h, h - 1 / 3].map(t => Math.round(hue2(pp, q, t) * 255));
    };

    let best = at(Math.max(l0, 0.55));
    for (let L = Math.max(l0, 0.55); L <= 0.95; L += 0.02) {
        best = at(L);
        if (contrast(best, bg) >= target) break;
    }
    return '#' + best.map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            }
        });
    });

    // Scroll to top when logo is clicked
    const logoBtn = document.getElementById('logo-btn');
    if (logoBtn) {
        logoBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    }

    // Team Showcase
    const teamGrid = document.getElementById('team-grid');
    const modal = document.getElementById('team-modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = document.querySelector('.close-btn');
    const modalOverlay = document.querySelector('.modal-overlay');

    // ========================================
    // F1 2026 TEAM DATA — 11 Teams on the Grid
    // NEW: Audi Revolut F1 Team & Cadillac F1!
    // ========================================
    const teamsData = [
        {
            name: "McLaren Formula 1 Team",
            car: "McLaren MCL40",
            drivers: "Lando Norris, Oscar Piastri",
            principal: "Andrea Stella",
            engine: "Mercedes",
            color: "#FF8700",
            isNew: false,
            sketchfabId: "902384ddbec64d86b608881bf44e366f", // MCL39 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/mclaren.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/norris.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/piastri.jpg",
            principalImg: makeSVG('Andrea Stella', '#FF8700', '#fff'),
            fallbackImg: makeSVG('McLaren MCL40', '#FF8700', '#fff')
        },
        {
            name: "Scuderia Ferrari",
            car: "Ferrari SF-26",
            drivers: "Charles Leclerc, Lewis Hamilton",
            principal: "Frédéric Vasseur",
            engine: "Ferrari",
            color: "#DC0000",
            isNew: false,
            sketchfabId: "f5f6391749814819a60546f57b10b5f9", // SF-25 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/ferrari.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/leclerc.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/hamilton.jpg",
            principalImg: makeSVG('Frédéric Vasseur', '#DC0000', '#fff'),
            fallbackImg: makeSVG('Ferrari SF-26', '#DC0000', '#fff')
        },
        {
            name: "Oracle Red Bull Racing",
            car: "Red Bull RB22",
            drivers: "Max Verstappen, Isack Hadjar",
            principal: "Christian Horner",
            engine: "Ford / Red Bull Powertrains",
            color: "#0600EF",
            isNew: false,
            sketchfabId: "621f884d9aee4efdaa54309e6b08bdd1", // RB21 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/red%20bull.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/verstappen.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/hadjar.jpg",
            principalImg: makeSVG('Laurent Mekies', '#0600EF', '#fff'),
            fallbackImg: makeSVG('Red Bull RB22', '#0600EF', '#fff')
        },
        {
            name: "Mercedes-AMG Petronas",
            car: "Mercedes W17",
            drivers: "George Russell, Kimi Antonelli",
            principal: "Toto Wolff",
            engine: "Mercedes",
            color: "#00D2BE",
            isNew: false,
            sketchfabId: "0ffecbff3b814d308f30abba8b5fd8e7", // W16 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/mercedes.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/russell.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/antonelli.jpg",
            principalImg: makeSVG('Toto Wolff', '#00D2BE', '#fff'),
            fallbackImg: makeSVG('Mercedes W17', '#00D2BE', '#fff')
        },
        {
            name: "Aston Martin Aramco",
            car: "Aston Martin AMR26",
            drivers: "Fernando Alonso, Lance Stroll",
            principal: "Andy Cowell",
            engine: "Honda",
            color: "#006F62",
            isNew: false,
            sketchfabId: "6eb43dd1b0f6404e90ff8f0a87162636", // AMR25 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/aston%20martin.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/alonso.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/stroll.jpg",
            principalImg: makeSVG('Andy Cowell', '#006F62', '#fff'),
            fallbackImg: makeSVG('Aston Martin AMR26', '#006F62', '#fff')
        },
        {
            name: "Alpine F1 Team",
            car: "Alpine A526",
            drivers: "Pierre Gasly, Franco Colapinto",
            principal: "Oliver Oakes",
            engine: "Mercedes",
            color: "#FF69B4",
            isNew: false,
            sketchfabId: "33c7b240d04f480da57183ccb6fc5ea8", // A525 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/alpine.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/gasly.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/colapinto.jpg",
            principalImg: makeSVG('Oliver Oakes', '#FF69B4', '#fff'),
            fallbackImg: makeSVG('Alpine A526', '#FF69B4', '#fff')
        },
        {
            name: "Williams Racing",
            car: "Williams FW48",
            drivers: "Carlos Sainz, Alex Albon",
            principal: "James Vowles",
            engine: "Mercedes",
            color: "#005AFF",
            isNew: false,
            sketchfabId: "a7b48019a6ce43a7ab93cd01efda9739", // FW47 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/williams.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/sainz.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/albon.jpg",
            principalImg: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/manual/people/JamesVowles.jpg",
            fallbackImg: makeSVG('Williams FW48', '#005AFF', '#fff')
        },
        {
            name: "Racing Bulls",
            car: "Racing Bulls VCARB 03",
            drivers: "Liam Lawson, Arvid Lindblad",
            principal: "Laurent Mekies",
            engine: "Ford / Red Bull Powertrains",
            color: "#4E5D9F",
            isNew: false,
            sketchfabId: "a5927538612642f697650a2dcf67fdde", // VCARB 02 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/rb.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/lawson.jpg",
            driver2Img: makeSVG('Arvid Lindblad', '#4E5D9F', '#fff'),
            principalImg: makeSVG('Laurent Mekies', '#4E5D9F', '#fff'),
            fallbackImg: makeSVG('Racing Bulls VCARB 03', '#4E5D9F', '#fff')
        },
        {
            name: "MoneyGram Haas F1 Team",
            car: "Haas VF-26",
            drivers: "Esteban Ocon, Oliver Bearman",
            principal: "Ayao Komatsu",
            engine: "Ferrari",
            color: "#B6BABD",
            isNew: false,
            sketchfabId: "b211ec88d4884ffbb7c4133054d1bd2d", // VF-25 (2025)
            logo: "https://www.formula1.com/content/dam/fom-website/2018-redesign-assets/team%20logos/haas.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/ocon.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/bearman.jpg",
            principalImg: makeSVG('Ayao Komatsu', '#B6BABD', '#111'),
            fallbackImg: makeSVG('Haas VF-26', '#B6BABD', '#111')
        },
        {
            name: "Audi Revolut F1 Team",
            car: "Audi R26",
            drivers: "Nico Hülkenberg, Gabriel Bortoleto",
            principal: "Jonathan Wheatley",
            engine: "Audi (Works)",
            color: "#C0C0C0",
            isNew: true,
            newLabel: "NEW TEAM 2026",
            sketchfabId: "39d08c4788e244de870dd4b9540d8bda", // Sauber C45 (closest — Audi inherits Sauber)
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/2560px-Audi-Logo_2016.svg.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/hulkenberg.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2025Drivers/bortoleto.jpg",
            principalImg: makeSVG('Jonathan Wheatley', '#C0C0C0', '#111'),
            fallbackImg: makeSVG('Audi R26', '#C0C0C0', '#111')
        },
        {
            name: "Cadillac F1 Team",
            car: "Cadillac CA01",
            drivers: "Sergio Perez, Valtteri Bottas",
            principal: "Graeme Lowdon",
            engine: "Ferrari",
            color: "#CC0033",
            isNew: true,
            newLabel: "NEW TEAM 2026",
            sketchfabId: "05965d76f34048fc94b8189442acbd95", // APX GP F1 Movie car (closest available)
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Cadillac_logo.svg/1280px-Cadillac_logo.svg.png",
            driver1Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/perez.jpg",
            driver2Img: "https://media.formula1.com/image/upload/f_auto,c_limit,w_400,q_auto/content/dam/fom-website/drivers/2024Drivers/bottas.jpg",
            principalImg: makeSVG('Graeme Lowdon', '#CC0033', '#fff'),
            fallbackImg: makeSVG('Cadillac CA01', '#CC0033', '#fff')
        }
    ];

    teamGrid.innerHTML = ''; // Clear skeleton cards
    teamsData.forEach((team, index) => {
        const card = document.createElement('div');
        card.classList.add('team-card', 'lab-team-card');
        card.style.animationDelay = `${index * 0.05}s`;

        const drivers = team.drivers.split(',').map(d => d.trim());
        const newBadge = team.isNew ? `<span class="lab-team-card__new">NEW</span>` : '';

        // Build a name → number lookup for the bracketed [##] prefix
        const numFor = (name) => {
            if (typeof driverStandings2026 === 'undefined') return '--';
            const d = driverStandings2026.find(x =>
                x.driver.split(' ').pop().toLowerCase() === name.split(' ').pop().toLowerCase()
            );
            return d ? String(d.number).padStart(2, '0') : '--';
        };

        const shortName = (full) => {
            const parts = full.split(' ');
            return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : full;
        };

        // The livery colour drives the whole card. Some of them — Red Bull's
        // #0600EF especially — are far too dark to read as text on a navy
        // surface, so a second, lightness-floored variant is derived for
        // type while the true colour stays for fills and rules.
        card.style.setProperty('--team-color', team.color);
        card.style.setProperty('--team-ink', readableInk(team.color));

        card.innerHTML = `
            <div class="lab-team-card__head">
                <span class="lab-team-card__index">${String(index + 1).padStart(2, '0')}</span>
                ${newBadge}
                <img src="${team.logo}" alt="${team.name} logo" class="lab-team-card__logo"
                     onerror="this.onerror=null;this.src=makeSVG('${team.name}','${team.color}','#fff')">
            </div>
            <div class="lab-team-card__drivers" aria-hidden="true">
                <div class="lab-team-card__portrait">
                    <img src="${team.driver1Img}" alt="${drivers[0]}" loading="lazy"
                         onerror="this.onerror=null;this.src=makeSVG('${drivers[0]}','${team.color}','#fff')">
                </div>
                <div class="lab-team-card__portrait">
                    <img src="${team.driver2Img}" alt="${drivers[1]}" loading="lazy"
                         onerror="this.onerror=null;this.src=makeSVG('${drivers[1]}','${team.color}','#fff')">
                </div>
            </div>
            <div class="lab-team-card__color-bar"></div>
            <div class="lab-team-card__body">
                <h3 class="lab-team-card__name">${team.name}</h3>
                <div class="lab-team-card__car">${team.car}</div>
                <ul class="lab-team-card__roster">
                    <li><span class="lab-team-card__num">${numFor(drivers[0])}</span> ${shortName(drivers[0])}</li>
                    <li><span class="lab-team-card__num">${numFor(drivers[1])}</span> ${shortName(drivers[1])}</li>
                    ${team.engine ? `<li class="lab-team-card__pu"><span class="lab-team-card__pu-l">Power unit</span> ${team.engine}</li>` : ''}
                </ul>
            </div>
        `;
        card.addEventListener('click', () => openModal(team));
        teamGrid.appendChild(card);
    });


    // Focus trap: cycle Tab/Shift-Tab within the modal
    function trapFocus(modalEl, e) {
        const focusable = Array.from(
            modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter(el => !el.disabled);
        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    let _trapHandler = null;
    let _previousFocus = null;

    function openModal(team) {
        const drivers = team.drivers.split(', ');
        modalBody.innerHTML = `
            <div class="team-modal-header">
                <img src="${team.logo}" alt="${team.name} logo" class="modal-team-logo"
                     onerror="this.onerror=null;this.src=makeSVG('${team.name}','${team.color}','#fff')">
                <h2>${team.name}</h2>
                <p class="modal-car-name">${team.car}</p>
            </div>
            
            <div class="team-modal-grid">
                <div class="modal-image-card" style="grid-column: 1 / -1; height: 350px;">
                    <h3>Interactive 3D Model</h3>
                    <div class="modal-car-360" style="width: 100%; height: 300px;"></div>
                </div>
                
                <div class="modal-image-card">
                    <h3>${drivers[0]}</h3>
                    <img src="${team.driver1Img}" alt="${drivers[0]}" loading="lazy" 
                         onerror="this.onerror=null;this.src=makeSVG('${drivers[0]}','${team.color}','#fff')">
                </div>
                
                <div class="modal-image-card">
                    <h3>${drivers[1]}</h3>
                    <img src="${team.driver2Img}" alt="${drivers[1]}" loading="lazy" 
                         onerror="this.onerror=null;this.src=makeSVG('${drivers[1]}','${team.color}','#fff')">
                </div>
                
                <div class="modal-image-card">
                    <h3>Team Principal</h3>
                    <img src="${team.principalImg}" alt="${team.principal}" loading="lazy" 
                         onerror="this.onerror=null;this.src=makeSVG('${team.principal}','${team.color}','#fff')">
                    <p class="principal-name">${team.principal}</p>
                </div>
            </div>
        `;
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Set title for aria-labelledby
        const titleEl = modalBody.querySelector('h2');
        if (titleEl) titleEl.id = 'team-modal-title';

        // Initialize 3D viewer in modal
        const modalCarContainer = modalBody.querySelector('.modal-car-360');
        if (window.Car360 && modalCarContainer) {
            Car360.init(modalCarContainer, team.color, team.car);
        }

        // Store previous focus and move focus into modal
        _previousFocus = document.activeElement;
        const closeButton = modal.querySelector('.close-btn');
        if (closeButton) closeButton.focus();

        // Activate focus trap
        _trapHandler = (e) => trapFocus(modal, e);
        modal.addEventListener('keydown', _trapHandler);
    }

    function closeModal() {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';

        // Remove focus trap and restore focus to the triggering element
        if (_trapHandler) {
            modal.removeEventListener('keydown', _trapHandler);
            _trapHandler = null;
        }
        if (_previousFocus) {
            _previousFocus.focus();
            _previousFocus = null;
        }
    }

    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });

    // Standings with fallback data
    const standingsBody = document.getElementById('standings-body');

    // Use 2026 driver standings from the data file
    const fallbackStandings = typeof driverStandings2026 !== 'undefined' ? driverStandings2026 : [];

    function displayStandings(standings) {
        standingsBody.innerHTML = '';
        const maxPts = Math.max(...standings.map(d => d.points || 0), 1);
        standings.forEach((driver, index) => {
            const row = document.createElement('tr');
            row.style.animationDelay = `${index * 0.03}s`;
            const driverNum = driver.number ? `<span class="driver-num">${String(driver.number).padStart(2,'0')}</span>` : '';

            // LAB position display — mono brackets, podium highlight in red
            const posPad = String(driver.position).padStart(2, '0');
            const isPodium = driver.position <= 3;
            const positionDisplay = `<span class="standings-pos${isPodium ? ' standings-pos--top' : ''}">${posPad}</span>`;

            const ptsPct = Math.max((driver.points / maxPts) * 100, 0);
            const ptsBar = `<div class="pts-bar-wrap"><div class="pts-bar" style="width:${ptsPct}%"></div></div>`;

            // Give every row its constructor's colour. A championship table
            // with no livery in it is just a spreadsheet.
            const ink = readableInk(teamColour(driver.team));
            row.style.setProperty('--row-team', ink);
            row.innerHTML = `
                <td class="pos-col">${positionDisplay}</td>
                <td class="driver-col">${driverNum} <span data-driver="${driver.driver}">${driver.driver}</span></td>
                <td class="nationality-col">${driver.nationality}</td>
                <td class="team-col"><span class="team-dot"></span>${driver.team}</td>
                <td class="points-col">${ptsBar}<span class="pts-val">${driver.points}</span></td>
            `;
            standingsBody.appendChild(row);
        });

        const allZero = standings.every(d => (d.points || 0) === 0);
        if (allZero) {
            const note = document.createElement('tr');
            note.innerHTML = '<td colspan="5" class="standings-note">Points update live after each race weekend. Check back once the season is underway.</td>';
            standingsBody.appendChild(note);
        }
    }

    // Show fallback immediately so the table is never empty
    displayStandings(fallbackStandings);

    // Silently upgrade to live Jolpica data (Ergast mirror) with 1-hour localStorage cache
    (async function fetchLiveStandings() {
        const CACHE_KEY = 'f1_driver_standings_2026';
        const CACHE_TTL = 3_600_000; // 1 hour

        // Serve from cache if fresh
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const { ts, data } = JSON.parse(raw);
                if (Date.now() - ts < CACHE_TTL && data?.length) {
                    displayStandings(data);
                    return;
                }
            }
        } catch (_) {}

        // season-live.js owns this endpoint: it serialises its requests,
        // caches them in localStorage for six hours and repaints through
        // window.fatics.displayStandings. Fetching the same URL here doubled
        // the load on an API that answers 429 without a CORS header, which
        // surfaces as an unexplained CORS failure. Stand down if it is present.
        if (document.querySelector('script[src*="season-live"]')) return;

        // Fetch from Jolpica API (fallback only — season-live.js absent)
        try {
            const res = await fetch('https://api.jolpi.ca/ergast/f1/2026/driverStandings.json');
            if (!res.ok) return;
            const json = await res.json();
            const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
            if (!list?.length) return;

            const live = list.map(entry => ({
                position:    +entry.position,
                driver:      `${entry.Driver.givenName} ${entry.Driver.familyName}`,
                nationality: entry.Driver.nationality,
                team:        entry.Constructors[0]?.name || '',
                points:      +entry.points,
                number:      +entry.Driver.permanentNumber,
            }));

            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: live }));
            displayStandings(live);
        } catch (_) {
            // Silently stay on fallback data already shown
        }
    })();
    // Standings Toggle — handles both "drivers"→driver-standings and "driver"→driver-standings
    const standingsToggleBtns = document.querySelectorAll('.toggle-btn');
    standingsToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const raw = btn.dataset.standings || '';
            standingsToggleBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            document.querySelectorAll('.standings-view').forEach(view => {
                view.classList.remove('active');
            });
            // Try both forms ("drivers-standings" and "driver-standings")
            const target = document.getElementById(`${raw}-standings`)
                        || document.getElementById(`${raw.replace(/s$/, '')}-standings`);
            if (target) target.classList.add('active');
        });
    });

    // Constructor Standings
    const constructorBody = document.getElementById('constructor-body');
    function renderConstructors(list = constructorStandings) {
    constructorBody.innerHTML = '';
    const maxConstructorPts = Math.max(...list.map(t => t.points || 0), 1);
    list.forEach((team, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.03}s`;

        const posPad = String(team.position).padStart(2, '0');
        const isPodium = team.position <= 3;
        const positionDisplay = `<span class="standings-pos${isPodium ? ' standings-pos--top' : ''}">[${posPad}]</span>`;

        const ptsPct = Math.max((team.points / maxConstructorPts) * 100, 0);
        const ptsBar = `<div class="pts-bar-wrap"><div class="pts-bar" style="width:${ptsPct}%"></div></div>`;

        row.innerHTML = `
            <td class="pos-col">${positionDisplay}</td>
            <td class="team-col">
                <span class="team-dot"></span>
                ${team.team}
            </td>
            <td class="points-col">${team.points} ${ptsBar}</td>
        `;
        constructorBody.appendChild(row);
    });
    }
    renderConstructors();

    // Everything below is driven by the hardcoded season files as a fallback.
    // season-live.js swaps in real Jolpica data and calls these to repaint.
    window.fatics = window.fatics || {};
    window.fatics.displayStandings   = displayStandings;
    window.fatics.renderConstructors = renderConstructors;
    window.fatics.renderCalendar     = renderCalendar;
    window.fatics.refreshCountdown   = initNextRaceCountdown;

    // Race Calendar
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarSearch = document.getElementById('calendar-search');
    const calendarFilter = document.getElementById('calendar-filter');
    
    function renderCalendar(races = raceCalendar) {
        calendarGrid.innerHTML = '';
        const now = new Date();

        // Empty state — no races match filters
        if (!races || races.length === 0) {
            calendarGrid.style.border = 'none';
            calendarGrid.innerHTML = `
                <div class="lab-empty" style="grid-column:1/-1">
                    <span class="lab-empty__tag">NO RESULTS</span>
                    <h3 class="lab-empty__title">NO RACES MATCH YOUR QUERY</h3>
                    <p class="lab-empty__sub">Try a different circuit name or clear the filter.</p>
                </div>
            `;
            return;
        }
        calendarGrid.style.border = '';

        // Find the next upcoming race so we can flag it [NEXT]
        const nextRaceIdx = races.findIndex(r => new Date(r.date) > now);

        races.forEach((race, index) => {
            const raceDate = new Date(race.date);
            const isUpcoming = raceDate > now;
            const isCompleted = raceDate < now;
            const isToday = raceDate.toDateString() === now.toDateString();
            const isNext = index === nextRaceIdx;

            const card = document.createElement('div');
            card.classList.add('calendar-card');
            if (isCompleted) card.classList.add('completed');
            if (isUpcoming) card.classList.add('upcoming');
            card.style.animationDelay = `${index * 0.05}s`;

            // Status badge — [LIVE] / [NEXT] / [DONE]
            let statusBadge = '';
            if (isToday)         statusBadge = '<span class="cal-status cal-status--live">LIVE</span>';
            else if (isNext)     statusBadge = '<span class="cal-status cal-status--next">NEXT</span>';
            // A completed race is shown as completed by its styling and by
            // naming its winner; a "DONE" pill on twelve cards is just noise.
            else if (isCompleted) statusBadge = '';

            let countdownHTML = '';
            if (isUpcoming) {
                const timeDiff = raceDate - now;
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                countdownHTML = `
                    <div class="calendar-countdown">
                        <div class="countdown-label">T-MINUS</div>
                        <div class="countdown-time">${days}d</div>
                    </div>
                `;
            } else if (isCompleted) {
                countdownHTML = `
                    <div class="calendar-countdown">
                        <div class="countdown-label">STATUS</div>
                        <div class="countdown-time">ARCHIVED</div>
                    </div>
                `;
            }

            const sprintBadge = race.isSprint ? `<span class="cal-badge cal-badge-sprint">SPRINT</span>` : '';
            const debutBadge = race.isDebut ? `<span class="cal-badge cal-badge-debut">DEBUT</span>` : '';

            card.innerHTML = `
                <div class="calendar-card-header">
                    <span class="calendar-round">${String(race.round).padStart(2, '0')}</span>
                    <span class="calendar-flagemoji">${race.flag || ''}</span>
                    <span class="calendar-flag">${race.country.slice(0, 3).toUpperCase()}</span>
                    ${statusBadge}
                </div>
                <h3>${shortRaceName(race.name)}</h3>
                <div class="calendar-badges">${sprintBadge}${debutBadge}</div>
                <div class="calendar-circuit">${race.circuit}</div>
                <div class="calendar-date">
                    ${new Date(race.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </div>
                ${countdownHTML}
            `;
            calendarGrid.appendChild(card);
        });
    }
    
    renderCalendar();

    // ============================================================
    // NEXT RACE LIVE COUNTDOWN
    // ============================================================
    function initNextRaceCountdown() {
        const now = new Date();
        const todayStr = now.toDateString();

        const setBoxes = (d, h, m, s) => {
            const fmt = n => String(n).padStart(2, '0');
            const ids = ['cd-days','cd-hours','cd-mins','cd-secs'];
            const vals = [d, h, m, s];
            ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = vals[i]; });
        };

        const setLabel = (text) => {
            const el = document.querySelector('.countdown-label-hero');
            if (el) el.textContent = text;
            const labelEl = document.querySelector('#now-block .pw-now__label');
            // first label only — "Next session" / "LIGHTS OUT"
            if (labelEl && labelEl.dataset.dynamic !== 'no') {
                labelEl.lastChild && (labelEl.lastChild.textContent = text === 'NEXT RACE COUNTDOWN' ? 'Next session' : text);
            }
        };

        const setName = (text) => {
            ['next-race-name', 'hero-next-race', 'now-race-name'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = text.replace(/^Next:\s*/, '');
            });
        };

        // Race day — show a clear race-day state instead of novelty glyphs
        const raceToday = raceCalendar.find(r => new Date(r.date).toDateString() === todayStr);
        if (raceToday) {
            setName(`${raceToday.name} — Race Day!`);
            setLabel('RACE TODAY');
            setBoxes('00', '00', '00', '00');
            return;
        }

        // Next upcoming race
        const nextRace = raceCalendar.find(r => new Date(r.date) > now);
        if (!nextRace) {
            setName('2026 Season Complete');
            setLabel('CHAMPIONS CROWNED');
            setBoxes('—', '—', '—', '—');
            return;
        }

        setName(`Next: ${nextRace.name}`);

        function updateCountdown() {
            const diff = new Date(nextRace.date) - new Date();
            if (diff <= 0) { initNextRaceCountdown(); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            const fmt = n => String(n).padStart(2, '0');
            setBoxes(d, fmt(h), fmt(m), fmt(s));
        }
        updateCountdown();
        // Re-invoked once live calendar dates arrive; keep exactly one timer.
        if (window._faticsCountdownTimer) clearInterval(window._faticsCountdownTimer);
        window._faticsCountdownTimer = setInterval(updateCountdown, 1000);
    }
    initNextRaceCountdown();

    // ============================================================
    // NOW BLOCK — populate Leader + Last Race cells
    // ============================================================
    function initNowBlock() {
        const nowEl = document.getElementById('now-block');
        if (!nowEl) return;

        // season-live.js paints this strip from the API, including the race
        // winner and a live countdown. Once it has, stop competing with it —
        // this function reruns on a timer and would otherwise overwrite.
        if (nowEl.dataset.live === '1') return;

        // Leader — pulled from current standings (live or fallback)
        const standings = (typeof driverStandings2026 !== 'undefined') ? driverStandings2026 : [];
        const leader = standings.find(d => d.position === 1) || standings[0];
        if (leader) {
            const nameEl = document.getElementById('now-leader-name');
            const teamEl = document.getElementById('now-leader-team');
            if (nameEl) nameEl.textContent = leader.driver || '—';
            if (teamEl) {
                teamEl.innerHTML = `${leader.team || '—'} · <span class="pw-now__delta">${leader.points ?? 0} pt</span>`;
            }
        }

        // Last race — most recent past round
        if (typeof raceCalendar !== 'undefined') {
            const now = new Date();
            const past = raceCalendar.filter(r => new Date(r.date) < now);
            const last = past[past.length - 1];
            if (last) {
                const lastEl = document.getElementById('now-last-race');
                const resultEl = document.getElementById('now-last-result');
                if (lastEl) lastEl.textContent = last.country || last.name;
                if (resultEl) resultEl.textContent = `Round ${last.round} · ${last.name}`;
            } else {
                const lastEl = document.getElementById('now-last-race');
                const resultEl = document.getElementById('now-last-result');
                if (lastEl) lastEl.textContent = 'Pre-season';
                if (resultEl) resultEl.textContent = 'Round 1 ahead';
            }
        }

        nowEl.setAttribute('data-loading', 'false');
    }
    initNowBlock();
    // Refresh after live standings arrive (1s + a longer recheck)
    setTimeout(initNowBlock, 1500);
    setTimeout(initNowBlock, 6000);

    // ============================================================
    // 2026 RULE CHANGES SECTION
    // ============================================================
    function initRuleChanges() {
        const grid = document.getElementById('rule-changes-grid');
        if (!grid || typeof ruleChanges2026 === 'undefined') return;
        grid.innerHTML = ruleChanges2026.map(rule => `
            <div class="rule-card">
                <div class="rule-icon">${rule.icon}</div>
                <h3 class="rule-title">${rule.title}</h3>
                <p class="rule-desc">${rule.description}</p>
            </div>
        `).join('');
    }
    initRuleChanges();


    
    calendarSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = raceCalendar.filter(race => 
            race.name.toLowerCase().includes(searchTerm) ||
            race.circuit.toLowerCase().includes(searchTerm) ||
            race.country.toLowerCase().includes(searchTerm)
        );
        renderCalendar(filtered);
    });
    
    calendarFilter.addEventListener('change', (e) => {
        const filter = e.target.value;
        const now = new Date();
        let filtered = raceCalendar;
        
        if (filter === 'upcoming') {
            filtered = raceCalendar.filter(race => new Date(race.date) > now);
        } else if (filter === 'completed') {
            filtered = raceCalendar.filter(race => new Date(race.date) < now);
        }
        
        renderCalendar(filtered);
    });



    // ===== CHAMPIONSHIP PREDICTION =====
    const runPredictionBtn = document.getElementById('run-prediction');
    const simulateSeasonBtn = document.getElementById('simulate-season');
    const predictionResults = document.getElementById('prediction-results');
    const analysisGrid = document.getElementById('analysis-grid');

    if (runPredictionBtn && typeof predictionModel !== 'undefined') {
        runPredictionBtn.addEventListener('click', () => {
            showPredictionLoading();
            
            setTimeout(() => {
                const predictions = predictionModel.generatePredictions();
                displayPredictions(predictions);
                displayDriverAnalysis();
            }, 1500);
        });

        simulateSeasonBtn.addEventListener('click', () => {
            showPredictionLoading();
            
            setTimeout(() => {
                const simResults = predictionModel.simulateSeason(1000);
                displaySimulationResults(simResults);
                displayDriverAnalysis();
            }, 2000);
        });
    }

    function showPredictionLoading() {
        predictionResults.innerHTML = `
            <div class="prediction-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Analyzing driver performance data...</div>
            </div>
        `;
    }

    // Shared prediction share bar — injected after results render
    function buildShareBar(top3, circuit, weather) {
        const weatherLabel = { dry: 'DRY', wet: 'WET', mixed: 'MIXED' }[weather] || String(weather || 'DRY').toUpperCase();
        const shareText = `F-ATICS AI PREDICTION\n${circuit || 'F1 2026'} / ${weatherLabel}\n${top3.map((p, i) => `P${i + 1} ${p.driver || p.driver} — ${p.winProbability || p.probability}% win probability`).join('\n')}\n\nTry your prediction: https://f-atics.vercel.app/#predictor`;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        return `
            <div class="pred-share-bar">
                <span class="pred-share-label">Share</span>
                <button class="pred-share-btn copy-btn" data-share="${encodeURIComponent(shareText)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Result
                </button>
                <a class="pred-share-btn x-share-btn" href="${tweetUrl}" target="_blank" rel="noopener noreferrer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Share on X
                </a>
            </div>`;
    }

    // Toast helper
    function showPredToast(msg) {
        let toast = document.getElementById('pred-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pred-toast';
            toast.className = 'pred-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('visible');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
    }

    // Wire copy buttons via event delegation on the results container
    predictionResults.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-btn[data-share]');
        if (!btn) return;
        const text = decodeURIComponent(btn.dataset.share);
        navigator.clipboard.writeText(text)
            .then(() => showPredToast('Prediction copied to clipboard'))
            .catch(() => showPredToast('Copy failed — try long-pressing the text'));
    });

    function displayPredictions(predictions) {
        const top3 = predictions.slice(0, 3);
        const rest = predictions.slice(3);
        const circuit = document.getElementById('circuit-select')?.value || '';
        const weather = document.getElementById('weather-select')?.value || 'dry';

        predictionResults.innerHTML = `
            <div class="prediction-podium">
                ${top3.map((p, i) => `
                    <div class="podium-card ${i === 0 ? 'first' : i === 1 ? 'second' : 'third'}">
                        <div class="podium-rank">P${i + 1}</div>
                        <div class="podium-driver-name">${p.driver}</div>
                        <div class="podium-probability">${p.winProbability}%</div>
                        <div class="podium-label">Win Probability</div>
                    </div>
                `).join('')}
            </div>
            <div class="prediction-list">
                ${rest.map((p, i) => `
                    <div class="prediction-item">
                        <div class="prediction-position">${i + 4}</div>
                        <div class="prediction-driver">${p.driver}</div>
                        <div class="prediction-bar-container">
                            <div class="prediction-bar" style="width: ${p.winProbability}%">
                                <span class="prediction-percentage">${p.winProbability}%</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${buildShareBar(top3, circuit, weather)}
        `;

        if (!reduceMotion) {
            setTimeout(() => {
                document.querySelectorAll('.prediction-bar').forEach(bar => {
                    bar.style.width = bar.style.width;
                });
            }, 100);
        }
    }

    function displaySimulationResults(results) {
        const top3 = results.slice(0, 3);
        const rest = results.slice(3);
        const circuit = document.getElementById('circuit-select')?.value || '';

        predictionResults.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <h3 style="color: var(--accent); font-size: 1.5rem; margin-bottom: 0.5rem;">
                    Monte Carlo Simulation Results
                </h3>
                <p style="color: var(--text-muted);">Based on 1,000 simulated seasons</p>
            </div>
            <div class="prediction-podium">
                ${top3.map((p, i) => `
                    <div class="podium-card ${i === 0 ? 'first' : i === 1 ? 'second' : 'third'}">
                        <div class="podium-rank">P${i + 1}</div>
                        <div class="podium-driver-name">${p.driver}</div>
                        <div class="podium-probability">${p.probability}%</div>
                        <div class="podium-label">Championship Wins: ${p.simWins}/1000</div>
                    </div>
                `).join('')}
            </div>
            <div class="prediction-list">
                ${rest.map((p, i) => `
                    <div class="prediction-item">
                        <div class="prediction-position">${i + 4}</div>
                        <div class="prediction-driver">${p.driver}</div>
                        <div class="prediction-bar-container">
                            <div class="prediction-bar" style="width: ${Math.max(parseFloat(p.probability) * 2, 5)}%">
                                <span class="prediction-percentage">${p.probability}%</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${buildShareBar(top3.map(p => ({...p, winProbability: p.probability})), circuit, 'dry')}
        `;
    }

    function displayDriverAnalysis() {
        const drivers = ['Max Verstappen', 'Lando Norris', 'Charles Leclerc', 'Oscar Piastri', 'Lewis Hamilton', 'George Russell'];
        
        analysisGrid.innerHTML = drivers.map(driver => {
            const analysis = predictionModel.getDriverAnalysis(driver);
            if (!analysis) return '';

            return `
                <div class="analysis-card">
                    <div class="analysis-driver-name">${analysis.driver}</div>
                    <div class="analysis-score">Score: ${analysis.score}/100</div>
                    
                    ${analysis.strengths.length > 0 ? `
                        <div class="analysis-section">
                            <h4>💪 Strengths</h4>
                            <ul>
                                ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${analysis.weaknesses.length > 0 ? `
                        <div class="analysis-section weaknesses">
                            <h4>⚠️ Areas to Improve</h4>
                            <ul>
                                ${analysis.weaknesses.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-box-label">Wins</div>
                            <div class="stat-box-value">${analysis.stats.wins}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-box-label">Podiums</div>
                            <div class="stat-box-value">${analysis.stats.podiums}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-box-label">Poles</div>
                            <div class="stat-box-value">${analysis.stats.poles}</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-box-label">Consistency</div>
                            <div class="stat-box-value">${(analysis.stats.consistency * 100).toFixed(0)}%</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Circuits Section with Search and Sort
    const circuitsGrid = document.getElementById('circuits-grid');
    const circuitModal = document.getElementById('circuit-modal');
    const circuitModalBody = document.getElementById('circuit-modal-body');
    const circuitCloseBtn = circuitModal.querySelector('.close-btn');
    const circuitModalOverlay = circuitModal.querySelector('.modal-overlay');
    const circuitSearch = document.getElementById('circuit-search');
    const circuitSort = document.getElementById('circuit-sort');
    
    let displayedCircuits = [...circuitsData];

    function renderCircuits(circuits) {
        circuitsGrid.innerHTML = '';

        // Empty state — no circuits match
        if (!circuits || circuits.length === 0) {
            circuitsGrid.innerHTML = `
                <div class="lab-empty" style="grid-column:1/-1">
                    <span class="lab-empty__tag">NO RESULTS</span>
                    <h3 class="lab-empty__title">NO CIRCUITS MATCH YOUR QUERY</h3>
                    <p class="lab-empty__sub">Try a different search term or clear the filter.</p>
                </div>
            `;
            return;
        }

        // Build a circuit-name → calendar-entry lookup for round
        const calLookup = (typeof raceCalendar !== 'undefined')
            ? Object.fromEntries(raceCalendar.map(r => [r.circuit, r]))
            : {};

        // Strip the year + driver from lapRecord: "1:31.447 - Pedro de la Rosa (2005)"
        const splitRecord = (rec) => {
            if (!rec) return { time: '—', who: '—' };
            const [time, rest] = rec.split(/\s*[-—]\s*/, 2);
            return { time: (time || '').trim(), who: (rest || '').trim() };
        };

        circuits.forEach((circuit, index) => {
            const card = document.createElement('div');
            card.classList.add('circuit-card', 'lab-circuit-card');
            card.style.animationDelay = `${index * 0.02}s`;

            const cal = calLookup[circuit.name];
            // Fall back to an em-dash rather than a bracketed index: an
            // unmatched circuit is not "round 04", and printing a fake round
            // number next to real ones is worse than printing none.
            const round = cal ? `R${String(cal.round).padStart(2, '0')}` : '—';
            const type = (circuit.circuitType || 'Permanent').toUpperCase();
            const drs = circuit.drsZones != null ? circuit.drsZones : '—';
            const top = circuit.topSpeed || '—';
            const rec = splitRecord(circuit.lapRecord);

            card.innerHTML = `
                <div class="lab-circuit-card__head">
                    <span class="lab-circuit-card__index">${round}</span>
                    <span class="lab-circuit-card__type" data-type="${type}">${type}</span>
                </div>
                <div class="lab-circuit-card__map" data-cmap="${window.__tracedTrack && window.__tracedTrack(circuit.name) ? '1' : '0'}">
                    ${window.__tracedTrackSVG && window.__tracedTrackSVG(circuit.name)
                        ? window.__tracedTrackSVG(circuit.name)
                        : `<img src="${circuit.layoutImage}" alt="${circuit.name} track layout" loading="lazy"
                         onerror="this.onerror=null;this.src=makeSVG('${circuit.name}','#000','#FF1F1F')">`}
                </div>
                <div class="lab-circuit-card__body">
                    <h3 class="lab-circuit-card__name">${circuit.name}</h3>
                    <div class="lab-circuit-card__loc">${circuit.location}</div>
                    <ul class="lab-circuit-card__stats">
                        <li><span>Length</span> ${circuit.length}</li>
                        <li><span>Laps</span> ${circuit.laps}</li>
                        <li><span>Corners</span> ${circuit.corners}</li>
                        <li><span>DRS zones</span> ${drs}</li>
                        <li><span>Top speed</span> ${top}</li>
                        <li><span>First GP</span> ${circuit.firstGP}</li>
                    </ul>
                    <div class="lab-circuit-card__record">
                        <span class="lab-circuit-card__record-label">Lap record</span>
                        <span class="lab-circuit-card__record-time">${rec.time}</span>
                        <span class="lab-circuit-card__record-who">${rec.who}</span>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => openCircuitModal(circuit));
            circuitsGrid.appendChild(card);
        });
    }
    
    renderCircuits(displayedCircuits);
    
    // Circuit Search
    circuitSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        displayedCircuits = circuitsData.filter(circuit => 
            circuit.name.toLowerCase().includes(searchTerm) ||
            circuit.location.toLowerCase().includes(searchTerm)
        );
        applySortAndRender();
    });
    
    // Circuit Sort
    circuitSort.addEventListener('change', (e) => {
        applySortAndRender();
    });
    
    function applySortAndRender() {
        const sortValue = circuitSort.value;
        let sorted = [...displayedCircuits];
        
        switch(sortValue) {
            case 'length-desc':
                sorted.sort((a, b) => parseFloat(b.length) - parseFloat(a.length));
                break;
            case 'length-asc':
                sorted.sort((a, b) => parseFloat(a.length) - parseFloat(b.length));
                break;
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                // calendar order (already in order)
                break;
        }
        
        renderCircuits(sorted);
    }

    function openCircuitModal(circuit) {
        const typeBadgeClass = circuit.circuitType === 'Street' ? 'badge-street'
                             : circuit.circuitType === 'Semi-Permanent' ? 'badge-semi'
                             : 'badge-permanent';
        circuitModalBody.innerHTML = `
            <div class="circuit-modal-header">
                <h2>${circuit.name}</h2>
                <div class="circuit-modal-location">${circuit.location}</div>
                <div class="circuit-meta-badges">
                    ${circuit.circuitType ? `<span class="circuit-badge ${typeBadgeClass}">${circuit.circuitType}</span>` : ''}
                    ${circuit.drsZones   ? `<span class="circuit-badge badge-drs">${circuit.drsZones} DRS Zone${circuit.drsZones !== 1 ? 's' : ''}</span>` : ''}
                    ${circuit.topSpeed   ? `<span class="circuit-badge badge-speed">${circuit.topSpeed} top speed</span>` : ''}
                </div>
            </div>

            <img src="${circuit.layoutImage}" alt="${circuit.name} layout" class="circuit-layout-image" onerror="this.onerror=null;this.src=makeSVG('${circuit.name} Layout','#1a1a1e','#e10600')">

            <div class="circuit-modal-stats">
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Length</div>
                    <div class="circuit-modal-stat-value">${circuit.length}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Laps</div>
                    <div class="circuit-modal-stat-value">${circuit.laps}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Race Distance</div>
                    <div class="circuit-modal-stat-value">${circuit.raceDistance}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">First GP</div>
                    <div class="circuit-modal-stat-value">${circuit.firstGP}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Corners</div>
                    <div class="circuit-modal-stat-value">${circuit.corners}</div>
                </div>
                <div class="circuit-modal-stat">
                    <div class="circuit-modal-stat-label">Lap Record</div>
                    <div class="circuit-modal-stat-value" style="font-size: 0.9rem;">${circuit.lapRecord}</div>
                </div>
            </div>
            
            <div class="circuit-modal-info">
                <div class="circuit-info-section">
                    <h3>Significance</h3>
                    <p>${circuit.significance}</p>
                </div>
                <div class="circuit-info-section">
                    <h3>Characteristics</h3>
                    <p>${circuit.characteristics}</p>
                </div>
                <div class="circuit-info-section">
                    <h3>Famous Corner</h3>
                    <p>${circuit.famousCorner}</p>
                </div>
            </div>
        `;
        circuitModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeCircuitModal() {
        circuitModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    circuitCloseBtn.addEventListener('click', closeCircuitModal);
    circuitModalOverlay.addEventListener('click', closeCircuitModal);

    // Close circuit modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && circuitModal.style.display === 'block') {
            closeCircuitModal();
        }
    });
});
