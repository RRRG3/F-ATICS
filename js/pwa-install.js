/**
 * F-ATICS PWA Install Prompt
 * ═════════════════════════════════════════════════════════════════
 * Listens for the `beforeinstallprompt` event (Chrome/Edge/Android),
 * stashes it, and shows a subtle bracket-styled CTA after the user
 * has spent ≥30s on the site. Hides if previously dismissed (stored
 * in localStorage with a 7-day cooldown).
 *
 * iOS Safari: no beforeinstallprompt event, but we show a different
 * instruction tip ("Tap Share → Add to Home Screen") if iOS detected
 * and not in standalone mode.
 * ═════════════════════════════════════════════════════════════════
 */
(function () {
    'use strict';

    const DISMISS_KEY = 'f1_pwa_dismissed_at';
    const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
    const SHOW_DELAY_MS = 30 * 1000;               // 30 seconds

    let deferredPrompt = null;

    function isStandalone() {
        return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
            || window.navigator.standalone === true;
    }

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    function recentlyDismissed() {
        try {
            const t = localStorage.getItem(DISMISS_KEY);
            if (!t) return false;
            return Date.now() - parseInt(t, 10) < COOLDOWN_MS;
        } catch { return false; }
    }

    function dismiss() {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
        const el = document.getElementById('pwa-install-prompt');
        if (el) el.remove();
    }

    function buildPrompt({ ios = false } = {}) {
        const wrapper = document.createElement('div');
        wrapper.id = 'pwa-install-prompt';
        wrapper.className = 'pwa-install';
        wrapper.setAttribute('role', 'dialog');
        wrapper.setAttribute('aria-label', 'Install F-ATICS');

        const ctaLabel = ios ? 'TAP SHARE → ADD TO HOME SCREEN' : 'INSTALL APP';

        wrapper.innerHTML = `
          <div class="pwa-install__row">
            <div class="pwa-install__brand">
              <span class="pwa-install__brand-tag">[F·ATICS]</span>
              <span class="pwa-install__brand-msg">Add to home screen — race-day notifications, offline mode, instant launch.</span>
            </div>
            <div class="pwa-install__actions">
              <button class="pwa-install__cta" id="pwa-install-cta">${ctaLabel}</button>
              <button class="pwa-install__dismiss" id="pwa-install-dismiss">DISMISS</button>
            </div>
          </div>
        `;

        document.body.appendChild(wrapper);
        // Animate in
        requestAnimationFrame(() => wrapper.classList.add('pwa-install--visible'));

        document.getElementById('pwa-install-dismiss').addEventListener('click', dismiss);

        const ctaBtn = document.getElementById('pwa-install-cta');
        if (ios) {
            ctaBtn.addEventListener('click', () => {
                // Show a brief instruction tooltip — iOS can't auto-prompt
                ctaBtn.textContent = 'TAP ⎙ SHARE BUTTON';
                setTimeout(dismiss, 4000);
            });
        } else {
            ctaBtn.addEventListener('click', async () => {
                if (!deferredPrompt) { dismiss(); return; }
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                if (outcome === 'accepted') dismiss();
                else { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {} ; document.getElementById('pwa-install-prompt')?.remove(); }
            });
        }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    function maybeShow() {
        if (isStandalone()) return;
        if (recentlyDismissed()) return;
        if (deferredPrompt) buildPrompt({ ios: false });
        else if (isIOS()) buildPrompt({ ios: true });
    }

    // Delay so we don't interrupt initial scrolling
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(maybeShow, SHOW_DELAY_MS), { once: true });
    } else {
        setTimeout(maybeShow, SHOW_DELAY_MS);
    }
})();
