// ═══════════════════════════════════════════════════════════════════════════
// KNIGHT CHARACTER PLUGIN — The Knight 🤺
// ═══════════════════════════════════════════════════════════════════════════
// Adds the Knight as a playable character.
//
// How it works:
//   - Pure melee — no gun, no bullets
//   - Auto-sword is always active (free, permanent)
//   - Sprite flips left/right based on movement direction
//   - Unlock condition: purchase in the upgrade shop for 600 coins
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

  function log(...s) { try { console.log('[KnightPlugin]', ...s); } catch (e) {} }

  waitFor(
    () => typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' &&
          typeof startGame !== 'undefined' && typeof playerData !== 'undefined' &&
          typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' &&
          typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined',
    init, 8000
  );

  function init() {
    log('Initializing knight character plugin...');

    // ─── CONSTANTS ────────────────────────────────────────────────────────
    const KN_ID    = 'knight';
    const KN_EMOJI = '🤺';   // Fencer emoji — naturally faces right
    const KN_SIZE  = 35;

    // ─── REGISTER CHARACTER ───────────────────────────────────────────────
    if (!CHARACTERS[KN_ID]) {
      CHARACTERS[KN_ID] = {
        id: KN_ID,
        name: 'The Knight',
        emoji: KN_EMOJI,
        description: 'A disciplined swordsman who fights up close.',
        perk: 'Auto-sword always active. No gun. Sprite flips with movement.',
        unlockCondition: { type: 'store' } // Bought in upgrade shop
      };
    }

    // Register in the upgrade shop (600 coins)
    if (!UNLOCKABLE_PICKUPS[KN_ID]) {
      UNLOCKABLE_PICKUPS[KN_ID] = {
        name: 'The Knight',
        desc: 'Unlocks the Knight. Auto-sword always active, no gun.',
        cost: 600,
        icon: KN_EMOJI
      };
    }

    // Pre-render the knight emoji for fast drawing
    try { preRenderEmoji(KN_EMOJI, KN_SIZE); } catch (e) {}

    // ─── APPLY / RESET KNIGHT STATS ───────────────────────────────────────

    // Apply Knight-specific setup to the player
    // - Sets the _isKnight flag (used by render/update to change behavior)
    // - Forces auto-sword on (saves previous state to restore later)
    function applyKnightToPlayer() {
      if (!player) return;
      player._isKnight = true;

      // Auto-sword is the knight's core ability — activate it for free
      if (typeof player.swordActive !== 'undefined') {
        window._kn_swordWasActive = player.swordActive; // Save previous state
        player.swordActive = true;
        // Reset swing timer so the sword fires immediately on game start
        player.lastSwordSwingTime = Date.now() - (typeof SWORD_SWING_INTERVAL !== 'undefined' ? SWORD_SWING_INTERVAL : 2000);
      }
      log('Knight applied.');
    }

    // Restore original state when switching away from Knight
    function resetKnightFromPlayer() {
      if (!player || !player._isKnight) return;
      player._isKnight = false;
      // Only turn off sword if it wasn't already active before
      if (!window._kn_swordWasActive) player.swordActive = false;
      log('Knight removed.');
    }

    // ─── PATCH startGame ──────────────────────────────────────────────────
    // Re-apply knight setup after startGame() resets the player
    (function patchStartGame() {
      if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
      const orig = window.startGame;
      window.startGame = async function (...args) {
        await orig.apply(this, args);
        try {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === KN_ID) {
            applyKnightToPlayer();
            if (typeof updatePowerupIconsUI === 'function') updatePowerupIconsUI();
          }
        } catch (e) { console.error('[KnightPlugin] startGame error:', e); }
      };
    })();

    // ─── HOOK CHARACTER TILE CLICKS ───────────────────────────────────────
    // Apply or remove knight setup when the player selects/deselects
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', () => {
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === KN_ID) {
              applyKnightToPlayer();
            } else {
              resetKnightFromPlayer();
            }
          } catch (e) {}
        }, 50);
      });
    })();

    // Note: Bullet firing is blocked in game_update.js via !player._isKnight check
    // Note: Drawing is handled in game_render.js via player._isKnight flag
    //       The 🤺 emoji naturally faces right, so the renderer mirrors it
    //       when the player is facing left (default direction).

    log('Knight plugin ready.');
  }
})();
