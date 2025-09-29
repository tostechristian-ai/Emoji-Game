// skullCharacter.js (fixed by Gemini - Final Version)
// - Hides base player sprite instead of using opacity.
// - Reduces bone projectile size.
// - Protects Player 2 from character override.
// - Makes projectiles spin.
(function() {
  'use strict';

  // Helper function to wait for game variables to be ready
  function waitFor(cond, cb, timeout = 8000, interval = 40) {
    const start = Date.now();
    const t = setInterval(() => {
      try {
        if (cond()) {
          clearInterval(t);
          cb();
        } else if (Date.now() - start > timeout) {
          clearInterval(t);
        }
      } catch (e) {
        clearInterval(t);
      }
    }, interval);
  }

  function log(...s) {
    try {
      console.log('[SkullPlugin]', ...s);
    } catch (e) {}
  }

  // Wait for the main script's variables to be initialized
  waitFor(() => (typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' && typeof ACHIEVEMENTS !== 'undefined' && typeof playerData !== 'undefined' && typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined'), init, 8000);

  function init() {
    log('Initializing skull character plugin (Final Version)...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPIN_SPEED = 0.25;
    const NOVA_COUNT = 16,
      NOVA_SPEED = 6.0,
      NOVA_SIZE = 10, // Bone nova size
      NOVA_LIFE = 1000;
    
    // IMPORTANT: Size for normal bone bullets (half of normal bullets)
    const BONE_BULLET_SIZE_MULTIPLIER = 0.5;
    const SKULL_SIZE = 42; // Larger than default player (35)

    // --- SETUP CHARACTER, UNLOCKS, AND ACHIEVEMENTS ---
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'Skull',
        emoji: SKULL_EMOJI,
        perk: 'Bone bullets + dodge nova',
        unlockCondition: {
          type: 'achievement',
          id: SKULL_ACH_ID
        }
      };
    } else {
      CHARACTERS[SKULL_ID].unlockCondition = {
        type: 'achievement',
        id: SKULL_ACH_ID
      };
      CHARACTERS[SKULL_ID].emoji = SKULL_EMOJI;
    }

    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
      UNLOCKABLE_PICKUPS[SKULL_ID] = {
        name: 'Skull Character',
        desc: 'Unlock the Skull (bone bullets)',
        cost: 1000,
        icon: SKULL_EMOJI
      };
    }

    if (!ACHIEVEMENTS[SKULL_ACH_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID] = {
        name: 'Skull Unlocked',
        desc: 'Unlocks the Skull character',
        icon: SKULL_EMOJI,
        unlocked: false
      };
    }

    if (playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
    }

    // Pre-render both sizes
    try {
      preRenderEmoji(BONE_EMOJI, 20); // Normal rendering for bones
      preRenderEmoji(SKULL_EMOJI, SKULL_SIZE); // Larger skull
    } catch (e) {}

    if (!sprites._backup_bullet && sprites.bullet) {
      sprites._backup_bullet = sprites.bullet;
    }

    // --- HELPER FUNCTIONS ---
    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      player.size = SKULL_SIZE; // Make skull larger
      if (!player._skull_speed_backup) player._skull_speed_backup = player.speed;
      player.speed = player.originalPlayerSpeed * 0.95;
      if (!player._skull_damage_backup) player._skull_damage_backup = player.damageMultiplier;
      player.damageMultiplier = 1.25;
      if (!player._skull_projSize_backup) player._skull_projSize_backup = player.projectileSizeMultiplier;
      player.projectileSizeMultiplier *= BONE_BULLET_SIZE_MULTIPLIER; // Make bullets smaller
      player._dodge_override = function() {
        createSkullNova();
      };
    }

    function resetSkullFromPlayer() {
      if (!player) return;
      player._isSkull = false;
      player.size = 35; // Reset to normal size
      if (sprites._backup_bullet) {
        sprites.bullet = sprites._backup_bullet;
      }
      if (player._skull_speed_backup) {
        player.speed = player._skull_speed_backup;
        delete player._skull_speed_backup;
      }
      if (player._skull_damage_backup) {
        player.damageMultiplier = player._skull_damage_backup;
        delete player._skull_damage_backup;
      }
      if (player._skull_projSize_backup) {
        player.projectileSizeMultiplier = player._skull_projSize_backup;
        delete player._skull_projSize_backup;
      }
      if (player._dodge_override) delete player._dodge_override;
    }

    // --- PATCH CORE GAME FUNCTIONS ---
    (function patchBuyUnlockable() {
      if (typeof buyUnlockable !== 'function') {
        setTimeout(patchBuyUnlockable, 100);
        return;
      }
      const orig = buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        const ret = orig.call(this, key, ...rest);
        if (key === SKULL_ID) {
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
        }
        return ret;
      };
    })();

    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) {
        setTimeout(hookCharacterTiles, 100);
        return;
      }
      container.addEventListener('click', (ev) => {
        const tile = ev.target.closest('.character-tile');
        if (!tile || tile.classList.contains('locked')) return;
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
              applySkullToPlayer();
            } else {
              resetSkullFromPlayer();
            }
          } catch (e) {
            console.error(e);
          }
        }, 10);
      });
    })();

    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {}

    // Patch the draw function to render bones instead of bullets
    (function patchDraw() {
      if (typeof draw !== 'function') {
        setTimeout(patchDraw, 100);
        return;
      }
      const origDraw = window.draw;

      window.draw = function(...args) {
        if (!player || !player._isSkull) {
          origDraw.apply(this, args);
          return;
        }

        // Hide projectiles and player temporarily
        const activeWeapons = weaponPool.filter(w => w.active);
        activeWeapons.forEach(w => w.active = false);
        player._hideSprite = true;

        origDraw.apply(this, args);
        
        activeWeapons.forEach(w => w.active = true);
        player._hideSprite = false;

        // Draw skull emoji
        try {
            const pre = preRenderedEntities && preRenderedEntities[SKULL_EMOJI];
            if (pre && typeof ctx !== 'undefined') {
                ctx.save();
                ctx.translate(-cameraOffsetX, -cameraOffsetY);
                const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase) * BOB_AMPLITUDE;
                ctx.drawImage(pre, player.x - pre.width / 2, player.y - pre.height / 2 + bobOffset);
                ctx.restore();
            }
        } catch (e) { console.error('[SkullPlugin] player draw error', e); }

        // Draw spinning bone projectiles
        const boneCanvas = preRenderedEntities[BONE_EMOJI];
        if (boneCanvas) {
            ctx.save();
            ctx.translate(-cameraOffsetX, -cameraOffsetY);
            for (const proj of activeWeapons) {
                proj.spinAngle = (proj.spinAngle || 0) + BONE_SPIN_SPEED;
                ctx.save();
                ctx.translate(proj.x, proj.y);
                ctx.rotate(proj.spinAngle);
                // Use the actual weapon size (which is now reduced)
                ctx.drawImage(boneCanvas, -proj.size / 2, -proj.size / 2, proj.size, proj.size);
                ctx.restore();
            }
            ctx.restore();
        }
      };
    })();

    function createSkullNova() {
      try {
        if (!window.weaponPool) return;
        if (Array.isArray(window.vengeanceNovas)) {
          vengeanceNovas.push({
            x: player.x,
            y: player.y,
            startTime: Date.now(),
            duration: 500,
            maxRadius: 120
          });
        }
        for (let i = 0; i < NOVA_COUNT; i++) {
          const angle = (i / NOVA_COUNT) * Math.PI * 2;
          for (const w of weaponPool) {
            if (!w.active) {
              w.x = player.x;
              w.y = player.y;
              w.size = NOVA_SIZE;
              w.speed = NOVA_SPEED * (player.projectileSpeedMultiplier || 1);
              w.angle = angle;
              w.dx = Math.cos(angle) * w.speed;
              w.dy = Math.sin(angle) * w.speed;
              w.lifetime = Date.now() + NOVA_LIFE;
              w.hitsLeft = 1;
              w.hitEnemies = w.hitEnemies || [];
              w.hitEnemies.length = 0;
              w.active = true;
              break;
            }
          }
        }
        if (typeof playSound === 'function') playSound('dodge');
      } catch (e) {
        console.error(e);
      }
    }

    (function patchTriggerDash() {
      if (typeof triggerDash !== 'function') {
        setTimeout(patchTriggerDash, 100);
        return;
      }
      const orig = triggerDash;
      window.triggerDash = function(entity, ...rest) {
        const r = orig.apply(this, [entity, ...rest]);
        try {
          if (entity === player && player._isSkull) {
            createSkullNova();
          }
        } catch (e) {
          console.error(e);
        }
        return r;
      };
    })();

    setInterval(() => {
      try {
        const bought = !!(playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]);
        const slayer = !!(ACHIEVEMENTS.slayer && ACHIEVEMENTS.slayer.unlocked);
        if (ACHIEVEMENTS[SKULL_ACH_ID]) {
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = !!(bought || slayer || ACHIEVEMENTS[SKULL_ACH_ID].unlocked);
        }
      } catch (e) {}
    }, 1000);

    log('Skull plugin (Final Version) is ready.');
  }
})();
