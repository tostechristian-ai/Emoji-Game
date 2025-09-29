// skullCharacter.js
(function () {
  // === Unlock Conditions ===
  if (window.CHARACTERS && window.CHARACTERS.skull) {
    window.CHARACTERS.skull.unlockCondition = { type: "multi", conditions: [
      { type: "pickup", id: "skull" },
      { type: "achievement", id: "slayer" }
    ]};
  }

  if (!window.UNLOCKABLE_PICKUPS) window.UNLOCKABLE_PICKUPS = {};
  if (!window.UNLOCKABLE_PICKUPS.skull) {
    UNLOCKABLE_PICKUPS.skull = {
      name: "Unlock Skeleton",
      desc: "💀 Fires 🦴 bones. Dodge unleashes a nova of bones.",
      cost: 1000,
      icon: "💀"
    };
  }

  // === Equip / Unequip ===
  function applySkullEquip(player) {
    player.customEmoji = "💀";
    preRenderEmoji("💀", player.size);

    // Load bone sprite
    if (!sprites.bone) {
      const boneImg = new Image();
      boneImg.src = "sprites/bone.png";
      boneImg.onload = () => (sprites.bone = boneImg);
    }

    window.PROJECTILE_EMOJI = "🦴";
    preRenderEmoji("🦴", 16);

    player.dodgeLogic = skullNovaDodge;

    player.speed = player.originalPlayerSpeed * 0.95;
    player.damageMultiplier = 1.25;
  }

  function resetSkullEquip(player) {
    player.customEmoji = null;
    window.PROJECTILE_EMOJI = null;
    player.dodgeLogic = null;

    if (sprites.bullet) {
      player.projectileSprite = sprites.bullet;
    }
    player.speed = player.originalPlayerSpeed;
    player.damageMultiplier = 1;
  }

  // === Dodge: Nova of Bones ===
  function skullNovaDodge(player) {
    const NUM_BONES = 12;
    const SPEED = 5;
    const now = Date.now();

    for (let i = 0; i < NUM_BONES; i++) {
      const angle = (i / NUM_BONES) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      const proj = {
        active: true,
        x: player.x,
        y: player.y,
        dx: dx * SPEED,
        dy: dy * SPEED,
        size: 16,
        damage: 1 * player.damageMultiplier,
        lifetime: now + 2000,
        emoji: "🦴",
        sprite: sprites.bone || null,
        hitEnemies: []
      };

      if (window.weaponPool) {
        const slot = weaponPool.find(w => !w.active);
        if (slot) Object.assign(slot, proj);
        else projectiles.push(proj);
      } else {
        if (!window.projectiles) window.projectiles = [];
        projectiles.push(proj);
      }
    }
  }

  // === Draw Overrides ===
  const originalDrawPlayer = window.drawPlayer;
  window.drawPlayer = function (ctx, playerObj) {
    // Skip feet if Skull equipped
    if (window.equippedCharacterID === "skull") {
      if (playerObj.customEmoji) {
        const buffer = preRenderedEntities[playerObj.customEmoji];
        if (buffer) {
          ctx.drawImage(
            buffer,
            playerObj.x - playerObj.size / 2 - window.cameraOffsetX,
            playerObj.y - playerObj.size / 2 - window.cameraOffsetY,
            playerObj.size,
            playerObj.size
          );
          return;
        }
      }
    }
    // Fallback = original drawing (includes cowboy + feet)
    if (originalDrawPlayer) originalDrawPlayer(ctx, playerObj);
  };

  const originalDrawProjectile = window.drawProjectile;
  window.drawProjectile = function (ctx, proj) {
    if (window.equippedCharacterID === "skull") {
      if (sprites.bone) {
        ctx.drawImage(
          sprites.bone,
          proj.x - proj.size / 2 - window.cameraOffsetX,
          proj.y - proj.size / 2 - window.cameraOffsetY,
          proj.size,
          proj.size
        );
        return;
      } else if (preRenderedEntities["🦴"]) {
        ctx.drawImage(
          preRenderedEntities["🦴"],
          proj.x - proj.size / 2 - window.cameraOffsetX,
          proj.y - proj.size / 2 - window.cameraOffsetY,
          proj.size,
          proj.size
        );
        return;
      }
    }
    if (originalDrawProjectile) originalDrawProjectile(ctx, proj);
  };

  // === Equip Listener ===
  document.addEventListener("characterEquipped", (e) => {
    if (e.detail.characterId === "skull") {
      applySkullEquip(window.player);
    } else {
      resetSkullEquip(window.player);
    }
  });
})();
