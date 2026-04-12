// Merchant UI + powerup activation (kept separate from the main sim/render loop).

function closeMerchantShop() {
  merchantShop.style.display = 'none';
  gamePaused = false;
  // The merchant is now removed upon collision, not when closing the shop.
}

function showMerchantShop() {
  gamePaused = true;
  merchantOptionsContainer.innerHTML = '';
  playUISound('levelUp');

  const coinCost = 50 + Math.floor(player.level * 5);
  const allOptions = [];

  // ── Apple trades ──────────────────────────────────────────────────────────
  if (player.appleCount >= 3) {
    allOptions.push({
      type: 'xp_for_apples', name: 'Gain Experience',
      desc: 'Trade 3 apples for a full level of XP.', icon: '📈',
      cost: 3, currency: 'apples', xpAmount: player.xpToNextLevel,
      enabled: true
    });
  }
  if (player.appleCount >= 2) {
    allOptions.push({
      type: 'heal_for_apples', name: 'Restore Health',
      desc: 'Trade 2 apples to fully heal.', icon: '❤️‍🩹',
      cost: 2, currency: 'apples', enabled: player.lives < player.maxLives
    });
  }

  // ── Coin trades ───────────────────────────────────────────────────────────
  allOptions.push({
    type: 'xp_for_coins', name: 'Buy Experience',
    desc: 'Spend coins for a burst of XP.', icon: '⭐',
    cost: coinCost, currency: 'coins',
    xpAmount: Math.floor(player.xpToNextLevel * 0.5),
    enabled: player.coins >= coinCost
  });

  if (player.lives < player.maxLives) {
    const healCost = Math.floor(coinCost * 0.8);
    allOptions.push({
      type: 'heal_for_coins', name: 'Buy Health',
      desc: 'Spend coins to restore 1 heart.', icon: '❤️',
      cost: healCost, currency: 'coins', enabled: player.coins >= healCost
    });
  }

  // Temp fire rate boost
  if (!fireRateBoostActive) {
    const boostCost = Math.floor(coinCost * 0.6);
    allOptions.push({
      type: 'fire_boost', name: 'Fire Rate Boost',
      desc: 'Double fire rate for 10 seconds.', icon: '🔥',
      cost: boostCost, currency: 'coins', enabled: player.coins >= boostCost
    });
  }

  // ── Powerups ──────────────────────────────────────────────────────────────
  const powerupPool = [
    { id: 'magnetic_projectile',  name: 'Magnetic Shots',    icon: '🧲', active: magneticProjectileActive },
    { id: 'explosive_bullets',    name: 'Explosive Bullets', icon: '💥', active: explosiveBulletsActive },
    { id: 'ricochet',             name: 'Ricochet Shots',    icon: '🔄', active: ricochetActive },
    { id: 'sword',                name: 'Auto-Sword',        icon: '🗡️', active: player.swordActive },
    { id: 'ice_projectile',       name: 'Ice Projectiles',   icon: '❄️', active: iceProjectileActive },
    { id: 'puddle_trail',         name: 'Slime Trail',       icon: '💧', active: puddleTrailActive },
    { id: 'auto_aim',             name: 'Auto-Aim',          icon: '🎯', active: autoAimActive },
    { id: 'dual_gun',             name: 'Dual Gun',          icon: '🔫', active: dualGunActive },
    { id: 'bomb',                 name: 'Bomb Emitter',      icon: '💣', active: bombEmitterActive },
    { id: 'orbiter',              name: 'Spinning Orbiter',  icon: '💫', active: orbitingPowerUpActive },
    { id: 'circle',               name: 'Damaging Circle',   icon: '⭕', active: damagingCircleActive,   locked: !playerData.unlockedPickups.circle },
    { id: 'lightning_projectile', name: 'Lightning Bolt',    icon: '⚡', active: lightningProjectileActive },
    { id: 'flaming_bullets',      name: 'Flaming Bullets',   icon: '🔥', active: flamingBulletsActive,  locked: !playerData.unlockedPickups.flaming_bullets },
    { id: 'laser_pointer',        name: 'Laser Pointer',     icon: '🔴', active: laserPointerActive },
    { id: 'flamethrower',         name: 'Flamethrower',      icon: '🔥', active: flamethrowerActive },
    { id: 'laser_cannon',         name: 'Laser Cannon',      icon: '🟢', active: laserCannonActive },
    { id: 'ice_shard_cannon',     name: 'Ice Shard Cannon',  icon: '❄️', active: iceShardCannonActive },
    { id: 'v_shape_projectile',   name: 'V-Shape Shots',     icon: '🕊️', active: vShapeProjectileLevel >= 4 },
    { id: 'rocket_launcher',      name: 'Heavy Shells',      icon: '🚀', active: rocketLauncherActive,  locked: !playerData.unlockedPickups.rocket_launcher },
    { id: 'doppelganger',         name: 'Doppelganger',      icon: '👯', active: doppelgangerActive,    locked: !playerData.unlockedPickups.doppelganger },
    { id: 'temporal_ward',        name: 'Temporal Ward',     icon: '⏱️', active: temporalWardActive,    locked: !playerData.unlockedPickups.temporal_ward },
    { id: 'lightning_strike',     name: 'Lightning Strike',  icon: '⚡', active: lightningStrikeActive },
    { id: 'dog_companion',        name: 'Dog Companion',     icon: '🐶', active: dogCompanionActive,    locked: !playerData.unlockedPickups.dog_companion },
    { id: 'night_owl',            name: 'Night Owl',         icon: '🦉', active: nightOwlActive,        locked: !playerData.unlockedPickups.night_owl },
    { id: 'vengeance_nova',       name: 'Vengeance Nova',    icon: '🛡️', active: vengeanceNovaActive,   locked: !playerData.unlockedPickups.vengeance_nova },
    { id: 'anti_gravity',         name: 'Anti-Gravity',      icon: '💨', active: antiGravityActive,     locked: !playerData.unlockedPickups.anti_gravity },
    { id: 'black_hole',           name: 'Black Hole',        icon: '⚫', active: blackHoleActive,       locked: !playerData.unlockedPickups.black_hole },
    { id: 'whirlwind_axe',        name: 'Whirlwind Axe',     icon: '🪓', active: whirlwindAxeActive,    locked: !playerData.unlockedPickups.whirlwind_axe },
  ];

  // Shuffle and pick up to 4 available (not already active, not locked)
  const available = powerupPool.filter(p => !p.active && !p.locked);
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  available.slice(0, 4).forEach(p => {
    const cost = coinCost + Math.floor(Math.random() * 20) - 10; // slight price variation
    allOptions.push({
      type: 'buy_powerup', name: p.name,
      desc: 'A powerful artifact from the merchant\'s pack.', icon: p.icon,
      cost, currency: 'coins', powerupId: p.id,
      enabled: player.coins >= cost
    });
  });

  // ── Shuffle all options and pick 3 to show ────────────────────────────────
  for (let i = allOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
  }
  const shown = allOptions.slice(0, 3);

  // ── Build cards ───────────────────────────────────────────────────────────
  shown.forEach((option) => {
    const card = document.createElement('div');
    card.className = 'merchant-card';
    card.innerHTML = `
      <div class="merchant-icon">${option.icon}</div>
      <h3>${option.name}</h3>
      <p>${option.desc}</p>
      <div class="cost">${option.cost} ${option.currency === 'apples' ? '🍎' : '🪙'}</div>
    `;
    if (!option.enabled) {
      card.style.opacity = '0.5';
      card.style.cursor = 'not-allowed';
    } else {
      card.onclick = () => purchaseFromMerchant(option);
      card.addEventListener('mouseover', () => playUISound('uiClick'));
    }
    merchantOptionsContainer.appendChild(card);
  });

  merchantShop.style.display = 'flex';
}

function purchaseFromMerchant(option) {
  playUISound('levelUpSelect');
  vibrate(20);

  if (option.type === 'xp_for_apples') {
    player.appleCount -= option.cost;
    player.xp += option.xpAmount;
    floatingTexts.push({ text: `+${option.xpAmount} XP!`, x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500, color: '#00c6ff' });
    if (player.xp >= player.xpToNextLevel) { setTimeout(() => levelUp(), 200); }
  } else if (option.type === 'heal_for_apples') {
    player.appleCount -= option.cost;
    player.lives = player.maxLives;
    updateUIStats();
    floatingTexts.push({ text: 'Full Heal!', x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500, color: '#ff4444' });
  } else if (option.type === 'xp_for_coins') {
    player.coins -= option.cost;
    player.xp += option.xpAmount;
    floatingTexts.push({ text: `+${option.xpAmount} XP!`, x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500, color: '#00c6ff' });
    if (player.xp >= player.xpToNextLevel) { setTimeout(() => levelUp(), 200); }
  } else if (option.type === 'heal_for_coins') {
    player.coins -= option.cost;
    if (player.lives < player.maxLives) player.lives++;
    updateUIStats();
    floatingTexts.push({ text: '+❤️', x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500, color: '#ff4444' });
  } else if (option.type === 'fire_boost') {
    player.coins -= option.cost;
    fireRateBoostActive = true;
    fireRateBoostEndTime = Date.now() + 10000;
    floatingTexts.push({ text: 'Fire Rate Boost!', x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500, color: '#ff8800' });
  } else if (option.type === 'buy_powerup') {
    player.coins -= option.cost;
    activatePowerup(option.powerupId);
    floatingTexts.push({ text: `${option.name}!`, x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500 });
  }

  if (option.type !== 'xp_for_apples' && option.type !== 'xp_for_coins' || player.xp < player.xpToNextLevel) {
    closeMerchantShop();
  }
}

// Helper function to consolidate powerup activation logic
function activatePowerup(id) {
  if (id === 'doppelganger') {
    doppelgangerActive = true; runStats.lastDoppelgangerStartTime = Date.now();
    doppelganger = {
      x: player.x - player.size * 2, y: player.y, size: player.size,
      rotationAngle: 0, lastFireTime: 0, endTime: Date.now() + DOPPELGANGER_DURATION
    };
  }
  else if (id === 'dash_invincibility') { hasDashInvincibility = true; }
  else if (id === 'dash_cooldown') { playerData.hasReducedDashCooldown = true; player.dashCooldown = 3000; savePlayerData(); }
  else if (id === 'temporal_ward') temporalWardActive = true;
  else if (id === 'bomb') { bombEmitterActive = true; lastBombEmitMs = Date.now(); }
  else if (id === 'orbiter') { orbitingPowerUpActive = true; player.orbitAngle = 0; }
  else if (id === 'circle') { damagingCircleActive = true; lastDamagingCircleDamageTime = Date.now(); }
  else if (id === 'lightning_projectile') { lightningProjectileActive = true; lastLightningSpawnTime = Date.now(); }
  else if (id === 'magnetic_projectile') magneticProjectileActive = true;
  else if (id === 'v_shape_projectile') vShapeProjectileLevel = Math.min(4, vShapeProjectileLevel + 1);
  else if (id === 'sword') { player.swordActive = true; player.lastSwordSwingTime = Date.now() - SWORD_SWING_INTERVAL; }
  else if (id === 'ice_projectile') iceProjectileActive = true;
  else if (id === 'puddle_trail') { puddleTrailActive = true; lastPlayerPuddleSpawnTime = Date.now() - PLAYER_PUDDLE_SPAWN_INTERVAL; }
  else if (id === 'laser_pointer') laserPointerActive = true;
  else if (id === 'auto_aim') autoAimActive = true;
  else if (id === 'explosive_bullets') explosiveBulletsActive = true;
  else if (id === 'vengeance_nova') vengeanceNovaActive = true;
  else if (id === 'dog_companion') { dogCompanionActive = true; dog.x = player.x; dog.y = player.y; dog.state = 'returning'; }
  else if (id === 'anti_gravity') { antiGravityActive = true; lastAntiGravityPushTime = Date.now(); }
  else if (id === 'ricochet') ricochetActive = true;
  else if (id === 'rocket_launcher') { rocketLauncherActive = true; weaponFireInterval *= 2; }
  else if (id === 'black_hole') { blackHoleActive = true; lastBlackHoleTime = Date.now(); }
  else if (id === 'dual_gun') dualGunActive = true;
  else if (id === 'flaming_bullets') flamingBulletsActive = true;
  else if (id === 'bug_swarm') { bugSwarmActive = true; lastBugSwarmSpawnTime = Date.now(); }
  else if (id === 'night_owl') { nightOwlActive = true; }
  else if (id === 'whirlwind_axe') { whirlwindAxeActive = true; }
  else if (id === 'lightning_strike') { lightningStrikeActive = true; lastLightningStrikeTime = Date.now(); }
  else if (id === 'ice_shard_cannon') { iceShardCannonActive = true; lastIceShardTime = Date.now(); }
  else if (id === 'flamethrower') { flamethrowerActive = true; lastFlameEmitTime = Date.now(); }
  else if (id === 'laser_cannon') { laserCannonActive = true; lastLaserCannonFireTime = Date.now(); }

  // Achievement tracking for powerups (count + unique).
  if (typeof runStats !== 'undefined') {
    if (typeof runStats.powerupsPickedUp !== 'number' || !Number.isFinite(runStats.powerupsPickedUp)) runStats.powerupsPickedUp = 0;
    runStats.powerupsPickedUp++;
    if (!runStats.uniquePowerupsPickedUp || typeof runStats.uniquePowerupsPickedUp !== 'object') runStats.uniquePowerupsPickedUp = {};
    runStats.uniquePowerupsPickedUp[id] = true;
  }
  checkAchievements();
  updatePowerupIconsUI();
}

