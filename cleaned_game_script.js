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

// Asset loading
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

const backgroundPaths = [ 
    'sprites/Background6.png', 'sprites/Background2.png', 'sprites/Background3.png', 
    'sprites/Background4.png', 'sprites/Background5.png', 'sprites/Background8.png',  
    'sprites/Background1.png', 'sprites/Background7.png', 'sprites/Background9.png'
];

const backgroundMusicPaths = [ 
    'audio/background_music.mp3', 'audio/background_music2.mp3', 'audio/background_music3.mp3', 
    'audio/background_music4.mp3', 'audio/background_music5.mp3', 'audio/background_music6.mp3', 
    'audio/background_music7.mp3', 'audio/background_music8.mp3', 'audio/background_music9.mp3', 
    'audio/background_music10.mp3', 'audio/background_music11.mp3'
];

const sprites = {};
const audioPlayers = {};
const backgroundImages = new Array(backgroundPaths.length);
let assetsLoadedCount = 0;
const totalAssets = Object.keys(spritePaths).length + Object.keys(audioPaths).length + backgroundPaths.length;
const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Asset loading functions
function assetLoaded() {
    assetsLoadedCount++;
    if (assetsLoadedCount === totalAssets) {
        console.log('All game assets loaded successfully.');
        document.getElementById('levelUpBox').src = sprites.levelUpBox.src;
        initializePreRenders();
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
        backgroundImages[index] = img;
        assetLoaded();
    };
    img.onerror = () => console.error(`Failed to load background: ${path}`);
}

// Load all assets
for (const [name, path] of Object.entries(spritePaths)) loadSprite(name, path);
for (const [name, path] of Object.entries(audioPaths)) loadAudio(name, path);
backgroundPaths.forEach((path, index) => loadBackground(path, index));

// UI Elements
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

// Mobile Menu Buttons
const mobileMenuUpgradesButton = document.getElementById('mobileMenuUpgradesButton');
const mobileMenuTrophiesButton = document.getElementById('mobileMenuTrophiesButton');
const mobileMenuCheatsButton = document.getElementById('mobileMenuCheatsButton');

// Game variables
let quadtree;
let currentDifficulty = 'easy';
let cameraZoom = 1.0;
let currentBackgroundIndex = 0;
let selectedMapIndex = -1;
let equippedCharacterID = 'cowboy';
let currentBGMPlayer = null;

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

// Player object
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

let player2 = null;
let doppelganger = null;
let doppelgangerActive = false;
let lastDoppelgangerSpawnTime = 0;
const DOPPELGANGER_SPAWN_INTERVAL = 14000;
const DOPPELGANGER_DURATION = 8000; 
const DOPPELGANGER_FIRE_INTERVAL = 500;

// Constants
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

// Game arrays
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
let lastMerchantSpawnTime = 0;
const MERCHANT_SPAWN_INTERVAL = 70000;

// NEW FEATURES
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

// Game state
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

// Power-up states - consolidated
let bombEmitterActive = false; 
let lastBombEmitMs = 0;
let orbitingPowerUpActive = false;
let damagingCircleActive = false; 
let lastDamagingCircleDamageTime = 0;
let lightningProjectileActive = false; 
let lastLightningSpawnTime = 0;
let magneticProjectileActive = false;
let vShapeProjectileLevel = 0;
let iceProjectileActive = false;
let puddleTrailActive = false; 
let lastPlayerPuddleSpawnTime = 0;
let laserPointerActive = false; 
let autoAimActive = false;
let explosiveBulletsActive = false;
let vengeanceNovaActive = false;
let dogCompanionActive = false;
let antiGravityActive = false; 
let lastAntiGravityPushTime = 0;
let ricochetActive = false;
let rocketLauncherActive = false;
let blackHoleActive = false; 
let lastBlackHoleTime = 0;
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

let fireRateBoostActive = false;
let fireRateBoostEndTime = 0;
const FIRE_RATE_BOOST_DURATION = 3000;

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

let isGamepadUpgradeMode = false;
let selectedUpgradeIndex = 0;
let lastGamepadUpdate = 0;
const GAMEPAD_INPUT_DELAY = 200;

function handleGamepadInput() {
    if (gamepadIndex == null) return;
    const gp = navigator.getGamepads?.()[gamepadIndex];
    if (!gp) return;

    // Upgrade menu gamepad logic
    if (isGamepadUpgradeMode) {
        const now = Date.now();
        if (now - lastGamepadUpdate > GAMEPAD_INPUT_DELAY) {
            let moved = false;
            const prevIndex = selectedUpgradeIndex;
            const numOptions = document.querySelectorAll('.upgrade-card').length;
            
            if (gp.buttons[15].pressed || gp.axes[0] > 0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex + 1) % numOptions;
                moved = true;
            } 
            else if (gp.buttons[14].pressed || gp.axes[0] < -0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex - 1 + numOptions) % numOptions;
                moved = true;
            }
            
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
                if (prevCard) prevCard.classList.remove('selected');
                
                const newCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (newCard) {
                    newCard.classList.add('selected');
                    playUISound('uiClick');
                    vibrate(10);
                }
                lastGamepadUpdate = now;
            }
            
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

    // Regular gamepad movement logic
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

    // Player 2 gamepad input
    const gp2 = navigator.getGamepads?.()[1];
    if (player2 && player2.active && gp2) {
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

        const pressed2 = (i) => !!gp2.buttons?.[i]?.pressed;
        if (pressed2(7) && !player2._rTriggerLatch) {
            player2._rTriggerLatch = true;
            triggerDash(player2);
        } else if (!pressed2(7)) {
            player2._rTriggerLatch = false;
        }
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

let joystickDirX = 0; 
let joystickDirY = 0;
let aimDx = 0; 
let aimDy = 0;
let lastMoveStickTapTime = 0;
let lastFireStickTapTime = 0;
let lastMoveStickDirection = {x: 0, y: 0};

let mouseX = 0; 
let mouseY = 0;
let isMouseInCanvas = false;

const keys = {};

// Event listeners
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

// Key event handlers
window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if(gameActive && !gameOver) togglePause();
        return;
    }
    if (e.key === 'o') triggerDash(player2);
    
    if (keys['-'] && keys['=']) {
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
                spinStartTime: null, spinDirection: 0
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
        if (keys['ArrowDown']) aimDy = 1; 
        else if (keys['ArrowUp']) aimDy = -1; 
        else aimDy = 0;
        
        if (keys['ArrowRight']) aimDx = 1; 
        else if (keys['ArrowLeft']) aimDx = -1; 
        else aimDx = 0;
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

canvas.addEventListener('mouseenter', () => { 
    if (gameActive && !document.body.classList.contains('is-mobile')) isMouseInCanvas = true; 
});
canvas.addEventListener('mouseleave', () => { 
    if (gameActive) isMouseInCanvas = false; 
});
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gameActive && !gamePaused && !gameOver) {
        triggerDash(player);
    }
});

// Utility functions
function vibrate(duration) { 
    if (isMobileDevice && navigator.vibrate) navigator.vibrate(duration); 
}

function playSound(name) { 
    if (gameActive && !gamePaused && audioPlayers[name]) audioPlayers[name].start(getSafeToneTime()); 
}

function playUISound(name) { 
    if (audioPlayers[name]) audioPlayers[name].start(getSafeToneTime()); 
}

// Audio setup
audioPlayers['playerScream'].volume.value = -10;
const swordSwingSynth = new Tone.Synth({ 
    oscillator: { type: "sine" }, 
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.01, release: 0.05 } 
}).toDestination();

const eyeProjectileHitSynth = new Tone.Synth({ 
    oscillator: { type: "triangle" }, 
    envelope: { attack: 0.001, decay: 0.08, sustain: 0.01, release: 0.1 } 
}).toDestination();

const bombExplosionSynth = new Tone.Synth({ 
    oscillator: { type: "sawtooth" }, 
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.2 } 
}).toDestination();

// Background music functions
function startBGM() { 
    if (currentBGMPlayer && currentBGMPlayer.state !== 'started') currentBGMPlayer.start(); 
    Tone.Transport.start(); 
}

function stopBGM() { 
    if (currentBGMPlayer) currentBGMPlayer.stop(); 
    Tone.Transport.stop(); 
}

function startMainMenuBGM() {
    if (Tone.context.state !== 'running') {
        Tone.start().then(() => {
            if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') { 
                stopBGM(); 
                audioPlayers['mainMenu'].start(); 
            }
        });
    } else {
        if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') { 
            stopBGM(); 
            audioPlayers['mainMenu'].start(); 
        }
    }
}

function stopMainMenuBGM() { 
    if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state === 'started') audioPlayers['mainMenu'].stop(); 
}

function playBombExplosionSound() { 
    if (gameActive && !gamePaused) bombExplosionSynth.triggerAttackRelease("F3", "8n", getSafeToneTime()); 
} 

function playSwordSwingSound() { 
    if (gameActive && !gamePaused) swordSwingSynth.triggerAttackRelease("D4", "16n", getSafeToneTime()); 
} 

function playEyeProjectileHitSound() { 
    if (gameActive && !gamePaused) eyeProjectileHitSynth.triggerAttackRelease("G2", "16n", getSafeToneTime()); 
}

function resizeCanvas() {
    canvas.width = 1125;
    canvas.height = 676;
    player.x = Math.max(player.size / 2, Math.min(WORLD_WIDTH - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(WORLD_HEIGHT - player.size / 2, player.y));
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Touch event handlers - simplified version to avoid duplication
let activeTouches = {};

document.body.addEventListener('touchstart', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    e.preventDefault();
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const moveRect = movementStickBase.getBoundingClientRect();
        const fireRect = firestickBase.getBoundingClientRect();

        if (touch.clientX > moveRect.left && touch.clientX < moveRect.right && touch.clientY > moveRect.top && touch.clientY < moveRect.bottom) {
            if (!activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = { type: 'movement' };
                const {dx, dy} = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                const magnitude = Math.hypot(dx, dy);
                if (magnitude > 0) {
                    joystickDirX = dx / magnitude;
                    joystickDirY = dy / magnitude;
                }
            }
        }
        else if (touch.clientX > fireRect.left && touch.clientX < fireRect.right && touch.clientY > fireRect.top && touch.clientY < fireRect.bottom) {
            if (!activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = { type: 'fire' };
                const now = Date.now();
                if (now - lastFireStickTapTime < 300) {
                    triggerDash(player);
                }
                lastFireStickTapTime = now;
                
                const {dx, dy} = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                aimDx = dx;
                aimDy = dy;
            }
        }
    }
}, { passive: false });

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
                if (magnitude > 0) { 
                    joystickDirX = dx / magnitude; 
                    joystickDirY = dy / magnitude; 
                } else { 
                    joystickDirX = 0; 
                    joystickDirY = 0; 
                }
            } else if (touchInfo.type === 'fire') {
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                aimDx = dx; 
                aimDy = dy;
            }
        }
    }
}, { passive: false });

document.body.addEventListener('touchend', handleTouchEnd);
document.body.addEventListener('touchcancel', handleTouchEnd);

function handleTouchEnd(e) {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchInfo = activeTouches[touch.identifier];
        if (touchInfo) {
            if (touchInfo.type === 'movement') { 
                if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)'; 
                joystickDirX = 0; 
                joystickDirY = 0; 
            } else if (touchInfo.type === 'fire') { 
                if (firestickCap) firestickCap.style.transform = 'translate(0, 0)'; 
                aimDx = 0; 
                aimDy = 0; 
            }
            delete activeTouches[touch.identifier];
        }
    }
}

// Mouse joystick handling
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
        if (magnitude > 0) { 
            joystickDirX = dx / magnitude; 
            joystickDirY = dy / magnitude; 
        }
    } else if (e.clientX > fireRect.left && e.clientX < fireRect.right && e.clientY > fireRect.top && e.clientY < fireRect.bottom) {
        mouseActiveStick = 'fire';
        activeTouches['mouse'] = { type: 'fire' };
        const { dx, dy } = getJoystickInput(e.clientX, e.clientY, firestickBase, firestickCap);
        aimDx = dx; 
        aimDy = dy;
    }
});

window.addEventListener('mousemove', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    if (mouseActiveStick) {
        if (mouseActiveStick === 'movement') {
            const { dx, dy } = getJoystickInput(e.clientX, e.clientY, movementStickBase, movementStickCap);
            const magnitude = Math.hypot(dx, dy);
            if (magnitude > 0) { 
                joystickDirX = dx / magnitude; 
                joystickDirY = dy / magnitude; 
            } else { 
                joystickDirX = 0; 
                joystickDirY = 0; 
            }
        } else if (mouseActiveStick === 'fire') {
            const { dx, dy } = getJoystickInput(e.clientX, e.clientY, firestickBase, firestickCap);
            aimDx = dx; 
            aimDy = dy;
        }
    }
});

window.addEventListener('mouseup', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    if (mouseActiveStick === 'movement') { 
        if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)'; 
        joystickDirX = 0; 
        joystickDirY = 0; 
    } else if (mouseActiveStick === 'fire') { 
        if (firestickCap) firestickCap.style.transform = 'translate(0, 0)'; 
        aimDx = 0; 
        aimDy = 0; 
    }
    mouseActiveStick = null;
    delete activeTouches['mouse'];
});

// Character system
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

// Enemy configuration
const ENEMY_CONFIGS = {
    '🧟': { size: 17, baseHealth: 1, speedMultiplier: 1, type: 'pursuer', minLevel: 1 },
    '💀': { size: 20, baseHealth: 2, speedMultiplier: 1.15, type: 'pursuer', minLevel: 5 },
    '🐌': { size: 22, baseHealth: 4, speedMultiplier: 0.3, type: 'snail', minLevel: 4, initialProps: () => ({ lastPuddleSpawnTime: Date.now(), directionAngle: Math.random() * 2 * Math.PI }) },
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

// Game functions - consolidated and deduplicated
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
    player.coins++;
    
    if (Math.random() < boxDropChance) {
        createPickup(enemy.x, enemy.y, '📦', BOX_SIZE, 0);
    }
    
    runStats.killsThisRun++;
    playerStats.totalKills++;
    if(enemy.isBoss) { 
        runStats.bossesKilledThisRun++; 
        playerStats.totalBossesKilled++; 
    }
    if(enemy.emoji === '🧛‍♀️') runStats.vampiresKilledThisRun++;
    if(explosionId) {
        if(!runStats.killsPerExplosion[explosionId]) runStats.killsPerExplosion[explosionId] = 0;
        runStats.killsPerExplosion[explosionId]++;
    }
    checkAchievements();

    createBloodPuddle(enemy.x, enemy.y, enemy.size);
    playSound('enemyDeath');

    // Drop appropriate items based on enemy type
    if (enemy.isBoss) {
        createPickup(enemy.x, enemy.y, BOSS_XP_EMOJI, enemy.size / 2, BOSS_XP_DROP);
    } else if (enemy.emoji === VAMPIRE_EMOJI || enemy.emoji === FEMALE_ZOMBIE_EMOJI) {
        createPickup(enemy.x, enemy.y, '💎', DIAMOND_SIZE, 5);
    } else if (enemy.emoji === '🐌' || enemy.emoji === MOSQUITO_EMOJI) {
        createPickup(enemy.x, enemy.y, DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE);
    } else if (Math.random() < appleDropChance) {
        createAppleItem(enemy.x, enemy.y);
    } else {
        const dropMap = {
            '🧟': [COIN_EMOJI, COIN_SIZE, COIN_XP_VALUE],
            '💀': [DIAMOND_EMOJI, DIAMOND_SIZE, DIAMOND_XP_VALUE],
            '🦇': [RING_SYMBOL_EMOJI, RING_SYMBOL_SIZE, RING_SYMBOL_XP_VALUE],
            '😈': [RING_SYMBOL_EMOJI, RING_SYMBOL_SIZE, RING_SYMBOL_XP_VALUE],
            '👹': [DEMON_XP_EMOJI, RING_SYMBOL_SIZE, DEMON_XP_VALUE],
            '👁️': [DEMON_XP_EMOJI, RING_SYMBOL_SIZE, DEMON_XP_VALUE],
            '👻': [DEMON_XP_EMOJI, RING_SYMBOL_SIZE, DEMON_XP_VALUE]
        };
        
        const drop = dropMap[enemy.emoji];
        if (drop) createPickup(enemy.x, enemy.y, drop[0], drop[1], drop[2]);
    }

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
    if (x === -1 || y === -1) { 
        x = Math.random() * WORLD_WIDTH; 
        y = Math.random() * WORLD_HEIGHT; 
    }
    pickupItems.push({ x, y, size, type, xpValue, glimmerStartTime: Date.now() + Math.random() * 2000 });
}

function createAppleItem(x, y) {
    appleItems.push({ 
        x, y, size: APPLE_ITEM_SIZE, type: 'apple', spawnTime: Date.now(), 
        lifetime: APPLE_LIFETIME, glimmerStartTime: Date.now() + Math.random() * 2000 
    });
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
        let closestEnemy = null; 
        let minDistance = Infinity;
        enemies.forEach(enemy => {
            const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
            if (distSq < minDistance) { 
                minDistance = distSq; 
                closestEnemy = enemy; 
            }
        });
        weaponAngle = closestEnemy ? Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x) : shooter.rotationAngle;
    } else if (aimDx !== 0 || aimDy !== 0) { 
        weaponAngle = Math.atan2(aimDy, aimDx); 
    } else {
        let closestEnemy = null; 
        let minDistance = Infinity;
        enemies.forEach(enemy => {
            const distSq = (shooter.x - enemy.x) ** 2 + (shooter.y - enemy.y) ** 2;
            if (distSq < minDistance) { 
                minDistance = distSq; 
                closestEnemy = enemy; 
            }
        });
        weaponAngle = closestEnemy ? Math.atan2(closestEnemy.y - shooter.y, closestEnemy.x - shooter.x) : shooter.rotationAngle;
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
        const projectileCount = 8; 
        const spreadAngle = Math.PI / 8;
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
    if(dualGunActive && shooter === player) { 
        angles.forEach(angle => fireWeaponFromPool(angle + Math.PI)); 
    }

    if (shooter === player) {
        const elementsToShake = [gameContainer, gameStats, pauseButton];
        elementsToShake.forEach(el => {
            if (el) {
                el.classList.remove('ui-shake-active');
                void el.offsetWidth;
                el.classList.add('ui-shake-active');
                el.addEventListener('animationend', () => { 
                    el.classList.remove('ui-shake-active'); 
                }, { once: true });
            }
        });
        vibrate(10);
    }
   
    playSound('playerShoot');
}

function createBloodSplatter(x, y) {
    const particleCount = 6;
    const speed = 2 + Math.random() * 2;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        bloodSplatters.push({
            x: x, y: y, 
            dx: Math.cos(angle) * speed + (Math.random() - 0.5),
            dy: Math.sin(angle) * speed + (Math.random() - 0.5),
            size: 2 + Math.random() * 3, 
            spawnTime: Date.now(), 
            lifetime: 800 + Math.random() * 400
        });
    }
}

function createBloodPuddle(x, y, size) {
    if (!sprites.bloodPuddle) return;
    bloodPuddles.push({
        x: x, y: y, initialSize: size * 1.5,
        spawnTime: Date.now(), 
        rotation: Math.random() * Math.PI * 2, 
        lifetime: 10000
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
        upgradeCard.querySelector('button').onclick = () => { 
            applyUpgrade(upgrade); 
            vibrate(10); 
        };
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
        selectedUpgradeIndex = 0;
        
        const firstCard = upgradeOptionsContainer.querySelector('.upgrade-card');
        if (firstCard) firstCard.classList.add('selected');
        
        upgradeMenu.style.display = 'flex';
    }
}

function applyUpgrade(upgrade) {
    playUISound('levelUpSelect');
    
    const upgradeActions = {
        'speed': () => { 
            player.speed *= (1 + upgrade.value); 
            player.originalPlayerSpeed = player.speed; 
        },
        'fireRate': () => { 
            weaponFireInterval = Math.max(50, weaponFireInterval * (1 - upgrade.value)); 
        },
        'magnetRadius': () => { 
            player.magnetRadius *= (1 + upgrade.value); 
        },
        'damage': () => { 
            player.damageMultiplier *= (1 + upgrade.value); 
        },
        'projectileSpeed': () => { 
            player.projectileSpeedMultiplier *= (1 + upgrade.value); 
        },
        'knockback': () => { 
            player.knockbackStrength += upgrade.value; 
        },
        'luck': () => { 
            boxDropChance += upgrade.value; 
            appleDropChance += upgrade.value; 
        }
    };
    
    if (upgradeActions[upgrade.type]) {
        upgradeActions[upgrade.type]();
    }
    
    if (player.upgradeLevels.hasOwnProperty(upgrade.type)) { 
        player.upgradeLevels[upgrade.type]++; 
    }
    updateUpgradeStatsUI(); 

    if (upgradeMenu) {
        levelUpBoxImage.classList.remove('animate');
        levelUpBoxImage.style.display = 'none';
        upgradeMenu.style.display = 'none';
    }
    gamePaused = false;
    isGamepadUpgradeMode = false;
    joystickDirX = 0; 
    joystickDirY = 0; 
    aimDx = 0; 
    aimDy = 0;
    if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)';
    if (firestickCap) firestickCap.style.transform = 'translate(0, 0)';
}