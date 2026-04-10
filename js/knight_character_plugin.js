// knight_character_plugin.js - Knight (🤺): pure melee, auto-sword always active, no gun
(function () {
  'use strict';

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

    const KN_ID    = 'knight';
    const KN_EMOJI = '🤺';
    const KN_SIZE  = 35;

    // ── Register character ─────────────────────────────────────────────────
    if (!CHARACTERS[KN_ID]) {
      CHARACTERS[KN_ID] = {
        id: KN_ID,
        name: 'The Knight',
        emoji: KN_EMOJI,
        description: 'A disciplined swordsman who fights up close.',
        perk: 'Auto-sword always active. No gun. Sprite flips with movement.',
        unlockCondition: { type: 'store' }
      };
    }

    // ── Register in store (600 coins) ──────────────────────────────────────
    if (!UNLOCKABLE_PICKUPS[KN_ID]) {
      UNLOCKABLE_PICKUPS[KN_ID] = {
        name: 'The Knight',
        desc: 'Unlocks the Knight. Auto-sword always active, no gun.',
        cost: 600,
        icon: KN_EMOJI
      };
    }

    try { preRenderEmoji(KN_EMOJI, KN_SIZE); } catch (e) {}

    // ── Apply / reset ──────────────────────────────────────────────────────

    function applyKnightToPlayer() {
      if (!player) return;
      player._isKnight = true;
      // Auto-sword is the knight's core ability — activate it for free
      if (typeof player.swordActive !== 'undefined') {
        window._kn_swordWasActive = player.swordActive;
        player.swordActive = true;
        // Reset swing timer so it fires immediately
        player.lastSwordSwingTime = Date.now() - (typeof SWORD_SWING_INTERVAL !== 'undefined' ? SWORD_SWING_INTERVAL : 2000);
      }
      log('Knight applied.');
    }

    function resetKnightFromPlayer() {
      if (!player || !player._isKnight) return;
      player._isKnight = false;
      if (!window._kn_swordWasActive) player.swordActive = false;
      log('Knight removed.');
    }

    // ── Patch startGame ────────────────────────────────────────────────────
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

    // ── Hook character tile clicks ─────────────────────────────────────────
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

    // ── Block bullet firing for knight ─────────────────────────────────────
    // Handled in game_update.js via !player._isKnight check.
    // Rendering is handled in game_render.js.

    log('Knight plugin ready.');
  }
})();
