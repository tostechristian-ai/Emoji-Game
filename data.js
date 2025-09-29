// ================================================================================= //
// ============================= DATA.JS =========================================== //
// ================================================================================= //

// --- GLOBAL GAME STATE ---
let gamePaused = false;
let gameOver = false;
let gameActive = false;
let gameStartTime = 0;
let animationFrameId;
let enemiesDefeatedCount = 0;
let lastFrameTime = 0;
let lastCircleSpawnEventTime = 0;
let lastBarrelSpawnTime = 0;
let lastMerchantSpawnTime = 0;
let lastBossLevelSpawned = 0;
let lastBombEmitMs = 0;
let lastAntiGravityPushTime = 0;
let lastBlackHoleTime = 0;
let lastDoppelgangerSpawnTime = 0;
let lastBugSwarmSpawnTime = 0;
let lastLightningStrikeTime = 0;

let score = 0;
let lastEnemySpawnTime = 0;
let enemySpawnInterval = 1000;
let baseEnemySpeed = 0.84;
let lastWeaponFireTime = 0;
let weaponFireInterval = 400;
let fireRateBoostActive = false;
let fireRateBoostEndTime = 0;

// --- CAMERA & WORLD STATE ---
let cameraOffsetX = 0;
let cameraOffsetY = 0;
let cameraAimOffsetX = 0;
let cameraAimOffsetY = 0;
let isPlayerHitShaking = false;
let playerHitShakeStartTime = 0;
let currentDifficulty = 'easy';
let cameraZoom = 1.0;
let currentBackgroundIndex = 0;
let selectedMapIndex = -1;
let equippedCharacterID = 'cowboy';

// --- ANIMATION & VISUAL STATE ---
let orbitingImageAngle = 0;
let damagingCircleAngle = 0;
let whirlwindAxeAngle = 0;
let isTimeStopped = false;
let timeStopEndTime = 0;

// --- QUADTREE ---
let quadtree;

// --- PERSISTENT PLAYER DATA ---
let playerData = {};

const PERMANENT_UPGRADES = {
    playerDamage: { name: "Weapon Power", desc: "Permanently increase base damage by 2%.", baseCost: 100, costIncrease: 1.2, effect: 0.02, maxLevel: 10, icon: '💥' },
    playerSpeed: { name: "Movement Speed", desc: "Permanently increase base movement speed by 1.5%.", baseCost: 80, costIncrease: 1.2, effect: 0.015, maxLevel: 10, icon: '🏃' },
    xpGain: { name: "XP Gain", desc: "Gain 3% more experience from all sources.", baseCost: 90, costIncrease: 1.2, effect: 0.03, maxLevel: 10, icon: '📈' },
    enemyHealth: { name: "Weaken Foes", desc: "Enemies spawn with 2% less health.", baseCost: 150, costIncrease: 1.25, effect: -0.02, maxLevel: 5, icon: '💔' },
    magnetRadius: { name: "Pickup Radius", desc: "Increase pickup attraction radius by 4%.", baseCost: 60, costIncrease: 1.2, effect: 0.04, maxLevel: 10, icon: '🧲' },
    luck: { name: "Luck", desc: "Increase the chance for better drops by 0.1%.", baseCost: 200, costIncrease: 1.3, effect: 0.001, maxLevel: 5, icon: '🍀' }
};

const ALWAYS_AVAILABLE_PICKUPS = {
    v_shape_projectile: { id:'v_shape_projectile', name: 'V-Shape Shots'}, 
    magnetic_projectile: { id:'magnetic_projectile', name: 'Magnetic Shots'},
    ice_projectile: { id:'ice_projectile', name: 'Ice Projectiles'}, 
    ricochet: { id:'ricochet', name: 'Ricochet Shots'},
    explosive_bullets: { id: 'explosive_bullets', name: 'Explosive Bullets'}, 
    puddle_trail: { id:'puddle_trail', name: 'Slime Trail'},
    sword: { id:'sword', name: 'Auto-Sword'}, 
    laser_pointer: { id: 'laser_pointer', name: 'Laser Pointer'},
    auto_aim: { id: 'auto_aim', name: 'Auto Aim'}, 
    dual_gun: { id: 'dual_gun', name: 'Dual Gun'},
    bomb: { id:'bomb', name: 'Bomb Emitter'}, 
    orbiter: { id:'orbiter', name: 'Spinning Orbiter'},
    lightning_projectile: { id:'lightning_projectile', name: 'Lightning Projectile'}
};

const UNLOCKABLE_PICKUPS = {
    map_select: { name: "Map Select", desc: "Unlocks the ability to choose your map.", cost: 1500, icon: '🗺️' },
    night_owl: { name: "Night Owl", desc: "Unlocks a companion that snipes enemies.", cost: 1300, icon: '🦉' },
    whirlwind_axe: { name: "Whirlwind Axe", desc: "Unlocks a large, damaging orbiting axe.", cost: 1000, icon: '🪓' },
    doppelganger: { name: "Doppelganger", desc: "Unlocks the doppelganger pickup.", cost: 1200, icon: '👯' },
    dog_companion: { name: "Dog Companion", desc: "Unlocks the loyal dog companion pickup.", cost: 500, icon: '🐶' },
    anti_gravity: { name: "Anti-Gravity", desc: "Unlocks the enemy-repelling pulse pickup.", cost: 600, icon: '💨' },
    temporal_ward: { name: "Temporal Ward", desc: "Unlocks the time-freezing defensive pickup.", cost: 800, icon: '⏱️' },
    rocket_launcher: { name: "Heavy Shells", desc: "Unlocks the powerful heavy shells pickup.", cost: 1100, icon: '🚀' },
    circle: { name: "Damaging Circle", desc: "Unlocks the persistent damaging aura pickup.", cost: 900, icon: '⭕' },
    flaming_bullets: { name: "Flaming Bullets", desc: "Unlocks bullets that ignite enemies.", cost: 1150, icon: '🔥' },
    black_hole: { name: "Black Hole", desc: "Unlocks the enemy-vortex pickup.", cost: 1180, icon: '⚫' },
    vengeance_nova: { name: "Vengeance Nova", desc: "Unlocks the defensive blast pickup.", cost: 700, icon: '🛡️' }
};

// --- ACHIEVEMENTS & STATS ---
let playerStats = {};
let runStats = {};
let achievementUnlockQueue = [];
let isBannerShowing = false;

const ACHIEVEMENTS = {
    'first_blood': { name: "First Blood", desc: "Kill 1 enemy.", icon: '🔫', unlocked: false },
    'hunter': { name: "Hunter", desc: "Kill 100 enemies.", icon: '🔫', unlocked: false },
    'slayer': { name: "Slayer", desc: "Kill 1,000 enemies.", icon: '🔫', unlocked: false },
    'exterminator': { name: "Exterminator", desc: "Kill 10,000 enemies.", icon: '🔫', unlocked: false },
    'boss_breaker': { name: "Boss Breaker", desc: "Defeat your first boss.", icon: '👑', unlocked: false },
    'boss_crusher': { name: "Boss Crusher", desc: "Defeat 10 bosses.", icon: '👑', unlocked: false },
    'untouchable': { name: "Untouchable", desc: "Kill 100 enemies without taking damage.", icon: '🧘', unlocked: false },
    'sharpshooter': { name: "Sharpshooter", desc: "Land 500 bullets on enemies without missing.", icon: '🎯', unlocked: false },
    'sword_master': { name: "Sword Master", desc: "Kill 500 enemies using Sword Thrust (melee class).", icon: '⚔️', unlocked: false },
    'bone_collector': { name: "Bone Collector", desc: "Kill 1,000 enemies while using Skull & Bones mode.", icon: '☠️', unlocked: false },
    'power_hungry': { name: "Power Hungry", desc: "Pick up 10 power-ups in one game.", icon: '⚡', unlocked: false },
    'fully_loaded': { name: "Fully Loaded", desc: "Unlock every power-up in a single run.", icon: '⚡', unlocked: false },
    'dog_lover': { name: "Dog Lover", desc: "Summon the Dog Companion.", icon: '🐶', unlocked: false },
    'pack_leader': { name: "Pack Leader", desc: "Have 3+ Dog Companions active at once.", icon: '🐶', unlocked: false },
    'dashing_demon': { name: "Dashing Demon", desc: "Dash 500 times in total.", icon: '💨', unlocked: false },
    'survivor': { name: "Survivor", desc: "Last 5 minutes in one run.", icon: '❤️', unlocked: false },
    'endurer': { name: "Endurer", desc: "Last 10 minutes.", icon: '❤️', unlocked: false },
    'unbreakable': { name: "Unbreakable", desc: "Last 20 minutes.", icon: '❤️', unlocked: false },
    'heart_hoarder': { name: "Heart Hoarder", desc: "Reach 10+ hearts at once.", icon: '❤️', unlocked: false },
    'second_wind': { name: "Second Wind", desc: "Recover from 1 heart back up to full health.", icon: '❤️', unlocked: false },
    'treasure_hunter': { name: "Treasure Hunter", desc: "Collect 100 coins.", icon: '💰', unlocked: false },
    'rich_kid': { name: "Rich Kid", desc: "Collect 1,000 coins.", icon: '💰', unlocked: false },
    'millionaire': { name: "Millionaire", desc: "Collect 10,000 coins across all runs.", icon: '💰', unlocked: false },
    'quick_learner': { name: "Quick Learner", desc: "Level up 10 times in one run.", icon: '📈', unlocked: false },
    'xp_god': { name: "XP God", desc: "Reach max level in one game.", icon: '📈', unlocked: false },
    'night_walker': { name: "Night Walker", desc: "Survive 5 minutes in Night Mode.", icon: '🌙', unlocked: false },
    'speed_demon': { name: "Speed Demon", desc: "Win a run while Double Speed cheat is on.", icon: '👟', unlocked: false },
    'chaos_survivor': { name: "Chaos Survivor", desc: "Survive 2 minutes in Chaos Mode.", icon: '🌀', unlocked: false },
    'friend_or_foe': { name: "Friend or Foe", desc: "Player 2 (enemy possession) defeats Player 1's boss.", icon: '👾', unlocked: false },
    'immortal_legend': { name: "Immortal Legend", desc: "Beat a full run without losing a single heart.", icon: '🏆', unlocked: false }
};

// --- CHEATS ---
let cheats = {};

const CHEATS = {
    'click_to_fire': { name: "Click to Fire", desc: "Mouse click fires bullets (no auto-fire). Dodge disabled." },
    'no_gun_mode': { name: "No Gun Mode (Melee Class)", desc: "Gun replaced with Sword Thrust." },
    'skull_bones_mode': { name: "Skull & Bones Mode", desc: "Player sprite = ☠. Bullets replaced with 💀 bones." },
    'one_hit_kill': { name: "One-Hit Kill", desc: "All bullets instantly kill enemies." },
    'rainbow_bullets': { name: "Rainbow Bullets", desc: "Bullets cycle through colors every shot." },
    'rain_of_bullets': { name: "Rain of Bullets", desc: "Bullets randomly fall from the sky every second." },
    'nuke_touch': { name: "Nuke Touch", desc: "If touched by an enemy, all alive enemies are wiped out." },
    'all_powerups_start': { name: "All Power-Ups Start", desc: "Player spawns with every power-up unlocked." },
    'infinite_dash': { name: "Infinite Dash", desc: "Dash has no cooldown; invincible while dashing." },
    'god_mode': { name: "God Mode", desc: "Player cannot take damage (immortal)." },
    'ghost_mode': { name: "Ghost Mode", desc: "Player can walk through enemies & walls." },
    'explosive_player': { name: "Explosive Player", desc: "Dashing creates a small explosion around the player." },
    'shield_aura': { name: "Shield Aura", desc: "Shield blocks one hit every 10s (auto refresh)." },
    'dog_companion_start': { name: "Dog Companion Start", desc: "Always start with dog companion." },
    'clone_army': { name: "Clone Army", desc: "Spawns 3–5 permanent doppelgangers that fight with you." },
    'hearts_start_10': { name: "10 Hearts Start", desc: "Begin game with 10 lives." },
    'vampire_mode': { name: "Vampire Mode", desc: "Killing enemies restores small health." },
    'double_game_speed': { name: "Double Game Speed", desc: "Game runs at 2x movement/action speed." },
    'slow_mo_mode': { name: "Slow-Mo Mode", desc: "Game runs at 50% speed (bullet-time)." },
    'tiny_mode': { name: "Tiny Mode", desc: "Player sprite shrinks to 50%." },
    'giant_mode': { name: "Giant Mode", desc: "Player sprite doubles in size." },
    'enemy_possession': { name: "Enemy Possession Mode", desc: "Player 2 controls a random enemy. Press Insert to swap." },
    'boss_rush_mode': { name: "Boss Rush Mode", desc: "Only bosses spawn." },
    'zombie_enemies': { name: "Zombie Enemies", desc: "Enemies revive once with half health." },
    'magnet_mode': { name: "Magnet Mode", desc: "XP gems & coins fly to player automatically." },
    'coin_rain': { name: "Coin Rain", desc: "Coins drop randomly from the sky." },
    'xp_boost': { name: "XP Boost", desc: "XP gain is doubled." },
    'night_mode': { name: "Night Mode", desc: "Dark overlay simulates nighttime." },
    'mirror_mode': { name: "Mirror Mode", desc: "Map & controls flipped left ↔ right." },
    'chaos_mode': { name: "Chaos Mode", desc: "Random mix of cheats activates at once." }
};

const TROPHY_UNLOCKS_CHEAT = {
    'first_blood': 'click_to_fire', 'hunter': 'no_gun_mode', 'slayer': 'skull_bones_mode', 
    'exterminator': 'one_hit_kill', 'boss_breaker': 'rainbow_bullets', 'boss_crusher': 'rain_of_bullets', 
    'untouchable': 'god_mode', 'sharpshooter': 'infinite_dash', 'sword_master': 'explosive_player', 
    'bone_collector': 'shield_aura', 'power_hungry': 'all_powerups_start', 'fully_loaded': 'chaos_mode', 
    'dog_lover': 'dog_companion_start', 'pack_leader': 'clone_army', 'dashing_demon': 'ghost_mode', 
    'survivor': 'hearts_start_10', 'endurer': 'double_game_speed', 'unbreakable': 'slow_mo_mode', 
    'heart_hoarder': 'giant_mode', 'second_wind': 'tiny_mode', 'treasure_hunter': 'magnet_mode', 
    'rich_kid': 'coin_rain', 'millionaire': 'xp_boost', 'quick_learner': 'nuke_touch', 
    'xp_god': 'boss_rush_mode', 'night_walker': 'night_mode', 'speed_demon': 'mirror_mode',
    'chaos_survivor': 'zombie_enemies', 'friend_or_foe': 'enemy_possession', 'immortal_legend': 'mirror_mode'
};

// --- DATA PERSISTENCE FUNCTIONS ---

function initializePlayerData() {
    playerData = { currency: 0, upgrades: {}, unlockedPickups: {}, hasReducedDashCooldown: false };
    for (const key in PERMANENT_UPGRADES) { playerData.upgrades[key] = 0; }
    for (const key in UNLOCKABLE_PICKUPS) { playerData.unlockedPickups[key] = false; }
}

function loadPlayerData() {
    try {
        const savedData = localStorage.getItem('emojiSurvivorData');
        if (savedData) {
            playerData = JSON.parse(savedData);
            for (const key in PERMANENT_UPGRADES) { 
                if (!playerData.upgrades.hasOwnProperty(key)) { playerData.upgrades[key] = 0; } 
            }
            if (!playerData.unlockedPickups) { playerData.unlockedPickups = {}; }
            for (const key in UNLOCKABLE_PICKUPS) { 
                if (!playerData.unlockedPickups.hasOwnProperty(key)) { playerData.unlockedPickups[key] = false; } 
            }
        } else { initializePlayerData(); }
    } catch (e) { 
        console.error("Failed to load player data", e); 
        initializePlayerData(); 
    }
}

function savePlayerData() { 
    try { 
        localStorage.setItem('emojiSurvivorData', JSON.stringify(playerData)); 
    } catch (e) { 
        console.error("Failed to save player data.", e); 
    } 
}

function initializePlayerStats() {
    playerStats = {
        totalKills: 0,
        totalBossesKilled: 0,
        totalDashes: 0,
        totalCoins: 0,
        totalDeaths: 0,
        achievements: {}
    };
    for(const id in ACHIEVEMENTS) {
        playerStats.achievements[id] = false;
    }
}

function resetRunStats() {
    runStats = {
        killsThisRun: 0,
        bossesKilledThisRun: 0,
        powerupsPickedUp: 0,
        bulletsFired: 0,
        bulletsHit: 0,
        killsWithSword: 0,
        killsWithBones: 0,
        startTime: 0,
        maxHeartsReached: 0,
        hasBeenAtOneHeart: false,
        coinsThisRun: 0,
        levelsGainedThisRun: 0,
        lastDamageTime: 0,
        killsPerExplosion: {}
    };
}

function loadPlayerStats() {
    try {
        const savedStats = localStorage.getItem('emojiSurvivorStats');
        if (savedStats) {
            playerStats = JSON.parse(savedStats);
            for(const id in ACHIEVEMENTS) {
                if (playerStats.achievements && playerStats.achievements[id]) {
                    ACHIEVEMENTS[id].unlocked = true;
                } else if (!playerStats.achievements) {
                    playerStats.achievements = {};
                }
            }
        } else {
            initializePlayerStats();
        }
    } catch (e) {
        console.error("Failed to load player stats, initializing new data.", e);
        initializePlayerStats();
    }
}

function savePlayerStats() {
    try {
        for(const id in ACHIEVEMENTS) {
            playerStats.achievements[id] = ACHIEVEMENTS[id].unlocked;
        }
        localStorage.setItem('emojiSurvivorStats', JSON.stringify(playerStats));
    } catch (e) { console.error("Failed to save player stats.", e); }
}

function loadCheats() {
    try {
        const savedCheats = localStorage.getItem('emojiSurvivorCheats');
        if (savedCheats) {
            cheats = JSON.parse(savedCheats);
        } else {
            for(const id in CHEATS) { cheats[id] = false; }
        }
    } catch(e) {
        console.error("Failed to load cheats.", e);
        for(const id in CHEATS) { cheats[id] = false; }
    }
}

function saveCheats() {
    try {
        localStorage.setItem('emojiSurvivorCheats', JSON.stringify(cheats));
    } catch (e) { console.error("Failed to save cheats.", e); }
}

function saveHighScore(finalScore, finalLevel) {
    try {
        const highScores = JSON.parse(localStorage.getItem('highScores')) || {
            easy: { score: 0, level: 1 }, 
            medium: { score: 0, level: 1 }, 
            hard: { score: 0, level: 1 }
        };
        if (finalScore > highScores[currentDifficulty].score) {
            highScores[currentDifficulty] = { score: finalScore, level: finalLevel };
            localStorage.setItem('highScores', JSON.stringify(highScores));
        }
    } catch (error) { console.error("Could not save high score:", error); }
}

function displayHighScores() {
    try {
        const highScores = JSON.parse(localStorage.getItem('highScores')) || {
            easy: { score: 0, level: 1 }, 
            medium: { score: 0, level: 1 }, 
            hard: { score: 0, level: 1 }
        };
        document.getElementById('easyHighScore').textContent = highScores.easy.score;
        document.getElementById('easyHighLevel').textContent = highScores.easy.level;
        document.getElementById('mediumHighScore').textContent = highScores.medium.score;
        document.getElementById('mediumHighLevel').textContent = highScores.medium.level;
        document.getElementById('hardHighScore').textContent = highScores.hard.score;
        document.getElementById('hardHighLevel').textContent = highScores.hard.level;
    } catch (error) { console.error("Could not display high scores:", error); }
}

function resetAllData() {
    const userConfirmed = window.confirm("Are you sure you want to reset all your progress? This will erase your coins, upgrades, high scores, and ALL achievements permanently.");
    if (userConfirmed) {
        localStorage.removeItem('emojiSurvivorData');
        localStorage.removeItem('highScores');
        localStorage.removeItem('emojiSurvivorStats');
        localStorage.removeItem('emojiSurvivorCheats');
        initializePlayerData();
        initializePlayerStats();
        loadCheats();
        displayHighScores();
        console.log("All player data has been reset.");
    }
}

function applyPermanentUpgrades() {
    player.damageMultiplier = 1 + (playerData.upgrades.playerDamage || 0) * PERMANENT_UPGRADES.playerDamage.effect;
    player.speed = 1.4 * (1 + (playerData.upgrades.playerSpeed || 0) * PERMANENT_UPGRADES.playerSpeed.effect);
    baseEnemySpeed = 0.84 * (1 + (playerData.upgrades.enemyHealth || 0) * PERMANENT_UPGRADES.enemyHealth.effect);
    player.magnetRadius = (player.size * 2) * (1 + (playerData.upgrades.magnetRadius || 0) * PERMANENT_UPGRADES.magnetRadius.effect);
    const luckBonus = (playerData.upgrades.luck || 0) * PERMANENT_UPGRADES.luck.effect;
    boxDropChance = 0.01 + luckBonus; 
    appleDropChance = 0.05 + luckBonus;
}

function applyCheats() {
    if (cheats.hearts_start_10) {
        player.lives = 10;
        player.maxLives = 10;
    }
    if (cheats.all_powerups_start) {
        console.log("Activating all power-ups cheat.");
        for(const powerupKey in ALWAYS_AVAILABLE_PICKUPS){
            activatePowerup(powerupKey);
        }
        for(const powerupKey in UNLOCKABLE_PICKUPS){
             if(playerData.unlockedPickups[powerupKey]){
                 activatePowerup(powerupKey);
             }
        }
    }
    if (cheats.dog_companion_start) {
        activatePowerup('dog_companion
