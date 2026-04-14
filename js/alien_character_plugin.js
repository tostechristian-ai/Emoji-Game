// ═══════════════════════════════════════════════════════════════════════════
// ALIEN CHARACTER PLUGIN — The Alien 👽
// ═══════════════════════════════════════════════════════════════════════════
// Adds the Alien as a playable character.
//
// How it works:
//   - Uses 👽 emoji as the player sprite
//   - Does NOT shoot guns - relies on abilities
//   - Starts with modified Slime Trail powerup
//   - Slime trail does 0.25 damage pulses to enemies inside it
//   - Shows green damage numbers for slime damage
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

  function log(...s) { try { console.log('[AlienPlugin]', ...s); } catch (e) {} }

  waitFor(
    () => typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' &&
          typeof startGame !== 'undefined' && typeof playerData !== 'undefined' &&
          typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' &&
          typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined',
    init, 8000
  );

  function init() {
    log('Initializing alien character plugin...');

    // ─── CONSTANTS ────────────────────────────────────────────────────────
    const ALIEN_ID      = 'alien';
    const ALIEN_EMOJI   = '👽';
    const ALIEN_SIZE    = 35;
    const ALIEN_COST    = 600;
    const SLIME_DAMAGE  = 0.25;
    const SLIME_DAMAGE_INTERVAL = 500; // ms between damage pulses

    // ─── REGISTER CHARACTER ───────────────────────────────────────────────
    if (!CHARACTERS[ALIEN_ID]) {
      CHARACTERS[ALIEN_ID] = {
        id: ALIEN_ID,
        name: 'The Alien',
        emoji: ALIEN_EMOJI,
        description: 'A mysterious being from beyond the stars.',
        perk: 'Slime trail does damage over time. No gun shooting.',
        unlockCondition: { type: 'store' } // Bought in upgrade shop
      };
    }

    // Register in the upgrade shop
    if (!UNLOCKABLE_PICKUPS[ALIEN_ID]) {
      UNLOCKABLE_PICKUPS[ALIEN_ID] = {
        name: 'The Alien',
        desc: 'Unlocks the Alien. Slime trail damages enemies, no gun.',
        cost: ALIEN_COST,
        icon: ALIEN_EMOJI
      };
    }

    // Pre-render the alien emoji for fast drawing
    try { preRenderEmoji(ALIEN_EMOJI, ALIEN_SIZE); } catch (e) {}

    // ─── APPLY / RESET ALIEN STATS ───────────────────────────────────────────

    // Track enemies damaged by slime for this frame to avoid double damage
    let _alienSlimeDamagedEnemies = new Set();
    let _lastAlienSlimeDamageTime = 0;

    // Apply Alien-specific setup to the player
    function applyAlienToPlayer() {
      if (!player) return;
      player._isAlien = true;
      player._disableGun = true; // Flag to disable gun shooting

      // Activate puddle trail for free (the alien's core ability)
      window._alien_puddleWasActive = puddleTrailActive;
      puddleTrailActive = true;

      log('Alien applied with damaging slime trail.');
    }

    // Restore original state when switching away from Alien
    function resetAlienFromPlayer() {
      if (!player || !player._isAlien) return;
      player._isAlien = false;
      player._disableGun = false;

      // Only turn off puddle trail if it wasn't already active before
      if (!window._alien_puddleWasActive) {
        puddleTrailActive = false;
      }

      log('Alien removed.');
    }

    // ─── PATCH startGame ──────────────────────────────────────────────────
    // Re-apply alien setup after startGame() resets the player
    (function patchStartGame() {
      if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
      const orig = window.startGame;
      window.startGame = async function (...args) {
        await orig.apply(this, args);
        try {
          if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === ALIEN_ID) {
            applyAlienToPlayer();
            if (typeof updatePowerupIconsUI === 'function') updatePowerupIconsUI();
          }
        } catch (e) { console.error('[AlienPlugin] startGame error:', e); }
      };
    })();

    // ─── HOOK CHARACTER TILE CLICKS ───────────────────────────────────────
    // Apply or remove alien setup when the player selects/deselects
    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', () => {
        setTimeout(() => {
          try {
            if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === ALIEN_ID) {
              applyAlienToPlayer();
            } else {
              resetAlienFromPlayer();
            }
          } catch (e) {}
        }, 50);
      });
    })();

    // ─── PATCH WEAPON FIRING ──────────────────────────────────────────────
    // Disable gun firing for alien character
    (function patchWeaponFiring() {
      if (typeof createWeapon !== 'function') { setTimeout(patchWeaponFiring, 100); return; }
      const orig = window.createWeapon;
      window.createWeapon = function(source, angle, isSecondShot = false, isDelayed = false, preCreatedWeapon = null) {
        // If player is alien, don't create gun bullets
        if (player && player._isAlien && source === player) {
          return null; // Don't fire gun bullets
        }
        return orig.call(this, source, angle, isSecondShot, isDelayed, preCreatedWeapon);
      };
      log('createWeapon() patched for Alien (gun disabled).');
    })();

    // ─── PATCH PUDDLE DAMAGE SYSTEM ───────────────────────────────────────
    // Add damage to enemies in slime puddles for alien
    (function patchUpdate() {
      if (typeof update !== 'function') { setTimeout(patchUpdate, 100); return; }
      
      // Hook into the enemy update loop to apply slime damage
      const originalUpdate = window.update;
      window.update = function() {
        // Call original update
        originalUpdate.apply(this, arguments);
        
        // Apply alien slime damage
        if (player && player._isAlien && puddleTrailActive && enemies) {
          const now = Date.now();
          
          // Only apply damage every SLIME_DAMAGE_INTERVAL
          if (now - _lastAlienSlimeDamageTime >= SLIME_DAMAGE_INTERVAL) {
            _lastAlienSlimeDamageTime = now;
            _alienSlimeDamagedEnemies.clear();
            
            // Check each enemy against all player puddles
            for (const enemy of enemies) {
              if (enemy.isHit || _alienSlimeDamagedEnemies.has(enemy)) continue;
              
              for (const puddle of playerPuddles) {
                const dx = enemy.x - puddle.x;
                const dy = enemy.y - puddle.y;
                const combinedRadius = (enemy.size / 2) + (puddle.size / 2);
                
                if (dx*dx + dy*dy < combinedRadius*combinedRadius) {
                  // Enemy is in slime - apply damage
                  enemy.health -= SLIME_DAMAGE;
                  _alienSlimeDamagedEnemies.add(enemy);
                  
                  // Show green damage number
                  if (typeof floatingTexts !== 'undefined') {
                    floatingTexts.push({
                      text: SLIME_DAMAGE.toFixed(2),
                      x: enemy.x,
                      y: enemy.y - enemy.size / 2,
                      startTime: now,
                      duration: 600,
                      color: '#00FF00', // Green damage number
                      fontSize: 12
                    });
                  }
                  
                  // Check if enemy died
                  if (enemy.health <= 0 && typeof handleEnemyDeath === 'function') {
                    handleEnemyDeath(enemy);
                  }
                  
                  break; // Enemy can only be damaged by one puddle per interval
                }
              }
            }
          }
        }
      };
      log('update() patched for Alien slime damage.');
    })();

    // ─── PATCH PLAYER RENDERING ───────────────────────────────────────────
    // Add alien rendering to the draw function
    (function patchDraw() {
      if (typeof draw !== 'function') { setTimeout(patchDraw, 100); return; }
      
      // Hook into the existing draw function by looking for the player sprite drawing
      const originalDraw = window.draw;
      window.draw = function() {
        // Call original draw first
        originalDraw.apply(this, arguments);
        
        // Note: The alien rendering is handled in the main render via _isAlien flag
        // This patch is here in case we need custom rendering
      };
      
      log('draw() patched for Alien rendering.');
    })();

    // ─── ADD ALIEN TO RENDER CODE ─────────────────────────────────────────
    // Add alien rendering to game_render.js via monkey-patch on player render section
    (function addAlienToRender() {
      // Wait for render code to be available
      if (typeof ctx === 'undefined') { setTimeout(addAlienToRender, 100); return; }
      
      // Patch will be applied in the render loop via the _isAlien flag
      // The main render code checks player._isAlien similar to other characters
      const checkRender = setInterval(() => {
        try {
          // Inject alien rendering into the player sprite selection
          if (typeof player !== 'undefined' && player._isAlien) {
            // This will be handled by modifying the render code directly
            // For now, we rely on the existing character sprite override pattern
          }
        } catch (e) { clearInterval(checkRender); }
      }, 100);
      
      setTimeout(() => clearInterval(checkRender), 5000);
    })();

    log('Alien plugin ready.');
  }
})();
