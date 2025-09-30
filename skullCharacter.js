// skullCharacter.js - V-spread bones + 6-bone dash nova
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

  waitFor(() => (typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' && typeof ACHIEVEMENTS !== 'undefined' && typeof playerData !== 'undefined' && typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined' && typeof triggerDash !== 'undefined'), init, 8000);

  function init() {
    log('Initializing skull character plugin...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'slayer'; // Changed to match the achievement in script.js
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPIN_SPEED = 0.25;
    const NOVA_COUNT = 6;
    const NOVA_SPEED = 6.0;
    const NOVA_SIZE = 12;
    const NOVA_LIFE = 1500; // Bone lifetime in ms
    
    const SKULL_RENDER_SIZE = 28;
    const BONE_RENDER_SIZE = 12;

    // --- CHARACTER DEFINITION (No changes needed here) ---
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'The Skeleton',
        emoji: SKULL_EMOJI,
        perk: 'V-spread bones (0.5x dmg) + 6-bone dash nova.',
        unlockCondition: {
          type: 'achievement',
          id: SKULL_ACH_ID
        }
      };
    } else {
        CHARACTERS[SKULL_ID].name = 'The Skeleton';
        CHARACTERS[SKULL_ID].unlockCondition = { type: 'achievement', id: SKULL_ACH_ID };
        CHARACTERS[SKULL_ID].emoji = SKULL_EMOJI;
        CHARACTERS[SKULL_ID].perk = 'V-spread bones (0.5x dmg) + 6-bone dash nova.';
    }

    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
        UNLOCKABLE_PICKUPS[SKULL_ID] = {
            name: 'The Skeleton',
            desc: 'Unlocks the Skeleton character.',
            cost: 1000,
            icon: SKULL_EMOJI
        };
    }
    
    // --- PRE-RENDERING AND SPRITE BACKUP (No changes needed here) ---
    try {
      preRenderEmoji(BONE_EMOJI, BONE_RENDER_SIZE);
      preRenderEmoji(SKULL_EMOJI, SKULL_RENDER_SIZE);
    } catch (e) {}

    if (!sprites._backup_bullet && sprites.bullet) {
      sprites._backup_bullet = sprites.bullet;
    }

    // --- STAT MODIFICATION FUNCTIONS (Updated for clarity and correctness) ---
    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      
      // Backup original stats before modifying them
      if (player._skull_damage_backup === undefined) player._skull_damage_backup = player.damageMultiplier;
      if (player._skull_vshape_backup === undefined) player._skull_vshape_backup = window.vShapeProjectileLevel || 0;
      
      // CHANGE 1: APPLY HALF DAMAGE
      // This correctly halves the player's current damage multiplier.
      player.damageMultiplier = player._skull_damage_backup * 0.5;
      
      // CHANGE 2: APPLY V-SHAPE SHOT
      // This forces the game to shoot at least 2 projectiles (vShapeProjectileLevel = 1).
      // If the player already has V-shape upgrades, it respects the higher level.
      if (typeof window.vShapeProjectileLevel !== 'undefined') {
        window.vShapeProjectileLevel = Math.max(1, player._skull_vshape_backup);
      }
      
      log('Skull stats applied: 0.5x damage, V-spread enabled, 6-bone dash nova.');
    }

    function resetSkullFromPlayer() {
      if (!player || !player._isSkull) return; // Prevent this from running on other characters
      player._isSkull = false;
      
      // Restore original sprite
      if (sprites._backup_bullet) {
        sprites.bullet = sprites._backup_bullet;
      }
      
      // Restore original stats from backup
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

    // --- UI AND UNLOCK LOGIC (No changes needed here) ---
    (function patchBuyUnlockable() {
      if (typeof buyUnlockable !== 'function') { setTimeout(patchBuyUnlockable, 100); return; }
      const orig = buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        if (key === SKULL_ID) { if (ACHIEVEMENTS[SKULL_ACH_ID]) ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true; }
        return orig.call(this, key, ...rest);
      };
    })();

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
    
    // Auto-apply stats on script load if skull is already selected
    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {}

    // --- DRAWING LOGIC (No changes needed here) ---
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
        origDraw.apply(this, args);
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

    // --- DODGE NOVA LOGIC (Updated and Fixed) ---
    function createSkullNova() {
      try {
        if (!window.weaponPool || !window.player) return;
        
        let bonesCreated = 0;
        for (let i = 0; i < NOVA_COUNT; i++) {
          const angle = (i / NOVA_COUNT) * Math.PI * 2;
          const weapon = weaponPool.find(w => !w.active); // Find an available projectile from the pool

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
              weapon.spinAngle = angle; // For the custom draw function
              bonesCreated++;
          }
        }
        
        log(`Created ${bonesCreated}/${NOVA_COUNT} nova bones.`);
        if (typeof playSound === 'function') playSound('playerShoot');
        
      } catch (e) {
        console.error('[SkullPlugin] Nova creation error:', e);
      }
    }

    // CHANGE 3: PATCH THE DASH FUNCTION
    // This function wraps the original triggerDash. When a dash is successful,
    // it checks if the character is the skull and then fires the nova.
    (function patchTriggerDash() {
      const orig_triggerDash = window.triggerDash;
      window.triggerDash = function(entity, ...rest) {
        const now = Date.now();
        // Check if the dash is on cooldown. If so, don't fire the nova.
        if (!entity || entity.isDashing || now - entity.lastDashTime < entity.dashCooldown) {
            return orig_triggerDash.apply(this, [entity, ...rest]);
        }
        
        // Let the original function handle the dash movement and cooldown.
        const result = orig_triggerDash.apply(this, [entity, ...rest]);
        
        // After a successful dash, fire the bone nova if it's the skull player.
        try {
          if (entity === window.player && window.player._isSkull) {
            createSkullNova();
          }
        } catch (e) {
          console.error('[SkullPlugin] Dash trigger interception error:', e);
        }
        
        return result;
      };
      log('triggerDash patched successfully for Skull Nova.');
    })();

    log('Skull plugin ready - All features enabled!');
  }
})();
