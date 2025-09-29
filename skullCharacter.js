// skullCharacter.js (fixed by Gemini - Spinning Projectile Version)
// This version makes the 🦴 projectiles spin as they travel.
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
  waitFor(() => (typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' && typeof ACHIEVEMENTS !== 'undefined' && typeof playerData !== 'undefined' && typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined'), init, 8000);

  function init() {
    log('Initializing skull character plugin (Spinning Projectile Version)...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPIN_SPEED = 0.25; // Controls how fast the bone spins. Adjust if needed.
    const NOVA_COUNT = 16,
      NOVA_SPEED = 6.0,
      NOVA_SIZE = 20,
      NOVA_LIFE = 1000;

    // --- SETUP CHARACTER, UNLOCKS, AND ACHIEVEMENTS (No changes here) ---
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
      log('Added CHARACTERS.skull');
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
      log('Added UNLOCKABLE_PICKUPS.skull');
    }

    if (!ACHIEVEMENTS[SKULL_ACH_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID] = {
        name: 'Skull Unlocked',
        desc: 'Unlocks the Skull character',
        icon: SKULL_EMOJI,
        unlocked: false
      };
      log('Created faux achievement for skull unlock.');
    }

    if (playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
    }

    try {
      preRenderEmoji(BONE_EMOJI, 16);
      log('Pre-rendered bone emoji for projectiles.');
    } catch (e) {
      log('Could not pre-render bone emoji.');
    }

    if (!sprites._backup_bullet && sprites.bullet) {
      sprites._backup_bullet = sprites.bullet;
    }

    // --- HELPER FUNCTIONS (No changes here) ---
    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      if (!player._skull_speed_backup) player._skull_speed_backup = player.speed;
      player.speed = player.originalPlayerSpeed * 0.95;
      if (!player._skull_damage_backup) player._skull_damage_backup = player.damageMultiplier;
      player.damageMultiplier = 1.25;
      player._dodge_override = function() {
        createSkullNova();
      };
    }

    function resetSkullFromPlayer() {
      if (!player) return;
      player._isSkull = false;
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
      if (player._dodge_override) delete player._dodge_override;
    }

    // --- PATCH CORE GAME FUNCTIONS ---
    (function patchBuyUnlockable() {
      if (typeof buyUnlockable !== 'function') {
        waitFor(patchBuyUnlockable, 8000);
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
      log('Patched buyUnlockable.');
    })();

    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) {
        waitFor(() => !!document.getElementById('characterTilesContainer'), hookCharacterTiles, 8000);
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
      log('Character tile click hook installed.');
    })();

    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {}


    // ⭐⭐⭐ THE MAIN FIX IS HERE ⭐⭐⭐
    // We patch the main 'draw' function to hijack projectile drawing for the Skull character.
    (function patchDraw() {
      if (typeof draw !== 'function') {
        waitFor(patchDraw, 8000);
        return;
      }
      const origDraw = window.draw;

      window.draw = function(...args) {
        // If it's not the skull character, just run the original game's draw function and stop.
        if (!player || !player._isSkull) {
          // Ensure the original bullet sprite is restored if we switch characters mid-game
          if (sprites._backup_bullet) {
             sprites.bullet = sprites._backup_bullet;
          }
          origDraw.apply(this, args);
          return;
        }

        // --- SKULL CHARACTER IS ACTIVE ---
        
        // 1. Find all active projectiles and temporarily hide them from the original draw function.
        const activeWeapons = weaponPool.filter(w => w.active);
        activeWeapons.forEach(w => w.active = false);

        // 2. Call the original draw function. It will now draw everything EXCEPT the projectiles.
        origDraw.apply(this, args);
        
        // 3. Re-activate the projectiles so the game's logic can still update them.
        activeWeapons.forEach(w => w.active = true);

        // 4. Manually draw the projectiles ourselves with the spinning effect.
        const boneCanvas = preRenderedEntities[BONE_EMOJI];
        if (boneCanvas) {
            ctx.save();
            // Apply the same camera offset the main game uses so projectiles are in the right place.
            ctx.translate(-cameraOffsetX, -cameraOffsetY);
            
            for (const proj of activeWeapons) {
                // Initialize or increment the spin angle for each projectile.
                proj.spinAngle = (proj.spinAngle || 0) + BONE_SPIN_SPEED;

                ctx.save();
                ctx.translate(proj.x, proj.y);
                ctx.rotate(proj.spinAngle); // Apply the spin rotation!
                
                // Draw the bone emoji canvas, centered at the projectile's location.
                ctx.drawImage(boneCanvas, -proj.size / 2, -proj.size / 2, proj.size, proj.size);

                ctx.restore();
            }
            ctx.restore();
        }

        // 5. Draw the skull emoji over the (hidden) player, same as before.
        try {
          const pre = preRenderedEntities && preRenderedEntities[SKULL_EMOJI];
          if (pre && typeof ctx !== 'undefined') {
            ctx.save();
            ctx.translate(-cameraOffsetX, -cameraOffsetY);
            ctx.drawImage(pre, player.x - pre.width / 2, player.y - pre.height / 2);
            ctx.restore();
          }
        } catch (e) {
          console.error('[SkullPlugin] Overlay draw error', e);
        }
      };
      log('Patched draw function for spinning skull projectiles.');
    })();

    // No changes needed below this line
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
        waitFor(patchTriggerDash, 8000);
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
      log('Patched triggerDash for skull nova.');
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

    log('Skull plugin (Spinning Version) is ready.');
  }
})();
