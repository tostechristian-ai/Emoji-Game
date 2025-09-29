// ================================================================================= //
// ============================= ENTITIES.JS ======================================= //
// ================================================================================= //

// --- GLOBAL ENTITY ARRAYS & STATE ---
let enemies = [];
let pickupItems = [];
let lightningBolts = [];
let eyeProjectiles = [];
let playerPuddles = [];
let snailPuddles = [];
let mosquitoPuddles = [];
let floatingTexts = [];
let visualWarnings = [];
let explosions = [];
let blackHoles = [];
let bloodSplatters = [];
let bloodPuddles = [];
let antiGravityPulses = [];
let vengeanceNovas = [];
let dogHomingShots = [];
let destructibles = [];
let flameAreas = [];
let smokeParticles = [];
let pickups = [];
let merchants = [];
let appleItems = [];
let bombs = [];
let flies = [];
let owlProjectiles = [];
let lightningStrikes = [];

let player2 = null;
let doppelganger = null;
let dog = { x: 0, y: 0, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 };
let owl = null;

// --- OBJECT POOLS ---
const MAX_WEAPONS = 500;
const weaponPool = [];
for (let i = 0; i < MAX_WEAPONS; i++) {
    weaponPool.push({ active: false, hitEnemies: [] });
}

// --- PLAYER & CHARACTER DEFINITIONS ---
const player = {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    size: 35,
    speed: 1.4,
    xp: 0,
    level: 1,
    xpToNextLevel: 3,
    projectileSizeMultiplier: 1,
    projectileSpeedMultiplier: 1,
    lives: 3,
    maxLives: 3,
    appleCount: 0,
    coins: 0,
    magnetRadius: 23 * 2,
    orbitAngle: 0,
    boxPickupsCollectedCount: 0,
    bgmFastModeActive: false,
    swordActive: false,
    lastSwordSwingTime: 0,
    currentSwordSwing: null,
    isSlowedByMosquitoPuddle: false,
    originalPlayerSpeed: 1.4,
    damageMultiplier: 1,
    knockbackStrength: 0,
    facing: 'down',
    stepPhase: 0,
    rotationAngle: 0,
    isDashing: false,
    dashEndTime: 0,
    lastDashTime: 0,
    dashCooldown: 6000,
    isInvincible: false,
    spinStartTime: null,
    spinDirection: 0,
    upgradeLevels: {
        speed: 0, fireRate: 0, magnetRadius: 0, damage: 0, projectileSpeed: 0, knockback: 0, luck: 0
    }
};

const CHARACTERS = {
    cowboy: {
        id: 'cowboy',
        name: 'The Cowboy',
        emoji: '🤠',
        description: 'The original survivor. Balanced and reliable.',
        perk: 'Standard bullets and dash.',
        unlockCondition: { type: 'start' },
        shootLogic: null,
        dodgeLogic: null,
    },
    skull: {
        id: 'skull',
        name: 'The Skeleton',
        emoji: '💀',
        description: 'A bony warrior who uses its own body as a weapon.',
        perk: 'Shoots bones. Dodge fires a nova of bones.',
        unlockCondition: { type: 'achievement', id: 'slayer' },
        shootLogic: null,
        dodgeLogic: null,
    }
};


// --- ENEMY DEFINITIONS & CONSTANTS ---
const ENEMY_CONFIGS = {
    '🧟': { size: 17, baseHealth: 1, speedMultiplier: 1, type: 'pursuer', minLevel: 1 },
    '💀': { size: 20, baseHealth: 2, speedMultiplier: 1.15, type: 'pursuer', minLevel: 5 },
    '🌀': { size: 22, baseHealth: 4, speedMultiplier: 0.3, type: 'snail', minLevel: 4, initialProps: () => ({ lastPuddleSpawnTime: Date.now(), directionAngle: Math.random() * 2 * Math.PI }) },
    '🦟': { size: 15, baseHealth: 2, speedMultiplier: 1.5, type: 'mosquito', minLevel: 7, initialProps: () => ({ lastDirectionUpdateTime: Date.now(), currentMosquitoDirection: null, lastPuddleSpawnTime: Date.now() }) },
    '🦇': { size: 25 * 0.85, baseHealth: 3, speedMultiplier: 2, type: 'bat', minLevel: 10, initialProps: () => ({ isPaused: false, pauseTimer: 0, pauseDuration: 30, moveDuration: 30 }) },
    '😈': { size: 20 * 0.8, baseHealth: 3, speedMultiplier: 1.84, type: 'devil', minLevel: 12, initialProps: () => ({ moveAxis: 'x', lastAxisSwapTime: Date.now() }) },
    '👹': { size: 28 * 0.7, baseHealth: 4, speedMultiplier: 1.8975, type: 'demon', minLevel: 15, initialProps: () => ({ moveState: 'following', lastStateChangeTime: Date.now(), randomDx: 0, randomDy: 0 }) },
    '👻': { size: 22, baseHealth: 4, speedMultiplier: 1.2, type: 'ghost', minLevel: 12, initialProps: () => ({ isVisible: true, lastPhaseChange: Date.now(), phaseDuration: 3000, bobOffset: 0 }) },
    '👁️': { size: 25 * 0.6, baseHealth: 4, speedMultiplier: 1.1 * 1.1, type: 'eye', minLevel: 20, initialProps: () => ({ lastEyeProjectileTime: Date.now() }) },
    '🧟‍♀️': { size: 17 * 1.75, baseHealth: 6, speedMultiplier: 0.5, type: 'pursuer', minLevel: 25 },
    '🧛‍♀️': { size: 20, baseHealth: 5, speedMultiplier: 1.2, type: 'vampire', minLevel: 30 }
};

const BOSS_HEALTH = 20;
const BOSS_XP_DROP = 20;
const BOSS_XP_EMOJI = '🎇';
const BOSSED_ENEMY_TYPES = ['🧟', '💀', '👹', '🧟‍♀️', '🦇', '🦟'];


// --- POWERUP STATE FLAGS ---
let bombEmitterActive = false;
let orbitingPowerUpActive = false;
let damagingCircleActive = false;
let lightningProjectileActive = false;
let magneticProjectileActive = false;
let vShapeProjectileLevel = 0;
let iceProjectileActive = false;
let puddleTrailActive = false;
let laserPointerActive = false;
let autoAimActive = false;
let explosiveBulletsActive = false;
let vengeanceNovaActive = false;
let dogCompanionActive = false;
let antiGravityActive = false;
let ricochetActive = false;
let rocketLauncherActive = false;
let blackHoleActive = false;
let dualGunActive = false;
let flamingBulletsActive = false;
let shotgunBlastActive = false;
let temporalWardActive = false;
let doppelgangerActive = false;
let bugSwarmActive = false;
let nightOwlActive = false;
let whirlwindAxeActive = false;
let lightningStrikeActive = false;
let hasDashInvincibility = false;
let isTimeStopped = false;


// --- ENTITY CREATION & MANAGEMENT FUNCTIONS ---

/**
 * Spawns a new merchant in the world and adds it to the merchants array.
 */
function spawnMerchant() {
    let x, y;
    const spawnOffset = 50;
    const angle = Math.random() * 2 * Math.PI;
    const distance = (WORLD_WIDTH / 2) + Math.random() * (WORLD_WIDTH / 2);
    x = player.x + Math.cos(angle) * distance;
    y = player.y + Math.sin(angle) * distance;

    x = Math.max(spawnOffset, Math.min(WORLD_WIDTH - spawnOffset, x));
    y = Math.max(spawnOffset, Math.min(WORLD_HEIGHT - spawnOffset, y));

    merchants.push({ x: x, y: y, size: 40 });
    console.log(`A new merchant has appeared! Total merchants: ${merchants.length}`);
}


/**
 * Creates a new enemy with properties based on type and game state.
 * @param {number} [x_pos] - Optional specific x-coordinate for spawning.
 * @param {number} [y_pos] - Optional specific y-coordinate for spawning.
 * @param {string} [type] - Optional specific emoji type for the enemy.
 */
function createEnemy(x_pos, y_pos, type) {
    let x, y, enemyEmoji;
    if (x_pos !== undefined && y_pos !== undefined && type !== undefined) {
        x = x_pos; y = y_pos; enemyEmoji = type;
    } else {
        const spawnOffset = 29;
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
            case 0: x = Math.random() * WORLD_WIDTH; y = -spawnOffset; break;
            case 1: x = WORLD_WIDTH + spawnOffset; y = Math.random() * WORLD_HEIGHT; break;
            case 2: x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT + spawnOffset; break;
            case 3: x = -spawnOffset; y = Math.random() * WORLD_HEIGHT; break;
        }
        const eligibleEnemyEmojis = Object.keys(ENEMY_CONFIGS).filter(emoji => ENEMY_CONFIGS[emoji].minLevel <= player.level);
        if (eligibleEnemyEmojis.length === 0) return;
        enemyEmoji = eligibleEnemyEmojis[Math.floor(Math.random() * eligibleEnemyEmojis.length)];
    }

    let difficultySpeedMultiplier = (currentDifficulty === 'easy') ? 0.9 : (currentDifficulty === 'medium') ? 1.35 : 1.75;
    let levelSpeedMultiplier = (currentDifficulty === 'hard') ? (1 + 0.025 * (player.level - 1)) : (1 + 0.02 * (player.level - 1));
    const currentBaseEnemySpeed = baseEnemySpeed * difficultySpeedMultiplier * levelSpeedMultiplier;

    const config = ENEMY_CONFIGS[enemyEmoji];
    const newEnemy = {
        x, y, size: config.size, emoji: enemyEmoji, speed: currentBaseEnemySpeed * config.speedMultiplier,
        health: config.baseHealth, isHit: false, isHitByOrbiter: false, isHitByCircle: false,
        isFrozen: false, freezeEndTime: 0, originalSpeed: currentBaseEnemySpeed * config.speedMultiplier,
        isSlowedByPuddle: false, isBoss: false, isHitByAxe: false,
        isIgnited: false, ignitionEndTime: 0, lastIgnitionDamageTime: 0
    };
    if (config.initialProps) Object.assign(newEnemy, config.initialProps());
    enemies.push(newEnemy);
}

/**
 * Creates a boss enemy by scaling up a normal enemy type.
 */
function createBoss() {
    let x, y;
    const spawnOffset = 29;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
        case 0: x = Math.random() * WORLD_WIDTH; y = -spawnOffset; break;
        case 1: x = WORLD_WIDTH + spawnOffset; y = Math.random() * WORLD_HEIGHT; break;
        case 2: x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT + spawnOffset; break;
        case 3: x = -spawnOffset; y = Math.random() * WORLD_HEIGHT; break;
    }
    const mimickedEmoji = BOSSED_ENEMY_TYPES[Math.floor(Math.random() * BOSSED_ENEMY_TYPES.length)];
    const config = ENEMY_CONFIGS[mimickedEmoji];
    let difficultySpeedMultiplier = (currentDifficulty === 'easy') ? 0.9 : (currentDifficulty === 'medium') ? 1.35 : 1.75;
    const currentBaseEnemySpeed = baseEnemySpeed * difficultySpeedMultiplier * (1 + 0.02 * (player.level - 1));
    const bossSpeed = currentBaseEnemySpeed * config.speedMultiplier * 0.75;
    const bossSize = config.size * 2;
    const boss = {
        x, y, size: bossSize, emoji: mimickedEmoji, speed: bossSpeed, health: BOSS_HEALTH,
        isBoss: true, mimics: mimickedEmoji, isHit: false, isHitByOrbiter: false, isHitByCircle: false,
        isFrozen: false, freezeEndTime: 0, originalSpeed: bossSpeed, isSlowedByPuddle: false,
        isHitByAxe: false, isIgnited: false, ignitionEndTime: 0, lastIgnitionDamageTime: 0
    };
    if (config.initialProps) Object.assign(boss, config.initialProps());
    enemies.push(boss);
    console.log(`Spawned a boss mimicking ${mimickedEmoji} at level ${player.level}`);
}

/**
 * Handles the logic when an enemy dies, including drops and achievements.
 * @param {object} enemy - The enemy object that was defeated.
 * @param {number|null} [explosionId=null] - An ID to track kills from a single explosion.
 */
function handleEnemyDeath(enemy, explosionId = null) {
    if (enemy.isHit) return;
    enemy.isHit = true;
    enemiesDefeatedCount++;
    player.coins++;

    if (Math.random() < boxDropChance) {
        createPickup(enemy.x, enemy.y, 'box', BOX_SIZE, 0);
    }
    // Achievement Tracking
    runStats.killsThisRun++;
    playerStats.totalKills++;
    if(enemy.isBoss) { runStats.bossesKilledThisRun++; playerStats.totalBossesKilled++; }
    if(enemy.emoji === '🧛‍♀️') runStats.vampiresKilledThisRun++;
    if(explosionId) {
        if(!runStats.killsPerExplosion[explosionId]) runStats.killsPerExplosion[explosionId] = 0;
        runStats.killsPerExplosion[explosionId]++;
    }
    checkAchievements();

    createBloodPuddle(enemy.x, enemy.y, enemy.size);
    playSound('enemyDeath');

    if (enemy.isBoss) {
        createPickup(enemy.x, enemy.y, BOSS_XP_EMOJI, enemy.size / 2, BOSS_XP_DROP);
    } else if (enemy.emoji === '🧛‍♀️' || enemy.emoji === '🧟‍♀️') {
        createPickup(enemy.x, enemy.y, '💎', DIAMOND_SIZE, 5);
    } else if (enemy.emoji === '🌀' || enemy.emoji === '🦟') {
        createPickup(enemy.x, enemy.y, DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE);
    } else if (Math.random() < appleDropChance) {
        createAppleItem(enemy.x, enemy.y);
    } else {
        if (enemy.emoji === '🧟') createPickup(enemy.x, enemy.y, COIN_EMOJI, COIN_SIZE, COIN_XP_VALUE);
        else if (enemy.emoji === '💀') createPickup(enemy.x, enemy.y, DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE);
        else if (enemy.emoji === '🦇' || enemy.emoji === '😈') createPickup(enemy.x, enemy.y, RING_SYMBOL_EMOJI, RING_SYMBOL_SIZE, RING_SYMBOL_XP_VALUE);
        else if (enemy.emoji === '👹' || enemy.emoji === '👁️' || enemy.emoji === '👻') createPickup(enemy.x, enemy.y, DEMON_XP_EMOJI, RING_SYMBOL_SIZE, DEMON_XP_VALUE);
    }

    score += 10;
}

/**
 * Creates a generic pickup item (XP gem, box) and adds it to the world.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {string} type - The emoji or 'box' type.
 * @param {number} size - The size of the pickup.
 * @param {number} xpValue - The amount of XP this pickup grants.
 */
function createPickup(x, y, type, size, xpValue) {
    if (x === -1 || y === -1) { x = Math.random() * WORLD_WIDTH; y = Math.random() * WORLD_HEIGHT; }
    pickupItems.push({ x, y, size, type, xpValue, glimmerStartTime: Date.now() + Math.random() * 2000 });
}

/**
 * Creates an apple item and adds it to the world.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 */
function createAppleItem(x, y) {
    appleItems.push({ x, y, size: APPLE_ITEM_SIZE, type: 'apple', spawnTime: Date.now(), lifetime: APPLE_LIFETIME, glimmerStartTime: Date.now() + Math.random() * 2000 });
}

/**
 * Gets a weapon from the object pool and fires it.
 * @param {object} [shooter=player] - The entity firing the weapon.
 * @param {number|null} [customAngle=null] - A specific angle to fire at.
 */
function createWeapon(shooter = player, customAngle = null) {
    let weaponAngle;
    if (customAngle !== null) {
        weaponAngle = customAngle;
    } else if (autoAimActive && enemies.length > 0) {
         let closestEnemy = null; let minDistance = Infinity;
        enemies.forEach(enemy => {
            const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
            if (distSq < minDistance) { minDistance = distSq; closestEnemy = enemy; }
        });
        if (closestEnemy) { weaponAngle = Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x); }
        else { weaponAngle = shooter.rotationAngle; }
    }
    else if (aimDx !== 0 || aimDy !== 0) { weaponAngle = Math.atan2(aimDy, aimDx); }
    else {
        let closestEnemy = null; let minDistance = Infinity;
        enemies.forEach(enemy => {
            const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
            if (distSq < minDistance) { minDistance = distSq; closestEnemy = enemy; }
        });
        if (closestEnemy) { weaponAngle = Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x); }
        else { weaponAngle = shooter.rotationAngle; }
    }

    const fireWeaponFromPool = (angle) => {
        for(const weapon of weaponPool) {
            if(!weapon.active) {
                weapon.x = shooter.x;
                weapon.y = shooter.y;
                weapon.size = shotgunBlastActive ? 30 * player.projectileSizeMultiplier : 38 * player.projectileSizeMultiplier * (rocketLauncherActive ? 2 : 1);
                weapon.speed = 5.04 * player.projectileSpeedMultiplier;
                weapon.angle = angle;
                weapon.dx = Math.cos(angle) * weapon.speed;
                weapon.dy = Math.sin(angle) * weapon.speed;
                weapon.lifetime = Date.now() + 2000;
                weapon.hitsLeft = rocketLauncherActive ? 3 : (ricochetActive ? 2 : 1);
                weapon.hitEnemies.length = 0;
                weapon.active = true;
                return;
            }
        }
    };

    let angles = [weaponAngle];
    if (shotgunBlastActive && shooter === player) {
        angles = [];
        const projectileCount = 8; const spreadAngle = Math.PI / 8;
        for (let i = 0; i < projectileCount; i++) {
            const angleOffset = (Math.random() - 0.5) * spreadAngle;
            angles.push(weaponAngle + angleOffset);
        }
    } else if (vShapeProjectileLevel > 0 && shooter === player) {
        const projectilesToEmit = vShapeProjectileLevel + 1;
        angles = [];
        const totalSpreadAngle = V_SHAPE_INCREMENT_ANGLE * (projectilesToEmit - 1);
        const halfTotalSpread = totalSpreadAngle / 2;
        for (let i = 0; i < projectilesToEmit; i++) {
            angles.push(weaponAngle - halfTotalSpread + i * V_SHAPE_INCREMENT_ANGLE);
        }
    }

    angles.forEach(angle => fireWeaponFromPool(angle));
    if(dualGunActive && shooter === player) { angles.forEach(angle => fireWeaponFromPool(angle + Math.PI)); }

    if (shooter === player) {
        const elementsToShake = [gameContainer, gameStats, pauseButton];
        elementsToShake.forEach(el => {
            if (el) {
                el.classList.remove('ui-shake-active');
                void el.offsetWidth;
                el.classList.add('ui-shake-active');
                el.addEventListener('animationend', () => { el.classList.remove('ui-shake-active'); }, { once: true });
            }
        });
         vibrate(10);
    }

    playSound('playerShoot');
}

/**
 * Creates and fires a weapon for player 2.
 */
function createPlayer2Weapon() {
    if (!player2 || !player2.active) return;
    for(const weapon of weaponPool) {
        if(!weapon.active) {
            weapon.x = player2.x;
            weapon.y = player2.y;
            weapon.size = 38;
            weapon.speed = 5.04;
            weapon.angle = player2.gunAngle;
            weapon.dx = Math.cos(player2.gunAngle) * weapon.speed;
            weapon.dy = Math.sin(player2.gunAngle) * weapon.speed;
            weapon.lifetime = Date.now() + 2000;
            weapon.hitsLeft = 1;
            weapon.hitEnemies.length = 0;
            weapon.active = true;
            break;
        }
    }
    playSound('playerShoot');
}

/**
 * Creates visual blood splatter particles.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 */
function createBloodSplatter(x, y) {
    const particleCount = 6;
    const speed = 2 + Math.random() * 2;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        bloodSplatters.push({
            x: x, y: y, dx: Math.cos(angle) * speed + (Math.random() - 0.5),
            dy: Math.sin(angle) * speed + (Math.random() - 0.5),
            size: 2 + Math.random() * 3, spawnTime: Date.now(), lifetime: 800 + Math.random() * 400
        });
    }
}

/**
 * Creates a lingering blood puddle sprite.
 * @param {number} x - The x-coordinate.
 * @param {number} y - The y-coordinate.
 * @param {number} size - The initial size of the puddle.
 */
function createBloodPuddle(x, y, size) {
    if (!sprites.bloodPuddle) return;
    bloodPuddles.push({
        x: x, y: y, initialSize: size * 1.5,
        spawnTime: Date.now(), rotation: Math.random() * Math.PI * 2, lifetime: 10000
    });
}

/**
 * Initiates the player's dash ability.
 * @param {object} entity - The entity that is dashing (player or player2).
 */
function triggerDash(entity) {
    const now = Date.now();
    if (!entity || entity.isDashing || now - entity.lastDashTime < entity.dashCooldown) {
        return;
    }
    entity.isDashing = true;
    entity.dashEndTime = now + 300;
    entity.lastDashTime = now;
    entity.spinStartTime = now;
    playSound('dodge');
    if (entity === player) {
        playerStats.totalDashes++;
    }
}

/**
 * Spawns initial obstacles like walls and barrels at the start of a game.
 */
function spawnInitialObstacles() {
    destructibles.length = 0;
    const playerSafeRadius = 200;
    const spawnPos = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };

    const barrelCount = 5;
    for (let i = 0; i < barrelCount; i++) {
        let x, y, dist;
        do {
            x = Math.random() * WORLD_WIDTH;
            y = Math.random() * WORLD_HEIGHT;
            dist = Math.hypot(x - spawnPos.x, y - spawnPos.y);
        } while (dist < playerSafeRadius);
        destructibles.push({ x, y, size: 15, health: 1, maxHealth: 1, emoji: '🛢️' });
    }
     const brickCount = 4;
     for (let i = 0; i < brickCount; i++) {
        let x, y, dist;
        do {
            x = Math.random() * WORLD_WIDTH;
            y = Math.random() * WORLD_HEIGHT;
            dist = Math.hypot(x - spawnPos.x, y - spawnPos.y);
        } while (dist < playerSafeRadius);
        destructibles.push({ x, y, size: 30, health: Infinity, emoji: '🧱' });
    }
}

/**
 * Spawns a single barrel at a random edge of the world.
 */
function spawnRandomBarrel() {
    const spawnMargin = 50; let x, y;
    const edge = Math.floor(Math.random() * 4);
    switch(edge) {
        case 0: x = Math.random() * WORLD_WIDTH; y = -spawnMargin; break;
        case 1: x = WORLD_WIDTH + spawnMargin; y = Math.random() * WORLD_HEIGHT; break;
        case 2: x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT + spawnMargin; break;
        case 3: x = -spawnMargin; y = Math.random() * WORLD_HEIGHT; break;
    }
     destructibles.push({ x: x, y: y, size: 15, health: 1, maxHealth: 1, emoji: '🛢️' });
}

/**
 * Handles the effects of a barrel being destroyed (explosion, flame area).
 * @param {object} barrel - The barrel object that was destroyed.
 */
function handleBarrelDestruction(barrel) {
    playSound('enemyDeath');
    const explosionRadius = 54;
    flameAreas.push({ x: barrel.x, y: barrel.y, radius: explosionRadius, startTime: Date.now(), endTime: Date.now() + 3000 });
    enemies.forEach(enemy => {
        if (!enemy.isHit) {
            const dx = enemy.x - barrel.x;
            const dy = enemy.y - barrel.y;
            if (dx*dx + dy*dy < explosionRadius*explosionRadius) {
                enemy.health -= 2;
                createBloodSplatter(enemy.x, enemy.y);
                if (enemy.health <= 0) { handleEnemyDeath(enemy); }
            }
        }
    });
}
