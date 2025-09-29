// skullCharacter.js (fixed by Gemini)
// This version safely handles projectile drawing within the main game loop
// and includes robust fallbacks if the 'bone.png' sprite fails to load.
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
    log('Initializing skull character plugin...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPRITE_PATH = 'sprites/bone.png';
    const NOVA_COUNT = 16,
      NOVA_SPEED = 6.0,
      NOVA_SIZE = 20,
      NOVA_LIFE = 1000;

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

    // Pre-render the bone emoji as a canvas for a fallback
    try {
      preRenderEmoji(BONE_EMOJI, 16);
    } catch (e) {
        log('Could not pre-render bone emoji.');
    }

    // --- LOAD BONE SPRITE ---
    // This function loads the bone sprite but only assigns it to sprites.bone on success.
    (function loadBoneSprite() {
      if (sprites.bone && sprites.bone.complete && sprites.bone.naturalWidth > 0) {
        log('Bone sprite already present and loaded.');
        return;
      }
      const boneImg = new Image();
      boneImg.onload = () => {
        sprites.bone = boneImg; // Assign only on successful load
        log('Bone sprite loaded successfully:', BONE_SPRITE_PATH);
      };
      boneImg.onerror = () => {
        log('ERROR: Bone sprite not found at', BONE_SPRITE_PATH, '- will use emoji fallback.');
      };
      boneImg.src = BONE_SPRITE_PATH;
    })();

    // Backup the original bullet sprite once
    if (!sprites._backup_bullet && sprites.bullet) {
      sprites._backup_bullet = sprites.bullet;
    }

    // --- HELPER FUNCTIONS ---
    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      // We no longer change the global sprites.bullet here to avoid crashes.
      // The change will be handled safely inside the patched draw function.
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
        // Restore original bullet sprite if it was backed up
        if (sprites._backup_bullet) sprites.bullet = sprites._backup_bullet;
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

    // This patch ensures buying the skull from the shop works correctly.
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
                log('Skull purchased: Faux achievement unlocked.');
            }
            return ret;
        };
        log('Patched buyUnlockable.');
    })();

    // Hook into character selection clicks to apply/reset the skull state.
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) {
        waitFor(() => !!document.getElementById('characterTilesContainer'), hookCharacterTiles, 8000);
        return;
      }
      container.addEventListener('click', (ev) => {
        const tile = ev.target.closest('.character-tile');
        if (!tile || tile.classList.contains('locked')) return;
        
        // Short delay to let the main game process the click first
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

    // On load, if skull is already equipped, apply its effects.
    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {}


    // ⭐⭐⭐ THE MAIN FIX IS HERE ⭐⭐⭐
    // We patch the main 'draw' function to safely handle bullet sprites and add the skull overlay.
    (function patchDraw() {
        if (typeof draw !== 'function') {
            waitFor(patchDraw, 8000);
            return;
        }
        const origDraw = window.draw;

        window.draw = function(...args) {
            // If the skull character is active, we need to control the bullet sprite.
            if (player && player._isSkull) {
                // Check if the custom bone sprite is loaded and valid.
                if (sprites.bone && sprites.bone.complete && sprites.bone.naturalWidth > 0) {
                    sprites.bullet = sprites.bone; // Use the bone sprite.
                } else {
                    // If the bone sprite is missing or broken, use the original bullet to prevent a crash.
                    if (sprites._backup_bullet) {
                        sprites.bullet = sprites._backup_bullet;
                    }
                }
            }

            // Now that sprites.bullet is safe, call the original game's draw function.
            origDraw.apply(this, args);

            // After everything else is drawn, draw the skull emoji over the player if active.
            try {
                if (player && player._isSkull) {
                    const pre = preRenderedEntities && preRenderedEntities[SKULL_EMOJI];
                    if (pre && typeof ctx !== 'undefined') {
                        ctx.save();
                        // This part was also fixed to respect camera offsets.
                        ctx.translate(-cameraOffsetX, -cameraOffsetY);
                        ctx.drawImage(pre, player.x - pre.width / 2, player.y - pre.height / 2);
                        ctx.restore();
                    } else if (typeof ctx !== 'undefined') {
                        // Fallback for drawing the emoji if pre-rendering failed.
                        ctx.save();
                        ctx.translate(-cameraOffsetX, -cameraOffsetY);
                        const size = Math.max(18, player.size);
                        ctx.font = `${size}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(SKULL_EMOJI, player.x, player.y);
                        ctx.restore();
                    }
                }
            } catch (e) {
                console.error('[SkullPlugin] Overlay draw error', e);
            }
        };
        log('Patched draw function to safely render skull character.');
    })();


    // This creates the nova of bone projectiles for the dodge ability.
    function createSkullNova() {
      try {
        if (!window.weaponPool) return;
        if (Array.isArray(window.vengeanceNovas)) {
            vengeanceNovas.push({ x: player.x, y: player.y, startTime: Date.now(), duration: 500, maxRadius: 120 });
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
    
    // This patch triggers the nova when the skull character dashes.
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

    // Periodically sync achievement status to keep menus updated.
    setInterval(() => {
      try {
        const bought = !!(playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]);
        const slayer = !!(ACHIEVEMENTS.slayer && ACHIEVEMENTS.slayer.unlocked);
        if (ACHIEVEMENTS[SKULL_ACH_ID]) {
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = !!(bought || slayer || ACHIEVEMENTS[SKULL_ACH_ID].unlocked);
        }
      } catch (e) {}
    }, 1000);

    log('Skull plugin ready.');
  }
})();
