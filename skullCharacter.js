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
    typeof triggerDash !== 'undefined'
  ), init);

  function init() {
    log('Initializing skull character plugin...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked'; // Achievement that unlocks the character.
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';

    // Config for bone projectiles
    const BONE_SPIN_SPEED = 0.25;
    const BONE_RENDER_SIZE = 12;
    const SKULL_RENDER_SIZE = 28;
    
    // Config for the dash nova attack
    const NOVA_COUNT = 6;
    const NOVA_SPEED = 6.0;
    const NOVA_SIZE = 12;
    const NOVA_LIFETIME = 1000; // 1 second lifetime

    // --- 1. DEFINE CHARACTER & UNLOCKS ---
    
    // Ensure the Skull character is defined in the game's character list.
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {};
    }
    Object.assign(CHARACTERS[SKULL_ID], {
      id: SKULL_ID,
      name: 'Skull',
      emoji: SKULL_EMOJI,
      perk: 'V-spread bones (0.5x dmg), 6-bone dash nova.', // Updated perk description
      unlockCondition: {
        type: 'achievement',
        id: SKULL_ACH_ID
      }
    });

    // Define the unlockable item in the permanent upgrade shop.
    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
      UNLOCKABLE_PICKUPS[SKULL_ID] = {
        name: 'Skull Character',
        desc: 'V-spread bones (0.5x dmg), dash shoots 6 bones',
        cost: 1000,
        icon: SKULL_EMOJI
      };
    }

    // Define the achievement that unlocks the Skull.
    if (!ACHIEVEMENTS[SKULL_ACH_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID] = {
        name: 'Skull Unlocked',
        desc: 'Unlocks the Skull character',
        icon: SKULL_EMOJI,
        unlocked: false
      };
    }
    
    // Sync unlock status from saved player data.
    if (playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
    }
    
    // Pre-render emojis for performance.
    try {
      preRenderEmoji(BONE_EMOJI, BONE_RENDER_SIZE);
      preRenderEmoji(SKULL_EMOJI, SKULL_RENDER_SIZE);
    } catch (e) {
      log('Pre-rendering failed, will fall back to text rendering.', e);
    }

    // --- 2. CORE SKULL LOGIC ---

    /**
     * Applies the Skull character's unique stats and abilities to the player.
     * This is called when the character is selected.
     */
    function applySkullToPlayer() {
      if (!player || player._isSkull) return;
      player._isSkull = true;
      
      // Backup original stats before overriding them.
      if (player._skull_damage_backup === undefined) {
        player._skull_damage_backup = player.damageMultiplier;
      }
      if (player._skull_vshape_backup === undefined) {
        player._skull_vshape_backup = window.vShapeProjectileLevel || 0;
      }
      
      // FIX: Override damage to a fixed 0.5, as per requirements.
      player.damageMultiplier = 0.5;
      
      // FIX: Force a 2-shot V-spread by setting the level to 1.
      // The main script creates (vShapeProjectileLevel + 1) projectiles.
      if (typeof window.vShapeProjectileLevel !== 'undefined') {
        window.vShapeProjectileLevel = 1;
      }
      
      log('Skull stats applied: damage overridden to 0.5, V-spread forced to level 1.');
    }

    /**
     * Removes Skull-specific stats and restores the player's original stats.
     * This is called when switching to a different character.
     */
    function resetSkullFromPlayer() {
      if (!player || !player._isSkull) return;
      player._isSkull = false;
      
      // Restore backed-up stats.
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

    /**
     * Creates the 6-projectile nova attack when the Skull character dashes.
     */
    function createSkullNova() {
      if (!player._isSkull) return;

      log('Firing skull bone nova!');
      
      // Create a visual ring effect for the nova.
      if (Array.isArray(window.vengeanceNovas)) {
        vengeanceNovas.push({
          x: player.x, y: player.y,
          startTime: Date.now(),
          duration: 300,
          maxRadius: 80
        });
      }
      
      let bonesCreated = 0;
      for (let i = 0; i < NOVA_COUNT; i++) {
        const angle = (i / NOVA_COUNT) * Math.PI * 2;
        
        // Find an inactive weapon in the pool to use.
        const weapon = weaponPool.find(w => !w.active);
        if (weapon) {
          Object.assign(weapon, {
            active: true,
            x: player.x,
            y: player.y,
            size: NOVA_SIZE,
            speed: NOVA_SPEED * (player.projectileSpeedMultiplier || 1),
            angle: angle,
            dx: Math.cos(angle) * (NOVA_SPEED * (player.projectileSpeedMultiplier || 1)),
            dy: Math.sin(angle) * (NOVA_SPEED * (player.projectileSpeedMultiplier || 1)),
            lifetime: Date.now() + NOVA_LIFETIME,
            hitsLeft: 1,
            hitEnemies: [], // Reset hit enemies list
            isBone: true, // Custom flag for rendering
            spinAngle: Math.random() * Math.PI * 2 // Initial random spin
          });
          bonesCreated++;
        }
      }
      
      if (bonesCreated < NOVA_COUNT) {
        log(`Could not create all nova bones. Pool might be full. Created: ${bonesCreated}`);
      }
    }

    // --- 3. PATCHING GAME FUNCTIONS ---

    // Patch the global triggerDash function to add the nova effect.
    (function patchTriggerDash() {
      const origDash = window.triggerDash;
      window.triggerDash = function(entity, ...rest) {
        const isPlayerAndCanDash = (entity === player && !entity.isDashing && (Date.now() - entity.lastDashTime >= entity.dashCooldown));
        
        // Call the original dash function first.
        origDash.apply(this, [entity, ...rest]);
        
        // If it was the player and the dash was successful, fire the nova.
        if (isPlayerAndCanDash && player._isSkull) {
          createSkullNova();
        }
      };
      log('triggerDash() has been patched for skull nova.');
    })();
    
    // Patch the draw function to render bones instead of bullets.
    (function patchDraw() {
      const origDraw = window.draw;
      window.draw = function(...args) {
        if (!player || !player._isSkull) {
          origDraw.apply(this, args);
          return;
        }

        // HACK: To prevent the original draw function from rendering default bullets
        // for the skull, we temporarily deactivate the weapon objects, draw the scene,
        // then reactivate them to draw our custom bones.
        const activeWeapons = weaponPool.filter(w => w.active);
        activeWeapons.forEach(w => w.active = false);

        // Call original draw function (will skip drawing our weapons).
        origDraw.apply(this, args);
        
        // Restore active state.
        activeWeapons.forEach(w => w.active = true);

        // --- Now, draw our custom assets ---
        const now = Date.now();
        
        // This logic is copied from the main game loop to ensure the camera position is correct.
        let currentHitShakeX = 0, currentHitShakeY = 0;
        if (typeof isPlayerHitShaking !== 'undefined' && isPlayerHitShaking) {
          const elapsedTime = now - (window.playerHitShakeStartTime || 0);
          const duration = window.PLAYER_HIT_SHAKE_DURATION || 300;
          if (elapsedTime < duration) {
            const intensity = (window.MAX_PLAYER_HIT_SHAKE_OFFSET || 5) * (1 - (elapsedTime / duration));
            currentHitShakeX = (Math.random() - 0.5) * 2 * intensity;
            currentHitShakeY = (Math.random() - 0.5) * 2 * intensity;
          }
        }
        let finalCameraOffsetX = (window.cameraOffsetX || 0) - currentHitShakeX;
        let finalCameraOffsetY = (window.cameraOffsetY || 0) - currentHitShakeY;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(window.cameraZoom || 1, window.cameraZoom || 1);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);

        // Draw the player as a skull emoji.
        try {
            const pre = preRenderedEntities[SKULL_EMOJI];
            const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase || 0) * (window.BOB_AMPLITUDE || 2.5);
            if (pre) {
                ctx.drawImage(pre, player.x - pre.width / 2, player.y - pre.height / 2 + bobOffset);
            } else {
                ctx.font = `${SKULL_RENDER_SIZE}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(SKULL_EMOJI, player.x, player.y + bobOffset);
            }
        } catch (e) { log('Skull player draw error', e); }

        // Draw all active weapons as spinning bones.
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
      log('draw() has been patched for custom skull/bone rendering.');
    })();

    // --- 4. HOOKS FOR CHARACTER SELECTION ---

    // When an unlockable is bought, check if it's the skull and update achievement.
    (function patchBuyUnlockable() {
      const orig = window.buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        orig.call(this, key, ...rest);
        if (key === SKULL_ID) {
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
          log('Skull character purchased, achievement unlocked.');
        }
      };
    })();

    // When a character is selected from the menu, apply or reset skull stats.
    (function hookCharacterSelection() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) {
        setTimeout(hookCharacterSelection, 100);
        return;
      }
      container.addEventListener('click', (ev) => {
        // Wait a moment for the global `equippedCharacterID` to update.
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
              applySkullToPlayer();
            } else {
              resetSkullFromPlayer();
            }
          } catch (e) {
            console.error('[SkullPlugin] Error on character selection:', e);
          }
        }, 50);
      });
    })();
    
    // On script load, check if the skull is already equipped and apply stats.
    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {
      log('Initial character check failed.', e);
    }
    
    log('Skull plugin loaded and ready!');
  }
})();
