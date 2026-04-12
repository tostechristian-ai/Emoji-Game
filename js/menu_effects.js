// menu_effects.js — DOM dust particles + enemy flyby on menus/modals only.
(function () {
  'use strict';

  const ENEMY_EMOJIS = ['🧟','💀','🦇','👹','👻','😈','🧛‍♀️','🧟‍♀️','🦟','👁️'];
  const FLYBY_INTERVAL = 10000;
  let lastFlybyTime = 0;

  // Mouse cursor particle trail
  let mouseParticles = [];
  let lastMouseX = 0;
  let lastMouseY = 0;
  let mouseParticleContainer = null;

  function warmColor()  { return `rgba(210,175,120,${(0.12 + Math.random() * 0.28).toFixed(2)})`; }
  function whiteColor() { return `rgba(255,255,255,${(0.08 + Math.random() * 0.20).toFixed(2)})`; }

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
    
    const particle = {
      element: p,
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      life: 2000, // 2 seconds
      createdAt: Date.now()
    };
    
    mouseParticles.push(particle);
    if (mouseParticleContainer) {
      mouseParticleContainer.appendChild(p);
    }
    
    return particle;
  }

  function updateMouseParticles() {
    const now = Date.now();
    
    for (let i = mouseParticles.length - 1; i >= 0; i--) {
      const p = mouseParticles[i];
      const age = now - p.createdAt;
      
      if (age > p.life) {
        p.element.remove();
        mouseParticles.splice(i, 1);
        continue;
      }
      
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.element.style.left = p.x + 'px';
      p.element.style.top = p.y + 'px';
      
      // Fade out
      const opacity = 1 - (age / p.life);
      p.element.style.opacity = opacity;
    }
  }

  function onMouseMove(e) {
    // Emit particles on menu screens OR when game is paused (level up, pause menu)
    const isPaused = typeof gamePaused !== 'undefined' && gamePaused;
    const isActive = typeof gameActive !== 'undefined' && gameActive;
    
    // Don't emit during active gameplay (but DO emit when paused)
    if (isActive && !isPaused) return;
    
    const diffContainer = document.getElementById('difficultyContainer');
    const mapSelectContainer = document.getElementById('mapSelectContainer');
    const characterSelectContainer = document.getElementById('characterSelectContainer');
    const upgradeMenu = document.getElementById('upgradeMenu');
    const startScreen = document.getElementById('startScreen');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const achievementsModal = document.getElementById('achievementsModal');
    const cheatsModal = document.getElementById('cheatsModal');
    const gameGuideModal = document.getElementById('gameGuideModal');
    const upgradeShop = document.getElementById('upgradeShop');
    const merchantShop = document.getElementById('merchantShop');
    
    const onMenuScreen = 
      (diffContainer && diffContainer.style.display !== 'none') ||
      (mapSelectContainer && mapSelectContainer.style.display !== 'none' && mapSelectContainer.style.display !== '') ||
      (characterSelectContainer && characterSelectContainer.style.display !== 'none' && characterSelectContainer.style.display !== '') ||
      (upgradeMenu && upgradeMenu.style.display !== 'none' && upgradeMenu.style.display !== '') ||
      (startScreen && startScreen.style.display !== 'none' && startScreen.style.display !== '') ||
      (pauseOverlay && pauseOverlay.style.display !== 'none' && pauseOverlay.style.display !== '') ||
      (achievementsModal && achievementsModal.style.display !== 'none' && achievementsModal.style.display !== '') ||
      (cheatsModal && cheatsModal.style.display !== 'none' && cheatsModal.style.display !== '') ||
      (gameGuideModal && gameGuideModal.style.display !== 'none' && gameGuideModal.style.display !== '') ||
      (upgradeShop && upgradeShop.style.display !== 'none' && upgradeShop.style.display !== '') ||
      (merchantShop && merchantShop.style.display !== 'none' && merchantShop.style.display !== '');
    
    if (!onMenuScreen) return;
    
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Emit particles based on mouse movement speed
    if (distance > 5) {
      const particleCount = Math.min(3, Math.floor(distance / 10));
      for (let i = 0; i < particleCount; i++) {
        createMouseParticle(e.clientX, e.clientY);
      }
    }
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }

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

  // Track whether the main menu was visible last tick so we can detect re-entry
  let menuWasVisible = false;
  let wasInGameplay = false;

  function tick() {
    requestAnimationFrame(tick);
    
    // Always update mouse particles so they animate and fade out
    updateMouseParticles();
    
    const isActive = typeof gameActive !== 'undefined' && gameActive;
    const isPaused = typeof gamePaused !== 'undefined' && gamePaused;
    const inGameplay = isActive && !isPaused;
    
    // Clear all mouse particles when entering gameplay
    if (inGameplay && !wasInGameplay) {
      for (let i = mouseParticles.length - 1; i >= 0; i--) {
        mouseParticles[i].element.remove();
      }
      mouseParticles = [];
    }
    wasInGameplay = inGameplay;
    
    // Don't build dust during active gameplay
    if (inGameplay) {
      return;
    }

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

  function init() { 
    // Create mouse particle container
    mouseParticleContainer = document.createElement('div');
    mouseParticleContainer.id = 'mouseParticleContainer';
    mouseParticleContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
    document.body.appendChild(mouseParticleContainer);
    
    // Add mouse move listener
    document.addEventListener('mousemove', onMouseMove);
    
    tick(); 
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
})();
