// ═══════════════════════════════════════════════════════════════════════════
// MENU VISUAL EFFECTS
// ═══════════════════════════════════════════════════════════════════════════
// Adds visual polish to menus and overlays:
//   - Floating dust particles on every menu screen
//   - Mouse cursor particle trail (only on menus, not during gameplay)
//   - Enemy flyby animation across the main menu every 10 seconds
// Wrapped in an IIFE so it doesn't pollute the global scope.
(function () {
  'use strict';

  // ─── CONSTANTS ────────────────────────────────────────────────────────────
  const ENEMY_EMOJIS = ['🧟','💀','🦇','👹','👻','😈','🧛‍♀️','�','🦟','👁️']; // Pool of enemies that fly across the menu
  const FLYBY_INTERVAL = 10000; // How often an enemy flies across (ms)
  let lastFlybyTime = 0;

  // ─── MOUSE TRAIL STATE ────────────────────────────────────────────────────
  let mouseParticles = [];          // Active mouse trail particles
  let lastMouseX = 0;               // Previous mouse X (to calculate movement speed)
  let lastMouseY = 0;               // Previous mouse Y
  let mouseParticleContainer = null; // DOM container for mouse particles

  // ─── COLOR HELPERS ────────────────────────────────────────────────────────
  // Returns a random warm golden color (used on most menu screens)
  function warmColor()  { return `rgba(210,175,120,${(0.12 + Math.random() * 0.28).toFixed(2)})`; }
  // Returns a random white color (used on dark overlays like pause/game over)
  function whiteColor() { return `rgba(255,255,255,${(0.08 + Math.random() * 0.20).toFixed(2)})`; }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOUSE TRAIL PARTICLES
  // ═══════════════════════════════════════════════════════════════════════════

  // Create a single particle at the mouse position
  // Particles float upward and fade out over 2 seconds
  function createMouseParticle(x, y) {
    const p = document.createElement('div');
    const size = 2 + Math.random() * 4;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    const vx = Math.cos(angle) * speed;
    const vy = -Math.abs(Math.sin(angle)) * speed - 1; // Always float upward

    p.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;`
      + `width:${size}px;height:${size}px;`
      + `left:${x}px;top:${y}px;`
      + `background:${warmColor()};`
      + `transition:opacity 0.3s linear;z-index:9999;`;

    const particle = { element: p, x, y, vx, vy, life: 2000, createdAt: Date.now() };

    mouseParticles.push(particle);
    if (mouseParticleContainer) mouseParticleContainer.appendChild(p);

    return particle;
  }

  // Update all active mouse particles each frame
  // Moves them, fades them out, and removes expired ones
  function updateMouseParticles() {
    const now = Date.now();

    for (let i = mouseParticles.length - 1; i >= 0; i--) {
      const p = mouseParticles[i];
      const age = now - p.createdAt;

      // Remove expired particles
      if (age > p.life) {
        p.element.remove();
        mouseParticles.splice(i, 1);
        continue;
      }

      // Move particle
      p.x += p.vx;
      p.y += p.vy;
      p.element.style.left = p.x + 'px';
      p.element.style.top = p.y + 'px';

      // Fade out as it ages
      p.element.style.opacity = 1 - (age / p.life);
    }
  }

  // Handle mouse movement — emit particles when on a menu screen
  function onMouseMove(e) {
    const isPaused = typeof gamePaused !== 'undefined' && gamePaused;
    const isActive = typeof gameActive !== 'undefined' && gameActive;

    // Don't emit during active gameplay (but DO emit when paused/on menus)
    if (isActive && !isPaused) return;

    // Check if any menu screen is currently visible
    const ids = [
      'difficultyContainer','mapSelectContainer','characterSelectContainer',
      'upgradeMenu','startScreen','pauseOverlay','achievementsModal',
      'cheatsModal','gameGuideModal','upgradeShop','merchantShop'
    ];
    const onMenuScreen = ids.some(id => {
      const el = document.getElementById(id);
      return el && el.style.display !== 'none' && el.style.display !== '';
    });

    if (!onMenuScreen) return;

    // Calculate how far the mouse moved
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Emit more particles the faster the mouse moves
    if (distance > 5) {
      const particleCount = Math.min(3, Math.floor(distance / 10));
      for (let i = 0; i < particleCount; i++) {
        createMouseParticle(e.clientX, e.clientY);
      }
    }

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOATING DUST PARTICLES
  // ═══════════════════════════════════════════════════════════════════════════

  // Create a single floating dust particle element (CSS animated)
  function makeParticle(colorFn) {
    const p = document.createElement('div');
    const size = 3 + Math.random() * 6;
    const left = Math.random() * 98;          // Random horizontal position
    const dur  = 7 + Math.random() * 11;      // Random float duration (7–18s)
    const del  = -(Math.random() * dur);      // Negative delay = already mid-animation
    p.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;`
      + `width:${size}px;height:${size}px;left:${left}%;`
      + `background:${colorFn()};`
      + `animation:dust-float ${dur}s ${del}s linear infinite;`;
    return p;
  }

  // Build a dust layer on a screen element (only once — skips if already built)
  // @param el - The DOM element to add dust to
  // @param count - Number of dust particles
  // @param colorFn - Function that returns a color string
  // @param z - z-index for the dust layer
  function buildDust(el, count, colorFn, z) {
    if (!el || el.querySelector('.dust-layer-inner')) return; // Already has dust
    const layer = document.createElement('div');
    layer.className = 'dust-layer-inner';
    layer.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;`
      + `pointer-events:none;z-index:${z};overflow:hidden;`;
    for (let i = 0; i < count; i++) layer.appendChild(makeParticle(colorFn));
    el.appendChild(layer);
  }

  // Remove the dust layer from an element (used when re-entering main menu)
  function removeDust(el) {
    if (!el) return;
    const layer = el.querySelector('.dust-layer-inner');
    if (layer) layer.remove();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENEMY FLYBY ANIMATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Spawn a random enemy emoji that flies across the main menu screen
  // Appears every FLYBY_INTERVAL milliseconds
  function spawnFlyby() {
    const screen = document.getElementById('difficultyScreen');
    if (!screen) return;

    const fromLeft = Math.random() < 0.5; // Random direction
    const emoji = ENEMY_EMOJIS[Math.floor(Math.random() * ENEMY_EMOJIS.length)];
    const dur = (4 + Math.random() * 3) * 1000; // 4–7 seconds to cross

    const el = document.createElement('span');
    el.style.cssText = `position:absolute;pointer-events:none;z-index:3003;`
      + `font-size:36px;line-height:1;top:${10 + Math.random() * 68}%;`
      + `transform:scaleX(${fromLeft ? 1 : -1});`; // Flip if going right-to-left

    el.textContent = emoji;
    screen.appendChild(el);

    // Animate across the screen using Web Animations API
    el.animate([
      { left: fromLeft ? '-60px' : 'calc(100% + 60px)', opacity: 0 },
      { opacity: 0.85, offset: 0.08 },
      { opacity: 0.85, offset: 0.92 },
      { left: fromLeft ? 'calc(100% + 60px)' : '-60px', opacity: 0 }
    ], { duration: dur, fill: 'forwards', easing: 'linear' });

    // Clean up element after animation
    setTimeout(() => el.remove(), dur + 300);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN DUST CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  // List of screens that get dust particles added once when they appear
  const ONCE_SCREENS = [
    { id: 'startScreen',              count: 35, color: warmColor,  z: 10 },
    { id: 'splashScreen',             count: 35, color: warmColor,  z: 10 },
    { id: 'upgradeShop',              count: 20, color: warmColor,  z: 1  },
    { id: 'upgradeMenu',              count: 25, color: warmColor,  z: 1  },
    { id: 'mapSelectContainer',       count: 30, color: warmColor,  z: 1  },
    { id: 'characterSelectContainer', count: 30, color: warmColor,  z: 1  },
    { id: 'merchantShop',             count: 20, color: warmColor,  z: 1  },
    { id: 'pauseOverlay',             count: 20, color: whiteColor, z: 5  },
    { id: 'achievementsModal',        count: 20, color: whiteColor, z: 1  },
    { id: 'cheatsModal',              count: 20, color: whiteColor, z: 1  },
    { id: 'gameGuideModal',           count: 20, color: whiteColor, z: 1  },
    { id: 'gameOverlay',              count: 20, color: whiteColor, z: 1  },
  ];

  // Track visibility state to detect when menus are re-entered
  let menuWasVisible = false;
  let wasInGameplay = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ANIMATION TICK
  // ═══════════════════════════════════════════════════════════════════════════

  // Runs every frame via requestAnimationFrame
  // Handles dust building, mouse particles, and enemy flyby timing
  function tick() {
    requestAnimationFrame(tick);

    // Always update mouse particles so they animate and fade out
    updateMouseParticles();

    const isActive = typeof gameActive !== 'undefined' && gameActive;
    const isPaused = typeof gamePaused !== 'undefined' && gamePaused;
    const inGameplay = isActive && !isPaused;

    // Clear all mouse particles when entering active gameplay
    if (inGameplay && !wasInGameplay) {
      for (let i = mouseParticles.length - 1; i >= 0; i--) {
        mouseParticles[i].element.remove();
      }
      mouseParticles = [];
    }
    wasInGameplay = inGameplay;

    // Skip dust building during active gameplay
    if (inGameplay) return;

    // ─── BUILD DUST ON ONCE-SCREENS ─────────────────────────────────────────
    // Add dust to any visible screen that doesn't have it yet
    for (const cfg of ONCE_SCREENS) {
      const el = document.getElementById(cfg.id);
      if (!el) continue;
      if (el.style.display !== 'none' && el.style.display !== '') {
        buildDust(el, cfg.count, cfg.color, cfg.z);
      }
    }

    // ─── MAIN MENU DUST ─────────────────────────────────────────────────────
    // Rebuild dust every time the main menu becomes visible (e.g. after a game)
    const diffContainer = document.getElementById('difficultyContainer');
    const diffScreen    = document.getElementById('difficultyScreen');
    const menuVisible   = !!(diffContainer && diffContainer.style.display !== 'none');

    if (menuVisible && diffScreen) {
      if (!menuWasVisible) removeDust(diffScreen); // Remove old dust on re-entry
      buildDust(diffScreen, 35, warmColor, 3002);
    }
    menuWasVisible = menuVisible;

    // ─── ENEMY FLYBY ────────────────────────────────────────────────────────
    if (menuVisible) {
      const now = Date.now();
      if (now - lastFlybyTime > FLYBY_INTERVAL) {
        spawnFlyby();
        lastFlybyTime = now;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  function init() {
    // Create a fixed container for mouse trail particles
    mouseParticleContainer = document.createElement('div');
    mouseParticleContainer.id = 'mouseParticleContainer';
    mouseParticleContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
    document.body.appendChild(mouseParticleContainer);

    // Listen for mouse movement to emit trail particles
    document.addEventListener('mousemove', onMouseMove);

    // Start the animation loop
    tick();
  }

  // Wait for DOM to be ready before initializing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
