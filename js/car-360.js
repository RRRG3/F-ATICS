/**
 * F-ATICS Car 360° Viewer
 * Generates multi-angle SVG car frames and drives frame-based rotation
 * on team showcase cards via drag / touch / auto-spin.
 */

(function () {
  'use strict';

  // ─── SVG Frame Generator ────────────────────────────────────────────────────
  // Produces an inline SVG of the car body at different yaw angles.
  // Angles: 0=front, 45=front-3/4, 90=side, 135=rear-3/4, 180=rear + mirrors
  function carSVG(color = '#E10600', angle = 90, label = 'F1 Car') {
    const W = 380, H = 160;

    // Derived look values from angle (0° = front … 180° = rear)
    const norm = ((angle % 360) + 360) % 360;   // 0-360
    const half = norm > 180 ? 360 - norm : norm; // 0-180 reflected
    const t = half / 180;                        // 0=front → 1=rear

    // Perspective width of car body top vs bottom (foreshortening)
    const cx = W / 2;
    const carW = 80 + 140 * Math.sin(t * Math.PI);  // narrow at front/rear, wide at side
    const noseW = carW * 0.28;
    const bodyH = 38;
    const floorY = H * 0.68;

    // Determine if we are viewing from left or right
    const fromRight = norm > 180;
    const mirrorX = (x) => fromRight ? W - x : x;
    const mcp = (x) => mirrorX(cx + x);  // mirror around centre

    // Tyre parameters
    const tyreR = 22;
    const tyreW = 14;

    // Front/rear tyre X offset based on perspective
    const frontTyreX = carW * 0.42;
    const rearTyreX  = carW * 0.38;
    const frontTyreShift = 28 + 60 * (1 - t);   // move towards nose at front
    const rearTyreShift  = 28 + 60 * t;          // move towards tail at rear

    // Cockpit position
    const cockpitX = mcp(-carW * 0.05 + carW * 0.08 * (t - 0.5));

    // ── Body polygon points ──────────────────────────────────────────────────
    // We draw a simplified F1 car silhouette using polygons.
    // The body narrows at the nose and widens toward the sidepods.

    const noseY = floorY - bodyH * 0.5;
    const bodyTopY = floorY - bodyH;
    const noseTipX = mcp((norm < 180 ? -1 : 1) * (carW * 0.52 - 4));

    // Main body polygon
    const bodyPts = [
      `${mcp(-carW * 0.5)},${floorY}`,          // rear bottom left
      `${noseTipX},${floorY}`,                   // nose tip bottom
      `${noseTipX},${noseY}`,                     // nose tip top
      `${mcp(-carW * 0.5 + 10)},${bodyTopY}`,   // rear top
    ].join(' ');

    // Sidepod (wider mid-section)
    const sidepodX = mcp(carW * 0.12);
    const sidepodW = carW * 0.32;
    const sidepodH = bodyH * 0.7;

    // Halo/cockpit surround
    const haloW = carW * 0.14;
    const haloH = 20;

    // Wing widths (foreshortened)
    const fWingW = carW * 0.72;
    const rWingW = carW * 0.62;
    const wingThick = 6;

    // Rear wing height
    const rWingY = bodyTopY - 16;

    // ── Shadow ellipse under car ─────────────────────────────────────────────
    const shadowRx = carW * 0.52;
    const shadowRy = 6;
    const shadowY  = floorY + 8;

    // ── Assemble SVG ─────────────────────────────────────────────────────────
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
      width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet"
      style="width:100%;height:100%;display:block;">
      <defs>
        <radialGradient id="shd${W}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="bodyGrad${W}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${lighten(color, 0.28)}"/>
          <stop offset="55%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${darken(color, 0.22)}"/>
        </linearGradient>
        <linearGradient id="tyreGrad${W}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#444"/>
          <stop offset="100%" stop-color="#111"/>
        </linearGradient>
        <filter id="blur${W}">
          <feGaussianBlur stdDeviation="1.5"/>
        </filter>
      </defs>

      <!-- Shadow -->
      <ellipse cx="${cx}" cy="${shadowY}" rx="${shadowRx}" ry="${shadowRy}"
        fill="url(#shd${W})" opacity="0.5"/>

      <!-- Rear wing -->
      <rect x="${mcp(-rWingW * 0.5)}" y="${rWingY}" width="${rWingW * 0.85}"
        height="${wingThick}" rx="2"
        fill="${darken(color, 0.18)}" stroke="${darken(color,0.35)}" stroke-width="0.5"/>
      <!-- Rear wing pillar -->
      <rect x="${mcp(-rWingW * 0.05)}" y="${rWingY}" width="${rWingW * 0.1}"
        height="${bodyH * 0.55}" rx="1" fill="${darken(color,0.3)}"/>

      <!-- Rear tyres -->
      <ellipse cx="${mcp(-rearTyreX)}" cy="${floorY - tyreR * 0.4}"
        rx="${tyreW * (1 - t * 0.4)}" ry="${tyreR}"
        fill="url(#tyreGrad${W})"/>
      <ellipse cx="${mcp(-rearTyreX)}" cy="${floorY - tyreR * 0.4}"
        rx="${tyreW * (1 - t * 0.4) * 0.55}" ry="${tyreR * 0.55}"
        fill="#2a2a2a"/>

      <!-- Main car body -->
      <polygon points="${bodyPts}" fill="url(#bodyGrad${W})"
        stroke="${darken(color,0.3)}" stroke-width="1"/>

      <!-- Sidepod -->
      <rect x="${sidepodX - sidepodW * 0.5}" y="${floorY - sidepodH}"
        width="${sidepodW}" height="${sidepodH}"
        rx="4" fill="${lighten(color, 0.06)}"
        stroke="${darken(color,0.2)}" stroke-width="0.5"/>

      <!-- Engine cover / hump -->
      <ellipse cx="${cockpitX}" cy="${bodyTopY - 4}"
        rx="${haloW * 1.6}" ry="${bodyH * 0.28}"
        fill="${darken(color,0.1)}"/>

      <!-- Halo -->
      <path d="M ${cockpitX - haloW},${bodyTopY}
               Q ${cockpitX},${bodyTopY - haloH}
               ${cockpitX + haloW},${bodyTopY}"
        fill="none" stroke="#222" stroke-width="5" stroke-linecap="round"/>
      <path d="M ${cockpitX - haloW},${bodyTopY}
               Q ${cockpitX},${bodyTopY - haloH}
               ${cockpitX + haloW},${bodyTopY}"
        fill="none" stroke="#555" stroke-width="2" stroke-linecap="round"/>

      <!-- Cockpit opening -->
      <ellipse cx="${cockpitX}" cy="${bodyTopY + 2}"
        rx="${haloW * 0.8}" ry="${bodyH * 0.18}"
        fill="#0a0a0a"/>

      <!-- Front wing -->
      <rect x="${noseTipX - fWingW * (fromRight ? 0 : 1)}"
            y="${floorY - wingThick}"
            width="${fWingW}" height="${wingThick}"
            rx="2"
            fill="${lighten(color, 0.08)}"
            stroke="${darken(color,0.3)}" stroke-width="0.5"/>
      <!-- Front wing endplates -->
      <rect x="${noseTipX - fWingW * (fromRight ? 1 : 0) + (fromRight ? fWingW : 0) - 4}"
            y="${floorY - wingThick - 8}"
            width="4" height="${wingThick + 8}"
            rx="1" fill="${darken(color,0.3)}"/>

      <!-- Front tyres -->
      <ellipse cx="${noseTipX + (fromRight ? -frontTyreX * 0.5 : frontTyreX * 0.5)}"
               cy="${floorY - tyreR * 0.4}"
        rx="${tyreW * t * 1.2 + 2}" ry="${tyreR}"
        fill="url(#tyreGrad${W})"/>
      <ellipse cx="${noseTipX + (fromRight ? -frontTyreX * 0.5 : frontTyreX * 0.5)}"
               cy="${floorY - tyreR * 0.4}"
        rx="${(tyreW * t * 1.2 + 2) * 0.55}" ry="${tyreR * 0.55}"
        fill="#2a2a2a"/>

      <!-- Highlight gloss -->
      <ellipse cx="${mcp(-carW * 0.1)}" cy="${bodyTopY + 4}"
        rx="${carW * 0.18}" ry="${bodyH * 0.08}"
        fill="rgba(255,255,255,0.12)"/>
    </svg>`;
  }

  // ── Colour helpers ────────────────────────────────────────────────────────
  function hexToHsl(hex) {
    let r = parseInt(hex.slice(1,3),16)/255;
    let g = parseInt(hex.slice(3,5),16)/255;
    let b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = ((g-b)/d + (g<b?6:0))/6; break;
        case g: h = ((b-r)/d + 2)/6; break;
        default: h = ((r-g)/d + 4)/6;
      }
    }
    return [h*360, s*100, l*100];
  }

  function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const q = l < 0.5 ? l*(1+s) : l+s-l*s;
      const p = 2*l - q;
      const hue2rgb = (p,q,t) => {
        if (t<0) t+=1; if (t>1) t-=1;
        if (t<1/6) return p+(q-p)*6*t;
        if (t<1/2) return q;
        if (t<2/3) return p+(q-p)*(2/3-t)*6;
        return p;
      };
      r = hue2rgb(p,q,h+1/3);
      g = hue2rgb(p,q,h);
      b = hue2rgb(p,q,h-1/3);
    }
    const toHex = x => Math.round(x*255).toString(16).padStart(2,'0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function lighten(hex, amt) {
    try {
      const [h,s,l] = hexToHsl(hex);
      return hslToHex(h, s, Math.min(100, l + amt*100));
    } catch { return hex; }
  }

  function darken(hex, amt) {
    try {
      const [h,s,l] = hexToHsl(hex);
      return hslToHex(h, s, Math.max(0, l - amt*100));
    } catch { return hex; }
  }

  // ─── Frame Sequence ───────────────────────────────────────────────────────
  const TOTAL_FRAMES = 36; // one frame every 10°

  function buildFrames(color, label) {
    const frames = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const angle = (i / TOTAL_FRAMES) * 360;
      frames.push('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(carSVG(color, angle, label)));
    }
    return frames;
  }

  // ─── Viewer initialisation ────────────────────────────────────────────────
  function init360Viewer(container, color, label) {
    const frames = buildFrames(color, label);
    let currentFrame = 9; // start at ~90° (side view)
    let isDragging = false;
    let startX = 0;
    let accumX = 0;
    let autoSpinInterval = null;
    let autoSpinPaused = false;

    // Replace existing car-360-viewer content
    const viewer = container.querySelector('.car-360-viewer') || container;
    viewer.style.cursor = 'grab';
    viewer.style.userSelect = 'none';
    viewer.style.position = 'relative';
    viewer.style.overflow = 'hidden';

    // Frame img element
    const img = viewer.querySelector('.car-image') || document.createElement('img');
    img.className = 'car-image car-360-frame';
    img.style.cssText = `
      width:100%; height:100%; object-fit:contain;
      display:block; pointer-events:none;
      transition: opacity 0.04s ease;
    `;
    img.src = frames[currentFrame];
    if (!viewer.contains(img)) viewer.prepend(img);

    // Replace rotation indicator overlay
    let indicator = viewer.querySelector('.rotation-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'rotation-indicator';
      viewer.appendChild(indicator);
    }
    indicator.innerHTML = `
      <div class="rot-hint">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          <polyline points="16 6 22 6 22 12"/>
        </svg>
        <span>Drag</span>
      </div>`;
    indicator.style.cssText = `
      position:absolute; bottom:10px; right:12px;
      background:rgba(0,0,0,0.55); backdrop-filter:blur(6px);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:100px; padding:4px 10px;
      font-size:11px; color:rgba(255,255,255,0.7);
      font-family:'Inter',sans-serif;
      pointer-events:none;
      display:flex; align-items:center; gap:5px;
      transition: opacity 0.3s ease;
    `;

    // Angle label overlay
    let angleLabel = viewer.querySelector('.angle-label');
    if (!angleLabel) {
      angleLabel = document.createElement('div');
      angleLabel.className = 'angle-label';
      viewer.appendChild(angleLabel);
    }
    angleLabel.style.cssText = `
      position:absolute; top:10px; left:12px;
      font-size:10px; font-family:'SF Mono','Fira Mono',monospace;
      color:${color}; letter-spacing:1.5px; text-transform:uppercase;
      opacity:0; transition: opacity 0.3s ease;
      pointer-events:none;
    `;

    function setFrame(idx) {
      currentFrame = ((idx % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
      img.src = frames[currentFrame];
      const deg = Math.round((currentFrame / TOTAL_FRAMES) * 360);
      const angleMap = {0:'FRONT',90:'SIDE',180:'REAR',270:'SIDE'};
      const closest = Object.keys(angleMap).reduce((a,b) =>
        Math.abs(b - deg) < Math.abs(a - deg) ? b : a);
      angleLabel.textContent = angleMap[closest] || `${deg}°`;
    }

    // Auto-spin: always spinning slowly unless user is interacting
    function startAutoSpin() {
      if (autoSpinInterval) return;
      autoSpinInterval = setInterval(() => {
        if (!isDragging && !autoSpinPaused) {
          setFrame(currentFrame + 1);
        }
      }, 80);
    }

    function pauseAutoSpin() {
      autoSpinPaused = true;
      setTimeout(() => { autoSpinPaused = false; }, 2200);
    }

    startAutoSpin();

    // ── Mouse ──────────────────────────────────────────────────────────────
    viewer.addEventListener('mouseenter', () => {
      indicator.style.opacity = '1';
      angleLabel.style.opacity = '1';
    });

    viewer.addEventListener('mouseleave', () => {
      indicator.style.opacity = '0.4';
      angleLabel.style.opacity = '0';
      isDragging = false;
      viewer.style.cursor = 'grab';
    });

    viewer.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      accumX = 0;
      viewer.style.cursor = 'grabbing';
      pauseAutoSpin();
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      accumX += dx;
      startX = e.clientX;
      // 1 frame every ~8px of drag
      const frameDelta = Math.round(accumX / 8);
      if (frameDelta !== 0) {
        setFrame(currentFrame - frameDelta);
        accumX -= frameDelta * 8;
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        viewer.style.cursor = 'grab';
      }
    });

    // ── Touch ──────────────────────────────────────────────────────────────
    viewer.addEventListener('touchstart', (e) => {
      isDragging = true;
      startX = e.touches[0].clientX;
      accumX = 0;
      pauseAutoSpin();
      e.stopPropagation();
    }, { passive: true });

    viewer.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const dx = e.touches[0].clientX - startX;
      accumX += dx;
      startX = e.touches[0].clientX;
      const frameDelta = Math.round(accumX / 8);
      if (frameDelta !== 0) {
        setFrame(currentFrame - frameDelta);
        accumX -= frameDelta * 8;
      }
      e.preventDefault();
    }, { passive: false });

    viewer.addEventListener('touchend', () => { isDragging = false; });
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  window.Car360 = { init: init360Viewer };

})();
