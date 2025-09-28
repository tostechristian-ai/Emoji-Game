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
    'sprites/Background6.png',
    'sprites/Background2.png',
    'sprites/Background3.png',
    'sprites/Background4.png',
    'sprites/Background5.png',
    'sprites/Background8.png',
    'sprites/Background1.png',
    'sprites/Background7.png',
    'sprites/Background9.png'
];
const backgroundImages = new Array(backgroundPaths.length);
const totalBackgrounds = backgroundPaths.length;
const totalAssets = totalSprites + totalAudio + totalBackgrounds;

function assetLoaded() {
    assetsLoadedCount++;
    if (assetsLoadedCount === totalAssets) {
        console.log('All game assets loaded successfully.');
        // These UI interactions will be moved to ui.js later, but depend on assets.
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

// Function to start loading all game assets
function loadAllAssets() {
    for (const [name, path] of Object.entries(spritePaths)) loadSprite(name, path);
    for (const [name, path] of Object.entries(audioPaths)) loadAudio(name, path);
    backgroundPaths.forEach((path, index) => loadBackground(path, index));
}
