
// A safe way to get a unique Tone.js time aaaa
        
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
                speed: 0, fireRate: 0, magnetRadius: 0, damage: 0, projectileSpeed: 0, knockback: 0, luck: 0, weaponSize: 0, dashCooldown: 0
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

        let iceShardCannonActive = false;
        let lastIceShardTime = 0;
        const ICE_SHARD_INTERVAL = 1800; // ms between shard bursts
        const ICE_SHARD_FREEZE_DURATION = 1500; // ms enemies stay frozen
        const ICE_SHARD_SHATTER_RADIUS = 60; // AoE when frozen enemy is killed

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
            "damage": "#ff0000", "projectileSpeed": "#007bff", "knockback": "#808080", "luck": "#FFD700",
            "weaponSize": "#FF8C00"
        };

        const UPGRADE_OPTIONS = [
            { name: "Fast Runner",       desc: "Increase movement speed by 8%",        type: "speed",          value: 0.08,  icon: '🏃' },
            { name: "Rapid Fire",        desc: "Increase fire rate by 8%",              type: "fireRate",       value: 0.08,  icon: '🔫' },
            { name: "Magnet Field",      desc: "Increase pickup radius by 8%",          type: "magnetRadius",   value: 0.08,  icon: '🧲' },
            { name: "Increased Damage",  desc: "Increase projectile damage by 15%",     type: "damage",         value: 0.15,  icon: '💥' },
            { name: "Swift Shots",       desc: "Increase projectile speed by 8%",       type: "projectileSpeed",value: 0.08,  icon: '💨' },
            { name: "Power Shot",        desc: "Projectiles knock enemies back by 8%",  type: "knockback",      value: 0.08,  icon: '💪' },
            { name: "Lucky Charm",       desc: "Increase pickup drop rate by 0.5%",     type: "luck",           value: 0.005, icon: '🍀' },
            { name: "Heavy Arsenal",     desc: "Weapons & effects grow 6% larger",      type: "weaponSize",     value: 0.06,  icon: '⚔️' },
            { name: "Quick Dodge",       desc: "Reduce dash cooldown by 4%",            type: "dashCooldown",   value: 0.04,  icon: '💨' },
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
        const BASE_BOX_DROP_CHANCE = 0.015;
        let boxDropChance = BASE_BOX_DROP_CHANCE;

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

// Call each frame — single definition, handles menu + in-game
let isGamepadUpgradeMode = false;
let selectedUpgradeIndex = 0;
let lastGamepadUpdate = 0;
const GAMEPAD_INPUT_DELAY = 200;

// Persistent gamepad navigation state (lives outside the snapshot object)
const _gpNav = { menuIndex: 0, lastScreen: '' };

function handleGamepadInput() {
    if (gamepadIndex == null) return;
    const gp = navigator.getGamepads?.()[gamepadIndex];
    if (!gp) return;

    const now = Date.now();

    const pressed  = (i) => !!gp.buttons?.[i]?.pressed;
    const btnDown  = pressed(13) || gp.axes[1] > 0.5;
    const btnUp    = pressed(12) || gp.axes[1] < -0.5;
    const btnRight = pressed(15) || gp.axes[0] > 0.5;
    const btnLeft  = pressed(14) || gp.axes[0] < -0.5;
    const btnA     = pressed(0);
    const btnB     = pressed(1);
    const btnStart = pressed(9);

    // Any directional input at all?
    const anyDir = btnDown || btnUp || btnRight || btnLeft;

    // ── helpers ───────────────────────────────────────────────────────────
    function applyFocus(items, index) {
        items.forEach((el, i) => el.classList.toggle('gamepad-focus', i === index));
        const el = items[index];
        if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function moveFocus(items, delta) {
        if (!items || items.length === 0) return;
        const next = (_gpNav.menuIndex + delta + items.length) % items.length;
        _gpNav.menuIndex = next;
        applyFocus(items, _gpNav.menuIndex);
        playUISound('uiClick');
        vibrate(10);
        lastGamepadUpdate = now;
    }

    function clearFocus(items) {
        if (items) items.forEach(el => el.classList.remove('gamepad-focus'));
    }

    // ── MAIN MENU navigation ──────────────────────────────────────────────
    if (!gameActive) {
        // ── Game Over screen ──
        if (gameOver) {
            if (now - lastGamepadUpdate < GAMEPAD_INPUT_DELAY) return;
            if (btnA || btnStart) {
                lastGamepadUpdate = now;
                document.getElementById('restartButton')?.click();
            }
            return;
        }

        // ── Tap to Start screen ──
        const startScreen = document.getElementById('startScreen');
        if (startScreen && startScreen.style.display !== 'none') {
            if (btnA || btnStart) {
                lastGamepadUpdate = now;
                document.getElementById('startButton')?.click();
            }
            return;
        }

        const onDifficulty  = difficultyContainer  && difficultyContainer.style.display  !== 'none';
        const onMap         = mapSelectContainer   && mapSelectContainer.style.display   !== 'none';
        const onCharacter   = characterSelectContainer && characterSelectContainer.style.display !== 'none';
        const onUpgradeShop = upgradeShop          && upgradeShop.style.display          !== 'none';
        const onGuide       = gameGuideModal       && gameGuideModal.style.display       !== 'none';
        const onAchieve     = achievementsModal    && achievementsModal.style.display    !== 'none';
        const onCheats      = cheatsModal          && cheatsModal.style.display          !== 'none';

        // Detect screen changes — only initialise focus once on entry
        const currentScreen = onDifficulty ? 'difficulty' : onMap ? 'map' : onCharacter ? 'character' : onUpgradeShop ? 'shop' : onGuide ? 'guide' : onAchieve ? 'achieve' : onCheats ? 'cheats' : 'none';
        if (currentScreen !== _gpNav.lastScreen) {
            _gpNav.lastScreen = currentScreen;
            _gpNav.menuIndex = 0;
            // Apply initial highlight for navigable screens
            if (onDifficulty) {
                const btns = Array.from(difficultyContainer.querySelectorAll('button:not([disabled])'));
                applyFocus(btns, 0);
            } else if (onMap) {
                const tiles = Array.from(mapSelectContainer.querySelectorAll('.map-tile'));
                applyFocus(tiles, 0);
            } else if (onCharacter) {
                const tiles = Array.from(characterSelectContainer.querySelectorAll('.character-tile:not(.locked)'));
                applyFocus(tiles, 0);
            }
        }

        // Only process directional/confirm input after the debounce delay
        if (now - lastGamepadUpdate < GAMEPAD_INPUT_DELAY) return;

        // ── Difficulty screen ──
        if (onDifficulty) {
            const btns = Array.from(difficultyContainer.querySelectorAll('button:not([disabled])'));
            if (btnDown || btnRight) { moveFocus(btns, 1); return; }
            if (btnUp   || btnLeft)  { moveFocus(btns, -1); return; }
            if (btnA) {
                clearFocus(btns);
                btns[_gpNav.menuIndex]?.click();
                _gpNav.menuIndex = 0;
                lastGamepadUpdate = now;
                return;
            }
        }

        // ── Map select ──
        if (onMap) {
            const tiles = Array.from(mapSelectContainer.querySelectorAll('.map-tile'));
            if (btnRight || btnDown) { moveFocus(tiles, 1); return; }
            if (btnLeft  || btnUp)   { moveFocus(tiles, -1); return; }
            if (btnA) { clearFocus(tiles); tiles[_gpNav.menuIndex]?.click(); _gpNav.menuIndex = 0; lastGamepadUpdate = now; return; }
            if (btnB) { clearFocus(tiles); _gpNav.menuIndex = 0; lastGamepadUpdate = now; document.getElementById('backToDifficultySelectButton')?.click(); return; }
        }

        // ── Character select ──
        if (onCharacter) {
            const tiles = Array.from(characterSelectContainer.querySelectorAll('.character-tile:not(.locked)'));
            if (btnRight || btnDown) { moveFocus(tiles, 1); return; }
            if (btnLeft  || btnUp)   { moveFocus(tiles, -1); return; }
            if (btnA) { clearFocus(tiles); tiles[_gpNav.menuIndex]?.click(); _gpNav.menuIndex = 0; lastGamepadUpdate = now; return; }
            if (btnB) { clearFocus(tiles); _gpNav.menuIndex = 0; lastGamepadUpdate = now; document.getElementById('backToMenuFromCharsButton')?.click(); return; }
        }

        // ── Upgrade shop ──
        if (onUpgradeShop) {
            const allCards = Array.from(upgradeShop.querySelectorAll('.permanent-upgrade-card'));
            if (allCards.length > 0) {
                if (_gpNav.lastScreen !== 'shop') {
                    _gpNav.lastScreen = 'shop';
                    _gpNav.menuIndex = 0;
                    allCards.forEach((el, i) => el.classList.toggle('gamepad-focus', i === 0));
                }
                if (btnDown || btnRight) { moveFocus(allCards, 1); return; }
                if (btnUp   || btnLeft)  { moveFocus(allCards, -1); return; }
                if (btnA) {
                    const btn = allCards[_gpNav.menuIndex]?.querySelector('button:not([disabled])');
                    if (btn) { btn.click(); lastGamepadUpdate = now; }
                    return;
                }
            }
            if (btnB) { clearFocus(allCards); _gpNav.menuIndex = 0; lastGamepadUpdate = now; document.getElementById('backToMenuButton')?.click(); return; }
        }

        // ── How to Play — scroll with D-pad, any confirm to close ──
        if (onGuide) {
            const wrapper = gameGuideModal.querySelector('.content-wrapper');
            if (btnDown) { wrapper?.scrollBy(0, 120); lastGamepadUpdate = now; return; }
            if (btnUp)   { wrapper?.scrollBy(0, -120); lastGamepadUpdate = now; return; }
            if (btnB || btnA) { lastGamepadUpdate = now; document.getElementById('backToDifficultyButton')?.click(); return; }
        }

        // ── Achievements ──
        if (onAchieve) {
            const achCards = Array.from(achievementsModal.querySelectorAll('.achievement-card'));
            if (achCards.length > 0) {
                if (_gpNav.lastScreen !== 'achieve') {
                    _gpNav.lastScreen = 'achieve';
                    _gpNav.menuIndex = 0;
                    achCards.forEach((el, i) => el.classList.toggle('gamepad-focus', i === 0));
                }
                if (btnDown || btnRight) { moveFocus(achCards, 1); return; }
                if (btnUp   || btnLeft)  { moveFocus(achCards, -1); return; }
                // Y button (3) = open cheats menu
                if (pressed(3)) { clearFocus(achCards); _gpNav.menuIndex = 0; lastGamepadUpdate = now; document.getElementById('cheatsMenuButton')?.click(); return; }
            }
            if (btnB) { clearFocus(achCards); _gpNav.menuIndex = 0; lastGamepadUpdate = now; document.getElementById('backToMenuFromAchievements')?.click(); return; }
        }

        // ── Cheats ──
        if (onCheats) {
            const cheatCards = Array.from(cheatsModal.querySelectorAll('.cheat-card:not(.locked)'));
            if (cheatCards.length > 0) {
                if (_gpNav.lastScreen !== 'cheats') {
                    _gpNav.lastScreen = 'cheats';
                    _gpNav.menuIndex = 0;
                    cheatCards.forEach((el, i) => el.classList.toggle('gamepad-focus', i === 0));
                }
                if (btnDown || btnRight) { moveFocus(cheatCards, 1); return; }
                if (btnUp   || btnLeft)  { moveFocus(cheatCards, -1); return; }
                if (btnA) {
                    const checkbox = cheatCards[_gpNav.menuIndex]?.querySelector('input[type="checkbox"]');
                    if (checkbox) { checkbox.checked = !checkbox.checked; checkbox.dispatchEvent(new Event('change')); playUISound('uiClick'); vibrate(10); lastGamepadUpdate = now; }
                    return;
                }
            }
            if (btnB) { clearFocus(cheatCards); _gpNav.menuIndex = 0; lastGamepadUpdate = now; document.getElementById('backToAchievementsButton')?.click(); return; }
        }

        return;
    }

    // ── IN-GAME: pause menu ───────────────────────────────────────────────
    if (gamePaused && !isGamepadUpgradeMode) {
        if (now - lastGamepadUpdate < GAMEPAD_INPUT_DELAY) return;
        const pauseOverlayEl = document.getElementById('pauseOverlay');
        if (pauseOverlayEl && pauseOverlayEl.style.display !== 'none') {

            // All navigable items: music slider, effects slider, zoom toggle, resume, restart
            const musicSlider   = document.getElementById('musicVolume');
            const effectsSlider = document.getElementById('effectsVolume');
            const zoomToggleEl  = document.getElementById('zoomToggle');
            const pauseBtns     = Array.from(pauseOverlayEl.querySelectorAll('button'));

            // Build a flat list: [musicSlider, effectsSlider, zoomToggle, ...buttons]
            const pauseItems = [musicSlider, effectsSlider, zoomToggleEl, ...pauseBtns].filter(Boolean);

            // Initialise focus on pause open
            if (_gpNav.lastScreen !== 'pause') {
                _gpNav.lastScreen = 'pause';
                _gpNav.menuIndex = 0;
                _gpNav._sliderActive = false;
                pauseItems.forEach((el, i) => el.classList.toggle('gamepad-focus', i === 0));
            }

            const focused = pauseItems[_gpNav.menuIndex];

            // If a slider is "active" (selected with A), left/right adjusts it
            if (_gpNav._sliderActive && focused && focused.type === 'range') {
                const step = parseFloat(focused.step) || 1;
                if (btnRight) { focused.value = Math.min(parseFloat(focused.max), parseFloat(focused.value) + step * 2); focused.dispatchEvent(new Event('input')); lastGamepadUpdate = now; return; }
                if (btnLeft)  { focused.value = Math.max(parseFloat(focused.min), parseFloat(focused.value) - step * 2); focused.dispatchEvent(new Event('input')); lastGamepadUpdate = now; return; }
                // B = deselect slider
                if (btnB) { _gpNav._sliderActive = false; playUISound('uiClick'); lastGamepadUpdate = now; return; }
                return;
            }

            // Navigate up/down through items
            if (btnDown) {
                focused?.classList.remove('gamepad-focus');
                _gpNav.menuIndex = (_gpNav.menuIndex + 1) % pauseItems.length;
                pauseItems[_gpNav.menuIndex]?.classList.add('gamepad-focus');
                playUISound('uiClick'); vibrate(10); lastGamepadUpdate = now; return;
            }
            if (btnUp) {
                focused?.classList.remove('gamepad-focus');
                _gpNav.menuIndex = (_gpNav.menuIndex - 1 + pauseItems.length) % pauseItems.length;
                pauseItems[_gpNav.menuIndex]?.classList.add('gamepad-focus');
                playUISound('uiClick'); vibrate(10); lastGamepadUpdate = now; return;
            }

            // A = confirm / activate
            if (btnA) {
                if (focused && focused.type === 'range') {
                    // Enter slider adjustment mode
                    _gpNav._sliderActive = true;
                    playUISound('uiClick'); lastGamepadUpdate = now; return;
                } else if (focused && focused.type === 'checkbox') {
                    focused.checked = !focused.checked;
                    focused.dispatchEvent(new Event('change'));
                    playUISound('uiClick'); vibrate(10); lastGamepadUpdate = now; return;
                } else if (focused && focused.tagName === 'BUTTON') {
                    focused.classList.remove('gamepad-focus');
                    focused.click();
                    _gpNav.menuIndex = 0; lastGamepadUpdate = now; return;
                }
            }

            // B / Start = resume
            if (btnB || btnStart) {
                pauseItems.forEach(el => el.classList.remove('gamepad-focus'));
                _gpNav.lastScreen = '';
                _gpNav._sliderActive = false;
                lastGamepadUpdate = now;
                togglePause();
                return;
            }
        }
        return;
    }

    // ── IN-GAME: upgrade menu ─────────────────────────────────────────────
    if (isGamepadUpgradeMode) {
        if (now - lastGamepadUpdate < GAMEPAD_INPUT_DELAY) return;
        const numOptions = document.querySelectorAll('.upgrade-card').length;
        if (numOptions === 0) return;
        const cardsPerRow = 3;
        const prev = selectedUpgradeIndex;

        if (btnRight) selectedUpgradeIndex = (selectedUpgradeIndex + 1) % numOptions;
        else if (btnLeft) selectedUpgradeIndex = (selectedUpgradeIndex - 1 + numOptions) % numOptions;
        if (btnDown) selectedUpgradeIndex = Math.min(numOptions - 1, selectedUpgradeIndex + cardsPerRow);
        else if (btnUp) selectedUpgradeIndex = Math.max(0, selectedUpgradeIndex - cardsPerRow);

        if (selectedUpgradeIndex !== prev) {
            document.querySelectorAll('.upgrade-card')[prev]?.classList.remove('selected');
            const newCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
            if (newCard) { newCard.classList.add('selected'); playUISound('uiClick'); vibrate(10); }
            lastGamepadUpdate = now;
        }
        if (btnA) {
            const selectedCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
            if (selectedCard) { selectedCard.querySelector('button')?.click(); isGamepadUpgradeMode = false; lastGamepadUpdate = now; }
        }
        return;
    }

    // ── IN-GAME: movement + actions ───────────────────────────────────────
    let lx = applyDeadzone(gp.axes[0] || 0);
    let ly = applyDeadzone(gp.axes[1] || 0);
    const lmag = Math.hypot(lx, ly);
    if (lmag > 0) { joystickDirX = lx / lmag; joystickDirY = ly / lmag; }
    else { joystickDirX = 0; joystickDirY = 0; }

    let rx = applyDeadzone(gp.axes[2] || 0);
    let ry = applyDeadzone(gp.axes[3] || 0);
    const rmag = Math.hypot(rx, ry);
    if (rmag > 0) { aimDx = rx / rmag; aimDy = ry / rmag; }
    else { aimDx = 0; aimDy = 0; }

    if (pressed(7) && !gp._rTriggerLatch) {
        gp._rTriggerLatch = true;
        if (player) triggerDash(player);
    } else if (!pressed(7)) { gp._rTriggerLatch = false; }

    if ((btnStart || btnB) && !gp._pauseLatch) {
        gp._pauseLatch = true;
        if (gameActive && !gameOver) togglePause();
    } else if (!btnStart && !btnB) { gp._pauseLatch = false; }
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
    if (e.button === 0 && gameActive && !gamePaused && !gameOver) {
        if (cheats.click_to_fire) {
            // Calculate angle from player to mouse click position directly
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const playerScreenX = player.x - cameraOffsetX;
            const playerScreenY = player.y - cameraOffsetY;
            const clickAngle = Math.atan2(my - playerScreenY, mx - playerScreenX);
            createWeapon(player, clickAngle);
            lastWeaponFireTime = Date.now();
        } else {
            triggerDash(player);
        }
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
            '🐌': { size: 22, baseHealth: 3, speedMultiplier: 1.2, type: 'snail', minLevel: 4, spawnWeight: 0.02, initialProps: () => ({ lastPuddleSpawnTime: Date.now(), directionAngle: Math.random() * 2 * Math.PI, lastDirChange: Date.now() }) },
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
        // All enemy types can now spawn as bosses
        const BOSSED_ENEMY_TYPES = Object.keys(ENEMY_CONFIGS);
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
                
                // Weighted random selection based on spawnWeight (default 1.0 if not specified)
                const weights = eligibleEnemyEmojis.map(emoji => ENEMY_CONFIGS[emoji].spawnWeight || 1.0);
                const totalWeight = weights.reduce((sum, w) => sum + w, 0);
                let random = Math.random() * totalWeight;
                let selectedIndex = 0;
                for (let i = 0; i < weights.length; i++) {
                    random -= weights[i];
                    if (random <= 0) {
                        selectedIndex = i;
                        break;
                    }
                }
                enemyEmoji = eligibleEnemyEmojis[selectedIndex];
            }
            
            let difficultySpeedMultiplier = (currentDifficulty === 'easy') ? 0.9 : (currentDifficulty === 'medium') ? 1.35 : 1.75; 
            let levelSpeedMultiplier = (currentDifficulty === 'hard') ? (1 + 0.025 * (player.level - 1)) : (1 + 0.02 * (player.level - 1)); 
            const currentBaseEnemySpeed = baseEnemySpeed * difficultySpeedMultiplier * levelSpeedMultiplier;
            
            const config = ENEMY_CONFIGS[enemyEmoji];

            // Scale enemy health with powerups collected so the game stays challenging
            // as the player gets stronger. Every 4 powerups adds +1 health on hard, +1 per 6 on medium.
            const powerupHealthBonus = currentDifficulty === 'hard'
                ? Math.floor(player.boxPickupsCollectedCount / 4)
                : currentDifficulty === 'medium'
                    ? Math.floor(player.boxPickupsCollectedCount / 6)
                    : 0;

            const newEnemy = { 
                x, y, size: config.size, emoji: enemyEmoji, speed: currentBaseEnemySpeed * config.speedMultiplier, 
                health: config.baseHealth + powerupHealthBonus,
                isHit: false, isHitByOrbiter: false, isHitByCircle: false, 
                isFrozen: false, freezeEndTime: 0, originalSpeed: currentBaseEnemySpeed * config.speedMultiplier, 
                isSlowedByPuddle: false, isBoss: false, isHitByAxe: false,
                isIgnited: false, ignitionEndTime: 0, lastIgnitionDamageTime: 0
            };
            if (config.initialProps) Object.assign(newEnemy, config.initialProps());
            enemies.push(newEnemy);
        }

        function handleEnemyDeath(enemy, explosionId = null) {
            if (enemy.isHit) return;
            // Zombie enemies: revive once with half health
            if (cheats.zombie_enemies && !enemy._hasRevived) {
                enemy._hasRevived = true;
                enemy.health = Math.ceil((ENEMY_CONFIGS[enemy.emoji]?.baseHealth || 1) / 2);
                enemy.isHit = false;
                floatingTexts.push({ text: "Revived!", x: enemy.x, y: enemy.y - enemy.size, startTime: Date.now(), duration: 800, color: '#00FF00' });
                return;
            }
            enemy.isHit = true;
            enemiesDefeatedCount++;
            player.coins++; // Grant one coin per kill
            if (typeof runStats !== 'undefined') {
                if (typeof runStats.coinsThisRun !== 'number' || !Number.isFinite(runStats.coinsThisRun)) runStats.coinsThisRun = 0;
                runStats.coinsThisRun++;
                if (typeof runStats.killsSinceDamage !== 'number' || !Number.isFinite(runStats.killsSinceDamage)) runStats.killsSinceDamage = 0;
                runStats.killsSinceDamage++;
            }
            if (typeof playerStats !== 'undefined') {
                if (typeof playerStats.totalCoins !== 'number' || !Number.isFinite(playerStats.totalCoins)) playerStats.totalCoins = 0;
                playerStats.totalCoins++;
            }
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

            // Vampire mode: restore 1 health on kill (max every 2s to avoid spam)
            if (cheats.vampire_mode) {
                const now2 = Date.now();
                if (!player._vampireLastHealTime || now2 - player._vampireLastHealTime > 2000) {
                    if (player.lives < player.maxLives) {
                        player.lives++;
                        updateUIStats();
                        floatingTexts.push({ text: "+❤️", x: player.x, y: player.y - player.size, startTime: now2, duration: 1000, color: '#FF0000' });
                    }
                    player._vampireLastHealTime = now2;
                }
            }

            if (enemy.isBoss) {
                createPickup(enemy.x, enemy.y, BOSS_XP_EMOJI, enemy.size / 2, BOSS_XP_DROP);
            } else if (enemy.emoji === VAMPIRE_EMOJI || enemy.emoji === FEMALE_ZOMBIE_EMOJI) {
                createPickup(enemy.x, enemy.y, '💎', DIAMOND_SIZE, 5);
            } else if (enemy.emoji === '🐌') {
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

            // Only pick enemy types that have unlocked at the current level
            const eligible = BOSSED_ENEMY_TYPES.filter(e => ENEMY_CONFIGS[e].minLevel <= player.level);
            const mimickedEmoji = eligible[Math.floor(Math.random() * eligible.length)];
            const config = ENEMY_CONFIGS[mimickedEmoji];

            let difficultySpeedMultiplier = (currentDifficulty === 'easy') ? 0.9 : (currentDifficulty === 'medium') ? 1.35 : 1.75;
            const currentBaseEnemySpeed = baseEnemySpeed * difficultySpeedMultiplier * (1 + 0.02 * (player.level - 1));
            const bossSpeed = currentBaseEnemySpeed * config.speedMultiplier * 0.75;

            // Boss size: 2.5× for small enemies, 1.8× for already-large ones
            const sizeMultiplier = config.size < 20 ? 2.5 : 2.0;
            const bossSize = config.size * sizeMultiplier;

            // Boss health scales with level — harder bosses as the run progresses
            const bossHealth = Math.floor(BOSS_HEALTH + player.level * 1.5);

            const boss = {
                x, y, size: bossSize, emoji: mimickedEmoji, speed: bossSpeed,
                health: bossHealth,
                isBoss: true, mimics: mimickedEmoji, isHit: false, isHitByOrbiter: false, isHitByCircle: false,
                isFrozen: false, freezeEndTime: 0, originalSpeed: bossSpeed, isSlowedByPuddle: false,
                isHitByAxe: false, isIgnited: false, ignitionEndTime: 0, lastIgnitionDamageTime: 0
            };
            if (config.initialProps) Object.assign(boss, config.initialProps());
            enemies.push(boss);
            floatingTexts.push({ text: '⚠️ BOSS!', x: player.x, y: player.y - 60, startTime: Date.now(), duration: 2000, color: '#ff4444' });
        }

        function createPickup(x, y, type, size, xpValue) {
            if (x === -1 || y === -1) { x = Math.random() * WORLD_WIDTH; y = Math.random() * WORLD_HEIGHT; }
            pickupItems.push({ x, y, size, type, xpValue, spawnTime: Date.now(), glimmerStartTime: Date.now() + Math.random() * 2000 });
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
                        weapon.owner = (shooter === player) ? 'player' : 'other';
                        weapon.active = true;
                        if (weapon.owner === 'player' && typeof runStats !== 'undefined') {
                            if (typeof runStats.bulletsFired !== 'number' || !Number.isFinite(runStats.bulletsFired)) runStats.bulletsFired = 0;
                            runStats.bulletsFired++;
                        }
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
            if (typeof runStats !== 'undefined') {
                if (typeof runStats.levelsGainedThisRun !== 'number' || !Number.isFinite(runStats.levelsGainedThisRun)) runStats.levelsGainedThisRun = 0;
                runStats.levelsGainedThisRun++;
            }
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
            selectedChoices.forEach((upgrade, index) => {
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
                    document.querySelectorAll('.upgrade-card').forEach(card => card.classList.remove('selected'));
                    upgradeCard.classList.add('selected');
                    selectedUpgradeIndex = index;
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
            else if (upgrade.type === "weaponSize") {
                // Cap at 1.5× so weapons never become screen-filling at high levels
                player.projectileSizeMultiplier = Math.min(1.5, player.projectileSizeMultiplier * (1 + upgrade.value));
            }
            else if (upgrade.type === "dashCooldown") {
                // Reduce dash cooldown, minimum 1 second (1000ms)
                player.dashCooldown = Math.max(1000, player.dashCooldown * (1 - upgrade.value));
            }
            
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
                luck: 'LUCK', weaponSize: 'SIZE'
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
                activatePowerup('dog_companion');
            }
            if (cheats.magnet_mode) {
                player.magnetRadius = WORLD_WIDTH;
            }
            if (cheats.giant_mode) {
                player.size = 70;
            }
            if (cheats.tiny_mode) {
                player.size = 17;
            }
            if (cheats.clone_army) {
                // Spawn 3-5 permanent clones using the existing doppelganger system
                // We store them as extra doppelgangers in a separate array
                const cloneCount = 3 + Math.floor(Math.random() * 3);
                if (!window.cloneArmy) window.cloneArmy = [];
                window.cloneArmy.length = 0;
                for (let ci = 0; ci < cloneCount; ci++) {
                    const angle = (ci / cloneCount) * Math.PI * 2;
                    window.cloneArmy.push({
                        x: player.x + Math.cos(angle) * 60,
                        y: player.y + Math.sin(angle) * 60,
                        size: player.size * 0.8,
                        rotationAngle: 0,
                        lastFireTime: 0,
                        endTime: Infinity
                    });
                }
            }
            if (cheats.chaos_mode) {
                // Pick 5 random cheats and enable them for this run
                const cheatKeys = Object.keys(CHEATS).filter(k => k !== 'chaos_mode' && k !== 'hearts_start_10');
                const shuffled = cheatKeys.sort(() => Math.random() - 0.5).slice(0, 5);
                shuffled.forEach(k => { cheats[k] = true; });
                floatingTexts.push({ text: "CHAOS!", x: player.x, y: player.y - 60, startTime: Date.now(), duration: 2500, color: '#FF00FF' });
                // Re-apply so startup cheats like giant_mode take effect
                applyCheats();
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
                upgradeLevels: { speed: 0, fireRate: 0, magnetRadius: 0, damage: 0, projectileSpeed: 0, knockback: 0, luck: 0, weaponSize: 0, dashCooldown: 0 }
            });
            player.originalPlayerSpeed = player.speed;
            boxDropChance = BASE_BOX_DROP_CHANCE; appleDropChance = 0.05;
            if (typeof runStats !== 'undefined') {
                runStats.maxHeartsReached = Math.max(runStats.maxHeartsReached || 0, player.maxLives);
                runStats.coinsThisRun = player.coins || 0;
                runStats.killsSinceDamage = 0;
                runStats.damageTakenThisRun = 0;
                runStats.hasBeenAtOneHeart = false;
                runStats.recoveredToFullAfterOneHeart = false;
            }

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
            merchants.length = 0; // Ensure no merchants at start

            temporalWardActive = false; isTimeStopped = false; timeStopEndTime = 0;
            resetRunStats();
            applyCheats();
            // Reset per-run cheat state
            player._shieldLastHitTime = 0;
            player._vampireLastHealTime = 0;
            if (window.cloneArmy) window.cloneArmy.length = 0;
            if (!cheats.infinite_dash) player.dashCooldown = playerData.hasReducedDashCooldown ? 3000 : 6000;

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
            if (gameStats) gameStats.style.display = 'none';
            if (mobileResetButton) mobileResetButton.style.display = 'block';
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
            // Reset gamepad nav so the difficulty screen re-initialises focus cleanly
            // Also clear gameOver so the gamepad handler doesn't get stuck on the game over block
            gameOver = false;
            if (typeof _gpNav !== 'undefined') {
                document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
                _gpNav.lastScreen = '';
                _gpNav.menuIndex = 0;
            }
        }
        function togglePause() {
            vibrate(20);
            gamePaused = !gamePaused;
            if (gamePaused) { pauseOverlay.style.display = 'flex'; Tone.Transport.pause(); } 
            else {
                pauseOverlay.style.display = 'none';
                Tone.Transport.start();
                // Reset pause nav state so it re-initialises cleanly next open
                if (typeof _gpNav !== 'undefined') { _gpNav.lastScreen = ''; _gpNav.menuIndex = 0; }
                const pauseBtns = Array.from(pauseOverlay.querySelectorAll('button'));
                pauseBtns.forEach(el => el.classList.remove('gamepad-focus'));
            }
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

