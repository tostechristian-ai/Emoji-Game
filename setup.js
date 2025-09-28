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
