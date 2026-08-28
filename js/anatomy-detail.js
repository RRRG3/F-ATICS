/* ══════════════════════════════════════════════════════════════════
   F-ATICS · ANATOMY DETAIL
   The readout gave each component one sentence and one line about
   2026. Fine as a caption, thin as a reference — it never said what
   anything is made of, how big it is, or what it has to survive.

   Each of the fourteen parts now carries a short spec block: the
   material, one hard figure, the specific 2026 regulation change,
   and a line of engineering rationale — why the part is shaped the
   way it is rather than merely what it does.

   Figures are the published 2026 regulations and long-standing FIA
   test requirements. Where a number is a design norm rather than a
   rule it is written as approximate, because teams differ.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* Each entry must ADD to the description already on screen, never
       restate it. The first draft repeated the copy almost verbatim for
       half the parts — "the floor sucks the car down", "the nose is a
       crash structure" — which reads as padding, not detail.

       The halo's mass is deliberately absent: the on-screen copy cites
       about seven kilograms, other sources say nine, and putting a second
       number beside it would just contradict the page. */
    const PARTS = {
        'front-wing': {
            material: 'Carbon-fibre composite',
            figure: 'Up to four adjustable elements',
            change: 'Narrower, and moveable for the first time',
            why: 'Teams change only the topmost flap between sessions — it is the one part ' +
                 'a mechanic can re-angle on the grid in seconds, which is why you see it ' +
                 'tweaked right up to the formation lap.',
        },
        'nose': {
            material: 'Carbon skin over aluminium honeycomb',
            figure: 'Deceleration capped by FIA impact test',
            change: 'Shorter, to suit the narrower front wing',
            why: 'The tip is designed to crush progressively rather than resist. A nose that ' +
                 'survived an impact intact would have passed all that energy straight into ' +
                 'the chassis, and the driver.',
        },
        'front-suspension': {
            material: 'Carbon-clad steel, titanium uprights',
            figure: 'Pushrod or pullrod, by team choice',
            change: 'Repackaged around the narrower track',
            why: 'The choice between pushrod and pullrod is mostly about where the team wants ' +
                 'the mass and the aerodynamic blockage, not about the suspension itself — ' +
                 'both can be made to work mechanically.',
        },
        'front-tyre': {
            material: 'Pirelli slick over a nylon and polyester casing',
            figure: '25 mm narrower for 2026',
            change: 'Narrowed to cut drag and wake',
            why: 'Narrower rubber warms up faster because there is less mass to heat, which ' +
                 'partly offsets the grip lost — useful on out-laps and in qualifying.',
        },
        'cockpit': {
            material: 'Carbon fibre with Zylon intrusion panels',
            figure: 'Driver must exit within 7 seconds',
            change: 'Structures strengthened again for 2026',
            why: 'The seat is moulded to one driver and lifts out with them still in it, so ' +
                 'medics never have to move a suspected spinal injury by hand.',
        },
        'halo': {
            material: 'Grade 5 titanium',
            figure: 'Three mounting points to the survival cell',
            change: 'Carried over, with mountings revised',
            why: 'It is machined rather than moulded, and only three suppliers worldwide are ' +
                 'FIA-approved to make it — every team buys the same part rather than ' +
                 'designing their own.',
        },
        'airbox': {
            material: 'Carbon fibre, integral with the roll hoop',
            figure: 'Ram effect rises with the square of speed',
            change: 'Reshaped around the larger battery',
            why: 'At speed the inlet pressurises itself, so the engine is fed denser air the ' +
                 'faster the car goes — an effect worth real power at the end of a straight ' +
                 'and worth nothing at all in the pit lane.',
        },
        'sidepod': {
            material: 'Carbon fibre over radiator cores',
            figure: 'Cooling sized for the hottest race, not the average',
            change: 'Larger inlets for the bigger battery',
            why: 'Bodywork is homologated in cooling configurations, so teams pick a spec for ' +
                 'the weekend and live with it. Guess cold in Singapore and the power unit is ' +
                 'turned down to survive.',
        },
        'floor': {
            material: 'Carbon fibre over a Jabroc plank',
            figure: 'Plank wear limited to 1 mm',
            change: 'Ground effect reduced for 2026',
            why: 'That 1 mm is why cars are not simply run as low as possible. The plank is ' +
                 'measured after the race, and exceeding the wear limit is a disqualification ' +
                 'regardless of where the car finished.',
        },
        'power-unit': {
            material: 'V6 turbo, MGU-K and battery',
            figure: 'Fuel flow limited by energy, not volume',
            change: 'MGU-H deleted; electric power nearly tripled',
            why: 'Losing the MGU-H removes what used to spin the turbo up before the throttle ' +
                 'was opened, so 2026 brings back a lag that drivers must anticipate — a ' +
                 'sensation absent from F1 since 2013.',
        },
        'rear-suspension': {
            material: 'Titanium and carbon, on the gearbox casing',
            figure: 'Gearbox casing is a structural member',
            change: 'Repackaged around the new casing',
            why: 'Because the casing carries suspension loads, a customer team buying a ' +
                 'gearbox inherits its mounting geometry too — which quietly constrains how ' +
                 'different their rear end can be.',
        },
        'diffuser': {
            material: 'Carbon fibre',
            figure: 'Sets the pressure the whole floor works against',
            change: 'Reduced in size with the floor',
            why: 'Expand the air too aggressively and the flow separates: the floor stalls and ' +
                 'the downforce vanishes mid-corner with no warning. Most porpoising problems ' +
                 'begin here.',
        },
        'rear-wing': {
            material: 'Carbon fibre, actively moveable',
            figure: 'Available to every car, not just the chaser',
            change: 'DRS replaced by active aero and Manual Override',
            why: 'Because everyone gets it, the wing stops being an overtaking aid at all. ' +
                 'That job passes to Manual Override, which hands the following driver extra ' +
                 'electrical power instead of less drag.',
        },
        'rear-tyre': {
            material: 'Pirelli slick over a nylon and polyester casing',
            figure: '30 mm narrower for 2026',
            change: 'Narrowed again, cutting drag at the back',
            why: 'The rear tyres throw the widest wake on the car, so narrowing them is aimed ' +
                 'less at the car carrying them than at the one behind trying to follow.',
        },
    };

    const CSS = `
.anatx { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line);
    display: grid; gap: 12px; }
/* The panel was a fixed-height, vertically centred box, so the detail block
   was clipped — the longest entry needed 404px in a 270px panel and simply
   lost its last two lines. The height comes from the grid row, not from
   max-height, so both have to be released. */
.drawer .anat { align-items: start !important; }
.drawer .anat__panel {
    justify-content: flex-start !important;
    align-self: start !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
}
.anatx__grid { display: grid; gap: 8px; }
.anatx__row { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 12px;
    align-items: baseline; }
.anatx__k { font-family: var(--font-mono); font-size: 8.5px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--fg-mute); }
.anatx__v { font-size: 12.5px; line-height: 1.45; color: var(--fg); }
.anatx__v.is-change { color: var(--accent-text, var(--accent)); }
.anatx__why { font-size: 12px; line-height: 1.65; color: var(--fg-dim);
    padding-left: 12px; border-left: 2px solid var(--line); }

@media (max-width: 620px) {
  .anatx__row { grid-template-columns: 1fr; gap: 2px; }
}
`;

    function injectCSS() {
        if (document.getElementById('anatomy-detail-css')) return;
        const el = document.createElement('style');
        el.id = 'anatomy-detail-css';
        el.textContent = CSS;
        document.head.appendChild(el);
    }

    const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };

    function render(host, key) {
        const p = PARTS[key];
        if (!p) { host.innerHTML = ''; return; }
        const row = (k, v, cls) => '<div class="anatx__row"><span class="anatx__k">' + k +
            '</span><span class="anatx__v' + (cls || '') + '">' + esc(v) + '</span></div>';
        host.innerHTML =
            '<div class="anatx__grid">' +
            row('Material', p.material) +
            row('Key figure', p.figure) +
            row('2026', p.change, ' is-change') +
            '</div>' +
            '<p class="anatx__why">' + esc(p.why) + '</p>';
    }

    let bound = false;

    function boot() {
        const panel = document.querySelector('#drawer-anatomy .anat__panel')
                   || document.querySelector('#anatomy .anat__panel');
        if (!panel || bound) return !!bound;

        const parts = document.querySelectorAll('#drawer-anatomy [data-part], #anatomy [data-part]');
        if (!parts.length) return false;

        injectCSS();
        let host = panel.querySelector('.anatx');
        if (!host) {
            host = document.createElement('div');
            host.className = 'anatx';
            panel.appendChild(host);
        }

        // The existing spec line duplicates what the grid now says properly.
        const oldSpec = panel.querySelector('#anat-spec');
        if (oldSpec) oldSpec.style.display = 'none';

        parts.forEach((el) => {
            const key = el.dataset.part;
            const show = () => render(host, key);
            el.addEventListener('mouseenter', show);
            el.addEventListener('focus', show, true);
            el.addEventListener('click', show);
        });

        bound = true;
        console.info('[anatomy] detail block wired to ' + parts.length + ' hotspots');
        return true;
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 700), { once: true });
    document.addEventListener('room:open', () => setTimeout(boot, 400));
    setTimeout(() => {
        if (boot()) return;
        let n = 0;
        const t = setInterval(() => { if (boot() || ++n > 40) clearInterval(t); }, 600);
    }, 2000);
})();
