// ================================================================================= //
        // ============================ ACHIEVEMENT SYSTEM ================================= //
        // ================================================================================= //
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
        let cheats = {};

        const TROPHY_UNLOCKS_CHEAT = {
            'first_blood': 'click_to_fire', 'hunter': 'no_gun_mode', 'slayer': 'skull_bones_mode', 'exterminator': 'one_hit_kill', 'boss_breaker': 'rainbow_bullets', 'boss_crusher': 'rain_of_bullets', 'untouchable': 'god_mode', 'sharpshooter': 'infinite_dash', 'sword_master': 'explosive_player', 'bone_collector': 'shield_aura', 'power_hungry': 'all_powerups_start', 'fully_loaded': 'chaos_mode', 'dog_lover': 'dog_companion_start', 'pack_leader': 'clone_army', 'dashing_demon': 'ghost_mode', 'survivor': 'hearts_start_10', 'endurer': 'double_game_speed', 'unbreakable': 'slow_mo_mode', 'heart_hoarder': 'giant_mode', 'second_wind': 'tiny_mode', 'treasure_hunter': 'magnet_mode', 'rich_kid': 'coin_rain', 'millionaire': 'xp_boost', 'quick_learner': 'nuke_touch', 'xp_god': 'boss_rush_mode', 'night_walker': 'night_mode', 'speed_demon': 'mirror_mode', // Mirror mode unlock
            'chaos_survivor': 'zombie_enemies', 'friend_or_foe': 'enemy_possession', 'immortal_legend': 'mirror_mode' // Also Mirror mode
        };


        function initializePlayerStats() {
            playerStats = {
                totalKills: 0,
                totalBossesKilled: 0,
                totalDashes: 0,
                totalCoins: 0,
                totalDeaths: 0,
                totalBoxesOpened: 0,
                totalApplesEaten: 0,
                totalEnemiesFrozen: 0,
                totalEnemiesHitByLightning: 0,
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
                uniquePowerupsPickedUp: {},
                bulletsFired: 0,
                bulletsHit: 0,
                killsWithSword: 0,
                killsWithBones: 0,
                startTime: 0,
                maxHeartsReached: 0,
                hasBeenAtOneHeart: false,
                recoveredToFullAfterOneHeart: false,
                coinsThisRun: 0,
                levelsGainedThisRun: 0,
                lastDamageTime: 0,
                damageTakenThisRun: 0,
                killsSinceDamage: 0,
                vampiresKilledThisRun: 0,
                xpCollectedThisRun: 0,
                applesEatenThisRun: 0,
                doppelgangerActiveTimeThisRun: 0,
                lastDoppelgangerStartTime: 0,
                killsPerExplosion: {}
            };
        }

        function loadPlayerStats() {
            try {
                const savedStats = localStorage.getItem('emojiSurvivorStats');
                if (savedStats) {
                    playerStats = JSON.parse(savedStats);
                    // Backfill missing numeric counters (older saves).
                    const numericDefaults = {
                        totalKills: 0, totalBossesKilled: 0, totalDashes: 0, totalCoins: 0, totalDeaths: 0,
                        totalBoxesOpened: 0, totalApplesEaten: 0, totalEnemiesFrozen: 0, totalEnemiesHitByLightning: 0
                    };
                    for (const k in numericDefaults) {
                        if (typeof playerStats[k] !== 'number' || !Number.isFinite(playerStats[k])) playerStats[k] = numericDefaults[k];
                    }
                    for(const id in ACHIEVEMENTS) {
                        if (playerStats.achievements && playerStats.achievements[id]) {
                            ACHIEVEMENTS[id].unlocked = true;
                        } else if (!playerStats.achievements) {
                            playerStats.achievements = {};
                        }
                    }
                    // Ensure all achievement keys exist.
                    for (const id in ACHIEVEMENTS) {
                        if (typeof playerStats.achievements[id] !== 'boolean') playerStats.achievements[id] = !!ACHIEVEMENTS[id].unlocked;
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

        function showAchievementBanner() {
            if (isBannerShowing || achievementUnlockQueue.length === 0) {
                return;
            }
            isBannerShowing = true;
            const trophyId = achievementUnlockQueue.shift();
            const trophy = ACHIEVEMENTS[trophyId];

            document.getElementById('achievement-banner-icon').textContent = trophy.icon;
            document.getElementById('achievement-banner-name').textContent = `Trophy Unlocked!`;
            document.getElementById('achievement-banner-desc').textContent = trophy.name;
            
            achievementBanner.classList.add('show');
            
            achievementBanner.addEventListener('animationend', () => {
                achievementBanner.classList.remove('show');
                isBannerShowing = false;
                setTimeout(showAchievementBanner, 500); 
            }, { once: true });
        }


        function unlockAchievement(id) {
            if (ACHIEVEMENTS[id] && !ACHIEVEMENTS[id].unlocked) {
                ACHIEVEMENTS[id].unlocked = true;
                vibrate(50);
                playUISound('levelUpSelect');
                achievementUnlockQueue.push(id);
                showAchievementBanner();
                savePlayerStats();
            }
        }

        function checkAchievements() {
            if(!gameActive || gameOver) return;
            const now = Date.now();
            const survivalTime = now - runStats.startTime;

            if(runStats.killsThisRun >= 1) unlockAchievement('first_blood');
            if(runStats.killsThisRun >= 100) unlockAchievement('hunter');
            if(playerStats.totalKills >= 1000) unlockAchievement('slayer');
            if(playerStats.totalKills >= 10000) unlockAchievement('exterminator');
            if(runStats.bossesKilledThisRun >= 1) unlockAchievement('boss_breaker');
            if(playerStats.totalBossesKilled >= 10) unlockAchievement('boss_crusher');
            if(survivalTime >= 5 * 60 * 1000) unlockAchievement('survivor');
            if(survivalTime >= 10 * 60 * 1000) unlockAchievement('endurer');
            if(survivalTime >= 20 * 60 * 1000) unlockAchievement('unbreakable');
            if(runStats.coinsThisRun >= 100) unlockAchievement('treasure_hunter');
            if(runStats.coinsThisRun >= 1000) unlockAchievement('rich_kid');
            if(playerStats.totalCoins >= 10000) unlockAchievement('millionaire');
            if(runStats.levelsGainedThisRun >= 10) unlockAchievement('quick_learner');
            if(cheats.night_mode && survivalTime >= 5 * 60 * 1000) unlockAchievement('night_walker');

            // Additional trophy logic (previously missing / never triggered)
            if (runStats.killsSinceDamage >= 100) unlockAchievement('untouchable');
            if (runStats.powerupsPickedUp >= 10) unlockAchievement('power_hungry');
            if (runStats.uniquePowerupsPickedUp && runStats.uniquePowerupsPickedUp.dog_companion) unlockAchievement('dog_lover');
            if (playerStats.totalDashes >= 500) unlockAchievement('dashing_demon');
            if (runStats.maxHeartsReached >= 10) unlockAchievement('heart_hoarder');
            if (runStats.recoveredToFullAfterOneHeart) unlockAchievement('second_wind');
            if (cheats.chaos_mode && survivalTime >= 2 * 60 * 1000) unlockAchievement('chaos_survivor');
            if (cheats.double_game_speed && survivalTime >= 2 * 60 * 1000) unlockAchievement('speed_demon');
            if (runStats.damageTakenThisRun === 0 && survivalTime >= 5 * 60 * 1000) unlockAchievement('immortal_legend');
            if (runStats.killsWithSword >= 500) unlockAchievement('sword_master');
            if (runStats.bulletsFired >= 500 && runStats.bulletsHit >= 500 && runStats.bulletsFired === runStats.bulletsHit) unlockAchievement('sharpshooter');
        }

        function displayAchievements() {
            achievementsContainer.innerHTML = '';
            for (const id in ACHIEVEMENTS) {
                const achievement = ACHIEVEMENTS[id];
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

        function displayCheats() {
            cheatsContainer.innerHTML = '';
            for (const id in CHEATS) {
                const cheat = CHEATS[id];
                const unlockedByTrophyId = Object.keys(TROPHY_UNLOCKS_CHEAT).find(key => TROPHY_UNLOCKS_CHEAT[key] === id);
                const isUnlocked = unlockedByTrophyId && ACHIEVEMENTS[unlockedByTrophyId]?.unlocked;
                
                const card = document.createElement('div');
                card.className = 'cheat-card' + (isUnlocked ? '' : ' locked');
                
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
                
                if (isUnlocked) {
                    document.getElementById(`cheat-${id}`).addEventListener('change', (e) => {
                        cheats[id] = e.target.checked;
                        saveCheats();
                    });
                }
            }
        }

