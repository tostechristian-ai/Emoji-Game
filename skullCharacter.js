// skullCharacter.js
// Plugin to implement the 'Skull' character with unique abilities.
// Reverts to an overlay approach while fixing stat overrides.
// Features:
// 1. V-Shape Shot: Fires two bone projectiles instead of one.
// 2. Damage Override: All bone projectiles deal 50% of the player's base damage.
// 3. Dodge Nova: Dashing emits a 6-bone projectile nova.
// 4. Custom Graphics: Overlays a skull on the player and replaces projectiles with bones.

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
    console.log('[SkullPlugin]', ...s);
  }

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
    if (!CHARACTERS[SKULL_ID]) { CHARACTERS[SKULL_ID] = {}; }
    Object.assign(CHARACTERS[SKULL_ID], {
      id: SKULL_ID, name: 'Skull', emoji: SKULL_EMOJI,
      perk: 'V-spread bones (0.5x dmg), 6-bone dash nova.',
      unlockCondition: { type: 'achievement', id: SKULL_ACH_ID }
    });

    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
      UNLOCKABLE_PICKUPS[SKULL_ID] = {
        name: 'Skull Character', desc: 'V-spread bones (0.5x dmg), dash shoots 6 bones',
        cost: 1000, icon: SKULL_EMOJI
      };
    }

    if (!ACHIEVEMENTS[SKULL_ACH_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID] = {
        name: 'Skull Unlocked', desc: 'Unlocks the Skull character',
        icon: SKULL_EMOJI, unlocked: false
      };
    }
    
    if (playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
    }
    
    try {
      preRenderEmoji(BONE_EMOJI, BONE_RENDER_SIZE);
      preRenderEmoji(SKULL_EMOJI, SKULL_RENDER_SIZE);
    } catch (e) {
      log('Pre-rendering failed.', e);
    }

    // --- 2. CORE SKULL LOGIC ---

    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      
      // Backup original stats before overriding them.
      if (player._skull_damage_backup === undefined) player._skull_damage_backup = player.damageMultiplier;
      if (player._skull_vshape_backup === undefined) player._skull_vshape_backup = window.vShapeProjectileLevel || 0;
      
      // FIX: Set damage to 50% of the player's base damage (including permanent upgrades).
      player.damageMultiplier = player._skull_damage_backup * 0.5;
      
      // FIX: Force a 2-shot V-spread.
      window.vShapeProjectileLevel = 1;
      
      log(`Skull stats applied: damage set to ${player.damageMultiplier}, V-spread forced to level 1.`);
    }

    function resetSkullFromPlayer() {
      if (!player || !player._isSkull) return;
      player._isSkull = false;
      
      if (player._skull_damage_backup !== undefined) {
        player.damageMultiplier = player._skull_damage_backup;
        delete player._skull_damage_backup;
      }
      
      if (player._skull_vshape_backup !== undefined) {
        if (typeof window.vShapeProjectileLevel !== 'undefined') window.vShapeProjectileLevel = player._skull_vshape_backup;
        delete player._skull_vshape_backup;
      }
      log('Skull stats removed.');
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
            spinAngle: Math.random() * Math.PI * 2
          });
        }
      }
    }

    // --- 3. PATCHING GAME FUNCTIONS ---

    // FIX: Patch startGame to re-apply Skull stats AFTER the main game resets them. This is the key fix.
    (function patchStartGame() {
        const origStartGame = window.startGame;
        window.startGame = function(...args) {
            origStartGame.apply(this, args);
            setTimeout(() => {
                if (player && typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
                    applySkullToPlayer();
                }
            }, 10); // A small delay ensures all base game logic has finished.
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
      log('triggerDash() patched for skull nova.');
    })();
    
    // REVERTED: This draw patch now keeps the original player and adds the skull/bones on top.
    (function patchDraw() {
      const origDraw = window.draw;
      
      window.draw = function(...args) {
        // To replace bullets with bones, we must hide them from the original draw function.
        const activeWeapons = player._isSkull ? weaponPool.filter(w => w.active) : [];
        const weaponStates = player._isSkull ? activeWeapons.map(w => ({ weapon: w, active: w.active })) : [];
        if (player._isSkull) activeWeapons.forEach(w => w.active = false);

        // Call original draw. This will draw the cowboy player but not the bullets (if skull is active).
        origDraw.apply(this, args);

        if (!player || !player._isSkull) return;

        // Restore weapon state so we can loop over them for our custom drawing.
        weaponStates.forEach(state => state.weapon.active = state.active);

        // --- Custom overlay drawing ---
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
        
        let finalCameraOffsetX = (window.cameraOffsetX || 0) - currentHitShakeX;
        let finalCameraOffsetY = (window.cameraOffsetY || 0) - currentHitShakeY;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(window.cameraZoom || 1, window.cameraZoom || 1);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);

        // 1. Draw the Skull overlay on top of the player.
        try {
            const pre = preRenderedEntities[SKULL_EMOJI];
            const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase || 0) * (window.BOB_AMPLITUDE || 2.5);
            if (pre) {
                ctx.drawImage(pre, player.x - SKULL_RENDER_SIZE / 2, player.y - SKULL_RENDER_SIZE / 2 + bobOffset, SKULL_RENDER_SIZE, SKULL_RENDER_SIZE);
            }
        } catch (e) { log('Skull player draw error', e); }

        // 2. Draw active projectiles as spinning bones.
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

    // --- 4. HOOKS FOR CHARACTER SELECTION ---

    (function patchBuyUnlockable() {
      const orig = window.buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        orig.call(this, key, ...rest);
        if (key === SKULL_ID) { ACHIVEMENTS[SKULL_ACH_ID].unlocked = true; }
      };
    })();

    (function hookCharacterSelection() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterSelection, 100); return; }
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
    
    if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
      applySkullToPlayer();
    }
    
    log('Skull plugin restored to overlay mode and ready!');
  }
})();

