// skullCharacter.js
// Plugin to implement the 'Skull' character with unique abilities.
// Features:
// 1. V-Shape Shot: Fires two bone projectiles instead of one.
// 2. Damage Override: All bone projectiles deal a fixed 0.5 damage.
// 3. Dodge Nova: Dashing emits a 6-bone projectile nova.
// 4. Custom Graphics: Replaces player and projectiles with skull/bone emojis.

(function() {
  'use strict';

  // Helper to wait for the main game script to load its variables.
  function waitFor(cond, cb, timeout = 8000, interval = 40) {
    const start = Date.now();
    const t = setInterval(() => {
      try {
        if (cond()) {
          clearInterval(t);
          cb();
        } else if (Date.now() - start > timeout) {
          clearInterval(t);
          console.error('[SkullPlugin] Timed out waiting for game variables.');
        }
      } catch (e) {
        clearInterval(t);
        console.error('[SkullPlugin] Error in waitFor:', e);
      }
    }, interval);
  }

  // Consistent logging for the plugin.
  function log(...s) {
    console.log('[SkullPlugin]', ...s);
  }

  // Wait for all necessary game objects to be defined before initializing.
  waitFor(() => (
    typeof CHARACTERS !== 'undefined' &&
    typeof UNLOCKABLE_PICKUPS !== 'undefined' &&
    typeof ACHIEVEMENTS !== 'undefined' &&
    typeof playerData !== 'undefined' &&
    typeof player !== 'undefined' &&
    typeof weaponPool !== 'undefined' &&
    typeof preRenderEmoji !== 'undefined' &&
    typeof preRenderedEntities !== 'undefined' &&
    typeof draw !== 'undefined' &&
    typeof triggerDash !== 'undefined' &&
    typeof startGame !== 'undefined'
  ), init);

  function init() {
    log('Initializing skull character plugin...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';

    const BONE_SPIN_SPEED = 0.25;
    const BONE_RENDER_SIZE = 12;
    const SKULL_RENDER_SIZE = 28;
    
    const NOVA_COUNT = 6;
    const NOVA_SPEED = 6.0;
    const NOVA_SIZE = 12;
    const NOVA_LIFETIME = 1000;

    // --- 1. DEFINE CHARACTER & UNLOCKS ---
    
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {};
    }
    Object.assign(CHARACTERS[SKULL_ID], {
      id: SKULL_ID,
      name: 'Skull',
      emoji: SKULL_EMOJI,
      perk: 'V-spread bones (0.5x dmg), 6-bone dash nova.',
      unlockCondition: { type: 'achievement', id: SKULL_ACH_ID }
    });

    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
      UNLOCKABLE_PICKUPS[SKULL_ID] = {
        name: 'Skull Character',
        desc: 'V-spread bones (0.5x dmg), dash shoots 6 bones',
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
    
    try {
      preRenderEmoji(BONE_EMOJI, BONE_RENDER_SIZE);
      preRenderEmoji(SKULL_EMOJI, SKULL_RENDER_SIZE);
    } catch (e) {
      log('Pre-rendering failed, will fall back to text rendering.', e);
    }

    // --- 2. CORE SKULL LOGIC ---

    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      
      if (player._skull_damage_backup === undefined) player._skull_damage_backup = player.damageMultiplier;
      if (player._skull_vshape_backup === undefined) player._skull_vshape_backup = window.vShapeProjectileLevel || 0;
      
      // FIX: Override damage and V-shape level.
      player.damageMultiplier = 0.5;
      window.vShapeProjectileLevel = 1;
      
      log('Skull stats applied: damage overridden to 0.5, V-spread forced to level 1.');
    }

    function resetSkullFromPlayer() {
      if (!player) return;
      player._isSkull = false;
      
      if (player._skull_damage_backup !== undefined) {
        player.damageMultiplier = player._skull_damage_backup;
        delete player._skull_damage_backup;
      }
      
      if (player._skull_vshape_backup !== undefined) {
        if (typeof window.vShapeProjectileLevel !== 'undefined') {
          window.vShapeProjectileLevel = player._skull_vshape_backup;
        }
        delete player._skull_vshape_backup;
      }
      
      log('Skull stats removed, original values restored.');
    }

    function createSkullNova() {
      if (!player._isSkull) return;
      log('Firing skull bone nova!');
      
      if (Array.isArray(window.vengeanceNovas)) {
        vengeanceNovas.push({ x: player.x, y: player.y, startTime: Date.now(), duration: 300, maxRadius: 80 });
      }
      
      for (let i = 0; i < NOVA_COUNT; i++) {
        const angle = (i / NOVA_COUNT) * Math.PI * 2;
        const weapon = weaponPool.find(w => !w.active);
        if (weapon) {
          const speed = NOVA_SPEED * (player.projectileSpeedMultiplier || 1);
          Object.assign(weapon, {
            active: true, x: player.x, y: player.y, size: NOVA_SIZE, speed: speed, angle: angle,
            dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed,
            lifetime: Date.now() + NOVA_LIFETIME, hitsLeft: 1, hitEnemies: [],
            isBone: true, spinAngle: Math.random() * Math.PI * 2
          });
        }
      }
    }

    // --- 3. PATCHING GAME FUNCTIONS ---

    // FIX: Patch startGame to re-apply Skull stats after the game resets them.
    (function patchStartGame() {
        const origStartGame = window.startGame;
        window.startGame = function(...args) {
            origStartGame.apply(this, args);
            // After original start game, if skull is equipped, re-apply our specific stats.
            if (player && equippedCharacterID === SKULL_ID) {
                applySkullToPlayer();
            }
        };
        log('startGame() patched to re-apply Skull stats.');
    })();

    (function patchTriggerDash() {
      const origDash = window.triggerDash;
      window.triggerDash = function(entity, ...rest) {
        const isPlayerAndCanDash = (entity === player && !entity.isDashing && (Date.now() - entity.lastDashTime >= entity.dashCooldown));
        origDash.apply(this, [entity, ...rest]);
        if (isPlayerAndCanDash && player._isSkull) {
          createSkullNova();
        }
      };
      log('triggerDash() has been patched for skull nova.');
    })();
    
    // FIX: Major rewrite of patchDraw to prevent the original player sprite from rendering.
    (function patchDraw() {
      const origDraw = window.draw;
      
      // A blank 1x1 image to act as a placeholder.
      const blankImage = new Image();
      blankImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

      window.draw = function(...args) {
        if (!player || !player._isSkull) {
          origDraw.apply(this, args);
          return;
        }

        // --- SKULL DRAWING LOGIC ---

        // Store original sprites that we are about to hide.
        const originalSprites = {
            playerUp: sprites.playerUp, playerDown: sprites.playerDown,
            playerLeft: sprites.playerLeft, playerRight: sprites.playerRight,
            gun: sprites.gun
        };
        const activeWeapons = weaponPool.filter(w => w.active);
        activeWeapons.forEach(w => w.active = false); // Hide default bullets

        // Replace player/gun sprites with a blank image.
        sprites.playerUp = sprites.playerDown = sprites.playerLeft = sprites.playerRight = blankImage;
        sprites.gun = blankImage;

        // Call the original draw function. It will now draw everything EXCEPT the player, gun, and bullets.
        origDraw.apply(this, args);

        // Restore the original sprites for the next frame.
        Object.assign(sprites, originalSprites);
        activeWeapons.forEach(w => w.active = true); // Unhide weapons for our custom drawing.

        // --- CUSTOM SKULL AND BONE RENDERING ---
        const now = Date.now();
        let currentHitShakeX = 0, currentHitShakeY = 0;
        if (window.isPlayerHitShaking) {
          const elapsedTime = now - (window.playerHitShakeStartTime || 0);
          const duration = window.PLAYER_HIT_SHAKE_DURATION || 300;
          if (elapsedTime < duration) {
            const intensity = (window.MAX_PLAYER_HIT_SHAKE_OFFSET || 5) * (1 - (elapsedTime / duration));
            currentHitShakeX = (Math.random() - 0.5) * 2 * intensity;
            currentHitShakeY = (Math.random() - 0.5) * 2 * intensity;
          }
        }
        
        // Use the game's global camera variables to ensure perfect alignment.
        let finalCameraOffsetX = (window.cameraOffsetX || 0) - currentHitShakeX;
        let finalCameraOffsetY = (window.cameraOffsetY || 0) - currentHitShakeY;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(window.cameraZoom || 1, window.cameraZoom || 1);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);

        // Draw the Skull player.
        try {
            const pre = preRenderedEntities[SKULL_EMOJI];
            const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase || 0) * (window.BOB_AMPLITUDE || 2.5);
            if (pre) {
                ctx.drawImage(pre, player.x - pre.width / 2, player.y - pre.height / 2 + bobOffset);
            }
        } catch (e) { log('Skull player draw error', e); }

        // Draw active projectiles as spinning bones.
        const boneCanvas = preRenderedEntities[BONE_EMOJI];
        if (boneCanvas) {
            for (const proj of activeWeapons) {
                proj.spinAngle = (proj.spinAngle || 0) + BONE_SPIN_SPEED;
                ctx.save();
                ctx.translate(proj.x, proj.y);
                ctx.rotate(proj.spinAngle);
                ctx.drawImage(boneCanvas, -boneCanvas.width / 2, -boneCanvas.height / 2);
                ctx.restore();
            }
        }
        ctx.restore();
      };
      log('draw() has been patched with improved overlay logic.');
    })();

    // --- 4. HOOKS FOR CHARACTER SELECTION ---

    (function patchBuyUnlockable() {
      const orig = window.buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        orig.call(this, key, ...rest);
        if (key === SKULL_ID) {
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
        }
      };
    })();

    (function hookCharacterSelection() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) {
        setTimeout(hookCharacterSelection, 100); return;
      }
      container.addEventListener('click', () => {
        setTimeout(() => {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
            applySkullToPlayer();
          } else {
            resetSkullFromPlayer();
          }
        }, 50);
      });
    })();
    
    // On script load, check if the skull is already equipped.
    if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
      applySkullToPlayer();
    }
    
    log('Skull plugin loaded and ready!');
  }
})();

