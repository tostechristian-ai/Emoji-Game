// skullCharacter.js - V-spread bones + 6-bone dash nova (TIMER-BASED)
(function() {
  'use strict';

  function waitFor(cond, cb, timeout = 8000, interval = 40) {
    const start = Date.now();
    const t = setInterval(() => {
      try {
        if (cond()) {
          clearInterval(t);
          cb();
        } else if (Date.now() - start > timeout) {
          clearInterval(t);
        }
      } catch (e) {
        clearInterval(t);
      }
    }, interval);
  }

  function log(...s) {
    try {
      console.log('[SkullPlugin]', ...s);
    } catch (e) {}
  }

  waitFor(() => (typeof CHARACTERS !== 'undefined' && typeof UNLOCKABLE_PICKUPS !== 'undefined' && typeof ACHIEVEMENTS !== 'undefined' && typeof startGame !== 'undefined' && typeof playerData !== 'undefined' && typeof sprites !== 'undefined' && typeof preRenderEmoji !== 'undefined' && typeof preRenderedEntities !== 'undefined' && typeof draw !== 'undefined' && typeof handleGamepadInput !== 'undefined'), init, 8000);

  function init() {
    log('Initializing skull character plugin (Timer-Based Nova)...');

    const SKULL_ID = 'skull';
    const SKULL_ACH_ID = 'slayer';
    const SKULL_EMOJI = '💀';
    const BONE_EMOJI = '🦴';
    const BONE_SPIN_SPEED = 0.25;
    const NOVA_COUNT = 6;
    const NOVA_SPEED = 6.0;
    const NOVA_SIZE = 12;
    const NOVA_LIFE = 1500;
    
    const SKULL_RENDER_SIZE = 28;
    const BONE_RENDER_SIZE = 12;
    
    // ================== NEW MECHANIC STATE ==================
    let lastNovaTime = 0;
    // ========================================================

    if (!CHARACTERS[SKULL_ID]) {
      CHARACTERS[SKULL_ID] = {
        id: SKULL_ID,
        name: 'The Skeleton',
        emoji: SKULL_EMOJI,
        perk: 'V-spread bones (0.5x dmg) + 6-bone dash nova.',
        unlockCondition: { type: 'achievement', id: SKULL_ACH_ID }
      };
    } else {
        CHARACTERS[SKULL_ID].name = 'The Skeleton';
        CHARACTERS[SKULL_ID].unlockCondition = { type: 'achievement', id: SKULL_ACH_ID };
        CHARACTERS[SKULL_ID].emoji = SKULL_EMOJI;
        CHARACTERS[SKULL_ID].perk = 'V-spread bones (0.5x dmg) + 6-bone dash nova.';
    }

    if (!UNLOCKABLE_PICKUPS[SKULL_ID]) {
        UNLOCKABLE_PICKUPS[SKULL_ID] = {
            name: 'The Skeleton',
            desc: 'Unlocks the Skeleton character.',
            cost: 500,
            icon: SKULL_EMOJI
        };
    }
    
    try {
      preRenderEmoji(BONE_EMOJI, BONE_RENDER_SIZE);
      preRenderEmoji(SKULL_EMOJI, SKULL_RENDER_SIZE);
    } catch (e) {}

    if (!sprites._backup_bullet && sprites.bullet) {
      sprites._backup_bullet = sprites.bullet;
    }

    function applySkullToPlayer() {
      if (!player) return;
      player._isSkull = true;
      if (player._skull_damage_backup === undefined) player._skull_damage_backup = player.damageMultiplier;
      if (player._skull_vshape_backup === undefined) player._skull_vshape_backup = window.vShapeProjectileLevel || 0;
      player.damageMultiplier = player._skull_damage_backup * 0.5;
      if (typeof window.vShapeProjectileLevel !== 'undefined') {
        window.vShapeProjectileLevel = Math.max(1, player._skull_vshape_backup);
      }
      log('Skull stats applied: 0.5x damage, V-spread enabled.');
    }

    function resetSkullFromPlayer() {
      if (!player || !player._isSkull) return;
      player._isSkull = false;
      if (sprites._backup_bullet) sprites.bullet = sprites._backup_bullet;
      if (player._skull_damage_backup !== undefined) {
        player.damageMultiplier = player._skull_damage_backup;
        delete player._skull_damage_backup;
      }
      if (player._skull_vshape_backup !== undefined) {
        if (typeof window.vShapeProjectileLevel !== 'undefined') {
          window.vShapeProjectileLevel = player._skull_vshape_backup;
        }
        delete player._skull_vshape_backup;
      }
      log('Skull stats removed.');
    }

    (function patchStartGame() {
        if (typeof startGame !== 'function') { setTimeout(patchStartGame, 100); return; }
        const orig_startGame = window.startGame;
        window.startGame = async function(...args) {
            await orig_startGame.apply(this, args);
            try {
                if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
                    log('Game started with Skull. Re-applying custom stats...');
                    applySkullToPlayer();
                }
            } catch (e) {
                console.error('[SkullPlugin] Error in startGame patch:', e);
            }
        };
        log('startGame() patched to apply Skull stats after player reset.');
    })();
    
    (function patchBuyUnlockable() {
      if (typeof buyUnlockable !== 'function') { setTimeout(patchBuyUnlockable, 100); return; }
      const orig = buyUnlockable;
      window.buyUnlockable = function(key, ...rest) {
        if (key === SKULL_ID) { if (ACHIEVEMENTS[SKULL_ACH_ID]) ACHIEVEMENTS[SKULL_ACH_ID].unlocked = true; }
        return orig.call(this, key, ...rest);
      };
    })();

    (function hookCharacterTiles() {
      const container = document.getElementById('characterTilesContainer');
      if (!container) { setTimeout(hookCharacterTiles, 100); return; }
      container.addEventListener('click', (ev) => {
        setTimeout(() => {
            try {
                if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
                    applySkullToPlayer();
                } else {
                    resetSkullFromPlayer();
                }
            } catch (e) {}
        }, 50);
      });
    })();
    
    try {
      if (typeof equippedCharacterID !== 'undefined' && equippedCharacterID === SKULL_ID) {
        applySkullToPlayer();
      }
    } catch (e) {}

    (function patchDraw() {
      if (typeof draw !== 'function') { setTimeout(patchDraw, 100); return; }
      const origDraw = window.draw;
      window.draw = function(...args) {
        if (!player || !player._isSkull || !gameActive) {
          origDraw.apply(this, args);
          return;
        }
        const activeWeapons = weaponPool.filter(w => w.active);
        const weaponStates = activeWeapons.map(w => ({ weapon: w, active: w.active }));
        activeWeapons.forEach(w => w.active = false);
        const originalPlayerPos = { x: player.x, y: player.y };
        player.x = -2000;
        player.y = -2000;
        origDraw.apply(this, args);
        player.x = originalPlayerPos.x;
        player.y = originalPlayerPos.y;
        weaponStates.forEach(state => state.weapon.active = state.active);
        const now = Date.now();
        let currentHitShakeX = 0, currentHitShakeY = 0;
        if (typeof isPlayerHitShaking !== 'undefined' && isPlayerHitShaking) {
            const elapsedTime = now - playerHitShakeStartTime;
            if (elapsedTime < PLAYER_HIT_SHAKE_DURATION) {
                const shakeIntensity = MAX_PLAYER_HIT_SHAKE_OFFSET * (1 - (elapsedTime / PLAYER_HIT_SHAKE_DURATION));
                currentHitShakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
                currentHitShakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
            }
        }
        let finalCameraOffsetX = cameraOffsetX - currentHitShakeX;
        let finalCameraOffsetY = cameraOffsetY - currentHitShakeY;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(cameraZoom, cameraZoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
        try {
            const pre = preRenderedEntities && preRenderedEntities[SKULL_EMOJI];
            if (pre) {
                const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase) * BOB_AMPLITUDE;
                ctx.save();
                ctx.translate(player.x, player.y + bobOffset);
                if (player.isDashing && player.spinStartTime) {
                    const spinProgress = (Date.now() - player.spinStartTime) / 500;
                    ctx.rotate(spinProgress * 2.1 * Math.PI * player.spinDirection);
                }
                ctx.drawImage(pre, -SKULL_RENDER_SIZE / 2, -SKULL_RENDER_SIZE / 2, SKULL_RENDER_SIZE, SKULL_RENDER_SIZE);
                ctx.restore();
            }
        } catch (e) { console.error('[SkullPlugin] skull draw error', e); }
        const boneCanvas = preRenderedEntities[BONE_EMOJI];
        if (boneCanvas) {
            for (const proj of activeWeapons) {
                proj.spinAngle = (proj.spinAngle || 0) + BONE_SPIN_SPEED;
                ctx.save();
                ctx.translate(proj.x, proj.y);
                ctx.rotate(proj.spinAngle);
                ctx.drawImage(boneCanvas, -BONE_RENDER_SIZE / 2, -BONE_RENDER_SIZE / 2, BONE_RENDER_SIZE, BONE_RENDER_SIZE);
                ctx.restore();
            }
        }
        ctx.restore();
      };
    })();

    function createSkullNova() {
      try {
        if (!window.weaponPool || !window.player) {
          log('Nova failed: weaponPool or player not found.');
          return;
        }
        let bonesCreated = 0;
        for (let i = 0; i < NOVA_COUNT; i++) {
          const angle = (i / NOVA_COUNT) * Math.PI * 2;
          const weapon = weaponPool.find(w => !w.active);
          if (weapon) {
              weapon.x = player.x;
              weapon.y = player.y;
              weapon.size = NOVA_SIZE * player.projectileSizeMultiplier;
              weapon.speed = NOVA_SPEED * player.projectileSpeedMultiplier;
              weapon.angle = angle;
              weapon.dx = Math.cos(angle) * weapon.speed;
              weapon.dy = Math.sin(angle) * weapon.speed;
              weapon.lifetime = Date.now() + NOVA_LIFE;
              weapon.hitsLeft = 1;
              weapon.hitEnemies = weapon.hitEnemies || [];
              weapon.hitEnemies.length = 0;
              weapon.active = true;
              weapon.spinAngle = angle;
              bonesCreated++;
          }
        }
        if (bonesCreated > 0) {
          log(`✓ Fired ${bonesCreated}/${NOVA_COUNT} nova bones.`);
          if (typeof playSound === 'function') playSound('playerShoot');
        } else {
          log('✗ No inactive weapons available for nova.');
        }
      } catch (e) {
        console.error('[SkullPlugin] Nova creation error:', e);
      }
    }

    // ================================================================================= //
    // ====================== NEW NOVA TRIGGER LOGIC (TIMER-BASED) ===================== //
    // ================================================================================= //

    // This is the central function for the new nova mechanic. It checks the cooldown and fires.
    function tryFireSkullNova() {
        if (!gameActive || !player || !player._isSkull) return; // Safety checks

        const now = Date.now();
        // Check for the dash cooldown upgrade and adjust the nova cooldown accordingly.
        const cooldown = (playerData && playerData.hasReducedDashCooldown) ? 1500 : 3000;

        if (now - lastNovaTime >= cooldown) {
            log('Nova cooldown ready. Firing!');
            createSkullNova();
            lastNovaTime = now;
        } else {
            log('Nova on cooldown.');
        }
    }

    // 1. Hook for Mouse Clicks
    (function hookCanvasClick() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) { setTimeout(hookCanvasClick, 100); return; }
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Only for left click
                tryFireSkullNova();
            }
        });
        log('Canvas mousedown hooked for Skull Nova.');
    })();

    // 2. Hook for Mobile Double-Taps
    (function hookTouch() {
        let lastTapTime = 0;
        const firestickBase = document.getElementById('fire-stick-base');
        if (!firestickBase) { setTimeout(hookTouch, 100); return; }

        document.body.addEventListener('touchstart', (e) => {
            if (!gameActive || gamePaused || gameOver) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const fireRect = firestickBase.getBoundingClientRect();
                if (touch.clientX > fireRect.left && touch.clientX < fireRect.right && touch.clientY > fireRect.top && touch.clientY < fireRect.bottom) {
                    const now = Date.now();
                    if (now - lastTapTime < 300) { // Double tap detection
                        tryFireSkullNova();
                    }
                    lastTapTime = now;
                }
            }
        }, { passive: false });
        log('Body touchstart hooked for Skull Nova.');
    })();

    // 3. Hook for Gamepad Input
    (function patchGamepadInput() {
        if (typeof handleGamepadInput !== 'function') { setTimeout(patchGamepadInput, 100); return; }
        const orig_handleGamepadInput = window.handleGamepadInput;

        window.handleGamepadInput = function(...args) {
            orig_handleGamepadInput.apply(this, args); // Run original logic first

            try {
                if (gamepadIndex == null) return;
                const gp = navigator.getGamepads?.()[gamepadIndex];
                if (!gp) return;

                const pressed = (i) => !!gp.buttons?.[i]?.pressed;
                if (pressed(7) && !gp._skullNovaLatch) { // Right Trigger
                    gp._skullNovaLatch = true; // Use our own latch to fire only once per press
                    tryFireSkullNova();
                } else if (!pressed(7)) {
                    gp._skullNovaLatch = false;
                }
            } catch(e) { /* ignore errors */ }
        };
        log('handleGamepadInput() patched for Skull Nova.');
    })();

    log('Skull plugin ready - All features enabled!');
  }
})();
