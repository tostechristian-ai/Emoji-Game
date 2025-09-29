// ================================================================================= //
// ============================= ASSETS.JS ========================================= //
// ================================================================================= //

// --- GLOBAL ASSET CONTAINERS AND COUNTERS ---
const preRenderedEntities = {};
const sprites = {};
const audioPlayers = {};

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
    'sprites/Background6.png', // Map 1: Grassy
    'sprites/Background2.png', // Map 2: Sandy
    'sprites/Background3.png', // Map 3: Rocky
    'sprites/Background4.png', // Map 4: Purple
    'sprites/Background5.png', // Map 5: Molten Lava
    'sprites/Background8.png', // Map 6: Orange Dirt
    'sprites/Background1.png', // Map 7: Grey Stone
    'sprites/Background7.png', // Map 8: Other Grassy
    'sprites/Background9.png'  // Map 9: Other Stone
];

const backgroundMusicPaths = [
    'audio/background_music.mp3',  'audio/background_music2.mp3',
    'audio/background_music3.mp3', 'audio/background_music4.mp3', 'audio/background_music5.mp3',
    'audio/background_music6.mp3', 'audio/background_music7.mp3', 'audio/background_music8.mp3',
    'audio/background_music9.mp3', 'audio/background_music10.mp3', 'audio/background_music11.mp3',
];

let assetsLoadedCount = 0;
const totalSprites = Object.keys(spritePaths).length;
const totalAudio = Object.keys(audioPaths).length;
const backgroundImages = new Array(backgroundPaths.length);
const totalBackgrounds = backgroundPaths.length;
const totalAssets = totalSprites + totalAudio + totalBackgrounds;


// --- OPTIMIZATION: PRE-RENDERING SYSTEM ---

/**
 * Renders an emoji to an offscreen canvas for performance.
 * @param {string} emoji - The emoji character to render.
 * @param {number} size - The font size to render the emoji at.
 */
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

/**
 * Initializes all pre-rendered emoji canvases.
 */
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

// --- ASSET LOADING LOGIC ---

/**
 * Increments the asset loaded counter and initializes the game when all assets are loaded.
 */
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

/**
 * Loads a single sprite image.
 * @param {string} name - The key to store the sprite under in the `sprites` object.
 * @param {string} path - The file path to the image.
 */
function loadSprite(name, path) {
    const img = new Image();
    img.src = path;
    img.onload = () => {
        sprites[name] = img;
        assetLoaded();
    };
    img.onerror = () => console.error(`Failed to load sprite: ${path}`);
}

/**
 * Loads a single audio file into a Tone.js Player.
 * @param {string} name - The key to store the player under in the `audioPlayers` object.
 * @param {string} path - The file path to the audio file.
 */
function loadAudio(name, path) {
    const player = new Tone.Player({
        url: path,
        autostart: false,
        loop: name === 'mainMenu',
        onload: assetLoaded
    }).toDestination();
    audioPlayers[name] = player;
}

/**
 * Loads a single background image.
 * @param {string} path - The file path to the image.
 * @param {number} index - The index to store the image at in the `backgroundImages` array.
 */
function loadBackground(path, index) {
    const img = new Image();
    img.src = path;
    img.onload = () => {
        backgroundImages[index] = img;
        assetLoaded();
    };
    img.onerror = () => console.error(`Failed to load background: ${path}`);
}

// --- INITIATE ASSET LOADING ---
for (const [name, path] of Object.entries(spritePaths)) loadSprite(name, path);
for (const [name, path] of Object.entries(audioPaths)) loadAudio(name, path);
backgroundPaths.forEach((path, index) => loadBackground(path, index));
