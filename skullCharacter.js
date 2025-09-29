// skullCharacter.js
// Standalone plugin to add the Skull character, bone bullets, dodge-nova, and fix unlock flow.
// Drop this file into your project and include it AFTER your main script.

(function() {
  'use strict';

  // small helper: wait until condition true then call cb
  function waitFor(conditionFn, cb, timeout = 5000, interval = 40) {
    const start = Date.now();
    const t = setInterval(() => {
      try {
        if (conditionFn()) {
          clearInterval(t);
          cb();
        } else if (Date.now() - start > timeout) {
          clearInterval(t);
          // timeout - still try to call cb if it makes sense later
        }
      } catch (e) {
        clearInterval(t);
      }
    }, interval);
  }

  // safe console wrapper
  function log(...s) { try { console.log('[SkullPlugin]', ...s); } catch(e) {} }

  // main init once core objects are available
  waitFor(() => (typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' && typeof ACHIEVEMENTS !== 'undefined' && typeof playerData !== 'undefined' && typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined'), init, 8000);

  function init() {
    log('initializing skull character plugin');

    // ---- CONFIG ----
    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked'; // fake achievement id to satisfy menu check
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPRITE_PATH = 'sprites/bone.png'; // place bone.png in sprites folder (optional)
    const NOVA_PROJECTILE_COUNT = 16;
    const NOVA_PROJECTILE_SPEED = 6.0;
    const NOVA_PROJECTILE_SIZE = 20;
    const NOVA_DURATION_MS = 1000;

    // ensure character exists
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'Skull',
        emoji: SKULL_EMOJI,
        perk: 'Bone bullets + dodge nova',
        unlockCondition: { type: 'achievement', id: SKULL_ACH_ID } // menu checks 'achievement' type
      };
      log('added skull character entry to CHARACTERS');
    } else {
      // enforce our unlockCondition so menu sees it
      CHARACTERS[SKULL_ID].unlockCondition = { type: 'achievement', id: SKULL_ACH_ID };
      CHARACTERS[SKULL_ID].emoji = SKULL_EMOJI;
      if (!CHARACTERS[SKULL_ID].name) CHARACTERS[SKULL_ID].name = 'Skull';
    }

    // ensure unlockable pickups entry exists (so shop shows it)
    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
      UNLOCKABLE_PICKUPS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'Skull Character',
        desc: 'Unlock the skull character. Bullets become bones.',
        cost: 1000 // default; leave or change to fit your economy
      };
      log('added unlockablePickup entry for skull');
    }

    // ensure the fake achievement exists
    if (!ACHIEVEMENTS[SKULL_ACH_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID] = { name: 'Skull Unlocked', desc: 'Unlocks the Skull character', icon: SKULL_EMOJI, unlocked: false };
      log('created faux achievement for skull unlock');
    }

    // If playerData already has pickup unlocked, mark achievement
    if (playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
      log('playerData indicates skull was already unlocked — set achievement');
    }

    // Pre-render the bone emoji (used by existing preRenderedEntities drawing)
    try { preRenderEmoji(BONE_EMOJI, 16); } catch (e) { /* harmless if unavailable */ }

    // create sprites.bone Image if not present
    if (!sprites.bone) {
      const boneImg = new Image();
      boneImg.src = BONE_SPRITE_PATH; // optional file; if not present final draw still uses preRendered emoji
      boneImg.onload = () => { sprites.bone = boneImg; log('bone sprite loaded'); };
      boneImg.onerror = () => { log('bone sprite not found at', BONE_SPRITE_PATH, '- will use emoji fallback'); };
      sprites.bone = sprites.bone || boneImg;
    }

    // ---- helper functions to apply/reset skull visuals/behaviour ----
    function applySkullToPlayer() {
      try {
        // mark player as skull active
        player._isSkull = true;

        // swap bullet sprite (backup original)
        if (!sprites._backup_bullet) sprites._backup_bullet = sprites.bullet;
        if (sprites.bone) {
          sprites.bullet = sprites.bone;
        } else {
          // if no bone image, we can rely on preRenderedEntities for emoji drawing
          // but swapping sprites.bullet to a canvas with preRendered bones is more work; skip for now
        }

        // optional: increase speed slightly if your game defines SKULL_SPEED_MULTIPLIER
        if (typeof SKULL_SPEED_MULTIPLIER !== 'undefined' && !player._skull_speed_backed) {
          player._skull_speed_backed = player.speed;
          player.speed = player.speed * SKULL_SPEED_MULTIPLIER;
        } else if (!player._skull_speed_backed) {
          player._skull_speed_backed = player.speed;
        }

        // immediate UI refresh if necessary
        if (typeof updateUIStats === 'function') updateUIStats();
      } catch (e) { console.error(e); }
    }

    function resetSkullFromPlayer() {
      try {
        player._isSkull = false;
        if (sprites._backup_bullet) sprites.bullet = sprites._backup_bullet;
        if (player._skull_speed_backed) { player.speed = player._skull_speed_backed; delete player._skull_speed_backed; }
        if (typeof updateUIStats === 'function') updateUIStats();
      } catch (e) { console.error(e); }
    }

    // ---- patch buyUnlockable so buying the skull sets the achievement (so menu sees it) ----
    function patchBuyUnlockable() {
      if (typeof buyUnlockable !== 'function') return false;
      const _orig = buyUnlockable;
      window.buyUnlockable = function(key, ...args) {
        const result = _orig.call(this, key, ...args);
        try {
          if (key === SKULL_ID) {
            // set purchase in the playerData (main code may have already set it, but ensure)
            playerData.unlockedPickups = playerData.unlockedPickups || {};
            playerData.unlockedPickups[SKULL_ID] = true;
            // mark achievement so character menu logic sees it
            ACHIEVEMENTS[SKULL_ACH_ID] = ACHIEVEMENTS[SKULL_ACH_ID] || { name: 'Skull Unlocked', desc: '', icon: SKULL_EMOJI, unlocked: true };
            ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
            // persist both places if save functions exist
            if (typeof savePlayerData === 'function') try { savePlayerData(); } catch(e) {}
            if (typeof savePlayerStats === 'function') try { savePlayerStats(); } catch(e) {}
            // refresh character select screen if open
            const charContainer = document.getElementById('characterSelectContainer');
            if (charContainer && charContainer.style.display !== 'none' && typeof showCharacterSelectScreen === 'function') {
              showCharacterSelectScreen();
            }
            log('skull bought: marked achievement + persisted');
          }
        } catch (e) { console.error(e); }
        return result;
      };
      log('patched buyUnlockable');
      return true;
    }

    // try to patch immediately or wait a bit if buyUnlockable not defined yet
    if (!patchBuyUnlockable()) {
      waitFor(() => typeof buyUnlockable === 'function', patchBuyUnlockable, 8000);
    }

    // ---- patch checkAchievements so achievement-based unlock also updates skull achievement when needed ----
    function patchCheckAchievements() {
      if (typeof checkAchievements !== 'function') return false;
      const _orig = checkAchievements;
      window.checkAchievements = function(...args) {
        const r = _orig.apply(this, args);
        try {
          // if 'slayer' (or other achievements) unlock the skull, reflect that
          const slayerUnlocked = ACHIEVEMENTS['slayer'] && ACHIEVEMENTS['slayer'].unlocked;
          const purchased = playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID];
          ACHIEVEMENTS[SKULL_ACH_ID] = ACHIEVEMENTS[SKULL_ACH_ID] || { name: 'Skull Unlocked', desc: '', icon: SKULL_EMOJI, unlocked: false };
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = !!(slayerUnlocked || purchased || ACHIEVEMENTS[SKULL_ACH_ID].unlocked);
          // refresh UI if needed
          const charContainer = document.getElementById('characterSelectContainer');
          if (charContainer && charContainer.style.display !== 'none' && typeof showCharacterSelectScreen === 'function') {
            showCharacterSelectScreen();
          }
        } catch (e) { console.error(e); }
        return r;
      };
      log('patched checkAchievements');
      return true;
    }
    if (!patchCheckAchievements()) {
      waitFor(() => typeof checkAchievements === 'function', patchCheckAchievements, 8000);
    }

    // ---- character selection UI: detect click on skull tile and apply visuals immediately ----
    (function hookupCharacterTileClicks() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) {
        // wait until the element exists
        waitFor(() => !!document.getElementById('characterTilesContainer'), hookupCharacterTileClicks, 8000);
        return;
      }

      container.addEventListener('click', (ev) => {
        const tile = ev.target.closest('.character-tile');
        if (!tile) return;
        if (tile.classList.contains('locked')) return; // ignore selections on locked ones

        // get emoji (unique)
        const emojiEl = tile.querySelector('.char-emoji');
        const nameEl = tile.querySelector('.char-name');
        const emoji = emojiEl ? emojiEl.textContent.trim() : null;
        const name = nameEl ? nameEl.textContent.trim() : null;

        // find matched char by emoji or name fallback
        const chosen = Object.values(CHARACTERS).find(c => (c.emoji === emoji) || (c.name === name));
        if (!chosen) return;

        // small delay to let original handler set equippedCharacterID; after that apply skull visuals if needed
        setTimeout(() => {
          try {
            if (chosen.id === SKULL_ID) {
              applySkullToPlayer();
            } else {
              resetSkullFromPlayer();
            }
          } catch (e) { console.error(e); }
        }, 12);
      });
      log('character tile click hook installed');
    })();

    // If menu selection was done elsewhere (equippedCharacterID variable), apply skull at load if currently selected
    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {}

    // ---- draw overlay: draw skull emoji over player each frame when active (so it overrides directional sprites & feet) ----
    function patchDrawOverlay() {
      if (typeof draw !== 'function') return false;
      const _orig = draw;
      window.draw = function(...args) {
        // call original draw
        _orig.apply(this, args);

        // then overlay skull if active (covers feet & base player sprite)
        try {
          if (player && player._isSkull) {
            const pre = preRenderedEntities && preRenderedEntities[SKULL_EMOJI];
            if (pre && typeof ctx !== 'undefined') {
              ctx.save();
              ctx.drawImage(pre, player.x - pre.width / 2, player.y - pre.height / 2);
              ctx.restore();
            } else if (typeof ctx !== 'undefined') {
              ctx.save();
              const size = (typeof SKULL_SIZE !== 'undefined') ? SKULL_SIZE : 20;
              ctx.font = `${size}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(SKULL_EMOJI, player.x, player.y);
              ctx.restore();
            }
          }
        } catch (e) {
          // don't break the game loop
        }
      };
      log('patched draw to overlay skull when active');
      return true;
    }
    if (!patchDrawOverlay()) waitFor(() => typeof draw === 'function', patchDrawOverlay, 8000);

    // ---- swap bullets to bones by swapping sprites.bullet while skull active (backup & restore) ----
    // handled in applySkullToPlayer()/resetSkullFromPlayer() above (we backup sprites._backup_bullet)

    // ---- skull dodge-nova: when player dodges and skull active, spawn bone projectiles in a circle ----
    function createSkullNova() {
      try {
        if (!weaponPool || !Array.isArray(weaponPool) || weaponPool.length === 0) return;

        const now = Date.now();
        // visual ring if game uses vengeanceNovas array
        if (typeof vengeanceNovas !== 'undefined' && Array.isArray(vengeanceNovas)) {
          vengeanceNovas.push({ x: player.x, y: player.y, startTime: now, duration: 500, maxRadius: 120 });
        }

        for (let i = 0; i < NOVA_PROJECTILE_COUNT; i++) {
          const angle = (i / NOVA_PROJECTILE_COUNT) * Math.PI * 2;
          // find an inactive weapon slot
          for (const w of weaponPool) {
            if (!w.active) {
              w.x = player.x;
              w.y = player.y;
              w.size = NOVA_PROJECTILE_SIZE;
              w.speed = NOVA_PROJECTILE_SPEED * (player.projectileSpeedMultiplier || 1);
              w.angle = angle;
              w.dx = Math.cos(angle) * w.speed;
              w.dy = Math.sin(angle) * w.speed;
              w.lifetime = Date.now() + NOVA_DURATION_MS;
              w.hitsLeft = 1;
              w.hitEnemies = w.hitEnemies || [];
              w.hitEnemies.length = 0;
              w.active = true;
              break;
            }
          }
        }
        // small feedback
        try { if (typeof playSound === 'function') playSound('dodge'); } catch(e){}
      } catch (e) { console.error(e); }
    }

    // Patch triggerDash to call nova when skull player dashes
    function patchTriggerDash() {
      if (typeof triggerDash !== 'function') return false;
      const _orig = triggerDash;
      window.triggerDash = function(entity, ...args) {
        const r = _orig.apply(this, [entity, ...args]);
        try {
          if (entity === player && player._isSkull) {
            createSkullNova();
          }
        } catch (e) { console.error(e); }
        return r;
      };
      log('patched triggerDash to spawn skull nova when dashing');
      return true;
    }
    if (!patchTriggerDash()) waitFor(() => typeof triggerDash === 'function', patchTriggerDash, 8000);

    // ---- ensure the skull achievement state is synced at load and when achievements change ----
    try {
      // initial sync (if playerData had skull unlocked earlier)
      ACHIEVEMENTS[SKULL_ACH_ID].unlocked = !!(ACHIEVEMENTS[SKULL_ACH_ID].unlocked || (playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]) || (ACHIEVEMENTS.slayer && ACHIEVEMENTS.slayer.unlocked));
    } catch (e) {}

    // Also set up a small periodic sync in case other code toggles things after us (non-invasive)
    setInterval(() => {
      try {
        const purchased = !!(playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]);
        const slayerUnlocked = !!(ACHIEVEMENTS.slayer && ACHIEVEMENTS.slayer.unlocked);
        if (ACHIEVEMENTS[SKULL_ACH_ID] && (ACHIEVEMENTS[SKULL_ACH_ID].unlocked !== (purchased || slayerUnlocked))) {
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = !!(purchased || slayerUnlocked);
        }
      } catch (e) {}
    }, 1000);

    // ---- small debug helper: console command to force equip / unequip ----
    window.__skullPlugin = {
      apply: applySkullToPlayer,
      reset: resetSkullFromPlayer,
      createNova: createSkullNova,
      isActive: () => !!(player && player._isSkull)
    };

    log('skull plugin initialization complete');
  } // end init

})(); // end IIFE
