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
            preRenderEmoji('🌀', 22);
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
            preRenderEmoji('💍', RING_SYMBOL_SIZE);
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
        const RING_SYMBOL_EMOJI = '💍';
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
        const MERCHANT_SPAWN_INTERVAL = 140000; // Correct value for 3 minutes (3 * 60 * 1000)

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

// ====== GAMEPAD INPUT ======
let gamepadIndex = null;
const GAMEPAD_DEADZONE = 0.2;

function applyDeadzone(v, dz = GAMEPAD_DEADZONE) {
  return Math.abs(v) < dz ? 0 : v;
}

window.addEventListener("gamepadconnected", (e) => {
  console.log("Gamepad connected:", e.gamepad.id);
  gamepadIndex = e.gamepad.index;
});
window.addEventListener("gamepaddisconnected", (e) => {
  if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
});

// Call each frame
function handleGamepadInput() {
    if (gamepadIndex == null) return;
    const gp = navigator.getGamepads?.()[gamepadIndex];
    if (!gp) return;

    // --- NEW UPGRADE MENU GAMEPAD LOGIC ---
    // Place this before all other gamepad logic
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
                const prevCard = document.querySelectorAll('.upgrade-card')[prevIndex];
                if (prevCard) {
                    prevCard.classList.remove('selected');
                }
                const newCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (newCard) {
                    newCard.classList.add('selected');
                    playUISound('uiClick');
                    vibrate(10);
                }
                lastGamepadUpdate = now;
            }
            
            // Check for confirmation button (e.g., A/X button)
            if (gp.buttons[0].pressed) {
                const selectedCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (selectedCard) {
                    selectedCard.querySelector('button').click();
                    isGamepadUpgradeMode = false;
                    lastGamepadUpdate = now;
                    return;
                }
            }
        }
    }

    // --- EXISTING GAMEPAD MOVEMENT LOGIC ---
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
    if (pressed(7) && !gp._rTriggerLatch) {
    gp._rTriggerLatch = true;
    triggerDash(player);
} else if (!pressed(7)) gp._rTriggerLatch = false;
    
    if ((pressed(9) || pressed(1)) && !gp._pauseLatch) {
        gp._pauseLatch = true;
        if (gameActive && !gameOver) togglePause();
    } else if (!pressed(9) && !pressed(1)) gp._pauseLatch = false;
}

let isGamepadUpgradeMode = false;
let selectedUpgradeIndex = 0;
let lastGamepadUpdate = 0;
const GAMEPAD_INPUT_DELAY = 200; // milliseconds

function handleGamepadInput() {
    if (gamepadIndex == null) return;
    const gp = navigator.getGamepads?.()[gamepadIndex];
    if (!gp) return;

    // --- NEW UPGRADE MENU GAMEPAD LOGIC ---
    if (isGamepadUpgradeMode) {
        const now = Date.now();
        if (now - lastGamepadUpdate > GAMEPAD_INPUT_DELAY) {
            let moved = false;
            const prevIndex = selectedUpgradeIndex;
            const numOptions = document.querySelectorAll('.upgrade-card').length;
            
            // D-pad Right or Left Stick Right
            if (gp.buttons[15].pressed || gp.axes[0] > 0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex + 1) % numOptions;
                moved = true;
            } 
            // D-pad Left or Left Stick Left
            else if (gp.buttons[14].pressed || gp.axes[0] < -0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex - 1 + numOptions) % numOptions;
                moved = true;
            }
            
            // D-pad Up/Down (for wrapping)
            const cardsPerRow = 3; 
            if (gp.buttons[12].pressed) {
                selectedUpgradeIndex = Math.max(0, selectedUpgradeIndex - cardsPerRow);
                moved = true;
            } else if (gp.buttons[13].pressed) {
                selectedUpgradeIndex = Math.min(numOptions - 1, selectedUpgradeIndex + cardsPerRow);
                moved = true;
            }

            if (moved && prevIndex !== selectedUpgradeIndex) {
                const prevCard = document.querySelectorAll('.upgrade-card')[prevIndex];
                if (prevCard) {
                    prevCard.classList.remove('selected');
                }
                const newCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (newCard) {
                    newCard.classList.add('selected');
                    playUISound('uiClick');
                    vibrate(10);
                }
                lastGamepadUpdate = now;
            }
            
            // Check for confirmation button (e.g., A/X button)
            if (gp.buttons[0].pressed) {
                const selectedCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (selectedCard) {
                    selectedCard.querySelector('button').click();
                    isGamepadUpgradeMode = false;
                    lastGamepadUpdate = now;
                    return;
                }
            }
        }
    }
    
    // --- EXISTING GAMEPAD MOVEMENT LOGIC ---
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
    if (pressed(7) && !gp._rTriggerLatch) {
    gp._rTriggerLatch = true;
    triggerDash(player);
} else if (!pressed(7)) gp._rTriggerLatch = false;
    
    if ((pressed(9) || pressed(1)) && !gp._pauseLatch) {
        gp._pauseLatch = true;
        if (gameActive && !gameOver) togglePause();
    } else if (!pressed(9) && !pressed(1)) gp._pauseLatch = false;
}

        let joystickDirX = 0; let joystickDirY = 0;
        let aimDx = 0; let aimDy = 0;
        let lastMoveStickTapTime = 0;
        let lastFireStickTapTime = 0;
        let lastMoveStickDirection = {x: 0, y: 0};
        
        let fireRateBoostActive = false;
        let fireRateBoostEndTime = 0;
        const FIRE_RATE_BOOST_DURATION = 3000;
        
        let mouseX = 0; let mouseY = 0;
        let isMouseInCanvas = false;

        const keys = {};
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                if(gameActive && !gameOver) { togglePause(); }
                return;
            }
             if (e.key === 'o') {
                triggerDash(player2);

            }
            if (keys['-'] && keys['=']) { // Secret coin cheat
                playerData.currency += 5000;
                savePlayerData();
                floatingTexts.push({ text: "+5000 Coins!", x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 2000, color: '#FFD700' });
            }
            
            if (e.key === 'Insert' && gameActive && !gameOver && !gamePaused) {
                if (player.lives > 1 && (!player2 || !player2.active)) {
                    player.lives--;
                    updateUIStats();
                    player2 = {
                        active: true, x: player.x, y: player.y, size: 35, speed: 1.4,
                        facing: 'down', stepPhase: 0, gunAngle: -Math.PI / 2,
                        lastFireTime: 0, fireInterval: 400,
                        isDashing: false, dashEndTime: 0, lastDashTime: 0, dashCooldown: 6000,
                        spinStartTime: null, // For spin animation
                        spinDirection: 0, // For spin animation
                        dx: 0, dy: 0 // Add movement direction for gamepad
                    };
                    floatingTexts.push({
                        text: "Player 2 has joined!", x: player.x, y: player.y - player.size,
                        startTime: Date.now(), duration: 2000, color: '#FFFF00'
                    });
                }
            }
            keys[e.key] = true;
            if (e.key === 'ArrowUp') aimDy = -1;
            else if (e.key === 'ArrowDown') aimDy = 1;
            else if (e.key === 'ArrowLeft') aimDx = -1;
            else if (e.key === 'ArrowRight') aimDx = 1;
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key] = false;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                if (keys['ArrowDown']) { aimDy = 1; } else if (keys['ArrowUp']) { aimDy = -1; } else { aimDy = 0; }
                if (keys['ArrowRight']) { aimDx = 1; } else if (keys['ArrowLeft']) { aimDx = -1; } else { aimDx = 0; }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (gamePaused || gameOver || !gameActive) return;
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
            const playerScreenX = player.x - cameraOffsetX;
            const playerScreenY = player.y - cameraOffsetY;
            aimDx = mouseX - playerScreenX;
            aimDy = mouseY - playerScreenY;
        });

        canvas.addEventListener('mouseenter', () => { if (gameActive && !document.body.classList.contains('is-mobile')) { isMouseInCanvas = true; } });
        canvas.addEventListener('mouseleave', () => { if (gameActive) { isMouseInCanvas = false; } });
        canvas.addEventListener('mousedown', (e) => {
    // e.button === 0 corresponds to the left mouse button
    if (e.button === 0 && gameActive && !gamePaused && !gameOver) {
        triggerDash(player);
    }
});
        
        function vibrate(duration) { if (isMobileDevice && navigator.vibrate) { navigator.vibrate(duration); } }
        function playSound(name) { if (gameActive && !gamePaused && audioPlayers[name]) { audioPlayers[name].start(getSafeToneTime()); } }
        function playUISound(name) { if (audioPlayers[name]) { audioPlayers[name].start(getSafeToneTime()); } }
        
        audioPlayers['playerScream'].volume.value = -10;
        const swordSwingSynth = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.01, release: 0.05 } }).toDestination();
        const eyeProjectileHitSynth = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.001, decay: 0.08, sustain: 0.01, release: 0.1 } }).toDestination();
        const bombExplosionSynth = new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.2 } }).toDestination();
        
        const backgroundMusicPaths = [ 
            'audio/background_music.mp3',  'audio/background_music2.mp3', 
            'audio/background_music3.mp3', 'audio/background_music4.mp3', 'audio/background_music5.mp3',
            'audio/background_music6.mp3', 'audio/background_music7.mp3', 'audio/background_music8.mp3',
            'audio/background_music9.mp3', 'audio/background_music10.mp3', 'audio/background_music11.mp3', 
        ];
        let currentBGMPlayer = null;

        function startBGM() { if (currentBGMPlayer && currentBGMPlayer.state !== 'started') { currentBGMPlayer.start(); } Tone.Transport.start(); }
        function stopBGM() { if (currentBGMPlayer) { currentBGMPlayer.stop(); } Tone.Transport.stop(); }
        
        function startMainMenuBGM() {
            if (Tone.context.state !== 'running') {
                Tone.start().then(() => {
                    if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') { stopBGM(); audioPlayers['mainMenu'].start(); }
                });
            } else {
                if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') { stopBGM(); audioPlayers['mainMenu'].start(); }
            }
        }

        function stopMainMenuBGM() { if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state === 'started') { audioPlayers['mainMenu'].stop(); } }
        function playBombExplosionSound() { if (gameActive && !gamePaused) bombExplosionSynth.triggerAttackRelease("F3", "8n", getSafeToneTime()); } 
        function playSwordSwingSound() { if (gameActive && !gamePaused) swordSwingSynth.triggerAttackRelease("D4", "16n", getSafeToneTime()); } 
        function playEyeProjectileHitSound() { if (gameActive && !gamePaused) eyeProjectileHitSynth.triggerAttackRelease("G2", "16n", getSafeToneTime()); }
        
        function resizeCanvas() {
            canvas.width = 1125;
            canvas.height = 676;
            player.x = Math.max(player.size / 2, Math.min(WORLD_WIDTH - player.size / 2, player.x));
            player.y = Math.max(player.size / 2, Math.min(WORLD_HEIGHT - player.size / 2, player.y));
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        let activeTouches = {};

document.body.addEventListener('touchstart', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const moveRect = movementStickBase.getBoundingClientRect();
        const fireRect = firestickBase.getBoundingClientRect();

        // This is the corrected block for the LEFT (MOVEMENT) stick
        if (touch.clientX > moveRect.left && touch.clientX < moveRect.right && touch.clientY > moveRect.top && touch.clientY < moveRect.bottom) {
            if (!activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = {
                    type: 'movement'
                };

                // The old dodge logic has been completely removed from here.

                const {
                    dx,
                    dy
                } = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                const magnitude = Math.hypot(dx, dy);
                if (magnitude > 0) {
                    joystickDirX = dx / magnitude;
                    joystickDirY = dy / magnitude;
                }
            }
        }
        // This is the corrected block for the RIGHT (AIMING) stick
        else if (touch.clientX > fireRect.left && touch.clientX < fireRect.right && touch.clientY > fireRect.top && touch.clientY < fireRect.bottom) {
            if (!activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = {
                    type: 'fire'
                };

                // --- DODGE LOGIC IS NOW HERE ---
                const now = Date.now();
                if (now - lastFireStickTapTime < 300) {
                    triggerDash(player);
                }
                lastFireStickTapTime = now;
                // --- END OF DODGE LOGIC ---

                const {
                    dx,
                    dy
                } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                aimDx = dx;
                aimDy = dy;
            }
        }
    }
}, {
    passive: false
});

        document.body.addEventListener('touchmove', (e) => {
            if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
            if (!gameActive || gamePaused || gameOver) return;
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const touchInfo = activeTouches[touch.identifier];
                if (touchInfo) {
                    if (touchInfo.type === 'movement') {
                        const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                        const magnitude = Math.hypot(dx, dy);
                        if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; } 
                        else { joystickDirX = 0; joystickDirY = 0; }
                    } else if (touchInfo.type === 'fire') {
                        const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                        aimDx = dx; aimDy = dy;
                    }
                }
            }
        }, { passive: false });

        document.body.addEventListener('touchend', (e) => {
            if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
            if (!gameActive || gamePaused || gameOver) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const touchInfo = activeTouches[touch.identifier];
                if (touchInfo) {
                    if (touchInfo.type === 'movement') { if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)'; joystickDirX = 0; joystickDirY = 0; } 
                    else if (touchInfo.type === 'fire') { if (firestickCap) firestickCap.style.transform = 'translate(0, 0)'; aimDx = 0; aimDy = 0; }
                    delete activeTouches[touch.identifier];
                }
            }
        });

        document.body.addEventListener('touchcancel', (e) => {
            if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
            if (!gameActive || gamePaused || gameOver) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const touchInfo = activeTouches[touch.identifier];
                if (touchInfo) {
                    if (touchInfo.type === 'movement') { if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)'; joystickDirX = 0; joystickDirY = 0; } 
                    else if (touchInfo.type === 'fire') { if (firestickCap) firestickCap.style.transform = 'translate(0, 0)'; aimDx = 0; aimDy = 0; }
                    delete activeTouches[touch.identifier];
                }
            }
        });

        let mouseActiveStick = null;

        document.body.addEventListener('mousedown', (e) => {
            if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
            if (!gameActive || gamePaused || gameOver) return;
            const moveRect = movementStickBase.getBoundingClientRect();
            const fireRect = firestickBase.getBoundingClientRect();
            if (e.clientX > moveRect.left && e.clientX < moveRect.right && e.clientY > moveRect.top && e.clientY < moveRect.bottom) {
                mouseActiveStick = 'movement';
                activeTouches['mouse'] = { type: 'movement' };
                const { dx, dy } = getJoystickInput(e.clientX, e.clientY, movementStickBase, movementStickCap);
                const magnitude = Math.hypot(dx, dy);
                if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; }
            } else if (e.clientX > fireRect.left && e.clientX < fireRect.right && e.clientY > fireRect.top && e.clientY < fireRect.bottom) {
                mouseActiveStick = 'fire';
                activeTouches['mouse'] = { type: 'fire' };
                const { dx, dy } = getJoystickInput(e.clientX, e.clientY, firestickBase, firestickCap);
                aimDx = dx; aimDy = dy;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
            if (!gameActive || gamePaused || gameOver) return;
            if (mouseActiveStick) {
                if (mouseActiveStick === 'movement') {
                    const { dx, dy } = getJoystickInput(e.clientX, e.clientY, movementStickBase, movementStickCap);
                     const magnitude = Math.hypot(dx, dy);
                    if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; } 
                    else { joystickDirX = 0; joystickDirY = 0; }
                } else if (mouseActiveStick === 'fire') {
                    const { dx, dy } = getJoystickInput(e.clientX, e.clientY, firestickBase, firestickCap);
                    aimDx = dx; aimDy = dy;
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
            if (!gameActive || gamePaused || gameOver) return;
            if (mouseActiveStick === 'movement') { if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)'; joystickDirX = 0; joystickDirY = 0; } 
            else if (mouseActiveStick === 'fire') { if (firestickCap) firestickCap.style.transform = 'translate(0, 0)'; aimDx = 0; aimDy = 0; }
            mouseActiveStick = null;
            delete activeTouches['mouse'];
        });

        restartButton.addEventListener('click', () => {
            vibrate(10);
            playUISound('uiClick');
            showDifficultyScreen();
        });

        const CHARACTERS = {
            cowboy: {
                id: 'cowboy',
                name: 'The Cowboy',
                emoji: '🤠',
                description: 'The original survivor. Balanced and reliable.',
                perk: 'Standard bullets and dash.',
                unlockCondition: { type: 'start' },
                shootLogic: null, // Null means use default
                dodgeLogic: null, // Null means use default
            },
            skull: {
                id: 'skull',
                name: 'The Skeleton',
                emoji: '💀',
                description: 'A bony warrior who uses its own body as a weapon.',
                perk: 'Shoots bones. Dodge fires a nova of bones.',
                unlockCondition: { type: 'achievement', id: 'slayer' },
                shootLogic: null, // We'll handle this with a cheat check for now
                dodgeLogic: null, 
            }
        };

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
        const BOSS_SPAWN_INTERVAL_LEVELS = 11;
        const BOSSED_ENEMY_TYPES = ['🧟', SKULL_EMOJI, DEMON_EMOJI, FEMALE_ZOMBIE_EMOJI, BAT_EMOJI, MOSQUITO_EMOJI];
        let lastBossLevelSpawned = 0;
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

        function handleEnemyDeath(enemy, explosionId = null) {
            if (enemy.isHit) return;
            enemy.isHit = true;
            enemiesDefeatedCount++;
            player.coins++; // Grant one coin per kill
            if (Math.random() < boxDropChance) {
            createPickup(enemy.x, enemy.y, '📦', BOX_SIZE, 0);
        }
            // Achievement Tracking
            runStats.killsThisRun++; // FIX 1: Corrected variable name
            playerStats.totalKills++; // FIX 2: Added missing total kills counter
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
            } else if (enemy.emoji === VAMPIRE_EMOJI || enemy.emoji === FEMALE_ZOMBIE_EMOJI) {
                createPickup(enemy.x, enemy.y, '💎', DIAMOND_SIZE, 5);
            } else if (enemy.emoji === '🌀') {
                createPickup(enemy.x, enemy.y, DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE);
            } else if (enemy.emoji === MOSQUITO_EMOJI) {
                createPickup(enemy.x, enemy.y, DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE);
            } else if (Math.random() < appleDropChance) {
                createAppleItem(enemy.x, enemy.y);
            } else {
                if (enemy.emoji === '🧟') createPickup(enemy.x, enemy.y, COIN_EMOJI, COIN_SIZE, COIN_XP_VALUE);
                else if (enemy.emoji === '💀') createPickup(enemy.x, enemy.y, DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE);
                else if (enemy.emoji === BAT_EMOJI || enemy.emoji === '😈') createPickup(enemy.x, enemy.y, RING_SYMBOL_EMOJI, RING_SYMBOL_SIZE, RING_SYMBOL_XP_VALUE);
                else if (enemy.emoji === DEMON_EMOJI || enemy.emoji === EYE_EMOJI || enemy.emoji === '👻') createPickup(enemy.x, enemy.y, DEMON_XP_EMOJI, RING_SYMBOL_SIZE, DEMON_XP_VALUE);
            }

            if (Math.random() < boxDropChance) { createPickup(enemy.x, enemy.y, 'box', BOX_SIZE, 0); }
            score += 10;
        }

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

        function createPickup(x, y, type, size, xpValue) {
            if (x === -1 || y === -1) { x = Math.random() * WORLD_WIDTH; y = Math.random() * WORLD_HEIGHT; }
            pickupItems.push({ x, y, size, type, xpValue, glimmerStartTime: Date.now() + Math.random() * 2000 });
        }
        
        function spawnMerchant(x, y) {
    merchants.push({
        x: x,
        y: y,
        size: 40 // wizard size on screen
    });
}

        function createAppleItem(x, y) {
            appleItems.push({ x, y, size: APPLE_ITEM_SIZE, type: 'apple', spawnTime: Date.now(), lifetime: APPLE_LIFETIME, glimmerStartTime: Date.now() + Math.random() * 2000 });
        }

        function getJoystickInput(touchClientX, touchClientY, baseElement, capElement) {
            const rect = baseElement.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            let dx = touchClientX - centerX;
            let dy = touchClientY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > joystickRadius) {
                const angle = Math.atan2(dy, dx);
                dx = Math.cos(angle) * joystickRadius;
                dy = Math.sin(angle) * joystickRadius;
            }
            if (capElement) capElement.style.transform = `translate(${dx}px, ${dy}px)`;
            return { dx, dy, distance };
        }

        // OPTIMIZATION: Rewritten createWeapon to use the object pool
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
                        // Found a dead weapon, reuse it!
                        weapon.x = shooter.x;
                        weapon.y = shooter.y;
                        weapon.size = shotgunBlastActive ? 30 * player.projectileSizeMultiplier : 38 * player.projectileSizeMultiplier * (rocketLauncherActive ? 2 : 1);
                        weapon.speed = 5.04 * player.projectileSpeedMultiplier;
                        weapon.angle = angle;
                        weapon.dx = Math.cos(angle) * weapon.speed;
                        weapon.dy = Math.sin(angle) * weapon.speed;
                        weapon.lifetime = Date.now() + 2000;
                        weapon.hitsLeft = rocketLauncherActive ? 3 : (ricochetActive ? 2 : 1);
                        weapon.hitEnemies.length = 0; // Clear the hit list
                        weapon.active = true;
                        return; // Exit after finding one
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

        function createPlayer2Weapon() {
            if (!player2 || !player2.active) return;
            
            // Use the weapon pool for Player 2 as well
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
                    break; // Only fire one bullet
                }
            }
            playSound('playerShoot');
        }

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

        function createBloodPuddle(x, y, size) {
            if (!sprites.bloodPuddle) return;
            bloodPuddles.push({
                x: x, y: y, initialSize: size * 1.5,
                spawnTime: Date.now(), rotation: Math.random() * Math.PI * 2, lifetime: 10000
            });
        }

        function levelUp() {
            gamePaused = true;
            player.level++;
            checkAchievements();
            player.xp -= player.xpToNextLevel;
            if (player.xp < 0) player.xp = 0;
            if(cheats.instantLevelUp) player.xp = player.xpToNextLevel;
            else player.xpToNextLevel += 1; 
            Tone.Transport.bpm.value = 120 * (player.level >= 30 ? 2.5 : player.level >= 20 ? 2 : player.level >= 10 ? 1.5 : 1);
            updateUIStats();
            vibrate(50);
            playSound('levelUp');
            showUpgradeMenu();
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
            selectedChoices.forEach(upgrade => {
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
                upgradeCard.querySelector('button').onclick = () => { applyUpgrade(upgrade); vibrate(10); };
                upgradeCard.addEventListener('click', () => {
             // De-select all cards first
             document.querySelectorAll('.upgrade-card').forEach(card => card.classList.remove('selected'));
             // Select the clicked card
             upgradeCard.classList.add('selected');
             // Set the selected index to the clicked card's index
             selectedUpgradeIndex = index;
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
                isGamepadUpgradeMode = true;
selectedUpgradeIndex = 0; // Start with the first card selected
// Apply the 'selected' class to the first card
const firstCard = upgradeOptionsContainer.querySelector('.upgrade-card');
if (firstCard) {
    firstCard.classList.add('selected');
}
                upgradeMenu.style.display = 'flex';
            }
        }

        function applyUpgrade(upgrade) {
            playUISound('levelUpSelect');
            if (upgrade.type === "speed") { player.speed *= (1 + upgrade.value); player.originalPlayerSpeed = player.speed; } 
            else if (upgrade.type === "fireRate") { weaponFireInterval = Math.max(50, weaponFireInterval * (1 - upgrade.value)); } 
            else if (upgrade.type === "magnetRadius") { player.magnetRadius *= (1 + upgrade.value); } 
            else if (upgrade.type === "damage") { player.damageMultiplier *= (1 + upgrade.value); } 
            else if (upgrade.type === "projectileSpeed") { player.projectileSpeedMultiplier *= (1 + upgrade.value); } 
            else if (upgrade.type === "knockback") { player.knockbackStrength += upgrade.value; } 
            else if (upgrade.type === "luck") { boxDropChance += upgrade.value; appleDropChance += upgrade.value; }
            
            if (player.upgradeLevels.hasOwnProperty(upgrade.type)) { player.upgradeLevels[upgrade.type]++; }
            updateUpgradeStatsUI(); 

            if (upgradeMenu) {
                levelUpBoxImage.classList.remove('animate');
                levelUpBoxImage.style.display = 'none';
                upgradeMenu.style.display = 'none';
            }
            gamePaused = false;
            isGamepadUpgradeMode = false;
            joystickDirX = 0; joystickDirY = 0; aimDx = 0; aimDy = 0;
            if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)';
            if (firestickCap) firestickCap.style.transform = 'translate(0, 0)';
        }
        
        function triggerAnimation(element, animationClass, color = '#FFFFFF') {
            if (!element) return;
            element.classList.add(animationClass);
            if (color !== '#FFFFFF') {
                element.style.color = color;
                element.style.textShadow = `0 0 8px ${color}`;
            }
            element.addEventListener('animationend', () => {
                element.classList.remove(animationClass);
                element.style.color = '';
                element.style.textShadow = '';
            }, { once: true });
        }

        function updateUIStats() {
            const oldLevel = currentLevelSpan.textContent;
            const newLevel = player.level;
            if (oldLevel !== newLevel.toString()) {
                currentLevelSpan.textContent = newLevel;
                triggerAnimation(currentLevelSpan, 'stat-updated');
            }

            const oldLives = playerLivesIcon.innerHTML;
            let newLivesHTML = '';
            if (player.lives > 0) {
                newLivesHTML = '<span class="pulsating-heart">❤️</span>';
                newLivesHTML += '❤️'.repeat(player.lives - 1);
            }
            if (oldLives !== newLivesHTML) { playerLivesIcon.innerHTML = newLivesHTML; }

            const oldXp = currentXpSpan.textContent;
            const newXp = player.xp;
            if(oldXp !== newXp.toString()){
                currentXpSpan.textContent = newXp;
                triggerAnimation(currentXpSpan, 'stat-updated');
            }
            
            const oldRequiredXp = requiredXpSpan.textContent;
            const newRequiredXp = player.xpToNextLevel;
            if(oldRequiredXp !== newRequiredXp.toString()){ requiredXpSpan.textContent = newRequiredXp; }
            
            const oldScore = currentScoreSpan.textContent;
            const newScore = Math.floor(score);
            if(oldScore !== newScore.toString()){ currentScoreSpan.textContent = newScore; }
            
            if (appleCounterSpan) appleCounterSpan.textContent = player.appleCount;
            if (coinCounterSpan) coinCounterSpan.textContent = player.coins;
            if (xpBar) xpBar.style.width = `${(player.xp / player.xpToNextLevel) * 100}%`;
        }

        
        function updatePowerupIconsUI() {
            powerupIconsDiv.innerHTML = '';
            if (shotgunBlastActive) { powerupIconsDiv.innerHTML += '<span>💥</span>';
            } else {
                if (rocketLauncherActive) powerupIconsDiv.innerHTML += '<span>🚀</span>';
                if (vShapeProjectileLevel > 0) powerupIconsDiv.innerHTML += `<span>🕊️${vShapeProjectileLevel > 1 ? `x${vShapeProjectileLevel}` : ''}</span>`;
            }
            if (dogCompanionActive && magneticProjectileActive) { powerupIconsDiv.innerHTML += '<span>🎯🐶</span>';
            } else {
                if (dogCompanionActive) powerupIconsDiv.innerHTML += '<span>🐶</span>';
                if (magneticProjectileActive) powerupIconsDiv.innerHTML += '<span>🧲</span>';
            }
            if (doppelgangerActive) powerupIconsDiv.innerHTML += '<span>👯</span>';
            if (temporalWardActive) powerupIconsDiv.innerHTML += '<span>⏱️</span>';
            if (bombEmitterActive) powerupIconsDiv.innerHTML += '<span>💣</span>';
            if (orbitingPowerUpActive) powerupIconsDiv.innerHTML += '<span>💫</span>';
            if (damagingCircleActive) powerupIconsDiv.innerHTML += '<span>⭕</span>';
            if (lightningProjectileActive) powerupIconsDiv.innerHTML += '<span>⚡️</span>';
            if (player.swordActive) powerupIconsDiv.innerHTML += '<span>🗡️</span>';
            if (iceProjectileActive) powerupIconsDiv.innerHTML += '<span>❄️</span>';
            if (puddleTrailActive) powerupIconsDiv.innerHTML += '<span>💧</span>';
            if (laserPointerActive) powerupIconsDiv.innerHTML += '<span>🔴</span>';
            if (autoAimActive) powerupIconsDiv.innerHTML += '<span>🎯</span>';
            if (explosiveBulletsActive) powerupIconsDiv.innerHTML += '<span>💥</span>';
            if (vengeanceNovaActive) powerupIconsDiv.innerHTML += '<span>🛡️</span>';
            if (antiGravityActive) powerupIconsDiv.innerHTML += '<span>💨</span>';
            if (ricochetActive) powerupIconsDiv.innerHTML += '<span>🔄</span>';
            if (blackHoleActive) powerupIconsDiv.innerHTML += '<span>⚫</span>';
            if (dualGunActive) powerupIconsDiv.innerHTML += '<span>🔫</span>';
            if (flamingBulletsActive) powerupIconsDiv.innerHTML += '<span>🔥</span>';
            if (bugSwarmActive) powerupIconsDiv.innerHTML += '<span>🪰</span>';
            if (nightOwlActive) powerupIconsDiv.innerHTML += '<span>🦉</span>';
            if (whirlwindAxeActive) powerupIconsDiv.innerHTML += '<span>🪓</span>';
            if (lightningStrikeActive) powerupIconsDiv.innerHTML += '<span>⚡</span>';
            if (hasDashInvincibility) powerupIconsDiv.innerHTML += '<span>🛡️💨</span>';
            
            if (powerupIconsDiv.scrollHeight > powerupIconsDiv.clientHeight) { powerupIconsDiv.classList.add('small-icons'); } 
            else { powerupIconsDiv.classList.remove('small-icons'); }
        }

        
        function updateUpgradeStatsUI() {
            upgradeStatsDiv.innerHTML = '';
            const upgradeNames = {
                speed: 'SPD', fireRate: 'FR', magnetRadius: 'MAG',
                damage: 'DMG', projectileSpeed: 'P.SPD', knockback: 'KB',
                luck: 'LUCK'
            };
            for (const [type, level] of Object.entries(player.upgradeLevels)) {
                if (level > 0) {
                    const p = document.createElement('p');
                    p.textContent = `${upgradeNames[type] || type.toUpperCase()}: ${'⭐'.repeat(level)}`;
                    upgradeStatsDiv.appendChild(p);
                }
            }
        }

        function saveHighScore(finalScore, finalLevel) {
            try {
                const highScores = JSON.parse(localStorage.getItem('highScores')) || {
                    easy: { score: 0, level: 1 }, medium: { score: 0, level: 1 }, hard: { score: 0, level: 1 }
                };
                if (finalScore > highScores[currentDifficulty].score) {
                    highScores[currentDifficulty] = { score: finalScore, level: finalLevel };
                    localStorage.setItem('highScores', JSON.stringify(highScores));
                }
            } catch (error) { console.error("Could not save high score:", error); }
        }

        async function endGame() {
            playSound('gameOver');
            vibrate([100, 30, 100]);
            playerStats.totalDeaths++;
            gameOver = true; gamePaused = true; gameActive = false;
            stopBGM();
            cameraZoom = 1.0;
            if (canvas) canvas.style.cursor = 'default';
            isMouseInCanvas = false;
            if (pauseButton) pauseButton.style.display = 'none'; 
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (gameContainer) gameContainer.style.display = 'none'; 
            if (movementStickBase) movementStickBase.style.display = 'none';
            if (firestickBase) firestickBase.style.display = 'none';
            
            const totalTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
            if (finalScoreSpan) finalScoreSpan.textContent = Math.floor(score);
            if (finalTimeSpan) finalTimeSpan.textContent = `${totalTimeSeconds}s`;
            
            const coins = enemiesDefeatedCount;
            if (coinsEarnedSpan) coinsEarnedSpan.textContent = coins;
            playerData.currency += coins;
            savePlayerData();
            savePlayerStats();

            saveHighScore(Math.floor(score), player.level);

            if (gameOverlay) gameOverlay.style.display = 'flex';
            
            if (loadingStoryDiv) loadingStoryDiv.style.display = 'block';
            if (storytellerOutputDiv) storytellerOutputDiv.textContent = '';
            const epicMessage = `Hark, a hero's tale is sung! For ${totalTimeSeconds} grueling seconds, a noble warrior battled the emoji hordes. With unmatched courage, they gathered ${player.xp} XP and etched a legendary score of ${Math.floor(score)} into the annals of history!`;
            if (storytellerOutputDiv) storytellerOutputDiv.textContent = epicMessage;
            if (loadingStoryDiv) loadingStoryDiv.style.display = 'none';
        }

async function tryLoadMusic(retries = 3) {
            if (backgroundMusicPaths.length === 0) {
                console.error("No background music paths available.");
                return;
            }
            let availableTracks = [...backgroundMusicPaths];
            for(let i = 0; i < retries; i++) {
                try {
                    if(availableTracks.length === 0) availableTracks = [...backgroundMusicPaths]; // Reset if all failed
                    const musicIndex = Math.floor(Math.random() * availableTracks.length);
                    const randomMusicPath = availableTracks.splice(musicIndex, 1)[0];

                    if (currentBGMPlayer) { currentBGMPlayer.stop(); currentBGMPlayer.dispose(); }
                    
                    currentBGMPlayer = new Tone.Player({ url: randomMusicPath, loop: true, autostart: false, volume: -10 }).toDestination();
                    musicVolumeSlider.dispatchEvent(new Event('input'));
                    await Tone.loaded();
                    startBGM();
                    return; // Success
                } catch (error) {
                    console.error(`Failed to load music track. Attempt ${i + 1}/${retries}.`, error);
                }
            }
            console.error("Failed to load any background music after multiple retries.");
        }

        function applyCheats() {
            // Apply cheats that modify starting player stats or game rules
            if (cheats.hearts_start_10) {
                player.lives = 10;
                player.maxLives = 10;
            }
            if (cheats.all_powerups_start) {
                console.log("Activating all power-ups cheat.");
                // Activate all standard powerups
                for(const powerupKey in ALWAYS_AVAILABLE_PICKUPS){
                    activatePowerup(powerupKey);
                }
                // Activate all unlocked special powerups
                for(const powerupKey in UNLOCKABLE_PICKUPS){
                     if(playerData.unlockedPickups[powerupKey]){
                         activatePowerup(powerupKey);
                     }
                }
            }
            if (cheats.dog_companion_start) {
                activatePowerup('dog_companion');
            }
            if (cheats.magnet_mode) {
                player.magnetRadius = WORLD_WIDTH; // Set a huge magnet radius
            }
        }

async function startGame() {
            stopMainMenuBGM();
            if (Tone.context.state !== 'running') { await Tone.start(); console.log("AudioContext started!"); }
            
            if (selectedMapIndex !== -1 && selectedMapIndex < backgroundImages.length) {
    currentBackgroundIndex = selectedMapIndex;
    // ADD THIS LINE
    console.log(`SUCCESS: Using selected map index: ${currentBackgroundIndex}`);
} else {
    if (backgroundImages.length > 0) {
        currentBackgroundIndex = Math.floor(Math.random() * backgroundImages.length);
        // ADD THIS LINE
        console.log(`RANDOM: No valid map was selected. Using random index: ${currentBackgroundIndex}`);
    }
}

            await tryLoadMusic();
            
            // Hide all menu buttons during gameplay
            document.querySelector('.bottom-menu-buttons').style.display = 'none';

            // *** OPTIMIZATION: Initialize Quadtree for the game world
            quadtree = new Quadtree({ x: 0, y: 0, width: WORLD_WIDTH, height: WORLD_HEIGHT });

            if (gameOverlay) gameOverlay.style.display = 'none';
            if (difficultyContainer) difficultyContainer.style.display = 'none';
            if (mapSelectContainer) mapSelectContainer.style.display = 'none';
            if (characterSelectContainer) characterSelectContainer.style.display = 'none';
            if (gameGuideModal) gameGuideModal.style.display = 'none';
            if (achievementsModal) achievementsModal.style.display = 'none';
            if (cheatsModal) cheatsModal.style.display = 'none';
            if (pauseButton) pauseButton.style.display = 'block'; 
            if (gameContainer) gameContainer.style.display = 'block'; 
            if (gameStats) gameStats.style.display = 'block'; // Show game stats
            
            if (isMobileDevice) {
                if (movementStickBase) movementStickBase.style.display = 'flex';
                if (firestickBase) firestickBase.style.display = 'flex';
                if (mobileResetButton) mobileResetButton.style.display = 'block'; // Show mobile reset button
                cameraZoom = 1.4; zoomToggle.checked = true;
            } else {
                if (movementStickBase) movementStickBase.style.display = 'none';
                if (firestickBase) firestickBase.style.display = 'none';
                if (canvas) canvas.style.cursor = 'none';
                cameraZoom = 1.0; zoomToggle.checked = false;
            }
            isMouseInCanvas = false;
            
            gameActive = true; gameOver = false; gamePaused = false;
            
            let basePlayerSpeed = 1.4;
            applyPermanentUpgrades();
            
            let difficultyMultiplier = 1.0;
            if (currentDifficulty === 'medium') difficultyMultiplier = 1.1;
            else if (currentDifficulty === 'hard') difficultyMultiplier = 1.2;

            Object.assign(player, { 
                xp: 0, level: 1, xpToNextLevel: 3, projectileSizeMultiplier: 1, projectileSpeedMultiplier: 1, 
                speed: basePlayerSpeed * difficultyMultiplier, lives: player.maxLives, orbitAngle: 0, 
                boxPickupsCollectedCount: 0, bgmFastModeActive: false, swordActive: false, 
                lastSwordSwingTime: 0, currentSwordSwing: null, isSlowedByMosquitoPuddle: false, 
                facing: 'down', appleCount: 0,
                isDashing: false, dashEndTime: 0, lastDashTime: 0 - (playerData.hasReducedDashCooldown ? 3000: 6000), 
                dashCooldown: playerData.hasReducedDashCooldown ? 3000: 6000,
                isInvincible: false,
                spinStartTime: null, spinDirection: 0,
                upgradeLevels: { speed: 0, fireRate: 0, magnetRadius: 0, damage: 0, projectileSpeed: 0, knockback: 0, luck: 0 }
            });
            player.originalPlayerSpeed = player.speed;
            boxDropChance = 0.01; appleDropChance = 0.05;

            [enemies, pickupItems, appleItems, eyeProjectiles, playerPuddles, snailPuddles, mosquitoPuddles, bombs, floatingTexts, visualWarnings, explosions, blackHoles, bloodSplatters, bloodPuddles, antiGravityPulses, vengeanceNovas, dogHomingShots, destructibles, flameAreas, flies, owlProjectiles, lightningStrikes, smokeParticles].forEach(arr => arr.length = 0);
            
            spawnInitialObstacles();

            score = 0; lastEnemySpawnTime = 0; enemySpawnInterval = 1000;
            lastWeaponFireTime = 0; weaponFireInterval = 400; enemiesDefeatedCount = 0;
            fireRateBoostActive = false; fireRateBoostEndTime = 0; bombEmitterActive = false; orbitingPowerUpActive = false;
            damagingCircleActive = false; lastDamagingCircleDamageTime = 0; lightningProjectileActive = false; lastLightningSpawnTime = 0;
            magneticProjectileActive = false; vShapeProjectileLevel = 0; iceProjectileActive = false; puddleTrailActive = false;
            laserPointerActive = false; autoAimActive = false; explosiveBulletsActive = false; vengeanceNovaActive = false;
            dogCompanionActive = false; antiGravityActive = false; ricochetActive = false; rocketLauncherActive = false;
            blackHoleActive = false; dualGunActive = false; flamingBulletsActive = false; hasDashInvincibility = false;
            lastAntiGravityPushTime = 0; lastBlackHoleTime = 0; shotgunBlastActive = false; doppelgangerActive = false;
            doppelganger = null;
            bugSwarmActive = false; nightOwlActive = false; whirlwindAxeActive = false; lightningStrikeActive = false; owl = null;
            
            dog = { x: player.x, y: player.y, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 };
            player2 = null;
            merchant = null; // Ensure no merchant at start

            temporalWardActive = false; isTimeStopped = false; timeStopEndTime = 0;
            resetRunStats();
            applyCheats();

            player.x = WORLD_WIDTH / 2; player.y = WORLD_HEIGHT / 2;
            aimDx = 0; aimDy = 0;
            
            updatePowerupIconsUI(); updateUpgradeStatsUI(); updateUIStats();
            
            gameStartText.textContent = "Game Start!";
            gameStartDifficulty.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
            gameStartOverlay.style.display = 'flex';
            setTimeout(() => { gameStartOverlay.style.display = 'none'; }, 2000);

            Tone.Transport.bpm.value = 120;
            gameStartTime = Date.now();
            runStats.startTime = gameStartTime; // ACHIEVEMENT FIX
            lastFrameTime = gameStartTime;
            runStats.lastDamageTime = gameStartTime;
            lastCircleSpawnEventTime = gameStartTime; 
            lastBarrelSpawnTime = gameStartTime;
            lastDoppelgangerSpawnTime = gameStartTime;
            lastMerchantSpawnTime = gameStartTime;
            animationFrameId = requestAnimationFrame(gameLoop);
        }

        function displayHighScores() {
            try {
                const highScores = JSON.parse(localStorage.getItem('highScores')) || {
                    easy: { score: 0, level: 1 }, medium: { score: 0, level: 1 }, hard: { score: 0, level: 1 }
                };
                document.getElementById('easyHighScore').textContent = highScores.easy.score;
                document.getElementById('easyHighLevel').textContent = highScores.easy.level;
                document.getElementById('mediumHighScore').textContent = highScores.medium.score;
                document.getElementById('mediumHighLevel').textContent = highScores.medium.level;
                document.getElementById('hardHighScore').textContent = highScores.hard.score;
                document.getElementById('hardHighLevel').textContent = highScores.hard.level;
            } catch (error) { console.error("Could not display high scores:", error); }
        }

        async function showDifficultyScreen() { 
            // Show all menu buttons when returning to menu
            document.querySelector('.bottom-menu-buttons').style.display = 'flex';

            if (gameContainer) gameContainer.style.display = 'none';
            if (gameStats) gameStats.style.display = 'none'; // Hide game stats
            if (mobileResetButton) mobileResetButton.style.display = 'block'; // Hide mobile reset
            if (movementStickBase) movementStickBase.style.display = 'none';
            if (firestickBase) firestickBase.style.display = 'none';
            if (upgradeMenu) upgradeMenu.style.display = 'none';
            if (gameOverlay) gameOverlay.style.display = 'none';
            if (gameGuideModal) gameGuideModal.style.display = 'none';
            if (achievementsModal) achievementsModal.style.display = 'none';
            if (cheatsModal) cheatsModal.style.display = 'none';
            if (pauseButton) pauseButton.style.display = 'none'; 
            if (pauseOverlay) pauseOverlay.style.display = 'none'; 
            if (upgradeShop) upgradeShop.style.display = 'none';
            if (mapSelectContainer) mapSelectContainer.style.display = 'none';
            if (characterSelectContainer) characterSelectContainer.style.display = 'none';
            stopBGM();
            startMainMenuBGM();
            displayHighScores();
            if (difficultyContainer) difficultyContainer.style.display = 'block';
            if (canvas) canvas.style.cursor = 'default';
            isMouseInCanvas = false; cameraZoom = 1.0;
        }
        function togglePause() {
            vibrate(20);
            gamePaused = !gamePaused;
            if (gamePaused) { pauseOverlay.style.display = 'flex'; Tone.Transport.pause(); } 
            else { pauseOverlay.style.display = 'none'; Tone.Transport.start(); }
        }
        
        function triggerDash(entity) {
            const now = Date.now();
            if (!entity || entity.isDashing || now - entity.lastDashTime < entity.dashCooldown) {
                return;
            }
            entity.isDashing = true;
            entity.dashEndTime = now + 300; // 300ms dash duration
            entity.lastDashTime = now;
            entity.spinStartTime = now; // For spin animation
            playSound('dodge'); // Play dodge sound
            if (entity === player) {
                playerStats.totalDashes++;
            }
        }

        function triggerCircleSpawnEvent() {
            const numEnemies = 24;
            const radius = Math.min(canvas.width, canvas.height);
            const enemyType = Math.random() < 0.5 ? '🧟' : '💀';
            visualWarnings.push({ x: player.x, y: player.y, radius: radius, spawnTime: Date.now(), duration: 2000 });
            setTimeout(() => {
                for (let i = 0; i < numEnemies; i++) {
                    const angle = (i / numEnemies) * 2 * Math.PI;
                    const x = player.x + radius * Math.cos(angle);
                    const y = player.y + radius * Math.sin(angle);
                    const boundedX = Math.max(0, Math.min(WORLD_WIDTH, x));
                    const boundedY = Math.max(0, Math.min(WORLD_HEIGHT, y));
                    createEnemy(boundedX, boundedY, enemyType);
                }
            }, 2000);
        }

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

            // More complex checks can be added here as needed
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

// ================================================================================= //
        // ======================== MERCHANT AND GAME LOGIC START ========================== //
        // ================================================================================= //

        function closeMerchantShop() {
    merchantShop.style.display = 'none';
    gamePaused = false;
    // The merchant is now removed upon collision, not when closing the shop.
}

        function showMerchantShop() {
            gamePaused = true;
            merchantOptionsContainer.innerHTML = ''; // Clear previous options
            playUISound('levelUp');

            const options = [];
            
            // Option 1: Trade 3 apples for XP
            const canAffordXp = player.appleCount >= 3;
            options.push({
                type: 'xp_for_apples',
                name: "Gain Experience",
                desc: "A hearty meal to fuel your journey.",
                icon: '📈',
                cost: 3,
                currency: 'apples',
                xpAmount: player.xpToNextLevel, // Give a full level up's worth
                enabled: canAffordXp
            });

            // Options 2 & 3: Buy a random powerup with coins
            const availablePowerups = [];
            if (!magneticProjectileActive) availablePowerups.push({id:'magnetic_projectile', name: 'Magnetic Shots', icon: '🧲'});
            if (!explosiveBulletsActive) availablePowerups.push({id: 'explosive_bullets', name: 'Explosive Bullets', icon: '💥'});
            if (!ricochetActive) availablePowerups.push({id:'ricochet', name: 'Ricochet Shots', icon: '🔄'});
            if (!player.swordActive) availablePowerups.push({id:'sword', name: 'Auto-Sword', icon: '🗡️'});
            if (!dogCompanionActive && playerData.unlockedPickups.dog_companion) availablePowerups.push({id: 'dog_companion', name: 'Dog Companion', icon: '🐶'});
            if (!nightOwlActive && playerData.unlockedPickups.night_owl) availablePowerups.push({id: 'night_owl', name: 'Night Owl', icon: '🦉'});

            for (let i = availablePowerups.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availablePowerups[i], availablePowerups[j]] = [availablePowerups[j], availablePowerups[i]];
            }

            const powerupsToSell = availablePowerups.slice(0, 2);
            powerupsToSell.forEach(powerup => {
                const coinCost = 50 + Math.floor(player.level * 5);
                options.push({
                    type: 'buy_powerup',
                    name: powerup.name,
                    desc: `A powerful artifact.`,
                    icon: powerup.icon,
                    cost: coinCost,
                    currency: 'coins',
                    powerupId: powerup.id,
                    enabled: player.coins >= coinCost
                });
            });

            // Create the cards
            options.forEach(option => {
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
                if (player.xp >= player.xpToNextLevel) {
                    // Delay closing the shop slightly to see the level up screen
                    setTimeout(() => levelUp(), 200);
                }
            } else if (option.type === 'buy_powerup') {
                player.coins -= option.cost;
                activatePowerup(option.powerupId);
                floatingTexts.push({ text: `${option.name}!`, x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500 });
            }

            if (option.type !== 'xp_for_apples' || player.xp < player.xpToNextLevel) {
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
            else if (id === 'dog_companion') {  dogCompanionActive = true; dog.x = player.x; dog.y = player.y; dog.state = 'returning'; }
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
            updatePowerupIconsUI();
        }

        function update() {
    if (gamePaused || gameOver || !gameActive) return;

    // *** OPTIMIZATION: Clear and repopulate the Quadtree each frame ***
    quadtree.clear();
    const allGameObjects = [...enemies, ...destructibles, player];
    if (player2 && player2.active) allGameObjects.push(player2);
    if (doppelganger) allGameObjects.push(doppelganger);
    
    for(const obj of allGameObjects) {
        quadtree.insert({
            x: obj.x - obj.size / 2,
            y: obj.y - obj.size / 2,
            width: obj.size,
            height: obj.size,
            ref: obj // Keep a reference to the original object
        });
    }
    // *** END OF QUADTREE POPULATION ***

    const now = Date.now();
            const deltaTime = now - lastFrameTime;
            if (deltaTime > 0) {
                const xpGainMultiplier = 1 + (playerData.upgrades.xpGain || 0) * PERMANENT_UPGRADES.xpGain.effect;
                if(doppelgangerActive && runStats.lastDoppelgangerStartTime > 0){
                    runStats.doppelgangerActiveTimeThisRun += deltaTime;
                }
            }
            lastFrameTime = now;
            checkAchievements();
            
            if (Date.now() - lastMerchantSpawnTime >= MERCHANT_SPAWN_INTERVAL) {
    spawnMerchant(player.x + 200, player.y); 
    lastMerchantSpawnTime = Date.now(); // Reset the timer right after spawning
}

// Loop through all active merchants to check for collision.
for (let i = merchants.length - 1; i >= 0; i--) {
    const currentMerchant = merchants[i];
    const dx = player.x - currentMerchant.x;
    const dy = player.y - currentMerchant.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < (player.size / 2) + (currentMerchant.size / 2)) {
        showMerchantShop();      // Open the shop
        merchants.splice(i, 1); // Remove THIS merchant from the array
        break;                   // Stop checking for this frame
    }
}

            if (fireRateBoostActive && now > fireRateBoostEndTime) fireRateBoostActive = false;
            
            if (isTimeStopped && now > timeStopEndTime) {
                isTimeStopped = false;
            }
            
            if (now - lastCircleSpawnEventTime > 180000) {
                triggerCircleSpawnEvent();
                lastCircleSpawnEventTime = now;
            }

            if (now - lastBarrelSpawnTime > 30000) {
                spawnRandomBarrel();
                lastBarrelSpawnTime = now;
            }
            


            let moveX = 0; let moveY = 0; let isMoving = false;
            if (keys['ArrowUp'] || keys['w']) moveY -= 1;
            if (keys['ArrowDown'] || keys['s']) moveY += 1;
            if (keys['ArrowLeft'] || keys['a']) moveX -= 1;
            if (keys['ArrowRight'] || keys['d']) moveX += 1;

            if (moveX === 0 && moveY === 0) { moveX = joystickDirX; moveY = joystickDirY; }

            const moveMagnitude = Math.hypot(moveX, moveY);
            if (moveMagnitude > 0) {
                isMoving = true;
                moveX /= moveMagnitude;
                moveY /= moveMagnitude;
            }

            const spinDuration = 500; // Spin completes in 0.5 seconds
            if (player.isDashing && player.spinStartTime) {
                if (now < player.spinStartTime + spinDuration) {
                    if (moveX > 0) {
                        player.spinDirection = 1; // clockwise
                    } else if (moveX < 0) {
                        player.spinDirection = -1; // counter-clockwise
                    } else if (player.spinDirection === 0) {
                        player.spinDirection = 1; // Default to clockwise if no horizontal movement
                    }
                } else {
                    player.spinStartTime = null;
                    player.spinDirection = 0;
                }
            }

            if (isMoving && !player.isDashing) { player.stepPhase += player.speed * 0.1; }
            
            let currentPlayerSpeed = player.speed;
            if (cheats.double_game_speed) currentPlayerSpeed *= 2;


            if(player.isDashing) {
                currentPlayerSpeed *= 3.5;
                if(now > player.dashEndTime) {
                    player.isDashing = false;
                    player.isInvincible = false;
                } else {
                    if (hasDashInvincibility) player.isInvincible = true;
                    // Spawn dash trail
                    if (Math.random() > 0.5) {
                        smokeParticles.push({
                            x: player.x, y: player.y + player.size / 4,
                            dx: (Math.random() - 0.5) * 0.5, dy: (Math.random() - 0.5) * 0.5,
                            size: 15 + Math.random() * 10, alpha: 0.8,
                            angle: Math.PI / 2 + (Math.random() - 0.5) * 0.2
                        });
                    }
                }
            }

            player.isSlowedByMosquitoPuddle = false;
            for (const puddle of mosquitoPuddles) {
                const dx = player.x - puddle.x;
                const dy = player.y - puddle.y;
                if (dx*dx + dy*dy < ((player.size / 2) + (puddle.size / 2))**2) {
                    currentPlayerSpeed *= MOSQUITO_PUDDLE_SLOW_FACTOR;
                    player.isSlowedByMosquitoPuddle = true;
                    break;
                }
            }

            for (const puddle of snailPuddles) {
                const dx = player.x - puddle.x;
                const dy = player.y - puddle.y;
                if (dx*dx + dy*dy < ((player.size / 2) + (puddle.size / 2))**2) {
                    currentPlayerSpeed *= PLAYER_PUDDLE_SLOW_FACTOR; 
                    break;
                }
            }

            if (isMoving) {
                let nextX = player.x + moveX * currentPlayerSpeed;
                let nextY = player.y + moveY * currentPlayerSpeed;
                let collision = false;
                for (const obs of destructibles) {
                    const dx = nextX - obs.x;
                    const dy = nextY - obs.y;
                    if(dx*dx + dy*dy < ((player.size / 2) + (obs.size / 2))**2) {
                        collision = true;
                        break;
                    }
                }
                if (!collision) { player.x = nextX; player.y = nextY; }
            }
            
            const PUSH_BACK_STRENGTH = 2.5;
            const halfPlayerSize = player.size / 2;
            if (player.x < halfPlayerSize) player.x += PUSH_BACK_STRENGTH;
            if (player.x > WORLD_WIDTH - halfPlayerSize) player.x -= PUSH_BACK_STRENGTH;
            if (player.y < halfPlayerSize) player.y += PUSH_BACK_STRENGTH;
            if (player.y > WORLD_HEIGHT - halfPlayerSize) player.y -= PUSH_BACK_STRENGTH;
            player.x = Math.max(halfPlayerSize, Math.min(WORLD_WIDTH - halfPlayerSize, player.x));
            player.y = Math.max(halfPlayerSize, Math.min(WORLD_HEIGHT - halfPlayerSize, player.y));

            const aimMagnitude = Math.hypot(aimDx, aimDy);
            const normAimDx = aimMagnitude > 0 ? aimDx / aimMagnitude : 0;
            const normAimDy = aimMagnitude > 0 ? aimDy / aimMagnitude : 0;
            const targetAimOffsetX = normAimDx * CAMERA_PULL_STRENGTH;
            const targetAimOffsetY = normAimDy * CAMERA_PULL_STRENGTH;
            cameraAimOffsetX += (targetAimOffsetX - cameraAimOffsetX) * CAMERA_LERP_FACTOR;
            cameraAimOffsetY += (targetAimOffsetY - cameraAimOffsetY) * CAMERA_LERP_FACTOR;
            const targetCameraX = player.x + cameraAimOffsetX;
            const targetCameraY = player.y + cameraAimOffsetY;
            cameraOffsetX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, targetCameraX - canvas.width / 2));
            cameraOffsetY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, targetCameraY - canvas.height / 2));
            
            if (autoAimActive) {
                let closestEnemy = null; let minDistanceSq = Infinity;
                enemies.forEach(enemy => {
                    if (!enemy.isHit) {
                        const distSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
                        if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                    }
                });
                if (closestEnemy) {
                    const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
                    player.rotationAngle = angle;
                    if (angle > -Math.PI / 4 && angle <= Math.PI / 4) player.facing = 'right';
                    else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) player.facing = 'down';
                    else if (angle > 3 * Math.PI / 4 || angle <= -3 * Math.PI / 4) player.facing = 'left';
                    else player.facing = 'up';
                }
            } else if (aimDx !== 0 || aimDy !== 0) {
                const angle = Math.atan2(aimDy, aimDx);
                player.rotationAngle = angle;
                if (angle > -Math.PI / 4 && angle <= Math.PI / 4) player.facing = 'right';
                else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) player.facing = 'down';
                else if (angle > 3 * Math.PI / 4 || angle <= -3 * Math.PI / 4) player.facing = 'left';
                else player.facing = 'up';
            }

            // ===== UPDATED PLAYER 2 CONTROLS =====
            if (player2 && player2.active) {
                // Reset Player 2 movement and aiming each frame
                let p2VelX = 0; let p2VelY = 0;
                let p2aimDx = 0; let p2aimDy = 0;
                
                // Movement with jkli keys
                if (keys['j']) p2VelX -= player2.speed;
                if (keys['l']) p2VelX += player2.speed;
                if (keys['i']) p2VelY -= player2.speed;
                if (keys['k']) p2VelY += player2.speed;
                


                // Player 2 spin animation logic
                if(player2.isDashing && player2.spinStartTime) {
                    if (now < player2.spinStartTime + spinDuration) {
                        if (p2VelX > 0) {
                            player2.spinDirection = 1; // clockwise
                        } else if (p2VelX < 0) {
                            player2.spinDirection = -1; // counter-clockwise
                        } else if (player2.spinDirection === 0) {
                            player2.spinDirection = 1; // Default
                        }
                    } else {
                        player2.spinStartTime = null;
                        player2.spinDirection = 0;
                    }
                }

                // Apply dash speed multiplier
                if(player2.isDashing){
                    p2VelX *= 3.5;
                    p2VelY *= 3.5;
                    if(now > player2.dashEndTime) player2.isDashing = false;
                }
                
                // Apply movement
                player2.x += p2VelX; 
                player2.y += p2VelY;
                
                // Update facing direction
                if (p2VelX > 0) player2.facing = 'right'; 
                else if (p2VelX < 0) player2.facing = 'left';
                if (p2VelY > 0) player2.facing = 'down'; 
                else if (p2VelY < 0) player2.facing = 'up';
                
                // Keep Player 2 within world bounds
                player2.x = Math.max(player2.size / 2, Math.min(WORLD_WIDTH - player2.size / 2, player2.x));
                player2.y = Math.max(player2.size / 2, Math.min(WORLD_HEIGHT - player2.size / 2, player2.y));
                
                // Player 2 aiming with numpad (8=up, 2=down, 4=left, 6=right)
                if (keys['8']) p2aimDy = -1; // Numpad 8 is up
                if (keys['2']) p2aimDy = 1;  // Numpad 2 is down  
                if (keys['4']) p2aimDx = -1; // Numpad 4 is left
                if (keys['6']) p2aimDx = 1;  // Numpad 6 is right
                
                // Diagonal aiming support
                if (keys['7']) { p2aimDx = -1; p2aimDy = -1; } // Up-left
                if (keys['9']) { p2aimDx = 1; p2aimDy = -1; }  // Up-right
                if (keys['1']) { p2aimDx = -1; p2aimDy = 1; }  // Down-left
                if (keys['3']) { p2aimDx = 1; p2aimDy = 1; }   // Down-right
                
                // Normalize diagonal aiming
                const p2AimMagnitude = Math.hypot(p2aimDx, p2aimDy);
                if (p2AimMagnitude > 0) {
                    p2aimDx /= p2AimMagnitude;
                    p2aimDy /= p2AimMagnitude;
                    player2.gunAngle = Math.atan2(p2aimDy, p2aimDx);
                }
                
                // Player 2 shooting logic
                const p2isShooting = p2aimDx !== 0 || p2aimDy !== 0;
                if (p2isShooting && now - player2.lastFireTime > player2.fireInterval) {
                    createPlayer2Weapon();
                    player2.lastFireTime = now;
                }
            }
// --- NEW POWERUP LOGIC ---
            if (bugSwarmActive && !isTimeStopped && now - lastBugSwarmSpawnTime > BUG_SWARM_INTERVAL) {
                for (let i = 0; i < BUG_SWARM_COUNT; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    flies.push({
                        x: player.x + Math.cos(angle) * player.size,
                        y: player.y + Math.sin(angle) * player.size,
                        target: null, isHit: false
                    });
                }
                lastBugSwarmSpawnTime = now;
            }
            if (nightOwlActive && !isTimeStopped) {
                if (!owl) { owl = { x: player.x, y: player.y - OWL_FOLLOW_DISTANCE, lastFireTime: 0 }; }
                const targetX = player.x; const targetY = player.y - OWL_FOLLOW_DISTANCE;
                owl.x += (targetX - owl.x) * 0.05; owl.y += (targetY - owl.y) * 0.05;
                if (now - owl.lastFireTime > OWL_FIRE_INTERVAL && enemies.length > 0) {
                    let closestEnemy = null, minDistanceSq = Infinity;
                    enemies.forEach(enemy => {
                        if (!enemy.isHit) {
                            const distSq = (owl.x - enemy.x)**2 + (owl.y - enemy.y)**2;
                            if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                        }
                    });
                    if (closestEnemy) {
                        const angle = Math.atan2(closestEnemy.y - owl.y, closestEnemy.x - owl.x);
                        owlProjectiles.push({
                            x: owl.x, y: owl.y, size: OWL_PROJECTILE_SIZE,
                            dx: Math.cos(angle) * OWL_PROJECTILE_SPEED,
                            dy: Math.sin(angle) * OWL_PROJECTILE_SPEED,
                            angle: angle, isHit: false, lifetime: now + 3000
                        });
                        owl.lastFireTime = now;
                    }
                }
            }
            if (lightningStrikeActive && !isTimeStopped && now - lastLightningStrikeTime > LIGHTNING_STRIKE_INTERVAL) {
                if (enemies.length > 0) {
                    const targetEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                    if (targetEnemy && !targetEnemy.isHit) {
                        lightningStrikes.push({ x: targetEnemy.x, y: targetEnemy.y, startTime: now, duration: 500 });
                        targetEnemy.health -= LIGHTNING_STRIKE_DAMAGE;
                        playerStats.totalEnemiesHitByLightning++;
                        createBloodSplatter(targetEnemy.x, targetEnemy.y);
                        if (targetEnemy.health <= 0) { handleEnemyDeath(targetEnemy); }
                        lastLightningStrikeTime = now;
                    }
                }
            }


            let enemySpawnCap = cheats.noSpawnCap ? Infinity : 100;
            let currentEnemySpawnInterval = enemySpawnInterval / Math.pow(1.3, player.boxPickupsCollectedCount) * (1 - 0.01 * (player.level - 1));
            currentEnemySpawnInterval = Math.max(80, currentEnemySpawnInterval);
            if (player.level > 0 && player.level % BOSS_SPAWN_INTERVAL_LEVELS === 0 && player.level !== lastBossLevelSpawned) {
                createBoss();
                lastBossLevelSpawned = player.level;
            }
            if (enemies.length < enemySpawnCap && now - lastEnemySpawnTime > currentEnemySpawnInterval) {
                createEnemy();
                lastEnemySpawnTime = now;
            }
            
            const enemyMovements = new Map();
            enemies.forEach((enemy) => {
                if (isTimeStopped) return;
                if (enemy.isIgnited) {
                    if (now > enemy.ignitionEndTime) { enemy.isIgnited = false; } 
                    else if (now - enemy.lastIgnitionDamageTime > 3000) {
                        enemy.health -= 1;
                        createBloodSplatter(enemy.x, enemy.y);
                        if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                        enemy.lastIgnitionDamageTime = now;
                    }
                }

                let moveX = 0; let moveY = 0;
                let target = player;
                let minTargetDistSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;

                if (player2 && player2.active) {
                    const distToPlayer2Sq = (player2.x - enemy.x)**2 + (player2.y - enemy.y)**2;
                    if (distToPlayer2Sq < minTargetDistSq) { target = player2; minTargetDistSq = distToPlayer2Sq; }
                }
                if (doppelganger) {
                    const distToDoppelgangerSq = (doppelganger.x - enemy.x)**2 + (doppelganger.y - enemy.y)**2;
                    if(distToDoppelgangerSq < minTargetDistSq) { target = doppelganger; minTargetDistSq = distToDoppelgangerSq; }
                }
                
                let angleToTarget = Math.atan2(target.y - enemy.y, target.x - enemy.x);

                let effectiveEnemySpeed = enemy.speed;
                if(cheats.fastEnemies) effectiveEnemySpeed *= 1.5;
                if(cheats.slowEnemies) effectiveEnemySpeed *= 0.5;

                enemy.isSlowedByPuddle = false;
                for (const puddle of playerPuddles) {
                    const dx = enemy.x - puddle.x;
                    const dy = enemy.y - puddle.y;
                    if (dx*dx + dy*dy < ((enemy.size / 2) + (puddle.size / 2))**2) {
                        effectiveEnemySpeed *= PLAYER_PUDDLE_SLOW_FACTOR;
                        enemy.isSlowedByPuddle = true;
                        break;
                    }
                }
                 for (const puddle of snailPuddles) {
                    const dx = enemy.x - puddle.x;
                    const dy = enemy.y - puddle.y;
                    if (dx*dx + dy*dy < ((enemy.size / 2) + (puddle.size / 2))**2) {
                        effectiveEnemySpeed *= PLAYER_PUDDLE_SLOW_FACTOR;
                        enemy.isSlowedByPuddle = true;
                        break;
                    }
                }
                if (enemy.isFrozen && now < enemy.freezeEndTime) {
                    enemyMovements.set(enemy, {moveX: 0, moveY: 0});
                    return;
                } else if (enemy.isFrozen && now >= enemy.freezeEndTime) enemy.isFrozen = false;
                
                const enemyBehaviorType = enemy.isBoss ? ENEMY_CONFIGS[enemy.mimics].type : ENEMY_CONFIGS[enemy.emoji].type;
                switch (enemyBehaviorType) {
                    case 'bat':
                        enemy.pauseTimer++;
                        if (enemy.isPaused) { if (enemy.pauseTimer >= enemy.pauseDuration) { enemy.isPaused = false; enemy.pauseTimer = 0; } }
                        else { moveX += Math.cos(angleToTarget) * effectiveEnemySpeed; moveY += Math.sin(angleToTarget) * effectiveEnemySpeed; if (enemy.pauseTimer >= enemy.moveDuration) { enemy.isPaused = true; enemy.pauseTimer = 0; } }
                        break;
                    case 'devil': 
                        if (now - enemy.lastAxisSwapTime > 500) {
                            enemy.moveAxis = enemy.moveAxis === 'x' ? 'y' : 'x';
                            enemy.lastAxisSwapTime = now;
                        }
                        if (enemy.moveAxis === 'x') { moveX += Math.sign(target.x - enemy.x) * effectiveEnemySpeed; } 
                        else { moveY += Math.sign(target.y - enemy.y) * effectiveEnemySpeed; }
                        break;
                    case 'demon':
                        if (now - enemy.lastStateChangeTime >= 2000) { enemy.moveState = (enemy.moveState === 'following') ? 'random' : 'following'; enemy.lastStateChangeTime = now; if (enemy.moveState === 'random') { const randomAngle = Math.random() * Math.PI * 2; enemy.randomDx = Math.cos(randomAngle); enemy.randomDy = Math.sin(randomAngle); } }
                        if (enemy.moveState === 'following') { moveX += Math.cos(angleToTarget) * effectiveEnemySpeed; moveY += Math.sin(angleToTarget) * effectiveEnemySpeed; }
                        else { moveX += enemy.randomDx * effectiveEnemySpeed; moveY += enemy.randomDy * effectiveEnemySpeed; }
                        break;
                    case 'ghost':
                        if (now - enemy.lastPhaseChange > enemy.phaseDuration) {
                            enemy.isVisible = !enemy.isVisible;
                            enemy.lastPhaseChange = now;
                        }
                        enemy.bobOffset = Math.sin(now / 200) * 4;
                        if(enemy.isVisible) {
                           moveX += Math.cos(angleToTarget) * effectiveEnemySpeed;
                           moveY += Math.sin(angleToTarget) * effectiveEnemySpeed;
                        }
                        break;
                    case 'eye':
                        const distanceToTarget = Math.sqrt(minTargetDistSq);
                        if (distanceToTarget < EYE_SAFE_DISTANCE) { moveX -= Math.cos(angleToTarget) * effectiveEnemySpeed; moveY -= Math.sin(angleToTarget) * effectiveEnemySpeed; }
                        else if (distanceToTarget > EYE_TOO_FAR_DISTANCE) { moveX += Math.cos(angleToTarget) * effectiveEnemySpeed; moveY += Math.sin(angleToTarget) * effectiveEnemySpeed; }
                        else { if (now - enemy.lastEyeProjectileTime > EYE_PROJECTILE_INTERVAL) { eyeProjectiles.push({ x: enemy.x, y: enemy.y, size: EYE_PROJECTILE_SIZE, emoji: EYE_PROJECTILE_EMOJI, speed: EYE_PROJECTILE_SPEED, dx: Math.cos(angleToTarget) * EYE_PROJECTILE_SPEED, dy: Math.sin(angleToTarget) * EYE_PROJECTILE_SPEED, lifetime: now + EYE_PROJECTILE_LIFETIME }); enemy.lastEyeProjectileTime = now; playSound('playerShoot'); } }
                        break;
                    case 'vampire':
                        let dodgeVectorX = 0, dodgeVectorY = 0;
                        for (const weapon of weaponPool) {
                            if(weapon.active) {
                                const distSq = (enemy.x - weapon.x)**2 + (enemy.y - weapon.y)**2;
                                if (distSq < VAMPIRE_DODGE_DETECTION_RADIUS * VAMPIRE_DODGE_DETECTION_RADIUS) {
                                    if ((weapon.dx * (enemy.x - weapon.x)) + (weapon.dy * (enemy.y - weapon.y)) > 0) {
                                        const perpDx = -weapon.dy, perpDy = weapon.dx;
                                        const normalizeFactor = Math.sqrt(perpDx * perpDx + perpDy * perpDy);
                                        if (normalizeFactor > 0) { dodgeVectorX += (perpDx / normalizeFactor); dodgeVectorY += (perpDy / normalizeFactor); }
                                    }
                                }
                            }
                        }
                        const dodgeMagnitude = Math.sqrt(dodgeVectorX * dodgeVectorX + dodgeVectorY * dodgeVectorY);
                        if (dodgeMagnitude > 0) { dodgeVectorX = (dodgeVectorX / dodgeMagnitude) * VAMPIRE_DODGE_STRENGTH; dodgeVectorY = (dodgeVectorY / dodgeMagnitude) * VAMPIRE_DODGE_STRENGTH; }
                        moveX += (Math.cos(angleToTarget) * effectiveEnemySpeed) + dodgeVectorX;
                        moveY += (Math.sin(angleToTarget) * effectiveEnemySpeed) + dodgeVectorY;
                        break;
                    case 'mosquito':
                        if (!enemy.currentMosquitoDirection || (now - enemy.lastDirectionUpdateTime > MOSQUITO_DIRECTION_UPDATE_INTERVAL)) { enemy.lastDirectionUpdateTime = now; enemy.currentMosquitoDirection = { dx: Math.cos(angleToTarget), dy: Math.sin(angleToTarget) }; }
                        moveX += enemy.currentMosquitoDirection.dx * effectiveEnemySpeed;
                        moveY += enemy.currentMosquitoDirection.dy * effectiveEnemySpeed;
                        if (now - enemy.lastPuddleSpawnTime > MOSQUITO_PUDDLE_SPAWN_INTERVAL) { mosquitoPuddles.push({ x: enemy.x, y: enemy.y, size: MOSQUITO_PUDDLE_SIZE, spawnTime: now, lifetime: MOSQUITO_PUDDLE_LIFETIME }); enemy.lastPuddleSpawnTime = now; }
                        break;
                    case 'snail':
                        moveX += Math.cos(enemy.directionAngle) * effectiveEnemySpeed;
                        moveY += Math.sin(enemy.directionAngle) * effectiveEnemySpeed;
                        if (enemy.x < 0 || enemy.x > WORLD_WIDTH || enemy.y < 0 || enemy.y > WORLD_HEIGHT) {
                           enemy.directionAngle = Math.random() * 2 * Math.PI; // Change direction when off-screen
                        }
                        if (now - enemy.lastPuddleSpawnTime > PLAYER_PUDDLE_SPAWN_INTERVAL * 2) { // Slower than player
                            snailPuddles.push({ x: enemy.x, y: enemy.y, size: PLAYER_PUDDLE_SIZE, spawnTime: now, lifetime: PLAYER_PUDDLE_LIFETIME * 2 });
                            enemy.lastPuddleSpawnTime = now;
                        }
                        break;
                    default:
                        moveX += Math.cos(angleToTarget) * effectiveEnemySpeed;
                        moveY += Math.sin(angleToTarget) * effectiveEnemySpeed;
                        break;
                }
                enemyMovements.set(enemy, {moveX, moveY});
            });
            
            const separationForce = 1.5;
            const finalMovements = new Map();
            enemies.forEach(e1 => {
                let totalMove = enemyMovements.get(e1);
                if (!totalMove) return;

                // This section for pushing away from obstacles (like brick walls) remains.
                let repulsionX = 0; let repulsionY = 0;
                destructibles.forEach(obs => {
                    const dx = e1.x - obs.x;
                    const dy = e1.y - obs.y;
                    const distSq = dx*dx + dy*dy;
                    const repulsionRadius = obs.size/2 + e1.size/2 + 5;
                    if (distSq < repulsionRadius*repulsionRadius) {
                        const dist = Math.sqrt(distSq);
                        const pushForce = (1 - (dist / repulsionRadius)) * 2;
                        if(dist > 0.1) {
                            repulsionX += (dx / dist) * pushForce;
                            repulsionY += (dy / dist) * pushForce;
                        }
                    }
                });

                // The calculation for finalX and finalY no longer includes the separation force.
                finalMovements.set(e1, {
                    finalX: totalMove.moveX + repulsionX,
                    finalY: totalMove.moveY + repulsionY
                });
            });
            
            enemies.forEach(enemy => {
                const finalMove = finalMovements.get(enemy);
                if (finalMove) {
                    let nextX = enemy.x + finalMove.finalX;
                    let nextY = enemy.y + finalMove.finalY;
                    let collision = false;
                    for (const obs of destructibles) {
                        const dx = nextX - obs.x;
                        const dy = nextY - obs.y;
                        if (dx*dx + dy*dy < ((enemy.size / 2) + (obs.size / 2))**2) {
                            collision = true;
                            break;
                        }
                    }
                    if (!collision) { enemy.x = nextX; enemy.y = nextY; }
                }

                const canGhostDamage = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);
                const combinedRadius = (player.size / 2) + (enemy.size / 2) - 5.6;
                const dx_player = player.x - enemy.x;
                const dy_player = player.y - enemy.y;

                if (canGhostDamage && !player.isInvincible && !cheats.god_mode && (dx_player*dx_player + dy_player*dy_player) < combinedRadius*combinedRadius) {
                    player.lives--;
                    runStats.lastDamageTime = now;
                    createBloodSplatter(player.x, player.y); createBloodPuddle(player.x, player.y, player.size);
                    vibrate(50); playSound('playerScream');
                    isPlayerHitShaking = true; playerHitShakeStartTime = now;
                    if (vengeanceNovaActive) { vengeanceNovas.push({ x: player.x, y: player.y, startTime: now, duration: 500, maxRadius: player.size * 3 }); }
                    if (temporalWardActive) { isTimeStopped = true; timeStopEndTime = now + 2000; playSound('levelUpSelect'); }
                    if (player.lives <= 0) { endGame(); }
                    handleEnemyDeath(enemy);
                }
                if (canGhostDamage && player2 && player2.active) {
                    const combinedRadiusP2 = (player2.size / 2) + (enemy.size / 2);
                    const dx_p2 = player2.x - enemy.x;
                    const dy_p2 = player2.y - enemy.y;
                    if((dx_p2*dx_p2 + dy_p2*dy_p2) < combinedRadiusP2*combinedRadiusP2) {
                        player2.active = false; playSound('playerScream');
                        createBloodSplatter(player2.x, player2.y); createBloodPuddle(player2.x, player2.y, player2.size);
                        handleEnemyDeath(enemy);
                    }
                }
                if (canGhostDamage && doppelganger) {
                    const combinedRadiusDop = (doppelganger.size / 2) + (enemy.size / 2);
                    const dx_dop = doppelganger.x - enemy.x;
                    const dy_dop = doppelganger.y - enemy.y;
                    if((dx_dop*dx_dop + dy_dop*dy_dop) < combinedRadiusDop*combinedRadiusDop) {
                        createBloodSplatter(doppelganger.x, doppelganger.y); createBloodPuddle(doppelganger.x, doppelganger.y, doppelganger.size);
                        doppelganger = null; doppelgangerActive = false;
                        runStats.lastDoppelgangerStartTime = 0;
                        updatePowerupIconsUI(); handleEnemyDeath(enemy);
                    }
                }
            });
            
            if (doppelganger) {
                if (now > doppelganger.endTime) {
                    doppelganger = null; doppelgangerActive = false;
                    runStats.lastDoppelgangerStartTime = 0;
                    updatePowerupIconsUI();
                } else {
                    let closestEnemy = null; let minDistanceSq = Infinity;
                    enemies.forEach(enemy => {
                        if (!enemy.isHit) {
                            const distSq = (doppelganger.x - enemy.x)**2 + (doppelganger.y - enemy.y)**2;
                            if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                        }
                    });
                    if (closestEnemy) {
                        doppelganger.rotationAngle = Math.atan2(closestEnemy.y - doppelganger.y, closestEnemy.x - doppelganger.x);
                        if (now - doppelganger.lastFireTime > DOPPELGANGER_FIRE_INTERVAL) {
                            createWeapon(doppelganger, doppelganger.rotationAngle);
                            doppelganger.lastFireTime = now;
                        }
                    }
                }
            }

            if (dogCompanionActive && !isTimeStopped) {
                const DOG_SPEED = baseEnemySpeed * SKULL_SPEED_MULTIPLIER;
                if (dog.state === 'returning') {
                    const dx = player.x - dog.x;
                    const dy = player.y - dog.y;
                    if (dx*dx + dy*dy < (player.size/2)**2) { dog.state = 'seeking'; dog.target = null; } 
                    else {
                        const angleToPlayer = Math.atan2(player.y - dog.y, player.x - dog.x);
                        dog.x += Math.cos(angleToPlayer) * DOG_SPEED;
                        dog.y += Math.sin(angleToPlayer) * DOG_SPEED;
                    }
                } else if (dog.state === 'seeking') {
                    if (dog.target && dog.target.isHit) { dog.target = null; }
                    if (!dog.target) {
                        let closestEnemy = null; let minDistanceSq = Infinity;
                        enemies.forEach(enemy => {
                            if (!enemy.isHit && !enemy.isBoss) {
                                const distSq = (dog.x - enemy.x)**2 + (dog.y - enemy.y)**2;
                                if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                            }
                        });
                        dog.target = closestEnemy;
                    }
                    if (dog.target) {
                        const dx = dog.target.x - dog.x;
                        const dy = dog.target.y - dog.y;
                        const combinedRadius = (dog.size / 2) + (dog.target.size / 2);
                        if (dx*dx + dy*dy < combinedRadius*combinedRadius) {
                            handleEnemyDeath(dog.target);
                            dog.target = null;
                            dog.state = 'returning';
                        } else {
                            const angleToTarget = Math.atan2(dy, dx);
                            dog.x += Math.cos(angleToTarget) * DOG_SPEED;
                            dog.y += Math.sin(angleToTarget) * DOG_SPEED;
                        }
                    } else { dog.state = 'returning'; }
                }
                if (magneticProjectileActive && dog.target && now - dog.lastHomingShotTime > DOG_HOMING_SHOT_INTERVAL) {
                    const angleToTarget = Math.atan2(dog.target.y - dog.y, dog.target.x - dog.x);
                    const shot = {
                        x: dog.x, y: dog.y, size: 15, speed: 5.04,
                        dx: Math.cos(angleToTarget) * 5.04, dy: Math.sin(angleToTarget) * 5.04,
                        angle: angleToTarget, isHit: false, lifetime: now + 2000, isHoming: true
                    };
                    dogHomingShots.push(shot); dog.lastHomingShotTime = now; playSound('playerShoot');
                }
            }

            for (let i = pickupItems.length - 1; i >= 0; i--) {
                const item = pickupItems[i];
                const dx = player.x - item.x;
                const dy = player.y - item.y;
                const distanceSq = dx*dx + dy*dy;
                
                if (distanceSq < player.magnetRadius*player.magnetRadius) {
                    const angle = Math.atan2(dy, dx);
                    item.x += Math.cos(angle) * MAGNET_STRENGTH;
                    item.y += Math.sin(angle) * MAGNET_STRENGTH;
                }
                
                let collected = distanceSq < ((player.size / 2) + (item.size / 2))**2;
                if (!collected && player2 && player2.active) {
                    const dx2 = player2.x - item.x;
                    const dy2 = player2.y - item.y;
                    collected = (dx2*dx2 + dy2*dy2) < ((player2.size / 2) + (item.size / 2))**2;
                }

                if (collected) {
                    if (item.type === 'box') {
                        vibrate(20);
                        player.boxPickupsCollectedCount++;
                        playerStats.totalBoxesOpened++;
                        const powerUpChoices = [];
                        let powerupName = ""; 
                        if (vShapeProjectileLevel < 4 && !shotgunBlastActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.v_shape_projectile);
                        if (!magneticProjectileActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.magnetic_projectile);
                        if (!iceProjectileActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.ice_projectile);
                        if (!ricochetActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.ricochet);
                        if (!explosiveBulletsActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.explosive_bullets);
                        if (!puddleTrailActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.puddle_trail);
                        if (!player.swordActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.sword);
                        if (!laserPointerActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.laser_pointer);
                        if (!autoAimActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.auto_aim);
                        if (!dualGunActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.dual_gun);
                        if (!bombEmitterActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.bomb);
                        if (!orbitingPowerUpActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.orbiter);
                        if (!lightningProjectileActive) powerUpChoices.push(ALWAYS_AVAILABLE_PICKUPS.lightning_projectile);
                        if (!bugSwarmActive) powerUpChoices.push({id: 'bug_swarm', name: 'Bug Swarm'});
                        if (!lightningStrikeActive) powerUpChoices.push({id: 'lightning_strike', name: 'Lightning Strike'});
                        if (!hasDashInvincibility) powerUpChoices.push({id: 'dash_invincibility', name: 'Dash Invincibility'});
                        if (!playerData.hasReducedDashCooldown) powerUpChoices.push({id: 'dash_cooldown', name: 'Dash Cooldown'});

                        const unlocked = playerData.unlockedPickups;
                        if (unlocked.doppelganger && !doppelgangerActive) powerUpChoices.push({id: 'doppelganger', name: 'Doppelganger'});
                        if (unlocked.temporal_ward && !temporalWardActive) powerUpChoices.push({id: 'temporal_ward', name: 'Temporal Ward'});
                        if (unlocked.circle && !damagingCircleActive) powerUpChoices.push({id:'circle', name: 'Damaging Circle'});
                        if (unlocked.vengeance_nova && !vengeanceNovaActive) powerUpChoices.push({id: 'vengeance_nova', name: 'Vengeance Nova'});
                        if (unlocked.dog_companion && !dogCompanionActive) powerUpChoices.push({id: 'dog_companion', name: 'Dog Companion'});
                        if (unlocked.anti_gravity && !antiGravityActive) powerUpChoices.push({id: 'anti_gravity', name: 'Anti-Gravity'});
                        if (unlocked.rocket_launcher && !rocketLauncherActive && !shotgunBlastActive) powerUpChoices.push({id: 'rocket_launcher', name: 'Heavy Shells'});
                        if (unlocked.black_hole && !blackHoleActive) powerUpChoices.push({id: 'black_hole', name: 'Black Hole'});
                        if (unlocked.flaming_bullets && !flamingBulletsActive) powerUpChoices.push({id: 'flaming_bullets', name: 'Flaming Bullets'});
                        if (unlocked.night_owl && !nightOwlActive) powerUpChoices.push({id: 'night_owl', name: 'Night Owl'});
                        if (unlocked.whirlwind_axe && !whirlwindAxeActive) powerUpChoices.push({id: 'whirlwind_axe', name: 'Whirlwind Axe'});

                        if (powerUpChoices.length > 0) {
                            const randomChoice = powerUpChoices[Math.floor(Math.random() * powerUpChoices.length)];
                            powerupName = randomChoice.name; 
                            activatePowerup(randomChoice.id);
                            
                            playSound('boxPickup');
                            floatingTexts.push({ text: powerupName + "!", x: player.x, y: player.y - player.size, startTime: now, duration: 1500 });
                            updatePowerupIconsUI(); 
                        }
                        pickupItems.splice(i, 1);
                        continue;
                    }
                    player.xp += item.xpValue * (cheats.xp_boost ? 2 : 1);
                    runStats.xpCollectedThisRun += item.xpValue;
                    score += item.xpValue * 7;
                    vibrate(10);
                    pickupItems.splice(i, 1);
                    playSound('xpPickup');
                    if (player.xp >= player.xpToNextLevel) levelUp();
                }
            }
            for (let i = appleItems.length - 1; i >= 0; i--) {
                const apple = appleItems[i];
                if (now - apple.spawnTime > apple.lifetime) { appleItems.splice(i, 1); continue; }
                const dx = player.x - apple.x;
                const dy = player.y - apple.y;
                const distanceSq = dx*dx + dy*dy;

                if (distanceSq < player.magnetRadius*player.magnetRadius) {
                    const angle = Math.atan2(dy, dx);
                    apple.x += Math.cos(angle) * MAGNET_STRENGTH; 
                    apple.y += Math.sin(angle) * MAGNET_STRENGTH; 
                }

                let collected = distanceSq < ((player.size / 2) + (apple.size / 2))**2;
                if (!collected && player2 && player2.active) {
                    const dx2 = player2.x - apple.x;
                    const dy2 = player2.y - apple.y;
                    collected = (dx2*dx2 + dy2*dy2) < ((player2.size / 2) + (apple.size / 2))**2;
                }
                
                if (collected) {
                    vibrate(20);
                    player.appleCount++;
                    runStats.applesEatenThisRun++;
                    playerStats.totalApplesEaten++;
                    if (player.appleCount >= 5) {
                        player.maxLives++;
                        player.appleCount = 0;
                        vibrate(50);
                        playSound('levelUpSelect');
                        floatingTexts.push({ text: "Max Life +1!", x: player.x, y: player.y - player.size, startTime: now, duration: 1500 });
                    }
                    player.lives = player.maxLives;
                    fireRateBoostActive = true;
                    fireRateBoostEndTime = now + FIRE_RATE_BOOST_DURATION;
                    playSound('xpPickup');
                    updateUIStats();
                    appleItems.splice(i, 1);
                }
            }
            let currentFireInterval = weaponFireInterval;
if(fireRateBoostActive) currentFireInterval /= 2;
if(cheats.fastShooting) currentFireInterval /= 5;
if(cheats.double_game_speed) currentFireInterval /= 2;
currentFireInterval = Math.max(50, currentFireInterval);
if (!cheats.no_gun_mode && (aimDx !== 0 || aimDy !== 0) && (now - lastWeaponFireTime > currentFireInterval)) {
    createWeapon();
    lastWeaponFireTime = now;
}

            for(const weapon of weaponPool) {
                if(!weapon.active) continue;

                if (magneticProjectileActive && enemies.length > 0) {
                    let closestEnemy = null, minDistanceSq = Infinity;
                    enemies.forEach(enemy => {
                        if (enemy.isHit || (enemy.isFrozen && now < enemy.freezeEndTime)) return;
                        const distSq = (weapon.x - enemy.x)**2 + (weapon.y - enemy.y)**2;
                        if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                    });
                    if (closestEnemy) {
                        const targetAngle = Math.atan2(closestEnemy.y - weapon.y, closestEnemy.x - weapon.x);
                        let angleDiff = targetAngle - weapon.angle;
                        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                        weapon.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.02);
                        weapon.dx = Math.cos(weapon.angle) * weapon.speed;
                        weapon.dy = Math.sin(weapon.angle) * weapon.speed;
                    }
                }
                weapon.x += weapon.dx;
                weapon.y += weapon.dy;
                if (now > weapon.lifetime) weapon.active = false;
            }

            for (const weapon of weaponPool) {
                if(!weapon.active) continue;
                for (let j = destructibles.length - 1; j >= 0; j--) {
                    const obs = destructibles[j];
                    const dx = weapon.x - obs.x;
                    const dy = weapon.y - obs.y;
                    if (dx*dx + dy*dy < ((weapon.size / 2) + (obs.size / 2))**2) {
                        weapon.active = false;
                        if(obs.health !== Infinity) obs.health--;
                        if (obs.health <= 0) {
                            handleBarrelDestruction(obs);
                            destructibles.splice(j, 1);
                        }
                        break; 
                    }
                }
            }


            for (const weapon of weaponPool) {
    if (!weapon.active) continue;

    // Define the weapon's bounding box to search the quadtree
    const weaponBounds = {
        x: weapon.x - weapon.size / 2,
        y: weapon.y - weapon.size / 2,
        width: weapon.size,
        height: weapon.size
    };
    
    // Ask the quadtree for a small list of only the objects near the weapon
    const nearbyObjects = quadtree.retrieve(weaponBounds);

    // Now, only loop through this much smaller list of potential targets
    for (const targetObject of nearbyObjects) {
        const enemy = targetObject.ref; // Get the original enemy object using our reference

        // Make sure the object is a valid, hittable enemy
        if (!enemy || !enemy.health || enemy.isHit) {
            continue;
        }

        const canGhostBeHit = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);

        if (canGhostBeHit && !weapon.hitEnemies.includes(enemy)) {
            const dx = weapon.x - enemy.x;
            const dy = weapon.y - enemy.y;
            const combinedRadius = (weapon.size / 2) + (enemy.size / 2);

            // This is the same distance check as before
            if (dx * dx + dy * dy < combinedRadius * combinedRadius) {
                
                // --- ALL YOUR ORIGINAL COLLISION LOGIC IS COPIED HERE ---
                let damageToDeal = player.damageMultiplier;
                if (rocketLauncherActive) { damageToDeal *= 2; }
                if (cheats.one_hit_kill) damageToDeal = Infinity;

                enemy.health -= damageToDeal;
                createBloodSplatter(enemy.x, enemy.y);
                weapon.hitEnemies.push(enemy);

                if (explosiveBulletsActive) {
                    const explosionId = Math.random();
                    explosions.push({
                        x: weapon.x, y: weapon.y, radius: enemy.size * 2,
                        startTime: Date.now(), duration: 300
                    });
                    // This part can also be optimized later, but let's leave it for now
                    enemies.forEach(otherEnemy => { 
                        if (otherEnemy !== enemy && !otherEnemy.isHit) {
                            const distSq = (otherEnemy.x - weapon.x)**2 + (otherEnemy.y - weapon.y)**2;
                            if (distSq < (enemy.size * 2)**2 + (otherEnemy.size / 2)**2) {
                                otherEnemy.health -= player.damageMultiplier;
                                if(cheats.instaKill) otherEnemy.health = 0;
                                createBloodSplatter(otherEnemy.x, otherEnemy.y);
                                if (otherEnemy.health <= 0) { handleEnemyDeath(otherEnemy, explosionId); }
                            }
                        }
                    });
                }

                if (player.knockbackStrength > 0 && !enemy.isBoss) {
                    const knockbackDistance = 50 * player.knockbackStrength;
                    const normDx = weapon.dx / weapon.speed;
                    const normDy = weapon.dy / weapon.speed;
                    enemy.x += normDx * knockbackDistance;
                    enemy.y += normDy * knockbackDistance;
                }
                if (iceProjectileActive) { 
                    enemy.isFrozen = true; 
                    enemy.freezeEndTime = Date.now() + 250;
                    playerStats.totalEnemiesFrozen++;
                }
                if (flamingBulletsActive) {
                    enemy.isIgnited = true;
                    enemy.ignitionEndTime = Date.now() + 6000;
                    enemy.lastIgnitionDamageTime = Date.now();
                }
                if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                weapon.hitsLeft--;
                if (weapon.hitsLeft > 0 && ricochetActive && !rocketLauncherActive) {
                    let newTarget = null; let minDistanceSq = Infinity;
                    enemies.forEach(otherEnemy => {
                        if (!weapon.hitEnemies.includes(otherEnemy) && !otherEnemy.isHit) {
                            const distSq = (weapon.x - otherEnemy.x)**2 + (weapon.y - otherEnemy.y)**2;
                            if (distSq < minDistanceSq) { minDistanceSq = distSq; newTarget = otherEnemy; }
                        }
                    });
                    if (newTarget) {
                        if (explosiveBulletsActive) { explosions.push({ x: weapon.x, y: weapon.y, radius: enemy.size * 2, startTime: Date.now(), duration: 300 }); }
                        const angle = Math.atan2(newTarget.y - weapon.y, newTarget.x - weapon.x);
                        weapon.angle = angle;
                        weapon.dx = Math.cos(angle) * weapon.speed;
                        weapon.dy = Math.sin(angle) * weapon.speed;
                    } else { weapon.active = false; }
                } else { weapon.active = false; }

                // Break from the inner loop if the weapon is gone
                if (!weapon.active) {
                    break;
                }
            }
        }
    }
}
            if (bombEmitterActive && now - lastBombEmitMs >= BOMB_INTERVAL_MS) {
                bombs.push({ x: player.x, y: player.y, size: BOMB_SIZE, spawnTime: now });
                lastBombEmitMs = now;
            }
            for (let b = bombs.length - 1; b >= 0; b--) {
                const bomb = bombs[b];
                if (now - bomb.spawnTime > BOMB_LIFETIME_MS) { bombs.splice(b, 1); continue; }
                for (let e = enemies.length - 1; e >= 0; e--) {
                    const enemy = enemies[e];
                    const dx = enemy.x - bomb.x;
                    const dy = enemy.y - bomb.y;
                    if (dx*dx + dy*dy < ((enemy.size / 2) + (bomb.size / 2))**2) {
                        explosions.push({
                            x: bomb.x, y: bomb.y, radius: bomb.size * 2,
                            startTime: now, duration: 300
                        });
                        handleEnemyDeath(enemy);
                        playBombExplosionSound();
                        bombs.splice(b, 1);
                        break;
                    }
                }
            }
            if (orbitingPowerUpActive) {
                player.orbitAngle = (player.orbitAngle + ORBIT_SPEED) % (Math.PI * 2);
                const orbitX = player.x + ORBIT_RADIUS * Math.cos(player.orbitAngle);
                const orbitY = player.y + ORBIT_RADIUS * Math.sin(player.orbitAngle);
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    const dx = orbitX - enemy.x;
                    const dy = orbitY - enemy.y;
                    if (dx*dx + dy*dy < ((ORBIT_POWER_UP_SIZE / 2) + (enemy.size / 2))**2) {
                        if (!enemy.isHit && !enemy.isHitByOrbiter) {
                            enemy.health -= player.damageMultiplier;
                            createBloodSplatter(enemy.x, enemy.y);
                            enemy.isHitByOrbiter = true;
                            if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                        }
                    } else { enemy.isHitByOrbiter = false; }
                }
                for (let i = eyeProjectiles.length - 1; i >= 0; i--) {
                    const eyeProj = eyeProjectiles[i];
                    const dx = orbitX - eyeProj.x;
                    const dy = orbitY - eyeProj.y;
                    if (!eyeProj.isHit && (dx*dx + dy*dy) < ((ORBIT_POWER_UP_SIZE / 2) + (eyeProj.size / 2))**2) {
                        eyeProj.isHit = true; 
                    }
                }
            }
             if (whirlwindAxeActive) {
                whirlwindAxeAngle -= WHIRLWIND_AXE_SPEED;
                const axeX = player.x + WHIRLWIND_AXE_RADIUS * Math.cos(whirlwindAxeAngle);
                const axeY = player.y + WHIRLWIND_AXE_RADIUS * Math.sin(whirlwindAxeAngle);
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    const dx = axeX - enemy.x;
                    const dy = axeY - enemy.y;
                    if (dx*dx + dy*dy < ((WHIRLWIND_AXE_SIZE / 2) + (enemy.size / 2))**2) {
                        if (!enemy.isHit && !enemy.isHitByAxe) { 
                            enemy.health -= 1;
                            createBloodSplatter(enemy.x, enemy.y);
                            enemy.isHitByAxe = true;
                            if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                        }
                    } else { enemy.isHitByAxe = false; }
                }
            }
            if (damagingCircleActive && now - lastDamagingCircleDamageTime > DAMAGING_CIRCLE_DAMAGE_INTERVAL) {
                const radiusSq = (DAMAGING_CIRCLE_RADIUS)**2;
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    const dx = player.x - enemy.x;
                    const dy = player.y - enemy.y;
                    if (!enemy.isHit && (dx*dx + dy*dy) < radiusSq + (enemy.size / 2)**2) {
                        if (!enemy.isHitByCircle) {
                            enemy.health -= player.damageMultiplier; 
                            createBloodSplatter(enemy.x, enemy.y);
                            enemy.isHitByCircle = true;
                            if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                        }
                    } else { enemy.isHitByCircle = false; }
                }
                lastDamagingCircleDamageTime = now;
            }
            if (lightningProjectileActive && now - lastLightningSpawnTime > LIGHTNING_SPAWN_INTERVAL) {
                let closestEnemy = null, minDistanceSq = Infinity;
                enemies.forEach(enemy => {
                    if (enemy.isHit || (enemy.isFrozen && now < enemy.freezeEndTime)) return;
                    const distSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
                    if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                });
                if (closestEnemy) {
                    const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
                    lightningBolts.push({ x: player.x, y: player.y, size: LIGHTNING_SIZE, emoji: LIGHTNING_EMOJI, speed: 5.6, dx: Math.cos(angle) * 5.6, dy: Math.sin(angle) * 5.6, angle: angle, isHit: false, lifetime: now + 2000 });
                    playSound('playerShoot');
                }
                lastLightningSpawnTime = now;
            }
                
for (let i = lightningBolts.length - 1; i >= 0; i--) {
                const bolt = lightningBolts[i];
                bolt.x += bolt.dx; bolt.y += bolt.dy;
                if (now > bolt.lifetime) bolt.isHit = true;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    const dx = bolt.x - enemy.x;
                    const dy = bolt.y - enemy.y;
                    if (!enemy.isHit && !bolt.isHit && (dx*dx + dy*dy) < ((bolt.size / 2) + (enemy.size / 2))**2) {
                        enemy.health -= player.damageMultiplier; bolt.isHit = true; 
                        createBloodSplatter(enemy.x, enemy.y);
                        if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                        break;
                    }
                }
            }
            lightningBolts = lightningBolts.filter(bolt => !bolt.isHit);
            if (player.swordActive && now - player.lastSwordSwingTime > SWORD_SWING_INTERVAL) {
                let swordAngle;
                if (aimDx !== 0 || aimDy !== 0) swordAngle = Math.atan2(aimDy, aimDx);
                else {
                    let closestEnemy = null, minDistanceSq = Infinity;
                    enemies.forEach(enemy => {
                        if (enemy.isHit || (enemy.isFrozen && now < enemy.freezeEndTime)) return;
                        const distSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
                        if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                    });
                    swordAngle = closestEnemy ? Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x) : -Math.PI / 2;
                }
                player.currentSwordSwing = { x: player.x, y: player.y, angle: swordAngle, activeUntil: now + SWORD_SWING_DURATION, startTime: now };
                playSwordSwingSound();
                const swordAttackRadiusSq = (player.size + SWORD_THRUST_DISTANCE)**2;
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    const dx = player.x - enemy.x;
                    const dy = player.y - enemy.y;
                    if ((dx*dx + dy*dy) < swordAttackRadiusSq + (enemy.size / 2)**2 && !enemy.isHit) {
                        enemy.health -= player.damageMultiplier; 
                        createBloodSplatter(enemy.x, enemy.y);
                        if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                    }
                }
                player.lastSwordSwingTime = now;
            }
            if (player.currentSwordSwing && now > player.currentSwordSwing.activeUntil) player.currentSwordSwing = null;
            for (let i = eyeProjectiles.length - 1; i >= 0; i--) {
                const eyeProj = eyeProjectiles[i];
                eyeProj.x += eyeProj.dx; eyeProj.y += eyeProj.dy;
                if (now > eyeProj.lifetime) eyeProj.isHit = true;
                const dx = player.x - eyeProj.x;
                const dy = player.y - eyeProj.y;
                if (!player.isInvincible && (dx*dx + dy*dy) < ((player.size / 2) + (eyeProj.size / 2))**2 && !eyeProj.isHit) {
                    player.lives--; 
                    runStats.lastDamageTime = now;
                    createBloodSplatter(player.x, player.y); createBloodPuddle(player.x, player.y, player.size);
                    playSound('playerScream'); playEyeProjectileHitSound(); 
                    updateUIStats(); eyeProj.isHit = true;
                    isPlayerHitShaking = true; playerHitShakeStartTime = now;
                    if (player.lives <= 0) endGame();
                }
            }
            if (puddleTrailActive && now - lastPlayerPuddleSpawnTime > PLAYER_PUDDLE_SPAWN_INTERVAL) {
                playerPuddles.push({ x: player.x, y: player.y, size: PLAYER_PUDDLE_SIZE, spawnTime: now, lifetime: PLAYER_PUDDLE_LIFETIME });
                lastPlayerPuddleSpawnTime = now;
            }
            if (antiGravityActive && !isTimeStopped && now - lastAntiGravityPushTime > ANTI_GRAVITY_INTERVAL) {
                antiGravityPulses.push({ x: player.x, y: player.y, spawnTime: now, duration: 500 });
                enemies.forEach(enemy => {
                    if (!enemy.isBoss) {
                        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                        if (dist < ANTI_GRAVITY_RADIUS && dist > 0) {
                            const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                            enemy.x += Math.cos(angle) * ANTI_GRAVITY_STRENGTH;
                            enemy.y += Math.sin(angle) * ANTI_GRAVITY_STRENGTH;
                        }
                    }
                });
                lastAntiGravityPushTime = now;
            }
            
            if (blackHoleActive && !isTimeStopped && now - lastBlackHoleTime > BLACK_HOLE_INTERVAL) {
                blackHoles.push({
                    x: player.x, y: player.y, spawnTime: now, lifetime: BLACK_HOLE_DELAY + BLACK_HOLE_PULL_DURATION,
                    radius: BLACK_HOLE_RADIUS, pullStrength: BLACK_HOLE_PULL_STRENGTH
                });
                lastBlackHoleTime = now;
            }

            for (let i = blackHoles.length - 1; i >= 0; i--) {
                const hole = blackHoles[i];
                if (now - hole.spawnTime > hole.lifetime) { blackHoles.splice(i, 1); continue; }
                if (now - hole.spawnTime > BLACK_HOLE_DELAY) {
                    enemies.forEach(enemy => {
                        if (!enemy.isBoss) {
                            const dist = Math.hypot(enemy.x - hole.x, enemy.y - hole.y);
                            if (dist < hole.radius && dist > 0) {
                                const angle = Math.atan2(hole.y - enemy.y, hole.x - enemy.x);
                                const pullForce = hole.pullStrength * (1 - dist / hole.radius);
                                enemy.x += Math.cos(angle) * pullForce;
                                enemy.y += Math.sin(angle) * pullForce;
                            }
                        }
                    });
                }
            }

            for (let i = playerPuddles.length - 1; i >= 0; i--) { if (now - playerPuddles[i].spawnTime > playerPuddles[i].lifetime) playerPuddles.splice(i, 1); }
            for (let i = snailPuddles.length - 1; i >= 0; i--) { if (now - snailPuddles[i].spawnTime > snailPuddles[i].lifetime) snailPuddles.splice(i, 1); }
            for (let i = mosquitoPuddles.length - 1; i >= 0; i--) { if (now - mosquitoPuddles[i].spawnTime > mosquitoPuddles[i].lifetime) mosquitoPuddles.splice(i, 1); }
            for (let i = bloodSplatters.length - 1; i >= 0; i--) {
                const p = bloodSplatters[i];
                if (now - p.spawnTime > p.lifetime) { bloodSplatters.splice(i, 1); continue; }
                p.x += p.dx; p.y += p.dy; p.dx *= 0.96; p.dy *= 0.96; 
            }
            for (let i = bloodPuddles.length - 1; i >= 0; i--) { if (now - bloodPuddles[i].spawnTime > bloodPuddles[i].lifetime) { bloodPuddles.splice(i, 1); } }

            dogHomingShots.forEach(shot => {
                if (shot.isHoming && enemies.length > 0) {
                    let closestEnemy = null, minDistanceSq = Infinity;
                    enemies.forEach(enemy => {
                        if (enemy.isHit) return;
                        const distSq = (shot.x - enemy.x)**2 + (shot.y - enemy.y)**2;
                        if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                    });
                    if (closestEnemy) {
                        const targetAngle = Math.atan2(closestEnemy.y - shot.y, closestEnemy.x - shot.x);
                        let angleDiff = targetAngle - shot.angle;
                        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                        shot.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.04);
                        shot.dx = Math.cos(shot.angle) * shot.speed;
                        shot.dy = Math.sin(shot.angle) * shot.speed;
                    }
                }
                shot.x += shot.dx; shot.y += shot.dy;
                if (now > shot.lifetime) shot.isHit = true;
            });

            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                if (!enemy.isHit) {
                    for (let j = dogHomingShots.length - 1; j >= 0; j--) {
                        const shot = dogHomingShots[j];
                        const dx = shot.x - enemy.x;
                        const dy = shot.y - enemy.y;
                        if (!shot.isHit && (dx*dx + dy*dy) < ((shot.size / 2) + (enemy.size / 2))**2) {
                            enemy.health -= 1;
                            createBloodSplatter(enemy.x, enemy.y);
                            if (enemy.health <= 0) handleEnemyDeath(enemy);
                            shot.isHit = true;
                        }
                    }
                }
            }

            for (let i = flameAreas.length - 1; i >= 0; i--) {
                const area = flameAreas[i];
                if (now > area.endTime) { flameAreas.splice(i, 1); continue; }
                enemies.forEach(enemy => {
                    const dx = enemy.x - area.x;
                    const dy = enemy.y - area.y;
                    if (!enemy.isHit && (dx*dx + dy*dy) < area.radius*area.radius) {
                        if (!enemy.isIgnited || now > enemy.ignitionEndTime) {
                            enemy.isIgnited = true;
                            enemy.ignitionEndTime = now + 6000;
                            enemy.lastIgnitionDamageTime = now;
                        }
                    }
                });
            }

             for (let i = flies.length - 1; i >= 0; i--) {
                const fly = flies[i];
                if (fly.isHit || enemies.length === 0) { flies.splice(i, 1); continue; }
                let closestEnemy = null, minDistanceSq = Infinity;
                enemies.forEach(enemy => {
                    if (!enemy.isHit) {
                        const distSq = (fly.x - enemy.x)**2 + (fly.y - enemy.y)**2;
                        if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                    }
                });
                fly.target = closestEnemy;
                if (fly.target) {
                    const angle = Math.atan2(fly.target.y - fly.y, fly.target.x - fly.x);
                    fly.x += Math.cos(angle) * FLY_SPEED;
                    fly.y += Math.sin(angle) * FLY_SPEED;
                    const dx = fly.x - fly.target.x;
                    const dy = fly.y - fly.target.y;
                    if ((dx*dx + dy*dy) < ((FLY_SIZE / 2) + (fly.target.size / 2))**2) {
                        fly.target.health -= FLY_DAMAGE;
                        createBloodSplatter(fly.target.x, fly.target.y);
                        if (fly.target.health <= 0) { handleEnemyDeath(fly.target); }
                        fly.isHit = true;
                    }
                }
            }
            for (let i = owlProjectiles.length - 1; i >= 0; i--) {
                const proj = owlProjectiles[i];
                proj.x += proj.dx; proj.y += proj.dy;
                if (now > proj.lifetime) proj.isHit = true;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    const dx = proj.x - enemy.x;
                    const dy = proj.y - enemy.y;
                    if (!enemy.isHit && !proj.isHit && (dx*dx + dy*dy) < ((proj.size / 2) + (enemy.size / 2))**2) {
                        enemy.health -= player.damageMultiplier;
                        proj.isHit = true;
                        createBloodSplatter(enemy.x, enemy.y);
                        if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                        break;
                    }
                }
            }
             for (let i = smokeParticles.length - 1; i >= 0; i--) {
                const p = smokeParticles[i];
                p.x += p.dx;
                p.y += p.dy;
                p.alpha -= 0.02;
                if (p.alpha <= 0) {
                    smokeParticles.splice(i, 1);
                }
            }


            antiGravityPulses = antiGravityPulses.filter(p => now - p.spawnTime < p.duration);
            explosions = explosions.filter(exp => now - exp.startTime < exp.duration);
            vengeanceNovas.forEach(nova => {
                const age = now - nova.startTime;
                if (age < nova.duration) {
                    const currentRadius = nova.maxRadius * (age / nova.duration);
                    for (let i = enemies.length - 1; i >= 0; i--) {
                        const enemy = enemies[i];
                        const dx = nova.x - enemy.x;
                        const dy = nova.y - enemy.y;
                        if (!enemy.isHit && (dx*dx + dy*dy) < currentRadius*currentRadius) {
                            handleEnemyDeath(enemy);
                        }
                    }
                }
            });
            vengeanceNovas = vengeanceNovas.filter(nova => now - nova.startTime < nova.duration);
            floatingTexts = floatingTexts.filter(ft => now - ft.startTime < ft.duration);
            enemies = enemies.filter(e => !e.isHit);
            eyeProjectiles = eyeProjectiles.filter(p => !p.isHit);
            dogHomingShots = dogHomingShots.filter(s => !s.isHit);
            owlProjectiles = owlProjectiles.filter(p => !p.isHit);
            lightningStrikes = lightningStrikes.filter(ls => now - ls.startTime < ls.duration);
        }

        function draw() {
            if (!gameActive) return;
            const now = Date.now();
            let currentHitShakeX = 0, currentHitShakeY = 0;
            if (isPlayerHitShaking) {
                const elapsedTime = now - playerHitShakeStartTime;
                if (elapsedTime < PLAYER_HIT_SHAKE_DURATION) {
                    const shakeIntensity = MAX_PLAYER_HIT_SHAKE_OFFSET * (1 - (elapsedTime / PLAYER_HIT_SHAKE_DURATION));
                    currentHitShakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
                    currentHitShakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
                } else isPlayerHitShaking = false;
            }

            let finalCameraOffsetX = cameraOffsetX - currentHitShakeX;
            let finalCameraOffsetY = cameraOffsetY - currentHitShakeY;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(cameraZoom, cameraZoom);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            
            ctx.save();
            ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
            if (backgroundImages.length > 0) ctx.drawImage(backgroundImages[currentBackgroundIndex], 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
            else { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); }
            ctx.restore();
            
            ctx.save();
            ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
            
            destructibles.forEach(obs => {
                if(obs.health !== Infinity) ctx.globalAlpha = 0.5 + (obs.health / obs.maxHealth) * 0.5;
                const preRendered = preRenderedEntities[obs.emoji];
                if(preRendered) {
                    ctx.drawImage(preRendered, obs.x - preRendered.width / 2, obs.y - preRendered.height / 2);
                }
                ctx.globalAlpha = 1.0;
            });

            flameAreas.forEach(area => {
                const age = now - area.startTime;
                const lifeRatio = age / (area.endTime - area.startTime);
                const alpha = 1 - lifeRatio;
                ctx.save();
                ctx.globalAlpha = alpha * 0.4;
                ctx.fillStyle = '#1a1a1a'; // Black puddle
                ctx.beginPath();
                ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha * 0.7;
                const flameCount = 2;
                for (let i = 0; i < flameCount; i++) {
                    const angle = (i / flameCount) * Math.PI * 2 + (now / 500);
                    const dist = Math.random() * area.radius * 0.8;
                    const flameX = area.x + Math.cos(angle) * dist;
                    const flameY = area.y + Math.sin(angle) * dist;
                    const flameSize = 10 + Math.random() * 5;
                    ctx.font = `${flameSize}px sans-serif`;
                    ctx.fillText('🔥', flameX, flameY);
                }
                ctx.restore();
            });

            bloodSplatters.forEach(p => {
                const age = now - p.spawnTime;
                const alpha = 1 - (age / p.lifetime);
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            if (damagingCircleActive) {
                damagingCircleAngle += DAMAGING_CIRCLE_SPIN_SPEED;
                const pulse = 1 + Math.sin(now / 300) * 0.1;
                const size = DAMAGING_CIRCLE_RADIUS * 2 * pulse;
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.translate(player.x, player.y);
                ctx.rotate(damagingCircleAngle);
                ctx.drawImage(sprites.circle, -size / 2, -size / 2, size, size);
                ctx.restore();
            }

            for (const puddle of playerPuddles) {
                const age = now - puddle.spawnTime;
                const opacity = 1 - (age / puddle.lifetime);
                if (opacity > 0) {
                    ctx.save();
                    ctx.globalAlpha = opacity * 0.7;
                    ctx.drawImage(sprites.slime, puddle.x - puddle.size / 2, puddle.y - puddle.size / 2, puddle.size, puddle.size);
                    ctx.restore();
                }
            }

            for (const puddle of mosquitoPuddles) {
                const age = now - puddle.spawnTime;
                const opacity = 1 - (age / puddle.lifetime);
                if (opacity > 0) {
                    ctx.save();
                    ctx.globalAlpha = opacity * 0.5;
                    ctx.fillStyle = 'rgba(255, 0, 0, 1)';
                    ctx.beginPath();
                    ctx.arc(puddle.x, puddle.y, puddle.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
            
            bloodPuddles.forEach(puddle => {
                const age = now - puddle.spawnTime;
                if (age < puddle.lifetime) {
                    const lifeRatio = age / puddle.lifetime;
                    const currentSize = puddle.initialSize * (1 - lifeRatio);
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    ctx.translate(puddle.x, puddle.y);
                    ctx.rotate(puddle.rotation);
                    ctx.drawImage(sprites.bloodPuddle, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
                    ctx.restore();
                }
            });

            antiGravityPulses.forEach(pulse => {
                const age = now - pulse.spawnTime;
                const lifeRatio = age / pulse.duration;
                const currentRadius = ANTI_GRAVITY_RADIUS * lifeRatio;
                const alpha = 1 - lifeRatio;
                ctx.save();
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(pulse.x, pulse.y, currentRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });

            blackHoles.forEach(hole => {
                const age = now - hole.spawnTime;
                const lifeRatio = age / hole.lifetime;
                const alpha = 1 - lifeRatio;
                ctx.save();
                const timeIntoDelay = now - hole.spawnTime;
                let currentRadius = hole.radius;
                let coreRadius = 20 * (1 - lifeRatio);
                if (timeIntoDelay < BLACK_HOLE_DELAY) {
                    const delayProgress = timeIntoDelay / BLACK_HOLE_DELAY;
                    currentRadius = hole.radius * delayProgress;
                    const pulse = 1 + Math.sin(now / 100) * 0.2;
                    coreRadius = 10 * pulse;
                    ctx.beginPath();
                    ctx.arc(hole.x, hole.y, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(150, 0, 200, ${alpha * 0.1 * delayProgress})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(200, 100, 255, ${alpha * 0.5 * delayProgress})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(hole.x, hole.y, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(50, 0, 100, ${alpha * 0.2})`;
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(hole.x, hole.y, coreRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.fill();
                ctx.restore();
            });
            
            smokeParticles.forEach(p => {
    ctx.save();
    // This is the correct way to apply the particle's alpha
    ctx.globalAlpha = p.alpha;
    
    // Draw the smoke particle
    ctx.font = `${p.size}px sans-serif`;
    ctx.fillText('💨', p.x, p.y);
    
    ctx.restore();
});

            enemies.forEach(enemy => {
                ctx.save();
                if (enemy.emoji === '👻') {
                    ctx.globalAlpha = enemy.isVisible ? 1.0 : 0.2;
                }
                if (enemy.isFrozen) ctx.filter = 'saturate(0.5) brightness(1.5) hue-rotate(180deg)';
                if (enemy.isSlowedByPuddle) ctx.filter = 'saturate(2) brightness(0.8)';
                
                const emojiToDraw = enemy.isBoss ? enemy.mimics : enemy.emoji;
                const preRenderedImage = preRenderedEntities[emojiToDraw];
                if(preRenderedImage) {
                    ctx.drawImage(preRenderedImage, enemy.x - preRenderedImage.width / 2, enemy.y - preRenderedImage.height / 2 + (enemy.bobOffset || 0));
                }

                if (enemy.isIgnited) {
                    if (Math.random() < 0.1) {
                        smokeParticles.push({ x: enemy.x + (Math.random() - 0.5) * enemy.size, y: enemy.y, dx: (Math.random() - 0.5) * 0.5, dy: -Math.random() * 1, size: 10 + Math.random() * 5, alpha: 0.7 });
                    }
                    ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.8);
                    ctx.font = `${enemy.size * 0.8}px sans-serif`;
                    ctx.fillText('🔥', enemy.x, enemy.y + (enemy.bobOffset || 0));
                }
                ctx.restore();
            });

            explosions.forEach(explosion => {
                const age = now - explosion.startTime;
                if (age < explosion.duration) {
                    const lifeRatio = age / explosion.duration;
                    const currentRadius = explosion.radius * lifeRatio;
                    const alpha = 1 - lifeRatio;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 165, 0, ${alpha * 0.7})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();
                }
            });

            vengeanceNovas.forEach(nova => {
                const age = now - nova.startTime;
                if (age < nova.duration) {
                    const lifeRatio = age / nova.duration;
                    const currentRadius = nova.maxRadius * lifeRatio;
                    const alpha = 1 - lifeRatio;
                    ctx.save();
                    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(nova.x, nova.y, currentRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            });

            for(const weapon of weaponPool) {
                if(!weapon.active) continue;
                ctx.save();
                ctx.translate(weapon.x, weapon.y);
                ctx.rotate(weapon.angle);
                if (flamingBulletsActive) ctx.filter = 'hue-rotate(30deg) saturate(5) brightness(1.5)';
                else if (magneticProjectileActive && iceProjectileActive) ctx.filter = 'hue-rotate(270deg) saturate(2)';
                else if (magneticProjectileActive) ctx.filter = 'hue-rotate(0deg) saturate(5) brightness(1.5)';
                else if (iceProjectileActive) ctx.filter = 'hue-rotate(180deg) saturate(2)';
                ctx.drawImage(sprites.bullet, -weapon.size / 2, -weapon.size / 2, weapon.size, weapon.size * 0.5);
                ctx.restore();
            }

            dogHomingShots.forEach(shot => {
                ctx.save();
                ctx.translate(shot.x, shot.y);
                ctx.rotate(shot.angle);
                ctx.filter = 'hue-rotate(0deg) saturate(5) brightness(1.5)';
                ctx.drawImage(sprites.bullet, -shot.size / 2, -shot.size / 2, shot.size, shot.size * 0.5);
                ctx.restore();
            });

            lightningBolts.forEach(bolt => {
                const preRendered = preRenderedEntities[bolt.emoji];
                if(preRendered) {
                    ctx.save();
                    ctx.translate(bolt.x, bolt.y);
                    ctx.rotate(bolt.angle + Math.PI / 2);
                    ctx.drawImage(preRendered, -preRendered.width/2, -preRendered.height/2);
                    ctx.restore();
                }
            });

            bombs.forEach(bomb => {
                const preRendered = preRenderedEntities['💣'];
                if(preRendered) ctx.drawImage(preRendered, bomb.x - preRendered.width/2, bomb.y - preRendered.height/2);
            });

            const drawGlimmer = (item) => {
                const glimmerDuration = 1000;
                const timeSinceStart = (now - item.glimmerStartTime) % 2000;
                if (timeSinceStart < glimmerDuration) {
                    const progress = timeSinceStart / glimmerDuration;
                    const alpha = Math.sin(progress * Math.PI);
                    const size = item.size * (1 + progress * 0.5);
                    ctx.save();
                    ctx.globalAlpha = alpha * 0.5;
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            };

            pickupItems.forEach(item => {
                drawGlimmer(item);
                if (item.type === 'box') { 
                    ctx.drawImage(sprites.pickupBox, item.x - item.size / 2, item.y - item.size / 2, item.size, item.size); 
                } else {
                    const preRendered = preRenderedEntities[item.type];
                    if(preRendered) ctx.drawImage(preRendered, item.x - preRendered.width/2, item.y - preRendered.height/2);
                }
            });
            
            appleItems.forEach(item => { 
                drawGlimmer(item);
                const preRendered = preRenderedEntities[APPLE_ITEM_EMOJI];
                if(preRendered) ctx.drawImage(preRendered, item.x - preRendered.width/2, item.y - preRendered.height/2);
            });
            eyeProjectiles.forEach(proj => { 
                const preRendered = preRenderedEntities[proj.emoji];
                if(preRendered) ctx.drawImage(preRendered, proj.x - preRendered.width/2, proj.y - preRendered.height/2);
            });
            
            merchants.forEach(m => {
    ctx.save();
    ctx.font = `${m.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧙‍♂️', m.x, m.y);
    ctx.restore();
});
            
            const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase) * BOB_AMPLITUDE;
            const spinDuration = 500; // 0.5 seconds

            const FOOT_SIZE = 8; const FOOT_OFFSET_X = 2; const FOOT_OFFSET_Y = 2;
            const STEP_LENGTH = 10; const stepOffset = Math.sin(player.stepPhase) * STEP_LENGTH;
            
            const isSpinning = player.spinStartTime && now < player.spinStartTime + spinDuration;
            if(!player.isDashing && !isSpinning){
                ctx.save();
                ctx.translate(player.x, player.y + bobOffset);
                ctx.rotate(player.rotationAngle - Math.PI / 2);
                ctx.fillStyle = '#322110';
                ctx.beginPath(); ctx.arc(-FOOT_OFFSET_X, FOOT_OFFSET_Y + stepOffset, FOOT_SIZE, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(FOOT_OFFSET_X, FOOT_OFFSET_Y - stepOffset, FOOT_SIZE, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            let playerSprite;
            switch (player.facing) {
                case 'up': playerSprite = sprites.playerUp; break;
                case 'down': playerSprite = sprites.playerDown; break;
                case 'left': playerSprite = sprites.playerLeft; break;
                case 'right': playerSprite = sprites.playerRight; break;
                default: playerSprite = sprites.playerDown;
            }
            
            ctx.save();
            ctx.translate(player.x, player.y + bobOffset);
            if (isSpinning) {
                const spinProgress = (now - player.spinStartTime) / spinDuration;
                const rotation = spinProgress * 2.1 * Math.PI * player.spinDirection;
                ctx.rotate(rotation);
            }
            ctx.drawImage(playerSprite, -player.size / 2, -player.size / 2, player.size, player.size);
            ctx.restore();


            // Dash Cooldown Bar
            const dashCharge = Math.min(1, (now - player.lastDashTime) / player.dashCooldown);
            if (dashCharge < 1) {
                const barWidth = player.size * 0.8;
                const barX = player.x - barWidth / 2;
                const barY = player.y + player.size / 2 + 4;
                ctx.fillStyle = '#444';
                ctx.fillRect(barX, barY, barWidth, 4);
                ctx.fillStyle = '#00FFFF';
                ctx.fillRect(barX, barY, barWidth * dashCharge, 4);
            }

            // Dash Invincibility Shield
            if (player.isInvincible) {
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#007BFF';
                ctx.beginPath();
                ctx.arc(player.x, player.y, player.size / 2 + 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }


            if (aimDx !== 0 || aimDy !== 0 || autoAimActive) {
                const aimAngle = player.rotationAngle;
                ctx.save();
                ctx.translate(player.x, player.y + bobOffset);
                ctx.rotate(aimAngle);
                if (aimAngle > Math.PI / 2 || aimAngle < -Math.PI / 2) { ctx.scale(1, -1); }
                const gunWidth = player.size * 0.8;
                const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
                const gunXOffset = player.size / 4;
                const gunYOffset = -gunHeight / 2;
                ctx.drawImage(sprites.gun, gunXOffset, gunYOffset, gunWidth, gunHeight);
                if (dualGunActive) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(sprites.gun, -gunXOffset, gunYOffset, gunWidth, gunHeight); ctx.restore(); }
                if (laserPointerActive) {
                    ctx.save(); ctx.beginPath();
                    const startX = gunXOffset + gunWidth * 0.9; const startY = gunYOffset + gunHeight / 2;
                    ctx.moveTo(startX, startY); 
                    const isMobile = document.body.classList.contains('is-mobile');
                    if (isMobile) { ctx.lineTo(1000, startY); } 
                    else {
                        const worldMouseX = mouseX / cameraZoom + finalCameraOffsetX; const worldMouseY = mouseY / cameraZoom + finalCameraOffsetY;
                        const rotatedMouseX = (worldMouseX - (player.x)) * Math.cos(-aimAngle) - (worldMouseY - (player.y + bobOffset)) * Math.sin(-aimAngle);
                        ctx.lineTo(rotatedMouseX, startY);
                    }
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'; ctx.lineWidth = 1; ctx.stroke();
                    ctx.restore();
                }
                ctx.restore();
            }
            
            if (doppelganger) {
                ctx.save();
                ctx.globalAlpha = 0.6; ctx.filter = 'hue-rotate(180deg)';
                ctx.drawImage(playerSprite, doppelganger.x - doppelganger.size / 2, doppelganger.y - doppelganger.size / 2, doppelganger.size, doppelganger.size);
                const gunWidth = doppelganger.size * 0.8; const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
                const gunXOffset = doppelganger.size / 4; const gunYOffset = -gunHeight / 2;
                ctx.translate(doppelganger.x, doppelganger.y); ctx.rotate(doppelganger.rotationAngle);
                if (doppelganger.rotationAngle > Math.PI / 2 || doppelganger.rotationAngle < -Math.PI / 2) { ctx.scale(1, -1); }
                ctx.drawImage(sprites.gun, gunXOffset, gunYOffset, gunWidth, gunHeight);
                ctx.restore();
            }

            if (orbitingPowerUpActive && sprites.spinninglight) {
                const orbitX = player.x + ORBIT_RADIUS * Math.cos(player.orbitAngle);
                const orbitY = player.y + ORBIT_RADIUS * Math.sin(player.orbitAngle);
                orbitingImageAngle -= 0.2;
                ctx.save();
                ctx.translate(orbitX, orbitY);
                ctx.rotate(orbitingImageAngle);
                ctx.drawImage(sprites.spinninglight, -ORBIT_POWER_UP_SIZE / 2, -ORBIT_POWER_UP_SIZE / 2, ORBIT_POWER_UP_SIZE, ORBIT_POWER_UP_SIZE);
                ctx.restore();
            }

            if (player.swordActive && player.currentSwordSwing) {
                const swingProgress = (now - player.currentSwordSwing.startTime) / SWORD_SWING_DURATION;
                let currentOffset = player.size / 2 + (swingProgress >= 0 && swingProgress <= 1 ? SWORD_THRUST_DISTANCE * Math.sin(swingProgress * Math.PI) : 0);
                ctx.save();
                ctx.translate(player.currentSwordSwing.x, player.currentSwordSwing.y);
                ctx.rotate(player.currentSwordSwing.angle);
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(currentOffset, -2, 20, 4);
                ctx.restore();
            }

            if (dogCompanionActive) {
                const preRendered = preRenderedEntities['🐶'];
                if(preRendered) ctx.drawImage(preRendered, dog.x - preRendered.width/2, dog.y - preRendered.height/2);
            }
            
            if (player2 && player2.active) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.beginPath(); ctx.arc(player2.x, player2.y, player2.size / 2, 0, Math.PI * 2); ctx.fill();
                let p2Sprite;
                switch (player2.facing) {
                    case 'up': p2Sprite = sprites.playerUp; break;
                    case 'down': p2Sprite = sprites.playerDown; break;
                    case 'left': p2Sprite = sprites.playerLeft; break;
                    case 'right': p2Sprite = sprites.playerRight; break;
                    default: p2Sprite = sprites.playerDown;
                }

                const isP2Spinning = player2.spinStartTime && now < player2.spinStartTime + spinDuration;
                
                ctx.save();
                ctx.translate(player2.x, player2.y);
                if(isP2Spinning) {
                    const spinProgress = (now - player2.spinStartTime) / spinDuration;
                    const rotation = spinProgress * 2 * Math.PI * player2.spinDirection;
                    ctx.rotate(rotation);
                }
                ctx.drawImage(p2Sprite, -player2.size / 2, -player2.size / 2, player2.size, player2.size);
                ctx.restore();
                
                ctx.save();
                ctx.translate(player2.x, player2.y);
                ctx.rotate(player2.gunAngle);
                if (player2.gunAngle > Math.PI / 2 || player2.gunAngle < -Math.PI / 2) { ctx.scale(1, -1); }
                const gunWidth = player2.size * 0.8; const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
                ctx.drawImage(sprites.gun, player2.size / 4, -gunHeight / 2, gunWidth, gunHeight);
                ctx.restore();
                 // P2 Dash Cooldown Bar
                const p2DashCharge = Math.min(1, (now - player2.lastDashTime) / player2.dashCooldown);
                if (p2DashCharge < 1) {
                    const barWidth = player2.size * 0.8;
                    const barX = player2.x - barWidth / 2;
                    const barY = player2.y + player2.size / 2 + 4;
                    ctx.fillStyle = '#444';
                    ctx.fillRect(barX, barY, barWidth, 4);
                    ctx.fillStyle = '#00FFFF';
                    ctx.fillRect(barX, barY, barWidth * p2DashCharge, 4);
                }
            }
            flies.forEach(fly => {
                const color = Math.floor(now / 100) % 2 === 0 ? 'red' : 'black';
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(fly.x, fly.y, FLY_SIZE / 2, 0, Math.PI * 2);
                ctx.fill();
            });
            if (nightOwlActive && owl) {
                const preRendered = preRenderedEntities['🦉'];
                if(preRendered) ctx.drawImage(preRendered, owl.x - preRendered.width/2, owl.y - preRendered.height/2);
                
                owlProjectiles.forEach(proj => {
                    ctx.save();
                    ctx.translate(proj.x, proj.y); ctx.rotate(proj.angle);
                    ctx.fillStyle = '#FFFACD';
                    ctx.beginPath(); ctx.arc(0, 0, proj.size / 2, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                });
            }
            if (whirlwindAxeActive) {
                const axeX = player.x + WHIRLWIND_AXE_RADIUS * Math.cos(whirlwindAxeAngle);
                const axeY = player.y + WHIRLWIND_AXE_RADIUS * Math.sin(whirlwindAxeAngle);
                ctx.save();
                ctx.translate(axeX, axeY);
                ctx.rotate(whirlwindAxeAngle + Math.PI / 2);
                const preRendered = preRenderedEntities['🪓'];
                if(preRendered) ctx.drawImage(preRendered, -preRendered.width/2, -preRendered.height/2);
                ctx.restore();
            }
            lightningStrikes.forEach(strike => {
                const age = now - strike.startTime;
                const lifeRatio = age / strike.duration;
                const alpha = Math.sin(lifeRatio * Math.PI);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = 'yellow';
                ctx.fillRect(strike.x - 5, 0, 10, WORLD_HEIGHT);
                ctx.font = `40px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('⚡', strike.x, strike.y);
                ctx.restore();
            });


            floatingTexts.forEach(ft => {
                const elapsed = now - ft.startTime;
                const alpha = 1.0 - (elapsed / ft.duration);
                const yOffset = (elapsed / ft.duration) * 20; 
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.font = 'bold 14px "Press Start 2P"';
                ctx.fillStyle = ft.color || '#FFFFFF';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.textAlign = 'center';
                ctx.strokeText(ft.text, ft.x, ft.y - yOffset);
                ctx.fillText(ft.text, ft.x, ft.y - yOffset);
                ctx.restore();
            });

            ctx.restore();
            ctx.restore();
            
            if (isTimeStopped) {
                const timeLeft = timeStopEndTime - now;
                const duration = 2000;
                let alpha = 0;
                if (timeLeft > duration - 250) { alpha = 1 - (timeLeft - (duration - 250)) / 250; } 
                else if (timeLeft < 500) { alpha = timeLeft / 500; } 
                else { alpha = 1; }
                alpha = Math.max(0, Math.min(alpha, 1)); 
                ctx.save();
                ctx.fillStyle = `rgba(0, 100, 255, ${alpha * 0.4})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

            if (isMouseInCanvas && gameActive && sprites.crosshair) {
                const reticleSize = 16;
                ctx.drawImage(sprites.crosshair, mouseX - reticleSize / 2, mouseY - reticleSize / 2, reticleSize, reticleSize);
            }
        }

        function gameLoop() {
            update();
            handleGamepadInput();
            draw();
            updateUIStats();
            if (!gameOver && gameActive) animationFrameId = requestAnimationFrame(gameLoop);
        }

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
            v_shape_projectile: { id:'v_shape_projectile', name: 'V-Shape Shots'}, magnetic_projectile: { id:'magnetic_projectile', name: 'Magnetic Shots'},
            ice_projectile: { id:'ice_projectile', name: 'Ice Projectiles'}, ricochet: { id:'ricochet', name: 'Ricochet Shots'},
            explosive_bullets: { id: 'explosive_bullets', name: 'Explosive Bullets'}, puddle_trail: { id:'puddle_trail', name: 'Slime Trail'},
            sword: { id:'sword', name: 'Auto-Sword'}, laser_pointer: { id: 'laser_pointer', name: 'Laser Pointer'},
            auto_aim: { id: 'auto_aim', name: 'Auto Aim'}, dual_gun: { id: 'dual_gun', name: 'Dual Gun'},
            bomb: { id:'bomb', name: 'Bomb Emitter'}, orbiter: { id:'orbiter', name: 'Spinning Orbiter'},
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

        function loadPlayerData() {
            try {
                const savedData = localStorage.getItem('emojiSurvivorData');
                if (savedData) {
                    playerData = JSON.parse(savedData);
                    for (const key in PERMANENT_UPGRADES) { if (!playerData.upgrades.hasOwnProperty(key)) { playerData.upgrades[key] = 0; } }
                    if (!playerData.unlockedPickups) { playerData.unlockedPickups = {}; }
                    for (const key in UNLOCKABLE_PICKUPS) { if (!playerData.unlockedPickups.hasOwnProperty(key)) { playerData.unlockedPickups[key] = false; } }
                } else { initializePlayerData(); }
            } catch (e) { console.error("Failed to load player data", e); initializePlayerData(); }
        }

        function initializePlayerData() {
            playerData = { currency: 0, upgrades: {}, unlockedPickups: {}, hasReducedDashCooldown: false };
            for (const key in PERMANENT_UPGRADES) { playerData.upgrades[key] = 0; }
            for (const key in UNLOCKABLE_PICKUPS) { playerData.unlockedPickups[key] = false; }
        }

        function savePlayerData() { try { localStorage.setItem('emojiSurvivorData', JSON.stringify(playerData)); } catch (e) { console.error("Failed to save player data.", e); } }
        function openUpgradeShop() { difficultyContainer.style.display = 'none'; upgradeShop.style.display = 'flex'; displayUpgrades(); }



        function displayUpgrades() {
            currencyDisplay.textContent = `Coins: ${playerData.currency} 🪙`;
            permanentUpgradesContainer.innerHTML = ''; unlockablePickupsContainer.innerHTML = '';
            for (const key in PERMANENT_UPGRADES) {
                const config = PERMANENT_UPGRADES[key];
                const currentLevel = playerData.upgrades[key] || 0;
                const cost = Math.floor(config.baseCost * Math.pow(config.costIncrease, currentLevel));
                const card = document.createElement('div'); card.className = 'permanent-upgrade-card';
                let buttonHTML = `<button onclick="buyUpgrade('${key}')">Buy (${cost} 🪙)</button>`;
                if (currentLevel >= config.maxLevel) { buttonHTML = `<button disabled>MAX</button>`; } 
                else if (playerData.currency < cost) { buttonHTML = `<button disabled>Buy (${cost} 🪙)</button>`; }
                card.innerHTML = `<h4>${config.icon} ${config.name}</h4><p>${config.desc}</p><div class="upgrade-level">Level: ${currentLevel} / ${config.maxLevel}</div>${buttonHTML}`;
                permanentUpgradesContainer.appendChild(card);
            }
            for (const key in UNLOCKABLE_PICKUPS) {
                const config = UNLOCKABLE_PICKUPS[key];
                const isUnlocked = playerData.unlockedPickups[key];
                const card = document.createElement('div'); card.className = 'permanent-upgrade-card';
                card.style.borderColor = isUnlocked ? '#FFD700' : '#F44336';
                let buttonHTML = `<button onclick="buyUnlockable('${key}')">Unlock (${config.cost} 🪙)</button>`;
                if (isUnlocked) { buttonHTML = `<button disabled>Unlocked</button>`; } 
                else if (playerData.currency < config.cost) { buttonHTML = `<button disabled>Unlock (${config.cost} 🪙)</button>`; }
                card.innerHTML = `<h4>${config.icon} ${config.name}</h4><p>${config.desc}</p>${buttonHTML}`;
                unlockablePickupsContainer.appendChild(card);
            }
        }

        function buyUpgrade(key) {
            const config = PERMANENT_UPGRADES[key];
            const currentLevel = playerData.upgrades[key] || 0;
            const cost = Math.floor(config.baseCost * Math.pow(config.costIncrease, currentLevel));
            if (playerData.currency >= cost && currentLevel < config.maxLevel) {
                playerData.currency -= cost; playerData.upgrades[key]++;
                savePlayerData(); displayUpgrades(); playUISound('levelUpSelect');
            }
        }
        
        function buyUnlockable(key) {
            const config = UNLOCKABLE_PICKUPS[key];
            const isUnlocked = playerData.unlockedPickups[key];
            if (playerData.currency >= config.cost && !isUnlocked) {
                playerData.currency -= config.cost; playerData.unlockedPickups[key] = true;
                savePlayerData(); displayUpgrades(); playUISound('levelUpSelect');
                checkAchievements(); 
            }
        }

        function applyPermanentUpgrades() {
            player.damageMultiplier = 1 + (playerData.upgrades.playerDamage || 0) * PERMANENT_UPGRADES.playerDamage.effect;
            player.speed = 1.4 * (1 + (playerData.upgrades.playerSpeed || 0) * PERMANENT_UPGRADES.playerSpeed.effect);
            baseEnemySpeed = 0.84 * (1 + (playerData.upgrades.enemyHealth || 0) * PERMANENT_UPGRADES.enemyHealth.effect);
            player.magnetRadius = (player.size * 2) * (1 + (playerData.upgrades.magnetRadius || 0) * PERMANENT_UPGRADES.magnetRadius.effect);
            const luckBonus = (playerData.upgrades.luck || 0) * PERMANENT_UPGRADES.luck.effect;
            boxDropChance = 0.01 + luckBonus; appleDropChance = 0.05 + luckBonus;
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
        
       function showMapSelectScreen() {
        
            difficultyContainer.style.display = 'none';
            mapSelectContainer.style.display = 'block';
            mapTilesContainer.innerHTML = '';

            const mapNames = [
                "Grass Map 1", 
                "Desert Map 1", 
                "Desert Map 2",
                "Lava Map 1",
                "Lava Map 2",
                "Desert Map 2",
                "Ice Map 1",
                "Grass Map 1",
                "Ice Map 2"
            ];
            
            backgroundPaths.forEach((path, index) => {
                const tile = document.createElement('div');
                tile.className = 'map-tile';
                tile.style.backgroundImage = `url('${backgroundImages[index].src}')`;
                tile.dataset.mapIndex = index;
                
                const label = document.createElement('p');
                
                label.textContent = mapNames[index] || `Map ${index + 1}`;
                
                tile.appendChild(label);
                
                tile.addEventListener('click', () => {
                    playUISound('uiClick');
                    vibrate(10);
                    selectedMapIndex = index;
                    startGame();
                });
                mapTilesContainer.appendChild(tile);
            });
        }

        
function showCharacterSelectScreen() {
            difficultyContainer.style.display = 'none';
            characterSelectContainer.style.display = 'block';
            characterTilesContainer.innerHTML = ''; // Clear previous tiles

            // Loop through each character in the CHARACTERS object
            Object.values(CHARACTERS).forEach(character => {
                let isUnlocked = false;

                // Determine if the character is unlocked
                if (character.unlockCondition.type === 'start') {
                    isUnlocked = true;
                } else if (character.unlockCondition.type === 'achievement') {
                    // Check if the required achievement has been unlocked in playerStats
                    if (ACHIEVEMENTS[character.unlockCondition.id] && ACHIEVEMENTS[character.unlockCondition.id].unlocked) {
                        isUnlocked = true;
                    }
                }

                const tile = document.createElement('div');
                tile.className = 'character-tile';
                if (!isUnlocked) {
                    tile.classList.add('locked');
                }
                 if (equippedCharacterID === character.id) {
                    tile.classList.add('selected');
                }

                // Create the content for the tile
                tile.innerHTML = `
                    <p class="char-emoji">${character.emoji}</p>
                    <h4 class="char-name">${character.name}</h4>
                    <p class="char-perk">${isUnlocked ? character.perk : 'LOCKED'}</p>
                `;

                // Add a click event listener only if the character is unlocked
                if (isUnlocked) {
                    tile.addEventListener('click', () => {
                        playUISound('levelUpSelect');
                        vibrate(10);
                        equippedCharacterID = character.id;
                        
                        // Go back to the main menu after selecting
                        characterSelectContainer.style.display = 'none';
                        difficultyContainer.style.display = 'block';
                    });
                }

                characterTilesContainer.appendChild(tile);
            });
        }
        window.onload = function() {
            if (isMobileDevice) { document.body.classList.add('is-mobile'); }
            
            loadPlayerData();
            loadPlayerStats();
            loadCheats();
            displayHighScores();

            resizeCanvas();
            gameContainer.style.display = 'none'; 
            difficultyContainer.style.display = 'none';
            mapSelectContainer.style.display = 'none'; 
            characterSelectContainer.style.display = 'none';
            movementStickBase.style.display = 'none';
            firestickBase.style.display = 'none'; 
            upgradeMenu.style.display = 'none';
            gameOverlay.style.display = 'none'; 
            gameGuideModal.style.display = 'none';
            achievementsModal.style.display = 'none'; 
            cheatsModal.style.display = 'none';
            pauseButton.style.display = 'none';

            startButton.addEventListener('click', () => {
                Tone.start().then(() => {
                    console.log("AudioContext started by user.");
                    showInitialScreen();
                });
            }, { once: true });
            
            [gameGuideModal, achievementsModal, cheatsModal, merchantShop].forEach(modal => {
                if(modal){
                    const content = modal.querySelector('.content-wrapper') || modal.querySelector('.merchant-options-container');
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) { 
                            if(modal.id === 'merchantShop') closeMerchantShop();
                            else modal.style.display = 'none';
                        }
                    });
                    if(content) {
                        content.addEventListener('click', (e) => e.stopPropagation());
                        content.addEventListener('touchstart', (e) => e.stopPropagation());
                    }
                }
            });

            difficultyButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    vibrate(10);
                    playUISound('uiClick');
                    currentDifficulty = e.target.dataset.difficulty;
                    if (playerData.unlockedPickups.map_select) {
                        showMapSelectScreen();
                    } else {
                        selectedMapIndex = -1;
                        startGame();
                    }
                });
                button.addEventListener('mouseover', () => playUISound('uiClick'));
            });
            if (howToPlayButton) {
                howToPlayButton.addEventListener('click', async () => { 
                    vibrate(10);
                    if (difficultyContainer) difficultyContainer.style.display = 'none';
                    if (gameGuideModal) gameGuideModal.style.display = 'flex';
                });
                howToPlayButton.addEventListener('mouseover', () => playUISound('uiClick'));
            }
            if (backToDifficultyButton) {
                backToDifficultyButton.addEventListener('click', () => {
                    vibrate(10);
                    if (gameGuideModal) gameGuideModal.style.display = 'none';
                    if (difficultyContainer) difficultyContainer.style.display = 'block';
                });
            }
            
            backToDifficultySelectButton.addEventListener('click', () => {
                vibrate(10); playUISound('uiClick');
                selectedMapIndex = -1;
                mapSelectContainer.style.display = 'none'; difficultyContainer.style.display = 'block';
            });
            
            characterSelectButton.addEventListener('click', () => {
                vibrate(10); playUISound('uiClick');
                showCharacterSelectScreen();
            });

             backToMenuFromCharsButton.addEventListener('click', () => {
                vibrate(10); playUISound('uiClick');
                characterSelectContainer.style.display = 'none';
                difficultyContainer.style.display = 'block';
            });


            const openShopAction = () => { vibrate(10); playUISound('uiClick'); openUpgradeShop(); };
            desktopUpgradesButton.addEventListener('click', openShopAction);
            if (mobileMenuUpgradesButton) mobileMenuUpgradesButton.addEventListener('click', openShopAction);


            backToMenuButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); showDifficultyScreen(); });
            
            const resetAction = () => { vibrate(20); resetAllData(); };
            desktopResetButton.addEventListener('click', resetAction);
            mobileResetButton.addEventListener('click', resetAction);
            
            const achievementsAction = () => {
                vibrate(10); playUISound('uiClick');
                difficultyContainer.style.display = 'none';
                displayAchievements();
                achievementsModal.style.display = 'flex';
            };
            desktopAchievementsButton.addEventListener('click', achievementsAction);
            if(mobileMenuTrophiesButton) mobileMenuTrophiesButton.addEventListener('click', achievementsAction);

            
            const cheatsAction = () => {
                vibrate(10); playUISound('uiClick');
                achievementsModal.style.display = 'none';
                displayCheats();
                cheatsModal.style.display = 'flex';
            };
            cheatsMenuButton.addEventListener('click', cheatsAction);
            if(mobileMenuCheatsButton) mobileMenuCheatsButton.addEventListener('click', cheatsAction);
            
            backToMenuFromAchievements.addEventListener('click', () => {
                vibrate(10); playUISound('uiClick');
                achievementsModal.style.display = 'none';
                difficultyContainer.style.display = 'block';
            });
             backToAchievementsButton.addEventListener('click', () => {
                vibrate(10); playUISound('uiClick');
                cheatsModal.style.display = 'none';
                displayAchievements();
                achievementsModal.style.display = 'flex';
            });

            if(pauseButton) {
                pauseButton.addEventListener('click', togglePause);
                pauseButton.addEventListener('touchstart', (e) => { e.preventDefault(); vibrate(10); togglePause(); });
            }

            if(resumeButton) {
                const resumeAction = (e) => { e.preventDefault(); vibrate(10); playUISound('uiClick'); togglePause(); };
                resumeButton.addEventListener('click', resumeAction);
                resumeButton.addEventListener('touchstart', resumeAction);
            }
            
            leaveMerchantButton.addEventListener('click', () => {
                vibrate(10);
                playUISound('uiClick');
                closeMerchantShop();
            });

            musicVolumeSlider.addEventListener('input', (e) => { if (currentBGMPlayer) { currentBGMPlayer.volume.value = e.target.value; } });
            effectsVolumeSlider.addEventListener('input', (e) => {
                const newVolume = parseFloat(e.target.value);
                for (const key in audioPlayers) { if (audioPlayers.hasOwnProperty(key)) { audioPlayers[key].volume.value = newVolume; } }
                swordSwingSynth.volume.value = newVolume; eyeProjectileHitSynth.volume.value = newVolume; bombExplosionSynth.volume.value = newVolume;
            });
            zoomToggle.addEventListener('change', (e) => { cameraZoom = e.target.checked ? 1.4 : 1.0; });
            pauseRestartButton.addEventListener('click', () => {
                playUISound('uiClick'); vibrate(10); togglePause(); endGame(); showDifficultyScreen();
            });
            
        };
