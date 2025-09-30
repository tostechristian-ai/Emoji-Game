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

  waitFor(() => (typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' && typeof ACHIEVEMENTS !== 'undefined' && typeof playerData !== 'undefined' && typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined'), init, 8000);

  function init() {
    log('Initializing skull character plugin...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPIN_SPEED = 0.25;
    const NOVA_COUNT = 6;
    const NOVA_SPEED = 6.0;
    const NOVA_SIZE = 12;
    const NOVA_LIFE = 2000;
    
    const SKULL_RENDER_SIZE = 28;
    const BONE_RENDER_SIZE = 12;

    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'Skull',
        emoji: SKULL_EMOJI,
        perk: 'V-spread bones + 6-bone dash',
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
      CHARACTERS[SKULL_ID].perk = 'V-spread bones + 6-bone dash';
    }

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
    } catch (e) {}

    if (!sprites._backup_bullet && sprites.bullet) {
      sprites._backup_bullet = sprites.bullet;
    }

    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      
      if (!player._skull_speed_backup) player._skull_speed_backup = player.speed;
      if (!player._skull_damage_backup) player._skull_damage_backup = player.damageMultiplier;
      if (!player._skull_vshape_backup) player._skull_vshape_backup = window.vShapeProjectileLevel || 0;
      
      player.speed = player.originalPlayerSpeed * 0.95;
      player.damageMultiplier = player._skull_damage_backup * 0.5;
      
      if (typeof window.vShapeProjectileLevel !== 'undefined') {
        window.vShapeProjectileLevel = Math.max(1, window.vShapeProjectileLevel);
      }
      
      log('Skull stats applied: 0.5x damage, V-spread enabled, 6-bone dash');
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
      
      if (player._skull_vshape_backup !== undefined) {
        if (typeof window.vShapeProjectileLevel !== 'undefined') {
          window.vShapeProjectileLevel = player._skull_vshape_backup;
        }
        delete player._skull_vshape_backup;
      }
      
      log('Skull stats removed');
    }

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
                ctx.drawImage(pre, player.x - SKULL_RENDER_SIZE / 2, player.y - SKULL_RENDER_SIZE / 2 + bobOffset, SKULL_RENDER_SIZE, SKULL_RENDER_SIZE);
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
        log('Firing skull bone nova!');
        
        if (!window.weaponPool) {
          log('weaponPool not found');
          return;
        }
        
        // Create visual nova ring effect
        if (Array.isArray(window.vengeanceNovas)) {
          vengeanceNovas.push({
            x: player.x,
            y: player.y,
            startTime: Date.now(),
            duration: 400,
            maxRadius: 100
          });
        }
        
        // Fire 6 bones in all directions
        let bonesCreated = 0;
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
              w.spinAngle = angle;
              bonesCreated++;
              break;
            }
          }
        }
        
        log(`Created ${bonesCreated} nova bones`);
        
        if (typeof playSound === 'function') {
          playSound('dodge');
        }
      } catch (e) {
        console.error('[SkullPlugin] Nova error:', e);
      }
    }

    // SIMPLIFIED: Just patch triggerDash to fire nova when skull dashes
    (function patchTriggerDash() {
      if (typeof triggerDash !== 'function') {
        setTimeout(patchTriggerDash, 100);
        return;
      }
      const orig = triggerDash;
      window.triggerDash = function(entity, ...rest) {
        // Call original dash first
        const result = orig.apply(this, [entity, ...rest]);
        
        // Then fire bone nova if it's the skull player
        try {
          if (entity === player && player._isSkull) {
            createSkullNova();
          }
        } catch (e) {
          console.error('[SkullPlugin] Dash trigger error:', e);
        }
        
        return result;
      };
      log('triggerDash patched successfully');
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

    log('Skull plugin ready - 6-bone dash nova enabled!');
  }
})();
