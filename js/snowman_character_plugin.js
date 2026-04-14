// ═══════════════════════════════════════════════════════════════════════════
// SNOWMAN CHARACTER PLUGIN — The Snowman ⛄
// ═══════════════════════════════════════════════════════════════════════════
// Adds the Snowman as a playable character.
//
// How it works:
//   - Sprite flips left/right based on aim direction (like Knight)
//   - Starts with Ice Projectile powerup (freeze enemies on hit)
//   - Shoots snowflake emoji (❄️) as bullets
//   - Unlock condition: purchase in the upgrade shop for 550 coins
//
// Uses the same plugin pattern as the other character plugins.
(function () {
  'use strict';

  // ─── WAIT FOR CORE GAME TO LOAD ─────────────────────────────────────────
  function waitFor(cond, cb, timeout = 8000, interval = 40) {
    const start = Date.now();
    const t = setInterval(() => {
      try {
        if (cond()) { clearInterval(t); cb(); }
        else if (Date.now() - start > timeout) { clearInterval(t); }
      } catch (e) { clearInterval(t); }
    }, interval);
  }

  function log(...s) { try { console.log('[SnowmanPlugin]', ...s); } catch (e) {} }

  waitFor(
    () => typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' &&
          typeof startGame !== 'undefined' && typeof playerData !== 'undefined' &&
          typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' &&
          typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined' &&
          typeof iceProjectileActive !== 'undefined',
    init, 8000
  );

  function init() {
    log('Initializing snowman character plugin...');

    // ─── CONSTANTS ────────────────────────────────────────────────────────
    const SNOWMAN_ID      = 'snowman';
    const SNOWMAN_EMOJI   = '⛄';
    const SNOWFLAKE_EMOJI = '❄️';
    const SNOWMAN_SIZE    = 35;
    const SNOWFLAKE_SIZE  = 16;
    const SNOWMAN_COST    = 550;

    // ─── REGISTER CHARACTER ───────────────────────────────────────────────
    if (!CHARACTERS[SNOWMAN_ID]) {
      CHARACTERS[SNOWMAN_ID] = {
        id: SNOWMAN_ID,
        name: 'The Snowman',
        emoji: SNOWMAN_EMOJI,
        description: 'A frosty warrior who freezes enemies in their tracks.',
        perk: 'Ice projectiles always active. Sprite flips with aim.',
        unlockCondition: { type: 'store' } // Bought in upgrade shop
      };
    }

    // Register in the upgrade shop
    if (!UNLOCKABLE_PICKUPS[SNOWMAN_ID]) {
      UNLOCKABLE_PICKUPS[SNOWMAN_ID] = {
        name: 'The Snowman',
        desc: 'Unlocks the Snowman. Ice projectiles always active, flips with aim.',
        cost: SNOWMAN_COST,
        icon: SNOWMAN_EMOJI
      };
    }

    // Pre-render the snowman and snowflake emojis for fast drawing
    try { preRenderEmoji(SNOWMAN_EMOJI, SNOWMAN_SIZE); } catch (e) {}
    try { preRenderEmoji(SNOWFLAKE_EMOJI, SNOWFLAKE_SIZE); } catch (e) {}

    // ─── APPLY / RESET SNOWMAN STATS ───────────────────────────────────────

    // Apply Snowman-specific setup to the player
    // - Sets the _isSnowman flag (used by render/update to change behavior)
    // - Forces ice projectile on (saves previous state to restore later)
    function applySnowmanToPlayer() {
      if (!player) return;
      player._isSnowman = true;

      // Ice projectile is the snowman's core ability — activate it for free
      window._snowman_iceWasActive = iceProjectileActive;
      iceProjectileActive = true;
      
      // Store the original bullet sprite
      if (sprites.bullet && !sprites._backup_bullet_snowman) {
        sprites._backup_bullet_snowman = sprites.bullet;
      }
      
      log('Snowman applied with ice projectiles.');
    }

    // Restore original state when switching away from Snowman
    function resetSnowmanFromPlayer() {
      if (!player || !player._isSnowman) return;
      player._isSnowman = false;
      
      // Only turn off ice projectile if it wasn't already active before
      if (!window._snowman_iceWasActive) {
        iceProjectileActive = false;
      }
      
      // Restore original bullet sprite if needed
      if (sprites._backup_bullet_snowman) {
        sprites.bullet = sprites._backup_bullet_snowman;
      }
      
      log('Snowman removed.');
    }

    // ─── PATCH startGame ──────────────────────────────────────────────────
    // Re-apply snowman setup after startGame() resets the player
    (function patchStartGame() {
      if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
      const orig = window.startGame;
      window.startGame = async function (...args) {
        await orig.apply(this, args);
        try {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SNOWMAN_ID) {
            applySnowmanToPlayer();
            if (typeof updatePowerupIconsUI === 'function') updatePowerupIconsUI();
          }
        } catch (e) { console.error('[SnowmanPlugin] startGame error:', e); }
      };
    })();

    // ─── HOOK CHARACTER TILE CLICKS ───────────────────────────────────────
    // Apply or remove snowman setup when the player selects/deselects
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', () => {
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SNOWMAN_ID) {
              applySnowmanToPlayer();
            } else {
              resetSnowmanFromPlayer();
            }
          } catch (e) {}
        }, 50);
      });
    })();

    // ─── PATCH BULLET CREATION ────────────────────────────────────────────
    // Hook into weapon creation to use snowflake emoji for bullets
    (function patchCreateWeapon() {
      if (typeof createWeapon !== 'function') { setTimeout(patchCreateWeapon, 100); return; }
      const orig = window.createWeapon;
      window.createWeapon = function(source, angle, isSecondShot = false, isDelayed = false, preCreatedWeapon = null) {
        const result = orig.call(this, source, angle, isSecondShot, isDelayed, preCreatedWeapon);
        
        // If player is snowman, mark bullets with snowflake flag
        if (player && player._isSnowman && source === player) {
          // Find the most recently created weapon and mark it
          for (let i = weaponPool.length - 1; i >= 0; i--) {
            if (weaponPool[i].active && !weaponPool[i]._snowmanMarked) {
              weaponPool[i]._isSnowflakeBullet = true;
              weaponPool[i]._snowmanMarked = true;
              weaponPool[i].size = SNOWFLAKE_SIZE * (player.projectileSizeMultiplier || 1);
              break;
            }
          }
        }
        
        return result;
      };
      log('createWeapon() patched for Snowman snowflake bullets.');
    })();

    log('Snowman plugin ready.');
  }
})();
