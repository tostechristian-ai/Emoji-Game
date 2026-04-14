// ═══════════════════════════════════════════════════════════════════════════
// MERCHANT SHOP & POWERUP ACTIVATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// This file handles:
// - Merchant shop UI and offerings
// - Purchasing items from merchant (apples, coins, powerups)
// - Activating all powerup types (30+ different powerups)

// ═══════════════════════════════════════════════════════════════════════════
// MERCHANT SHOP UI
// ═══════════════════════════════════════════════════════════════════════════

// Close the merchant shop and resume gameplay
function closeMerchantShop() {
    merchantShop.style.display = 'none';
    // Accumulate paused time for apple lifetime tracking
    if (typeof applePauseStartTime !== 'undefined' && applePauseStartTime > 0) {
        appleTotalPausedDuration += Date.now() - applePauseStartTime;
        applePauseStartTime = 0;
    }
    gamePaused = false;
    // Note: The merchant NPC is removed upon collision, not when closing shop
}

// Show the merchant shop with random offerings
// Pauses the game and generates 3 random items to purchase
function showMerchantShop() {
    gamePaused = true;
    // Record pause start time for apple lifetime pausing
    applePauseStartTime = Date.now();
    merchantOptionsContainer.innerHTML = '';
    playUISound('levelUp');

    // Base cost scales with player level
    const coinCost = 50 + Math.floor(player.level * 5);
    const allOptions = [];

    // ─── APPLE TRADES ───────────────────────────────────────────────────────
    // Player can trade apples for XP or healing
    
    if (player.appleCount >= 3) {
        allOptions.push({
            type: 'xp_for_apples',
            name: 'Gain Experience',
            desc: 'Trade 3 apples for a full level of XP.',
            icon: '📈',
            cost: 3,
            currency: 'apples',
            xpAmount: player.xpToNextLevel,
            enabled: true
        });
    }
    
    if (player.appleCount >= 2) {
        allOptions.push({
            type: 'heal_for_apples',
            name: 'Restore Health',
            desc: 'Trade 2 apples to fully heal.',
            icon: '❤️‍🩹',
            cost: 2,
            currency: 'apples',
            enabled: player.lives < player.maxLives
        });
    }

    // ─── COIN TRADES ────────────────────────────────────────────────────────
    // Player can spend coins for XP, healing, or temporary boosts
    
    // XP purchase (50% of level requirement)
    allOptions.push({
        type: 'xp_for_coins',
        name: 'Buy Experience',
        desc: 'Spend coins for a burst of XP.',
        icon: '⭐',
        cost: coinCost,
        currency: 'coins',
        xpAmount: Math.floor(player.xpToNextLevel * 0.5),
        enabled: player.coins >= coinCost
    });

    // Healing purchase (only if not at full health)
    if (player.lives < player.maxLives) {
        const healCost = Math.floor(coinCost * 0.8);
        allOptions.push({
            type: 'heal_for_coins',
            name: 'Buy Health',
            desc: 'Spend coins to restore 1 heart.',
            icon: '❤️',
            cost: healCost,
            currency: 'coins',
            enabled: player.coins >= healCost
        });
    }

    // Temporary fire rate boost (only if not already active)
    if (!fireRateBoostActive) {
        const boostCost = Math.floor(coinCost * 0.6);
        allOptions.push({
            type: 'fire_boost',
            name: 'Fire Rate Boost',
            desc: 'Double fire rate for 10 seconds.',
            icon: '🔥',
            cost: boostCost,
            currency: 'coins',
            enabled: player.coins >= boostCost
        });
    }

    // ─── POWERUP PURCHASES ──────────────────────────────────────────────────
    // Merchant offers random powerups that player doesn't have yet
    
    const powerupPool = [
        // Weapon modifiers
        { id: 'magnetic_projectile',  name: 'Magnetic Shots',    icon: '🧲', active: magneticProjectileActive },
        { id: 'explosive_bullets',    name: 'Explosive Bullets', icon: '💥', active: explosiveBulletsActive },
        { id: 'ricochet',             name: 'Ricochet Shots',    icon: '🔄', active: ricochetActive },
        { id: 'ice_projectile',       name: 'Ice Projectiles',   icon: '❄️', active: iceProjectileActive },
        { id: 'v_shape_projectile',   name: 'V-Shape Shots',     icon: '🕊️', active: vShapeProjectileLevel >= 4 },
        { id: 'flaming_bullets',      name: 'Flaming Bullets',   icon: '🔥', active: flamingBulletsActive, locked: !playerData.unlockedPickups.flaming_bullets },
        { id: 'rocket_launcher',      name: 'Heavy Shells',      icon: '🚀', active: rocketLauncherActive, locked: !playerData.unlockedPickups.rocket_launcher },
        { id: 'dual_gun',             name: 'Dual Gun',          icon: '🔫', active: dualGunActive },
        { id: 'dual_revolvers',       name: 'Dual Revolvers',    icon: '🔫🔫', active: dualRevolversActive },
        
        // Passive effects
        { id: 'sword',                name: 'Auto-Sword',        icon: '🗡️', active: player.swordActive },
        { id: 'puddle_trail',         name: 'Slime Trail',       icon: '💧', active: puddleTrailActive },
        { id: 'laser_pointer',        name: 'Laser Pointer',     icon: '🔴', active: laserPointerActive },
        { id: 'auto_aim',             name: 'Auto-Aim',          icon: '🎯', active: autoAimActive },
        
        // Active abilities
        { id: 'bomb',                 name: 'Bomb Emitter',      icon: '💣', active: bombEmitterActive },
        { id: 'orbiter',              name: 'Spinning Orbiter',  icon: '💫', active: orbitingPowerUpActive },
        { id: 'levitating_books',     name: 'Levitating Books',  icon: '📖', active: levitatingBooksActive },
        { id: 'circle',               name: 'Damaging Circle',   icon: '⭕', active: damagingCircleActive, locked: !playerData.unlockedPickups.circle },
        { id: 'lightning_projectile', name: 'Lightning Bolt',    icon: '⚡', active: lightningProjectileActive },
        { id: 'lightning_strike',     name: 'Lightning Strike',  icon: '⚡', active: lightningStrikeActive },
        { id: 'flamethrower',         name: 'Flamethrower',      icon: '🔥', active: flamethrowerActive },
        { id: 'laser_cannon',         name: 'Laser Cannon',      icon: '🟢', active: laserCannonActive },
        { id: 'shotgun',              name: 'Shotgun',           icon: '🔫', active: shotgunActive, locked: !playerData.unlockedPickups.shotgun },
        { id: 'ice_cannon',           name: 'Ice Cannon',        icon: '❄️', active: iceCannonActive, locked: !playerData.unlockedPickups.ice_cannon },
        { id: 'dynamite',             name: 'Dynamite',          icon: '🧨', active: dynamiteActive, locked: !playerData.unlockedPickups.dynamite },
        { id: 'pistol',                name: 'Pistol',            icon: '🔫', active: player._hasPistol, locked: !playerData.unlockedPickups.pistol || equippedCharacterID === 'cowboy' },
        { id: 'bone_shot',              name: 'Bone Shot',         icon: '🦴', active: boneShotActive, locked: !playerData.unlockedPickups.bone_shot },
        { id: 'anti_gravity',         name: 'Anti-Gravity',      icon: '💨', active: antiGravityActive, locked: !playerData.unlockedPickups.anti_gravity },
        { id: 'black_hole',           name: 'Black Hole',        icon: '⚫', active: blackHoleActive, locked: !playerData.unlockedPickups.black_hole },
        { id: 'vengeance_nova',       name: 'Vengeance Nova',    icon: '🛡️', active: vengeanceNovaActive, locked: !playerData.unlockedPickups.vengeance_nova },
        { id: 'dodge_nova',           name: 'Dodge Nova',        icon: '💨', active: dodgeNovaActive, locked: !playerData.unlockedPickups.dodge_nova },
        { id: 'robot_drone',         name: 'Robot Drone',       icon: '🤖', active: robotDroneActive, locked: !playerData.unlockedPickups.robot_drone },
        { id: 'turret',               name: 'Turret',            icon: '🏛️', active: turretActive },
        
        // Companions
        { id: 'doppelganger',         name: 'Doppelganger',      icon: '👯', active: doppelgangerActive, locked: !playerData.unlockedPickups.doppelganger },
        { id: 'dog_companion',        name: 'Dog Companion',     icon: '🐶', active: dogCompanionActive, locked: !playerData.unlockedPickups.dog_companion },
        { id: 'cat_ally',             name: 'Cat Ally',          icon: '🐱', active: catAllyActive, locked: !playerData.unlockedPickups.cat_ally },
        { id: 'night_owl',            name: 'Night Owl',         icon: '🦉', active: nightOwlActive, locked: !playerData.unlockedPickups.night_owl },
        { id: 'whirlwind_axe',        name: 'Whirlwind Axe',     icon: '🪓', active: whirlwindAxeActive, locked: !playerData.unlockedPickups.whirlwind_axe },
        
        // Special
        { id: 'temporal_ward',        name: 'Temporal Ward',     icon: '⏱️', active: temporalWardActive, locked: !playerData.unlockedPickups.temporal_ward },
    ];

    // Filter to only available powerups (not active, not locked)
    const available = powerupPool.filter(p => !p.active && !p.locked);
    
    // Shuffle available powerups
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }
    
    // Take up to 4 random powerups
    available.slice(0, 4).forEach(p => {
        // Add slight price variation (±10 coins)
        const cost = coinCost + Math.floor(Math.random() * 20) - 10;
        
        allOptions.push({
            type: 'buy_powerup',
            name: p.name,
            desc: 'A powerful artifact from the merchant\'s pack.',
            icon: p.icon,
            cost,
            currency: 'coins',
            powerupId: p.id,
            enabled: player.coins >= cost
        });
    });

    // ─── SHUFFLE AND SELECT 3 OPTIONS ───────────────────────────────────────
    // Shuffle all available options
    for (let i = allOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    
    // Show only 3 random options
    const shown = allOptions.slice(0, 3);

    // ─── BUILD MERCHANT CARDS ───────────────────────────────────────────────
    shown.forEach((option) => {
        const card = document.createElement('div');
        card.className = 'merchant-card';
        
        card.innerHTML = `
            <div class="merchant-icon">${option.icon}</div>
            <h3>${option.name}</h3>
            <p>${option.desc}</p>
            <div class="cost">${option.cost} ${option.currency === 'apples' ? '🍎' : '🪙'}</div>
        `;
        
        // Disable card if player can't afford it
        if (!option.enabled) {
            card.style.opacity = '0.5';
            card.style.cursor = 'not-allowed';
        } else {
            card.onclick = () => purchaseFromMerchant(option);
            card.addEventListener('mouseover', () => playUISound('uiClick'));
        }
        
        merchantOptionsContainer.appendChild(card);
    });

    // Show the merchant shop
    merchantShop.style.display = 'flex';
}

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE HANDLING
// ═══════════════════════════════════════════════════════════════════════════

// Handle purchasing an item from the merchant
// @param option - The option object containing purchase details
function purchaseFromMerchant(option) {
    playUISound('levelUpSelect');
    vibrate(20);

    // ─── APPLE PURCHASES ────────────────────────────────────────────────────
    if (option.type === 'xp_for_apples') {
        player.appleCount -= option.cost;
        // Cap XP to leave player 1-2 XP shy of level up to prevent softlock
        const maxXpToAdd = Math.max(0, player.xpToNextLevel - player.xp - 2);
        const actualXpToAdd = Math.min(option.xpAmount, maxXpToAdd);
        player.xp += actualXpToAdd;
        
        // Show floating text
        floatingTexts.push({
            text: `+${actualXpToAdd} XP!`,
            x: player.x,
            y: player.y - player.size,
            startTime: Date.now(),
            duration: 1500,
            color: '#00c6ff'
        });
        
        // Check if player leveled up (shouldn't happen with capped XP, but safety check)
        if (player.xp >= player.xpToNextLevel) {
            closeMerchantShop();
            setTimeout(() => levelUp(), 200);
        }
    }
    else if (option.type === 'heal_for_apples') {
        player.appleCount -= option.cost;
        player.lives = player.maxLives; // Full heal
        updateUIStats();
        
        floatingTexts.push({
            text: 'Full Heal!',
            x: player.x,
            y: player.y - player.size,
            startTime: Date.now(),
            duration: 1500,
            color: '#ff4444'
        });
    }
    
    // ─── COIN PURCHASES ─────────────────────────────────────────────────────
    else if (option.type === 'xp_for_coins') {
        player.coins -= option.cost;
        // Cap XP to leave player 1-2 XP shy of level up to prevent softlock
        const maxXpToAdd = Math.max(0, player.xpToNextLevel - player.xp - 2);
        const actualXpToAdd = Math.min(option.xpAmount, maxXpToAdd);
        player.xp += actualXpToAdd;
        
        floatingTexts.push({
            text: `+${actualXpToAdd} XP!`,
            x: player.x,
            y: player.y - player.size,
            startTime: Date.now(),
            duration: 1500,
            color: '#00c6ff'
        });
        
        if (player.xp >= player.xpToNextLevel) {
            closeMerchantShop();
            setTimeout(() => levelUp(), 200);
        }
    }
    else if (option.type === 'heal_for_coins') {
        player.coins -= option.cost;
        
        if (player.lives < player.maxLives) {
            player.lives++; // Restore 1 heart
        }
        
        updateUIStats();
        
        floatingTexts.push({
            text: '+❤️',
            x: player.x,
            y: player.y - player.size,
            startTime: Date.now(),
            duration: 1500,
            color: '#ff4444'
        });
    }
    else if (option.type === 'fire_boost') {
        player.coins -= option.cost;
        fireRateBoostActive = true;
        fireRateBoostEndTime = Date.now() + 10000; // 10 seconds
        
        floatingTexts.push({
            text: 'Fire Rate Boost!',
            x: player.x,
            y: player.y - player.size,
            startTime: Date.now(),
            duration: 1500,
            color: '#ff8800'
        });
    }
    
    // ─── POWERUP PURCHASES ──────────────────────────────────────────────────
    else if (option.type === 'buy_powerup') {
        player.coins -= option.cost;
        activatePowerup(option.powerupId);
        
        floatingTexts.push({
            text: `${option.name}!`,
            x: player.x,
            y: player.y - player.size,
            startTime: Date.now(),
            duration: 1500
        });
    }

    // Close shop unless player is about to level up
    // (keep shop open if they bought XP and are about to level)
    if (option.type !== 'xp_for_apples' && option.type !== 'xp_for_coins' || player.xp < player.xpToNextLevel) {
        closeMerchantShop();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// POWERUP ACTIVATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Activate a powerup by ID
// This is the central function that handles all powerup types
// @param id - The powerup ID to activate
function activatePowerup(id) {
    // Track weapon unlocks for weapon_collector achievement
    const weaponIds = ['dynamite', 'pistol', 'shotgun', 'rocket_launcher', 'dual_gun', 
                      'dual_revolvers', 'flamethrower', 'laser_cannon', 'ice_cannon', 
                      'bug_swarm', 'night_owl', 'whirlwind_axe'];
    if (weaponIds.includes(id) && runStats && runStats.uniqueWeaponsUnlocked) {
        runStats.uniqueWeaponsUnlocked[id] = true;
    }
    
    // ─── COMPANION POWERUPS ─────────────────────────────────────────────────
    if (id === 'doppelganger') {
        doppelgangerActive = true;
        runStats.lastDoppelgangerStartTime = Date.now();

        // Create doppelganger object with HP system (3 HP, no duration limit)
        doppelganger = {
            x: player.x - player.size * 2,
            y: player.y,
            size: player.size,
            rotationAngle: 0,
            lastFireTime: 0,
            hp: 3,
            maxHp: 3,
            endTime: Infinity // No time limit, dies when HP reaches 0
        };
    }
    else if (id === 'dog_companion') {
        dogCompanionActive = true;
        dog.x = player.x;
        dog.y = player.y;
        dog.state = 'returning';
    }
    else if (id === 'cat_ally') {
        catAllyActive = true;
        catAlly.x = player.x;
        catAlly.y = player.y;
        catAlly.state = 'returning';
        catAlly.target = null;
        catAlly.carriedItem = null;
    }
    else if (id === 'dodge_nova') {
        dodgeNovaActive = true;
    }
    else if (id === 'turret') {
        turretActive = true;
        // Turret spawns at player position (stationary)
        turret.x = player.x;
        turret.y = player.y;
        turret.aimAngle = 0;
        turret.lastFireTime = Date.now();
    }

    // ─── DEFENSIVE POWERUPS ─────────────────────────────────────────────────
    else if (id === 'dash_invincibility') {
        hasDashInvincibility = true;
    }
    else if (id === 'dash_cooldown') {
        playerData.hasReducedDashCooldown = true;
        player.dashCooldown = 3000;
        savePlayerData();
    }
    else if (id === 'temporal_ward') {
        temporalWardActive = true; // Freezes time when damaged
    }
    else if (id === 'vengeance_nova') {
        vengeanceNovaActive = true; // Shockwave when damaged
    }
    
    // ─── WEAPON MODIFIER POWERUPS ───────────────────────────────────────────
    else if (id === 'magnetic_projectile') {
        magneticProjectileActive = true; // Bullets home toward enemies
    }
    else if (id === 'v_shape_projectile') {
        vShapeProjectileLevel = Math.min(4, vShapeProjectileLevel + 1); // Fire multiple bullets
    }
    else if (id === 'ice_projectile') {
        iceProjectileActive = true; // Bullets freeze enemies
    }
    else if (id === 'explosive_bullets') {
        explosiveBulletsActive = true; // Bullets explode on impact
    }
    else if (id === 'ricochet') {
        ricochetActive = true; // Bullets bounce to second target
    }
    else if (id === 'rocket_launcher') {
        rocketLauncherActive = true;
        weaponFireInterval *= 2; // Slower but more powerful
    }
    else if (id === 'dual_gun') {
        dualGunActive = true; // Fire forward and backward
    }
    else if (id === 'dual_revolvers') {
        dualRevolversActive = true; // Fire a second bullet 0.2ms after each shot
    }
    else if (id === 'flaming_bullets') {
        flamingBulletsActive = true; // Bullets ignite enemies
    }
    
    // ─── PASSIVE EFFECT POWERUPS ────────────────────────────────────────────
    else if (id === 'sword') {
        player.swordActive = true;
        player.lastSwordSwingTime = Date.now() - SWORD_SWING_INTERVAL;
    }
    else if (id === 'puddle_trail') {
        puddleTrailActive = true;
        lastPlayerPuddleSpawnTime = Date.now() - PLAYER_PUDDLE_SPAWN_INTERVAL;
    }
    else if (id === 'laser_pointer') {
        laserPointerActive = true; // Show aiming line
    }
    else if (id === 'auto_aim') {
        autoAimActive = true; // Automatically target nearest enemy
    }
    
    // ─── ACTIVE ABILITY POWERUPS ────────────────────────────────────────────
    else if (id === 'bomb') {
        bombEmitterActive = true;
        lastBombEmitMs = Date.now();
    }
    else if (id === 'orbiter') {
        orbitingPowerUpActive = true;
        player.orbitAngle = 0;
    }
    else if (id === 'levitating_books') {
        levitatingBooksActive = true;
        levitatingBooksAngle = 0;
        levitatingBooksFadeStartTime = Date.now();
    }
    else if (id === 'circle') {
        damagingCircleActive = true;
        lastDamagingCircleDamageTime = Date.now();
    }
    else if (id === 'lightning_projectile') {
        lightningProjectileActive = true;
        lastLightningSpawnTime = Date.now();
    }
    else if (id === 'lightning_strike') {
        lightningStrikeActive = true;
        lastLightningStrikeTime = Date.now();
    }
    else if (id === 'anti_gravity') {
        antiGravityActive = true;
        lastAntiGravityPushTime = Date.now();
    }
    else if (id === 'black_hole') {
        blackHoleActive = true;
        lastBlackHoleTime = Date.now();
    }
    else if (id === 'whirlwind_axe') {
        whirlwindAxeActive = true;
    }
    else if (id === 'bug_swarm') {
        bugSwarmActive = true;
        lastBugSwarmSpawnTime = Date.now();
    }
    
    // ─── SPECIAL WEAPON POWERUPS ────────────────────────────────────────────
    else if (id === 'flamethrower') {
        flamethrowerActive = true;
        lastFlameEmitTime = Date.now();
    }
    else if (id === 'laser_cannon') {
        laserCannonActive = true;
        lastLaserCannonFireTime = Date.now();
    }
    else if (id === 'shotgun') {
        shotgunActive = true;
        lastShotgunTime = Date.now();
    }
    else if (id === 'ice_cannon') {
        iceCannonActive = true;
        lastIceCannonTime = Date.now();
    }
    else if (id === 'dynamite') {
        dynamiteActive = true;
        lastDynamiteTime = Date.now();
    }
    else if (id === 'pistol') {
        player._hasPistol = true;
    }
    else if (id === 'bone_shot') {
        boneShotActive = true;
    }

    // ─── ACHIEVEMENT TRACKING ───────────────────────────────────────────────
    // Track powerup collection for achievements
    if (typeof runStats !== 'undefined') {
        // Increment total powerups collected
        if (typeof runStats.powerupsPickedUp !== 'number' || !Number.isFinite(runStats.powerupsPickedUp)) {
            runStats.powerupsPickedUp = 0;
        }
        runStats.powerupsPickedUp++;
        
        // Track unique powerups
        if (!runStats.uniquePowerupsPickedUp || typeof runStats.uniquePowerupsPickedUp !== 'object') {
            runStats.uniquePowerupsPickedUp = {};
        }
        runStats.uniquePowerupsPickedUp[id] = true;
    }
    
    // Check if any achievements were unlocked
    checkAchievements();
    
    // Update the powerup icons UI
    updatePowerupIconsUI();
}
