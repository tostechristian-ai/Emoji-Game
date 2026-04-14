// ═══════════════════════════════════════════════════════════════════════════
// FARMER CHARACTER PLUGIN — The Farmer 🧑‍🌾
// ═══════════════════════════════════════════════════════════════════════════
// Adds the Farmer as a playable character.
//
// How it works:
//   - Starts with the Shotgun powerup active (permanent)
//   - Shotgun fires 3 bullets in a spread automatically
//   - Unlock condition: purchase in the upgrade shop for 500 coins
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

  function log(...s) { try { console.log('[FarmerPlugin]', ...s); } catch (e) {} }

  waitFor(
    () => typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' &&
          typeof startGame !== 'undefined' && typeof playerData !== 'undefined' &&
          typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' &&
          typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined',
    init, 8000
  );

  function init() {
    log('Initializing farmer character plugin...');

    // ─── CONSTANTS ────────────────────────────────────────────────────────
    const FARMER_ID    = 'farmer';
    const FARMER_EMOJI = '🧑‍🌾';
    const FARMER_SIZE  = 35;
    const SHOTGUN_COST = 500;

    // ─── REGISTER CHARACTER ───────────────────────────────────────────────
    if (!CHARACTERS[FARMER_ID]) {
      CHARACTERS[FARMER_ID] = {
        id: FARMER_ID,
        name: 'The Farmer',
        emoji: FARMER_EMOJI,
        description: 'A hardy farmer with a trusty shotgun.',
        perk: 'Starts with Shotgun powerup (3 bullets per shot).',
        unlockCondition: { type: 'store' } // Bought in upgrade shop
      };
    }

    // Register in the upgrade shop
    if (!UNLOCKABLE_PICKUPS[FARMER_ID]) {
      UNLOCKABLE_PICKUPS[FARMER_ID] = {
        name: 'The Farmer',
        desc: 'Unlocks the Farmer. Starts with permanent Shotgun powerup.',
        cost: SHOTGUN_COST,
        icon: FARMER_EMOJI
      };
    }

    // Pre-render the farmer emoji for fast drawing
    try { preRenderEmoji(FARMER_EMOJI, FARMER_SIZE); } catch (e) {}

    // ─── APPLY / RESET FARMER STATS ────────────────────────────────────────

    // Apply Farmer-specific setup to the player
    // - Sets the _isFarmer flag (used by render/update to change behavior)
    // - Forces shotgun on (saves previous state to restore later)
    function applyFarmerToPlayer() {
      if (!player) return;
      player._isFarmer = true;

      // Shotgun is the farmer's core ability — activate it for free
      if (typeof shotgunActive !== 'undefined') {
        window._farmer_shotgunWasActive = shotgunActive; // Save previous state
        shotgunActive = true;
      }
      log('Farmer applied with shotgun.');
    }

    // Restore original state when switching away from Farmer
    function resetFarmerFromPlayer() {
      if (!player || !player._isFarmer) return;
      player._isFarmer = false;
      // Only turn off shotgun if it wasn't already active before
      if (!window._farmer_shotgunWasActive && typeof shotgunActive !== 'undefined') {
        shotgunActive = false;
      }
      log('Farmer removed.');
    }

    // ─── PATCH startGame ──────────────────────────────────────────────────
    // Re-apply farmer setup after startGame() resets the player
    (function patchStartGame() {
      if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
      const orig = window.startGame;
      window.startGame = async function (...args) {
        await orig.apply(this, args);
        try {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === FARMER_ID) {
            applyFarmerToPlayer();
            if (typeof updatePowerupIconsUI === 'function') updatePowerupIconsUI();
          }
        } catch (e) { console.error('[FarmerPlugin] startGame error:', e); }
      };
    })();

    // ─── HOOK CHARACTER TILE CLICKS ───────────────────────────────────────
    // Apply or remove farmer setup when the player selects/deselects
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', () => {
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === FARMER_ID) {
              applyFarmerToPlayer();
            } else {
              resetFarmerFromPlayer();
            }
          } catch (e) {}
        }, 50);
      });
    })();

    log('Farmer plugin ready.');
  }
})();
