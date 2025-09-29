// skullCharacter.js
(function () {
  // Make sure Skull exists in CHARACTERS
  if (window.CHARACTERS && window.CHARACTERS.skull) {
    // Change its unlockCondition so it's either coins OR achievement
    window.CHARACTERS.skull.unlockCondition = { type: "multi", conditions: [
      { type: "pickup", id: "skull" },       // purchasable in shop
      { type: "achievement", id: "slayer" }  // Slayer achievement
    ]};
  }

  // Add Skull to unlockable pickups (coins purchase)
  if (!window.UNLOCKABLE_PICKUPS) window.UNLOCKABLE_PICKUPS = {};
  if (!window.UNLOCKABLE_PICKUPS.skull) {
    UNLOCKABLE_PICKUPS.skull = {
      name: "Unlock Skeleton",
      desc: "💀 The Skeleton. Fires 🦴 bones instead of bullets.",
      cost: 1000, // coin cost
      icon: "💀"
    };
  }

  // === Equip / Unequip Logic ===
  function applySkullEquip(player) {
    player.customEmoji = "💀";
    preRenderEmoji("💀", player.size);

    // Load bone sprite if not loaded
    if (!sprites.bone) {
      const boneImg = new Image();
      boneImg.src = "sprites/bone.png"; // <-- put this in your sprites folder
      boneImg.onload = () => (sprites.bone = boneImg);
    }

    window.PROJECTILE_EMOJI = "🦴";
    preRenderEmoji("🦴", 16);

    player.speed = player.originalPlayerSpeed * 0.95;
    player.damageMultiplier = 1.25;
  }

  function resetSkullEquip(player) {
    player.customEmoji = null;
    window.PROJECTILE_EMOJI = null;
    if (sprites.bullet) {
      player.projectileSprite = sprites.bullet;
    }
    player.speed = player.originalPlayerSpeed;
    player.damageMultiplier = 1;
  }

  // === Draw Overrides ===
  const originalDrawPlayer = window.drawPlayer;
  window.drawPlayer = function (ctx, playerObj) {
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

  // === Listen for Equip Events ===
  document.addEventListener("characterEquipped", (e) => {
    if (e.detail.characterId === "skull") {
      applySkullEquip(window.player);
    } else {
      resetSkullEquip(window.player);
    }
  });
})();
