// ═══════════════════════════════════════════════════════════════════════════
// JACK O LANTERN CHARACTER PLUGIN — Jack O Lantern 🎃
// ═══════════════════════════════════════════════════════════════════════════
// Adds Jack O Lantern as a playable character.
//
// How it works:
//   - Uses 🎃 emoji as the player sprite
//   - Starts with Dynamite powerup instead of pistol
//   - Unlock condition: purchase in the upgrade shop for 650 coins
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

  function log(...s) { try { console.log('[JackOLanternPlugin]', ...s); } catch (e) {} }

  waitFor(
    () => typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' &&
          typeof startGame !== 'undefined' && typeof playerData !== 'undefined' &&
          typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' &&
          typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined' &&
          typeof dynamiteActive !== 'undefined',
    init, 8000
  );

  function init() {
    log('Initializing Jack O Lantern character plugin...');

    // ─── CONSTANTS ────────────────────────────────────────────────────────
    const JACK_ID       = 'jackolantern';
    const JACK_EMOJI    = '🎃';
    const JACK_SIZE     = 35;
    const JACK_COST     = 650;

    // ─── REGISTER CHARACTER ───────────────────────────────────────────────
    if (!CHARACTERS[JACK_ID]) {
      CHARACTERS[JACK_ID] = {
        id: JACK_ID,
        name: 'Jack O Lantern',
        emoji: JACK_EMOJI,
        description: 'A spooky spirit with an explosive personality.',
        perk: 'Starts with Dynamite powerup. Throws explosive pumpkins.',
        unlockCondition: { type: 'store' } // Bought in upgrade shop
      };
    }

    // Register in the upgrade shop
    if (!UNLOCKABLE_PICKUPS[JACK_ID]) {
      UNLOCKABLE_PICKUPS[JACK_ID] = {
        name: 'Jack O Lantern',
        desc: 'Unlocks Jack O Lantern. Starts with dynamite powerup.',
        cost: JACK_COST,
        icon: JACK_EMOJI
      };
    }

    // Pre-render the pumpkin emoji for fast drawing
    try { preRenderEmoji(JACK_EMOJI, JACK_SIZE); } catch (e) {}

    // ─── APPLY / RESET JACK O LANTERN STATS ─────────────────────────────────

    // Apply Jack O Lantern-specific setup to the player
    function applyJackToPlayer() {
      if (!player) return;
      player._isJackOLantern = true;

      // Dynamite is Jack's core ability — activate it for free
      window._jack_dynamiteWasActive = dynamiteActive;
      if (playerData.unlockedPickups && playerData.unlockedPickups.dynamite) {
        dynamiteActive = true;
        lastDynamiteTime = Date.now();
      }

      log('Jack O Lantern applied with dynamite.');
    }

    // Restore original state when switching away from Jack
    function resetJackFromPlayer() {
      if (!player || !player._isJackOLantern) return;
      player._isJackOLantern = false;

      // Only turn off dynamite if it wasn't already active before
      if (!window._jack_dynamiteWasActive) {
        dynamiteActive = false;
      }

      log('Jack O Lantern removed.');
    }

    // ─── PATCH startGame ──────────────────────────────────────────────────
    // Re-apply jack setup after startGame() resets the player
    (function patchStartGame() {
      if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
      const orig = window.startGame;
      window.startGame = async function (...args) {
        await orig.apply(this, args);
        try {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === JACK_ID) {
            applyJackToPlayer();
            if (typeof updatePowerupIconsUI === 'function') updatePowerupIconsUI();
          }
        } catch (e) { console.error('[JackOLanternPlugin] startGame error:', e); }
      };
    })();

    // ─── HOOK CHARACTER TILE CLICKS ───────────────────────────────────────
    // Apply or remove jack setup when the player selects/deselects
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', () => {
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === JACK_ID) {
              applyJackToPlayer();
            } else {
              resetJackFromPlayer();
            }
          } catch (e) {}
        }, 50);
      });
    })();

    // ─── PATCH WEAPON FIRING ──────────────────────────────────────────────
    // Disable pistol firing for Jack (uses dynamite instead)
    (function patchWeaponFiring() {
      if (typeof createWeapon !== 'function') { setTimeout(patchWeaponFiring, 100); return; }
      const orig = window.createWeapon;
      window.createWeapon = function(source, angle, isSecondShot = false, isDelayed = false, preCreatedWeapon = null) {
        // If player is Jack O Lantern and has dynamite, don't create pistol bullets
        if (player && player._isJackOLantern && dynamiteActive && source === player) {
          return null; // Don't fire pistol bullets
        }
        return orig.call(this, source, angle, isSecondShot, isDelayed, preCreatedWeapon);
      };
      log('createWeapon() patched for Jack O Lantern (pistol disabled when dynamite active).');
    })();

    log('Jack O Lantern plugin ready.');
  }
})();
