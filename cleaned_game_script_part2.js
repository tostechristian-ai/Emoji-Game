// Continuation from where the previous file ended
// Starting with UI utility functions

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
    if (oldLives !== newLivesHTML) { 
        playerLivesIcon.innerHTML = newLivesHTML; 
    }

    const oldXp = currentXpSpan.textContent;
    const newXp = player.xp;
    if(oldXp !== newXp.toString()){
        currentXpSpan.textContent = newXp;
        triggerAnimation(currentXpSpan, 'stat-updated');
    }
    
    const oldRequiredXp = requiredXpSpan.textContent;
    const newRequiredXp = player.xpToNextLevel;
    if(oldRequiredXp !== newRequiredXp.toString()) { 
        requiredXpSpan.textContent = newRequiredXp; 
    }
    
    const oldScore = currentScoreSpan.textContent;
    const newScore = Math.floor(score);
    if(oldScore !== newScore.toString()) { 
        currentScoreSpan.textContent = newScore; 
    }
    
    if (appleCounterSpan) appleCounterSpan.textContent = player.appleCount;
    if (coinCounterSpan) coinCounterSpan.textContent = enemiesDefeatedCount;
    if (xpBar) xpBar.style.width = `${(player.xp / player.xpToNextLevel) * 100}%`;
}

function updatePowerupIconsUI() {
    powerupIconsDiv.innerHTML = '';
    if (shotgunBlastActive) { 
        powerupIconsDiv.innerHTML += '<span>💥</span>';
    } else {
        if (rocketLauncherActive) powerupIconsDiv.innerHTML += '<span>🚀</span>';
        if (vShapeProjectileLevel > 0) powerupIconsDiv.innerHTML += `<span>🕊️${vShapeProjectileLevel > 1 ? `x${vShapeProjectileLevel}` : ''}</span>`;
    }
    if (dogCompanionActive && magneticProjectileActive) { 
        powerupIconsDiv.innerHTML += '<span>🎯🐶</span>';
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
    
    if (powerupIconsDiv.scrollHeight > powerupIconsDiv.clientHeight) { 
        powerupIconsDiv.classList.add('small-icons'); 
    } else { 
        powerupIconsDiv.classList.remove('small-icons'); 
    }
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
            easy: { score: 0, level: 1 }, 
            medium: { score: 0, level: 1 }, 
            hard: { score: 0, level: 1 }
        };
        if (finalScore > highScores[currentDifficulty].score) {
            highScores[currentDifficulty] = { score: finalScore, level: finalLevel };
            localStorage.setItem('highScores', JSON.stringify(highScores));
        }
    } catch (error) { 
        console.error("Could not save high score:", error); 
    }
}

async function endGame() {
    playSound('gameOver');
    vibrate([100, 30, 100]);
    playerStats.totalDeaths++;
    gameOver = true; 
    gamePaused = true; 
    gameActive = false;
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
            if(availableTracks.length === 0) availableTracks = [...backgroundMusicPaths];
            const musicIndex = Math.floor(Math.random() * availableTracks.length);
            const randomMusicPath = availableTracks.splice(musicIndex, 1)[0];

            if (currentBGMPlayer) { 
                currentBGMPlayer.stop(); 
                currentBGMPlayer.dispose(); 
            }
            
            currentBGMPlayer = new Tone.Player({ 
                url: randomMusicPath, 
                loop: true, 
                autostart: false, 
                volume: -10 
            }).toDestination();
            musicVolumeSlider.dispatchEvent(new Event('input'));
            await Tone.loaded();
            startBGM();
            return;
        } catch (error) {
            console.error(`Failed to load music track. Attempt ${i + 1}/${retries}.`, error);
        }
    }
    console.error("Failed to load any background music after multiple retries.");
}

function applyCheats() {
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
}

async function startGame() {
    stopMainMenuBGM();
    if (Tone.context.state !== 'running') { 
        await Tone.start(); 
        console.log("AudioContext started!"); 
    }
    
    if (selectedMapIndex !== -1 && selectedMapIndex < backgroundImages.length) {
        currentBackgroundIndex = selectedMapIndex;
        console.log(`SUCCESS: Using selected map index: ${currentBackgroundIndex}`);
    } else {
        if (backgroundImages.length > 0) {
            currentBackgroundIndex = Math.floor(Math.random() * backgroundImages.length);
            console.log(`RANDOM: No valid map was selected. Using random index: ${currentBackgroundIndex}`);
        }
    }

    await tryLoadMusic();
    
    document.querySelector('.bottom-menu-buttons').style.display = 'none';

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
    if (gameStats) gameStats.style.display = 'block';
    
    if (isMobileDevice) {
        if (movementStickBase) movementStickBase.style.display = 'flex';
        if (firestickBase) firestickBase.style.display = 'flex';
        if (mobileResetButton) mobileResetButton.style.display = 'block';
        cameraZoom = 1.4; 
        zoomToggle.checked = true;
    } else {
        if (movementStickBase) movementStickBase.style.display = 'none';
        if (firestickBase) firestickBase.style.display = 'none';
        if (canvas) canvas.style.cursor = 'none';
        cameraZoom = 1.0; 
        zoomToggle.checked = false;
    }
    isMouseInCanvas = false;
    
    gameActive = true; 
    gameOver = false; 
    gamePaused = false;
    
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
    boxDropChance = 0.01; 
    appleDropChance = 0.05;

    [enemies, pickupItems, appleItems, eyeProjectiles, playerPuddles, snailPuddles, mosquitoPuddles, bombs, floatingTexts, visualWarnings, explosions, blackHoles, bloodSplatters, bloodPuddles, antiGravityPulses, vengeanceNovas, dogHomingShots, destructibles, flameAreas, flies, owlProjectiles, lightningStrikes, smokeParticles].forEach(arr => arr.length = 0);
    
    spawnInitialObstacles();

    score = 0; 
    lastEnemySpawnTime = 0; 
    enemySpawnInterval = 1000;
    lastWeaponFireTime = 0; 
    weaponFireInterval = 400; 
    enemiesDefeatedCount = 0;
    fireRateBoostActive = false; 
    fireRateBoostEndTime = 0; 
    bombEmitterActive = false; 
    orbitingPowerUpActive = false;
    damagingCircleActive = false; 
    lastDamagingCircleDamageTime = 0; 
    lightningProjectileActive = false; 
    lastLightningSpawnTime = 0;
    magneticProjectileActive = false; 
    vShapeProjectileLevel = 0; 
    iceProjectileActive = false; 
    puddleTrailActive = false;
    laserPointerActive = false; 
    autoAimActive = false; 
    explosiveBulletsActive = false; 
    vengeanceNovaActive = false;
    dogCompanionActive = false; 
    antiGravityActive = false; 
    ricochetActive = false; 
    rocketLauncherActive = false;
    blackHoleActive = false; 
    dualGunActive = false; 
    flamingBulletsActive = false; 
    hasDashInvincibility = false;
    lastAntiGravityPushTime = 0; 
    lastBlackHoleTime = 0; 
    shotgunBlastActive = false; 
    doppelgangerActive = false;
    doppelganger = null;
    bugSwarmActive = false; 
    nightOwlActive = false; 
    whirlwindAxeActive = false; 
    lightningStrikeActive = false; 
    owl = null;
    
    dog = { x: player.x, y: player.y, size: 25, state: 'returning', target: null, lastHomingShotTime: 0 };
    player2 = null;
    merchants = [];

    temporalWardActive = false; 
    isTimeStopped = false; 
    timeStopEndTime = 0;
    resetRunStats();
    applyCheats();

    player.x = WORLD_WIDTH / 2; 
    player.y = WORLD_HEIGHT / 2;
    aimDx = 0; 
    aimDy = 0;
    
    updatePowerupIconsUI(); 
    updateUpgradeStatsUI(); 
    updateUIStats();
    
    gameStartText.textContent = "Game Start!";
    gameStartDifficulty.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
    gameStartOverlay.style.display = 'flex';
    setTimeout(() => { 
        gameStartOverlay.style.display = 'none'; 
    }, 2000);

    Tone.Transport.bpm.value = 120;
    gameStartTime = Date.now();
    runStats.startTime = gameStartTime;
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
            easy: { score: 0, level: 1 }, 
            medium: { score: 0, level: 1 }, 
            hard: { score: 0, level: 1 }
        };
        document.getElementById('easyHighScore').textContent = highScores.easy.score;
        document.getElementById('easyHighLevel').textContent = highScores.easy.level;
        document.getElementById('mediumHighScore').textContent = highScores.medium.score;
        document.getElementById('mediumHighLevel').textContent = highScores.medium.level;
        document.getElementById('hardHighScore').textContent = highScores.hard.score;
        document.getElementById('hardHighLevel').textContent = highScores.hard.level;
    } catch (error) { 
        console.error("Could not display high scores:", error); 
    }
}

async function showDifficultyScreen() { 
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
    isMouseInCanvas = false; 
    cameraZoom = 1.0;
}

function togglePause() {
    vibrate(20);
    gamePaused = !gamePaused;
    if (gamePaused) { 
        pauseOverlay.style.display = 'flex'; 
        Tone.Transport.pause(); 
    } else { 
        pauseOverlay.style.display = 'none'; 
        Tone.Transport.start(); 
    }
}

function triggerDash(entity) {
    const now = Date.now();
    if (!entity || entity.isDashing || now - entity.lastDashTime < entity.dashCooldown) {
        return;
    }
    entity.isDashing = true;
    entity.dashEndTime = now + 300;
    entity.lastDashTime = now;
    entity.spinStartTime = now;
    playSound('dodge');
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