
// Simulation + rendering (UI wiring is in `game_bootstrap_ui.js`,
// merchant + powerup activation is in `game_merchant_powerups.js`).

        function update() {
    if (gamePaused || gameOver || !gameActive) return;

    // Frame counter for throttling expensive per-enemy checks
    if (!update._frame) update._frame = 0;
    update._frame = (update._frame + 1) % 6;

    // *** OPTIMIZATION: Clear and repopulate the Quadtree each frame ***
    quadtree.clear();
    // Insert directly without building a temp array
    for (let i = 0; i < enemies.length; i++) {
        const obj = enemies[i];
        quadtree.insert({ x: obj.x - obj.size/2, y: obj.y - obj.size/2, width: obj.size, height: obj.size, ref: obj });
    }
    for (let i = 0; i < destructibles.length; i++) {
        const obj = destructibles[i];
        quadtree.insert({ x: obj.x - obj.size/2, y: obj.y - obj.size/2, width: obj.size, height: obj.size, ref: obj });
    }
    quadtree.insert({ x: player.x - player.size/2, y: player.y - player.size/2, width: player.size, height: player.size, ref: player });
    if (player2 && player2.active) quadtree.insert({ x: player2.x - player2.size/2, y: player2.y - player2.size/2, width: player2.size, height: player2.size, ref: player2 });
    if (doppelganger) quadtree.insert({ x: doppelganger.x - doppelganger.size/2, y: doppelganger.y - doppelganger.size/2, width: doppelganger.size, height: doppelganger.size, ref: doppelganger });
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
            // Throttle achievement checks to once per second — no need every frame
            if (!update._lastAchievementCheck || now - update._lastAchievementCheck > 1000) {
                checkAchievements();
                update._lastAchievementCheck = now;
            }
            
            if (Date.now() - lastMerchantSpawnTime >= MERCHANT_SPAWN_INTERVAL) {
    spawnMerchant(player.x + 200, player.y); 
    lastMerchantSpawnTime = Date.now(); // Reset the timer right after spawning
}

// Loop through all active merchants to check for collision.
for (let i = merchants.length - 1; i >= 0; i--) {
    const currentMerchant = merchants[i];
    const dx = player.x - currentMerchant.x;
    const dy = player.y - currentMerchant.y;
    const combinedR = (player.size / 2) + (currentMerchant.size / 2);
    if (dx * dx + dy * dy < combinedR * combinedR) {
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

            if (now - lastBarrelSpawnTime > 20000) {
                spawnRandomBarrel();
                if (Math.random() < 0.5) spawnRandomBarrel(); // occasionally spawn 2
                spawnRandomBrick(); // always spawn a brick wall too
                lastBarrelSpawnTime = now;
            }
            


            let moveX = 0; let moveY = 0; let isMoving = false;
            if (keys['ArrowUp'] || keys['w']) moveY -= 1;
            if (keys['ArrowDown'] || keys['s']) moveY += 1;
            if (keys['ArrowLeft'] || keys['a']) moveX -= 1;
            if (keys['ArrowRight'] || keys['d']) moveX += 1;

            if (moveX === 0 && moveY === 0) { moveX = joystickDirX; moveY = joystickDirY; }

            // Mirror mode: flip horizontal movement
            if (cheats.mirror_mode) moveX = -moveX;

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
            if (cheats.slow_mo_mode) currentPlayerSpeed *= 0.5;
            if (cheats.infinite_dash) player.dashCooldown = 0;


            if(player.isDashing) {
                currentPlayerSpeed *= 3.5;
                if(now > player.dashEndTime) {
                    player.isDashing = false;
                    player.isInvincible = false;
                    // Explosive player: explode at end of dash
                    if (cheats.explosive_player) {
                        const blastRadius = player.size * 3;
                        explosions.push({ x: player.x, y: player.y, radius: blastRadius, startTime: now, duration: 300 });
                        for (let ei = enemies.length - 1; ei >= 0; ei--) {
                            const en = enemies[ei];
                            const dx = en.x - player.x, dy = en.y - player.y;
                            if (dx*dx + dy*dy < blastRadius*blastRadius) {
                                en.health -= player.damageMultiplier * 2;
                                createBloodSplatter(en.x, en.y);
                                if (en.health <= 0) handleEnemyDeath(en);
                            }
                        }
                    }
                } else {
                    if (hasDashInvincibility) player.isInvincible = true;
                    // Spawn dash smoke emoji — throttled to every 80ms, hard cap 15
                    if (smokeParticles.length < 15 && (!player._lastDashSmoke || now - player._lastDashSmoke > 80)) {
                        smokeParticles.push({
                            x: player.x + (Math.random() - 0.5) * player.size * 0.5,
                            y: player.y + (Math.random() - 0.5) * player.size * 0.5,
                            dx: (Math.random() - 0.5) * 0.4,
                            dy: (Math.random() - 0.5) * 0.4,
                            size: 12 + Math.random() * 6, alpha: 0.7,
                        });
                        player._lastDashSmoke = now;
                    }
                }
            }

            player.isSlowedByMosquitoPuddle = false;
            player.isSlowedBySpiderWeb = false; // Add spider web slowing check
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

            // Check spider web slowing
            for (const web of spiderWebs) {
                const dx = player.x - web.x;
                const dy = player.y - web.y;
                if (dx*dx + dy*dy < ((player.size / 2) + (web.size / 2))**2) {
                    currentPlayerSpeed *= SPIDER_WEB_SLOW_FACTOR;
                    player.isSlowedBySpiderWeb = true;
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
                // Throttle auto-aim scan to every 3 frames
                if (update._frame % 3 === 0) {
                    let closestEnemy = null; let minDistanceSq = Infinity;
                    for (let ai = 0; ai < enemies.length; ai++) {
                        const enemy = enemies[ai];
                        if (!enemy.isHit) {
                            const distSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
                            if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                        }
                    }
                    if (closestEnemy) {
                        const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
                        player.rotationAngle = angle;
                        if (angle > -Math.PI / 4 && angle <= Math.PI / 4) player.facing = 'right';
                        else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) player.facing = 'down';
                        else if (angle > 3 * Math.PI / 4 || angle <= -3 * Math.PI / 4) player.facing = 'left';
                        else player.facing = 'up';
                    }
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
                        
                        // Damage number
                        if (floatingTexts.length < 30) {
                            floatingTexts.push({
                                text: String(LIGHTNING_STRIKE_DAMAGE),
                                x: targetEnemy.x + (Math.random() - 0.5) * targetEnemy.size,
                                y: targetEnemy.y - targetEnemy.size * 0.5,
                                startTime: now, duration: 600,
                                color: '#ffff00', fontSize: 14
                            });
                        }
                        
                        if (targetEnemy.health <= 0) { handleEnemyDeath(targetEnemy); }
                        lastLightningStrikeTime = now;
                    }
                }
            }

            // Ice Shard Cannon — fires 3 snowflake shards in a spread, freezes on hit
            if (iceShardCannonActive && !isTimeStopped && now - lastIceShardTime > ICE_SHARD_INTERVAL) {
                let shardTarget = null; let minDist = Infinity;
                for (let si = 0; si < enemies.length; si++) {
                    const e = enemies[si];
                    if (!e.isHit && !e.isFrozen) {
                        const d = (player.x - e.x)**2 + (player.y - e.y)**2;
                        if (d < minDist) { minDist = d; shardTarget = e; }
                    }
                }
                if (shardTarget) {
                    const baseAngle = Math.atan2(shardTarget.y - player.y, shardTarget.x - player.x);
                    const spread = Math.PI / 10;
                    for (let si = -1; si <= 1; si++) {
                        const angle = baseAngle + si * spread;
                        for (const w of weaponPool) {
                            if (!w.active) {
                                w.x = player.x; w.y = player.y;
                                w.size = 20 * player.projectileSizeMultiplier;
                                w.speed = 6 * player.projectileSpeedMultiplier;
                                w.angle = angle;
                                w.dx = Math.cos(angle) * w.speed;
                                w.dy = Math.sin(angle) * w.speed;
                                w.lifetime = now + 2000;
                                w.hitsLeft = 1;
                                w.hitEnemies.length = 0;
                                w.owner = 'player';
                                w.active = true;
                                w._isIceShard = true;
                                break;
                            }
                        }
                    }
                    playSound('playerShoot');
                    lastIceShardTime = now;
                }
            }


            // Enemy cap: scales with difficulty. Hard allows up to 150, medium 120, easy 80.
            // Also scales slightly with powerups collected to keep challenge proportional.
            const baseCap = currentDifficulty === 'hard' ? 100 : currentDifficulty === 'medium' ? 80 : 60;
            const powerupPressure = Math.floor(player.boxPickupsCollectedCount / 5);
            let enemySpawnCap = cheats.noSpawnCap ? Infinity : Math.min(baseCap + powerupPressure, 160);
            
            // Horde mode: double the spawn cap
            if (cheats.horde_mode) {
                enemySpawnCap = cheats.noSpawnCap ? Infinity : enemySpawnCap * 2;
            }

            // Rain of bullets cheat: drop bullets from sky every second
            if (cheats.rain_of_bullets && !isTimeStopped) {
                if (!update._lastRainBulletTime) update._lastRainBulletTime = 0;
                if (now - update._lastRainBulletTime > 1000) {
                    for (let rb = 0; rb < 5; rb++) {
                        const rx = player.x + (Math.random() - 0.5) * 400;
                        const ry = player.y - 300;
                        for(const weapon of weaponPool) {
                            if(!weapon.active) {
                                weapon.x = rx; weapon.y = ry;
                                weapon.size = 38; weapon.speed = 6;
                                weapon.angle = Math.PI / 2;
                                weapon.dx = 0; weapon.dy = 6;
                                weapon.lifetime = now + 2000;
                                weapon.hitsLeft = 1;
                                weapon.hitEnemies.length = 0;
                                weapon.owner = 'player';
                                weapon.active = true;
                                break;
                            }
                        }
                    }
                    update._lastRainBulletTime = now;
                }
            }

            // Coin rain cheat: drop coins from sky randomly
            if (cheats.coin_rain) {
                if (!update._lastCoinRainTime) update._lastCoinRainTime = 0;
                if (now - update._lastCoinRainTime > 2000) {
                    for (let cr = 0; cr < 3; cr++) {
                        const cx = player.x + (Math.random() - 0.5) * 600;
                        const cy = player.y + (Math.random() - 0.5) * 400;
                        createPickup(cx, cy, COIN_EMOJI, COIN_SIZE, COIN_XP_VALUE);
                    }
                    update._lastCoinRainTime = now;
                }
            }
            let currentEnemySpawnInterval = enemySpawnInterval / Math.pow(1.3, player.boxPickupsCollectedCount) * (1 - 0.01 * (player.level - 1));
            currentEnemySpawnInterval *= 0.5; // 2x spawn rate
            // Hard mode spawns faster to fill the higher cap
            if (currentDifficulty === 'hard') currentEnemySpawnInterval *= 0.65;
            else if (currentDifficulty === 'medium') currentEnemySpawnInterval *= 0.82;
            currentEnemySpawnInterval = Math.max(currentDifficulty === 'hard' ? 50 : 80, currentEnemySpawnInterval);
            
            // Horde mode: double the spawn rate (half the interval)
            if (cheats.horde_mode) {
                currentEnemySpawnInterval *= 0.5;
            }
            
            if (player.level > 0 && player.level % BOSS_SPAWN_INTERVAL_LEVELS === 0 && player.level !== lastBossLevelSpawned) {
                createBoss();
                lastBossLevelSpawned = player.level;
            }
            if (enemies.length < enemySpawnCap && now - lastEnemySpawnTime > currentEnemySpawnInterval) {
                if (cheats.boss_rush_mode) { createBoss(); } else { createEnemy(); }
                lastEnemySpawnTime = now;
            }
            
            enemies.forEach((enemy, enemyIdx) => {
                if (isTimeStopped) return;

                if (enemy.isIgnited) {
                    if (now > enemy.ignitionEndTime) { enemy.isIgnited = false; }
                    else {
                        // Smoke from ignited enemies — throttled, capped, simple circles
                        if (smokeParticles.length < 50 && !enemy._lastSmoke || now - enemy._lastSmoke > 300) {
                            smokeParticles.push({
                                x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                y: enemy.y - enemy.size * 0.3,
                                dx: (Math.random() - 0.5) * 0.4, dy: -0.5 - Math.random() * 0.5,
                                size: 6 + Math.random() * 4, alpha: 0.5
                            });
                            enemy._lastSmoke = now;
                        }
                        if (now - enemy.lastIgnitionDamageTime > 500) { // Burn damage every 0.5 seconds
                            const damage = 0.5; // Small but frequent damage
                            enemy.health -= damage;
                            createBloodSplatter(enemy.x, enemy.y);
                            
                            // Damage number for burning
                            if (floatingTexts.length < 30) {
                                floatingTexts.push({
                                    text: String(damage),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                    y: enemy.y - enemy.size * 0.5,
                                    startTime: now, duration: 600,
                                    color: '#ff4400', fontSize: 10
                                });
                            }
                            
                            if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                            enemy.lastIgnitionDamageTime = now;
                        }
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

                // Throttle puddle checks — only every 3 frames per enemy (staggered by index)
                enemy.isSlowedByPuddle = enemy.isSlowedByPuddle || false;
                if ((update._frame + enemyIdx) % 3 === 0) {
                    enemy.isSlowedByPuddle = false;
                    for (const puddle of playerPuddles) {
                        const dx = enemy.x - puddle.x;
                        const dy = enemy.y - puddle.y;
                        if (dx*dx + dy*dy < ((enemy.size / 2) + (puddle.size / 2))**2) {
                            enemy.isSlowedByPuddle = true;
                            break;
                        }
                    }
                    if (!enemy.isSlowedByPuddle) {
                        for (const puddle of snailPuddles) {
                            const dx = enemy.x - puddle.x;
                            const dy = enemy.y - puddle.y;
                            if (dx*dx + dy*dy < ((enemy.size / 2) + (puddle.size / 2))**2) {
                                enemy.isSlowedByPuddle = true;
                                break;
                            }
                        }
                    }
                }
                if (enemy.isSlowedByPuddle) effectiveEnemySpeed *= PLAYER_PUDDLE_SLOW_FACTOR;
                if (enemy.isFrozen && now < enemy.freezeEndTime) {
                    enemy._pendingMoveX = 0;
                    enemy._pendingMoveY = 0;
                    return;
                } else if (enemy.isFrozen && now >= enemy.freezeEndTime) enemy.isFrozen = false;
                
                const enemyBehaviorType = enemy.isBoss ? ENEMY_CONFIGS[enemy.mimics].type : ENEMY_CONFIGS[enemy.emoji].type;
                switch (enemyBehaviorType) {
                    case 'bat': {
                        // Time-based pause/move cycle
                        if (!enemy._batLastStateChange) enemy._batLastStateChange = now;
                        const batStateDur = enemy.isPaused ? 500 : 600;
                        if (now - enemy._batLastStateChange > batStateDur) {
                            enemy.isPaused = !enemy.isPaused;
                            enemy._batLastStateChange = now;
                        }
                        // Always move if far from player (prevents border-hanging on spawn)
                        const batDistSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
                        if (!enemy.isPaused || batDistSq > 400*400) {
                            moveX += Math.cos(angleToTarget) * effectiveEnemySpeed;
                            moveY += Math.sin(angleToTarget) * effectiveEnemySpeed;
                        }
                        break;
                    }
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
                    case 'eye': {
                        const distanceToTarget = Math.sqrt(minTargetDistSq);
                        if (distanceToTarget < EYE_SAFE_DISTANCE) { moveX -= Math.cos(angleToTarget) * effectiveEnemySpeed; moveY -= Math.sin(angleToTarget) * effectiveEnemySpeed; }
                        else if (distanceToTarget > EYE_TOO_FAR_DISTANCE) { moveX += Math.cos(angleToTarget) * effectiveEnemySpeed; moveY += Math.sin(angleToTarget) * effectiveEnemySpeed; }
                        else { if (now - enemy.lastEyeProjectileTime > EYE_PROJECTILE_INTERVAL) { eyeProjectiles.push({ x: enemy.x, y: enemy.y, size: EYE_PROJECTILE_SIZE, emoji: EYE_PROJECTILE_EMOJI, speed: EYE_PROJECTILE_SPEED, dx: Math.cos(angleToTarget) * EYE_PROJECTILE_SPEED, dy: Math.sin(angleToTarget) * EYE_PROJECTILE_SPEED, lifetime: now + EYE_PROJECTILE_LIFETIME }); enemy.lastEyeProjectileTime = now; playSound('playerShoot'); } }
                        break;
                    }
                    case 'vampire':
                        // Throttle dodge detection to every 4 frames
                        if (!enemy._dodgeVX) { enemy._dodgeVX = 0; enemy._dodgeVY = 0; }
                        if ((update._frame + enemyIdx) % 4 === 0) {
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
                            enemy._dodgeVX = dodgeVectorX;
                            enemy._dodgeVY = dodgeVectorY;
                        }
                        moveX += (Math.cos(angleToTarget) * effectiveEnemySpeed) + enemy._dodgeVX;
                        moveY += (Math.sin(angleToTarget) * effectiveEnemySpeed) + enemy._dodgeVY;
                        break;
                    case 'mosquito':
                        if (!enemy.currentMosquitoDirection || (now - enemy.lastDirectionUpdateTime > MOSQUITO_DIRECTION_UPDATE_INTERVAL)) { enemy.lastDirectionUpdateTime = now; enemy.currentMosquitoDirection = { dx: Math.cos(angleToTarget), dy: Math.sin(angleToTarget) }; }
                        moveX += enemy.currentMosquitoDirection.dx * effectiveEnemySpeed;
                        moveY += enemy.currentMosquitoDirection.dy * effectiveEnemySpeed;
                        if (now - enemy.lastPuddleSpawnTime > MOSQUITO_PUDDLE_SPAWN_INTERVAL) { mosquitoPuddles.push({ x: enemy.x, y: enemy.y, size: MOSQUITO_PUDDLE_SIZE, spawnTime: now, lifetime: MOSQUITO_PUDDLE_LIFETIME }); enemy.lastPuddleSpawnTime = now; }
                        break;
                    case 'spider': {
                        // Spider jumps diagonally towards player with cooldown
                        if (!enemy.isJumping && now - enemy.lastJumpTime > enemy.jumpCooldown) {
                            // Start jump
                            enemy.isJumping = true;
                            enemy.jumpStartTime = now;
                            enemy.lastJumpTime = now;
                            
                            // Leave spider web at current position
                            spiderWebs.push({
                                x: enemy.x,
                                y: enemy.y,
                                size: SPIDER_WEB_SIZE,
                                spawnTime: now,
                                lifetime: SPIDER_WEB_LIFETIME
                            });
                            
                            // Calculate diagonal jump direction towards player
                            const dx = target.x - enemy.x;
                            const dy = target.y - enemy.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance > 0) {
                                enemy.jumpDx = (dx / distance) * effectiveEnemySpeed * 1.5; // 1.5x speed during jump
                                enemy.jumpDy = (dy / distance) * effectiveEnemySpeed * 1.5;
                            } else {
                                enemy.jumpDx = 0;
                                enemy.jumpDy = 0;
                            }
                        }
                        
                        if (enemy.isJumping) {
                            // During jump, move at high speed
                            if (now - enemy.jumpStartTime < enemy.jumpDuration) {
                                moveX += enemy.jumpDx;
                                moveY += enemy.jumpDy;
                            } else {
                                // End jump
                                enemy.isJumping = false;
                            }
                        } else {
                            // When not jumping, move slowly towards player
                            moveX += Math.cos(angleToTarget) * effectiveEnemySpeed * 0.3;
                            moveY += Math.sin(angleToTarget) * effectiveEnemySpeed * 0.3;
                        }
                        break;
                    }
                    case 'snail': {
                        // Change direction every 3-5 seconds, biased toward player's area
                        if (!enemy.lastDirChange) enemy.lastDirChange = now;
                        const snailDirInterval = 3000 + Math.random() * 2000;
                        if (now - enemy.lastDirChange > snailDirInterval || 
                            enemy.x < 50 || enemy.x > WORLD_WIDTH - 50 ||
                            enemy.y < 50 || enemy.y > WORLD_HEIGHT - 50) {
                            // 60% chance to drift toward player, 40% random
                            if (Math.random() < 0.6) {
                                const toPlayer = Math.atan2(target.y - enemy.y, target.x - enemy.x);
                                enemy.directionAngle = toPlayer + (Math.random() - 0.5) * Math.PI * 0.8;
                            } else {
                                enemy.directionAngle = Math.random() * Math.PI * 2;
                            }
                            enemy.lastDirChange = now;
                        }
                        moveX += Math.cos(enemy.directionAngle) * effectiveEnemySpeed;
                        moveY += Math.sin(enemy.directionAngle) * effectiveEnemySpeed;
                        // Snail puddle trail removed
                        break;
                    }
                    default:
                        moveX += Math.cos(angleToTarget) * effectiveEnemySpeed;
                        moveY += Math.sin(angleToTarget) * effectiveEnemySpeed;
                        break;
                }
                enemy._pendingMoveX = moveX;
                enemy._pendingMoveY = moveY;
            });
            
            // Apply movement + obstacle repulsion
            for (let ei = 0; ei < enemies.length; ei++) {
                const enemy = enemies[ei];
                // Skip enemies that had no movement calculated (time stopped etc)
                if (enemy._pendingMoveX === undefined) continue;

                let finalX = enemy._pendingMoveX;
                let finalY = enemy._pendingMoveY;
                enemy._pendingMoveX = undefined;

                if (destructibles.length > 0 && (update._frame + ei) % 4 === 0) {
                    let repX = 0, repY = 0;
                    for (let oi = 0; oi < destructibles.length; oi++) {
                        const obs = destructibles[oi];
                        const dx = enemy.x - obs.x;
                        const dy = enemy.y - obs.y;
                        const distSq = dx*dx + dy*dy;
                        const repR = obs.size/2 + enemy.size/2 + 5;
                        if (distSq < repR*repR && distSq > 0.01) {
                            const dist = Math.sqrt(distSq);
                            const force = (1 - dist/repR) * 2;
                            repX += (dx/dist) * force;
                            repY += (dy/dist) * force;
                        }
                    }
                    enemy._repX = repX;
                    enemy._repY = repY;
                }
                if (enemy._repX) { finalX += enemy._repX; finalY += enemy._repY; }

                const nextX = enemy.x + finalX;
                const nextY = enemy.y + finalY;
                let collision = false;
                for (let oi = 0; oi < destructibles.length; oi++) {
                    const obs = destructibles[oi];
                    const dx = nextX - obs.x;
                    const dy = nextY - obs.y;
                    if (dx*dx + dy*dy < ((enemy.size/2) + (obs.size/2))**2) { collision = true; break; }
                }
                if (!collision) { enemy.x = nextX; enemy.y = nextY; }
            }

            // Damage + player collision (kept as forEach for readability)
            enemies.forEach(enemy => {

                const canGhostDamage = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);
                const combinedRadius = (player.size / 2) + (enemy.size / 2) - 5.6;
                const dx_player = player.x - enemy.x;
                const dy_player = player.y - enemy.y;

                if (canGhostDamage && !player.isInvincible && !cheats.god_mode && (dx_player*dx_player + dy_player*dy_player) < combinedRadius*combinedRadius) {
                    // Shield aura: block one hit every 10s
                    if (cheats.shield_aura) {
                        const now2 = Date.now();
                        if (!player._shieldLastHitTime || now2 - player._shieldLastHitTime > 10000) {
                            player._shieldLastHitTime = now2;
                            floatingTexts.push({ text: "Shield!", x: player.x, y: player.y - player.size, startTime: now2, duration: 1000, color: '#00FFFF' });
                            handleEnemyDeath(enemy);
                            return;
                        }
                    }
                    // Nuke touch: wipe all enemies when hit
                    if (cheats.nuke_touch) {
                        for (let ni = enemies.length - 1; ni >= 0; ni--) {
                            handleEnemyDeath(enemies[ni]);
                        }
                        return;
                    }
                    player.lives--;
                    runStats.lastDamageTime = now;
                    if (typeof runStats.damageTakenThisRun !== 'number' || !Number.isFinite(runStats.damageTakenThisRun)) runStats.damageTakenThisRun = 0;
                    runStats.damageTakenThisRun++;
                    runStats.killsSinceDamage = 0;
                    if (player.lives === 1) runStats.hasBeenAtOneHeart = true;
                    createBloodSplatter(player.x, player.y); createBloodPuddle(player.x, player.y, player.size);
                    vibrateHit(true); // Player hit vibration
                    playSound('playerScream');
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
            
            // Clone army cheat: update and fire from each clone
            if (cheats.clone_army && window.cloneArmy && window.cloneArmy.length > 0) {
                window.cloneArmy.forEach(clone => {
                    let closestEnemy = null; let minDistanceSq = Infinity;
                    enemies.forEach(enemy => {
                        if (!enemy.isHit) {
                            const distSq = (clone.x - enemy.x)**2 + (clone.y - enemy.y)**2;
                            if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                        }
                    });
                    if (closestEnemy) {
                        clone.rotationAngle = Math.atan2(closestEnemy.y - clone.y, closestEnemy.x - clone.x);
                        if (now - clone.lastFireTime > 600) {
                            createWeapon(clone, clone.rotationAngle);
                            clone.lastFireTime = now;
                        }
                    }
                    // Slowly orbit player
                    const idx = window.cloneArmy.indexOf(clone);
                    const angle = (idx / window.cloneArmy.length) * Math.PI * 2 + now * 0.0005;
                    clone.x += (player.x + Math.cos(angle) * 80 - clone.x) * 0.05;
                    clone.y += (player.y + Math.sin(angle) * 80 - clone.y) * 0.05;
                });
            }

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
                // Dog moves at 2x player speed
                const DOG_SPEED = player.speed * 2;
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
                        // Throttle target search to every 200ms instead of every frame
                        if (!dog._lastTargetSearch || now - dog._lastTargetSearch > 200) {
                            let closestEnemy = null; let minDistanceSq = Infinity;
                            for (let di = 0; di < enemies.length; di++) {
                                const enemy = enemies[di];
                                if (!enemy.isHit && !enemy.isBoss) {
                                    const distSq = (dog.x - enemy.x)**2 + (dog.y - enemy.y)**2;
                                    if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                                }
                            }
                            dog.target = closestEnemy;
                            dog._lastTargetSearch = now;
                        }
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
                // Expire pickups after 30 seconds so they don't pile up forever
                if (item.spawnTime && now - item.spawnTime > 30000) { pickupItems.splice(i, 1); continue; }
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
                        vibratePickup('powerup'); // Powerup vibration
                        player.boxPickupsCollectedCount++;
                        playerStats.totalBoxesOpened++;
                        
                        // Use pre-assigned powerup if available
                        if (item.powerupId) {
                            activatePowerup(item.powerupId);
                            playSound('boxPickup');
                            floatingTexts.push({ text: item.powerupName + "!", x: player.x, y: player.y - player.size, startTime: now, duration: 1500 });
                            updatePowerupIconsUI();
                        }
                        
                        pickupItems.splice(i, 1);
                        continue;
                    }
                    player.xp += item.xpValue * (cheats.xp_boost ? 2 : 1);
                    runStats.xpCollectedThisRun += item.xpValue;
                    score += item.xpValue * 7;
                    vibratePickup('xp'); // XP pickup vibration
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
                    vibratePickup('apple'); // Apple pickup vibration
                    player.appleCount++;
                    runStats.applesEatenThisRun++;
                    playerStats.totalApplesEaten++;
                    if (player.appleCount >= 5) {
                        player.maxLives++;
                        player.appleCount = 0;
                        vibrateAppleComplete(); // Special vibration for completing apple set
                        playSound('levelUpSelect');
                        floatingTexts.push({ text: "Max Life +1!", x: player.x, y: player.y - player.size, startTime: now, duration: 1500 });
                    }
                    player.lives = player.maxLives;
                    runStats.maxHeartsReached = Math.max(runStats.maxHeartsReached || 0, player.maxLives);
                    if (runStats.hasBeenAtOneHeart && player.lives === player.maxLives) runStats.recoveredToFullAfterOneHeart = true;
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
if (!player._isLumberjack && !player._isKnight && (aimDx !== 0 || aimDy !== 0) && (now - lastWeaponFireTime > currentFireInterval)) {
    if (!cheats.click_to_fire) {
        createWeapon();
        lastWeaponFireTime = now;
    }
}

// Dual Revolvers: fire the queued second bullet when its timer is up
if (pendingRevolverShot && now >= pendingRevolverShot.fireAt) {
    const shot = pendingRevolverShot;
    pendingRevolverShot = null;
    for (const angle of shot.angles) {
        for (const weapon of weaponPool) {
            if (!weapon.active) {
                weapon.x = player.x;
                weapon.y = player.y;
                weapon.size = shotgunBlastActive ? 30 * player.projectileSizeMultiplier : 38 * player.projectileSizeMultiplier * (rocketLauncherActive ? 2 : 1);
                weapon.speed = 5.04 * player.projectileSpeedMultiplier;
                weapon.angle = angle;
                weapon.dx = Math.cos(angle) * weapon.speed;
                weapon.dy = Math.sin(angle) * weapon.speed;
                weapon.lifetime = now + 2000;
                weapon.hitsLeft = rocketLauncherActive ? 3 : (ricochetActive ? 2 : 1);
                weapon.hitEnemies.length = 0;
                weapon.owner = 'player';
                weapon.active = true;
                if (typeof runStats !== 'undefined') runStats.bulletsFired = (runStats.bulletsFired || 0) + 1;
                break;
            }
        }
    }
    playSound('playerShoot');
}

            for(const weapon of weaponPool) {
                if(!weapon.active) continue;

                if (magneticProjectileActive && enemies.length > 0) {
                    // Use quadtree to find nearby enemies instead of scanning all
                    const nearby = quadtree.retrieve({ x: weapon.x - 200, y: weapon.y - 200, width: 400, height: 400 });
                    let closestEnemy = null, minDistanceSq = Infinity;
                    for (const obj of nearby) {
                        const e = obj.ref;
                        if (!e || !e.health || e.isHit || (e.isFrozen && now < e.freezeEndTime)) continue;
                        const distSq = (weapon.x - e.x)**2 + (weapon.y - e.y)**2;
                        if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = e; }
                    }
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
                // Deactivate if off world bounds — no point tracking them
                if (now > weapon.lifetime ||
                    weapon.x < -50 || weapon.x > WORLD_WIDTH + 50 ||
                    weapon.y < -50 || weapon.y > WORLD_HEIGHT + 50) {
                    weapon.active = false;
                }
            }

            for (const weapon of weaponPool) {
                if(!weapon.active) continue;
                for (let j = destructibles.length - 1; j >= 0; j--) {
                    const obs = destructibles[j];
                    const dx = weapon.x - obs.x;
                    const dy = weapon.y - obs.y;
                    if (dx*dx + dy*dy < ((weapon.size / 2) + (obs.size / 2))**2) {
                        weapon.active = false;
                        obs.health--;
                        if (obs.health <= 0) {
                            if (obs.emoji === '🛢️') {
                                handleBarrelDestruction(obs);
                            } else if (obs.emoji === '🧱') {
                                handleBrickDestruction(obs);
                            }
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

                if (weapon.owner === 'player' && typeof runStats !== 'undefined') {
                    if (typeof runStats.bulletsHit !== 'number' || !Number.isFinite(runStats.bulletsHit)) runStats.bulletsHit = 0;
                    runStats.bulletsHit++;
                }
                enemy.health -= damageToDeal;
                enemy.hitFlashTime = now; // Add white flash effect
                createBloodSplatter(enemy.x, enemy.y);
                weapon.hitEnemies.push(enemy);

                // Floating damage number — throttled per enemy, colour/size scales with damage
                if (!enemy._lastDmgNum || now - enemy._lastDmgNum > 180) {
                    if (floatingTexts.length < 30) {
                        const dmg = damageToDeal === Infinity ? 999 : Math.round(damageToDeal * 10) / 10;
                        const t = Math.min(1, dmg / 5); // 0→1 over 0–5 damage
                        const fontSize = Math.floor(10 + t * 8); // 10–18px
                        // White at low damage → bright yellow at high damage
                        const r = 255;
                        const g = Math.floor(255 - t * 80); // 255→175
                        const color = `rgb(${r},${g},50)`;
                        floatingTexts.push({
                            text: dmg === 999 ? '💥' : String(dmg),
                            x: enemy.x + (Math.random() - 0.5) * enemy.size,
                            y: enemy.y - enemy.size * 0.5,
                            startTime: now, duration: 600,
                            color, fontSize
                        });
                    }
                    enemy._lastDmgNum = now;
                }

                if (explosiveBulletsActive) {
                    const explosionId = Math.random();
                    explosions.push({
                        x: weapon.x, y: weapon.y, radius: enemy.size * 2,
                        startTime: Date.now(), duration: 300
                    });
                    vibrateExplosion();
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
                if (iceProjectileActive || weapon._isIceShard) { 
                    enemy.isFrozen = true;
                    enemy.freezeEndTime = Date.now() + (weapon._isIceShard ? ICE_SHARD_FREEZE_DURATION : 250);
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
                        vibrateExplosion();
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
                            const damage = player.damageMultiplier;
                            enemy.health -= damage;
                            createBloodSplatter(enemy.x, enemy.y);
                            enemy.isHitByOrbiter = true;
                            
                            // Damage number
                            if (floatingTexts.length < 30) {
                                const dmg = Math.round(damage * 10) / 10;
                                floatingTexts.push({
                                    text: String(dmg),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                    y: enemy.y - enemy.size * 0.5,
                                    startTime: now, duration: 600,
                                    color: '#ffff00', fontSize: 12
                                });
                            }
                            
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
                            const damage = 1;
                            enemy.health -= damage;
                            createBloodSplatter(enemy.x, enemy.y);
                            enemy.isHitByAxe = true;
                            
                            // Damage number
                            if (floatingTexts.length < 30) {
                                floatingTexts.push({
                                    text: String(damage),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                    y: enemy.y - enemy.size * 0.5,
                                    startTime: now, duration: 600,
                                    color: '#ffaa00', fontSize: 12
                                });
                            }
                            
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
                            const damage = player.damageMultiplier;
                            enemy.health -= damage;
                            createBloodSplatter(enemy.x, enemy.y);
                            enemy.isHitByCircle = true;
                            
                            // Damage number
                            if (floatingTexts.length < 30) {
                                const dmg = Math.round(damage * 10) / 10;
                                floatingTexts.push({
                                    text: String(dmg),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                    y: enemy.y - enemy.size * 0.5,
                                    startTime: now, duration: 600,
                                    color: '#ff00ff', fontSize: 12
                                });
                            }
                            
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
            
            // Flamethrower - emits flames that damage and ignite enemies
            if (flamethrowerActive && flameProjectiles.length < FLAMETHROWER_MAX_FLAMES) {
                const flameInterval = FLAMETHROWER_EMIT_INTERVAL * (weaponFireInterval / 400); // Scale with fire rate
                if (now - lastFlameEmitTime > flameInterval) {
                    // Get aim angle (same logic as bullets)
                    let aimAngle;
                    if (autoAimActive && enemies.length > 0) {
                        let closestEnemy = null; let minDistance = Infinity;
                        enemies.forEach(enemy => {
                            const distSq = (player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2;
                            if (distSq < minDistance) { minDistance = distSq; closestEnemy = enemy; }
                        });
                        if (closestEnemy) { aimAngle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x); }
                        else { aimAngle = player.rotationAngle; }
                    } else if (aimDx !== 0 || aimDy !== 0) {
                        aimAngle = Math.atan2(aimDy, aimDx);
                    } else {
                        aimAngle = player.rotationAngle || 0;
                    }
                    
                    // Calculate gun tip position (same as laser pointer)
                    const gunWidth = player.size * 0.8;
                    const gunXOffset = player.size / 4;
                    const gunTipOffset = gunXOffset + gunWidth * 0.9;
                    
                    // Spawn flame from gun tip in world coordinates
                    const spawnX = player.x + Math.cos(aimAngle) * gunTipOffset;
                    const spawnY = player.y + Math.sin(aimAngle) * gunTipOffset;
                    
                    const spreadAngle = (Math.random() - 0.5) * 0.4; // Wider spread for flame effect
                    const angle = aimAngle + spreadAngle;
                    
                    flameProjectiles.push({
                        x: spawnX,
                        y: spawnY,
                        size: 14,
                        speed: 3.0,
                        dx: Math.cos(angle) * 3.0,
                        dy: Math.sin(angle) * 3.0,
                        angle: angle,
                        damage: 0.2 * player.damageMultiplier,
                        lifetime: now + 800,
                        hitEnemies: []
                    });
                    lastFlameEmitTime = now;
                }
            }
            
            // Update flame projectiles
            for (let i = flameProjectiles.length - 1; i >= 0; i--) {
                const flame = flameProjectiles[i];
                flame.x += flame.dx;
                flame.y += flame.dy;
                
                // Remove expired flames
                if (now > flame.lifetime) {
                    flameProjectiles.splice(i, 1);
                    continue;
                }
                
                // Check collision with enemies
                for (let j = 0; j < enemies.length; j++) {
                    const enemy = enemies[j];
                    if (enemy.isHit || flame.hitEnemies.includes(enemy)) continue;
                    
                    const dx = flame.x - enemy.x;
                    const dy = flame.y - enemy.y;
                    const distSq = dx * dx + dy * dy;
                    const collisionDist = (flame.size / 2) + (enemy.size / 2);
                    
                    if (distSq < collisionDist * collisionDist) {
                        enemy.health -= flame.damage;
                        enemy.hitFlashTime = now;
                        flame.hitEnemies.push(enemy);
                        
                        // Damage number
                        if (floatingTexts.length < 30) {
                            const dmg = Math.round(flame.damage * 10) / 10;
                            floatingTexts.push({
                                text: String(dmg),
                                x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                y: enemy.y - enemy.size * 0.5,
                                startTime: now, duration: 600,
                                color: '#ff6600', fontSize: 12
                            });
                        }
                        
                        // Ignite enemy
                        if (!enemy.isIgnited) {
                            enemy.isIgnited = true;
                            enemy.ignitionEndTime = now + 5000; // 5 seconds of burning (10 ticks of 0.5 damage = 5 total damage)
                            enemy.lastIgnitionDamageTime = now;
                        }
                        
                        createBloodSplatter(enemy.x, enemy.y);
                        
                        if (enemy.health <= 0) {
                            handleEnemyDeath(enemy);
                        }
                    }
                }
            }
            
            // Laser Cannon - fires a piercing beam every 5 seconds
            if (laserCannonActive && now - lastLaserCannonFireTime > LASER_CANNON_INTERVAL) {
                // Get aim angle (same logic as bullets)
                let aimAngle;
                if (autoAimActive && enemies.length > 0) {
                    let closestEnemy = null; let minDistance = Infinity;
                    enemies.forEach(enemy => {
                        const distSq = (player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2;
                        if (distSq < minDistance) { minDistance = distSq; closestEnemy = enemy; }
                    });
                    if (closestEnemy) { aimAngle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x); }
                    else { aimAngle = player.rotationAngle; }
                } else if (aimDx !== 0 || aimDy !== 0) {
                    aimAngle = Math.atan2(aimDy, aimDx);
                } else {
                    aimAngle = player.rotationAngle || 0;
                }
                
                // Calculate gun tip position
                const gunWidth = player.size * 0.8;
                const gunXOffset = player.size / 4;
                const gunTipOffset = gunXOffset + gunWidth * 0.9;
                const startX = player.x + Math.cos(aimAngle) * gunTipOffset;
                const startY = player.y + Math.sin(aimAngle) * gunTipOffset;
                const endX = startX + Math.cos(aimAngle) * LASER_CANNON_RANGE;
                const endY = startY + Math.sin(aimAngle) * LASER_CANNON_RANGE;
                
                // Create beam visual
                laserCannonBeams.push({
                    startX, startY, endX, endY,
                    spawnTime: now,
                    lifetime: 300 // Visual lasts 300ms
                });
                
                // Damage all enemies in the beam path
                enemies.forEach(enemy => {
                    if (enemy.isHit) return;
                    
                    // Check if enemy intersects with the laser line
                    const dx = endX - startX;
                    const dy = endY - startY;
                    const lineLength = Math.sqrt(dx * dx + dy * dy);
                    const dirX = dx / lineLength;
                    const dirY = dy / lineLength;
                    
                    // Project enemy position onto the line
                    const toEnemyX = enemy.x - startX;
                    const toEnemyY = enemy.y - startY;
                    const projection = toEnemyX * dirX + toEnemyY * dirY;
                    
                    // Check if projection is within line segment
                    if (projection >= 0 && projection <= lineLength) {
                        const closestX = startX + dirX * projection;
                        const closestY = startY + dirY * projection;
                        const distToLine = Math.sqrt((enemy.x - closestX) ** 2 + (enemy.y - closestY) ** 2);
                        
                        // Hit if within enemy radius + beam width
                        if (distToLine < enemy.size / 2 + 5) {
                            const damage = LASER_CANNON_DAMAGE * player.damageMultiplier;
                            enemy.health -= damage;
                            enemy.hitFlashTime = now;
                            createBloodSplatter(enemy.x, enemy.y);
                            
                            // Damage number
                            if (floatingTexts.length < 30) {
                                floatingTexts.push({
                                    text: String(Math.round(damage * 10) / 10),
                                    x: enemy.x,
                                    y: enemy.y - enemy.size * 0.5,
                                    startTime: now,
                                    duration: 600,
                                    color: '#00ff00',
                                    fontSize: 12
                                });
                            }
                            
                            if (enemy.health <= 0) {
                                handleEnemyDeath(enemy);
                            }
                        }
                    }
                });
                
                playSound('playerShoot'); // Use existing shoot sound
                lastLaserCannonFireTime = now;
            }
            
            // Clean up expired laser beams
            laserCannonBeams = laserCannonBeams.filter(beam => now - beam.spawnTime < beam.lifetime);
                
for (let i = lightningBolts.length - 1; i >= 0; i--) {
                const bolt = lightningBolts[i];
                bolt.x += bolt.dx; bolt.y += bolt.dy;
                if (now > bolt.lifetime) bolt.isHit = true;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    const dx = bolt.x - enemy.x;
                    const dy = bolt.y - enemy.y;
                    if (!enemy.isHit && !bolt.isHit && (dx*dx + dy*dy) < ((bolt.size / 2) + (enemy.size / 2))**2) {
                        const damage = player.damageMultiplier;
                        enemy.health -= damage;
                        bolt.isHit = true; 
                        createBloodSplatter(enemy.x, enemy.y);
                        
                        // Damage number
                        if (floatingTexts.length < 30) {
                            const dmg = Math.round(damage * 10) / 10;
                            floatingTexts.push({
                                text: String(dmg),
                                x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                y: enemy.y - enemy.size * 0.5,
                                startTime: now, duration: 600,
                                color: '#ffff00', fontSize: 12
                            });
                        }
                        
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
                        const damage = player.damageMultiplier;
                        enemy.health -= damage;
                        createBloodSplatter(enemy.x, enemy.y);
                        
                        // Damage number
                        if (floatingTexts.length < 30) {
                            const dmg = Math.round(damage * 10) / 10;
                            floatingTexts.push({
                                text: String(dmg),
                                x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                y: enemy.y - enemy.size * 0.5,
                                startTime: now, duration: 600,
                                color: '#cccccc', fontSize: 12
                            });
                        }
                        
                        if (enemy.health <= 0) { 
                            if (typeof runStats.killsWithSword !== 'number' || !Number.isFinite(runStats.killsWithSword)) runStats.killsWithSword = 0;
                            runStats.killsWithSword++;
                            handleEnemyDeath(enemy); 
                        }
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
            for (let i = spiderWebs.length - 1; i >= 0; i--) { if (now - spiderWebs[i].spawnTime > spiderWebs[i].lifetime) spiderWebs.splice(i, 1); }
            for (let i = bloodSplatters.length - 1; i >= 0; i--) {
                const p = bloodSplatters[i];
                if (now - p.spawnTime > p.lifetime) { bloodSplatters.splice(i, 1); continue; }
                p.x += p.dx; p.y += p.dy; p.dx *= 0.96; p.dy *= 0.96; 
            }
            // Cap blood arrays — tighter limits for better performance
            if (bloodSplatters.length > 80) bloodSplatters.splice(0, bloodSplatters.length - 80);
            for (let i = bloodPuddles.length - 1; i >= 0; i--) { if (now - bloodPuddles[i].spawnTime > bloodPuddles[i].lifetime) { bloodPuddles.splice(i, 1); } }
            if (bloodPuddles.length > 40) bloodPuddles.splice(0, bloodPuddles.length - 40);

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
                            const damage = 1;
                            enemy.health -= damage;
                            createBloodSplatter(enemy.x, enemy.y);
                            
                            // Damage number
                            if (floatingTexts.length < 30) {
                                floatingTexts.push({
                                    text: String(damage),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                    y: enemy.y - enemy.size * 0.5,
                                    startTime: now, duration: 600,
                                    color: '#ff8800', fontSize: 12
                                });
                            }
                            
                            if (enemy.health <= 0) handleEnemyDeath(enemy);
                            shot.isHit = true;
                        }
                    }
                }
            }

            for (let i = flameAreas.length - 1; i >= 0; i--) {
                const area = flameAreas[i];
                if (now > area.endTime) { flameAreas.splice(i, 1); continue; }
                // Throttle ignition checks to every 6 frames
                if (update._frame % 6 !== 0) continue;
                for (let ei = 0; ei < enemies.length; ei++) {
                    const enemy = enemies[ei];
                    const dx = enemy.x - area.x;
                    const dy = enemy.y - area.y;
                    if (!enemy.isHit && (dx*dx + dy*dy) < area.radius*area.radius) {
                        if (!enemy.isIgnited || now > enemy.ignitionEndTime) {
                            enemy.isIgnited = true;
                            enemy.ignitionEndTime = now + 6000;
                            enemy.lastIgnitionDamageTime = now;
                        }
                    }
                }
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
                        const damage = player.damageMultiplier;
                        enemy.health -= damage;
                        proj.isHit = true;
                        createBloodSplatter(enemy.x, enemy.y);
                        
                        // Damage number
                        if (floatingTexts.length < 30) {
                            const dmg = Math.round(damage * 10) / 10;
                            floatingTexts.push({
                                text: String(dmg),
                                x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                y: enemy.y - enemy.size * 0.5,
                                startTime: now, duration: 600,
                                color: '#8844ff', fontSize: 12
                            });
                        }
                        
                        if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                        break;
                    }
                }
            }
             for (let i = smokeParticles.length - 1; i >= 0; i--) {
                const p = smokeParticles[i];
                p.x += p.dx;
                p.y += p.dy;
                p.alpha -= 0.03; // fade faster
                if (p.alpha <= 0) {
                    smokeParticles.splice(i, 1);
                }
            }
            if (smokeParticles.length > 30) smokeParticles.splice(0, smokeParticles.length - 30);


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
            visualWarnings = visualWarnings.filter(vw => now - vw.startTime < vw.duration);
            enemies = enemies.filter(e => !e.isHit);
            eyeProjectiles = eyeProjectiles.filter(p => !p.isHit);
            dogHomingShots = dogHomingShots.filter(s => !s.isHit);
            owlProjectiles = owlProjectiles.filter(p => !p.isHit);
            lightningStrikes = lightningStrikes.filter(ls => now - ls.startTime < ls.duration);
        }

        // draw() moved to `game_render.js`





        // (bootstrap + UI wiring moved to `game_bootstrap_ui.js`)
