// ═══════════════════════════════════════════════════════════════════════════
// SKULL CHARACTER PLUGIN — The Skeleton 💀
// ═══════════════════════════════════════════════════════════════════════════
// Adds the Skeleton as a playable character.
//
// How it works:
//   - Waits for the core game to finish loading, then patches in
//   - Shoots spinning bones instead of bullets (V-spread, 0.5x damage)
//   - Dashing fires a 6-bone nova in all directions
//   - Unlock condition: earn the "Slayer" trophy (1,000 kills)
//
// Uses the "plugin" pattern: wraps everything in an IIFE so it doesn't
// pollute the global scope, and patches existing functions rather than
// replacing them.
(function() {
  'use strict';

  // ─── WAIT FOR CORE GAME TO LOAD ─────────────────────────────────────────
  // Polls until all required globals exist, then calls init()
  function waitFor(cond, cb, timeout = 8000, interval = 40) {
    const start = Date.now();
    const t = setInterval(() => {
      try {
        if (cond()) { clearInterval(t); cb(); }
        else if (Date.now() - start > timeout) { clearInterval(t); }
      } catch (e) { clearInterval(t); }
    }, interval);
  }

  function log(...s) { try { console.log('[SkullPlugin]', ...s); } catch (e) {} }

  // Wait until all required game systems are available
  waitFor(
    () => typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' &&
          typeof ACHIEVEMENTS !== 'undefined' && typeof startGame !== 'undefined' &&
          typeof playerData !== 'undefined' && typeof sprites !== 'undefined' &&
          typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined' &&
          typeof draw !== 'undefined' && typeof triggerDash !== 'undefined',
    init, 8000
  );

  function init() {
    log('Initializing skull character plugin (Dash-Integrated Nova)...');

    // ─── CONSTANTS ────────────────────────────────────────────────────────
    const SKULL_ID        = 'skull';
    const SKULL_ACH_ID    = 'slayer';       // Trophy required to unlock
    const SKULL_EMOJI     = '💀';
    const BONE_EMOJI      = '🦴';
    const BONE_SPIN_SPEED = 0.25;           // How fast bones spin visually
    const NOVA_COUNT      = 6;              // Bones fired on dash
    const NOVA_SPEED      = 6.0;            // Speed of nova bones
    const NOVA_SIZE       = 20;             // Size of nova bones
    const NOVA_LIFE       = 1500;           // How long nova bones last (ms)
    const SKULL_RENDER_SIZE = 28;
    const BONE_RENDER_SIZE  = 16;

    // ─── REGISTER CHARACTER ───────────────────────────────────────────────
    // Add Skeleton to the CHARACTERS table if not already there
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'The Skeleton',
        emoji: SKULL_EMOJI,
        perk: 'Piercing bone shots (0.5x dmg, 1 dmg/bone) + 6-bone dash nova.',
        unlockCondition: { type: 'achievement', id: SKULL_ACH_ID }
      };
    } else {
      CHARACTERS[SKULL_ID].name = 'The Skeleton';
      CHARACTERS[SKULL_ID].unlockCondition = { type: 'achievement', id: SKULL_ACH_ID };
      CHARACTERS[SKULL_ID].emoji = SKULL_EMOJI;
      CHARACTERS[SKULL_ID].perk = 'Piercing bone shots (0.5x dmg, 1 dmg/bone) + 6-bone dash nova.';
    }

    // Also register in the unlockable pickups table (for shop display)
    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
      UNLOCKABLE_PICKUPS[SKULL_ID] = {
        name: 'The Skeleton',
        desc: 'Unlocks the Skeleton character.',
        cost: 500,
        icon: SKULL_EMOJI
      };
    }

    // Pre-render bone and skull emojis for fast drawing
    try {
      preRenderEmoji(BONE_EMOJI, BONE_RENDER_SIZE);
      preRenderEmoji(SKULL_EMOJI, SKULL_RENDER_SIZE);
    } catch (e) {}

    // Back up the default bullet sprite in case we need to restore it
    if (!sprites._backup_bullet && sprites.bullet) {
      sprites._backup_bullet = sprites.bullet;
    }

    // ─── APPLY / RESET SKULL STATS ────────────────────────────────────────

    // Apply Skeleton-specific stats to the player
    // - Halves damage (bones are weaker individually)
    // - Activates bone_shot powerup for piercing spinning bones
    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      if (player._skull_damage_backup === undefined) player._skull_damage_backup = player.damageMultiplier;
      player.damageMultiplier = player._skull_damage_backup * 0.5; // 0.5x damage
      // Activate bone shot powerup for piercing spinning bones
      window.boneShotActive = true;
      log('Skull stats applied: 0.5x damage, bone shot enabled.');
    }

    // Restore original player stats when switching away from Skeleton
    function resetSkullFromPlayer() {
      if (!player || !player._isSkull) return;
      player._isSkull = false;
      if (sprites._backup_bullet) sprites.bullet = sprites._backup_bullet;
      if (player._skull_damage_backup !== undefined) {
        player.damageMultiplier = player._skull_damage_backup;
        delete player._skull_damage_backup;
      }
      // Deactivate bone shot when switching away from skull
      window.boneShotActive = false;
      log('Skull stats removed.');
    }

    // ─── PATCH startGame ──────────────────────────────────────────────────
    // Re-apply skull stats after startGame() resets the player object
    (function patchStartGame() {
      if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
      const orig_startGame = window.startGame;
      window.startGame = async function(...args) {
        await orig_startGame.apply(this, args);
        try {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
            log('Game started with Skull. Re-applying custom stats...');
            applySkullToPlayer();
          }
        } catch (e) { console.error('[SkullPlugin] Error in startGame patch:', e); }
      };
      log('startGame() patched to apply Skull stats after player reset.');
    })();

    // ─── PATCH buyUnlockable ──────────────────────────────────────────────
    // When buying the Skull in the shop, also mark the achievement as unlocked
    (function patchBuyUnlockable() {
      if (typeof buyUnlockable !== 'function') { setTimeout(patchBuyUnlockable, 100); return; }
      const orig = buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        if (key === SKULL_ID) {
          if (ACHIEVEMENTS[SKULL_ACH_ID]) ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
        }
        return orig.call(this, key, ...rest);
      };
    })();

    // ─── HOOK CHARACTER TILE CLICKS ───────────────────────────────────────
    // Apply or remove skull stats when the player selects/deselects the character
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', () => {
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

    // Apply stats immediately if Skull is already equipped on load
    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {}

    // Note: Drawing is handled in game_render.js via player._isSkull flag

    // ─── DASH NOVA ────────────────────────────────────────────────────────
    // Fire 6 bones in a ring when the player dashes
    function createSkullNova() {
      try {
        if (!window.weaponPool || !window.player) {
          log('Nova failed: weaponPool or player not found.');
          return;
        }
        log('Creating skull nova...');
        let bonesCreated = 0;

        for (let i = 0; i < NOVA_COUNT; i++) {
          const angle = (i / NOVA_COUNT) * Math.PI * 2; // Evenly spaced around 360°

          // Find an inactive slot in the weapon pool
          for (const weapon of weaponPool) {
            if (!weapon.active) {
              weapon.x = player.x;
              weapon.y = player.y;
              weapon.size = NOVA_SIZE * (player.projectileSizeMultiplier || 1);
              weapon.speed = NOVA_SPEED * (player.projectileSpeedMultiplier || 1);
              weapon.angle = angle;
              weapon.dx = Math.cos(angle) * weapon.speed;
              weapon.dy = Math.sin(angle) * weapon.speed;
              weapon.lifetime = Date.now() + NOVA_LIFE;
              weapon.hitsLeft = 999; // Piercing - can hit multiple enemies
              weapon._isBoneShot = true; // Mark as bone shot for piercing behavior
              weapon._boneDamage = 1; // Fixed 1 damage per hit
              weapon.hitEnemies = new Set(); // Use Set for proper hit tracking
              weapon.active = true;
              weapon.spinAngle = angle;
              bonesCreated++;
              break;
            }
          }
        }

        if (bonesCreated > 0) {
          log(`✔ Fired ${bonesCreated}/${NOVA_COUNT} nova bones.`);
          if (typeof playSound === 'function') playSound('playerShoot');
        } else {
          log('✗ No inactive weapons available for nova.');
        }
      } catch (e) { console.error('[SkullPlugin] Nova creation error:', e); }
    }

    // ─── PATCH triggerDash ────────────────────────────────────────────────
    // Hook into the existing dash system to fire the nova on dash
    (function patchTriggerDash() {
      if (typeof triggerDash !== 'function') { setTimeout(patchTriggerDash, 100); return; }
      const orig_triggerDash = window.triggerDash;
      window.triggerDash = function(entity, ...args) {
        const result = orig_triggerDash.call(this, entity, ...args);
        // Fire nova only when the player dashes with Skull equipped
        if (entity === player && player._isSkull && entity.isDashing) {
          log('Player dashed with skull character - triggering nova!');
          createSkullNova();
        }
        return result;
      };
      log('triggerDash() patched for Skull Nova integration.');
    })();

    log('Skull plugin ready - Bone nova will trigger on dash!');
  }
})();
