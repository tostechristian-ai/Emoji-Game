// ═══════════════════════════════════════════════════════════════════════════
// LUMBERJACK CHARACTER PLUGIN — The Lumberjack 🧑‍🚒
// ═══════════════════════════════════════════════════════════════════════════
// Adds the Lumberjack as a playable character.
//
// How it works:
//   - No gun — throws spinning axes instead of bullets
//   - Whirlwind Axe powerup is always active (free, permanent)
//   - Dashing fires an 8-axe nova in all directions
//   - Unlock condition: purchase in the upgrade shop for 500 coins
//
// Uses the same plugin pattern as the Skull plugin.
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

  function log(...s) { try { console.log('[LumberjackPlugin]', ...s); } catch (e) {} }

  waitFor(
    () => typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' &&
          typeof startGame !== 'undefined' && typeof playerData !== 'undefined' &&
          typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' &&
          typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined' &&
          typeof triggerDash !== 'undefined',
    init, 8000
  );

  function init() {
    log('Initializing lumberjack character plugin...');

    // ─── CONSTANTS ────────────────────────────────────────────────────────
    const LJ_ID         = 'lumberjack';
    const LJ_EMOJI      = '🧑‍🚒';   // Firefighter emoji used as the character sprite
    const AXE_EMOJI     = '🪓';
    const AXE_RENDER_SIZE = 22;
    const NOVA_COUNT    = 8;       // Axes fired on dash
    const NOVA_SPEED    = 5.5;     // Speed of nova axes
    const NOVA_SIZE     = 22;      // Size of nova axes
    const NOVA_LIFE     = 1400;    // How long nova axes last (ms)

    // ─── REGISTER CHARACTER ───────────────────────────────────────────────
    if (!CHARACTERS[LJ_ID]) {
      CHARACTERS[LJ_ID] = {
        id: LJ_ID,
        name: 'The Lumberjack',
        emoji: LJ_EMOJI,
        description: 'A rugged woodsman who wields axes instead of bullets.',
        perk: 'Whirlwind axe always active. Dash fires an 8-axe nova. No gun.',
        unlockCondition: { type: 'store' } // Bought in upgrade shop
      };
    }

    // Register in the upgrade shop
    if (!UNLOCKABLE_PICKUPS[LJ_ID]) {
      UNLOCKABLE_PICKUPS[LJ_ID] = {
        name: 'The Lumberjack',
        desc: 'Unlocks the Lumberjack. Whirlwind axe always active, no gun.',
        cost: 500,
        icon: LJ_EMOJI
      };
    }

    // Pre-render axe and lumberjack emojis for fast drawing
    try { preRenderEmoji(AXE_EMOJI, AXE_RENDER_SIZE); } catch (e) {}
    try { preRenderEmoji(LJ_EMOJI, 35); } catch (e) {}

    // ─── APPLY / RESET LUMBERJACK STATS ──────────────────────────────────

    // Apply Lumberjack-specific setup to the player
    // - Sets the _isLumberjack flag (used by render/update to change behavior)
    // - Forces whirlwind axe on (saves previous state to restore later)
    function applyLumberjackToPlayer() {
      if (!player) return;
      player._isLumberjack = true;
      // Save previous whirlwind state so we can restore it if character is swapped
      window._lj_whirlwindWasActive = typeof whirlwindAxeActive !== 'undefined' ? whirlwindAxeActive : false;
      if (typeof whirlwindAxeActive !== 'undefined') whirlwindAxeActive = true;
      log('Lumberjack applied.');
    }

    // Restore original state when switching away from Lumberjack
    function resetLumberjackFromPlayer() {
      if (!player || !player._isLumberjack) return;
      player._isLumberjack = false;
      // Only turn off whirlwind if it wasn't already active before
      if (typeof whirlwindAxeActive !== 'undefined' && !window._lj_whirlwindWasActive) {
        whirlwindAxeActive = false;
      }
      log('Lumberjack removed.');
    }

    // ─── PATCH startGame ──────────────────────────────────────────────────
    // Re-apply lumberjack setup after startGame() resets the player
    (function patchStartGame() {
      if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
      const orig = window.startGame;
      window.startGame = async function (...args) {
        await orig.apply(this, args);
        try {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === LJ_ID) {
            applyLumberjackToPlayer();
            if (typeof whirlwindAxeActive !== 'undefined') whirlwindAxeActive = true;
            if (typeof updatePowerupIconsUI === 'function') updatePowerupIconsUI();
          }
        } catch (e) { console.error('[LumberjackPlugin] startGame error:', e); }
      };
    })();

    // ─── HOOK CHARACTER TILE CLICKS ───────────────────────────────────────
    // Apply or remove lumberjack setup when the player selects/deselects
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', () => {
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === LJ_ID) {
              applyLumberjackToPlayer();
            } else {
              resetLumberjackFromPlayer();
            }
          } catch (e) {}
        }, 50);
      });
    })();

    // ─── DASH NOVA ────────────────────────────────────────────────────────
    // Fire 8 axes in a ring when the player dashes
    function createAxeNova() {
      try {
        if (!window.weaponPool || !window.player) return;
        let created = 0;

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
              weapon.hitsLeft = 1;
              weapon.hitEnemies = [];
              weapon.active = true;
              weapon._axeSpin = angle; // Used by renderer to spin the axe visually
              created++;
              break;
            }
          }
        }

        if (created > 0 && typeof playSound === 'function') playSound('playerShoot');
      } catch (e) { console.error('[LumberjackPlugin] nova error:', e); }
    }

    // ─── PATCH triggerDash ────────────────────────────────────────────────
    // Hook into the existing dash system to fire the nova on dash
    (function patchTriggerDash() {
      if (typeof triggerDash !== 'function') { setTimeout(patchTriggerDash, 100); return; }
      const orig = window.triggerDash;
      window.triggerDash = function (entity, ...args) {
        const result = orig.call(this, entity, ...args);
        // Fire nova only when the player dashes with Lumberjack equipped
        if (entity === player && player._isLumberjack && entity.isDashing) {
          createAxeNova();
        }
        return result;
      };
    })();

    // Note: Drawing is handled in game_render.js via player._isLumberjack flag
    // Note: Bullet firing is blocked in game_update.js via !player._isLumberjack check

    log('Lumberjack plugin ready.');
  }
})();
