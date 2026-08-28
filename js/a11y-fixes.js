/* ══════════════════════════════════════════════════════════════════
   F-ATICS · ACCESSIBILITY FIXES
   An audit across all eight drawers came back clean on the things
   that usually fail — every image had alt text, every button an
   accessible name, no heading level was skipped, no link was empty.
   Two gaps remained:

   1. The eleven pace-override sliders had no label at all. A screen
      reader announced "slider, 0" eleven times with nothing to say
      which team each one belonged to.
   2. Four decorative icons — inside a control label, a button and
      two panel headings — carried no role, so they were exposed as
      unlabelled graphics. They illustrate adjacent text, so they
      should be hidden from assistive technology rather than
      described.
   ══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    function labelSliders() {
        const sliders = document.querySelectorAll('.pace-row__slider');
        if (!sliders.length) return false;
        let n = 0;
        sliders.forEach((s) => {
            if (s.dataset.a11y === '1') return;
            const team = s.dataset.team || 'this team';
            s.setAttribute('aria-label', 'Pace adjustment for ' + team);

            // A bare "0" tells you nothing; say which way and by how much.
            const speak = () => {
                const v = Number(s.value) || 0;
                s.setAttribute('aria-valuetext',
                    v === 0 ? 'No adjustment'
                            : Math.abs(v) + ' ' + (Math.abs(v) === 1 ? 'step' : 'steps') + ' ' +
                              (v > 0 ? 'faster' : 'slower'));
            };
            speak();
            s.addEventListener('input', speak);
            s.dataset.a11y = '1';
            n++;
        });
        if (n) console.info('[a11y] ' + n + ' pace sliders labelled');
        return true;
    }

    /* Icons that sit beside their own label are decorative. Hiding them
       stops a screen reader announcing an anonymous graphic before the
       text that already explains it. */
    function hideDecorativeIcons() {
        const scopes = ['.control-label', '.pred-btn-inner', '.pred-panel-header',
                        '.lab-circuit-card__type', '.drawer__bar'];
        let n = 0;
        document.querySelectorAll(scopes.map((s) => s + ' > svg').join(',')).forEach((svg) => {
            if (svg.getAttribute('aria-hidden') || svg.getAttribute('aria-label') ||
                svg.getAttribute('role')) return;
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');   // legacy IE/Edge tab stop
            n++;
        });
        if (n) console.info('[a11y] ' + n + ' decorative icons hidden from assistive tech');
        return n;
    }

    function run() {
        const a = labelSliders();
        hideDecorativeIcons();
        return a;
    }

    function boot() {
        if (run()) return;
        let n = 0;
        const t = setInterval(() => { if (run() || ++n > 50) clearInterval(t); }, 700);
    }

    document.addEventListener('room:ready', () => setTimeout(boot, 800), { once: true });
    document.addEventListener('room:open', () => setTimeout(run, 400));
    setTimeout(boot, 2400);
})();
