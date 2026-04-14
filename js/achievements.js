// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT & TROPHY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// This file manages player achievements (trophies), statistics tracking,
// and unlockable cheats. Each trophy unlocks a unique cheat when earned.

// ─── PLAYER STATISTICS ──────────────────────────────────────────────────────
// Tracks lifetime stats across all game sessions
let playerStats = {};

// Tracks stats for the current run only (resets each game)
let runStats = {};

// Queue of achievements waiting to be displayed as banners
let achievementUnlockQueue = [];

// Flag to prevent multiple banners from showing at once
let isBannerShowing = false;

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════
// Each achievement has: name, description, icon emoji, and unlocked status
const ACHIEVEMENTS = {
    // ─── COMBAT ACHIEVEMENTS ────────────────────────────────────────────────
    'first_blood': { name: "First Blood", desc: "Kill 1 enemy.", icon: '🔫', unlocked: false },
    'hunter': { name: "Hunter", desc: "Kill 100 enemies.", icon: '🔫', unlocked: false },
    'slayer': { name: "Slayer", desc: "Kill 1,000 enemies.", icon: '🔫', unlocked: false },
    'exterminator': { name: "Exterminator", desc: "Kill 10,000 enemies.", icon: '🔫', unlocked: false },
    
    // ─── BOSS ACHIEVEMENTS ──────────────────────────────────────────────────
    'boss_breaker': { name: "Boss Breaker", desc: "Defeat your first boss.", icon: '👑', unlocked: false },
    'boss_crusher': { name: "Boss Crusher", desc: "Defeat 10 bosses.", icon: '👑', unlocked: false },
    'run_completed': { name: "Run Completed", desc: "Defeat the Mega Boss and complete a full run!", icon: '🏆', unlocked: false },
    
    // ─── SKILL ACHIEVEMENTS ─────────────────────────────────────────────────
    'untouchable': { name: "Untouchable", desc: "Kill 100 enemies without taking damage.", icon: '🧘', unlocked: false },
    'sharpshooter': { name: "Sharpshooter", desc: "Land 500 bullets on enemies without missing.", icon: '🎯', unlocked: false },
    'sword_master': { name: "Sword Master", desc: "Kill 500 enemies using Sword Thrust (melee class).", icon: '⚔️', unlocked: false },
    'bone_collector': { name: "Bone Collector", desc: "Kill 1,000 enemies while using Skull & Bones mode.", icon: '☠️', unlocked: false },
    
    // ─── POWERUP ACHIEVEMENTS ───────────────────────────────────────────────
    'power_hungry': { name: "Power Hungry", desc: "Pick up 10 power-ups in one game.", icon: '⚡', unlocked: false },
    'fully_loaded': { name: "Fully Loaded", desc: "Unlock every power-up in a single run.", icon: '⚡', unlocked: false },
    
    // ─── COMPANION ACHIEVEMENTS ─────────────────────────────────────────────
    'dog_lover': { name: "Dog Lover", desc: "Summon the Dog Companion.", icon: '🐶', unlocked: false },
    'pack_leader': { name: "Pack Leader", desc: "Have 3+ Dog Companions active at once.", icon: '🐶', unlocked: false },
    
    // ─── MOVEMENT ACHIEVEMENTS ──────────────────────────────────────────────
    'dashing_demon': { name: "Dashing Demon", desc: "Dash 500 times in total.", icon: '💨', unlocked: false },
    
    // ─── SURVIVAL ACHIEVEMENTS ──────────────────────────────────────────────
    'survivor': { name: "Survivor", desc: "Last 5 minutes in one run.", icon: '❤️', unlocked: false },
    'endurer': { name: "Endurer", desc: "Last 10 minutes.", icon: '❤️', unlocked: false },
    'unbreakable': { name: "Unbreakable", desc: "Last 20 minutes.", icon: '❤️', unlocked: false },
    
    // ─── HEALTH ACHIEVEMENTS ────────────────────────────────────────────────
    'heart_hoarder': { name: "Heart Hoarder", desc: "Reach 10+ hearts at once.", icon: '❤️', unlocked: false },
    'second_wind': { name: "Second Wind", desc: "Recover from 1 heart back up to full health.", icon: '❤️', unlocked: false },
    
    // ─── CURRENCY ACHIEVEMENTS ──────────────────────────────────────────────
    'treasure_hunter': { name: "Treasure Hunter", desc: "Collect 100 coins.", icon: '💰', unlocked: false },
    'rich_kid': { name: "Rich Kid", desc: "Collect 1,000 coins.", icon: '💰', unlocked: false },
    'millionaire': { name: "Millionaire", desc: "Collect 10,000 coins across all runs.", icon: '💰', unlocked: false },
    
    // ─── PROGRESSION ACHIEVEMENTS ───────────────────────────────────────────
    'quick_learner': { name: "Quick Learner", desc: "Level up 10 times in one run.", icon: '📈', unlocked: false },
    'xp_god': { name: "XP God", desc: "Reach max level in one game.", icon: '📈', unlocked: false },
    
    // ─── CHALLENGE ACHIEVEMENTS ─────────────────────────────────────────────
    'night_walker': { name: "Night Walker", desc: "Survive 5 minutes in Night Mode.", icon: '🌙', unlocked: false },
    'speed_demon': { name: "Speed Demon", desc: "Win a run while Double Speed cheat is on.", icon: '👟', unlocked: false },
    'chaos_survivor': { name: "Chaos Survivor", desc: "Survive 2 minutes in Chaos Mode.", icon: '🌀', unlocked: false },
    
    // ─── SPECIAL ACHIEVEMENTS ───────────────────────────────────────────────
    'friend_or_foe': { name: "Friend or Foe", desc: "Player 2 (enemy possession) defeats Player 1's boss.", icon: '👾', unlocked: false },
    'immortal_legend': { name: "Immortal Legend", desc: "Beat a full run without losing a single heart.", icon: '🏆', unlocked: false },
    
    // ─── NEW COMBAT ACHIEVEMENTS ────────────────────────────────────────────
    'pyromaniac': { name: "Pyromaniac", desc: "Have 20+ enemies ignited at the same time.", icon: '🔥', unlocked: false },
    'explosion_expert': { name: "Explosion Expert", desc: "Kill 8+ enemies with a single explosion.", icon: '💥', unlocked: false },
    
    // ─── NEW PROGRESSION ACHIEVEMENTS ────────────────────────────────────────
    'weapon_collector': { name: "Weapon Collector", desc: "Unlock every weapon upgrade in a single run.", icon: '📦', unlocked: false },
    'marathon_runner': { name: "Marathon Runner", desc: "Dash 200 times in a single run.", icon: '🏃', unlocked: false },
    
    // ─── NEW SURVIVAL ACHIEVEMENTS ─────────────────────────────────────────
    'iron_soul': { name: "Iron Soul", desc: "Survive 30 minutes in one run.", icon: '⏱️', unlocked: false },
    'berserker': { name: "Berserker", desc: "Kill 500 enemies in 2 minutes.", icon: '😤', unlocked: false }
};

// ═══════════════════════════════════════════════════════════════════════════
// CHEAT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════
// Cheats are unlocked by earning specific achievements
// Each cheat modifies gameplay in interesting ways
const CHEATS = {
    // ─── WEAPON CHEATS ──────────────────────────────────────────────────────
    'click_to_fire': { name: "Click to Fire", desc: "Mouse click fires bullets (no auto-fire). Dodge disabled." },
    'one_hit_kill': { name: "One-Hit Kill", desc: "All bullets instantly kill enemies." },
    'rainbow_bullets': { name: "Rainbow Bullets", desc: "Bullets cycle through colors every shot." },
    'rain_of_bullets': { name: "Rain of Bullets", desc: "Bullets randomly fall from the sky every second." },
    
    // ─── ENEMY CHEATS ───────────────────────────────────────────────────────
    'horde_mode': { name: "Horde Mode", desc: "2x enemy spawn rate and 2x spawn cap. Prepare for chaos!" },
    'boss_rush_mode': { name: "Boss Rush Mode", desc: "Only bosses spawn." },
    'zombie_enemies': { name: "Zombie Enemies", desc: "Enemies revive once with half health." },
    'fastEnemies': { name: "Fast Enemies", desc: "Enemies move 50% faster." },
    'slowEnemies': { name: "Slow Enemies", desc: "Enemies move 50% slower." },
    
    // ─── PLAYER POWER CHEATS ────────────────────────────────────────────────
    'nuke_touch': { name: "Nuke Touch", desc: "If touched by an enemy, all alive enemies are wiped out." },
    'all_powerups_start': { name: "All Power-Ups Start", desc: "Player spawns with every power-up unlocked." },
    'infinite_dash': { name: "Infinite Dash", desc: "Dash has no cooldown; invincible while dashing." },
    'god_mode': { name: "God Mode", desc: "Player cannot take damage (immortal)." },
    'ghost_mode': { name: "Ghost Mode", desc: "Player can walk through enemies & walls." },
    'explosive_player': { name: "Explosive Player", desc: "Dashing creates a small explosion around the player." },
    'shield_aura': { name: "Shield Aura", desc: "Shield blocks one hit every 10s (auto refresh)." },
    
    // ─── COMPANION CHEATS ───────────────────────────────────────────────────
    'dog_companion_start': { name: "Dog Companion Start", desc: "Always start with dog companion." },
    'clone_army': { name: "Clone Army", desc: "Spawns 3–5 permanent doppelgangers that fight with you." },
    
    // ─── HEALTH CHEATS ──────────────────────────────────────────────────────
    'hearts_start_10': { name: "10 Hearts Start", desc: "Begin game with 10 lives." },
    'vampire_mode': { name: "Vampire Mode", desc: "Killing enemies restores small health." },
    
    // ─── SPEED CHEATS ───────────────────────────────────────────────────────
    'double_game_speed': { name: "Double Game Speed", desc: "Game runs at 2x movement/action speed." },
    'slow_mo_mode': { name: "Slow-Mo Mode", desc: "Game runs at 50% speed (bullet-time)." },
    
    // ─── SIZE CHEATS ────────────────────────────────────────────────────────
    'tiny_mode': { name: "Tiny Mode", desc: "Player sprite shrinks to 50%." },
    'giant_mode': { name: "Giant Mode", desc: "Player sprite doubles in size." },
    
    // ─── SPECIAL MODE CHEATS ────────────────────────────────────────────────
    'skull_bones_mode': { name: "Skull & Bones Mode", desc: "Player sprite = ☠. Bullets replaced with 💀 bones." },
    'enemy_possession': { name: "Enemy Possession Mode", desc: "Player 2 controls a random enemy. Press Insert to swap." },
    'magnet_mode': { name: "Magnet Mode", desc: "XP gems & coins fly to player automatically." },
    'coin_rain': { name: "Coin Rain", desc: "Coins drop randomly from the sky." },
    'xp_boost': { name: "XP Boost", desc: "XP gain is doubled." },
    'night_mode': { name: "Night Mode", desc: "Dark overlay simulates nighttime." },
    'mirror_mode': { name: "Mirror Mode", desc: "Map & controls flipped left ↔ right." },
    'chaos_mode': { name: "Chaos Mode", desc: "Random mix of cheats activates at once." },
    
    // ─── NEW COMBAT CHEATS ─────────────────────────────────────────────────
    'inferno_mode': { name: "Inferno Mode", desc: "All enemies spawn ignited and take burn damage over time." },
    'chain_explosion': { name: "Chain Reaction", desc: "Explosions chain to nearby enemies, triggering more explosions!" },
    
    // ─── NEW UTILITY CHEATS ────────────────────────────────────────────────
    'all_weapons_start': { name: "Arsenal Start", desc: "Begin with every weapon upgrade already unlocked." },
    'infinite_stamina': { name: "Infinite Stamina", desc: "Unlimited dash with no cooldown, faster movement." },
    
    // ─── NEW SURVIVAL CHEATS ───────────────────────────────────────────────
    'time_warp': { name: "Time Warp", desc: "Time slows down when enemies get close to you." },
    'second_life': { name: "Second Life", desc: "Once per run, revive at full health instead of dying." }
};

// Storage for which cheats are currently enabled
let cheats = {};

// ═══════════════════════════════════════════════════════════════════════════
// TROPHY → CHEAT UNLOCK MAPPING
// ═══════════════════════════════════════════════════════════════════════════
// Maps achievement IDs to the cheat they unlock
const TROPHY_UNLOCKS_CHEAT = {
    'first_blood': 'click_to_fire',
    'hunter': 'horde_mode',
    'slayer': 'skull_bones_mode',
    'exterminator': 'one_hit_kill',
    'boss_breaker': 'rainbow_bullets',
    'boss_crusher': 'rain_of_bullets',
    'untouchable': 'god_mode',
    'sharpshooter': 'infinite_dash',
    'sword_master': 'explosive_player',
    'bone_collector': 'shield_aura',
    'power_hungry': 'all_powerups_start',
    'fully_loaded': 'chaos_mode',
    'dog_lover': 'dog_companion_start',
    'pack_leader': 'clone_army',
    'dashing_demon': 'ghost_mode',
    'survivor': 'hearts_start_10',
    'endurer': 'double_game_speed',
    'unbreakable': 'slow_mo_mode',
    'heart_hoarder': 'giant_mode',
    'second_wind': 'tiny_mode',
    'treasure_hunter': 'magnet_mode',
    'rich_kid': 'coin_rain',
    'millionaire': 'xp_boost',
    'quick_learner': 'nuke_touch',
    'xp_god': 'boss_rush_mode',
    'night_walker': 'night_mode',
    'speed_demon': 'mirror_mode',
    'chaos_survivor': 'zombie_enemies',
    'friend_or_foe': 'enemy_possession',
    'immortal_legend': 'mirror_mode',
    
    // New achievement → cheat mappings
    'pyromaniac': 'inferno_mode',
    'explosion_expert': 'chain_explosion',
    'weapon_collector': 'all_weapons_start',
    'marathon_runner': 'infinite_stamina',
    'iron_soul': 'time_warp',
    'berserker': 'second_life',
    'run_completed': 'all_powerups_start'
};

// ═══════════════════════════════════════════════════════════════════════════
// STATISTICS INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

// Initialize all player statistics to zero
// Called when starting a new save or resetting progress
function initializePlayerStats() {
    playerStats = {
        // Lifetime combat stats
        totalKills: 0,
        totalBossesKilled: 0,
        totalDashes: 0,
        totalCoins: 0,
        totalDeaths: 0,
        
        // Lifetime collection stats
        totalBoxesOpened: 0,
        totalApplesEaten: 0,
        
        // Lifetime ability stats
        totalEnemiesFrozen: 0,
        totalEnemiesHitByLightning: 0,
        
        // Achievement unlock status
        achievements: {}
    };
    
    // Initialize all achievements as locked
    for(const id in ACHIEVEMENTS) {
        playerStats.achievements[id] = false;
    }
}

// Reset run-specific statistics
// Called at the start of each new game
function resetRunStats() {
    runStats = {
        // Combat tracking
        killsThisRun: 0,
        bossesKilledThisRun: 0,
        bulletsFired: 0,
        bulletsHit: 0,
        
        // Special kill tracking
        killsWithSword: 0,
        killsWithBones: 0,
        vampiresKilledThisRun: 0,
        
        // Powerup tracking
        powerupsPickedUp: 0,
        uniquePowerupsPickedUp: {},
        
        // Time tracking
        startTime: 0,
        
        // Health tracking
        maxHeartsReached: 0,
        hasBeenAtOneHeart: false,
        recoveredToFullAfterOneHeart: false,
        damageTakenThisRun: 0,
        lastDamageTime: 0,
        killsSinceDamage: 0,
        
        // Collection tracking
        coinsThisRun: 0,
        xpCollectedThisRun: 0,
        applesEatenThisRun: 0,
        
        // Progression tracking
        levelsGainedThisRun: 0,
        
        // Companion tracking
        doppelgangerActiveTimeThisRun: 0,
        lastDoppelgangerStartTime: 0,
        
        // Explosion tracking (for achievements)
        killsPerExplosion: {},
        
        // ─── NEW TRACKING FOR NEW ACHIEVEMENTS ────────────────────────────────
        // Movement tracking
        dashesThisRun: 0,
        
        // Weapon unlock tracking
        uniqueWeaponsUnlocked: {}
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE/LOAD SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Load player statistics from browser localStorage
function loadPlayerStats() {
    try {
        const savedStats = localStorage.getItem('emojiSurvivorStats');
        
        if (savedStats) {
            playerStats = JSON.parse(savedStats);
            
            // Backfill missing numeric counters for older saves
            const numericDefaults = {
                totalKills: 0,
                totalBossesKilled: 0,
                totalDashes: 0,
                totalCoins: 0,
                totalDeaths: 0,
                totalBoxesOpened: 0,
                totalApplesEaten: 0,
                totalEnemiesFrozen: 0,
                totalEnemiesHitByLightning: 0
            };
            
            // Ensure all numeric stats exist and are valid
            for (const k in numericDefaults) {
                if (typeof playerStats[k] !== 'number' || !Number.isFinite(playerStats[k])) {
                    playerStats[k] = numericDefaults[k];
                }
            }
            
            // Load achievement unlock status
            for(const id in ACHIEVEMENTS) {
                if (playerStats.achievements && playerStats.achievements[id]) {
                    ACHIEVEMENTS[id].unlocked = true;
                } else if (!playerStats.achievements) {
                    playerStats.achievements = {};
                }
            }
            
            // Ensure all achievement keys exist
            for (const id in ACHIEVEMENTS) {
                if (typeof playerStats.achievements[id] !== 'boolean') {
                    playerStats.achievements[id] = !!ACHIEVEMENTS[id].unlocked;
                }
            }
        } else {
            // No save found, initialize fresh stats
            initializePlayerStats();
        }
    } catch (e) {
        console.error("Failed to load player stats, initializing new data.", e);
        initializePlayerStats();
    }
}

// Save player statistics to browser localStorage
function savePlayerStats() {
    try {
        // Sync achievement unlock status to playerStats
        for(const id in ACHIEVEMENTS) {
            playerStats.achievements[id] = ACHIEVEMENTS[id].unlocked;
        }
        
        localStorage.setItem('emojiSurvivorStats', JSON.stringify(playerStats));
    } catch (e) {
        console.error("Failed to save player stats.", e);
    }
}

// Load cheat enable/disable status from localStorage
function loadCheats() {
    try {
        const savedCheats = localStorage.getItem('emojiSurvivorCheats');
        
        if (savedCheats) {
            cheats = JSON.parse(savedCheats);
        } else {
            // Initialize all cheats as disabled
            for(const id in CHEATS) {
                cheats[id] = false;
            }
        }
    } catch(e) {
        console.error("Failed to load cheats.", e);
        // Initialize all cheats as disabled on error
        for(const id in CHEATS) {
            cheats[id] = false;
        }
    }
}

// Save cheat enable/disable status to localStorage
function saveCheats() {
    try {
        localStorage.setItem('emojiSurvivorCheats', JSON.stringify(cheats));
    } catch (e) {
        console.error("Failed to save cheats.", e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT BANNER DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

// Display the next achievement banner from the queue
// Shows one banner at a time with animation
// Click/tap to dismiss early
function showAchievementBanner() {
    // Don't show if already showing or queue is empty
    if (isBannerShowing || achievementUnlockQueue.length === 0) {
        return;
    }
    
    isBannerShowing = true;
    
    // Get the next achievement from the queue
    const trophyId = achievementUnlockQueue.shift();
    const trophy = ACHIEVEMENTS[trophyId];

    // Update banner content
    document.getElementById('achievement-banner-icon').textContent = trophy.icon;
    document.getElementById('achievement-banner-name').textContent = `Trophy Unlocked!`;
    document.getElementById('achievement-banner-desc').textContent = trophy.name;
    
    // Show the banner with CSS animation
    achievementBanner.classList.add('show');
    achievementBanner.classList.remove('dismiss');
    
    // Handler to dismiss banner early on click/tap
    const dismissBanner = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Remove event listeners to prevent multiple triggers
        achievementBanner.removeEventListener('click', dismissBanner);
        achievementBanner.removeEventListener('touchstart', dismissBanner);
        // Add dismiss class for quick exit animation
        achievementBanner.classList.add('dismiss');
    };
    
    // Add click/tap listeners
    achievementBanner.addEventListener('click', dismissBanner);
    achievementBanner.addEventListener('touchstart', dismissBanner, { passive: false });
    
    // When animation ends, hide banner and show next one
    const onAnimationEnd = () => {
        achievementBanner.classList.remove('show');
        achievementBanner.classList.remove('dismiss');
        achievementBanner.removeEventListener('animationend', onAnimationEnd);
        achievementBanner.removeEventListener('click', dismissBanner);
        achievementBanner.removeEventListener('touchstart', dismissBanner);
        isBannerShowing = false;
        
        // Wait a bit before showing the next banner
        setTimeout(showAchievementBanner, 300);
    };
    
    achievementBanner.addEventListener('animationend', onAnimationEnd);
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT UNLOCK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Unlock an achievement and add it to the display queue
// @param id - The achievement ID to unlock
function unlockAchievement(id) {
    // Only unlock if it exists and isn't already unlocked
    if (ACHIEVEMENTS[id] && !ACHIEVEMENTS[id].unlocked) {
        ACHIEVEMENTS[id].unlocked = true;
        
        // Provide feedback to the player
        vibrate(50);
        playUISound('levelUpSelect');
        
        // Add to queue for banner display
        achievementUnlockQueue.push(id);
        showAchievementBanner();
        
        // Save progress
        savePlayerStats();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT CHECKING LOGIC
// ═══════════════════════════════════════════════════════════════════════════

// Check all achievement conditions and unlock any that are met
// Called periodically during gameplay (throttled to once per second)
function checkAchievements() {
    // Don't check if game isn't active
    if(!gameActive || gameOver) return;
    
    const now = Date.now();
    const survivalTime = now - runStats.startTime;

    // ─── COMBAT ACHIEVEMENTS ────────────────────────────────────────────────
    if(runStats.killsThisRun >= 1) unlockAchievement('first_blood');
    if(runStats.killsThisRun >= 100) unlockAchievement('hunter');
    if(playerStats.totalKills >= 1000) unlockAchievement('slayer');
    if(playerStats.totalKills >= 10000) unlockAchievement('exterminator');
    
    // ─── BOSS ACHIEVEMENTS ──────────────────────────────────────────────────
    if(runStats.bossesKilledThisRun >= 1) unlockAchievement('boss_breaker');
    if(playerStats.totalBossesKilled >= 10) unlockAchievement('boss_crusher');
    
    // ─── SURVIVAL ACHIEVEMENTS ──────────────────────────────────────────────
    if(survivalTime >= 5 * 60 * 1000) unlockAchievement('survivor');      // 5 minutes
    if(survivalTime >= 10 * 60 * 1000) unlockAchievement('endurer');      // 10 minutes
    if(survivalTime >= 20 * 60 * 1000) unlockAchievement('unbreakable');  // 20 minutes
    
    // ─── CURRENCY ACHIEVEMENTS ──────────────────────────────────────────────
    if(runStats.coinsThisRun >= 100) unlockAchievement('treasure_hunter');
    if(runStats.coinsThisRun >= 1000) unlockAchievement('rich_kid');
    if(playerStats.totalCoins >= 10000) unlockAchievement('millionaire');
    
    // ─── PROGRESSION ACHIEVEMENTS ───────────────────────────────────────────
    if(runStats.levelsGainedThisRun >= 10) unlockAchievement('quick_learner');
    
    // ─── CHALLENGE ACHIEVEMENTS ─────────────────────────────────────────────
    if(cheats.night_mode && survivalTime >= 5 * 60 * 1000) unlockAchievement('night_walker');
    if(cheats.chaos_mode && survivalTime >= 2 * 60 * 1000) unlockAchievement('chaos_survivor');
    if(cheats.double_game_speed && survivalTime >= 2 * 60 * 1000) unlockAchievement('speed_demon');
    
    // ─── SKILL ACHIEVEMENTS ─────────────────────────────────────────────────
    if (runStats.killsSinceDamage >= 100) unlockAchievement('untouchable');
    if (runStats.killsWithSword >= 500) unlockAchievement('sword_master');
    if (runStats.bulletsFired >= 500 && runStats.bulletsHit >= 500 && 
        runStats.bulletsFired === runStats.bulletsHit) unlockAchievement('sharpshooter');
    
    // ─── POWERUP ACHIEVEMENTS ───────────────────────────────────────────────
    if (runStats.powerupsPickedUp >= 10) unlockAchievement('power_hungry');
    if (runStats.uniquePowerupsPickedUp && runStats.uniquePowerupsPickedUp.dog_companion) {
        unlockAchievement('dog_lover');
    }
    
    // ─── MOVEMENT ACHIEVEMENTS ──────────────────────────────────────────────
    if (playerStats.totalDashes >= 500) unlockAchievement('dashing_demon');
    
    // ─── HEALTH ACHIEVEMENTS ────────────────────────────────────────────────
    if (runStats.maxHeartsReached >= 10) unlockAchievement('heart_hoarder');
    if (runStats.recoveredToFullAfterOneHeart) unlockAchievement('second_wind');
    
    // ─── PERFECT RUN ACHIEVEMENT ────────────────────────────────────────────
    if (runStats.damageTakenThisRun === 0 && survivalTime >= 5 * 60 * 1000) {
        unlockAchievement('immortal_legend');
    }
    
    // ─── NEW SURVIVAL ACHIEVEMENTS ─────────────────────────────────────────
    if (survivalTime >= 30 * 60 * 1000) unlockAchievement('iron_soul'); // 30 minutes
    
    // ─── NEW COMBAT ACHIEVEMENTS ──────────────────────────────────────────
    // Pyromaniac - 20+ enemies ignited at once (checked via update._ignitedEnemyCount)
    if (typeof update !== 'undefined' && update._ignitedEnemyCount >= 20) {
        unlockAchievement('pyromaniac');
    }
    
    // Explosion Expert - 8+ kills with single explosion
    if (runStats.killsPerExplosion) {
        for (const explosionId in runStats.killsPerExplosion) {
            if (runStats.killsPerExplosion[explosionId] >= 8) {
                unlockAchievement('explosion_expert');
                break;
            }
        }
    }
    
    // ─── NEW PROGRESSION ACHIEVEMENTS ─────────────────────────────────────
    // Weapon Collector - unlock all weapons in one run
    if (runStats.uniqueWeaponsUnlocked && Object.keys(runStats.uniqueWeaponsUnlocked).length >= 8) {
        unlockAchievement('weapon_collector');
    }
    
    // Marathon Runner - 200 dashes in one run
    if (runStats.dashesThisRun >= 200) {
        unlockAchievement('marathon_runner');
    }
    
    // Berserker - 500 kills in 2 minutes
    if (runStats.killsThisRun >= 500 && survivalTime <= 2 * 60 * 1000) {
        unlockAchievement('berserker');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI DISPLAY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Display all achievements in the achievements modal
// Shows locked and unlocked achievements with different styling
function displayAchievements() {
    achievementsContainer.innerHTML = '';
    
    for (const id in ACHIEVEMENTS) {
        const achievement = ACHIEVEMENTS[id];
        
        // Create achievement card
        const card = document.createElement('div');
        card.className = 'achievement-card' + (achievement.unlocked ? ' unlocked' : '');
        
        card.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-details">
                <h4>${achievement.name}</h4>
                <p>${achievement.desc}</p>
            </div>
        `;
        
        achievementsContainer.appendChild(card);
    }
}

// Display all cheats in the cheats modal
// Shows which cheats are unlocked and allows toggling them on/off
function displayCheats() {
    cheatsContainer.innerHTML = '';
    
    for (const id in CHEATS) {
        const cheat = CHEATS[id];
        
        // Find which trophy unlocks this cheat
        const unlockedByTrophyId = Object.keys(TROPHY_UNLOCKS_CHEAT).find(
            key => TROPHY_UNLOCKS_CHEAT[key] === id
        );
        
        // Check if the trophy is unlocked
        const isUnlocked = unlockedByTrophyId && ACHIEVEMENTS[unlockedByTrophyId]?.unlocked;
        
        // Create cheat card
        const card = document.createElement('div');
        card.className = 'cheat-card' + (isUnlocked ? '' : ' locked');
        
        // Create toggle switch for unlocked cheats, lock icon for locked ones
        const toggleHTML = isUnlocked ? `
            <label class="switch">
                <input type="checkbox" id="cheat-${id}" ${cheats[id] ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
        ` : '<span>🔒</span>';

        card.innerHTML = `
            <div class="cheat-info">
                <h4>${cheat.name}</h4>
                <p>${isUnlocked ? cheat.desc : `Unlock the "${ACHIEVEMENTS[unlockedByTrophyId]?.name}" trophy.`}</p>
            </div>
            ${toggleHTML}
        `;
        
        cheatsContainer.appendChild(card);
        
        // Add event listener for toggle switch if unlocked
        if (isUnlocked) {
            document.getElementById(`cheat-${id}`).addEventListener('change', (e) => {
                cheats[id] = e.target.checked;
                saveCheats();
            });
        }
    }
}
