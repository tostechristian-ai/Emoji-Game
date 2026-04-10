// lumberjack_character_plugin.js - Lumberjack (🧑‍🚒): whirlwind axe only, no bullets
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

    const LJ_ID       = 'lumberjack';
    const LJ_EMOJI    = '🧑‍🚒';   // firefighter emoji as the character sprite
    const AXE_EMOJI   = '🪓';
    const AXE_RENDER_SIZE = 22;
    const NOVA_COUNT  = 8;
    const NOVA_SPEED  = 5.5;
    const NOVA_SIZE   = 22;
    const NOVA_LIFE   = 1400;

    // ── Register character ─────────────────────────────────────────────────
    if (!CHARACTERS[LJ_ID]) {
      CHARACTERS[LJ_ID] = {
        id: LJ_ID,
        name: 'The Lumberjack',
        emoji: LJ_EMOJI,
        description: 'A rugged woodsman who wields axes instead of bullets.',
        perk: 'Whirlwind axe always active. Dash fires an 8-axe nova. No gun.',
        unlockCondition: { type: 'store' }
      };
    }

    // ── Register in store ──────────────────────────────────────────────────
    if (!UNLOCKABLE_PICKUPS[LJ_ID]) {
      UNLOCKABLE_PICKUPS[LJ_ID] = {
        name: 'The Lumberjack',
        desc: 'Unlocks the Lumberjack. Whirlwind axe always active, no gun.',
        cost: 500,
        icon: LJ_EMOJI
      };
    }

    // Pre-render the emoji so drawImage works
    try { preRenderEmoji(AXE_EMOJI, AXE_RENDER_SIZE); } catch (e) {}
    try { preRenderEmoji(LJ_EMOJI, 35); } catch (e) {}

    // ── Apply / reset ──────────────────────────────────────────────────────

    function applyLumberjackToPlayer() {
      if (!player) return;
      player._isLumberjack = true;
      // Force whirlwind axe on (save previous state so we can restore it)
      window._lj_whirlwindWasActive = typeof whirlwindAxeActive !== 'undefined' ? whirlwindAxeActive : false;
      if (typeof whirlwindAxeActive !== 'undefined') whirlwindAxeActive = true;
      log('Lumberjack applied.');
    }

    function resetLumberjackFromPlayer() {
      if (!player || !player._isLumberjack) return;
      player._isLumberjack = false;
      if (typeof whirlwindAxeActive !== 'undefined' && !window._lj_whirlwindWasActive) {
        whirlwindAxeActive = false;
      }
      log('Lumberjack removed.');
    }

    // ── Patch startGame ────────────────────────────────────────────────────
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

    // ── Hook character tile clicks ─────────────────────────────────────────
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

    // ── Dash nova: 8 axes in a ring ────────────────────────────────────────
    function createAxeNova() {
      try {
        if (!window.weaponPool || !window.player) return;
        let created = 0;
        for (let i = 0; i < NOVA_COUNT; i++) {
          const angle = (i / NOVA_COUNT) * Math.PI * 2;
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
              weapon._axeSpin = angle;
              created++;
              break;
            }
          }
        }
        if (created > 0 && typeof playSound === 'function') playSound('playerShoot');
      } catch (e) { console.error('[LumberjackPlugin] nova error:', e); }
    }

    // ── Patch triggerDash ──────────────────────────────────────────────────
    (function patchTriggerDash() {
      if (typeof triggerDash !== 'function') { setTimeout(patchTriggerDash, 100); return; }
      const orig = window.triggerDash;
      window.triggerDash = function (entity, ...args) {
        const result = orig.call(this, entity, ...args);
        if (entity === player && player._isLumberjack && entity.isDashing) {
          createAxeNova();
        }
        return result;
      };
    })();

    // draw() is now handled entirely in game_render.js — no patch needed here.

    log('Lumberjack plugin ready.');
  }
})();
