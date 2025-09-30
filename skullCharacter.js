// skullCharacter.js - V-spread bones + 6-bone dash nova (FIXED)
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

  waitFor(() => (
    typeof CHARACTERS !== 'undefined' && 
    typeof UNLOCKABLE_PICKUPS !== 'undefined' && 
    typeof ACHIEVEMENTS !== 'undefined' && 
    typeof playerData !== 'undefined' && 
    typeof sprites !== 'undefined' && 
    typeof preRenderEmoji !== 'undefined' && 
    typeof preRenderedEntities !== 'undefined' && 
    typeof createWeapon !== 'undefined' &&
    typeof triggerDash !== 'undefined'
  ), init, 8000);

  function init() {
    log('Initializing skull character plugin...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPIN_SPEED = 0.25;
    const NOVA_COUNT = 6;
    const NOVA_SPEED = 6.0;
    const NOVA_SIZE = 15;
    const NOVA_LIFE = 2000;
    const V_SPREAD_ANGLE = Math.PI / 12; // 15 degrees spread
    
    const SKULL_RENDER_SIZE = 28;
    const BONE_RENDER_SIZE = 15;

    // Register character
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'Skull',
        emoji: SKULL_EMOJI,
        description: 'A skeletal warrior who fires bone projectiles.',
        perk: 'V-spread bones (0.5x dmg) + 6-bone dash nova',
        unlockCondition: {
          type: 'achievement',
          id: SKULL_ACH_ID
        }
      };
    }

    // Register unlockable
    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
      UNLOCKABLE_PICKUPS[SKULL_ID] = {
        name: 'Skull Character',
        desc: 'Fires V-spread bones. Dash releases 6-bone nova.',
        cost: 1000,
        icon: SKULL_EMOJI
      };
    }

    // Register achievement
    if (!ACHIEVEMENTS[SKULL_ACH_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID] = {
        name: 'Skull Unlocked',
        desc: 'Unlocks the Skull character',
        icon: SKULL_EMOJI,
        unlocked: false
      };
    }

    // Pre-render emojis
    try {
      preRenderEmoji(BONE_EMOJI, BONE_RENDER_SIZE);
      preRenderEmoji(SKULL_EMOJI, SKULL_RENDER_SIZE);
      log('Emojis pre-rendered');
    } catch (e) {
      log('Pre-render error:', e);
    }

    // Sync achievement unlock
    if (playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
    }

    // CRITICAL FIX: Patch createWeapon to intercept skull firing
    (function patchCreateWeapon() {
      if (typeof createWeapon !== 'function') {
        setTimeout(patchCreateWeapon, 100);
        return;
      }

      const origCreateWeapon = window.createWeapon;
      
      window.createWeapon = function(shooter = player, customAngle = null) {
        // Check if this is the skull player firing
        if (shooter === player && player._isSkull && typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
          
          // Calculate the firing angle (same logic as original)
          let weaponAngle;
          if (customAngle !== null) {
            weaponAngle = customAngle;
          } else if (autoAimActive && enemies.length > 0) {
            let closestEnemy = null;
            let minDistance = Infinity;
            enemies.forEach(enemy => {
              const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
              if (distSq < minDistance) {
                minDistance = distSq;
                closestEnemy = enemy;
              }
            });
            if (closestEnemy) {
              weaponAngle = Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x);
            } else {
              weaponAngle = shooter.rotationAngle;
            }
          } else if (aimDx !== 0 || aimDy !== 0) {
            weaponAngle = Math.atan2(aimDy, aimDx);
          } else {
            let closestEnemy = null;
            let minDistance = Infinity;
            enemies.forEach(enemy => {
              const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
              if (distSq < minDistance) {
                minDistance = distSq;
                closestEnemy = enemy;
              }
            });
            if (closestEnemy) {
              weaponAngle = Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x);
            } else {
              weaponAngle = shooter.rotationAngle;
            }
          }

          // Fire 2 bones in V-spread
          const angles = [
            weaponAngle - V_SPREAD_ANGLE,
            weaponAngle + V_SPREAD_ANGLE
          ];

          angles.forEach(angle => {
            for (const weapon of weaponPool) {
              if (!weapon.active) {
                weapon.x = shooter.x;
                weapon.y = shooter.y;
                weapon.size = BONE_RENDER_SIZE;
                weapon.speed = 5.04 * player.projectileSpeedMultiplier;
                weapon.angle = angle;
                weapon.dx = Math.cos(angle) * weapon.speed;
                weapon.dy = Math.sin(angle) * weapon.speed;
                weapon.lifetime = Date.now() + 2000;
                weapon.hitsLeft = 1;
                weapon.hitEnemies.length = 0;
                weapon.active = true;
                weapon._isBone = true;
                weapon.spinAngle = angle;
                break;
              }
            }
          });

          // Play sound
          if (typeof playSound === 'function') {
            playSound('playerShoot');
          }

          // Don't call original function - we handled it
          return;
        }

        // For non-skull characters, use original function
        return origCreateWeapon.call(this, shooter, customAngle);
      };

      log('createWeapon patched successfully');
    })();

    // Patch triggerDash for bone nova
    (function patchTriggerDash() {
      if (typeof triggerDash !== 'function') {
        setTimeout(patchTriggerDash, 100);
        return;
      }

      const origTriggerDash = window.triggerDash;
      
      window.triggerDash = function(entity) {
        // Call original dash
        const result = origTriggerDash.call(this, entity);

        // Fire bone nova if skull player
        try {
          if (entity === player && player._isSkull && typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
            log('Firing skull bone nova!');
            
            // Visual nova effect
            if (Array.isArray(window.vengeanceNovas)) {
              vengeanceNovas.push({
                x: player.x,
                y: player.y,
                startTime: Date.now(),
                duration: 400,
                maxRadius: 100
              });
            }

            // Fire 6 bones in circle
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
                  w._isBone = true;
                  w.spinAngle = angle;
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.error('[SkullPlugin] Nova error:', e);
        }

        return result;
      };

      log('triggerDash patched successfully');
    })();

    // Patch draw to render bones
    (function patchDraw() {
      if (typeof draw !== 'function') {
        setTimeout(patchDraw, 100);
        return;
      }

      const origDraw = window.draw;

      window.draw = function(...args) {
        // Call original draw
        origDraw.apply(this, args);

        // Only add bone rendering if skull is active
        if (!player || !player._isSkull || typeof equippedCharacterID === 'undefined' || equippedCharacterID !== SKULL_ID) {
          return;
        }

        const now = Date.now();
        
        // Calculate camera offset with shake
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

        // Setup rendering context
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(cameraZoom, cameraZoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);

        // Render bones
        const boneCanvas = preRenderedEntities[BONE_EMOJI];
        if (boneCanvas) {
          for (const proj of weaponPool) {
            if (proj.active && proj._isBone) {
              proj.spinAngle = (proj.spinAngle || 0) + BONE_SPIN_SPEED;
              ctx.save();
              ctx.translate(proj.x, proj.y);
              ctx.rotate(proj.spinAngle);
              ctx.drawImage(boneCanvas, -BONE_RENDER_SIZE / 2, -BONE_RENDER_SIZE / 2, BONE_RENDER_SIZE, BONE_RENDER_SIZE);
              ctx.restore();
            }
          }
        }

        ctx.restore();
      };

      log('draw patched successfully');
    })();

    // Character selection hook
    (function hookCharacterSelection() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) {
        setTimeout(hookCharacterSelection, 100);
        return;
      }

      container.addEventListener('click', (ev) => {
        const tile = ev.target.closest('.character-tile');
        if (!tile || tile.classList.contains('locked')) return;
        
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID && player) {
              player._isSkull = true;
              player.damageMultiplier = (player.damageMultiplier || 1) * 0.5;
              log('Skull character equipped - 0.5x damage, V-spread + nova enabled');
            } else if (player) {
              player._isSkull = false;
              log('Non-skull character equipped');
            }
          } catch (e) {
            console.error('[SkullPlugin] Selection error:', e);
          }
        }, 10);
      });

      log('Character selection hooked');
    })();

    // Auto-unlock achievement when purchased
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
          log('Skull unlocked via purchase');
        }
        return ret;
      };
    })();

    // Periodic achievement sync
    setInterval(() => {
      try {
        const bought = !!(playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]);
        if (bought && ACHIEVEMENTS[SKULL_ACH_ID]) {
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
        }
      } catch (e) {}
    }, 1000);

    log('Skull plugin fully initialized - V-spread + 6-bone dash nova ready!');
  }
})();
