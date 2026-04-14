// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE & UPGRADES SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// This file manages:
// - Saving/loading player progress (coins, upgrades)
// - Permanent upgrade shop (spend coins between runs)
// - Map selection system
// - Destructible objects (barrels, bricks)

// ═══════════════════════════════════════════════════════════════════════════
// SAVE/LOAD SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Load player data from browser localStorage
// Includes: coins, upgrade levels, unlocked pickups
function loadPlayerData() {
    try {
        const savedData = localStorage.getItem('emojiSurvivorData');
        
        if (savedData) {
            // Parse saved data
            playerData = JSON.parse(savedData);
            
            // Backfill missing upgrade keys (for older saves)
            for (const key in PERMANENT_UPGRADES) {
                if (!playerData.upgrades.hasOwnProperty(key)) {
                    playerData.upgrades[key] = 0;
                }
            }
            
            // Backfill missing unlockable pickups
            if (!playerData.unlockedPickups) {
                playerData.unlockedPickups = {};
            }
            for (const key in UNLOCKABLE_PICKUPS) {
                if (!playerData.unlockedPickups.hasOwnProperty(key)) {
                    playerData.unlockedPickups[key] = false;
                }
            }
        } else {
            // No save found, create fresh data
            initializePlayerData();
        }
    } catch (e) {
        console.error("Failed to load player data", e);
        initializePlayerData();
    }
}

// Initialize fresh player data (new save)
function initializePlayerData() {
    playerData = {
        currency: 0,                    // Coins for shop
        upgrades: {},                   // Permanent upgrade levels
        unlockedPickups: {},            // Which powerups are unlocked
        hasReducedDashCooldown: false   // Special dash upgrade flag
    };
    
    // Set all upgrades to level 0
    for (const key in PERMANENT_UPGRADES) {
        playerData.upgrades[key] = 0;
    }
    
    // Set all unlockables to locked
    for (const key in UNLOCKABLE_PICKUPS) {
        playerData.unlockedPickups[key] = false;
    }
}

// Save player data to browser localStorage
function savePlayerData() {
    try {
        localStorage.setItem('emojiSurvivorData', JSON.stringify(playerData));
    } catch (e) {
        console.error("Failed to save player data.", e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPGRADE SHOP UI
// ═══════════════════════════════════════════════════════════════════════════

// Open the permanent upgrades shop
function openUpgradeShop() {
    difficultyContainer.style.display = 'none';
    upgradeShop.style.display = 'flex';
    displayUpgrades();
}

// Display all available upgrades and unlockables in the shop
function displayUpgrades() {
    // Update coin display
    currencyDisplay.textContent = `Coins: ${playerData.currency} 🪙`;
    
    // Clear existing cards
    permanentUpgradesContainer.innerHTML = '';
    unlockablePickupsContainer.innerHTML = '';
    
    // ─── PERMANENT UPGRADES ─────────────────────────────────────────────────
    // These can be leveled up multiple times (damage, speed, etc.)
    for (const key in PERMANENT_UPGRADES) {
        const config = PERMANENT_UPGRADES[key];
        const currentLevel = playerData.upgrades[key] || 0;
        
        // Calculate cost (increases with each level)
        const cost = Math.floor(config.baseCost * Math.pow(config.costIncrease, currentLevel));
        
        // Create upgrade card
        const card = document.createElement('div');
        card.className = 'permanent-upgrade-card';
        
        // Determine button state
        let buttonHTML;
        if (currentLevel >= config.maxLevel) {
            buttonHTML = `<button disabled>MAX</button>`;
        } else if (playerData.currency < cost) {
            buttonHTML = `<button disabled>Buy (${cost} 🪙)</button>`;
        } else {
            buttonHTML = `<button onclick="buyUpgrade('${key}')">Buy (${cost} 🪙)</button>`;
        }
        
        card.innerHTML = `
            <h4>${config.icon} ${config.name}</h4>
            <p>${config.desc}</p>
            <div class="upgrade-level">Level: ${currentLevel} / ${config.maxLevel}</div>
            ${buttonHTML}
        `;
        
        permanentUpgradesContainer.appendChild(card);
    }
    
    // ─── UNLOCKABLE PICKUPS ─────────────────────────────────────────────────
    // These are one-time purchases (new powerups, maps, characters)
    for (const key in UNLOCKABLE_PICKUPS) {
        const config = UNLOCKABLE_PICKUPS[key];
        const isUnlocked = playerData.unlockedPickups[key];
        
        // Create unlockable card
        const card = document.createElement('div');
        card.className = 'permanent-upgrade-card';
        card.style.borderColor = isUnlocked ? '#FFD700' : '#F44336';
        
        // Determine button state
        let buttonHTML;
        if (isUnlocked) {
            buttonHTML = `<button disabled>Unlocked</button>`;
        } else if (playerData.currency < config.cost) {
            buttonHTML = `<button disabled>Unlock (${config.cost} 🪙)</button>`;
        } else {
            buttonHTML = `<button onclick="buyUnlockable('${key}')">Unlock (${config.cost} 🪙)</button>`;
        }
        
        card.innerHTML = `
            <h4>${config.icon} ${config.name}</h4>
            <p>${config.desc}</p>
            ${buttonHTML}
        `;
        
        unlockablePickupsContainer.appendChild(card);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Purchase a permanent upgrade (level it up)
function buyUpgrade(key) {
    const config = PERMANENT_UPGRADES[key];
    const currentLevel = playerData.upgrades[key] || 0;
    const cost = Math.floor(config.baseCost * Math.pow(config.costIncrease, currentLevel));
    
    // Check if player can afford it and hasn't maxed it
    if (playerData.currency >= cost && currentLevel < config.maxLevel) {
        playerData.currency -= cost;
        playerData.upgrades[key]++;
        
        savePlayerData();
        displayUpgrades();
        playUISound('levelUpSelect');
    }
}

// Purchase an unlockable item (one-time unlock)
function buyUnlockable(key) {
    const config = UNLOCKABLE_PICKUPS[key];
    const isUnlocked = playerData.unlockedPickups[key];
    
    // Check if player can afford it and hasn't unlocked it yet
    if (playerData.currency >= config.cost && !isUnlocked) {
        playerData.currency -= config.cost;
        playerData.unlockedPickups[key] = true;
        
        savePlayerData();
        displayUpgrades();
        playUISound('levelUpSelect');
        checkAchievements(); // May unlock achievement for purchasing
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// APPLY UPGRADES TO GAME
// ═══════════════════════════════════════════════════════════════════════════

// Apply permanent upgrades to player stats at game start
// Called when starting a new game
function applyPermanentUpgrades() {
    // Damage boost
    player.damageMultiplier = 1 + (playerData.upgrades.playerDamage || 0) * PERMANENT_UPGRADES.playerDamage.effect;
    
    // Speed boost
    player.speed = 1.4 * (1 + (playerData.upgrades.playerSpeed || 0) * PERMANENT_UPGRADES.playerSpeed.effect);
    
    // Enemy health reduction (makes game easier)
    baseEnemySpeed = 0.63 * (1 + (playerData.upgrades.enemyHealth || 0) * PERMANENT_UPGRADES.enemyHealth.effect);
    
    // Magnet radius boost
    player.magnetRadius = (player.size * 2) * (1 + (playerData.upgrades.magnetRadius || 0) * PERMANENT_UPGRADES.magnetRadius.effect);
    
    // Luck boost (better drop rates)
    const luckBonus = (playerData.upgrades.luck || 0) * PERMANENT_UPGRADES.luck.effect;
    boxDropChance = 0.015 + luckBonus;
    appleDropChance = 0.05 + luckBonus;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESET PROGRESS
// ═══════════════════════════════════════════════════════════════════════════

// Reset all player progress (coins, upgrades, achievements, etc.)
// Shows confirmation dialog before deleting
function resetAllData() {
    const userConfirmed = window.confirm(
        "Are you sure you want to reset all your progress? " +
        "This will erase your coins, upgrades, high scores, and ALL achievements permanently."
    );
    
    if (userConfirmed) {
        // Remove all saved data from localStorage
        localStorage.removeItem('emojiSurvivorData');
        localStorage.removeItem('highScores');
        localStorage.removeItem('emojiSurvivorStats');
        localStorage.removeItem('emojiSurvivorCheats');
        
        // Reinitialize everything
        initializePlayerData();
        initializePlayerStats();
        loadCheats();
        displayHighScores();
        
        console.log("All player data has been reset.");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DESTRUCTIBLE OBJECTS (BARRELS & BRICKS)
// ═══════════════════════════════════════════════════════════════════════════

// Spawn initial obstacles at game start
// Places barrels and bricks around the map (not near player spawn)
function spawnInitialObstacles() {
    destructibles.length = 0; // Clear existing
    
    const playerSafeRadius = 200; // Don't spawn too close to player
    const spawnPos = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };

    // ─── SPAWN BARRELS ──────────────────────────────────────────────────────
    const barrelCount = 5;
    for (let i = 0; i < barrelCount; i++) {
        let x, y, dist;
        
        // Find a position not too close to player spawn
        do {
            x = Math.random() * WORLD_WIDTH;
            y = Math.random() * WORLD_HEIGHT;
            dist = Math.hypot(x - spawnPos.x, y - spawnPos.y);
        } while (dist < playerSafeRadius);
        
        // Add barrel to destructibles array
        destructibles.push({
            x, y,
            size: 15,
            health: 1,
            maxHealth: 1,
            emoji: '🛢️'
        });
    }
    
    // ─── SPAWN BRICKS ───────────────────────────────────────────────────────
    const brickCount = 4;
    for (let i = 0; i < brickCount; i++) {
        let x, y, dist;
        
        // Find a position not too close to player spawn
        do {
            x = Math.random() * WORLD_WIDTH;
            y = Math.random() * WORLD_HEIGHT;
            dist = Math.hypot(x - spawnPos.x, y - spawnPos.y);
        } while (dist < playerSafeRadius);
        
        // Add brick to destructibles array
        destructibles.push({
            x, y,
            size: 30,
            health: 2,
            maxHealth: 2,
            emoji: '🧱'
        });
    }
}

// Spawn a random barrel near the player during gameplay
function spawnRandomBarrel() {
    const minDist = 150;  // Not too close
    const maxDist = 500;  // Not too far
    
    // Random angle and distance from player
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    
    // Calculate position
    let x = player.x + Math.cos(angle) * dist;
    let y = player.y + Math.sin(angle) * dist;
    
    // Keep within world bounds
    x = Math.max(50, Math.min(WORLD_WIDTH - 50, x));
    y = Math.max(50, Math.min(WORLD_HEIGHT - 50, y));
    
    // Add barrel
    destructibles.push({
        x, y,
        size: 15,
        health: 1,
        maxHealth: 1,
        emoji: '🛢️'
    });
}

// Spawn a random brick near the player during gameplay
function spawnRandomBrick() {
    const minDist = 150;
    const maxDist = 500;
    
    // Random angle and distance from player
    const angle = Math.random() * Math.PI * 2;
    const dist = minDist + Math.random() * (maxDist - minDist);
    
    // Calculate position
    let x = player.x + Math.cos(angle) * dist;
    let y = player.y + Math.sin(angle) * dist;
    
    // Keep within world bounds
    x = Math.max(50, Math.min(WORLD_WIDTH - 50, x));
    y = Math.max(50, Math.min(WORLD_HEIGHT - 50, y));
    
    // Add brick
    destructibles.push({
        x, y,
        size: 30,
        health: 2,
        maxHealth: 2,
        emoji: '🧱'
    });
}

// Handle barrel destruction (creates explosion that damages enemies)
function handleBarrelDestruction(barrel) {
    playSound('enemyDeath');
    
    const explosionRadius = 54;
    
    // Create visual flame area
    flameAreas.push({
        x: barrel.x,
        y: barrel.y,
        radius: explosionRadius,
        startTime: Date.now(),
        endTime: Date.now() + 3000 // Lasts 3 seconds
    });
    
    // Damage all enemies in explosion radius
    enemies.forEach(enemy => {
        if (!enemy.isHit) {
            const dx = enemy.x - barrel.x;
            const dy = enemy.y - barrel.y;
            
            // Check if enemy is in explosion radius
            if (dx*dx + dy*dy < explosionRadius*explosionRadius) {
                enemy.health -= 2; // Explosion damage
                createBloodSplatter(enemy.x, enemy.y);
                
                if (enemy.health <= 0) {
                    handleEnemyDeath(enemy);
                }
            }
        }
    });
}

// Handle brick destruction (creates white debris particles)
function handleBrickDestruction(brick) {
    playSound('enemyDeath');
    
    // Create white debris particles (not red blood)
    const particleCount = 8;
    const speed = 2.5 + Math.random() * 2;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        
        bloodSplatters.push({
            x: brick.x,
            y: brick.y,
            dx: Math.cos(angle) * speed + (Math.random() - 0.5),
            dy: Math.sin(angle) * speed + (Math.random() - 0.5),
            size: 3 + Math.random() * 4,
            spawnTime: Date.now(),
            lifetime: 900 + Math.random() * 400,
            isWhite: true // White particles for bricks
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAP SELECTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Show the map selection screen
// Displays all available maps (some may be locked)
function showMapSelectScreen() {
    difficultyContainer.style.display = 'none';
    mapSelectContainer.style.display = 'block';
    mapTilesContainer.innerHTML = '';

    // Map names for display
    const mapNames = [
        "Grass Map 1",
        "Desert Map 1",
        "Desert Map 2",
        "Lava Map 1",
        "Lava Map 2",
        "Desert Map 3",
        "Ice Map 1",
        "Grass Map 2",
        "Ice Map 2",
        "Desert Ruins",       // Map 10
        "City Street",        // Map 11
        "Rocky Mountain",     // Map 12
        "Boglands",           // Map 13
        "Junkyard",           // Map 14 - Unlockable
        "Log Cabin",          // Map 15 - Unlockable
        "Cellar",             // Map 16 - Unlockable
        "Desert Dunes",       // Map 17 - Unlockable
        "Mossy Rocks",        // Map 18 - Unlockable
        "Golden Caves",       // Map 19 - Unlockable
        "Grid Map"            // Map 20 - Unlockable
    ];

    // Define which maps require unlocks
    const mapUnlockRequirements = {
        13: 'map_junkyard',
        14: 'map_log_cabin',
        15: 'map_cellar',
        16: 'map_desert_dunes',
        17: 'map_mossy_rocks',
        18: 'map_golden_caves',
        19: 'map_grid'
    };
    
    // Create a tile for each map
    backgroundPaths.forEach((path, index) => {
        const unlockKey = mapUnlockRequirements[index];
        const isLocked = unlockKey && !playerData.unlockedPickups[unlockKey];
        
        // Create map tile
        const tile = document.createElement('div');
        tile.className = 'map-tile';
        if (isLocked) tile.classList.add('locked');
        
        // Set background image
        tile.style.backgroundImage = `url('${backgroundImages[index].src}')`;
        tile.dataset.mapIndex = index;
        
        // Add label
        const label = document.createElement('p');
        label.textContent = isLocked ? '🔒 LOCKED' : (mapNames[index] || `Map ${index + 1}`);
        tile.appendChild(label);
        
        // Add click handler if unlocked
        if (!isLocked) {
            tile.addEventListener('click', () => {
                playUISound('uiClick');
                vibrate(10);
                selectedMapIndex = index;
                startGame();
            });
        }
        
        mapTilesContainer.appendChild(tile);
    });
}
