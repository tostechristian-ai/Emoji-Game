// skullCharacter.js (fixed)
// Drop this in AFTER script.js
(function() {
  'use strict';

  // tiny wait helper
  function waitFor(cond, cb, timeout = 8000, interval = 40) {
    const start = Date.now();
    const t = setInterval(() => {
      try {
        if (cond()) { clearInterval(t); cb(); }
        else if (Date.now() - start > timeout) { clearInterval(t); }
      } catch (e) { clearInterval(t); }
    }, interval);
  }
  function log(...s){ try { console.log('[SkullPlugin]', ...s); }catch(e){} }

  waitFor(() => (typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' && typeof ACHIEVEMENTS !== 'undefined' && typeof playerData !== 'undefined' && typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined'), init, 8000);

  function init() {
    log('initializing skull character plugin (fixed image handling)');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'skull_unlocked';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPRITE_PATH = 'sprites/bone.png';
    const NOVA_COUNT = 16, NOVA_SPEED = 6.0, NOVA_SIZE = 20, NOVA_LIFE = 1000;

    // Ensure character exists and menu sees it (menu checks achievement type)
    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID, name: 'Skull', emoji: SKULL_EMOJI, perk: 'Bone bullets + dodge nova',
        unlockCondition: { type: 'achievement', id: SKULL_ACH_ID }
      };
      log('added CHARACTERS.skull');
    } else {
      CHARACTERS[SKULL_ID].unlockCondition = { type: 'achievement', id: SKULL_ACH_ID };
      CHARACTERS[SKULL_ID].emoji = SKULL_EMOJI;
    }

    // Add to unlockables/shop
    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
      UNLOCKABLE_PICKUPS[SKULL_ID] = { name: 'Skull Character', desc: 'Unlock the Skull (bone bullets)', cost: 1000, icon: SKULL_EMOJI };
      log('added UNLOCKABLE_PICKUPS.skull');
    }

    // Create a small faux achievement so menu recognizes the purchase unlock
    if (!ACHIEVEMENTS[SKULL_ACH_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID] = { name: 'Skull Unlocked', desc: 'Unlocks the Skull character', icon: SKULL_EMOJI, unlocked: false };
      log('created faux achievement for skull unlock');
    }

    // If playerData already has it unlocked, mark the achievement
    if (playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]) {
      ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
    }

    // pre-render bone emoji (fallback)
    try { preRenderEmoji(BONE_EMOJI, 16); } catch (e) {}

    // Load bone sprite but DO NOT assign sprites.bone until onload succeeds
    (function loadBoneSprite() {
      if (sprites.bone && sprites.bone.complete && sprites.bone.naturalWidth > 0) {
        log('bone sprite already present and loaded');
        return;
      }
      const boneImg = new Image();
      boneImg.onload = () => {
        sprites.bone = boneImg;
        log('bone sprite loaded:', BONE_SPRITE_PATH);
        // if player currently using skull, swap bullet now
        try { if (player && player._isSkull) sprites.bullet = sprites.bone; } catch(e){}
      };
      boneImg.onerror = () => {
        log('bone sprite not found at', BONE_SPRITE_PATH, '- will use emoji fallback');
      };
      boneImg.src = BONE_SPRITE_PATH;
    })();

    // ---- backup original bullet sprite if any ----
    if (!sprites._backup_bullet && sprites.bullet) sprites._backup_bullet = sprites.bullet;

    // ---- helpers apply/reset skull visuals ----
    function applySkullToPlayer() {
      try {
        player._isSkull = true;
        // only overwrite sprites.bullet if sprites.bone successfully loaded
        if (sprites.bone && sprites.bone.complete && sprites.bone.naturalWidth > 0) {
          if (!sprites._backup_bullet) sprites._backup_bullet = sprites.bullet;
          sprites.bullet = sprites.bone;
        }
        // speed/damage tweaks
        if (!player._skull_speed_backup) player._skull_speed_backup = player.speed;
        player.speed = player.originalPlayerSpeed * 0.95;
        if (!player._skull_damage_backup) player._skull_damage_backup = player.damageMultiplier;
        player.damageMultiplier = 1.25;

        // set dodge logic to skull nova (game uses triggerDash to call dodge)
        player._dodge_override = function() { createSkullNova(); };

        // redraw overlay will ensure skull covers feet; see draw patch below
      } catch (e) { console.error(e); }
    }

    function resetSkullFromPlayer() {
      try {
        player._isSkull = false;
        if (sprites._backup_bullet) sprites.bullet = sprites._backup_bullet;
        if (player._skull_speed_backup) { player.speed = player._skull_speed_backup; delete player._skull_speed_backup; }
        if (player._skull_damage_backup) { player.damageMultiplier = player._skull_damage_backup; delete player._skull_damage_backup; }
        if (player._dodge_override) delete player._dodge_override;
      } catch (e) { console.error(e); }
    }

    // ---- patch buyUnlockable so buying skull sets the faux achievement + persists ----
    function patchBuyUnlockable() {
      if (typeof buyUnlockable !== 'function') return false;
      const orig = buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        const ret = orig.call(this, key, ...rest);
        try {
          if (key === SKULL_ID) {
            playerData.unlockedPickups = playerData.unlockedPickups || {};
            playerData.unlockedPickups[SKULL_ID] = true;
            ACHIEVEMENTS[SKULL_ACH_ID] = ACHIEVEMENTS[SKULL_ACH_ID] || { name: 'Skull Unlocked', desc:'', icon:SKULL_EMOJI, unlocked:true };
            ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true;
            if (typeof savePlayerData === 'function') savePlayerData();
            if (typeof savePlayerStats === 'function') savePlayerStats();
            if (typeof showCharacterSelectScreen === 'function') showCharacterSelectScreen();
            log('skull bought: persisted and marked achievement');
          }
        } catch(e){ console.error(e); }
        return ret;
      };
      log('patched buyUnlockable');
      return true;
    }
    if (!patchBuyUnlockable()) waitFor(() => typeof buyUnlockable === 'function', patchBuyUnlockable, 8000);

    // ---- patch checkAchievements to ensure skull unlock reflects either purchase or slayer achievement ----
    function patchCheckAchievements() {
      if (typeof checkAchievements !== 'function') return false;
      const orig = checkAchievements;
      window.checkAchievements = function(...args) {
        const r = orig.apply(this, args);
        try {
          const bought = !!(playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]);
          const slayer = !!(ACHIEVEMENTS.slayer && ACHIEVEMENTS.slayer.unlocked);
          ACHIEVEMENTS[SKULL_ACH_ID].unlocked = !!(bought || slayer || ACHIEVEMENTS[SKULL_ACH_ID].unlocked);
          if (typeof showCharacterSelectScreen === 'function') showCharacterSelectScreen();
        } catch(e){ console.error(e); }
        return r;
      };
      log('patched checkAchievements');
      return true;
    }
    if (!patchCheckAchievements()) waitFor(() => typeof checkAchievements === 'function', patchCheckAchievements, 8000);

    // ---- character selection click hook (apply / reset visuals quickly when player chooses) ----
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { waitFor(() => !!document.getElementById('characterTilesContainer'), hookCharacterTiles, 8000); return; }
      container.addEventListener('click', (ev) => {
        const tile = ev.target.closest('.character-tile');
        if (!tile) return;
        if (tile.classList.contains('locked')) return;
        // small delay to let main game set equippedCharacterID
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) { applySkullToPlayer(); }
            else { resetSkullFromPlayer(); }
          } catch(e){ console.error(e); }
        }, 8);
      });
      log('character tile click hook installed');
    })();

    // if currently equipped is skull at load, apply visuals
    try { if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) applySkullToPlayer(); } catch (e) {}

    // ---- draw overlay patch: run original draw then draw the skull emoji centered over player (hides feet & direction sprites) ----
    function patchDrawOverlay() {
      if (typeof draw !== 'function') return false;
      const origDraw = draw;
      window.draw = function(...args) {
        // call original draw
        origDraw.apply(this, args);

        try {
          if (player && player._isSkull) {
            // prefer preRenderedEntities for crisp emoji canvas
            const pre = preRenderedEntities && preRenderedEntities[SKULL_EMOJI];
            if (pre && typeof ctx !== 'undefined') {
              ctx.save();
              ctx.drawImage(pre, player.x - pre.width/2, player.y - pre.height/2);
              ctx.restore();
            } else if (typeof ctx !== 'undefined') {
              ctx.save();
              const size = Math.max(18, player.size);
              ctx.font = `${size}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(SKULL_EMOJI, player.x, player.y);
              ctx.restore();
            }
          }
        } catch (e) {
          // swallow so we don't break main loop
          console.error('[SkullPlugin] overlay draw error', e);
        }
      };
      log('patched draw to overlay skull when active (safe)');
      return true;
    }
    if (!patchDrawOverlay()) waitFor(() => typeof draw === 'function', patchDrawOverlay, 8000);

    // ---- create nova of bone projectiles using weaponPool (safe about sprite) ----
    function createSkullNova() {
      try {
        if (!window.weaponPool || !Array.isArray(weaponPool)) return;
        const now = Date.now();
        // optional vengeanceNovas visual if exists
        if (Array.isArray(vengeanceNovas)) vengeanceNovas.push({ x: player.x, y: player.y, startTime: now, duration: 500, maxRadius: 120 });

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
              // we do NOT set a broken sprite here; drawProjectile patch will prefer sprites.bone if valid, else emoji fallback
              break;
            }
          }
        }
        try { if (typeof playSound === 'function') playSound('dodge'); } catch(e){}
      } catch (e) { console.error(e); }
    }

    // patch triggerDash to spawn nova for skull
    function patchTriggerDash() {
      if (typeof triggerDash !== 'function') return false;
      const orig = triggerDash;
      window.triggerDash = function(entity, ...rest) {
        const r = orig.apply(this, [entity, ...rest]);
        try {
          if (entity === player && player._isSkull) createSkullNova();
        } catch(e){ console.error(e); }
        return r;
      };
      log('patched triggerDash to spawn nova when skull dashes');
      return true;
    }
    if (!patchTriggerDash()) waitFor(() => typeof triggerDash === 'function', patchTriggerDash, 8000);

    // ---- drawProjectile override (use bone sprite if fully loaded, otherwise emoji fallback) ----
    (function patchDrawProjectile() {
      if (typeof window.drawProjectile !== 'function') {
        waitFor(() => typeof window.drawProjectile === 'function', patchDrawProjectile, 8000);
        return;
      }
      const origDrawProj = window.drawProjectile;
      window.drawProjectile = function(ctxLocal, proj) {
        try {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
            // If bone sprite loaded and valid -> draw it
            if (sprites.bone && sprites.bone.complete && sprites.bone.naturalWidth > 0) {
              try {
                ctxLocal.drawImage(sprites.bone, proj.x - proj.size/2 - window.cameraOffsetX, proj.y - proj.size/2 - window.cameraOffsetY, proj.size, proj.size);
                return;
              } catch(e) { /* fallback below */ }
            }
            // fallback to pre-rendered bone emoji if available
            if (preRenderedEntities && preRenderedEntities[BONE_EMOJI]) {
              const buf = preRenderedEntities[BONE_EMOJI];
              ctxLocal.drawImage(buf, proj.x - proj.size/2 - window.cameraOffsetX, proj.y - proj.size/2 - window.cameraOffsetY, proj.size, proj.size);
              return;
            }
            // last fallback -> let original draw handle it
          }
        } catch(e){ /* ignore */ }
        // default behavior
        return origDrawProj.call(this, ctxLocal, proj);
      };
      log('patched drawProjectile (safe bone fallback)');
    })();

    // ---- ensure achievement sync periodically (keeps menu consistent) ----
    setInterval(() => {
      try {
        const bought = !!(playerData.unlockedPickups && playerData.unlockedPickups[SKULL_ID]);
        const slayer = !!(ACHIEVEMENTS.slayer && ACHIEVEMENTS.slayer.unlocked);
        if (ACHIEVEMENTS[SKULL_ACH_ID]) ACHIEVEMENTS[SKULL_ACH_ID].unlocked = !!(bought || slayer || ACHIEVEMENTS[SKULL_ACH_ID].unlocked);
      } catch(e){}
    }, 1000);

    // debug API
    window.__skullPlugin = { apply: applySkullToPlayer, reset: resetSkullFromPlayer, nova: createSkullNova, isActive: ()=>!!(player && player._isSkull) };
    log('skull plugin ready (fixed).');
  } // end init
})(); // end IIFE
