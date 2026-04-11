// menu_effects.js — DOM dust particles + enemy flyby on menus/modals only.
(function () {
  'use strict';

  const ENEMY_EMOJIS = ['🧟','💀','🦇','👹','👻','😈','🧛‍♀️','🧟‍♀️','🦟','👁️'];
  const FLYBY_INTERVAL = 10000;
  let lastFlybyTime = 0;

  function warmColor()  { return `rgba(210,175,120,${(0.12 + Math.random() * 0.28).toFixed(2)})`; }
  function whiteColor() { return `rgba(255,255,255,${(0.08 + Math.random() * 0.20).toFixed(2)})`; }

  function makeParticle(colorFn) {
    const p = document.createElement('div');
    const size = 3 + Math.random() * 6;
    const left = Math.random() * 98;
    const dur  = 7 + Math.random() * 11;
    const del  = -(Math.random() * dur);
    p.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;`
      + `width:${size}px;height:${size}px;left:${left}%;`
      + `background:${colorFn()};`
      + `animation:dust-float ${dur}s ${del}s linear infinite;`;
    return p;
  }

  function buildDust(el, count, colorFn, z) {
    if (!el || el.querySelector('.dust-layer-inner')) return;
    const layer = document.createElement('div');
    layer.className = 'dust-layer-inner';
    layer.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;`
      + `pointer-events:none;z-index:${z};overflow:hidden;`;
    for (let i = 0; i < count; i++) layer.appendChild(makeParticle(colorFn));
    el.appendChild(layer);
  }

  function removeDust(el) {
    if (!el) return;
    const layer = el.querySelector('.dust-layer-inner');
    if (layer) layer.remove();
  }

  function spawnFlyby() {
    const screen = document.getElementById('difficultyScreen');
    if (!screen) return;
    const fromLeft = Math.random() < 0.5;
    const emoji = ENEMY_EMOJIS[Math.floor(Math.random() * ENEMY_EMOJIS.length)];
    const dur = (4 + Math.random() * 3) * 1000;
    const el = document.createElement('span');
    el.style.cssText = `position:absolute;pointer-events:none;z-index:3003;`
      + `font-size:36px;line-height:1;top:${10 + Math.random() * 68}%;`
      + `transform:scaleX(${fromLeft ? 1 : -1});`;
    el.textContent = emoji;
    screen.appendChild(el);
    el.animate([
      { left: fromLeft ? '-60px' : 'calc(100% + 60px)', opacity: 0 },
      { opacity: 0.85, offset: 0.08 },
      { opacity: 0.85, offset: 0.92 },
      { left: fromLeft ? 'calc(100% + 60px)' : '-60px', opacity: 0 }
    ], { duration: dur, fill: 'forwards', easing: 'linear' });
    setTimeout(() => el.remove(), dur + 300);
  }

  // Screens that always get dust once (modals, overlays)
  const ONCE_SCREENS = [
    { id: 'startScreen',       count: 35, color: warmColor,  z: 10 },
    { id: 'splashScreen',      count: 35, color: warmColor,  z: 10 },
    { id: 'upgradeShop',       count: 20, color: warmColor,  z: 1  },
    { id: 'pauseOverlay',      count: 20, color: whiteColor, z: 5  },
    { id: 'achievementsModal', count: 20, color: whiteColor, z: 1  },
    { id: 'cheatsModal',       count: 20, color: whiteColor, z: 1  },
    { id: 'gameGuideModal',    count: 20, color: whiteColor, z: 1  },
    { id: 'gameOverlay',       count: 20, color: whiteColor, z: 1  },
  ];

  // Track whether the main menu was visible last tick so we can detect re-entry
  let menuWasVisible = false;

  function tick() {
    // Don't run during active gameplay — zero cost
    if (typeof gameActive !== 'undefined' && gameActive) {
      requestAnimationFrame(tick);
      return;
    }
    requestAnimationFrame(tick);

    // ── Once-screens: build dust the first time they appear ──
    for (const cfg of ONCE_SCREENS) {
      const el = document.getElementById(cfg.id);
      if (!el) continue;
      if (el.style.display !== 'none' && el.style.display !== '') {
        buildDust(el, cfg.count, cfg.color, cfg.z);
      }
    }

    // ── Main menu: rebuild dust every time the container becomes visible ──
    const diffContainer = document.getElementById('difficultyContainer');
    const diffScreen    = document.getElementById('difficultyScreen');
    const menuVisible   = !!(diffContainer && diffContainer.style.display !== 'none');

    if (menuVisible && diffScreen) {
      // If we just became visible (re-entry after game), remove old layer and rebuild
      if (!menuWasVisible) removeDust(diffScreen);
      buildDust(diffScreen, 35, warmColor, 3002);
    }
    menuWasVisible = menuVisible;

    // ── Enemy flyby ──
    if (menuVisible) {
      const now = Date.now();
      if (now - lastFlybyTime > FLYBY_INTERVAL) {
        spawnFlyby();
        lastFlybyTime = now;
      }
    }
  }

  function init() { tick(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
