// ================================================================================= //
// ============================= UI.JS ============================================= //
// ================================================================================= //

// --- DOM ELEMENT REFERENCES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
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

const mobileMenuUpgradesButton = document.getElementById('mobileMenuUpgradesButton');
const mobileMenuTrophiesButton = document.getElementById('mobileMenuTrophiesButton');
const mobileMenuCheatsButton = document.getElementById('mobileMenuCheatsButton');

// --- UPGRADE SYSTEM CONSTANTS ---
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

// --- UI UPDATE FUNCTIONS ---

/**
 * Triggers a visual animation on an element.
 * @param {HTMLElement} element - The element to animate.
 * @param {string} animationClass - The CSS class to add for animation.
 * @param {string} [color='#FFFFFF'] - Optional color for text effects.
 */
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

/**
 * Updates all UI stats displays.
 */
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
    if (coinCounterSpan) coinCounterSpan.textContent = enemiesDefeatedCount;
    if (xpBar) xpBar.style.width = `${(player.xp / player.xpToNextLevel) * 100}%`;
}

/**
 * Updates the powerup icons display.
 */
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

/**
 * Updates the upgrade stats display in the pause menu.
 */
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

/**
 * Shows the level-up upgrade menu with 2-3 random options.
 */
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
        selectedUpgradeIndex = 0;
        const firstCard = upgradeOptionsContainer.querySelector('.upgrade-card');
        if (firstCard) {
            firstCard.classList.add('selected');
        }
        upgradeMenu.style.display = 'flex';
    }
}

/**
 * Applies an upgrade choice to the player.
 * @param {object} upgrade - The upgrade configuration object.
 */
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

/**
 * Shows the merchant shop UI with purchase options.
 */
function showMerchantShop() {
    gamePaused = true;
    merchantOptionsContainer.innerHTML = '';
    playUISound('levelUp');

    const options = [];
    
    const canAffordXp = player.appleCount >= 3;
    options.push({
        type: 'xp_for_apples',
        name: "Gain Experience",
        desc: "A hearty meal to fuel your journey.",
        icon: '📈',
        cost: 3,
        currency: 'apples',
        xpAmount: player.xpToNextLevel,
        enabled: canAffordXp
    });

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

/**
 * Handles a purchase from the merchant.
 * @param {object} option - The purchase option selected.
 */
function purchaseFromMerchant(option) {
    playUISound('levelUpSelect');
    vibrate(20);

    if (option.type === 'xp_for_apples') {
        player.appleCount -= option.cost;
        player.xp += option.xpAmount;
        floatingTexts.push({ text: `+${option.xpAmount} XP!`, x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 1500, color: '#00c6ff' });
        if (player.xp >= player.xpToNextLevel) {
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

/**
 * Closes the merchant shop and resumes gameplay.
 */
function closeMerchantShop() {
    merchantShop.style.display = 'none';
    gamePaused = false;
}

/**
 * Displays the map selection screen.
 */
function showMapSelectScreen() {
    difficultyContainer.style.display = 'none';
    mapSelectContainer.style.display = 'block';
    mapTilesContainer.innerHTML = '';

    const mapNames = [
        "Grass Map 1", "Desert Map 1", "Desert Map 2", "Lava Map 1",
        "Lava Map 2", "Desert Map 2", "Ice Map 1", "Grass Map 1", "Ice Map 2"
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

/**
 * Shows the character selection screen.
 */
function showCharacterSelectScreen() {
    difficultyContainer.style.display = 'none';
    characterSelectContainer.style.display = 'block';
    characterTilesContainer.innerHTML = '';

    Object.values(CHARACTERS).forEach(character => {
        let isUnlocked = false;

        if (character.unlockCondition.type === 'start') {
            isUnlocked = true;
        } else if (character.unlockCondition.type === 'achievement') {
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

        tile.innerHTML = `
            <p class="char-emoji">${character.emoji}</p>
            <h4 class="char-name">${character.name}</h4>
            <p class="char-perk">${isUnlocked ? character.perk : 'LOCKED'}</p>
        `;

        if (isUnlocked) {
            tile.addEventListener('click', () => {
                playUISound('levelUpSelect');
                vibrate(10);
                equippedCharacterID = character.id;
                characterSelectContainer.style.display = 'none';
                difficultyContainer.style.display = 'block';
            });
        }

        characterTilesContainer.appendChild(tile);
    });
}

/**
 * Resizes the canvas to maintain aspect ratio.
 */
function resizeCanvas() {
    canvas.width = 1125;
    canvas.height = 676;
    player.x = Math.max(player.size / 2, Math.min(WORLD_WIDTH - player.size / 2, player.x));
    player.y = Math.max(player.size / 2, Math.min(WORLD_HEIGHT - player.size / 2, player.y));
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
