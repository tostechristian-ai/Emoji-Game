// ================================================================================= //
// ============================= GAMELOOP.JS ======================================= //
// ================================================================================= //

// --- MAIN GAME FLOW FUNCTIONS ---

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
    merchants = [];

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
    runStats.startTime = gameStartTime;
    lastFrameTime = gameStartTime;
    runStats.lastDamageTime = gameStartTime;
    lastCircleSpawnEventTime = gameStartTime; 
    lastBarrelSpawnTime = gameStartTime;
    lastDoppelgangerSpawnTime = gameStartTime;
    lastMerchantSpawnTime = gameStartTime;
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- POWERUP ACTIVATION ---

function activatePowerup(id) {
    if (id === 'doppelganger') {
        doppelgangerActive = true; 
        runStats.lastDoppelgangerStartTime = Date.now();
        doppelganger = {
            x: player.x - player.size * 2, y: player.y, size: player.size,
            rotationAngle: 0, lastFireTime: 0, endTime: Date.now() + DOPPELGANGER_DURATION
        };
    }
    else if (id === 'dash_invincibility') { hasDashInvincibility = true; }
    else if (id === 'dash_cooldown') { 
        playerData.hasReducedDashCooldown = true; 
        player.dashCooldown = 3000; 
        savePlayerData(); 
    }
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
    else if (id === 'dog_companion') { dogCompanionActive = true; dog.x = player.x; dog.y = player.y; dog.state = 'returning'; }
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

// --- UPDATE LOOP ---

function update() {
    if (gamePaused || gameOver || !gameActive) return;

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
            ref: obj
        });
    }

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
        spawnMerchant();
        lastMerchantSpawnTime = Date.now();
    }

    for (let i = merchants.length - 1; i >= 0; i--) {
        const currentMerchant = merchants[i];
        const dx = player.x - currentMerchant.x;
        const dy = player.y - currentMerchant.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (player.size / 2) + (currentMerchant.size / 2)) {
            showMerchantShop();
            merchants.splice(i, 1);
            break;
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

    const spinDuration = 500;
    if (player.isDashing && player.spinStartTime) {
        if (now < player.spinStartTime + spinDuration) {
            if (moveX > 0) {
                player.spinDirection = 1;
            } else if (moveX < 0) {
                player.spinDirection = -1;
            } else if (player.spinDirection === 0) {
                player.spinDirection = 1;
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

    // Player 2 Controls
    if (player2 && player2.active) {
        let p2VelX = 0; let p2VelY = 0;
        let p2aimDx = 0; let p2aimDy = 0;
        
        if (keys['j']) p2VelX -= player2.speed;
        if (keys['l']) p2VelX += player2.speed;
        if (keys['i']) p2VelY -= player2.speed;
        if (keys['k']) p2VelY += player2.speed;

        if(player2.isDashing && player2.spinStartTime) {
            if (now < player2.spinStartTime + spinDuration) {
                if (p2VelX > 0) {
                    player2.spinDirection = 1;
                } else if (p2VelX < 0) {
                    player2.spinDirection = -1;
                } else if (player2.spinDirection === 0) {
                    player2.spinDirection = 1;
                }
            } else {
                player2.spinStartTime = null;
                player2.spinDirection = 0;
            }
        }

        if(player2.isDashing){
            p2VelX *= 3.5;
            p2VelY *= 3.5;
            if(now > player2.dashEndTime) player2.isDashing = false;
        }
        
        player2.x += p2VelX; 
        player2.y += p2VelY;
        
        if (p2VelX > 0) player2.facing = 'right'; 
        else if (p2VelX < 0) player2.facing = 'left';
        if (p2VelY > 0) player2.facing = 'down'; 
        else if (p2VelY < 0) player2.facing = 'up';
        
        player2.x = Math.max(player2.size / 2, Math.min(WORLD_WIDTH - player2.size / 2, player2.x));
        player2.y = Math.max(player2.size / 2, Math.min(WORLD_HEIGHT - player2.size / 2, player2.y));
        
        if (keys['8']) p2aimDy = -1;
        if (keys['2']) p2aimDy = 1;
        if (keys['4']) p2aimDx = -1;
        if (keys['6']) p2aimDx = 1;
        
        if (keys['7']) { p2aimDx = -1; p2aimDy = -1; }
        if (keys['9']) { p2aimDx = 1; p2aimDy = -1; }
        if (keys['1']) { p2aimDx = -1; p2aimDy = 1; }
        if (keys['3']) { p2aimDx = 1; p2aimDy = 1; }
        
        const p2AimMagnitude = Math.hypot(p2aimDx, p2aimDy);
        if (p2AimMagnitude > 0) {
            p2aimDx /= p2AimMagnitude;
            p2aimDy /= p2AimMagnitude;
            player2.gunAngle = Math.atan2(p2aimDy, p2aimDx);
        }
        
        const p2isShooting = p2aimDx !== 0 || p2aimDy !== 0;
        if (p2isShooting && now - player2.lastFireTime > player2.fireInterval) {
            createPlayer2Weapon();
            player2.lastFireTime = now;
        }
    }

    // Bug Swarm Logic
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

    // Night Owl Logic
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

    // Lightning Strike Logic
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

    // Enemy Spawning
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

    // Enemy Movement & AI
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
                if (enemy.isPaused) { 
                    if (enemy.pauseTimer >= enemy.pauseDuration) { 
                        enemy.isPaused = false; enemy.pauseTimer = 0; 
                    } 
                } else { 
                    moveX += Math.cos(angleToTarget) * effectiveEnemySpeed; 
                    moveY += Math.sin(angleToTarget) * effectiveEnemySpeed; 
                    if (enemy.pauseTimer >= enemy.moveDuration) { 
                        enemy.isPaused = true; enemy.pauseTimer = 0; 
                    } 
                }
                break;
            
            case 'devil': 
                if (now - enemy.lastAxisSwapTime > 500) {
                    enemy.moveAxis = enemy.moveAxis === 'x' ? 'y' : 'x';
                    enemy.lastAxisSwapTime = now;
                }
                if (enemy.moveAxis === 'x') { 
                    moveX += Math.sign(target.x - enemy.x) * effectiveEnemySpeed; 
                } else { 
                    moveY += Math.sign(target.y - enemy.y) * effectiveEnemySpeed; 
                }
                break;
            
            case 'demon':
                if (now - enemy.lastStateChangeTime >= 2000) { 
                    enemy.moveState = (enemy.moveState === 'following') ? 'random' : 'following'; 
                    enemy.lastStateChangeTime = now; 
                    if (enemy.moveState === 'random') { 
                        const randomAngle = Math.random() * Math.PI * 2; 
                        enemy.randomDx = Math.cos(randomAngle); 
                        enemy.randomDy = Math.sin(randomAngle); 
                    } 
                }
                if (enemy.moveState === 'following') { 
                    moveX += Math.cos(angleToTarget) * effectiveEnemySpeed; 
                    moveY += Math.sin(angleToTarget) * effectiveEnemySpeed; 
                } else { 
                    moveX += enemy.randomDx * effectiveEnemySpeed; 
                    moveY += enemy.randomDy * effectiveEnemySpeed; 
                }
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
                const EYE_SAFE_DISTANCE = player.size * 6;
                const EYE_TOO_FAR_DISTANCE = WORLD_WIDTH / 4;
                const EYE_PROJECTILE_SIZE = 15;
                const EYE_PROJECTILE_SPEED = 5.6;
                const EYE_PROJECTILE_LIFETIME = 4000;
                const EYE_PROJECTILE_INTERVAL = 2000;
                const EYE_PROJECTILE_EMOJI = '🧿';
                
                if (distanceToTarget < EYE_SAFE_DISTANCE) { 
                    moveX -= Math.cos(angleToTarget) * effectiveEnemySpeed; 
                    moveY -= Math.sin(angleToTarget) * effectiveEnemySpeed; 
                } else if (distanceToTarget > EYE_TOO_FAR_DISTANCE) { 
                    moveX += Math.cos(angleToTarget) * effectiveEnemySpeed; 
                    moveY += Math.sin(angleToTarget) * effectiveEnemySpeed; 
                } else { 
                    if (now - enemy.lastEyeProjectileTime > EYE_PROJECTILE_INTERVAL) { 
                        eyeProjectiles.push({ 
                            x: enemy.x, y: enemy.y, size: EYE_PROJECTILE_SIZE, 
                            emoji: EYE_PROJECTILE_EMOJI, speed: EYE_PROJECTILE_SPEED, 
                            dx: Math.cos(angleToTarget) * EYE_PROJECTILE_SPEED, 
                            dy: Math.sin(angleToTarget) * EYE_PROJECTILE_SPEED, 
                            lifetime: now + EYE_PROJECTILE_LIFETIME 
                        }); 
                        enemy.lastEyeProjectileTime = now; 
                        playSound('playerShoot'); 
                    } 
                }
                break;
            
            case 'vampire':
                const VAMPIRE_DODGE_DETECTION_RADIUS = 200;
                const VAMPIRE_DODGE_STRENGTH = 1.5;
                let dodgeVectorX = 0, dodgeVectorY = 0;
                
                for (const weapon of weaponPool) {
                    if(weapon.active) {
                        const distSq = (enemy.x - weapon.x)**2 + (enemy.y - weapon.y)**2;
                        if (distSq < VAMPIRE_DODGE_DETECTION_RADIUS * VAMPIRE_DODGE_DETECTION_RADIUS) {
                            if ((weapon.dx * (enemy.x - weapon.x)) + (weapon.dy * (enemy.y - weapon.y)) > 0) {
                                const perpDx = -weapon.dy, perpDy = weapon.dx;
                                const normalizeFactor = Math.sqrt(perpDx * perpDx + perpDy * perpDy);
                                if (normalizeFactor > 0) { 
                                    dodgeVectorX += (perpDx / normalizeFactor); 
                                    dodgeVectorY += (perpDy / normalizeFactor); 
                                }
                            }
                        }
                    }
                }
                
                const dodgeMagnitude = Math.sqrt(dodgeVectorX * dodgeVectorX + dodgeVectorY * dodgeVectorY);
                if (dodgeMagnitude > 0) { 
                    dodgeVectorX = (dodgeVectorX / dodgeMagnitude) * VAMPIRE_DODGE_STRENGTH; 
                    dodgeVectorY = (dodgeVectorY / dodgeMagnitude) * VAMPIRE_DODGE_STRENGTH; 
                }
                moveX += (Math.cos(angleToTarget) * effectiveEnemySpeed) + dodgeVectorX;
                moveY += (Math.sin(angleToTarget) * effectiveEnemySpeed) + dodgeVectorY;
                break;
            
            case 'mosquito':
                const MOSQUITO_DIRECTION_UPDATE_INTERVAL = 3000;
                if (!enemy.currentMosquitoDirection || (now - enemy.lastDirectionUpdateTime > MOSQUITO_DIRECTION_UPDATE_INTERVAL)) { 
                    enemy.lastDirectionUpdateTime = now; 
                    enemy.currentMosquitoDirection = { 
                        dx: Math.cos(angleToTarget), 
                        dy: Math.sin(angleToTarget) 
                    }; 
                }
                moveX += enemy.currentMosquitoDirection.dx * effectiveEnemySpeed;
                moveY += enemy.currentMosquitoDirection.dy * effectiveEnemySpeed;
                
                if (now - enemy.lastPuddleSpawnTime > MOSQUITO_PUDDLE_SPAWN_INTERVAL) { 
                    mosquitoPuddles.push({ 
                        x: enemy.x, y: enemy.y, size: MOSQUITO_PUDDLE_SIZE, 
                        spawnTime: now, lifetime: MOSQUITO_PUDDLE_LIFETIME 
                    }); 
                    enemy.lastPuddleSpawnTime = now; 
                }
                break;
            
            case 'snail':
                moveX += Math.cos(enemy.directionAngle) * effectiveEnemySpeed;
                moveY += Math.sin(enemy.directionAngle) * effectiveEnemySpeed;
                
                if (enemy.x < 0 || enemy.x > WORLD_WIDTH || enemy.y < 0 || enemy.y > WORLD_HEIGHT) {
                   enemy.directionAngle = Math.random() * 2 * Math.PI;
                }
                
                if (now - enemy.lastPuddleSpawnTime > PLAYER_PUDDLE_SPAWN_INTERVAL * 2) {
                    snailPuddles.push({ 
                        x: enemy.x, y: enemy.y, size: PLAYER_PUDDLE_SIZE, 
                        spawnTime: now, lifetime: PLAYER_PUDDLE_LIFETIME * 2 
                    });
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

    // Enemy Separation & Obstacle Avoidance
    const finalMovements = new Map();
    enemies.forEach(e1 => {
        let totalMove = enemyMovements.get(e1);
        if (!totalMove) return;

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

        finalMovements.set(e1, {
            finalX: totalMove.moveX + repulsionX,
            finalY: totalMove.moveY + repulsionY
        });
    });
    
    // Apply Final Enemy Movement
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

        // Enemy Collision with Players
        const canGhostDamage = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);
        const combinedRadius = (player.size / 2) + (enemy.size / 2) - 5.6;
        const dx_player = player.x - enemy.x;
        const dy_player = player.y - enemy.y;

        if (canGhostDamage && !player.isInvincible && !cheats.god_mode && (dx_player*dx_player + dy_player*dy_player) < combinedRadius*combinedRadius) {
            player.lives--;
            runStats.lastDamageTime = now;
            createBloodSplatter(player.x, player.y); 
            createBloodPuddle(player.x, player.y, player.size);
            vibrate(50); 
            playSound('playerScream');
            isPlayerHitShaking = true; 
            playerHitShakeStartTime = now;
            if (vengeanceNovaActive) { 
                vengeanceNovas.push({ 
                    x: player.x, y: player.y, startTime: now, 
                    duration: 500, maxRadius: player.size * 3 
                }); 
            }
            if (temporalWardActive) { 
                isTimeStopped = true; 
                timeStopEndTime = now + 2000; 
                playSound('levelUpSelect'); 
            }
            if (player.lives <= 0) { endGame(); }
            handleEnemyDeath(enemy);
        }

        if (canGhostDamage && player2 && player2.active) {
            const combinedRadiusP2 = (player2.size / 2) + (enemy.size / 2);
            const dx_p2 = player2.x - enemy.x;
            const dy_p2 = player2.y - enemy.y;
            if((dx_p2*dx_p2 + dy_p2*dy_p2) < combinedRadiusP2*combinedRadiusP2) {
                player2.active = false; 
                playSound('playerScream');
                createBloodSplatter(player2.x, player2.y); 
                createBloodPuddle(player2.x, player2.y, player2.size);
                handleEnemyDeath(enemy);
            }
        }

        if (canGhostDamage && doppelganger) {
            const combinedRadiusDop = (doppelganger.size / 2) + (enemy.size / 2);
            const dx_dop = doppelganger.x - enemy.x;
            const dy_dop = doppelganger.y - enemy.y;
            if((dx_dop*dx_dop + dy_dop*dy_dop) < combinedRadiusDop*combinedRadiusDop) {
                createBloodSplatter(doppelganger.x, doppelganger.y); 
                createBloodPuddle(doppelganger.x, doppelganger.y, doppelganger.size);
                doppelganger = null; 
                doppelgangerActive = false;
                runStats.lastDoppelgangerStartTime = 0;
                updatePowerupIconsUI(); 
                handleEnemyDeath(enemy);
            }
        }
    });

    // Doppelganger Logic
    if (doppelganger) {
        if (now > doppelganger.endTime) {
            doppelganger = null; 
            doppelgangerActive = false;
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

    // Dog Companion Logic
    if (dogCompanionActive && !isTimeStopped) {
        const DOG_SPEED = baseEnemySpeed * 1.15;
        if (dog.state === 'returning') {
            const dx = player.x - dog.x;
            const dy = player.y - dog.y;
            if (dx*dx + dy*dy < (player.size/2)**2) { 
                dog.state = 'seeking'; 
                dog.target = null; 
            } else {
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
            dogHomingShots.push(shot); 
            dog.lastHomingShotTime = now; 
            playSound('playerShoot');
        }
    }

    // Pickup Collection
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
                    floatingTexts.push({ 
                        text: powerupName + "!", x: player.x, y: player.y - player.size, 
                        startTime: now, duration: 1500 
                    });
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

    // Apple Collection
    for (let i = appleItems.length - 1; i >= 0; i--) {
        const apple = appleItems[i];
        if (now - apple.spawnTime > apple.lifetime) { 
            appleItems.splice(i, 1); 
            continue; 
        }
        
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
                floatingTexts.push({ 
                    text: "Max Life +1!", x: player.x, y: player.y - player.size, 
                    startTime: now, duration: 1500 
                });
            }
            player.lives = player.maxLives;
            fireRateBoostActive = true;
            fireRateBoostEndTime = now + FIRE_RATE_BOOST_DURATION;
            playSound('xpPickup');
            updateUIStats();
            appleItems.splice(i, 1);
        }
    }

    // Player Weapon Firing
    let currentFireInterval = weaponFireInterval;
    if(fireRateBoostActive) currentFireInterval /= 2;
    if(cheats.fastShooting) currentFireInterval /= 5;
    if(cheats.double_game_speed) currentFireInterval /= 2;
    currentFireInterval = Math.max(50, currentFireInterval);
    
    if (!cheats.no_gun_mode && (aimDx !== 0 || aimDy !== 0) && (now - lastWeaponFireTime > currentFireInterval)) {
        createWeapon();
        lastWeaponFireTime = now;
    }

    // Weapon Movement & Homing
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

    // Weapon vs Destructibles
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

    // Weapon vs Enemies (Using Quadtree)
    for (const weapon of weaponPool) {
        if (!weapon.active) continue;

        const weaponBounds = {
            x: weapon.x - weapon.size / 2,
            y: weapon.y - weapon.size / 2,
            width: weapon.size,
            height: weapon.size
        };
        
        const nearbyObjects = quadtree.retrieve(weaponBounds);

        for (const targetObject of nearbyObjects) {
            const enemy = targetObject.ref;

            if (!enemy || !enemy.health || enemy.isHit) {
                continue;
            }

            const canGhostBeHit = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);

            if (canGhostBeHit && !weapon.hitEnemies.includes(enemy)) {
                const dx = weapon.x - enemy.x;
                const dy = weapon.y - enemy.y;
                const combinedRadius = (weapon.size / 2) + (enemy.size / 2);

                if (dx * dx + dy * dy < combinedRadius * combinedRadius) {
                    
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
                            if (explosiveBulletsActive) { 
                                explosions.push({ 
                                    x: weapon.x, y: weapon.y, radius: enemy.size * 2, 
                                    startTime: Date.now(), duration: 300 
                                }); 
                            }
                            const angle = Math.atan2(newTarget.y - weapon.y, newTarget.x - weapon.x);
                            weapon.angle = angle;
                            weapon.dx = Math.cos(angle) * weapon.speed;
                            weapon.dy = Math.sin(angle) * weapon.speed;
                        } else { weapon.active = false; }
                    } else { weapon.active = false; }

                    if (!weapon.active) {
                        break;
                    }
                }
            }
        }
    }

    // Bomb System
    if (bombEmitterActive && now - lastBombEmitMs >= BOMB_INTERVAL_MS) {
        bombs.push({ x: player.x, y: player.y, size: BOMB_SIZE, spawnTime: now });
        lastBombEmitMs = now;
    }
    
    for (let b = bombs.length - 1; b >= 0; b--) {
        const bomb = bombs[b];
        if (now - bomb.spawnTime > BOMB_LIFETIME_MS) { 
            bombs.splice(b, 1); 
            continue; 
        }
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

    // Orbiting Powerup
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

    // Whirlwind Axe
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

    // Damaging Circle
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

    // Lightning Projectile
    if (lightningProjectileActive && now - lastLightningSpawnTime > LIGHTNING_SPAWN_INTERVAL) {
        let closestEnemy = null, minDistanceSq = Infinity;
        enemies.forEach(enemy => {
            if (enemy.isHit || (enemy.isFrozen && now < enemy.freezeEndTime)) return;
            const distSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
            if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
        });
        if (closestEnemy) {
            const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
            lightningBolts.push({ 
                x: player.x, y: player.y, size: LIGHTNING_SIZE, emoji: LIGHTNING_EMOJI, 
                speed: 5.6, dx: Math.cos(angle) * 5.6, dy: Math.sin(angle) * 5.6, 
                angle: angle, isHit: false, lifetime: now + 2000 
            });
            playSound('playerShoot');
        }
        lastLightningSpawnTime = now;
    }
    
    // Lightning Bolt Movement & Collision
    for (let i = lightningBolts.length - 1; i >= 0; i--) {
        const bolt = lightningBolts[i];
        bolt.x += bolt.dx; 
        bolt.y += bolt.dy;
        if (now > bolt.lifetime) bolt.isHit = true;
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = bolt.x - enemy.x;
            const dy = bolt.y - enemy.y;
            if (!enemy.isHit && !bolt.isHit && (dx*dx + dy*dy) < ((bolt.size / 2) + (enemy.size / 2))**2) {
                enemy.health -= player.damageMultiplier; 
                bolt.isHit = true; 
                createBloodSplatter(enemy.x, enemy.y);
                if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                break;
            }
        }
    }
    lightningBolts = lightningBolts.filter(bolt => !bolt.isHit);

    // Sword Swing
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
        player.currentSwordSwing = { 
            x: player.x, y: player.y, angle: swordAngle, 
            activeUntil: now + SWORD_SWING_DURATION, startTime: now 
        };
        playSwordSwingSound();
        
        const SWORD_THRUST_DISTANCE = player.size * 0.7;
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

    // Eye Projectiles
    for (let i = eyeProjectiles.length - 1; i >= 0; i--) {
        const eyeProj = eyeProjectiles[i];
        eyeProj.x += eyeProj.dx; 
        eyeProj.y += eyeProj.dy;
        if (now > eyeProj.lifetime) eyeProj.isHit = true;
        
        const dx = player.x - eyeProj.x;
        const dy = player.y - eyeProj.y;
        if (!player.isInvincible && (dx*dx + dy*dy) < ((player.size / 2) + (eyeProj.size / 2))**2 && !eyeProj.isHit) {
            player.lives--; 
            runStats.lastDamageTime = now;
            createBloodSplatter(player.x, player.y); 
            createBloodPuddle(player.x, player.y, player.size);
            playSound('playerScream'); 
            playEyeProjectileHitSound(); 
            updateUIStats(); 
            eyeProj.isHit = true;
            isPlayerHitShaking = true; 
            playerHitShakeStartTime = now;
            if (player.lives <= 0) endGame();
        }
    }

    // Puddle Trail
    if (puddleTrailActive && now - lastPlayerPuddleSpawnTime > PLAYER_PUDDLE_SPAWN_INTERVAL) {
        playerPuddles.push({ 
            x: player.x, y: player.y, size: PLAYER_PUDDLE_SIZE, 
            spawnTime: now, lifetime: PLAYER_PUDDLE_LIFETIME 
        });
        lastPlayerPuddleSpawnTime = now;
    }

    // Anti-Gravity Pulse
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
    
    // Black Hole
    if (blackHoleActive && !isTimeStopped && now - lastBlackHoleTime > BLACK_HOLE_INTERVAL) {
        blackHoles.push({
            x: player.x, y: player.y, spawnTime: now, 
            lifetime: BLACK_HOLE_DELAY + BLACK_HOLE_PULL_DURATION,
            radius: BLACK_HOLE_RADIUS, pullStrength: BLACK_HOLE_PULL_STRENGTH
        });
        lastBlackHoleTime = now;
    }

    for (let i = blackHoles.length - 1; i >= 0; i--) {
        const hole = blackHoles[i];
        if (now - hole.spawnTime > hole.lifetime) { 
            blackHoles.splice(i, 1); 
            continue; 
        }
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

    // Clean Up Arrays
    for (let i = playerPuddles.length - 1; i >= 0; i--) { 
        if (now - playerPuddles[i].spawnTime > playerPuddles[i].lifetime) playerPuddles.splice(i, 1); 
    }
    for (let i = snailPuddles.length - 1; i >= 0; i--) { 
        if (now - snailPuddles[i].spawnTime > snailPuddles[i].lifetime) snailPuddles.splice(i, 1); 
    }
    for (let i = mosquitoPuddles.length - 1; i >= 0; i--) { 
        if (now - mosquitoPuddles[i].spawnTime > mosquitoPuddles[i].lifetime) mosquitoPuddles.splice(i, 1); 
    }
    for (let i = bloodSplatters.length - 1; i >= 0; i--) {
        const p = bloodSplatters[i];
        if (now - p.spawnTime > p.lifetime) { 
            bloodSplatters.splice(i, 1); 
            continue; 
        }
        p.x += p.dx; 
        p.y += p.dy; 
        p.dx *= 0.96; 
        p.dy *= 0.96; 
    }
    for (let i = bloodPuddles.length - 1; i >= 0; i--) { 
        if (now - bloodPuddles[i].spawnTime > bloodPuddles[i].lifetime) { 
            bloodPuddles.splice(i, 1); 
        } 
    }

    // Dog Homing Shots
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
        shot.x += shot.dx; 
        shot.y += shot.dy;
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

    // Flame Areas
    for (let i = flameAreas.length - 1; i >= 0; i--) {
        const area = flameAreas[i];
        if (now > area.endTime) { 
            flameAreas.splice(i, 1); 
            continue; 
        }
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

    // Flies
    for (let i = flies.length - 1; i >= 0; i--) {
        const fly = flies[i];
        if (fly.isHit || enemies.length === 0) { 
            flies.splice(i, 1); 
            continue; 
        }
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

    // Owl Projectiles
    for (let i = owlProjectiles.length - 1; i >= 0; i--) {
        const proj = owlProjectiles[i];
        proj.x += proj.dx; 
        proj.y += proj.dy;
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

    // Smoke Particles
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.02;
        if (p.alpha <= 0) {
            smokeParticles.splice(i, 1);
        }
    }

    // Clean Up Filtered Arrays
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

// --- DRAW LOOP ---

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
    
    // Draw destructibles
    destructibles.forEach(obs => {
        if(obs.health !== Infinity) ctx.globalAlpha = 0.5 + (obs.health / obs.maxHealth) * 0.5;
        const preRendered = preRenderedEntities[obs.emoji];
        if(preRendered) {
            ctx.drawImage(preRendered, obs.x - preRendered.width / 2, obs.y - preRendered.height / 2);
        }
        ctx.globalAlpha = 1.0;
    });

    // Draw flame areas
    flameAreas.forEach(area => {
        const age = now - area.startTime;
        const lifeRatio = age / (area.endTime - area.startTime);
        const alpha = 1 - lifeRatio;
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#1a1a1a';
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

    // Draw blood splatters
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

    // Draw damaging circle
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

    // Draw player puddles
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

    // Draw mosquito puddles
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
    
    // Draw blood puddles
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

    // Draw anti-gravity pulses
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

    // Draw black holes
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
    
    // Draw smoke particles
    smokeParticles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.font = `${p.size}px sans-serif`;
        ctx.fillText('💨', p.x, p.y);
        ctx.restore();
    });

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.save();
        if (enemy.emoji === '👻') {
            ctx.globalAlpha = enemy.isVisible ? 1.0 : 0.2;
        }
        if (enemy.isFrozen) ctx.filter = 'saturate(0.5) brightness(1.5) hue-rotate(180deg)';
        if (enemy.isSlowedByPuddle) ctx.filter = 'saturate(2) brightness(0.8)';
