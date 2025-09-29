// skullCharacter.js - Final fix for small skull + small bones
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
    const NOVA_COUNT = 16,
      NOVA_SPEED = 6.0,
      NOVA_SIZE = 10,
      NOVA_LIFE = 1000;
    
    const SKULL_RENDER_SIZE = 28;
    const BONE_RENDER_SIZE = 12; // Half size bones

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

    // This is the KEY FIX - we completely override draw() to skip weapon rendering
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

        // SKULL MODE: Temporarily disable weapons so original draw doesn't render them
        const activeWeapons = weaponPool.filter(w => w.active);
        const weaponStates = activeWeapons.map(w => ({ weapon: w, active: w.active }));
        activeWeapons.forEach(w => w.active = false);

        // Call original draw - this renders EVERYTHING except weapons (which we disabled)
        origDraw.apply(this, args);
        
        // Restore weapon states
        weaponStates.forEach(state => state.weapon.active = state.active);

        // Now we manually render AFTER everything else
        const now = Date.now();
        ctx.save();
        ctx.translate(-cameraOffsetX, -cameraOffsetY);

        // Draw skull on top of player position
        try {
            const pre = preRenderedEntities && preRenderedEntities[SKULL_EMOJI];
            if (pre) {
                const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase) * BOB_AMPLITUDE;
                ctx.drawImage(pre, player.x - SKULL_RENDER_SIZE / 2, player.y - SKULL_RENDER_SIZE / 2 + bobOffset, SKULL_RENDER_SIZE, SKULL_RENDER_SIZE);
            }
        } catch (e) { console.error('[SkullPlugin] skull draw error', e); }

        // Draw small spinning bones
        const boneCanvas = preRenderedEntities[BONE_EMOJI];
        if (boneCanvas) {
            for (const proj of activeWeapons) {
                proj.spinAngle = (proj.spinAngle || 0) + BONE_SPIN_SPEED;
                ctx.save();
                ctx.translate(proj.x, proj.y);
                ctx.rotate(proj.spinAngle);
                // Force draw at small size
                ctx.drawImage(boneCanvas, -BONE_RENDER_SIZE / 2, -BONE_RENDER_SIZE / 2, BONE_RENDER_SIZE, BONE_RENDER_SIZE);
                ctx.restore();
            }
        }

        ctx.restore();
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

    log('Skull plugin ready - small skull & small bones');
  }
})();
