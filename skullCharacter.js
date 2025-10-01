// skullCharacter.js - V-spread bones + 6-bone dash nova (FIXED v2)
(function() {
  'use strict';

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

  // Wait for all necessary game variables to be defined before initializing the plugin
  waitFor(() => (typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' && typeof ACHIEVEMENTS !== 'undefined' && typeof startGame !== 'undefined' && typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined' && typeof triggerDash !== 'undefined'), init, 8000);

  function init() {
    log('Initializing skull character plugin v2...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'slayer';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPIN_SPEED = 0.25;
    const NOVA_COUNT = 6;
    const NOVA_SPEED = 6.0;
    const NOVA_SIZE = 12;
    const NOVA_LIFE = 1500;
    
    const SKULL_RENDER_SIZE = 28;
    const BONE_RENDER_SIZE = 12;

    // Define or update the character in the main game's character list
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'The Skeleton',
        emoji: SKULL_EMOJI,
        perk: 'V-spread bones (0.5x dmg) + 6-bone dash nova.',
        unlockCondition: { type: 'achievement', id: SKULL_ACH_ID }
      };
    } else {
        CHARACTERS[SKULL_ID].name = 'The Skeleton';
        CHARACTERS[SKULL_ID].unlockCondition = { type: 'achievement', id: SKULL_ACH_ID };
        CHARACTERS[SKULL_ID].emoji = SKULL_EMOJI;
        CHARACTERS[SKULL_ID].perk = 'V-spread bones (0.5x dmg) + 6-bone dash nova.';
    }

    // Add the character as an unlockable item in the permanent upgrade shop
    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
        UNLOCKABLE_PICKUPS[SKULL_ID] = {
            name: 'The Skeleton',
            desc: 'Unlocks the Skeleton character.',
            cost: 500,
            icon: SKULL_EMOJI
        };
    }
    
    // Pre-render emojis for performance
    try {
      preRenderEmoji(BONE_EMOJI, BONE_RENDER_SIZE);
      preRenderEmoji(SKULL_EMOJI, SKULL_RENDER_SIZE);
    } catch (e) {}

    if (!sprites._backup_bullet && sprites.bullet) {
      sprites._backup_bullet = sprites.bullet;
    }

    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      if (player._skull_damage_backup === undefined) player._skull_damage_backup = player.damageMultiplier;
      if (player._skull_vshape_backup === undefined) player._skull_vshape_backup = window.vShapeProjectileLevel || 0;
      
      // Apply skull-specific modifiers
      player.damageMultiplier = player._skull_damage_backup * 0.5;
      if (typeof window.vShapeProjectileLevel !== 'undefined') {
        window.vShapeProjectileLevel = Math.max(1, player._skull_vshape_backup);
      }
      log('Skull stats applied: 0.5x damage, V-spread enabled.');
    }

    function resetSkullFromPlayer() {
      if (!player || !player._isSkull) return;
      player._isSkull = false;
      if (sprites._backup_bullet) sprites.bullet = sprites._backup_bullet;
      
      // Restore original stats
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
      log('Skull stats removed.');
    }

    // ================================================================================= //
    // ============================= START: THE NEW FIX ================================ //
    // ================================================================================= //
    // This function patches the main `startGame` function. It lets the original
    // function run first (which resets the player object), and then it immediately
    // re-applies our skull properties if the character is equipped. This is the
    // most reliable way to ensure the character works correctly at the start of a run.
    (function patchStartGame() {
        if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
        const orig_startGame = window.startGame;

        window.startGame = async function(...args) {
            // Run the original startGame function first.
            await orig_startGame.apply(this, args);

            // Now that the game is started and the player object is reset,
            // check if we need to apply our skull logic.
            try {
                if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
                    log('Game started with Skull. Re-applying custom stats...');
                    applySkullToPlayer();
                }
            } catch (e) {
                console.error('[SkullPlugin] Error in startGame patch:', e);
            }
        };
        log('startGame() patched to apply Skull stats after player reset.');
    })();
    // ================================================================================= //
    // ============================== END: THE NEW FIX ================================= //
    // ================================================================================= //
    
    // Patch the unlock function to also unlock the achievement if bought
    (function patchBuyUnlockable() {
      if (typeof buyUnlockable !== 'function') { setTimeout(patchBuyUnlockable, 100); return; }
      const orig = buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        if (key === SKULL_ID) { if (ACHIEVEMENTS[SKULL_ACH_ID]) ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true; }
        return orig.call(this, key, ...rest);
      };
    })();

    // Hook the character selection screen to apply/reset stats immediately
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', (ev) => {
        setTimeout(() => {
            try {
                if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
                    applySkullToPlayer();
                } else {
                    resetSkullFromPlayer();
                }
            } catch (e) {}
        }, 50);
      });
    })();
    
    // Initial check in case the character is already equipped on load
    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {}

    // Patch the drawing function to render the skull and bones instead of the player and bullets
    (function patchDraw() {
      if (typeof draw !== 'function') { setTimeout(patchDraw, 100); return; }
      const origDraw = window.draw;
      window.draw = function(...args) {
        if (!player || !player._isSkull || !gameActive) {
          origDraw.apply(this, args);
          return;
        }
        const activeWeapons = weaponPool.filter(w => w.active);
        const weaponStates = activeWeapons.map(w => ({ weapon: w, active: w.active }));
        activeWeapons.forEach(w => w.active = false);
        const originalPlayerPos = { x: player.x, y: player.y };
        player.x = -2000;
        player.y = -2000;
        origDraw.apply(this, args);
        player.x = originalPlayerPos.x;
        player.y = originalPlayerPos.y;
        weaponStates.forEach(state => state.weapon.active = state.active);
        const now = Date.now();
        let currentHitShakeX = 0, currentHitShakeY = 0;
        if (typeof isPlayerHitShaking !== 'undefined' && isPlayerHitShaking) {
            const elapsedTime = now - playerHitShakeStartTime;
            if (elapsedTime < PLAYER_HIT_SHAKE_DURATION) {
                const shakeIntensity = MAX_PLAYER_HIT_SHAKE_OFFSET * (1 - (elapsedTime / PLAYER_HIT_SHAKE_DURATION));
                currentHitShakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
                currentHitShakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
            }
        }
        let finalCameraOffsetX = cameraOffsetX - currentHitShakeX;
        let finalCameraOffsetY = cameraOffsetY - currentHitShakeY;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(cameraZoom, cameraZoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
        try {
            const pre = preRenderedEntities && preRenderedEntities[SKULL_EMOJI];
            if (pre) {
                const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase) * BOB_AMPLITUDE;
                ctx.save();
                ctx.translate(player.x, player.y + bobOffset);
                if (player.isDashing && player.spinStartTime) {
                    const spinProgress = (Date.now() - player.spinStartTime) / 500;
                    ctx.rotate(spinProgress * 2.1 * Math.PI * player.spinDirection);
                }
                ctx.drawImage(pre, -SKULL_RENDER_SIZE / 2, -SKULL_RENDER_SIZE / 2, SKULL_RENDER_SIZE, SKULL_RENDER_SIZE);
                ctx.restore();
            }
        } catch (e) { console.error('[SkullPlugin] skull draw error', e); }
        const boneCanvas = preRenderedEntities[BONE_EMOJI];
        if (boneCanvas) {
            for (const proj of activeWeapons) {
                proj.spinAngle = (proj.spinAngle || 0) + BONE_SPIN_SPEED;
                ctx.save();
                ctx.translate(proj.x, proj.y);
                ctx.rotate(proj.spinAngle);
                ctx.drawImage(boneCanvas, -BONE_RENDER_SIZE / 2, -BONE_RENDER_SIZE / 2, BONE_RENDER_SIZE, BONE_RENDER_SIZE);
                ctx.restore();
            }
        }
        ctx.restore();
      };
    })();

    function createSkullNova() {
      try {
        log('Creating skull nova...');
        if (!window.weaponPool || !window.player) {
          log('Nova failed: weaponPool or player not found.');
          return;
        }
        let bonesCreated = 0;
        for (let i = 0; i < NOVA_COUNT; i++) {
          const angle = (i / NOVA_COUNT) * Math.PI * 2;
          const weapon = weaponPool.find(w => !w.active);
          if (weapon) {
              weapon.x = player.x;
              weapon.y = player.y;
              weapon.size = NOVA_SIZE * player.projectileSizeMultiplier;
              weapon.speed = NOVA_SPEED * player.projectileSpeedMultiplier;
              weapon.angle = angle;
              weapon.dx = Math.cos(angle) * weapon.speed;
              weapon.dy = Math.sin(angle) * weapon.speed;
              weapon.lifetime = Date.now() + NOVA_LIFE;
              weapon.hitsLeft = 1;
              weapon.hitEnemies = weapon.hitEnemies || [];
              weapon.hitEnemies.length = 0;
              weapon.active = true;
              weapon.spinAngle = angle;
              bonesCreated++;
          }
        }
        if (bonesCreated > 0) {
          log(`✓ Created ${bonesCreated}/${NOVA_COUNT} nova bones.`);
          if (typeof playSound === 'function') playSound('playerShoot');
        } else {
          log('✗ No inactive weapons available for nova.');
        }
      } catch (e) {
        console.error('[SkullPlugin] Nova creation error:', e);
      }
    }

    // Patch the main game's triggerDash function to add our nova effect
    (function patchTriggerDash() {
      if (typeof triggerDash !== 'function') {
        setTimeout(patchTriggerDash, 100);
        return;
      }

      const orig_triggerDash = window.triggerDash;
      
      window.triggerDash = function(entity, ...rest) {
        // First, check if a dash is even possible for the entity.
        // This prevents the nova from firing on a failed (cooldown) dash attempt.
        const now = Date.now();
        if (!entity || entity.isDashing || now - entity.lastDashTime < entity.dashCooldown) {
            return; // Dash is on cooldown or entity is already dashing, do nothing.
        }

        // Call the original dash function to perform the dash movement and effects
        const result = orig_triggerDash.call(this, entity, ...rest);
        
        // If the dash was for the main player AND they're the skull character, fire the nova
        if (entity === player && player._isSkull) {
          log('Dash triggered for skull character - firing nova!');
          createSkullNova();
        }
        
        return result;
      };
      
      log('triggerDash() successfully patched for Skull Nova.');
    })();

    log('Skull plugin ready - All features enabled!');
  }
})();
