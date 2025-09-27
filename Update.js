// A safe way to get a unique Tone.js time
        
        let p2aimDx = 0;
    let p2aimDy = 0;
    
    function getSafeToneTime() {
            let now = Tone.now();
            let lastTime = getSafeToneTime.lastTime || 0;
            if (now <= lastTime) {
                now = lastTime + 0.001;
            }
            getSafeToneTime.lastTime = now;
            return now;
        }
    
   function spawnMerchant() {
    // This function now adds a new merchant to the array each time it's called.
    let x, y;
    const spawnOffset = 50;
    const angle = Math.random() * 2 * Math.PI;
    const distance = (WORLD_WIDTH / 2) + Math.random() * (WORLD_WIDTH / 2);
    x = player.x + Math.cos(angle) * distance;
    y = player.y + Math.sin(angle) * distance;

    x = Math.max(spawnOffset, Math.min(WORLD_WIDTH - spawnOffset, x));
    y = Math.max(spawnOffset, Math.min(WORLD_HEIGHT - spawnOffset, y));

    // Add a new merchant object to the 'merchants' array
    merchants.push({ x: x, y: y, size: 40 }); 
    console.log(`A new merchant has appeared! Total merchants: ${merchants.length}`);
}
        


        // ================================================================================= //
        // ======================= OPTIMIZATION: QUADTREE IMPLEMENTATION =================== //
        // ================================================================================= //
        class Quadtree {
            constructor(bounds, maxObjects = 10, maxLevels = 4, level = 0) {
                this.bounds = bounds;
                this.maxObjects = maxObjects;
                this.maxLevels = maxLevels;
                this.level = level;
                this.objects = [];
                this.nodes = [];
            }

            clear() {
                this.objects = [];
                if (this.nodes.length) {
                    for (let i = 0; i < this.nodes.length; i++) {
                        this.nodes[i].clear();
                    }
                }
                this.nodes = [];
            }

            split() {
                const nextLevel = this.level + 1;
                const subWidth = this.bounds.width / 2;
                const subHeight = this.bounds.height / 2;
                const x = this.bounds.x;
                const y = this.bounds.y;

                this.nodes[0] = new Quadtree({ x: x + subWidth, y: y, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
                this.nodes[1] = new Quadtree({ x: x, y: y, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
                this.nodes[2] = new Quadtree({ x: x, y: y + subHeight, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
                this.nodes[3] = new Quadtree({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
            }

            getIndex(pRect) {
                let index = -1;
                const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
                const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

                const topQuadrant = (pRect.y < horizontalMidpoint && pRect.y + pRect.height < horizontalMidpoint);
                const bottomQuadrant = (pRect.y > horizontalMidpoint);

                if (pRect.x < verticalMidpoint && pRect.x + pRect.width < verticalMidpoint) {
                    if (topQuadrant) {
                        index = 1;
                    } else if (bottomQuadrant) {
                        index = 2;
                    }
                } else if (pRect.x > verticalMidpoint) {
                    if (topQuadrant) {
                        index = 0;
                    } else if (bottomQuadrant) {
                        index = 3;
                    }
                }
                return index;
            }

            insert(pRect) {
                if (this.nodes.length) {
                    const index = this.getIndex(pRect);
                    if (index !== -1) {
                        this.nodes[index].insert(pRect);
                        return;
                    }
                }

                this.objects.push(pRect);

                if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
                    if (!this.nodes.length) {
                        this.split();
                    }
                    let i = 0;
                    while (i < this.objects.length) {
                        const index = this.getIndex(this.objects[i]);
                        if (index !== -1) {
                            this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                        } else {
                            i++;
                        }
                    }
                }
            }

            retrieve(pRect) {
                let returnObjects = this.objects;
                const index = this.getIndex(pRect);
                if (this.nodes.length && index !== -1) {
                    returnObjects = returnObjects.concat(this.nodes[index].retrieve(pRect));
                }
                 // Add all objects from child nodes that might overlap
                else if (this.nodes.length) {
                     for(let i=0; i < this.nodes.length; i++) {
                         returnObjects = returnObjects.concat(this.nodes[i].retrieve(pRect));
                     }
                }

                return returnObjects;
            }
        }


        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        // ================================================================================= //
        // ======================= OPTIMIZATION: PRE-RENDERING SYSTEM ====================== //
        // ================================================================================= //
        const preRenderedEntities = {};

        function preRenderEmoji(emoji, size) {
            const bufferCanvas = document.createElement('canvas');
            const bufferCtx = bufferCanvas.getContext('2d');
            const paddedSize = size * 1.3;
            bufferCanvas.width = paddedSize;
            bufferCanvas.height = paddedSize;
            bufferCtx.font = `${size}px sans-serif`;
            bufferCtx.textAlign = 'center';
            bufferCtx.textBaseline = 'middle';
            bufferCtx.fillText(emoji, paddedSize / 2, paddedSize / 2);
            preRenderedEntities[emoji] = bufferCanvas;
        }

        function initializePreRenders() {
            // --- ENEMIES ---
            preRenderEmoji('🧟', 17);
            preRenderEmoji('💀', 20);
            preRenderEmoji('🦇', 25 * 0.85);
            preRenderEmoji('🐌', 22);
            preRenderEmoji('🦟', 15);
            preRenderEmoji('😈', 20 * 0.8);
            preRenderEmoji('👹', 28 * 0.7);
            preRenderEmoji('👻', 22);
            preRenderEmoji('👁️', 25 * 0.6);
            preRenderEmoji('🧟‍♀️', 17 * 1.75);
            preRenderEmoji('🧛‍♀️', 20);
            // --- PICKUPS & EFFECTS ---
            preRenderEmoji('🔸', COIN_SIZE);
            preRenderEmoji('🔹', DIAMOND_SIZE);
            preRenderEmoji('💠', RING_SYMBOL_SIZE);
            preRenderEmoji('♦️', RING_SYMBOL_SIZE);
            preRenderEmoji('🍎', APPLE_ITEM_SIZE);
            preRenderEmoji('💣', BOMB_SIZE);
            preRenderEmoji('⚡️', LIGHTNING_SIZE);
            preRenderEmoji('🧿', EYE_PROJECTILE_SIZE);
            preRenderEmoji('🪓', WHIRLWIND_AXE_SIZE);
            preRenderEmoji('🐶', 25);
            preRenderEmoji('🦉', 30);
            preRenderEmoji('🧱', 30); 
            preRenderEmoji('🛢️', 15); 
            console.log("All emojis have been pre-rendered to memory.");
        }


        // --- SPRITE LOADING ---
        const spritePaths = {
            gun: 'sprites/gun.png',
            bullet: 'sprites/bullet.png',
            circle: 'sprites/circle.png',
            pickupBox: 'sprites/pickupbox.png',
            slime: 'sprites/slime.png',
            playerUp: 'sprites/playerup.png',
            playerDown: 'sprites/playerdown.png',
            playerLeft: 'sprites/playerleft.png',
            playerRight: 'sprites/playerright.png',
            levelUpBox: 'sprites/levelupbox.png',
            spinninglight: 'sprites/spinninglight.png',
            bloodPuddle: 'sprites/blood.png',
            crosshair: 'sprites/crosshair.png'
        };

        const sprites = {};
        let assetsLoadedCount = 0;
        const totalSprites = Object.keys(spritePaths).length;

        const audioPaths = {
            playerShoot: 'audio/fire_shot.mp3',
            xpPickup: 'audio/pick_up_xp.mp3',
            boxPickup: 'audio/pick_up_power.mp3',
            levelUp: 'audio/level_up.mp3',
            levelUpSelect: 'audio/level_up_end.mp3',
            enemyDeath: 'audio/enemy_death.mp3',
            gameOver: 'audio/gameover.mp3',
            playerScream: 'audio/scream.mp3',
            uiClick: 'audio/click.mp3',
            mainMenu: 'audio/mainmenu.mp3',
            dodge: 'audio/dodge.mp3'
        };
        const audioPlayers = {};
        const totalAudio = Object.keys(audioPaths).length;
        const backgroundPaths = [ 
            'sprites/Background6.png', // NOW Map 1 will load Background6.png
            'sprites/Background2.png', // NOW Map 2 will load Background2.png
            'sprites/Background3.png', // NOW Map 3 will load Background3.png
            'sprites/Background4.png', // NOW Map 4 will load Background4.png
            'sprites/Background5.png',  // Map 5: Molten Lava
            'sprites/Background8.png',  // Map 6: Orange Dirt
            'sprites/Background1.png',  // Map 7: Grey Stone
            'sprites/Background7.png', // Map 8: Other Grassy
            'sprites/Background9.png'  // Map 9: Other Stone
            
        ];
        const backgroundImages = new Array(backgroundPaths.length);
        const totalBackgrounds = backgroundPaths.length;
        const totalAssets = totalSprites + totalAudio + totalBackgrounds;
        
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        function showInitialScreen() {
            const loadingScreen = document.getElementById('loadingScreen');
            const splashScreen = document.getElementById('splashScreen');
            const startScreen = document.getElementById('startScreen');
            const difficultyContainer = document.getElementById('difficultyContainer');
            
            loadingScreen.style.display = 'none';
            startScreen.style.display = 'none';


            if (!window.hasLoadedOnce) {
                splashScreen.style.display = 'flex';
                playUISound('levelUp');
                playUISound('levelUpSelect');
                vibrate(50);
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                    difficultyContainer.style.display = 'block';
                    window.hasLoadedOnce = true;
                    startMainMenuBGM();
                }, 3000);
            } else {
                difficultyContainer.style.display = 'block';
                startMainMenuBGM();
            }
        }

        function assetLoaded() {
            assetsLoadedCount++;
            if (assetsLoadedCount === totalAssets) {
                console.log('All game assets loaded successfully.');
                document.getElementById('levelUpBox').src = sprites.levelUpBox.src;
                
                initializePreRenders(); // <-- OPTIMIZATION: Initialize pre-renders

                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('startScreen').style.display = 'flex';
            }
        }
        
        function loadSprite(name, path) {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                sprites[name] = img;
                assetLoaded();
            };
            img.onerror = () => console.error(`Failed to load sprite: ${path}`);
        }

        function loadAudio(name, path) {
            const player = new Tone.Player({
                url: path,
                autostart: false,
                loop: name === 'mainMenu',
                onload: assetLoaded
            }).toDestination();
            audioPlayers[name] = player;
        }

        function loadBackground(path, index) {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                backgroundImages[index] = img; // Assign to the correct index instead of push
                assetLoaded();
            };
            img.onerror = () => console.error(`Failed to load background: ${path}`);
        }

        for (const [name, path] of Object.entries(spritePaths)) loadSprite(name, path);
        for (const [name, path] of Object.entries(audioPaths)) loadAudio(name, path);
        backgroundPaths.forEach((path, index) => loadBackground(path, index));
        
        const gameContainer = document.getElementById('gameContainer');
        const movementStickBase = document.getElementById('movement-stick-base');
        const movementStickCap = document.getElementById('movement-stick-cap');
        const firestickBase = document.getElementById('fire-stick-base');
        const firestickCap = document.getElementById('fire-stick-cap');

        const currentLevelSpan = document.getElementById('currentLevel');
        const currentScoreSpan = document.getElementById('currentScore');
        const currentXpSpan = document.getElementById('currentXp');
        const requiredXpSpan = document.getElementById('requiredXp');
        const xpBar = document.getElementById('xpBar');
        const playerLivesIcon = document.getElementById('playerLivesIcon');
        const appleCounterSpan = document.getElementById('appleCounter');
        const coinCounterSpan = document.getElementById('coinCounter');

        const upgradeMenu = document.getElementById('upgradeMenu');
        const upgradeOptionsContainer = document.getElementById('upgradeOptionsContainer');
        const levelUpBoxImage = document.getElementById('levelUpBox');
        
        const merchantShop = document.getElementById('merchantShop');
        const merchantOptionsContainer = document.getElementById('merchantOptionsContainer');
        const leaveMerchantButton = document.getElementById('leaveMerchantButton');

        const gameOverlay = document.getElementById('gameOverlay');
        const finalScoreSpan = document.getElementById('finalScore');
        const coinsEarnedSpan = document.getElementById('coinsEarned');
        const finalTimeSpan = document.getElementById('finalTime');
        const restartButton = document.getElementById('restartButton');
        const loadingStoryDiv = document.getElementById('loadingStory');
        const storytellerOutputDiv = document.getElementById('storytellerOutput');

        const difficultyContainer = document.getElementById('difficultyContainer');
        const difficultyScreen = document.getElementById('difficultyScreen');
        const difficultyButtons = document.querySelectorAll('.difficulty-buttons button:not(#howToPlayButton):not(#desktopUpgradesButton):not(#characterSelectButton)');
        const howToPlayButton = document.getElementById('howToPlayButton');
        const gameGuideModal = document.getElementById('gameGuideModal');
        const backToDifficultyButton = document.getElementById('backToDifficultyButton');
        
        const pauseButton = document.getElementById('pauseButton');
        const pauseOverlay = document.getElementById('pauseOverlay');
        const powerupIconsDiv = document.getElementById('powerupIcons');
        const upgradeStatsDiv = document.getElementById('upgradeStats'); 
        const musicVolumeSlider = document.getElementById('musicVolume');
        const effectsVolumeSlider = document.getElementById('effectsVolume');
        const pauseRestartButton = document.getElementById('pauseRestartButton');
        const resumeButton = document.getElementById('resumeButton');
        const startButton = document.getElementById('startButton');
        const gameStats = document.getElementById('gameStats');
        const gameStartOverlay = document.getElementById('gameStartOverlay');
        const gameStartText = document.getElementById('gameStartText');
        const gameStartDifficulty = document.getElementById('gameStartDifficulty');
        const zoomToggle = document.getElementById('zoomToggle');

        const upgradeShop = document.getElementById('upgradeShop');
        const desktopUpgradesButton = document.getElementById('desktopUpgradesButton');
        const backToMenuButton = document.getElementById('backToMenuButton');
        const currencyDisplay = document.getElementById('currencyDisplay');
        const permanentUpgradesContainer = document.getElementById('permanentUpgradesContainer');
        const unlockablePickupsContainer = document.getElementById('unlockablePickupsContainer');
        
        const mapSelectContainer = document.getElementById('mapSelectContainer');
        const mapTilesContainer = document.getElementById('mapTilesContainer');
        const backToDifficultySelectButton = document.getElementById('backToDifficultySelectButton');

        const characterSelectContainer = document.getElementById('characterSelectContainer');
        const characterSelectButton = document.getElementById('characterSelectButton');
        const characterTilesContainer = document.getElementById('characterTilesContainer');
        const backToMenuFromCharsButton = document.getElementById('backToMenuFromCharsButton');


        // Achievement & Cheat UI
        const desktopAchievementsButton = document.getElementById('desktopAchievementsButton');
        const desktopResetButton = document.getElementById('desktopResetButton');
        const achievementsModal = document.getElementById('achievementsModal');
        const backToMenuFromAchievements = document.getElementById('backToMenuFromAchievements');
        const achievementsContainer = document.getElementById('achievementsContainer');
        const achievementBanner = document.getElementById('achievement-banner');
        const cheatsMenuButton = document.getElementById('cheatsMenuButton');
        const cheatsModal = document.getElementById('cheatsModal');
        const backToAchievementsButton = document.getElementById('backToAchievementsButton');
        const cheatsContainer = document.getElementById('cheatsContainer');
        const mobileResetButton = document.getElementById('mobileResetButton');

        // New Mobile Menu Buttons
        const mobileMenuUpgradesButton = document.getElementById('mobileMenuUpgradesButton');
        const mobileMenuTrophiesButton = document.getElementById('mobileMenuTrophiesButton');
        const mobileMenuCheatsButton = document.getElementById('mobileMenuCheatsButton');

        let quadtree; // *** OPTIMIZATION: Quadtree will be initialized here
        let currentDifficulty = 'easy';
        let cameraZoom = 1.0;
        let currentBackgroundIndex = 0;
        let selectedMapIndex = -1;
        let equippedCharacterID = 'cowboy';


        const joystickRadius = 51;

        const WORLD_WIDTH = 1125 * 1.5;
        const WORLD_HEIGHT = 845 * 1.5;

        let cameraOffsetX = 0;
        let cameraOffsetY = 0;
        let cameraAimOffsetX = 0;
        let cameraAimOffsetY = 0;
        const CAMERA_PULL_STRENGTH = 35;
        const CAMERA_LERP_FACTOR = 0.05;

        let isPlayerHitShaking = false; 
        let playerHitShakeStartTime = 0; 
        const PLAYER_HIT_SHAKE_DURATION = 300;
        const MAX_PLAYER_HIT_SHAKE_OFFSET = 5;
        
        const BOB_AMPLITUDE = 2.5;

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
            spinStartTime: null, // For spin animation
            spinDirection: 0, // For spin animation

            upgradeLevels: {
                speed: 0, fireRate: 0, magnetRadius: 0, damage: 0, projectileSpeed: 0, knockback: 0, luck: 0
            }
        };

        let player2 = null;
        
        let doppelganger = null;
        let doppelgangerActive = false;
        let lastDoppelgangerSpawnTime = 0;
        const DOPPELGANGER_SPAWN_INTERVAL = 14000;
        const DOPPELGANGER_DURATION = 8000; 
        const DOPPELGANGER_FIRE_INTERVAL = 500;

        const COIN_SIZE = 10;
        const COIN_EMOJI = '🔸';
        const COIN_XP_VALUE = 1;

        const DIAMOND_SIZE = 12;
        const DIAMOND_EMOJI = '🔹';
        const DIAMOND_XP_VALUE = 2;

        const RING_SYMBOL_SIZE = 11;
        const RING_SYMBOL_EMOJI = '💠';
        const RING_SYMBOL_XP_VALUE = 3;

        const DEMON_XP_EMOJI = '♦️';
        const DEMON_XP_VALUE = 4;

        let orbitingImageAngle = 0;
        const ORBIT_POWER_UP_SIZE = 20;
        const ORBIT_RADIUS = 35;
        const ORBIT_SPEED = 0.05;

        let damagingCircleAngle = 0;
        const DAMAGING_CIRCLE_SPIN_SPEED = 0.03;
        const DAMAGING_CIRCLE_RADIUS = 70;
        const DAMAGING_CIRCLE_DAMAGE_INTERVAL = 2000;

        const LIGHTNING_EMOJI = '⚡️';
        const LIGHTNING_SIZE = 10;
        const LIGHTNING_SPAWN_INTERVAL = 3000;

        const V_SHAPE_INCREMENT_ANGLE = Math.PI / 18;

        const SWORD_SIZE = player.size * 0.75;
        const SWORD_SWING_INTERVAL = 2000;
        const SWORD_SWING_DURATION = 200;
        const SWORD_THRUST_DISTANCE = player.size * 0.7;

        const EYE_EMOJI = '👁️';
        const EYE_SIZE = 25 * 0.6;
        const EYE_HEALTH = 4;
        const EYE_SPEED_MULTIPLIER = 1.1;
        const EYE_SAFE_DISTANCE = player.size * 6;
        const EYE_TOO_FAR_DISTANCE = WORLD_WIDTH / 4;
        const EYE_PROJECTILE_EMOJI = '🧿';
        const EYE_PROJECTILE_SIZE = EYE_SIZE / 2;
        const EYE_PROJECTILE_SPEED = 5.6;
        const EYE_PROJECTILE_LIFETIME = 4000;
        const EYE_PROJECTILE_INTERVAL = 2000;

        const VAMPIRE_EMOJI = '🧛‍♀️';
        const VAMPIRE_SIZE = 20;
        const VAMPIRE_HEALTH = 5;
        const VAMPIRE_SPEED_MULTIPLIER = 1.2;
        const VAMPIRE_DODGE_DETECTION_RADIUS = 200;
        const VAMPIRE_DODGE_STRENGTH = 1.5;

        const FEMALE_ZOMBIE_EMOJI = '🧟‍♀️';
        const FEMALE_ZOMBIE_SIZE = 17 * 1.75;
        const FEMALE_ZOMBIE_HEALTH = 6;
        const FEMALE_ZOMBIE_SPEED_MULTIPLIER = 0.5;

        const PLAYER_PUDDLE_SIZE = player.size / 1.5;
        const PLAYER_PUDDLE_SPAWN_INTERVAL = 80;
        const PLAYER_PUDDLE_LIFETIME = 3000;
        const PLAYER_PUDDLE_SLOW_FACTOR = 0.5;

        const MOSQUITO_EMOJI = '🦟';
        const MOSQUITO_SIZE = 15;
        const MOSQUITO_HEALTH = 2;
        const MOSQUITO_SPEED_MULTIPLIER = 1.5;
        const MOSQUITO_DIRECTION_UPDATE_INTERVAL = 3000;

        const MOSQUITO_PUDDLE_EMOJI = '♨️';
        const MOSQUITO_PUDDLE_SIZE = player.size * 0.7;
        const MOSQUITO_PUDDLE_SPAWN_INTERVAL = 500;
        const MOSQUITO_PUDDLE_LIFETIME = 2000;
        const MOSQUITO_PUDDLE_SLOW_FACTOR = 0.5;

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
        let merchants = []; // Changed from 'merchant = null' to an array
        let lastMerchantSpawnTime = 0;
        const MERCHANT_SPAWN_INTERVAL = 70000; // Correct value for 3 minutes (3 * 60 * 1000)

        // --- NEW FEATURES ---
        let bugSwarmActive = false;
        let flies = [];
        let lastBugSwarmSpawnTime = 0;
        const BUG_SWARM_INTERVAL = 9000;
        const BUG_SWARM_COUNT = 6;
        const FLY_DAMAGE = 0.34;
        const FLY_SPEED = 3.5;
        const FLY_SIZE = 8;

        let nightOwlActive = false;
        let owl = null; 
        let owlProjectiles = [];
        const OWL_FIRE_INTERVAL = 1500;
        const OWL_PROJECTILE_SPEED = 6;
        const OWL_PROJECTILE_SIZE = 15;
        const OWL_FOLLOW_DISTANCE = 60;

        let whirlwindAxeActive = false;
        let whirlwindAxeAngle = 0;
        const WHIRLWIND_AXE_RADIUS = ORBIT_RADIUS * 2;
        const WHIRLWIND_AXE_SPEED = 0.04;
        const WHIRLWIND_AXE_SIZE = 30;

        let lightningStrikeActive = false;
        let lightningStrikes = []; 
        let lastLightningStrikeTime = 0;
        const LIGHTNING_STRIKE_INTERVAL = 7000;
        const LIGHTNING_STRIKE_DAMAGE = 1;
        let hasDashInvincibility = false;

        const APPLE_ITEM_EMOJI = '🍎';
        const APPLE_ITEM_SIZE = 15;
        let appleDropChance = 0.05;
        const APPLE_LIFETIME = 5000;
        let appleItems = [];

        const BASE_ZOMBIE_HEALTH = 1;
        const BASE_SKULL_HEALTH = 2;
        const BASE_BAT_HEALTH = 3;
        const BASE_DEMON_HEALTH = 4;

        const SKULL_EMOJI = '💀';
        const SKULL_SIZE = 20;
        const SKULL_SPEED_MULTIPLIER = 1.15;

        const BAT_EMOJI = '🦇';
        const BAT_SIZE = 25 * 0.85;
        const BAT_SPEED_MULTIPLIER = 2;
        const BAT_PAUSE_DURATION_FRAMES = 30;
        const BAT_MOVE_DURATION_FRAMES = 30;

        const DEMON_EMOJI = '👹';
        const DEMON_SIZE = 28 * 0.7;
        const DEMON_SPEED_MULTIPLIER = 1.8975;

        const MAGNET_STRENGTH = 0.5;

        let gamePaused = false;
        let gameOver = false;
        let gameActive = false;
        let gameStartTime = 0;
        let animationFrameId;
        let enemiesDefeatedCount = 0;
        let lastFrameTime = 0;
        let lastCircleSpawnEventTime = 0; 
        let lastBarrelSpawnTime = 0;
        
        const UPGRADE_BORDER_COLORS = {
            "speed": "#66bb6a", "fireRate": "#8B4513", "magnetRadius": "#800080",
            "damage": "#ff0000", "projectileSpeed": "#007bff", "knockback": "#808080", "luck": "#FFD700"
        };

        const UPGRADE_OPTIONS = [
            { name: "Fast Runner", desc: "Increase movement speed by 8%", type: "speed", value: 0.08, icon: '🏃' },
            { name: "Rapid Fire", desc: "Increase fire rate by 8%", type: "fireRate", value: 0.08, icon: '🔫' },
            { name: "Magnet Field", desc: "Increase pickup radius by 8%", type: "magnetRadius", value: 0.08, icon: '🧲' },
            { name: "Increased Damage", desc: "Increase projectile damage by 15%", type: "damage", value: 0.15, icon: '💥' },
            { name: "Swift Shots", desc: "Increase projectile speed by 8%", type: "projectileSpeed", value: 0.08, icon: '💨' },
            { name: "Power Shot", desc: "Projectiles knock enemies back by 8%", type: "knockback", value: 0.08, icon: '💪' },
            { name: "Lucky Charm", desc: "Increase pickup drop rate by 0.5%", type: "luck", value: 0.005, icon: '🍀' }
        ];

        let enemies = [];
        
        // OPTIMIZATION: WEAPON OBJECT POOL
        const MAX_WEAPONS = 500;
        const weaponPool = [];
        for (let i = 0; i < MAX_WEAPONS; i++) {
            weaponPool.push({ active: false, hitEnemies: [] });
        }
        
        let bombs = [];
        const BOX_SIZE = 25;
        let boxDropChance = 0.01;

        const BOMB_SIZE = 14;
        const BOMB_LIFETIME_MS = 8000;
        const BOMB_INTERVAL_MS = 5000;

        const ANTI_GRAVITY_INTERVAL = 5000;
        const ANTI_GRAVITY_RADIUS = 200;
        const ANTI_GRAVITY_STRENGTH = 60;

        const BLACK_HOLE_INTERVAL = 10000;
        const BLACK_HOLE_PULL_DURATION = 3000;
        const BLACK_HOLE_DELAY = 3000;
        const BLACK_HOLE_RADIUS = 167;
        const BLACK_HOLE_PULL_STRENGTH = 2.5;

        let bombEmitterActive = false; let lastBombEmitMs = 0;
        let orbitingPowerUpActive = false;
        let damagingCircleActive = false; let lastDamagingCircleDamageTime = 0;
        let lightningProjectileActive = false; let lastLightningSpawnTime = 0;
        let magneticProjectileActive = false;
        let vShapeProjectileLevel = 0;
        let iceProjectileActive = false;
        let puddleTrailActive = false; let lastPlayerPuddleSpawnTime = 0;
        let laserPointerActive = false; 
        let autoAimActive = false;
        let explosiveBulletsActive = false;
        let vengeanceNovaActive = false;
        let dogCompanionActive = false;
        let antiGravityActive = false; let lastAntiGravityPushTime = 0;
        let ricochetActive = false;
        let rocketLauncherActive = false;
        let blackHoleActive = false; let lastBlackHoleTime = 0;
        let dualGunActive = false;
        let flamingBulletsActive = false;
        let shotgunBlastActive = false;
        
        let dog = { x: 0, y: 0, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 };
        const DOG_HOMING_SHOT_INTERVAL = 3000;
        
        let temporalWardActive = false;
        let isTimeStopped = false;
        let timeStopEndTime = 0;

        let score = 0;
        let lastEnemySpawnTime = 0;
        let enemySpawnInterval = 1000;
        let baseEnemySpeed = 0.84;

        let lastWeaponFireTime = 0;
        let weaponFireInterval = 400;

// ================================================================================= //
// ======================= GAMEPAD INPUT & MENU NAVIGATION ========================= //
// ================================================================================= //
let gamepadIndex = null;
const GAMEPAD_DEADZONE = 0.2;
let isGamepadUpgradeMode = false;
let selectedUpgradeIndex = 0;
let lastGamepadUpdate = 0;
const GAMEPAD_INPUT_DELAY = 200; // milliseconds
// --- NEW MENU NAVIGATION STATE ---
let currentMenuElements = []; 
let currentMenuIndex = 0;
let isGeneralMenuMode = false;
let lastGamepadState = {}; // To track button press vs. hold
const MENU_INPUT_DELAY = 200; 

function applyDeadzone(v, dz = GAMEPAD_DEADZONE) {
  return Math.abs(v) < dz ? 0 : v;
}

function getGamepad() {
    if (gamepadIndex == null) return null;
    return navigator.getGamepads?.()[gamepadIndex] || null;
}

window.addEventListener("gamepadconnected", (e) => {
  console.log("Gamepad connected:", e.gamepad.id);
  gamepadIndex = e.gamepad.index;
});
window.addEventListener("gamepaddisconnected", (e) => {
  if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
});

// The universal menu navigation function
function handleMenuNavigation(gp) {
    const now = Date.now();
    if (now - lastGamepadUpdate < MENU_INPUT_DELAY) return;

    // --- Determine Active Menu and Elements ---
    let elements = [];
    let is1DHorizontal = false;
    let cardsPerRow = 3; // Default for upgrade cards / character tiles

    if (upgradeMenu.style.display === 'flex') {
        elements = Array.from(document.querySelectorAll('#upgradeOptionsContainer .upgrade-card'));
        isGeneralMenuMode = false; // Separate logic for upgrade menu is still used below
        return; // Let the existing upgrade logic handle it for now
    } else if (difficultyScreen.style.display === 'block') {
        // Difficulty buttons: Easy, Medium, Hard, HowToPlay, DesktopUpgrades, CharacterSelect, etc.
        // It's a single column list of buttons in the HTML structure
        elements = Array.from(document.querySelectorAll('#difficultyScreen > button, #difficultyScreen > .difficulty-buttons > button'));
        elements = elements.filter(el => el.style.display !== 'none'); // Filter out hidden buttons
        isGeneralMenuMode = true;
        is1DHorizontal = false; // It's a vertical menu list
    } else if (characterSelectContainer.style.display === 'flex') {
        elements = Array.from(document.querySelectorAll('#characterTilesContainer .character-tile'));
        isGeneralMenuMode = true;
        cardsPerRow = 4; // Assuming 4 characters per row
        is1DHorizontal = false; // Treat as 2D grid
    } else if (mapSelectContainer.style.display === 'flex') {
        elements = Array.from(document.querySelectorAll('#mapTilesContainer .map-tile'));
        isGeneralMenuMode = true;
        cardsPerRow = 3; // Assuming 3 maps per row
        is1DHorizontal = false; // Treat as 2D grid
    } else if (pauseOverlay.style.display === 'flex') {
        elements = Array.from(document.querySelectorAll('#pauseOverlay button, #pauseOverlay input[type="range"]'));
        isGeneralMenuMode = true;
        is1DHorizontal = false; // Vertical list of buttons/sliders
    } else {
        isGeneralMenuMode = false;
        currentMenuElements = [];
        return;
    }
    
    // Filter to only include interactive elements (buttons, ranges, etc.)
    currentMenuElements = elements.filter(el => el.tabIndex !== -1 && el.offsetParent !== null);
    
    if (!isGeneralMenuMode || currentMenuElements.length === 0) return;

    const stickX = applyDeadzone(gp.axes[0]);
    const stickY = applyDeadzone(gp.axes[1]);
    
    // Map D-pad to axes for simpler check
    const dpadRight = gp.buttons[15]?.pressed || (stickX > 0.5);
    const dpadLeft = gp.buttons[14]?.pressed || (stickX < -0.5);
    const dpadDown = gp.buttons[13]?.pressed || (stickY > 0.5);
    const dpadUp = gp.buttons[12]?.pressed || (stickY < -0.5);

    // Check for "just pressed" using lastGamepadState
    const movedRight = dpadRight && !lastGamepadState.dpadRight;
    const movedLeft = dpadLeft && !lastGamepadState.dpadLeft;
    const movedDown = dpadDown && !lastGamepadState.dpadDown;
    const movedUp = dpadUp && !lastGamepadState.dpadUp;

    let selectionChanged = false;
    let newIndex = currentMenuIndex;
    
    // --- Selection Movement Logic ---
    if (movedRight || movedLeft || movedUp || movedDown) {
        
        // 1D Horizontal (e.g., small button groups)
        if (is1DHorizontal) {
            if (movedRight) newIndex = (currentMenuIndex + 1) % currentMenuElements.length;
            if (movedLeft) newIndex = (currentMenuIndex - 1 + currentMenuElements.length) % currentMenuElements.length;
        } 
        // 1D Vertical (e.g., Difficulty/Pause Menu)
        else if (!is1DHorizontal && currentMenuElements.length <= cardsPerRow) {
             if (movedDown) newIndex = (currentMenuIndex + 1) % currentMenuElements.length;
             if (movedUp) newIndex = (currentMenuIndex - 1 + currentMenuElements.length) % currentMenuElements.length;
        }
        // 2D Grid (e.g., Character/Map Select)
        else {
            // Calculate current row/col
            const numCols = cardsPerRow;
            const numRows = Math.ceil(currentMenuElements.length / numCols);
            const currentCol = currentMenuIndex % numCols;
            const currentRow = Math.floor(currentMenuIndex / numCols);

            if (movedRight) newIndex = (currentMenuIndex + 1);
            if (movedLeft) newIndex = (currentMenuIndex - 1);
            
            if (movedDown) newIndex = currentMenuIndex + numCols;
            if (movedUp) newIndex = currentMenuIndex - numCols;

            // Clamp and wrap logic
            if (newIndex >= currentMenuElements.length) {
                // Wrap down (or clamp to last row)
                 if (movedDown) newIndex = currentCol; // Wrap to top row
                 else newIndex = currentMenuElements.length - 1; // Clamp right/left
            } else if (newIndex < 0) {
                // Wrap up (or clamp to first row)
                 if (movedUp) newIndex = currentMenuElements.length - (numCols - currentCol); // Wrap to bottom row
                 else newIndex = 0; // Clamp left/right
            }
            
            // Ensure newIndex is a valid index
            newIndex = Math.min(Math.max(0, newIndex), currentMenuElements.length - 1);
        }

        if (newIndex !== currentMenuIndex) {
            // Remove selection from previous element
            currentMenuElements[currentMenuIndex].classList.remove('selected');
            
            // Set new index
            currentMenuIndex = newIndex;
            
            // Add selection to new element
            currentMenuElements[currentMenuIndex].classList.add('selected');
            
            // Scroll selected element into view
            currentMenuElements[currentMenuIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            
            playUISound('uiClick');
            vibrate(10);
            selectionChanged = true;
        }
    }
    
    // --- Selection Activation (A Button / Button 0) ---
    const confirmButtonPressed = gp.buttons[0]?.pressed && !lastGamepadState.button0;
    
    if (confirmButtonPressed) {
        const selectedElement = currentMenuElements[currentMenuIndex];
        if (selectedElement) {
            // If it's a range slider, don't "click" it, but maybe adjust value?
             if (selectedElement.tagName === 'INPUT' && selectedElement.type === 'range') {
                 // Do nothing on A press for sliders for now, maybe B for back
             } else {
                selectedElement.click();
                playUISound('levelUpSelect');
                vibrate(20);
             }
        }
    }
    
    // --- Store Current State for Next Frame's Comparison ---
    lastGamepadState = {
        dpadRight: dpadRight,
        dpadLeft: dpadLeft,
        dpadDown: dpadDown,
        dpadUp: dpadUp,
        button0: gp.buttons[0]?.pressed // A/X button
    };
    
    if (movedRight || movedLeft || movedUp || movedDown || confirmButtonPressed) {
        lastGamepadUpdate = now;
    }
}

// Call each frame (in updateGame or similar)
function handleGamepadInput() {
    const gp = getGamepad();
    if (!gp) return;

    // --- UNIVERSAL MENU NAVIGATION ---
    if (gamePaused || isGeneralMenuMode || isGamepadUpgradeMode) {
        handleMenuNavigation(gp);
    }
    
    // --- UPGRADE MENU GAMEPAD LOGIC (Existing Logic) ---
    if (isGamepadUpgradeMode) {
        const now = Date.now();
        if (now - lastGamepadUpdate > GAMEPAD_INPUT_DELAY) {
            let moved = false;
            const prevIndex = selectedUpgradeIndex;
            const numOptions = document.querySelectorAll('.upgrade-card').length;
            
            // Check for horizontal movement (D-pad left/right or left stick)
            if (gp.buttons[15].pressed || gp.axes[0] > 0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex + 1) % numOptions;
                moved = true;
            } 
            else if (gp.buttons[14].pressed || gp.axes[0] < -0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex - 1 + numOptions) % numOptions;
                moved = true;
            }
            
            // Check for vertical movement (D-pad up/down)
            const cardsPerRow = 3; 
            if (gp.buttons[12].pressed) {
                selectedUpgradeIndex = Math.max(0, selectedUpgradeIndex - cardsPerRow);
                moved = true;
            } else if (gp.buttons[13].pressed) {
                selectedUpgradeIndex = Math.min(numOptions - 1, selectedUpgradeIndex + cardsPerRow);
                moved = true;
            }

            if (moved && prevIndex !== selectedUpgradeIndex) {
                const cards = document.querySelectorAll('.upgrade-card');
                const prevCard = cards[prevIndex];
                if (prevCard) {
                    prevCard.classList.remove('selected');
                }
                const newCard = cards[selectedUpgradeIndex];
                if (newCard) {
                    newCard.classList.add('selected');
                    playUISound('uiClick');
                    vibrate(10);
                }
                lastGamepadUpdate = now;
            }
            
            // Check for confirmation button (e.g., A/X button) - Already handled in universal logic
            if (gp.buttons[0].pressed && !lastGamepadState.button0) {
                 const selectedCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                 if (selectedCard) {
                     // Find the button inside the card and click it
                     const button = selectedCard.querySelector('button');
                     if(button) {
                         button.click();
                         isGamepadUpgradeMode = false;
                         lastGamepadUpdate = now;
                         return;
                     }
                 }
            }
        }
    }

    // --- EXISTING GAMEPAD MOVEMENT & ACTION LOGIC ---
    if (!gamePaused && gameActive) {
        let lx = applyDeadzone(gp.axes[0] || 0);
        let ly = applyDeadzone(gp.axes[1] || 0);
        const lmag = Math.hypot(lx, ly);
        if (lmag > 0) {
            joystickDirX = lx / lmag;
            joystickDirY = ly / lmag;
        } else {
            joystickDirX = 0;
            joystickDirY = 0;
        }
        
        // ===== PLAYER 2 GAMEPAD INPUT (Co-op) =====
        const gp2 = navigator.getGamepads?.()[1]; // Get the second gamepad (index 1)
        if (player2 && player2.active && gp2) {
            // Movement from Left Stick
            let lx2 = applyDeadzone(gp2.axes[0] || 0);
            let ly2 = applyDeadzone(gp2.axes[1] || 0);
            const lmag2 = Math.hypot(lx2, ly2);
            if (lmag2 > 0) {
                player2.dx = lx2 / lmag2;
                player2.dy = ly2 / lmag2;
            } else {
                player2.dx = 0;
                player2.dy = 0;
            }

            // Dodge/Dash from Right Trigger
            const pressed2 = (i) => !!gp2.buttons?.[i]?.pressed;
            if (pressed2(7) && !player2._rTriggerLatch) {
                player2._rTriggerLatch = true;
                triggerDash(player2);
            } else if (!pressed2(7)) {
                player2._rTriggerLatch = false;
            }
        }
        
        // Aiming from Right Stick (Player 1)
        let rx = applyDeadzone(gp.axes[2] || 0);
        let ry = applyDeadzone(gp.axes[3] || 0);
        const rmag = Math.hypot(rx, ry);
        if (rmag > 0) {
            aimDx = rx / rmag;
            aimDy = ry / rmag;
        } else {
            aimDx = 0;
            aimDy = 0;
        }

        const pressed = (i) => !!gp.buttons?.[i]?.pressed;
        
        // Dash (Right Trigger - Button 7)
        if (pressed(7) && !gp._rTriggerLatch) {
            gp._rTriggerLatch = true;
            triggerDash(player);
        } else if (!pressed(7)) gp._rTriggerLatch = false;
        
        // Pause (Start Button - Button 9 or Back Button - Button 1)
        if ((pressed(9) || pressed(1)) && !gp._pauseLatch) {
            gp._pauseLatch = true;
            if (gameActive && !gameOver) togglePause();
        } else if (!pressed(9) && !pressed(1)) gp._pauseLatch = false;
    }
}
// ================================================================================= //
// ======================= END GAMEPAD INPUT & MENU NAVIGATION ===================== //
// ================================================================================= //

let isGamepadUpgradeMode = false;
let selectedUpgradeIndex = 0;
let lastGamepadUpdate = 0;
const GAMEPAD_INPUT_DELAY = 200; // milliseconds

// EXISTING handleGamepadInput function has been replaced/merged above.

let bombs = [];
const BOX_SIZE = 25;
let boxDropChance = 0.01;

const BOMB_SIZE = 14;
const BOMB_LIFETIME_MS = 8000;
const BOMB_INTERVAL_MS = 5000;

const ANTI_GRAVITY_INTERVAL = 5000;
const ANTI_GRAVITY_RADIUS = 200;
const ANTI_GRAVITY_STRENGTH = 60;

const BLACK_HOLE_INTERVAL = 10000;
const BLACK_HOLE_PULL_DURATION = 3000;
const BLACK_HOLE_DELAY = 3000;
const BLACK_HOLE_RADIUS = 167;
const BLACK_HOLE_PULL_STRENGTH = 2.5;

let bombEmitterActive = false; let lastBombEmitMs = 0;
let orbitingPowerUpActive = false;
let damagingCircleActive = false; let lastDamagingCircleDamageTime = 0;
let lightningProjectileActive = false; let lastLightningSpawnTime = 0;
let magneticProjectileActive = false;
let vShapeProjectileLevel = 0;
let iceProjectileActive = false;
let puddleTrailActive = false; let lastPlayerPuddleSpawnTime = 0;
let laserPointerActive = false; 
let autoAimActive = false;
let explosiveBulletsActive = false;
let vengeanceNovaActive = false;
let dogCompanionActive = false;
let antiGravityActive = false; let lastAntiGravityPushTime = 0;
let ricochetActive = false;
let rocketLauncherActive = false;
let blackHoleActive = false; let lastBlackHoleTime = 0;
let dualGunActive = false;
let flamingBulletsActive = false;
let shotgunBlastActive = false;

let dog = { x: 0, y: 0, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 };
const DOG_HOMING_SHOT_INTERVAL = 3000;

let temporalWardActive = false;
let isTimeStopped = false;
let timeStopEndTime = 0;

let score = 0;
let lastEnemySpawnTime = 0;
let enemySpawnInterval = 1000;
let baseEnemySpeed = 0.84;

let lastWeaponFireTime = 0;
let weaponFireInterval = 400;

// The rest of your script follows...

// ================================================================================= //
// ======================= MENU INITIALIZATION FUNCTIONS (UPDATED) ================= //
// ================================================================================= //

function resetMenuSelection(containerSelector, elementSelector) {
    // Clear the current selection index
    currentMenuIndex = 0;
    
    // Get all relevant elements inside the container
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Get all navigable elements (filter out hidden ones)
    let elements = Array.from(container.querySelectorAll(elementSelector));
    elements = elements.filter(el => el.offsetParent !== null);
    currentMenuElements = elements; // Update the global list for the navigator
    
    // Clear existing selection and set to the first element
    currentMenuElements.forEach(el => el.classList.remove('selected'));
    if (currentMenuElements.length > 0) {
        currentMenuElements[0].classList.add('selected');
        currentMenuElements[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    isGeneralMenuMode = true;
}

function showDifficultyScreen() {
    // ... (existing logic) ...
    // ...

    // --- NEW: Gamepad Initialization ---
    resetMenuSelection('#difficultyScreen', 'button');
    // --- END NEW ---
}

function showUpgradeMenu() {
    if (upgradeOptionsContainer) upgradeOptionsContainer.innerHTML = '';
    let availableUpgrades = [...UPGRADE_OPTIONS];
    let selectedChoices = [];
    let choiceCount = cheats.hardcoreMode ? 2 : 3;

    for (let i = 0; i < choiceCount; i++) {
        if (availableUpgrades.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
        selectedChoices.push(availableUpgrades.splice(randomIndex, 1)[0]);
    }

    selectedChoices.forEach((upgrade, index) => { // Use index for the click handler
        const upgradeCard = document.createElement('div');
        upgradeCard.classList.add('upgrade-card');
        const borderColor = UPGRADE_BORDER_COLORS[upgrade.type] || "#66bb6a";
        upgradeCard.style.border = `2.5px solid ${borderColor}`;
        upgradeCard.dataset.borderColor = borderColor;
        upgradeCard.innerHTML = `
            <div class="upgrade-icon">${upgrade.icon}</div>
            <h3>${upgrade.name}</h3>
            <p>${upgrade.desc}</p>
            <button>Choose</button>
        `;
        upgradeCard.querySelector('button').onclick = () => {
            applyUpgrade(upgrade);
            vibrate(10);
        };
        upgradeCard.addEventListener('click', () => {
            // De-select all cards first
            document.querySelectorAll('.upgrade-card').forEach(card => card.classList.remove('selected'));
            // Select the clicked card
            upgradeCard.classList.add('selected');
            // Set the selected index to the clicked card's index
            selectedUpgradeIndex = index; // Keep this logic for mouse/touch click
            // Vibrate and play sound
            vibrate(10);
            playUISound('uiClick');
        });
        upgradeCard.addEventListener('mouseover', () => playUISound('uiClick'));
        if (upgradeOptionsContainer) upgradeOptionsContainer.appendChild(upgradeCard);
    });

    if (upgradeMenu) {
        levelUpBoxImage.classList.add('animate');
        levelUpBoxImage.style.display = 'block';
        
        // --- NEW/UPDATED: Gamepad Initialization for Upgrade Menu ---
        isGamepadUpgradeMode = true;
        isGeneralMenuMode = false; // Ensure general mode is off
        selectedUpgradeIndex = 0; // Start with the first card selected
        
        // Apply the 'selected' class to the first card
        const firstCard = upgradeOptionsContainer.querySelector('.upgrade-card');
        if (firstCard) {
            firstCard.classList.add('selected');
        }
        // --- END NEW/UPDATED ---
        
        upgradeMenu.style.display = 'flex';
    }
} 

// Add a function to update the character select screen when it is opened
function showCharacterSelectScreen() {
    // ... (existing logic to show screen) ...

    // --- NEW: Gamepad Initialization ---
    resetMenuSelection('#characterTilesContainer', '.character-tile');
    // --- END NEW ---
}

// Add a function to update the map select screen when it is opened
function showMapSelectScreen() {
    // ... (existing logic to show screen) ...

    // --- NEW: Gamepad Initialization ---
    resetMenuSelection('#mapTilesContainer', '.map-tile');
    // --- END NEW ---
}

// Ensure the main update loop calls handleGamepadInput:
// This part must be added to your main update/game loop function (e.g., 'updateGame' or 'gameLoop')
/*
function updateGame(now) {
    // ... (existing logic) ...

    // Handle gamepad input on every frame
    handleGamepadInput(); 
