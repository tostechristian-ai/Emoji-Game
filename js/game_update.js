
// Simulation + rendering (UI wiring is in `game_bootstrap_ui.js`,
// merchant + powerup activation is in `game_merchant_powerups.js`).

        function update() {
    if (gamePaused || gameOver || !gameActive) return;

    // Time Warp cheat: time slows when enemies get close
    let timeScale = 1.0;
    if (cheats.time_warp && !isTimeStopped) {
        let closestEnemyDistSq = Infinity;
        for (const enemy of enemies) {
            if (enemy.isHit) continue;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distSq = dx*dx + dy*dy;
            if (distSq < closestEnemyDistSq) closestEnemyDistSq = distSq;
        }
        // Slow time progressively as enemies get within 200 pixels
        const TIME_WARP_RADIUS_SQ = 200 * 200;
        if (closestEnemyDistSq < TIME_WARP_RADIUS_SQ) {
            const distRatio = Math.sqrt(closestEnemyDistSq) / 200;
            timeScale = 0.3 + (0.7 * distRatio); // 0.3x to 1.0x speed
        }
    }
    
    // Frame counter for throttling expensive per-enemy checks
    if (!update._frame) update._frame = 0;
    update._frame = (update._frame + 1) % 6;

    // ═══════════════════════════════════════════════════════════════════════════
    // PERFORMANCE SCALING: Adaptive throttling based on enemy count
    // Reduces processing load when many enemies/powerups are active
    // ═══════════════════════════════════════════════════════════════════════════
    const enemyCount = enemies.length;
    const highEnemyThreshold = 60;   // Start throttling at 60 enemies
    const criticalEnemyThreshold = 100; // Aggressive throttling at 100+ enemies

    // Calculate adaptive skip rate: 0 (no skip) → 3 (process every 4th frame)
    let adaptiveSkipRate = 0;
    if (enemyCount > criticalEnemyThreshold) {
        adaptiveSkipRate = 3; // Process every 4th frame
    } else if (enemyCount > highEnemyThreshold) {
        // Linear interpolation: 60 enemies = skip 0, 100 enemies = skip 3
        adaptiveSkipRate = Math.floor((enemyCount - highEnemyThreshold) / 13);
    }

    // Powerup spam protection: reduce spawn rates when many projectiles active
    const activeProjectiles = weaponPool.filter(w => w.active).length;
    const projectileSaturation = activeProjectiles / MAX_WEAPONS;
    const isProjectileSaturated = projectileSaturation > 0.85; // 85% pool usage

    // ═══════════════════════════════════════════════════════════════════════════
    // FLOATING TEXT BATCHING: Batch damage numbers when many enemies are dying
    // Prevents text array from growing too large and causing lag
    // ═══════════════════════════════════════════════════════════════════════════
    if (!update._pendingFloatingTexts) update._pendingFloatingTexts = [];
    if (!update._lastFloatingTextFlush) update._lastFloatingTextFlush = 0;

    // Helper to add floating text with batching support
    const addFloatingText = (textConfig) => {
        // During high enemy counts, batch texts and flush periodically
        if (enemyCount > 50) {
            update._pendingFloatingTexts.push(textConfig);
            // Flush batch every 100ms or when buffer gets large
            if (now - update._lastFloatingTextFlush > 100 || update._pendingFloatingTexts.length > 10) {
                // Limit to 30 texts total
                const toAdd = update._pendingFloatingTexts.slice(0, 30 - floatingTexts.length);
                floatingTexts.push(...toAdd);
                update._pendingFloatingTexts = [];
                update._lastFloatingTextFlush = now;
            }
        } else {
            // Normal mode: add immediately with limit
            if (floatingTexts.length < 30) {
                floatingTexts.push(textConfig);
            }
        }
    };

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

    // Virtual time system: game time advances at gameTimeScale rate
    // This makes all intervals, lifetimes, and timed effects scale with game speed
    const realNow = Date.now();
    if (typeof update._virtualTime === 'undefined') update._virtualTime = realNow;
    if (typeof update._lastRealTime === 'undefined') update._lastRealTime = realNow;
    const realDelta = Math.min(realNow - update._lastRealTime, 100); // Cap at 100ms to prevent jumps after unpause
    update._lastRealTime = realNow;
    // Apply both game speed setting and Time Warp cheat scale
    const effectiveTimeScale = (gameTimeScale || 1) * timeScale;
    update._virtualTime += realDelta * effectiveTimeScale;
    const now = update._virtualTime;
    const realNowRef = realNow; // Available for UI/stats that need real time

            const deltaTime = realNow - lastFrameTime;
            if (deltaTime > 0) {
                const xpGainMultiplier = 1 + (playerData.upgrades.xpGain || 0) * PERMANENT_UPGRADES.xpGain.effect;
                if(doppelgangerActive && runStats.lastDoppelgangerStartTime > 0){
                    runStats.doppelgangerActiveTimeThisRun += deltaTime;
                }
            }
            lastFrameTime = realNow;
            // Throttle achievement checks to once per second — no need every frame
            if (!update._lastAchievementCheck || now - update._lastAchievementCheck > 1000) {
                checkAchievements();
                update._lastAchievementCheck = now;

                // Timer: Add 157 score every second
                score += 157;

                // Timer visual effects: pulse trigger
                if (gameTimerSpan) {
                    const elapsedMs = now - gameStartTime - gameTimeOffset;
                    const elapsedSeconds = Math.floor(elapsedMs / 1000);
                    const progress = Math.min(1, elapsedMs / MEGA_BOSS_SPAWN_TIME); // 0 to 1 approaching 15 min

                    // Color transition: green (120° hue) to red (0° hue)
                    const hue = Math.floor(120 * (1 - progress)); // 120 -> 0
                    const color = `hsl(${hue}, 100%, 50%)`;
                    gameTimerSpan.style.color = color;

                    // Pulse intensity: base scale 1.0, max scale increases as we approach 15 min
                    // Calculate max scale based on progress (1.15 to 1.4)
                    const maxScale = 1.15 + (0.25 * progress);
                    // Set CSS variable for the pulse animation scale
                    gameTimerSpan.style.setProperty('--pulse-scale', maxScale);
                    
                    // Trigger CSS animation by adding/removing pulse class
                    // This pauses automatically when the game is paused/level-up (no setTimeout desync)
                    gameTimerSpan.classList.remove('timer-pulse');
                    void gameTimerSpan.offsetWidth; // Force reflow to restart animation
                    gameTimerSpan.classList.add('timer-pulse');
                }
            }

            // Check for mega boss spawn at 15 minutes (synced with UI timer)
            if (!megaBossSpawned && !megaBossSpawnInitiated && gameActive && (now - gameStartTime - gameTimeOffset >= MEGA_BOSS_SPAWN_TIME)) {
                createMegaBoss();
            }

            if (now - lastMerchantSpawnTime >= MERCHANT_SPAWN_INTERVAL) {
    spawnMerchant(player.x + 200, player.y);
    lastMerchantSpawnTime = now;
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
            
            // Fire rate multiplier: scales with level-up fire rate upgrades (base 400ms interval)
            // At base: 1.0x. With upgrades: higher (e.g. 200ms interval = 2.0x)
            // Also scales with game speed setting
            const fireRateMult = 400 / weaponFireInterval;
            // Bullet size multiplier for powerup projectiles/AoE (excludes companions)
            const pSizeMult = player.bulletSizeMultiplier || 1;
            // Movement speed multiplier relative to base (1.4)
            const speedMult = player.speed / 1.4;
            
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
            if (cheats.infinite_stamina) currentPlayerSpeed *= 1.3; // 30% faster with infinite stamina


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
                    // Dash smoke trail: emit 💨 frequently, high opacity, longer lifetime
                    if (!player._lastDashSmokeTime || now - player._lastDashSmokeTime >= DASH_SMOKE_SPAWN_INTERVAL) {
                        dashSmokeParticles.push({
                            x: player.x + (Math.random() - 0.5) * player.size * 0.6,
                            y: player.y + (Math.random() - 0.5) * player.size * 0.6,
                            spawnTime: now,
                            lifetime: DASH_SMOKE_LIFETIME,
                            size: 24 + Math.random() * 12, // Much larger particles
                        });
                        player._lastDashSmokeTime = now;
                        console.log('[Dash Debug] Smoke spawned at', player.x, player.y, 'total particles:', dashSmokeParticles.length);
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
                    currentPlayerSpeed *= SNAIL_PUDDLE_SLOW_FACTOR;
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
                let nextX = player.x + moveX * currentPlayerSpeed * gameTimeScale;
                let nextY = player.y + moveY * currentPlayerSpeed * gameTimeScale;
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
                
                // Apply movement scaled by game speed
                player2.x += p2VelX * gameTimeScale; 
                player2.y += p2VelY * gameTimeScale;
                
                // Update facing direction
                if (p2VelX > 0) player2.facing = 'right'; 
                else if (p2VelX < 0) player2.facing = 'left';
                if (p2VelY > 0) player2.facing = 'down'; 
                else if (p2VelY < 0) player2.facing = 'up';
                
                // Keep Player 2 within world bounds
                player2.x = Math.max(player2.size / 2, Math.min(WORLD_WIDTH - player2.size / 2, player2.x));
                player2.y = Math.max(player2.size / 2, Math.min(WORLD_HEIGHT - player2.size / 2, player2.y));
                
                // Player 2 aiming with numpad (8=up, 5=down, 4=left, 6=right)
                if (keys['8']) p2aimDy = -1; // Numpad 8 is up
                if (keys['5']) p2aimDy = 1;  // Numpad 5 is down  
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
            // Bug Swarm with performance limits - caps max flies and throttles spawn when saturated
            if (bugSwarmActive && !isTimeStopped && now - lastBugSwarmSpawnTime > BUG_SWARM_INTERVAL) {
                // Hard cap flies at 30 to prevent performance degradation
                const MAX_FLIES = 30;
                const currentFlies = flies.length;

                if (currentFlies < MAX_FLIES && !isProjectileSaturated) {
                    // Reduce spawn count when approaching the cap
                    const spawnCount = Math.min(BUG_SWARM_COUNT, MAX_FLIES - currentFlies);

                    for (let i = 0; i < spawnCount; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        flies.push({
                            x: player.x + Math.cos(angle) * player.size,
                            y: player.y + Math.sin(angle) * player.size,
                            target: null, isHit: false
                        });
                    }
                }
                lastBugSwarmSpawnTime = now;
            }

            // Pea Shooter - shoots green peas in spinning wheel pattern
            // Skip if weapon pool is nearly saturated to prevent lag/crashes
            if (peaShooterActive && !isTimeStopped && !isProjectileSaturated) {
            let currentPeaInterval = PEA_SHOOT_INTERVAL / fireRateMult;
            if (fireRateBoostActive) currentPeaInterval /= 2;
            let currentPeaSpinSpeed = PEA_SPIN_SPEED * fireRateMult * gameTimeScale;
            if (fireRateBoostActive) currentPeaSpinSpeed *= 2;
            if (now - lastPeaShootTime > currentPeaInterval) {
                // Update the spin angle (wheel rotation)
                peaShooterSpinAngle += (currentPeaSpinSpeed * currentPeaInterval / 1000);
                if (peaShooterSpinAngle > Math.PI * 2) peaShooterSpinAngle -= Math.PI * 2;

                // Emit peas at each "spoke" of the wheel
                for (let i = 0; i < PEA_SPIN_SPOKES; i++) {
                    const angle = peaShooterSpinAngle + (i * (Math.PI * 2 / PEA_SPIN_SPOKES));
                    peas.push({
                        x: player.x,
                        y: player.y,
                        dx: Math.cos(angle) * PEA_SPEED,
                        dy: Math.sin(angle) * PEA_SPEED,
                        spawnTime: now,
                        isHit: false
                    });
                }
                lastPeaShootTime = now;
            }

            // Update peas (move, check collisions, remove expired)
            for (let i = peas.length - 1; i >= 0; i--) {
                const pea = peas[i];

                // Remove if expired
                if (now - pea.spawnTime > PEA_LIFETIME || pea.isHit) {
                    peas.splice(i, 1);
                    continue;
                }

                // Move pea outward in straight line
                pea.x += pea.dx * gameTimeScale;
                pea.y += pea.dy * gameTimeScale;

                // Check collision with enemies
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (enemy.isHit) continue;

                    const dx = pea.x - enemy.x;
                    const dy = pea.y - enemy.y;
                    const distSq = dx * dx + dy * dy;
                    const hitRadius = (PEA_SIZE * pSizeMult / 2) + (enemy.size / 2);

                    if (distSq < hitRadius * hitRadius) {
                        // Deal damage
                        const damage = PEA_DAMAGE * player.damageMultiplier;
                        enemy.health -= damage;
                        enemy.hitFlashTime = now;
                        createBloodSplatter(enemy.x, enemy.y);
                        pea.isHit = true;

                        // Damage number
                        if (floatingTexts.length < 30) {
                            floatingTexts.push({
                                text: String(Math.round(damage * 10) / 10),
                                x: enemy.x + (Math.random() - 0.5) * enemy.size * 0.5,
                                y: enemy.y - enemy.size * 0.5 - Math.random() * 10,
                                startTime: now,
                                duration: 500,
                                color: '#00ff00',
                                fontSize: 10
                            });
                        }

                        if (enemy.health <= 0) {
                            handleEnemyDeath(enemy);
                        }
                        break; // Pea can only hit one enemy
                    }
                }
            }
            } // End projectile saturation check

            if (nightOwlActive && !isTimeStopped) {
                if (!owl) { owl = { x: player.x, y: player.y - OWL_FOLLOW_DISTANCE, lastFireTime: 0 }; }
                const targetX = player.x; const targetY = player.y - OWL_FOLLOW_DISTANCE;
                owl.x += (targetX - owl.x) * 0.05 * gameTimeScale; owl.y += (targetY - owl.y) * 0.05 * gameTimeScale;
                let currentOwlInterval = OWL_FIRE_INTERVAL / fireRateMult;
                if (fireRateBoostActive) currentOwlInterval /= 2;
                if (now - owl.lastFireTime > currentOwlInterval && enemies.length > 0) {
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
                            x: owl.x, y: owl.y, size: OWL_PROJECTILE_SIZE * pSizeMult,
                            dx: Math.cos(angle) * OWL_PROJECTILE_SPEED,
                            dy: Math.sin(angle) * OWL_PROJECTILE_SPEED,
                            angle: angle, isHit: false, lifetime: now + 3000
                        });
                        owl.lastFireTime = now;
                    }
                }
            }
            let currentLightningStrikeInterval = LIGHTNING_STRIKE_INTERVAL / fireRateMult;
            if (fireRateBoostActive) currentLightningStrikeInterval /= 2;
            if (lightningStrikeActive && !isTimeStopped && now - lastLightningStrikeTime > currentLightningStrikeInterval) {
                if (enemies.length > 0) {
                    const targetEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                    if (targetEnemy && !targetEnemy.isHit) {
                        lightningStrikes.push({ x: targetEnemy.x, y: targetEnemy.y, startTime: now, duration: 500 });
                        const damage = LIGHTNING_STRIKE_DAMAGE * player.damageMultiplier;
                        targetEnemy.health -= damage;
                        playerStats.totalEnemiesHitByLightning++;
                        createBloodSplatter(targetEnemy.x, targetEnemy.y);
                        
                        // Damage number
                        if (floatingTexts.length < 30) {
                            floatingTexts.push({
                                text: String(Math.round(damage * 10) / 10),
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

            // Shotgun — fires 3 bullets in a spread
            let currentShotgunInterval = SHOTGUN_INTERVAL / fireRateMult;
            if (fireRateBoostActive) currentShotgunInterval /= 2;
            if (shotgunActive && !isTimeStopped && now - lastShotgunTime > currentShotgunInterval) {
                let sgTarget = null; let minDist = Infinity;
                for (let si = 0; si < enemies.length; si++) {
                    const e = enemies[si];
                    if (!e.isHit) {
                        const d = (player.x - e.x)**2 + (player.y - e.y)**2;
                        if (d < minDist) { minDist = d; sgTarget = e; }
                    }
                }
                if (sgTarget) {
                    const baseAngle = Math.atan2(sgTarget.y - player.y, sgTarget.x - player.x);
                    const spread = Math.PI / 10;
                    for (let si = -1; si <= 1; si++) {
                        const angle = baseAngle + si * spread;
                        for (const w of weaponPool) {
                            if (!w.active) {
                                w.x = player.x; w.y = player.y;
                                w.size = 20 * player.projectileSizeMultiplier * pSizeMult;
                                w.speed = 6 * player.projectileSpeedMultiplier;
                                w.angle = angle;
                                w.dx = Math.cos(angle) * w.speed;
                                w.dy = Math.sin(angle) * w.speed;
                                w.lifetime = now + 2000;
                                w.hitsLeft = 1;
                                w.hitEnemies.clear();
                                w.owner = 'player';
                                w.active = true;
                                w._isShotgun = true;
                                break;
                            }
                        }
                    }
                    playSound('playerShoot');
                    lastShotgunTime = now;
                }
            }

            // Ice Cannon — fires 2 snowflakes perpendicular to aim direction, freezes on hit
            let currentIceCannonInterval = ICE_CANNON_INTERVAL / fireRateMult;
            if (fireRateBoostActive) currentIceCannonInterval /= 2;
            if (iceCannonActive && !isTimeStopped && now - lastIceCannonTime > currentIceCannonInterval) {
                let iceTarget = null; let minDist = Infinity;
                for (let si = 0; si < enemies.length; si++) {
                    const e = enemies[si];
                    if (!e.isHit && !e.isFrozen) {
                        const d = (player.x - e.x)**2 + (player.y - e.y)**2;
                        if (d < minDist) { minDist = d; iceTarget = e; }
                    }
                }
                if (iceTarget) {
                    const aimAngle = Math.atan2(iceTarget.y - player.y, iceTarget.x - player.x);
                    // Fire 2 shots perpendicular to aim (left and right)
                    const perpAngles = [aimAngle - Math.PI / 2, aimAngle + Math.PI / 2];
                    for (const angle of perpAngles) {
                        for (const w of weaponPool) {
                            if (!w.active) {
                                w.x = player.x; w.y = player.y;
                                w.size = 18 * player.projectileSizeMultiplier * pSizeMult;
                                w.speed = 5 * player.projectileSpeedMultiplier;
                                w.angle = angle;
                                w.dx = Math.cos(angle) * w.speed;
                                w.dy = Math.sin(angle) * w.speed;
                                w.lifetime = now + 2500;
                                w.hitsLeft = 999;
                                w.hitEnemies.clear();
                                w.owner = 'player';
                                w.active = true;
                                w._isIceCannon = true;
                                break;
                            }
                        }
                    }
                    playSound('playerShoot');
                    lastIceCannonTime = now;
                }
            }

            // Dynamite — thrown at closest enemy, stops after 1s, explodes after 3s with fire damage
            let currentDynamiteInterval = DYNAMITE_INTERVAL / fireRateMult;
            if (fireRateBoostActive) currentDynamiteInterval /= 2;
            if (dynamiteActive && !isTimeStopped && now - lastDynamiteTime > currentDynamiteInterval) {
                let dynTarget = null; let minDist = Infinity;
                for (let si = 0; si < enemies.length; si++) {
                    const e = enemies[si];
                    if (!e.isHit) {
                        const d = (player.x - e.x)**2 + (player.y - e.y)**2;
                        if (d < minDist) { minDist = d; dynTarget = e; }
                    }
                }
                if (dynTarget) {
                    const angle = Math.atan2(dynTarget.y - player.y, dynTarget.x - player.x);
                    const speed = DYNAMITE_BASE_SPEED * (1 + (player.upgradeLevels?.fireRate || 0) * 0.1); // Speed increases with fire rate
                    dynamiteProjectiles.push({
                        x: player.x,
                        y: player.y,
                        dx: Math.cos(angle) * speed,
                        dy: Math.sin(angle) * speed,
                        angle: angle,
                        spawnTime: now,
                        stopTime: now + DYNAMITE_STOP_TIME,
                        explodeTime: now + DYNAMITE_EXPLODE_TIME,
                        size: 20,
                        active: true,
                        stopped: false
                    });
                    playSound('playerShoot');
                    lastDynamiteTime = now;
                }
            }

            // Update dynamite projectiles
            for (let i = dynamiteProjectiles.length - 1; i >= 0; i--) {
                const dyn = dynamiteProjectiles[i];
                if (!dyn.active) continue;
                
                // Move until stop time
                if (!dyn.stopped && now < dyn.stopTime) {
                    dyn.x += dyn.dx * gameTimeScale;
                    dyn.y += dyn.dy * gameTimeScale;
                } else if (!dyn.stopped) {
                    dyn.stopped = true;
                }
                
                // Check if it's time to explode
                if (now >= dyn.explodeTime) {
                    const explosionRadius = 60 * pSizeMult;
                    
                    // Create flame area like oil barrel
                    flameAreas.push({
                        x: dyn.x,
                        y: dyn.y,
                        radius: explosionRadius,
                        startTime: now,
                        endTime: now + 3000 // 3 seconds of fire
                    });
                    
                    // Damage enemies in radius
                    const killedEnemies = [];
                    for (const enemy of enemies) {
                        if (!enemy.isHit) {
                            const dx = enemy.x - dyn.x;
                            const dy = enemy.y - dyn.y;
                            if (dx*dx + dy*dy < explosionRadius*explosionRadius) {
                                const damage = 2 * player.damageMultiplier;
                            enemy.health -= damage; // Explosion damage scaled with Weapon Power
                                enemy.isIgnited = true; // Set on fire like oil barrel
                                enemy.ignitionEndTime = now + 3000;
                                createBloodSplatter(enemy.x, enemy.y);

                                // Damage number for dynamite explosion
                                if (floatingTexts.length < 30) {
                                    floatingTexts.push({
                                        text: String(Math.round(damage * 10) / 10),
                                        x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                        y: enemy.y - enemy.size * 0.5,
                                        startTime: now, duration: 600,
                                        color: '#ff6600', fontSize: 14
                                    });
                                }

                                if (enemy.health <= 0) {
                                    killedEnemies.push({x: enemy.x, y: enemy.y});
                                    handleEnemyDeath(enemy);
                                }
                            }
                        }
                    }
                    
                    // Chain Reaction cheat: killed enemies trigger smaller secondary explosions
                    if (cheats.chain_explosion && killedEnemies.length > 0) {
                        const chainRadius = 40;
                        const chainDelay = 150; // 150ms delay for chain effect
                        
                        killedEnemies.forEach((pos, idx) => {
                            setTimeout(() => {
                                // Create smaller flame area
                                flameAreas.push({
                                    x: pos.x,
                                    y: pos.y,
                                    radius: chainRadius,
                                    startTime: now,
                                    endTime: now + 2000
                                });
                                
                                // Chain damage to nearby enemies
                                for (const enemy of enemies) {
                                    if (!enemy.isHit) {
                                        const dx = enemy.x - pos.x;
                                        const dy = enemy.y - pos.y;
                                        if (dx*dx + dy*dy < chainRadius*chainRadius) {
                                            const chainDamage = 1 * player.damageMultiplier;
                                            enemy.health -= chainDamage; // Chain damage scaled with Weapon Power
                                            enemy.isIgnited = true;
                                            enemy.ignitionEndTime = now + 2000;

                                            // Damage number for chain explosion
                                            if (floatingTexts.length < 30) {
                                                floatingTexts.push({
                                                    text: String(Math.round(chainDamage * 10) / 10),
                                                    x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                                    y: enemy.y - enemy.size * 0.5,
                                                    startTime: now, duration: 600,
                                                    color: '#ff8800', fontSize: 12
                                                });
                                            }

                                            if (enemy.health <= 0) handleEnemyDeath(enemy);
                                        }
                                    }
                                }
                                
                                // Visual chain explosion
                                explosions.push({
                                    x: pos.x,
                                    y: pos.y,
                                    radius: chainRadius,
                                    startTime: now,
                                    duration: 300
                                });
                            }, chainDelay * (idx + 1));
                        });
                    }
                    
                    // Visual explosion effect
                    explosions.push({
                        x: dyn.x,
                        y: dyn.y,
                        radius: explosionRadius,
                        startTime: now,
                        duration: 400
                    });
                    
                    playSound('enemyDeath');
                    dyn.active = false;
                }
                
                // Remove inactive dynamite
                if (!dyn.active) {
                    dynamiteProjectiles.splice(i, 1);
                }
            }

            // Enemy cap: fixed per difficulty for consistent challenge
            // Hard: 100, Medium: 80, Easy: 60 - no box scaling to prevent overcrowding
            let enemySpawnCap = cheats.noSpawnCap ? Infinity : (currentDifficulty === 'hard' ? 100 : currentDifficulty === 'medium' ? 80 : 60);
            
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
                                weapon.hitEnemies.clear();
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
            // Linear box scaling instead of exponential for better pacing
            const boxScaling = 1 + player.boxPickupsCollectedCount * 0.12;
            let currentEnemySpawnInterval = enemySpawnInterval / boxScaling * (1 - 0.005 * (player.level - 1));
            // Hard mode spawns faster to fill the higher cap
            if (currentDifficulty === 'hard') currentEnemySpawnInterval *= 0.65;
            else if (currentDifficulty === 'medium') currentEnemySpawnInterval *= 0.82;
            // Higher floor to prevent spawn rate from getting too chaotic
            currentEnemySpawnInterval = Math.max(
                currentDifficulty === 'hard' ? 120 : currentDifficulty === 'medium' ? 150 : 180, 
                currentEnemySpawnInterval
            );
            
            // Horde mode: double the spawn rate (half the interval)
            if (cheats.horde_mode) {
                currentEnemySpawnInterval *= 0.5;
            }
            
            if (player.level > 0 && player.level % BOSS_SPAWN_INTERVAL_LEVELS === 0 && player.level !== lastBossLevelSpawned) {
                createBoss();
                lastBossLevelSpawned = player.level;
            }
            if (!normalEnemySpawningPaused && enemies.length < enemySpawnCap && now - lastEnemySpawnTime > currentEnemySpawnInterval) {
                if (cheats.boss_rush_mode) { createBoss(); } else { createEnemy(); }
                lastEnemySpawnTime = now;
            }
            
            // Reset ignited enemy count for this frame (for adaptive throttling)
            update._ignitedEnemyCount = 0;
            
            enemies.forEach((enemy, enemyIdx) => {
                if (isTimeStopped) return;

                // ═══════════════════════════════════════════════════════════════════════════
                // ADAPTIVE ENEMY THROTTLING: Skip processing some enemies when count is high
                // This maintains frame rate during intense moments with many enemies
                // ═══════════════════════════════════════════════════════════════════════════
                if (adaptiveSkipRate > 0 && (enemyIdx % (adaptiveSkipRate + 1)) !== 0) {
                    // Still update frozen state and basic timers even when skipping
                    if (enemy.isFrozen && now >= enemy.freezeEndTime) {
                        enemy.isFrozen = false;
                    }
                    // Mega boss is too important to skip
                    if (!enemy.isMegaBoss) {
                        return; // Skip expensive updates for this enemy this frame
                    }
                }

                // Mega boss minion spawning
                if (enemy.isMegaBoss) {
                    spawnMegaBossMinions(enemy);
                }

                if (enemy.isIgnited) {
                    if (now > enemy.ignitionEndTime) { enemy.isIgnited = false; }
                    else {
                        // Count ignited enemies globally for throttling (calculated once per frame)
                        if (!update._ignitedEnemyCount) update._ignitedEnemyCount = 0;
                        update._ignitedEnemyCount++;
                        
                        // Smoke from ignited enemies — adaptively throttled based on total burning enemies
                        // When many enemies burn, reduce smoke frequency and cap
                        const manyIgnited = update._ignitedEnemyCount > 10;
                        const smokeCap = manyIgnited ? 25 : 50;
                        const smokeInterval = manyIgnited ? 600 : 300; // Less frequent when many burning
                        
                        if (smokeParticles.length < smokeCap && (!enemy._lastSmoke || now - enemy._lastSmoke > smokeInterval)) {
                            // Batch smoke creation: only create smoke for every Nth enemy when many burning
                            if (!manyIgnited || (enemyIdx % 3 === 0)) {
                                smokeParticles.push({
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                    y: enemy.y - enemy.size * 0.3,
                                    dx: (Math.random() - 0.5) * 0.4, dy: -0.5 - Math.random() * 0.5,
                                    size: 6 + Math.random() * 4, alpha: 0.5
                                });
                            }
                            enemy._lastSmoke = now;
                        }
                        
                        // Burn damage every 0.5 seconds - staggered by enemy index to spread load
                        const damageInterval = 500 + (enemyIdx % 5) * 50; // 500-750ms staggered
                        if (now - enemy.lastIgnitionDamageTime > damageInterval) {
                            const damage = 0.5 * player.damageMultiplier;
                            enemy.health -= damage;
                            
                            // Skip visual effects when many enemies burning to reduce lag
                            const skipEffects = manyIgnited && (enemyIdx % 3 !== 0);
                            
                            if (!skipEffects) {
                                createBloodSplatter(enemy.x, enemy.y);
                            }
                            
                            // Damage number for burning - show for each enemy individually throttled
                            if (floatingTexts.length < 30 && (!enemy._lastBurnDamageNumberTime || now - enemy._lastBurnDamageNumberTime > 600)) {
                                floatingTexts.push({
                                    text: String(Math.round(damage * 10) / 10),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size,
                                    y: enemy.y - enemy.size * 0.5,
                                    startTime: now, duration: 600,
                                    color: '#ff6600', fontSize: 11
                                });
                                enemy._lastBurnDamageNumberTime = now;
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

                let effectiveEnemySpeed = enemy.speed * gameTimeScale;
                if(cheats.fastEnemies) effectiveEnemySpeed *= 1.5;
                if(cheats.slowEnemies) effectiveEnemySpeed *= 0.5;
                if(cheats.time_warp) effectiveEnemySpeed *= timeScale; // Apply time warp slow-down

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

                // Stone Glare - check if enemy is in the cone and slow them
                // Throttled: only check every 6 frames (staggered by enemy index) to reduce trig calculations
                if ((update._frame + enemyIdx) % 6 === 0) {
                    enemy.isSlowedByStoneGlare = false;
                    if (stoneGlareActive) {
                        // Get cone direction from aim or facing
                        let coneAngle = 0;
                        if (aimDx !== 0 || aimDy !== 0) {
                            coneAngle = Math.atan2(aimDy, aimDx);
                        } else {
                            // Default based on facing direction
                            if (player.facing === 'up') coneAngle = -Math.PI / 2;
                            else if (player.facing === 'down') coneAngle = Math.PI / 2;
                            else if (player.facing === 'left') coneAngle = Math.PI;
                            else coneAngle = 0; // right
                        }

                        const dx = enemy.x - player.x;
                        const dy = enemy.y - player.y;
                        const distSq = dx * dx + dy * dy;

                        // Scale range with bullet size upgrade
                        const scaledStoneGlareRange = STONE_GLARE_RANGE * (player.bulletSizeMultiplier || 1);

                        // Check if within range
                        if (distSq <= scaledStoneGlareRange * scaledStoneGlareRange) {
                            const angleToEnemy = Math.atan2(dy, dx);
                            // Normalize angle difference to [-PI, PI]
                            let angleDiff = angleToEnemy - coneAngle;
                            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                            // Check if within cone angle (half angle on each side)
                            if (Math.abs(angleDiff) <= STONE_GLARE_ANGLE / 2) {
                                enemy.isSlowedByStoneGlare = true;
                            }
                        }
                    }
                }
                if (enemy.isSlowedByStoneGlare) effectiveEnemySpeed *= STONE_GLARE_SLOW_FACTOR;

                // Alien slime damage - enemies in puddles take 0.25 damage periodically
                // Throttled: check every 10 frames (staggered) + 500ms time check
                if (player && player._isAlien && enemy.isSlowedByPuddle && (update._frame + enemyIdx) % 10 === 0) {
                    if (!enemy._lastAlienSlimeDamageTime) enemy._lastAlienSlimeDamageTime = 0;
                    if (now - enemy._lastAlienSlimeDamageTime >= 500) { // 500ms between damage
                        enemy._lastAlienSlimeDamageTime = now;
                        const slimeDamage = 0.25 * player.damageMultiplier;
                        enemy.health -= slimeDamage;
                        
                        // Show green damage number
                        if (floatingTexts.length < 30) floatingTexts.push({
                            text: String(Math.round(slimeDamage * 100) / 100),
                            x: enemy.x,
                            y: enemy.y - enemy.size / 2,
                            startTime: now,
                            duration: 600,
                            color: '#00FF00', // Green damage number
                            fontSize: 12
                        });
                        
                        if (enemy.health <= 0) {
                            handleEnemyDeath(enemy);
                        }
                    }
                }
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
                    case 'skull': {
                        // Approach for 3s, flee for 1s with 1.5x speed (compensates for backtracking)
                        if (!enemy.lastSkullStateChange) enemy.lastSkullStateChange = now;
                        const skullStateDur = enemy.skullState === 'approach' ? 3000 : 1000;
                        if (now - enemy.lastSkullStateChange > skullStateDur) {
                            enemy.skullState = enemy.skullState === 'approach' ? 'flee' : 'approach';
                            enemy.lastSkullStateChange = now;
                        }
                        const skullDirection = enemy.skullState === 'approach' ? 1 : -1;
                        moveX += Math.cos(angleToTarget) * effectiveEnemySpeed * skullDirection;
                        moveY += Math.sin(angleToTarget) * effectiveEnemySpeed * skullDirection;
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
                        // Snail puddle trail: spawn every 0.6s, slows player when stepped on
                        if (!enemy.lastPuddleSpawnTime) enemy.lastPuddleSpawnTime = now;
                        const timeSinceLastPuddle = now - enemy.lastPuddleSpawnTime;
                        if (timeSinceLastPuddle >= SNAIL_PUDDLE_SPAWN_INTERVAL) {
                            snailPuddles.push({
                                x: enemy.x,
                                y: enemy.y,
                                size: SNAIL_PUDDLE_SIZE,
                                spawnTime: now,
                                lifetime: SNAIL_PUDDLE_LIFETIME
                            });
                            enemy.lastPuddleSpawnTime = now;
                            console.log('[Snail Debug] Puddle spawned at', enemy.x, enemy.y, 'total puddles:', snailPuddles.length, 'time since last:', timeSinceLastPuddle);
                        }
                        break;
                    }
                    case 'invader': {
                        // Invader: exaggerated S/zig-zag movement towards player
                        const baseAngle = angleToTarget;
                        // Create exaggerated zig-zag by adding sine wave perpendicular to movement
                        const zigzagAmplitude = 2.5; // Exaggerated swerving
                        const zigzagFrequency = 0.008; // How fast it zigzags
                        enemy.zigzagPhase += zigzagFrequency * effectiveEnemySpeed;
                        
                        // Calculate perpendicular direction for zigzag
                        const perpX = -Math.sin(baseAngle);
                        const perpY = Math.cos(baseAngle);
                        
                        // Apply zigzag offset
                        const zigzagOffset = Math.sin(enemy.zigzagPhase) * zigzagAmplitude;
                        
                        // Main movement towards player plus zigzag
                        moveX += (Math.cos(baseAngle) * effectiveEnemySpeed) + (perpX * zigzagOffset);
                        moveY += (Math.sin(baseAngle) * effectiveEnemySpeed) + (perpY * zigzagOffset);
                        break;
                    }
                    case 'genie': {
                        // Genie: stays at medium distance to maximize gravity field effectiveness
                        const distToTarget = Math.sqrt(minTargetDistSq);
                        const GENIE_IDEAL_DISTANCE = 120; // Stay at this distance from player
                        const GENIE_COMFORT_ZONE = 40; // +/- this range is acceptable
                        
                        if (distToTarget < GENIE_IDEAL_DISTANCE - GENIE_COMFORT_ZONE) {
                            // Too close - back away
                            moveX -= Math.cos(angleToTarget) * effectiveEnemySpeed;
                            moveY -= Math.sin(angleToTarget) * effectiveEnemySpeed;
                        } else if (distToTarget > GENIE_IDEAL_DISTANCE + GENIE_COMFORT_ZONE) {
                            // Too far - approach
                            moveX += Math.cos(angleToTarget) * effectiveEnemySpeed;
                            moveY += Math.sin(angleToTarget) * effectiveEnemySpeed;
                        }
                        // If in comfort zone, strafe slowly sideways
                        else {
                            const strafeAngle = angleToTarget + Math.PI / 2;
                            moveX += Math.cos(strafeAngle) * effectiveEnemySpeed * 0.5;
                            moveY += Math.sin(strafeAngle) * effectiveEnemySpeed * 0.5;
                        }
                        break;
                    }
                    case 'charger': {
                        // Charger: approaches player, stops, shows arrow for 2s, then charges for 2s
                        if (!enemy.chargerState) enemy.chargerState = 'approaching';
                        if (!enemy.stateStartTime) enemy.stateStartTime = now;
                        
                        const stateDuration = enemy.chargerState === 'approaching' ? 2000 : (enemy.chargerState === 'aiming' ? 2000 : 2000);
                        const timeInState = now - enemy.stateStartTime;
                        
                        // State transitions
                        if (timeInState > stateDuration) {
                            if (enemy.chargerState === 'approaching') {
                                enemy.chargerState = 'aiming';
                                enemy.stateStartTime = now;
                                // Store angle to player when starting aim
                                enemy.chargeAngle = angleToTarget;
                                enemy.arrowVisible = true;
                            } else if (enemy.chargerState === 'aiming') {
                                enemy.chargerState = 'charging';
                                enemy.stateStartTime = now;
                                enemy.arrowVisible = false;
                            } else if (enemy.chargerState === 'charging') {
                                enemy.chargerState = 'approaching';
                                enemy.stateStartTime = now;
                            }
                        }
                        
                        // Update charge angle continuously during aiming phase
                        if (enemy.chargerState === 'aiming') {
                            enemy.chargeAngle = angleToTarget;
                        }
                        
                        // Movement based on state
                        if (enemy.chargerState === 'approaching') {
                            // Move toward player at normal speed
                            moveX += Math.cos(angleToTarget) * effectiveEnemySpeed;
                            moveY += Math.sin(angleToTarget) * effectiveEnemySpeed;
                        } else if (enemy.chargerState === 'aiming') {
                            // Stop moving during aiming
                            moveX = 0;
                            moveY = 0;
                        } else if (enemy.chargerState === 'charging') {
                            // Charge in the direction of the arrow at 2.5x speed
                            moveX += Math.cos(enemy.chargeAngle) * effectiveEnemySpeed * 2.5;
                            moveY += Math.sin(enemy.chargeAngle) * effectiveEnemySpeed * 2.5;
                        }
                        break;
                    }
                    case 'vortex': {
                        // Vortex: spins and moves randomly, has AOE that pulls player in
                        
                        // Update spin rotation
                        enemy.vortexAngle = (enemy.vortexAngle || 0) + 0.15;
                        if (enemy.vortexAngle > Math.PI * 2) enemy.vortexAngle -= Math.PI * 2;
                        
                        // Change direction every 1-3 seconds
                        if (!enemy.lastDirChange) enemy.lastDirChange = now;
                        if (now - enemy.lastDirChange > 1000 + Math.random() * 2000) {
                            enemy.vortexMoveAngle = Math.random() * Math.PI * 2;
                            enemy.lastDirChange = now;
                        }
                        if (!enemy.vortexMoveAngle) enemy.vortexMoveAngle = Math.random() * Math.PI * 2;
                        
                        // Move in random direction
                        moveX += Math.cos(enemy.vortexMoveAngle) * effectiveEnemySpeed;
                        moveY += Math.sin(enemy.vortexMoveAngle) * effectiveEnemySpeed;
                        
                        // Vortex gravity pull on player (AOE effect is 3x enemy size = 66 radius)
                        const aoeRadius = enemy.size * 3;
                        const dx = enemy.x - player.x;
                        const dy = enemy.y - player.y;
                        const distSq = dx * dx + dy * dy;
                        
                        if (distSq < aoeRadius * aoeRadius && distSq > 0) {
                            const dist = Math.sqrt(distSq);
                            const pullStrength = 0.6 * (1 - dist / aoeRadius); // Stronger when closer, increased by 50%
                            const pullAngle = Math.atan2(dy, dx);
                            
                            // Apply pull to player (subtle but noticeable - player can escape at base speed)
                            player.x += Math.cos(pullAngle) * pullStrength;
                            player.y += Math.sin(pullAngle) * pullStrength;
                        }
                        break;
                    }
                    case 'pulsing_eye': {
                        // Pulsing Eye: slowly follows player while pulsing a damage ring
                        
                        // Move slowly toward player
                        moveX += Math.cos(angleToTarget) * effectiveEnemySpeed * 0.5;
                        moveY += Math.sin(angleToTarget) * effectiveEnemySpeed * 0.5;
                        
                        // Update pulse - ring grows to 2x size over 1.5 seconds
                        const pulseDuration = 1500;
                        const pulseCycle = (now - enemy.lastPulseTime) % pulseDuration;
                        const pulseProgress = pulseCycle / pulseDuration;
                        
                        // Ring grows from 0 to 2x enemy size
                        enemy.pulseRadius = enemy.size * 2 * pulseProgress;
                        
                        // Throttle damage check to every 3 frames for performance
                        if ((update._frame + enemyIdx) % 3 === 0) {
                            // Check if ring touches player (damage on contact with ring OR touching the eye itself)
                            const dx = player.x - enemy.x;
                            const dy = player.y - enemy.y;
                            const distSq = dx * dx + dy * dy;
                            
                            // Reset damage flag at start of new pulse
                            if (pulseCycle < 50 && enemy.hasDamagedThisPulse) {
                                enemy.hasDamagedThisPulse = false;
                            }
                            
                            // Damage if: player touches the eye itself OR touches the expanding ring
                            // Use squared distance to avoid expensive sqrt - ring has a thickness tolerance
                            const ringThickness = 8;
                            const eyeRadius = (enemy.size / 2 + player.size / 2);
                            const touchingEye = distSq < eyeRadius * eyeRadius;
                            
                            // For ring collision, we need actual distance - only compute if close enough
                            let touchingRing = false;
                            if (!touchingEye) {
                                const distToPlayer = Math.sqrt(distSq);
                                touchingRing = Math.abs(distToPlayer - enemy.pulseRadius) < ringThickness;
                            }
                        
                        if (!enemy.hasDamagedThisPulse && !player.isInvincible && !cheats.god_mode && (touchingEye || touchingRing)) {
                            // Player loses a heart
                            player.lives--;
                            player.appleCount = 0; // Reset apple progress on damage
                            runStats.lastDamageTime = now;
                            if (typeof runStats.damageTakenThisRun !== 'number' || !Number.isFinite(runStats.damageTakenThisRun)) runStats.damageTakenThisRun = 0;
                            runStats.damageTakenThisRun++;
                            runStats.killsSinceDamage = 0;
                            if (player.lives === 1) runStats.hasBeenAtOneHeart = true;
                            
                            createBloodSplatter(player.x, player.y);
                            createBloodPuddle(player.x, player.y, player.size);
                            vibrateHit(true);
                            playSound('playerScream');
                            isPlayerHitShaking = true;
                            playerHitShakeStartTime = realNowRef; // Use real time for visual effects
                            
                            // Show damage text
                            if (floatingTexts.length < 30) floatingTexts.push({
                                text: "-❤️",
                                x: player.x,
                                y: player.y - player.size,
                                startTime: now,
                                duration: 1000,
                                color: '#ff0000',
                                fontSize: 16
                            });
                            
                            if (player.lives <= 0) {
                                if (cheats.second_life && !player._hasRevivedWithSecondLife) {
                                    player._hasRevivedWithSecondLife = true;
                                    player.lives = player.maxLives;
                                    if (floatingTexts.length < 30) floatingTexts.push({
                                        text: "SECOND LIFE!",
                                        x: player.x,
                                        y: player.y - player.size,
                                        startTime: now,
                                        duration: 2000,
                                        color: '#FFD700',
                                        fontSize: 20
                                    });
                                    playSound('levelUpSelect');
                                } else {
                                    endGame();
                                }
                            }
                            
                            enemy.hasDamagedThisPulse = true;
                            updateUIStats();
                        }
                        } // End throttled damage check
                        break;
                    }
                    case 'scorpion': {
                        // Scorpion: moves toward player while strafing side to side
                        
                        // Update strafe phase
                        enemy.strafePhase += 0.08 * gameTimeScale; // Speed of side-to-side wobble
                        
                        // Base movement toward player
                        const moveTowardX = Math.cos(angleToTarget) * effectiveEnemySpeed;
                        const moveTowardY = Math.sin(angleToTarget) * effectiveEnemySpeed;
                        
                        // Calculate perpendicular direction for strafing
                        const strafeAngle = angleToTarget + Math.PI / 2;
                        const strafeAmount = Math.sin(enemy.strafePhase) * effectiveEnemySpeed * 1.8; // 3x more side-to-side movement
                        
                        // Combine forward movement with side-to-side strafing
                        moveX += moveTowardX + Math.cos(strafeAngle) * strafeAmount;
                        moveY += moveTowardY + Math.sin(strafeAngle) * strafeAmount;
                        break;
                    }
                    default:
                        // Handle stopping zombies (1 in 4) - move 3-4s, stop 0.5s
                        if (enemy.isStoppingZombie) {
                            if (!enemy.zombieStateStartTime) enemy.zombieStateStartTime = now;
                            const currentStateDur = enemy.zombieMoveState === 'moving' ? enemy.zombieStateDuration : enemy.zombieStopDuration;
                            if (now - enemy.zombieStateStartTime > currentStateDur) {
                                enemy.zombieMoveState = enemy.zombieMoveState === 'moving' ? 'stopped' : 'moving';
                                enemy.zombieStateStartTime = now;
                                if (enemy.zombieMoveState === 'moving') {
                                    // Randomize next move duration 3-4 seconds
                                    enemy.zombieStateDuration = 3000 + Math.random() * 1000;
                                }
                            }
                            // Only move if not stopped
                            if (enemy.zombieMoveState === 'moving') {
                                moveX += Math.cos(angleToTarget) * effectiveEnemySpeed;
                                moveY += Math.sin(angleToTarget) * effectiveEnemySpeed;
                            }
                        } else {
                            moveX += Math.cos(angleToTarget) * effectiveEnemySpeed;
                            moveY += Math.sin(angleToTarget) * effectiveEnemySpeed;
                        }
                        break;
                }
                enemy._pendingMoveX = moveX;
                enemy._pendingMoveY = moveY;
            });
            
            // Apply movement + obstacle repulsion + enemy separation
            for (let ei = 0; ei < enemies.length; ei++) {
                const enemy = enemies[ei];
                // Skip enemies that had no movement calculated (time stopped etc)
                if (enemy._pendingMoveX === undefined) continue;

                let finalX = enemy._pendingMoveX;
                let finalY = enemy._pendingMoveY;
                enemy._pendingMoveX = undefined;

                // Enemy-to-enemy separation using quadtree - O(n log n) instead of O(n²)
                if ((update._frame + ei) % 3 === 0) {
                    let sepX = 0, sepY = 0;
                    const sepRadius = enemy.size * 1.2;
                    const sepRadiusSq = sepRadius * sepRadius;

                    // Query quadtree for nearby objects in separation radius
                    const queryRect = {
                        x: enemy.x - sepRadius,
                        y: enemy.y - sepRadius,
                        width: sepRadius * 2,
                        height: sepRadius * 2
                    };
                    const nearby = quadtree.retrieve(queryRect);

                    for (const obj of nearby) {
                        const other = obj.ref;
                        // Only separate from other enemies (not player, destructibles, etc)
                        if (other === enemy || !other.emoji || other.isHit) continue;

                        const dx = enemy.x - other.x;
                        const dy = enemy.y - other.y;
                        const distSq = dx*dx + dy*dy;

                        if (distSq < sepRadiusSq && distSq > 0.01) {
                            const dist = Math.sqrt(distSq);
                            const force = (1 - dist/sepRadius) * 1.5;
                            sepX += (dx/dist) * force;
                            sepY += (dy/dist) * force;
                        }
                    }
                    enemy._sepX = sepX;
                    enemy._sepY = sepY;
                }
                if (enemy._sepX) { finalX += enemy._sepX; finalY += enemy._sepY; }

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
                // Throttle destructible collision check to every 2 frames for performance
                let collision = false;
                if ((update._frame + ei) % 2 === 0) {
                    for (let oi = 0; oi < destructibles.length; oi++) {
                        const obs = destructibles[oi];
                        const dx = nextX - obs.x;
                        const dy = nextY - obs.y;
                        if (dx*dx + dy*dy < ((enemy.size/2) + (obs.size/2))**2) { collision = true; break; }
                    }
                    enemy._lastCollisionCheck = collision;
                } else {
                    // Reuse last frame's collision result for smooth movement
                    collision = enemy._lastCollisionCheck || false;
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
                        if (!player._shieldLastHitTime || now - player._shieldLastHitTime > 10000) {
                            player._shieldLastHitTime = now;
                            if (floatingTexts.length < 30) floatingTexts.push({ text: "Shield!", x: player.x, y: player.y - player.size, startTime: now, duration: 1000, color: '#00FFFF' });
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
                    player.appleCount = 0; // Reset apple progress on damage
                    runStats.lastDamageTime = now;
                    if (typeof runStats.damageTakenThisRun !== 'number' || !Number.isFinite(runStats.damageTakenThisRun)) runStats.damageTakenThisRun = 0;
                    runStats.damageTakenThisRun++;
                    runStats.killsSinceDamage = 0;
                    if (player.lives === 1) runStats.hasBeenAtOneHeart = true;
                    createBloodSplatter(player.x, player.y); createBloodPuddle(player.x, player.y, player.size);
                    vibrateHit(true); // Player hit vibration
                    playSound('playerScream');
                    isPlayerHitShaking = true; playerHitShakeStartTime = realNowRef; // Use real time for visual effects
                    if (vengeanceNovaActive) { vengeanceNovas.push({ x: player.x, y: player.y, startTime: now, duration: 500, maxRadius: player.size * 3 }); }
                    if (temporalWardActive) { isTimeStopped = true; timeStopEndTime = now + 2000; playSound('levelUpSelect'); }
                    if (player.lives <= 0) { 
                        // Second Life cheat: revive once per run at full health
                        if (cheats.second_life && !player._hasRevivedWithSecondLife) {
                            player._hasRevivedWithSecondLife = true;
                            player.lives = player.maxLives;
                            if (floatingTexts.length < 30) floatingTexts.push({ 
                                text: "SECOND LIFE!", 
                                x: player.x, 
                                y: player.y - player.size, 
                                startTime: now, 
                                duration: 2000, 
                                color: '#FFD700',
                                fontSize: 20
                            });
                            playSound('levelUpSelect');
                        } else {
                            endGame(); 
                        }
                    }
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
                        createBloodSplatter(doppelganger.x, doppelganger.y);
                        createBloodPuddle(doppelganger.x, doppelganger.y, doppelganger.size);
                        // HP system: subtract 1 HP per hit
                        doppelganger.hp--;
                        // Show floating text for damage
                        if (floatingTexts.length < 30) floatingTexts.push({
                            text: `-${doppelganger.hp > 0 ? '1' : 'DEAD'}`,
                            x: doppelganger.x,
                            y: doppelganger.y - doppelganger.size,
                            startTime: now,
                            duration: 800,
                            color: doppelganger.hp > 0 ? '#ff4444' : '#ff0000',
                            fontSize: doppelganger.hp > 0 ? 14 : 18
                        });
                        if (doppelganger.hp <= 0) {
                            doppelganger = null;
                            doppelgangerActive = false;
                            runStats.lastDoppelgangerStartTime = 0;
                            updatePowerupIconsUI();
                        }
                        handleEnemyDeath(enemy);
                    }
                }
            });
            
            // Clone army cheat: update and fire from each clone
            // Track target count for respawn
            if (cheats.clone_army && !window.cloneArmyTargetCount) {
                window.cloneArmyTargetCount = window.cloneArmy ? window.cloneArmy.length : 3 + Math.floor(Math.random() * 3);
            }

            if (cheats.clone_army && window.cloneArmy) {
                // Check for enemy collisions with clones using quadtree (avoids O(clones × enemies))
                for (let ci = 0; ci < window.cloneArmy.length; ci++) {
                    const clone = window.cloneArmy[ci];
                    const cloneRadius = clone.size;
                    const cloneNearby = quadtree.retrieve({ x: clone.x - cloneRadius, y: clone.y - cloneRadius, width: cloneRadius * 2, height: cloneRadius * 2 });
                    for (let ni = 0; ni < cloneNearby.length; ni++) {
                        const enemy = cloneNearby[ni].ref;
                        if (!enemy || !enemy.health || enemy.isHit) continue;
                        const canGhostDamage = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);
                        if (canGhostDamage) {
                            const combinedRadius = (clone.size / 2) + (enemy.size / 2);
                            const dx = clone.x - enemy.x;
                            const dy = clone.y - enemy.y;
                            if ((dx*dx + dy*dy) < combinedRadius*combinedRadius) {
                                createBloodSplatter(clone.x, clone.y);
                                createBloodPuddle(clone.x, clone.y, clone.size);
                                clone.hp = (clone.hp || 3) - 1;
                                if (floatingTexts.length < 30) floatingTexts.push({
                                    text: `-${clone.hp > 0 ? '1' : 'DEAD'}`,
                                    x: clone.x,
                                    y: clone.y - clone.size,
                                    startTime: now,
                                    duration: 800,
                                    color: clone.hp > 0 ? '#ff4444' : '#ff0000',
                                    fontSize: clone.hp > 0 ? 14 : 18
                                });
                                if (clone.hp <= 0) {
                                    clone._dead = true;
                                }
                                handleEnemyDeath(enemy);
                            }
                        }
                    }
                }

                // Remove dead clones (in-place to avoid GC)
                for (let i = window.cloneArmy.length - 1; i >= 0; i--) {
                    if (window.cloneArmy[i]._dead) window.cloneArmy.splice(i, 1);
                }

                // Respawn clones to maintain target count
                const targetCount = window.cloneArmyTargetCount || 3;
                while (window.cloneArmy.length < targetCount) {
                    const angle = Math.random() * Math.PI * 2;
                    window.cloneArmy.push({
                        x: player.x + Math.cos(angle) * 60,
                        y: player.y + Math.sin(angle) * 60,
                        size: player.size * 0.8,
                        rotationAngle: 0,
                        lastFireTime: 0,
                        hp: 3,
                        maxHp: 3,
                        endTime: Infinity
                    });
                }

                // Pre-compute closest enemy once for all clones (avoids O(clones × enemies))
                let _cloneClosestEnemy = null, _cloneClosestDistSq = Infinity;
                for (let ei = 0; ei < enemies.length; ei++) {
                    const e = enemies[ei];
                    if (e.isHit) continue;
                    const dSq = (player.x - e.x)**2 + (player.y - e.y)**2;
                    if (dSq < _cloneClosestDistSq) { _cloneClosestDistSq = dSq; _cloneClosestEnemy = e; }
                }
                // Update remaining clones
                for (let ci = 0; ci < window.cloneArmy.length; ci++) {
                    const clone = window.cloneArmy[ci];
                    if (_cloneClosestEnemy) {
                        clone.rotationAngle = Math.atan2(_cloneClosestEnemy.y - clone.y, _cloneClosestEnemy.x - clone.x);
                        if (now - clone.lastFireTime > 600) {
                            createWeapon(clone, clone.rotationAngle);
                            clone.lastFireTime = now;
                        }
                    }
                    // Slowly orbit player
                    const angle = (ci / window.cloneArmy.length) * Math.PI * 2 + now * 0.0005 * gameTimeScale;
                    clone.x += (player.x + Math.cos(angle) * 80 - clone.x) * 0.05 * gameTimeScale;
                    clone.y += (player.y + Math.sin(angle) * 80 - clone.y) * 0.05 * gameTimeScale;
                }
            }

            if (doppelganger) {
                const DOPP_SPEED = player.speed * 0.9;
                const MIN_DIST_FROM_PLAYER = doppelganger.size * 1.2; // Don't clip into player
                const MAX_DIST_FROM_PLAYER = 250; // Stay within this range of player
                const IDEAL_DIST_FROM_PLAYER = 100; // Comfortable orbit distance
                const DANGER_DISTANCE = 120; // Distance to start fleeing from enemies
                const FLEE_DISTANCE = 80; // Distance to maintain from enemies

                // Find closest enemy for targeting and fleeing
                let closestEnemy = null;
                let minDistanceSq = Infinity;
                enemies.forEach(enemy => {
                    if (!enemy.isHit) {
                        const distSq = (doppelganger.x - enemy.x)**2 + (doppelganger.y - enemy.y)**2;
                        if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                    }
                });

                // Calculate desired movement direction
                let moveX = 0, moveY = 0;

                // 1) Player separation: push away if too close, pull toward if too far
                const dxPlayer = player.x - doppelganger.x;
                const dyPlayer = player.y - doppelganger.y;
                const distToPlayer = Math.sqrt(dxPlayer*dxPlayer + dyPlayer*dyPlayer);

                if (distToPlayer < MIN_DIST_FROM_PLAYER && distToPlayer > 0.01) {
                    // Push away from player to prevent clipping
                    const pushForce = (MIN_DIST_FROM_PLAYER - distToPlayer) / MIN_DIST_FROM_PLAYER;
                    moveX -= (dxPlayer / distToPlayer) * DOPP_SPEED * pushForce * 2;
                    moveY -= (dyPlayer / distToPlayer) * DOPP_SPEED * pushForce * 2;
                } else if (distToPlayer > MAX_DIST_FROM_PLAYER) {
                    // Pull toward player if too far
                    moveX += (dxPlayer / distToPlayer) * DOPP_SPEED;
                    moveY += (dyPlayer / distToPlayer) * DOPP_SPEED;
                } else if (distToPlayer > IDEAL_DIST_FROM_PLAYER) {
                    // Gently drift toward ideal distance
                    const pullForce = (distToPlayer - IDEAL_DIST_FROM_PLAYER) / (MAX_DIST_FROM_PLAYER - IDEAL_DIST_FROM_PLAYER);
                    moveX += (dxPlayer / distToPlayer) * DOPP_SPEED * pullForce * 0.5;
                    moveY += (dyPlayer / distToPlayer) * DOPP_SPEED * pullForce * 0.5;
                }

                // 2) Enemy interaction
                let targetAngle = player.rotationAngle; // Default aim direction
                if (closestEnemy) {
                    const enemyDist = Math.sqrt(minDistanceSq);
                    const angleToEnemy = Math.atan2(closestEnemy.y - doppelganger.y, closestEnemy.x - doppelganger.x);
                    targetAngle = angleToEnemy;

                    if (enemyDist < DANGER_DISTANCE) {
                        // Flee from enemy
                        const fleeAngle = angleToEnemy + Math.PI;
                        const fleeForce = 1 - (enemyDist / DANGER_DISTANCE);
                        moveX += Math.cos(fleeAngle) * DOPP_SPEED * fleeForce * 1.5;
                        moveY += Math.sin(fleeAngle) * DOPP_SPEED * fleeForce * 1.5;
                    } else if (enemyDist < 300 && distToPlayer < MAX_DIST_FROM_PLAYER) {
                        // Move toward enemy to engage (only if within player tether range)
                        const engageForce = 0.4;
                        moveX += Math.cos(angleToEnemy) * DOPP_SPEED * engageForce;
                        moveY += Math.sin(angleToEnemy) * DOPP_SPEED * engageForce;
                    }

                    // Fire at closest enemy when safe
                    if (enemyDist > FLEE_DISTANCE && now - doppelganger.lastFireTime > DOPPELGANGER_FIRE_INTERVAL) {
                        createWeapon(doppelganger, targetAngle);
                        doppelganger.lastFireTime = now;
                    }
                } else if (distToPlayer > IDEAL_DIST_FROM_PLAYER * 0.5) {
                    // No enemies: orbit around player gently
                    const orbitAngle = Math.atan2(dyPlayer, dxPlayer) + Math.PI / 2;
                    moveX += Math.cos(orbitAngle) * DOPP_SPEED * 0.3;
                    moveY += Math.sin(orbitAngle) * DOPP_SPEED * 0.3;
                }

                // Apply movement scaled by game speed
                doppelganger.x += moveX * gameTimeScale;
                doppelganger.y += moveY * gameTimeScale;

                // Keep within world bounds
                doppelganger.x = Math.max(doppelganger.size/2, Math.min(WORLD_WIDTH - doppelganger.size/2, doppelganger.x));
                doppelganger.y = Math.max(doppelganger.size/2, Math.min(WORLD_HEIGHT - doppelganger.size/2, doppelganger.y));

                // Smooth rotation angle to prevent sprite glitching
                let angleDiff = targetAngle - doppelganger.rotationAngle;
                // Normalize to [-PI, PI]
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                doppelganger.rotationAngle += angleDiff * 0.15;
            }

            if (dogCompanionActive && !isTimeStopped) {
                // Dog moves at 1.3x player speed (35% slower than original 2x), scaled by game speed
                const DOG_SPEED = player.speed * 1.3 * gameTimeScale;
                if (dog.state === 'returning') {
                    const dx = player.x - dog.x;
                    const dy = player.y - dog.y;
                    // When dog reaches player, drop any stored XP
                    if (dx*dx + dy*dy < (player.size/2)**2) {
                        dog.state = 'seeking';
                        dog.target = null;
                        // Drop stored XP from dog kills
                        if (dog.storedXp > 0) {
                            createPickup(dog.x, dog.y, COIN_EMOJI, COIN_SIZE, dog.storedXp);
                            dog.storedXp = 0;
                        }
                    } 
                    else {
                        const angleToPlayer = Math.atan2(player.y - dog.y, player.x - dog.x);
                        dog.x += Math.cos(angleToPlayer) * DOG_SPEED * gameTimeScale;
                        dog.y += Math.sin(angleToPlayer) * DOG_SPEED * gameTimeScale;
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
                            // Calculate XP value based on enemy type and store it on dog
                            const enemy = dog.target;
                            if (enemy.emoji === '🧟') dog.storedXp += COIN_XP_VALUE;
                            else if (enemy.emoji === '💀') dog.storedXp += DIAMOND_XP_VALUE;
                            else if (enemy.emoji === BAT_EMOJI || enemy.emoji === '😈') dog.storedXp += RING_SYMBOL_XP_VALUE;
                            else if (enemy.emoji === DEMON_EMOJI || enemy.emoji === EYE_EMOJI || enemy.emoji === '👻') dog.storedXp += DEMON_XP_VALUE;
                            // Bosses and special enemies still drop XP normally (too valuable to store)
                            handleEnemyDeath(enemy, null, true); // true = killedByDog, skips XP drop
                            dog.target = null;
                            dog.state = 'returning';
                        } else {
                            const angleToTarget = Math.atan2(dy, dx);
                            dog.x += Math.cos(angleToTarget) * DOG_SPEED * gameTimeScale;
                            dog.y += Math.sin(angleToTarget) * DOG_SPEED * gameTimeScale;
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

            // Cat Ally - fetches pickups and XP items for the player (does not attack enemies)
            if (catAllyActive && !isTimeStopped) {
                const CAT_SPEED = player.speed * CAT_ALLY_SPEED * gameTimeScale;
                
                if (catAlly.state === 'returning') {
                    // Move towards player
                    const dx = player.x - catAlly.x;
                    const dy = player.y - catAlly.y;
                    const distSq = dx*dx + dy*dy;
                    
                    if (distSq < (player.size * 2)**2) {
                        // Reached player - deliver any carried item
                        if (catAlly.carriedItem) {
                            // Apply the item's effect immediately
                            const item = catAlly.carriedItem;
                            if (item.type === 'xp') {
                                const xpGainMultiplier = 1 + (playerData.upgrades.xpGain || 0) * PERMANENT_UPGRADES.xpGain.effect;
                                const actualXp = item.xpValue * xpGainMultiplier;
                                player.xp += actualXp;
                                score += Math.floor(actualXp);
                                if (floatingTexts.length < 30) floatingTexts.push({ text: `+${Math.floor(actualXp)} XP`, x: player.x, y: player.y - 20, startTime: now, duration: 1000, color: '#00ffff' });
                                playSound('coinCollect');
                            } else if (item.type === 'coin') {
                                player.coins += item.value;
                                if (floatingTexts.length < 30) floatingTexts.push({ text: `+${item.value} ${COIN_EMOJI}`, x: player.x, y: player.y - 20, startTime: now, duration: 1000, color: '#FFD700' });
                                playSound('coinCollect');
                            } else if (item.type === 'apple') {
                                if (player.lives < player.maxLives) {
                                    player.lives++;
                                    updateUIStats();
                                    if (floatingTexts.length < 30) floatingTexts.push({ text: '+1 ❤️', x: player.x, y: player.y - 20, startTime: now, duration: 1000, color: '#ff0000' });
                                    playSound('coinCollect');
                                }
                            } else if (item.type === 'box') {
                                // Process box pickup - activate the powerup directly
                                if (item.powerupId) {
                                    activatePowerup(item.powerupId);
                                    playSound('boxPickup');
                                    if (floatingTexts.length < 30) floatingTexts.push({ 
                                        text: (item.powerupName || 'Powerup') + "!", 
                                        x: player.x, 
                                        y: player.y - player.size, 
                                        startTime: now, 
                                        duration: 1500 
                                    });
                                    updatePowerupIconsUI();
                                    playerStats.totalBoxesOpened++;
                                }
                            }
                            catAlly.carriedItem = null;
                        }
                        catAlly.state = 'seeking';
                        catAlly.target = null;
                    } else {
                        const angleToPlayer = Math.atan2(dy, dx);
                        catAlly.x += Math.cos(angleToPlayer) * CAT_SPEED;
                        catAlly.y += Math.sin(angleToPlayer) * CAT_SPEED;
                    }
                } else if (catAlly.state === 'seeking') {
                    // Already carrying something, go back to player
                    if (catAlly.carriedItem) {
                        catAlly.state = 'returning';
                        catAlly.target = null;
                    } else if (!catAlly.target && !catAlly.carriedItem) {
                        // Only find new targets if not already carrying something
                        if (!catAlly._lastTargetSearch || now - catAlly._lastTargetSearch > 200) {
                            let closestItem = null;
                            let minDistanceSq = Infinity;
                            
                            // Search through pickupItems (XP, coins, diamonds, boxes, etc.)
                            for (let pi = 0; pi < pickupItems.length; pi++) {
                                const item = pickupItems[pi];
                                // Skip if this is the same item we're already carrying (prevent loops)
                                if (catAlly.carriedItem && item.powerupId === catAlly.carriedItem.powerupId && 
                                    item.x === catAlly.carriedItem.x && item.y === catAlly.carriedItem.y) {
                                    continue;
                                }
                                const distSq = (catAlly.x - item.x)**2 + (catAlly.y - item.y)**2;
                                if (distSq < minDistanceSq) {
                                    if (item.type === 'box') {
                                        closestItem = { item: item, array: 'pickupItems', index: pi, type: 'box' };
                                    } else {
                                        closestItem = { item: item, array: 'pickupItems', index: pi, type: 'xp', xpValue: item.xpValue || COIN_XP_VALUE };
                                    }
                                    minDistanceSq = distSq;
                                }
                            }
                            
                            // Search through appleItems
                            for (let ai = 0; ai < appleItems.length; ai++) {
                                const item = appleItems[ai];
                                const distSq = (catAlly.x - item.x)**2 + (catAlly.y - item.y)**2;
                                if (distSq < minDistanceSq) {
                                    minDistanceSq = distSq;
                                    closestItem = { item: item, array: 'appleItems', index: ai, type: 'apple' };
                                }
                            }
                            
                            catAlly.target = closestItem;
                            catAlly._lastTargetSearch = now;
                        }
                    }
                    
                    if (catAlly.target) {
                        // Check if target item still exists in its array (may have been collected by player or cat)
                        const targetArr = catAlly.target.array === 'pickupItems' ? pickupItems : appleItems;
                        if (!targetArr.includes(catAlly.target.item)) {
                            catAlly.target = null; // Item no longer exists, re-search
                        }
                    }
                    if (catAlly.target) {
                        const target = catAlly.target.item;
                        const dx = target.x - catAlly.x;
                        const dy = target.y - catAlly.y;
                        const distSq = dx*dx + dy*dy;
                        const combinedRadius = (catAlly.size / 2) + (target.size / 2 || 15);
                        
                        if (distSq < combinedRadius*combinedRadius) {
                            // Add a small cooldown to prevent rapid pickups
                            if (!catAlly._lastPickupTime || now - catAlly._lastPickupTime > 500) {
                                // Remove the item from the world FIRST to prevent any re-targeting
                                let itemRemoved = false;
                                if (catAlly.target.array === 'pickupItems') {
                                    const idx = pickupItems.indexOf(catAlly.target.item);
                                    if (idx !== -1) {
                                        pickupItems.splice(idx, 1);
                                        itemRemoved = true;
                                    }
                                } else if (catAlly.target.array === 'appleItems') {
                                    const idx = appleItems.indexOf(catAlly.target.item);
                                    if (idx !== -1) {
                                        appleItems.splice(idx, 1);
                                        itemRemoved = true;
                                    }
                                }
                                
                                // Only pick up if item was successfully removed
                                if (itemRemoved) {
                                    // Pick up the item
                                    catAlly.carriedItem = {
                                        type: catAlly.target.type,
                                        xpValue: catAlly.target.item.xpValue,
                                        value: catAlly.target.item.value || 1,
                                        powerupId: catAlly.target.item.powerupId,
                                        powerupName: catAlly.target.item.powerupName,
                                        x: catAlly.target.item.x,
                                        y: catAlly.target.item.y
                                    };
                                    catAlly._lastPickupTime = now; // Record pickup time
                                }
                            }
                            
                            // Clear target and change state regardless
                            catAlly.target = null;
                            catAlly.state = 'returning';
                        } else {
                            const angleToTarget = Math.atan2(dy, dx);
                            catAlly.x += Math.cos(angleToTarget) * CAT_SPEED;
                            catAlly.y += Math.sin(angleToTarget) * CAT_SPEED;
                        }
                    } else {
                        // No items found, return to player
                        catAlly.state = 'returning';
                    }
                }
            }

            // Robot Drone update - autonomous movement and shooting
            if (robotDroneActive && !isTimeStopped) {
                // Move autonomously, scale speed with player movement speed upgrades and game speed
                const droneSpeedScale = speedMult * gameTimeScale;
                robotDrone.x += robotDrone.dx * droneSpeedScale;
                robotDrone.y += robotDrone.dy * droneSpeedScale;
                
                // Bounce off screen borders
                const halfSize = robotDrone.size / 2;
                if (robotDrone.x < halfSize) {
                    robotDrone.x = halfSize;
                    robotDrone.dx = Math.abs(robotDrone.dx);
                } else if (robotDrone.x > WORLD_WIDTH - halfSize) {
                    robotDrone.x = WORLD_WIDTH - halfSize;
                    robotDrone.dx = -Math.abs(robotDrone.dx);
                }
                if (robotDrone.y < halfSize) {
                    robotDrone.y = halfSize;
                    robotDrone.dy = Math.abs(robotDrone.dy);
                } else if (robotDrone.y > WORLD_HEIGHT - halfSize) {
                    robotDrone.y = WORLD_HEIGHT - halfSize;
                    robotDrone.dy = -Math.abs(robotDrone.dy);
                }
                
                // Fire at closest enemy every second
                let currentRobotDroneInterval = ROBOT_DRONE_FIRE_INTERVAL / fireRateMult;
                if (fireRateBoostActive) currentRobotDroneInterval /= 2;
                if (now - robotDrone.lastFireTime > currentRobotDroneInterval) {
                    let closestEnemy = null;
                    let minDistanceSq = Infinity;
                    
                    for (let ei = 0; ei < enemies.length; ei++) {
                        const enemy = enemies[ei];
                        if (!enemy.isHit) {
                            const distSq = (robotDrone.x - enemy.x)**2 + (robotDrone.y - enemy.y)**2;
                            if (distSq < minDistanceSq) {
                                minDistanceSq = distSq;
                                closestEnemy = enemy;
                            }
                        }
                    }
                    
                    if (closestEnemy) {
                        const angle = Math.atan2(closestEnemy.y - robotDrone.y, closestEnemy.x - robotDrone.x);
                        
                        // Create bullet from weapon pool
                        for (const weapon of weaponPool) {
                            if (!weapon.active) {
                                weapon.x = robotDrone.x;
                                weapon.y = robotDrone.y;
                                weapon.size = ROBOT_DRONE_BULLET_SIZE * pSizeMult;
                                weapon.speed = ROBOT_DRONE_BULLET_SPEED;
                                weapon.angle = angle;
                                weapon.dx = Math.cos(angle) * weapon.speed;
                                weapon.dy = Math.sin(angle) * weapon.speed;
                                weapon.lifetime = now + 2000;
                                weapon.hitsLeft = 1;
                                weapon.hitEnemies.clear();
                                weapon.owner = 'robot_drone';
                                weapon.active = true;
                                weapon._isRobotDroneBullet = true;
                                break;
                            }
                        }
                        playSound('playerShoot');
                    }
                    robotDrone.lastFireTime = now;
                }
            }

            // Turret update - stationary and shoots at nearest enemy
            // Skip firing (but still track) when projectile pool is saturated
            if (turretActive && !isTimeStopped) {
                // Find closest enemy
                let closestEnemy = null;
                let minDistanceSq = Infinity;

                for (let ei = 0; ei < enemies.length; ei++) {
                    const enemy = enemies[ei];
                    if (!enemy.isHit) {
                        const distSq = (turret.x - enemy.x)**2 + (turret.y - enemy.y)**2;
                        if (distSq < minDistanceSq) {
                            minDistanceSq = distSq;
                            closestEnemy = enemy;
                        }
                    }
                }

                if (closestEnemy) {
                    // Update aim angle to point at closest enemy
                    turret.aimAngle = Math.atan2(closestEnemy.y - turret.y, closestEnemy.x - turret.x);

                    // Fire at closest enemy every second (skip if saturated - turret is low priority)
                    let currentTurretInterval = TURRET_FIRE_INTERVAL / fireRateMult;
                    if (fireRateBoostActive) currentTurretInterval /= 2;
                    // Double interval when saturated to reduce pressure on weapon pool
                    if (isProjectileSaturated) currentTurretInterval *= 2;
                    if (now - turret.lastFireTime > currentTurretInterval && !isProjectileSaturated) {
                        // Create bullet from weapon pool
                        for (const weapon of weaponPool) {
                            if (!weapon.active) {
                                weapon.x = turret.x;
                                weapon.y = turret.y;
                                weapon.size = TURRET_BULLET_SIZE * pSizeMult;
                                weapon.speed = TURRET_BULLET_SPEED;
                                weapon.angle = turret.aimAngle;
                                weapon.dx = Math.cos(weapon.angle) * weapon.speed;
                                weapon.dy = Math.sin(weapon.angle) * weapon.speed;
                                weapon.lifetime = now + 2000;
                                weapon.hitsLeft = 1;
                                weapon.hitEnemies.clear();
                                weapon.owner = 'turret';
                                weapon.active = true;
                                weapon._isTurretBullet = true;
                                break;
                            }
                        }
                        playSound('playerShoot');
                        turret.lastFireTime = now;
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════════════════
            // FLYING TURRET POWERUP
            // ═══════════════════════════════════════════════════════════════════════════
            // Moves diagonally and bounces off map edges like a screensaver
            // Skip firing when projectile pool is saturated (flying turret is medium priority)
            if (flyingTurretActive && !isTimeStopped) {
                // Move the flying turret (scale movement speed with player speed and game speed)
                const flyingTurretSpeedScale = speedMult * gameTimeScale;
                flyingTurret.x += flyingTurret.dx * flyingTurretSpeedScale;
                flyingTurret.y += flyingTurret.dy * flyingTurretSpeedScale;
                
                // Bounce off world edges
                if (flyingTurret.x <= flyingTurret.size / 2) {
                    flyingTurret.x = flyingTurret.size / 2;
                    flyingTurret.dx = Math.abs(flyingTurret.dx); // Bounce right
                } else if (flyingTurret.x >= WORLD_WIDTH - flyingTurret.size / 2) {
                    flyingTurret.x = WORLD_WIDTH - flyingTurret.size / 2;
                    flyingTurret.dx = -Math.abs(flyingTurret.dx); // Bounce left
                }
                
                if (flyingTurret.y <= flyingTurret.size / 2) {
                    flyingTurret.y = flyingTurret.size / 2;
                    flyingTurret.dy = Math.abs(flyingTurret.dy); // Bounce down
                } else if (flyingTurret.y >= WORLD_HEIGHT - flyingTurret.size / 2) {
                    flyingTurret.y = WORLD_HEIGHT - flyingTurret.size / 2;
                    flyingTurret.dy = -Math.abs(flyingTurret.dy); // Bounce up
                }
                
                // Find closest enemy to aim at
                let closestEnemy = null;
                let minDistanceSq = Infinity;
                
                for (const enemy of enemies) {
                    if (!enemy.isHit) {
                        const distSq = (flyingTurret.x - enemy.x)**2 + (flyingTurret.y - enemy.y)**2;
                        if (distSq < minDistanceSq) {
                            minDistanceSq = distSq;
                            closestEnemy = enemy;
                        }
                    }
                }
                
                if (closestEnemy) {
                    // Update aim angle to point at closest enemy
                    flyingTurret.aimAngle = Math.atan2(closestEnemy.y - flyingTurret.y, closestEnemy.x - flyingTurret.x);

                    // Fire at closest enemy (skip if saturated - flying turret is medium priority)
                    let currentFlyingTurretInterval = FLYING_TURRET_FIRE_INTERVAL / fireRateMult;
                    if (fireRateBoostActive) currentFlyingTurretInterval /= 2;
                    // Double interval when saturated to reduce pressure on weapon pool
                    if (isProjectileSaturated) currentFlyingTurretInterval *= 2;
                    if (now - flyingTurret.lastFireTime > currentFlyingTurretInterval && !isProjectileSaturated) {
                        // Create bullet from weapon pool
                        for (const weapon of weaponPool) {
                            if (!weapon.active) {
                                weapon.x = flyingTurret.x;
                                weapon.y = flyingTurret.y;
                                weapon.size = FLYING_TURRET_BULLET_SIZE * pSizeMult;
                                weapon.speed = FLYING_TURRET_BULLET_SPEED;
                                weapon.angle = flyingTurret.aimAngle;
                                weapon.dx = Math.cos(weapon.angle) * weapon.speed;
                                weapon.dy = Math.sin(weapon.angle) * weapon.speed;
                                weapon.lifetime = now + 2000;
                                weapon.hitsLeft = 1;
                                weapon.hitEnemies.clear();
                                weapon.owner = 'flying_turret';
                                weapon.active = true;
                                weapon._isFlyingTurretBullet = true;
                                break;
                            }
                        }
                        playSound('playerShoot');
                        flyingTurret.lastFireTime = now;
                    }
                }
            }

            for (let i = pickupItems.length - 1; i >= 0; i--) {
                const item = pickupItems[i];
                // XP gems and powerup boxes persist indefinitely - no expiration timer
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

                // Check cat collision for powerup boxes
                if (!collected && catAllyActive && item.type === 'box') {
                    const catDx = catAlly.x - item.x;
                    const catDy = catAlly.y - item.y;
                    const catDistanceSq = catDx*catDx + catDy*catDy;
                    
                    // Increase detection range significantly - cat can delete boxes from further away
                    const detectionRange = ((catAlly.size / 2) + (item.size / 2)) * 2.5; // 2.5x larger range
                    if (catDistanceSq < detectionRange*detectionRange) {
                        // Cat touched the box - mark for deletion after a short delay
                        if (!item._catTouchTime) {
                            item._catTouchTime = now;
                        } else if (now - item._catTouchTime > 150) {
                            // Delete the box after 150ms of cat contact (faster since range is larger)
                            collected = true;
                            item._catCollected = true;
                        }
                    } else {
                        // Reset touch time if cat moves away
                        item._catTouchTime = null;
                    }
                }

                if (collected) {
                    if (item.type === 'box') {
                        if (item._catCollected) {
                            // Box was collected by cat - just remove it without activating powerup
                            playSound('boxPickup');
                            if (floatingTexts.length < 30) floatingTexts.push({ text: "Cat collected box!", x: catAlly.x, y: catAlly.y - 20, startTime: now, duration: 1000, color: '#ffaa00' });
                        } else {
                            // Box was collected by player
                            vibratePickup('powerup'); // Powerup vibration
                            player.boxPickupsCollectedCount++;
                            playerStats.totalBoxesOpened++;
                            
                            // Use pre-assigned powerup if available
                            if (item.powerupId) {
                                activatePowerup(item.powerupId);
                                playSound('boxPickup');
                                if (floatingTexts.length < 30) floatingTexts.push({ text: (item.powerupName || 'Powerup') + "!", x: player.x, y: player.y - player.size, startTime: now, duration: 1500 });
                                updatePowerupIconsUI();
                            }
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
                // Account for paused time when checking apple lifetime
                const effectiveElapsed = now - apple.spawnTime - (appleTotalPausedDuration || 0);
                if (effectiveElapsed > apple.lifetime) { appleItems.splice(i, 1); continue; }
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
// Clamp: minimum 50ms (fastest), maximum 5000ms (slowest - 1 shot per 5 seconds)
currentFireInterval = Math.max(50, Math.min(5000, currentFireInterval));
// Safety: if lastWeaponFireTime is somehow ahead of virtual time, reset it
if (lastWeaponFireTime > now) lastWeaponFireTime = now;
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
                weapon.hitEnemies.clear();
                weapon.owner = 'player';
                weapon.active = true;
                if (typeof runStats !== 'undefined') runStats.bulletsFired = (runStats.bulletsFired || 0) + 1;
                break;
            }
        }
    }
    playSound('playerShoot');
}

            // Cache active genie enemies once per frame (avoids O(bullets × enemies) scan)
            if (!update._activeGenies) update._activeGenies = [];
            const _activeGenies = update._activeGenies;
            _activeGenies.length = 0;
            for (let ei = 0; ei < enemies.length; ei++) {
                const e = enemies[ei];
                if (e.emoji === '🧞' && !e.isHit) _activeGenies.push(e);
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
                
                // Genie gravity field: repels bullets but they can still hit if close/fast enough
                // Uses cached _activeGenies list (built once per frame above) instead of scanning all enemies
                for (let gi = 0; gi < _activeGenies.length; gi++) {
                    const enemy = _activeGenies[gi];
                    const dx = weapon.x - enemy.x;
                    const dy = weapon.y - enemy.y;
                    const distSq = dx * dx + dy * dy;
                    const gravityRadius = enemy.gravityRadius || 80;
                    const gravityRadiusSq = gravityRadius * gravityRadius;
                    
                    if (distSq < gravityRadiusSq && distSq > 0) {
                        const dist = Math.sqrt(distSq);
                        const strength = (enemy.gravityStrength || 0.15) * (1 - dist / gravityRadius);
                        const nx = dx / dist;
                        const ny = dy / dist;
                        weapon.dx += nx * strength * weapon.speed * 0.3;
                        weapon.dy += ny * strength * weapon.speed * 0.3;
                        weapon.angle = Math.atan2(weapon.dy, weapon.dx);
                    }
                }
                
                weapon.x += weapon.dx * gameTimeScale;
                weapon.y += weapon.dy * gameTimeScale;
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

                        // Damage number for destructibles - red for oil cans, grey for walls
                        if (floatingTexts.length < 30) {
                            const isBarrel = obs.emoji === '🛢️';
                            floatingTexts.push({
                                text: '1',
                                x: obs.x + (Math.random() - 0.5) * obs.size,
                                y: obs.y - obs.size * 0.5,
                                startTime: now, duration: 600,
                                color: isBarrel ? '#ff0000' : '#888888', // Red for oil cans, grey for walls
                                fontSize: 12
                            });
                        }

                        if (obs.health <= 0) {
                            if (obs.emoji === '🛢️') {
                                handleBarrelDestruction(obs, now);
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
    // Expand bounds to include weapon's path for better piercing detection
    const pathPadding = weapon.speed || 5;
    const weaponBounds = {
        x: weapon.x - weapon.size / 2 - pathPadding,
        y: weapon.y - weapon.size / 2 - pathPadding,
        width: weapon.size + pathPadding * 2,
        height: weapon.size + pathPadding * 2
    };
    
    // Ask the quadtree for a small list of only the objects near the weapon
    const nearbyObjects = quadtree.retrieve(weaponBounds);
    
    // DEBUG: Log bone shot detection
    if (weapon._isBoneShot && nearbyObjects.length > 0) {
        console.log('[Bone Debug] nearbyObjects:', nearbyObjects.length, 'hitEnemies size:', weapon.hitEnemies.size);
    }

    // Now, only loop through this much smaller list of potential targets
    for (const targetObject of nearbyObjects) {
        const enemy = targetObject.ref; // Get the original enemy object using our reference

        // Make sure the object is a valid, hittable enemy
        if (!enemy || !enemy.health || enemy.isHit) {
            continue;
        }

        const canGhostBeHit = enemy.emoji !== '👻' || (enemy.emoji === '👻' && enemy.isVisible);

        if (canGhostBeHit && !weapon.hitEnemies.has(enemy)) {
            const dx = weapon.x - enemy.x;
            const dy = weapon.y - enemy.y;
            const combinedRadius = (weapon.size / 2) + (enemy.size / 2);

            // This is the same distance check as before
            if (dx * dx + dy * dy < combinedRadius * combinedRadius) {
                // DEBUG: Log bone hit
                if (weapon._isBoneShot) {
                    console.log('[Bone Debug] HIT enemy! hitEnemies before:', weapon.hitEnemies.size, 'enemy:', enemy.emoji);
                }
                
                // --- ALL YOUR ORIGINAL COLLISION LOGIC IS COPIED HERE ---
                let damageToDeal = player.damageMultiplier;
                // Turret bullets scale with Weapon Power
                if (weapon._isTurretBullet) { damageToDeal = 1 * player.damageMultiplier; }
                // Bone shots scale with Weapon Power
                if (weapon._isBoneShot) { damageToDeal = (weapon._boneDamage || 1) * player.damageMultiplier; }
                if (weapon._isIceCannon) { damageToDeal = ICE_CANNON_DAMAGE * player.damageMultiplier; }
                if (rocketLauncherActive) { damageToDeal *= 2; }
                if (cheats.one_hit_kill) damageToDeal = Infinity;

                if (weapon.owner === 'player' && typeof runStats !== 'undefined') {
                    if (typeof runStats.bulletsHit !== 'number' || !Number.isFinite(runStats.bulletsHit)) runStats.bulletsHit = 0;
                    runStats.bulletsHit++;
                }
                enemy.health -= damageToDeal;
                enemy.hitFlashTime = now; // Add white flash effect
                createBloodSplatter(enemy.x, enemy.y);
                weapon.hitEnemies.add(enemy);
                
                // DEBUG: Log after adding to hitEnemies
                if (weapon._isBoneShot) {
                    console.log('[Bone Debug] Added to hitEnemies, new size:', weapon.hitEnemies.size, '_isBoneShot:', weapon._isBoneShot);
                }

                // Floating damage number — throttled per enemy, colour/size scales with damage
                if (!enemy._lastDmgNum || now - enemy._lastDmgNum > 180) {
                    if (floatingTexts.length < 30) {
                        const dmg = damageToDeal === Infinity ? 999 : Math.round(damageToDeal * 10) / 10;
                        // Ice cannon gets blue damage numbers
                        let color, fontSize;
                        if (weapon._isIceCannon) {
                            fontSize = 12;
                            color = '#00aaff'; // Blue for ice
                        } else {
                            const t = Math.min(1, dmg / 5); // 0→1 over 0–5 damage
                            fontSize = Math.floor(10 + t * 8); // 10–18px
                            // White at low damage → bright yellow at high damage
                            const r = 255;
                            const g = Math.floor(255 - t * 80); // 255→175
                            color = `rgb(${r},${g},50)`;
                        }
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
                    const explosiveRadius = enemy.size * 2 * pSizeMult;
                    explosions.push({
                        x: weapon.x, y: weapon.y, radius: explosiveRadius,
                        startTime: now, duration: 300
                    });
                    vibrateExplosion();
                    // Use quadtree to only check enemies within explosion radius
                    const aoeRadius = explosiveRadius;
                    const aoeNearby = quadtree.retrieve({ x: weapon.x - aoeRadius, y: weapon.y - aoeRadius, width: aoeRadius * 2, height: aoeRadius * 2 });
                    for (let ai = 0; ai < aoeNearby.length; ai++) {
                        const otherEnemy = aoeNearby[ai].ref;
                        if (otherEnemy !== enemy && otherEnemy.health && !otherEnemy.isHit) {
                            const distSq = (otherEnemy.x - weapon.x)**2 + (otherEnemy.y - weapon.y)**2;
                            if (distSq < aoeRadius * aoeRadius) {
                                otherEnemy.health -= player.damageMultiplier;
                                if(cheats.instaKill) otherEnemy.health = 0;
                                createBloodSplatter(otherEnemy.x, otherEnemy.y);

                                // Damage number for explosive AOE
                                if (floatingTexts.length < 30) {
                                    const dmg = cheats.instaKill ? '💥' : String(Math.round(player.damageMultiplier * 10) / 10);
                                    floatingTexts.push({
                                        text: dmg,
                                        x: otherEnemy.x + (Math.random() - 0.5) * otherEnemy.size,
                                        y: otherEnemy.y - otherEnemy.size * 0.5,
                                        startTime: now, duration: 600,
                                        color: '#ff5500', fontSize: 12
                                    });
                                }

                                if (otherEnemy.health <= 0) { handleEnemyDeath(otherEnemy, explosionId); }
                            }
                        }
                    }
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
                    enemy.freezeEndTime = now + 250;
                    playerStats.totalEnemiesFrozen++;
                }
                if (weapon._isIceCannon) {
                    enemy.isFrozen = true;
                    enemy.freezeEndTime = now + ICE_CANNON_FREEZE_DURATION;
                    playerStats.totalEnemiesFrozen++;
                }
                if (flamingBulletsActive) {
                    enemy.isIgnited = true;
                    enemy.ignitionEndTime = now + 6000;
                    enemy.lastIgnitionDamageTime = now;
                }
            if (enemy.health <= 0) { handleEnemyDeath(enemy); }
                // Bone shots pierce through enemies - don't decrement hitsLeft or deactivate
                if (weapon._isBoneShot) {
                    // Piercing - continue through enemy without deactivating
                    // Don't break - keep checking other enemies in this frame
                } else {
                    weapon.hitsLeft--;
                    if (weapon.hitsLeft > 0 && ricochetActive && !rocketLauncherActive) {
                        let newTarget = null; let minDistanceSq = Infinity;
                        const ricochetRange = 300;
                        const ricochetNearby = quadtree.retrieve({ x: weapon.x - ricochetRange, y: weapon.y - ricochetRange, width: ricochetRange * 2, height: ricochetRange * 2 });
                        for (let ri = 0; ri < ricochetNearby.length; ri++) {
                            const otherEnemy = ricochetNearby[ri].ref;
                            if (otherEnemy.health && !weapon.hitEnemies.has(otherEnemy) && !otherEnemy.isHit) {
                                const distSq = (weapon.x - otherEnemy.x)**2 + (weapon.y - otherEnemy.y)**2;
                                if (distSq < minDistanceSq) { minDistanceSq = distSq; newTarget = otherEnemy; }
                            }
                        }
                        if (newTarget) {
                            if (explosiveBulletsActive) { explosions.push({ x: weapon.x, y: weapon.y, radius: enemy.size * 2 * pSizeMult, startTime: now, duration: 300 }); }
                            const angle = Math.atan2(newTarget.y - weapon.y, newTarget.x - weapon.x);
                            weapon.angle = angle;
                            weapon.dx = Math.cos(angle) * weapon.speed;
                            weapon.dy = Math.sin(angle) * weapon.speed;
                        } else { weapon.active = false; }
                    } else { weapon.active = false; }

                    // Break from the inner loop if the weapon is gone (non-piercing only)
                    if (!weapon.active) {
                        break;
                    }
                }
            }
        }
    }
}
            // Scale bomb emitter interval with fire rate and game speed
            let currentBombInterval = BOMB_INTERVAL_MS / fireRateMult;
            if (fireRateBoostActive) currentBombInterval /= 2;
            if (cheats.fastShooting) currentBombInterval /= 5;
            if (cheats.double_game_speed) currentBombInterval /= 2;
            currentBombInterval = Math.max(1000, currentBombInterval); // Minimum 1 second

            if (bombEmitterActive && now - lastBombEmitMs >= currentBombInterval) {
                bombs.push({ x: player.x, y: player.y, size: BOMB_SIZE * pSizeMult, spawnTime: now });
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
                            x: bomb.x, y: bomb.y, radius: bomb.size * 2 * pSizeMult,
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
                // Scale orbiter speed with fire rate and game speed (spin faster)
                let currentOrbitSpeed = ORBIT_SPEED * fireRateMult * gameTimeScale;
                if (fireRateBoostActive) currentOrbitSpeed *= 2;
                if (cheats.fastShooting) currentOrbitSpeed *= 5;
                if (cheats.double_game_speed) currentOrbitSpeed *= 2;
                player.orbitAngle = (player.orbitAngle + currentOrbitSpeed) % (Math.PI * 2);
                const orbitX = player.x + ORBIT_RADIUS * Math.cos(player.orbitAngle);
                const orbitY = player.y + ORBIT_RADIUS * Math.sin(player.orbitAngle);
                for (let i = enemies.length - 1; i >= 0; i--) {
                    const enemy = enemies[i];
                    const dx = orbitX - enemy.x;
                    const dy = orbitY - enemy.y;
                    if (dx*dx + dy*dy < (((ORBIT_POWER_UP_SIZE * pSizeMult) / 2) + (enemy.size / 2))**2) {
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
                    if (!eyeProj.isHit && (dx*dx + dy*dy) < (((ORBIT_POWER_UP_SIZE * pSizeMult) / 2) + (eyeProj.size / 2))**2) {
                        eyeProj.isHit = true; 
                    }
                }
            }

            // Levitating Books - like Vampire Survivors books
            // Two books orbit opposite each other, fade in/out, only damage when visible
            if (levitatingBooksActive) {
                // Scale books rotation speed with fire rate and game speed (spin faster)
                let currentBooksSpeed = LEVITATING_BOOKS_SPEED * fireRateMult * gameTimeScale;
                if (fireRateBoostActive) currentBooksSpeed *= 2;
                if (cheats.fastShooting) currentBooksSpeed *= 5;
                if (cheats.double_game_speed) currentBooksSpeed *= 2;

                // Update rotation angle
                levitatingBooksAngle = (levitatingBooksAngle + currentBooksSpeed) % (Math.PI * 2);
                
                // Calculate fade cycle
                const cycleTime = (now - levitatingBooksFadeStartTime) % LEVITATING_BOOKS_FADE_CYCLE;
                let booksAlpha = 0;
                let booksVisible = false;
                
                // Fade in phase
                if (cycleTime < LEVITATING_BOOKS_FADE_TIME) {
                    booksAlpha = cycleTime / LEVITATING_BOOKS_FADE_TIME;
                    booksVisible = true;
                }
                // Fully visible phase
                else if (cycleTime < LEVITATING_BOOKS_FADE_TIME + LEVITATING_BOOKS_VISIBLE_TIME) {
                    booksAlpha = 1;
                    booksVisible = true;
                }
                // Fade out phase
                else if (cycleTime < LEVITATING_BOOKS_FADE_TIME * 2 + LEVITATING_BOOKS_VISIBLE_TIME) {
                    const fadeOutProgress = (cycleTime - (LEVITATING_BOOKS_FADE_TIME + LEVITATING_BOOKS_VISIBLE_TIME)) / LEVITATING_BOOKS_FADE_TIME;
                    booksAlpha = 1 - fadeOutProgress;
                    booksVisible = true;
                }
                // Hidden phase - books disappear
                else {
                    booksAlpha = 0;
                    booksVisible = false;
                }
                
                // Store alpha for rendering
                levitatingBooksAlpha = booksAlpha;
                levitatingBooksCurrentlyVisible = booksVisible && booksAlpha > 0.3;
                
                // Calculate positions for both books (opposite each other)
                const book1X = player.x + LEVITATING_BOOKS_RADIUS * Math.cos(levitatingBooksAngle);
                const book1Y = player.y + LEVITATING_BOOKS_RADIUS * Math.sin(levitatingBooksAngle);
                const book2X = player.x + LEVITATING_BOOKS_RADIUS * Math.cos(levitatingBooksAngle + Math.PI);
                const book2Y = player.y + LEVITATING_BOOKS_RADIUS * Math.sin(levitatingBooksAngle + Math.PI);
                
                // Store positions for rendering
                levitatingBooksPositions = [
                    { x: book1X, y: book1Y },
                    { x: book2X, y: book2Y }
                ];
                
                // Only deal damage when books are visible (faded in)
                if (levitatingBooksCurrentlyVisible) {
                    // Check collision for both books
                    const bookPositions = [ { x: book1X, y: book1Y }, { x: book2X, y: book2Y } ];
                    
                    for (const bookPos of bookPositions) {
                        for (let i = enemies.length - 1; i >= 0; i--) {
                            const enemy = enemies[i];
                            const dx = bookPos.x - enemy.x;
                            const dy = bookPos.y - enemy.y;
                            const collisionDist = (((LEVITATING_BOOKS_SIZE * pSizeMult) / 2) + (enemy.size / 2));
                            
                            if (dx*dx + dy*dy < collisionDist * collisionDist) {
                                // Same damage as orbiter
                                if (!enemy.isHit && !enemy.isHitByBook) {
                                    const damage = player.damageMultiplier;
                                    enemy.health -= damage;
                                    createBloodSplatter(enemy.x, enemy.y);
                                    enemy.isHitByBook = true;
                                    
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
                            } else {
                                // Reset hit flag when enemy moves away
                                if (enemy.isHitByBook && (dx*dx + dy*dy > (collisionDist * 1.5) ** 2)) {
                                    enemy.isHitByBook = false;
                                }
                            }
                        }
                    }
                }
            }

             if (whirlwindAxeActive) {
                let currentAxeSpeed = WHIRLWIND_AXE_SPEED * fireRateMult * gameTimeScale;
                if (fireRateBoostActive) currentAxeSpeed *= 2;
                whirlwindAxeAngle -= currentAxeSpeed;
                const axeX = player.x + WHIRLWIND_AXE_RADIUS * Math.cos(whirlwindAxeAngle);
                const axeY = player.y + WHIRLWIND_AXE_RADIUS * Math.sin(whirlwindAxeAngle);
                const axeSearchRadius = WHIRLWIND_AXE_SIZE * pSizeMult + 50;
                const nearby = quadtree.retrieve({ x: axeX - axeSearchRadius, y: axeY - axeSearchRadius, width: axeSearchRadius * 2, height: axeSearchRadius * 2 });
                for (let ni = 0; ni < nearby.length; ni++) {
                    const enemy = nearby[ni].ref;
                    if (!enemy || enemy.isHit) continue;
                    const dx = axeX - enemy.x;
                    const dy = axeY - enemy.y;
                    if (dx*dx + dy*dy < (((WHIRLWIND_AXE_SIZE * pSizeMult) / 2) + (enemy.size / 2))**2) {
                        if (!enemy.isHitByAxe) {
                            const damage = 1 * player.damageMultiplier;
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
                const circleRadius = DAMAGING_CIRCLE_RADIUS * pSizeMult;
                const radiusSq = circleRadius * circleRadius;
                // Use quadtree for spatial query instead of iterating all enemies
                const nearby = quadtree.retrieve({ x: player.x - circleRadius, y: player.y - circleRadius, width: circleRadius * 2, height: circleRadius * 2 });
                for (let ni = 0; ni < nearby.length; ni++) {
                    const enemy = nearby[ni].ref;
                    if (!enemy || enemy.isHit) continue;
                    const dx = player.x - enemy.x;
                    const dy = player.y - enemy.y;
                    if ((dx*dx + dy*dy) < radiusSq + (enemy.size / 2)**2) {
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
            let currentLightningSpawnInterval = LIGHTNING_SPAWN_INTERVAL / fireRateMult;
            if (fireRateBoostActive) currentLightningSpawnInterval /= 2;
            if (lightningProjectileActive && now - lastLightningSpawnTime > currentLightningSpawnInterval) {
                let closestEnemy = null, minDistanceSq = Infinity;
                enemies.forEach(enemy => {
                    if (enemy.isHit || (enemy.isFrozen && now < enemy.freezeEndTime)) return;
                    const distSq = (player.x - enemy.x)**2 + (player.y - enemy.y)**2;
                    if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                });
                if (closestEnemy) {
                    const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
                    lightningBolts.push({ x: player.x, y: player.y, size: LIGHTNING_SIZE * pSizeMult, emoji: LIGHTNING_EMOJI, speed: 5.6, dx: Math.cos(angle) * 5.6, dy: Math.sin(angle) * 5.6, angle: angle, isHit: false, lifetime: now + 2000 });
                    playSound('playerShoot');
                }
                lastLightningSpawnTime = now;
            }
            
            // Flamethrower - emits flames that damage and ignite enemies
            // Skip if too many projectiles active to prevent pool exhaustion
            if (flamethrowerActive && flameProjectiles.length < FLAMETHROWER_MAX_FLAMES && !isProjectileSaturated) {
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
                        size: 14 * pSizeMult,
                        speed: 3.0,
                        dx: Math.cos(angle) * 3.0,
                        dy: Math.sin(angle) * 3.0,
                        angle: angle,
                        damage: 0.2 * player.damageMultiplier,
                        lifetime: now + 800,
                        hitEnemies: new Set()
                    });
                    lastFlameEmitTime = now;
                }
            }

            // Update flame projectiles
            for (let i = flameProjectiles.length - 1; i >= 0; i--) {
                const flame = flameProjectiles[i];
                flame.x += flame.dx * gameTimeScale;
                flame.y += flame.dy * gameTimeScale;
                
                // Remove expired flames
                if (now > flame.lifetime) {
                    flameProjectiles.splice(i, 1);
                    continue;
                }
                
                // Check collision with enemies using quadtree
                const flameRadius = flame.size;
                const flameNearby = quadtree.retrieve({ x: flame.x - flameRadius, y: flame.y - flameRadius, width: flameRadius * 2, height: flameRadius * 2 });
                for (let j = 0; j < flameNearby.length; j++) {
                    const enemy = flameNearby[j].ref;
                    if (!enemy || !enemy.health || enemy.isHit || flame.hitEnemies.has(enemy)) continue;
                    
                    const dx = flame.x - enemy.x;
                    const dy = flame.y - enemy.y;
                    const distSq = dx * dx + dy * dy;
                    const collisionDist = (flame.size / 2) + (enemy.size / 2);
                    
                    if (distSq < collisionDist * collisionDist) {
                        enemy.health -= flame.damage;
                        enemy.hitFlashTime = now;
                        flame.hitEnemies.add(enemy);
                        
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
            let currentLaserCannonInterval = LASER_CANNON_INTERVAL / fireRateMult;
            if (fireRateBoostActive) currentLaserCannonInterval /= 2;
            if (laserCannonActive && now - lastLaserCannonFireTime > currentLaserCannonInterval) {
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
            
            // Clean up expired laser beams (in-place to avoid GC)
            for (let i = laserCannonBeams.length - 1; i >= 0; i--) {
                if (now - laserCannonBeams[i].spawnTime >= laserCannonBeams[i].lifetime) laserCannonBeams.splice(i, 1);
            }

            // Laser Cross - spinning blue cross that continuously damages enemies
            if (laserCrossActive) {
                // Update rotation angle (one revolution every 2 seconds)
                let currentLaserCrossRotSpeed = LASER_CROSS_ROTATION_SPEED * fireRateMult * gameTimeScale;
                if (fireRateBoostActive) currentLaserCrossRotSpeed *= 2;
                const deltaTime = isTimeStopped ? 0 : 16 * gameTimeScale; // Approximate frame time scaled by game speed, 0 when time stopped
                laserCrossAngle += currentLaserCrossRotSpeed * (deltaTime / 1000);
                if (laserCrossAngle > Math.PI * 2) laserCrossAngle -= Math.PI * 2;

                const beamRadius = player.size * LASER_CROSS_RADIUS_MULTIPLIER * pSizeMult;
                const beamHalfWidth = (LASER_CROSS_BEAM_WIDTH * pSizeMult) / 2;

                // Calculate the 4 beam endpoints (cross pattern)
                const beamAngles = [
                    laserCrossAngle,                    // 0 degrees from cross angle
                    laserCrossAngle + Math.PI / 2,      // 90 degrees
                    laserCrossAngle + Math.PI,          // 180 degrees
                    laserCrossAngle + Math.PI * 1.5     // 270 degrees
                ];

                // Pre-compute beam geometry once (was recomputed per enemy per beam)
                const beamStartX = player.x;
                const beamStartY = player.y;
                const beams = [];
                for (let bi = 0; bi < 4; bi++) {
                    const endX = beamStartX + Math.cos(beamAngles[bi]) * beamRadius;
                    const endY = beamStartY + Math.sin(beamAngles[bi]) * beamRadius;
                    const dx = endX - beamStartX;
                    const dy = endY - beamStartY;
                    const lineLengthSq = dx * dx + dy * dy;
                    if (lineLengthSq > 0) beams.push({ dx, dy, lineLengthSq });
                }

                // Damage enemies that intersect with any of the 4 beams
                for (let ei = 0; ei < enemies.length; ei++) {
                    const enemy = enemies[ei];
                    if (enemy.isHit) continue;

                    // Quick bounding box check: skip enemies clearly outside all beam range
                    const ex = enemy.x - beamStartX;
                    const ey = enemy.y - beamStartY;
                    const maxDist = beamRadius + enemy.size / 2 + beamHalfWidth;
                    if (ex * ex + ey * ey > maxDist * maxDist) continue;

                    // Check intersection with each of the 4 beams
                    for (let bi = 0; bi < beams.length; bi++) {
                        const b = beams[bi];

                        // Project enemy position onto the line
                        const t = Math.max(0, Math.min(1, (ex * b.dx + ey * b.dy) / b.lineLengthSq));
                        const closestX = t * b.dx;
                        const closestY = t * b.dy;

                        // Squared distance from enemy center to closest point on line
                        const distX = ex - closestX;
                        const distY = ey - closestY;
                        const distToLineSq = distX * distX + distY * distY;
                        const hitRadius = enemy.size / 2 + beamHalfWidth;

                        // Compare squared distances (avoids Math.sqrt)
                        if (distToLineSq < hitRadius * hitRadius) {
                            // Apply damage with interval per enemy
                            const enemyLastHitKey = '_laserCrossLastHit';
                            let currentLaserCrossDmgInterval = LASER_CROSS_DAMAGE_INTERVAL / fireRateMult;
                            if (fireRateBoostActive) currentLaserCrossDmgInterval /= 2;
                            if (!enemy[enemyLastHitKey] || now - enemy[enemyLastHitKey] >= currentLaserCrossDmgInterval) {
                                const damage = LASER_CROSS_DAMAGE * player.damageMultiplier;
                                enemy.health -= damage;
                                enemy.hitFlashTime = now;
                                enemy[enemyLastHitKey] = now;
                                createBloodSplatter(enemy.x, enemy.y);

                                // Damage number
                                if (floatingTexts.length < 30) {
                                    floatingTexts.push({
                                        text: String(Math.round(damage * 10) / 10),
                                        x: enemy.x + (Math.random() - 0.5) * enemy.size * 0.5,
                                        y: enemy.y - enemy.size * 0.5 - Math.random() * 10,
                                        startTime: now,
                                        duration: 500,
                                        color: '#00ffff',
                                        fontSize: 11
                                    });
                                }

                                if (enemy.health <= 0) {
                                    handleEnemyDeath(enemy);
                                }
                            }
                            break; // Only damage once per enemy per frame, even if hit by multiple beams
                        }
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════════════════
            // BOOMERANG POWERUP
            // ═══════════════════════════════════════════════════════════════════════════
            // Spawn new boomerang based on fire rate scaled interval
            if (boomerangActive) {
                // Calculate interval scaled by fire rate and game speed (lower interval = faster shooting)
                let currentInterval = BOOMERANG_BASE_INTERVAL / fireRateMult;
                if (fireRateBoostActive) currentInterval /= 2;
                if (cheats.fastShooting) currentInterval /= 5;
                if (cheats.double_game_speed) currentInterval /= 2;
                currentInterval = Math.max(500, currentInterval); // Minimum 0.5s between throws
                
                if (now - lastBoomerangTime > currentInterval) {
                    // Find closest enemy for initial direction
                    let targetAngle = player.rotationAngle || 0;
                    let closestEnemy = null;
                    let minDistance = Infinity;
                    
                    enemies.forEach(enemy => {
                        const distSq = (player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2;
                        if (distSq < minDistance) {
                            minDistance = distSq;
                            closestEnemy = enemy;
                        }
                    });
                    
                    if (closestEnemy) {
                        targetAngle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
                    } else if (aimDx !== 0 || aimDy !== 0) {
                        targetAngle = Math.atan2(aimDy, aimDx);
                    }
                    
                    // Calculate max distance (4 body lengths)
                    const maxDistance = player.size * 4 * player.projectileSizeMultiplier;
                    
                    // Spawn boomerang
                    boomerangProjectiles.push({
                        x: player.x,
                        y: player.y,
                        startX: player.x,
                        startY: player.y,
                        angle: targetAngle,
                        maxDistance: maxDistance,
                        spinAngle: 0,
                        state: 'outgoing', // 'outgoing', 'stopped', 'returning'
                        spawnTime: now,
                        stopStartTime: 0,
                        lastDamageTime: 0,
                        size: player.size * 0.8 * (player.projectileSizeMultiplier || 1),
                        hitEnemies: new Set() // Track which enemies were hit this pulse
                    });
                    
                    lastBoomerangTime = now;
                }
            }
            
            // Update active boomerangs
            for (let i = boomerangProjectiles.length - 1; i >= 0; i--) {
                const b = boomerangProjectiles[i];
                const deltaTime = isTimeStopped ? 0 : (1000 / 60) * gameTimeScale; // Approximate frame time scaled by game speed
                
                // Always spin the boomerang
                b.spinAngle += 0.3; // Spin speed
                
                // State machine for boomerang movement
                if (b.state === 'outgoing') {
                    // Calculate distance from start
                    const distFromStart = Math.hypot(b.x - b.startX, b.y - b.startY);
                    
                    if (distFromStart >= b.maxDistance) {
                        // Reached max distance, stop and wait
                        b.state = 'stopped';
                        b.stopStartTime = now;
                        b.x = b.startX + Math.cos(b.angle) * b.maxDistance;
                        b.y = b.startY + Math.sin(b.angle) * b.maxDistance;
                    } else {
                        // Move outward
                        const speed = 6 * player.projectileSpeedMultiplier;
                        b.x += Math.cos(b.angle) * speed * (deltaTime / 16);
                        b.y += Math.sin(b.angle) * speed * (deltaTime / 16);
                    }
                } else if (b.state === 'stopped') {
                    // Check if stop duration is over
                    if (now - b.stopStartTime > BOOMERANG_STOP_DURATION) {
                        b.state = 'returning';
                    }
                    // Stay at max distance position
                    b.x = b.startX + Math.cos(b.angle) * b.maxDistance;
                    b.y = b.startY + Math.sin(b.angle) * b.maxDistance;
                } else if (b.state === 'returning') {
                    // Move back to player
                    const dx = player.x - b.x;
                    const dy = player.y - b.y;
                    const distToPlayer = Math.hypot(dx, dy);
                    
                    if (distToPlayer < player.size / 2) {
                        // Returned to player, remove boomerang
                        boomerangProjectiles.splice(i, 1);
                        continue;
                    }
                    
                    // Return speed (slightly faster than outgoing)
                    const returnAngle = Math.atan2(dy, dx);
                    const speed = 8 * player.projectileSpeedMultiplier;
                    b.x += Math.cos(returnAngle) * speed * (deltaTime / 16);
                    b.y += Math.sin(returnAngle) * speed * (deltaTime / 16);
                }
                
                // Damage pulse - every 0.3 seconds, damage all touching enemies
                if (now - b.lastDamageTime > BOOMERANG_PULSE_INTERVAL) {
                    b.hitEnemies.clear(); // Reset hit tracking for new pulse
                    
                    const boomerangRadius = b.size / 2;
                    
                    enemies.forEach(enemy => {
                        if (enemy.isHit) return;
                        
                        const dx = b.x - enemy.x;
                        const dy = b.y - enemy.y;
                        const distSq = dx * dx + dy * dy;
                        const collisionDist = boomerangRadius + (enemy.size / 2);
                        
                        if (distSq < collisionDist * collisionDist) {
                            // Boomerang passes through enemies (piercing)
                            const damage = BOOMERANG_DAMAGE * player.damageMultiplier;
                            enemy.health -= damage;
                            enemy.hitFlashTime = now;
                            b.hitEnemies.add(enemy); // Track for this pulse
                            createBloodSplatter(enemy.x, enemy.y);
                            
                            // Show damage number
                            if (floatingTexts.length < 30) {
                                floatingTexts.push({
                                    text: String(Math.round(damage * 10) / 10),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size * 0.5,
                                    y: enemy.y - enemy.size * 0.5 - Math.random() * 10,
                                    startTime: now,
                                    duration: 500,
                                    color: '#ffaa00',
                                    fontSize: 11
                                });
                            }
                            
                            if (enemy.health <= 0) {
                                handleEnemyDeath(enemy);
                            }
                        }
                    });
                    
                    b.lastDamageTime = now;
                }
            }

            // ═══════════════════════════════════════════════════════════════════════════
            // CHAIN LIGHTNING POWERUP
            // ═══════════════════════════════════════════════════════════════════════════
            // Spawns chain lightning that arcs between up to 4 nearby enemies
            if (chainLightningActive && enemies.length > 0) {
                // Calculate interval scaled by fire rate
                let currentInterval = CHAIN_LIGHTNING_INTERVAL / fireRateMult;
                if (fireRateBoostActive) currentInterval /= 2;
                if (cheats.fastShooting) currentInterval /= 5;
                if (cheats.double_game_speed) currentInterval /= 2;
                currentInterval = Math.max(400, currentInterval); // Minimum 0.4s
                
                if (now - lastChainLightningTime > currentInterval) {
                    // Build chain: player -> enemy1 -> enemy2 -> enemy3 -> enemy4
                    const chain = [];
                    let currentPos = { x: player.x, y: player.y };
                    let remainingEnemies = enemies.filter(e => !e.isHit);
                    
                    // Find up to CHAIN_LIGHTNING_MAX_CHAIN enemies
                    for (let i = 0; i < CHAIN_LIGHTNING_MAX_CHAIN && remainingEnemies.length > 0; i++) {
                        // Find closest enemy to current position
                        let closestEnemy = null;
                        let minDistance = Infinity;
                        let closestIndex = -1;
                        
                        remainingEnemies.forEach((enemy, index) => {
                            const dx = currentPos.x - enemy.x;
                            const dy = currentPos.y - enemy.y;
                            const distSq = dx * dx + dy * dy;
                            
                            // Must be within chain range (first from player, then from previous enemy)
                            const maxRange = (i === 0) ? CHAIN_LIGHTNING_RANGE * 1.5 : CHAIN_LIGHTNING_RANGE;
                            
                            if (distSq < maxRange * maxRange && distSq < minDistance) {
                                minDistance = distSq;
                                closestEnemy = enemy;
                                closestIndex = index;
                            }
                        });
                        
                        if (closestEnemy) {
                            chain.push(closestEnemy);
                            currentPos = { x: closestEnemy.x, y: closestEnemy.y };
                            // Remove this enemy from remaining to avoid re-chaining to same enemy
                            remainingEnemies.splice(closestIndex, 1);
                        } else {
                            break; // No more enemies in range
                        }
                    }
                    
                    // If we found at least one enemy, create the chain effect and damage
                    if (chain.length > 0) {
                        // Create chain segments for visual effect
                        const chainSegments = [];
                        let fromPos = { x: player.x, y: player.y };
                        
                        chain.forEach(enemy => {
                            chainSegments.push({
                                fromX: fromPos.x,
                                fromY: fromPos.y,
                                toX: enemy.x,
                                toY: enemy.y,
                                spawnTime: now,
                                lifetime: 400 // Visual lasts 400ms
                            });
                            fromPos = { x: enemy.x, y: enemy.y };
                        });
                        
                        // Add to active chains
                        chainLightningChains.push({
                            segments: chainSegments,
                            spawnTime: now,
                            lifetime: 400
                        });
                        
                        // Damage all enemies in chain
                        chain.forEach(enemy => {
                            const damage = CHAIN_LIGHTNING_DAMAGE * player.damageMultiplier;
                            enemy.health -= damage;
                            enemy.hitFlashTime = now;
                            createBloodSplatter(enemy.x, enemy.y);
                            
                            // Show damage number
                            if (floatingTexts.length < 30) {
                                floatingTexts.push({
                                    text: String(Math.round(damage * 10) / 10),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size * 0.5,
                                    y: enemy.y - enemy.size * 0.5 - Math.random() * 10,
                                    startTime: now,
                                    duration: 500,
                                    color: '#00ffff',
                                    fontSize: 11
                                });
                            }
                            
                            if (enemy.health <= 0) {
                                handleEnemyDeath(enemy);
                            }
                        });
                        
                        // Play sound effect
                        playSound('playerShoot');
                    }
                    
                    lastChainLightningTime = now;
                }
            }
            
            // Clean up expired chain lightning visuals (in-place to avoid GC)
            for (let i = chainLightningChains.length - 1; i >= 0; i--) {
                if (now - chainLightningChains[i].spawnTime >= chainLightningChains[i].lifetime) chainLightningChains.splice(i, 1);
            }

            // ═══════════════════════════════════════════════════════════════════════════
            // SMOKE BOMB POWERUP
            // ═══════════════════════════════════════════════════════════════════════════
            // Creates smoke, makes player invulnerable and semi-transparent for 2 seconds
            // Recharges every 8 seconds (scaled by fire rate upgrades)
            if (smokeBombActive && !isTimeStopped) {
                // Calculate interval scaled by fire rate (lower interval = faster recharge)
                let currentInterval = SMOKE_BOMB_BASE_INTERVAL / fireRateMult;
                if (fireRateBoostActive) currentInterval /= 2;
                if (cheats.fastShooting) currentInterval /= 5;
                if (cheats.double_game_speed) currentInterval /= 2;
                currentInterval = Math.max(2000, currentInterval); // Minimum 2 seconds
                
                // Check if it's time to trigger smoke bomb
                if (now - lastSmokeBombTime > currentInterval) {
                    lastSmokeBombTime = now;
                    smokeBombEffectEndTime = now + SMOKE_BOMB_EFFECT_DURATION;
                    
                    // Create smoke cloud particles around player
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const dist = Math.random() * player.size * 1.5;
                        smokeBombClouds.push({
                            x: player.x + Math.cos(angle) * dist,
                            y: player.y + Math.sin(angle) * dist,
                            size: 20 + Math.random() * 20,
                            alpha: 0.8,
                            spawnTime: now,
                            lifetime: 1000 + Math.random() * 500
                        });
                    }
                    
                    // Floating text
                    floatingTexts.push({
                        text: "Smoke Bomb!",
                        x: player.x,
                        y: player.y - player.size - 20,
                        startTime: now,
                        duration: 1000,
                        color: '#888888',
                        fontSize: 14
                    });
                }
                
                // Check if smoke bomb effect is active (player is invulnerable)
                if (now < smokeBombEffectEndTime) {
                    player.isInvincible = true;
                    player.smokeBombActive = true;
                } else {
                    player.isInvincible = false;
                    player.smokeBombActive = false;
                }
            }
            
            // Clean up expired smoke bomb clouds (in-place to avoid GC)
            for (let i = smokeBombClouds.length - 1; i >= 0; i--) {
                if (now - smokeBombClouds[i].spawnTime >= smokeBombClouds[i].lifetime) smokeBombClouds.splice(i, 1);
            }
            // Hard cap smoke bomb clouds
            if (smokeBombClouds.length > 24) smokeBombClouds.splice(0, smokeBombClouds.length - 24);

for (let i = lightningBolts.length - 1; i >= 0; i--) {
                const bolt = lightningBolts[i];
                bolt.x += bolt.dx * gameTimeScale; bolt.y += bolt.dy * gameTimeScale;
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
            // Clean up lightning bolts (in-place to avoid GC)
            for (let i = lightningBolts.length - 1; i >= 0; i--) {
                if (lightningBolts[i].isHit) lightningBolts.splice(i, 1);
            }

            // Scale sword interval with fire rate (lower interval = faster swinging)
            let currentSwordInterval = SWORD_SWING_INTERVAL / fireRateMult;
            if (fireRateBoostActive) currentSwordInterval /= 2;
            if (cheats.fastShooting) currentSwordInterval /= 5;
            if (cheats.double_game_speed) currentSwordInterval /= 2;
            currentSwordInterval = Math.max(200, currentSwordInterval); // Minimum 200ms

            if (player.swordActive && now - player.lastSwordSwingTime > currentSwordInterval) {
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

            // Spear - ALWAYS ON, points in movement direction, pushes back anything it contacts
            if (spearActive) {
                // Get movement direction (not aim direction)
                let moveDirX = 0, moveDirY = 0;

                // Check keyboard movement (WASD)
                if (keys['w'] || keys['W']) moveDirY -= 1;
                if (keys['s'] || keys['S']) moveDirY += 1;
                if (keys['a'] || keys['A']) moveDirX -= 1;
                if (keys['d'] || keys['D']) moveDirX += 1;

                // Check arrow keys for movement too
                if (keys['ArrowUp']) moveDirY -= 1;
                if (keys['ArrowDown']) moveDirY += 1;
                if (keys['ArrowLeft']) moveDirX -= 1;
                if (keys['ArrowRight']) moveDirX += 1;

                // If no keyboard input, use joystick (mobile/gamepad left stick)
                if (moveDirX === 0 && moveDirY === 0) {
                    moveDirX = joystickDirX;
                    moveDirY = joystickDirY;
                }

                // Default to facing direction if not moving
                let spearAngle;
                if (moveDirX !== 0 || moveDirY !== 0) {
                    spearAngle = Math.atan2(moveDirY, moveDirX);
                } else {
                    // Use player's current facing/rotation angle when not moving
                    spearAngle = player.rotationAngle || 0;
                }

                // Spear is always visible - update position and angle every frame
                currentSpearSwing = {
                    x: player.x, y: player.y, angle: spearAngle,
                    activeUntil: now + 100, startTime: now - 100 // Always active
                };

                // Calculate spear dimensions (scaled with projectile size)
                const spearSizeMult = player.projectileSizeMultiplier || 1;
                const scaledSpearLength = SPEAR_LENGTH * spearSizeMult;
                const scaledSpearTipSize = SPEAR_TIP_SIZE * spearSizeMult;
                const handleWidth = SPEAR_HANDLE_WIDTH * spearSizeMult;
                const tipX = player.x + Math.cos(spearAngle) * scaledSpearLength;
                const tipY = player.y + Math.sin(spearAngle) * scaledSpearLength;

                // Check for enemies contacting the spear (entire shaft + tip)
                enemies.forEach(enemy => {
                    if (enemy.isHit) return;

                    // Project enemy position onto the spear line segment
                    const startX = player.x + Math.cos(spearAngle) * (player.size / 2);
                    const startY = player.y + Math.sin(spearAngle) * (player.size / 2);
                    const segDx = tipX - startX;
                    const segDy = tipY - startY;
                    const segLenSq = segDx * segDx + segDy * segDy;
                    let distToSpear = 0;

                    if (segLenSq > 0) {
                        const t = Math.max(0, Math.min(1, ((enemy.x - startX) * segDx + (enemy.y - startY) * segDy) / segLenSq));
                        const closestX = startX + t * segDx;
                        const closestY = startY + t * segDy;
                        const ddx = enemy.x - closestX;
                        const ddy = enemy.y - closestY;
                        distToSpear = Math.sqrt(ddx * ddx + ddy * ddy);
                    } else {
                        const ddx = enemy.x - player.x;
                        const ddy = enemy.y - player.y;
                        distToSpear = Math.sqrt(ddx * ddx + ddy * ddy);
                    }

                    const hitRadius = (handleWidth / 2) + (enemy.size / 2);

                    if (distToSpear < hitRadius) {
                        // Pushback - push enemy away in spear direction
                        if (!enemy.isBoss) {
                            enemy.x += Math.cos(spearAngle) * SPEAR_KNOCKBACK_STRENGTH * 0.5;
                            enemy.y += Math.sin(spearAngle) * SPEAR_KNOCKBACK_STRENGTH * 0.5;
                        }

                        // Deal damage with interval per enemy
                        const enemyLastHitKey = '_spearLastHit';
                        if (!enemy[enemyLastHitKey] || now - enemy[enemyLastHitKey] >= SPEAR_SWING_INTERVAL) {
                            const damage = SPEAR_DAMAGE * player.damageMultiplier;
                            enemy.health -= damage;
                            enemy.hitFlashTime = now;
                            enemy[enemyLastHitKey] = now;
                            createBloodSplatter(enemy.x, enemy.y);

                            // Damage number
                            if (floatingTexts.length < 30) {
                                floatingTexts.push({
                                    text: String(Math.round(damage * 10) / 10),
                                    x: enemy.x + (Math.random() - 0.5) * enemy.size * 0.5,
                                    y: enemy.y - enemy.size * 0.5 - Math.random() * 10,
                                    startTime: now, duration: 500, color: '#aaaaaa', fontSize: 11
                                });
                            }

                            if (enemy.health <= 0) {
                                handleEnemyDeath(enemy);
                            }
                        }
                    }
                });

                // Damage destructibles (walls, oil cans) contacting the spear
                for (let di = destructibles.length - 1; di >= 0; di--) {
                    const dest = destructibles[di];
                    const startX = player.x + Math.cos(spearAngle) * (player.size / 2);
                    const startY = player.y + Math.sin(spearAngle) * (player.size / 2);
                    const segDx = tipX - startX;
                    const segDy = tipY - startY;
                    const segLenSq = segDx * segDx + segDy * segDy;
                    let distToSpear = 0;

                    if (segLenSq > 0) {
                        const t = Math.max(0, Math.min(1, ((dest.x - startX) * segDx + (dest.y - startY) * segDy) / segLenSq));
                        const closestX = startX + t * segDx;
                        const closestY = startY + t * segDy;
                        const ddx = dest.x - closestX;
                        const ddy = dest.y - closestY;
                        distToSpear = Math.sqrt(ddx * ddx + ddy * ddy);
                    } else {
                        const ddx = dest.x - player.x;
                        const ddy = dest.y - player.y;
                        distToSpear = Math.sqrt(ddx * ddx + ddy * ddy);
                    }

                    const hitRadius = (handleWidth / 2) + (dest.size / 2);

                    if (distToSpear < hitRadius) {
                        const destLastHitKey = '_spearLastHit';
                        if (!dest[destLastHitKey] || now - dest[destLastHitKey] >= SPEAR_SWING_INTERVAL) {
                            const damage = SPEAR_DAMAGE * player.damageMultiplier;
                            dest.health -= damage;
                            dest.hitFlashTime = now;
                            dest[destLastHitKey] = now;

                            // Damage number for destructibles
                            if (floatingTexts.length < 30) {
                                floatingTexts.push({
                                    text: String(Math.round(damage * 10) / 10),
                                    x: dest.x + (Math.random() - 0.5) * dest.size * 0.5,
                                    y: dest.y - dest.size * 0.5 - Math.random() * 10,
                                    startTime: now, duration: 500, color: '#aaaaaa', fontSize: 10
                                });
                            }

                            if (dest.health <= 0) {
                                if (dest.emoji === '🛢️') {
                                    handleBarrelDestruction(dest, now);
                                } else if (dest.emoji === '🧱') {
                                    handleBrickDestruction(dest);
                                }
                                destructibles.splice(di, 1);
                            }
                        }
                    }
                }
            }

            for (let i = eyeProjectiles.length - 1; i >= 0; i--) {
                const eyeProj = eyeProjectiles[i];
                eyeProj.x += eyeProj.dx * gameTimeScale; eyeProj.y += eyeProj.dy * gameTimeScale;
                if (now > eyeProj.lifetime) eyeProj.isHit = true;
                const dx = player.x - eyeProj.x;
                const dy = player.y - eyeProj.y;
                if (!player.isInvincible && (dx*dx + dy*dy) < ((player.size / 2) + (eyeProj.size / 2))**2 && !eyeProj.isHit) {
                    player.lives--; 
                    runStats.lastDamageTime = now;
                    createBloodSplatter(player.x, player.y); createBloodPuddle(player.x, player.y, player.size);
                    playSound('playerScream'); playEyeProjectileHitSound(); 
                    updateUIStats(); eyeProj.isHit = true;
                    isPlayerHitShaking = true; playerHitShakeStartTime = realNowRef; // Use real time for visual effects
                    if (player.lives <= 0) {
                        // Second Life cheat: revive once per run at full health
                        if (cheats.second_life && !player._hasRevivedWithSecondLife) {
                            player._hasRevivedWithSecondLife = true;
                            player.lives = player.maxLives;
                            floatingTexts.push({ 
                                text: "SECOND LIFE!", 
                                x: player.x, 
                                y: player.y - player.size, 
                                startTime: now, 
                                duration: 2000, 
                                color: '#FFD700',
                                fontSize: 20
                            });
                            playSound('levelUpSelect');
                        } else {
                            endGame();
                        }
                    }
                }
            }
            if (puddleTrailActive && now - lastPlayerPuddleSpawnTime > PLAYER_PUDDLE_SPAWN_INTERVAL) {
                playerPuddles.push({ x: player.x, y: player.y, size: PLAYER_PUDDLE_SIZE, spawnTime: now, lifetime: PLAYER_PUDDLE_LIFETIME });
                lastPlayerPuddleSpawnTime = now;
            }
            if (antiGravityActive && !isTimeStopped && now - lastAntiGravityPushTime > ANTI_GRAVITY_INTERVAL) {
                antiGravityPulses.push({ x: player.x, y: player.y, spawnTime: now, duration: 500 });
                const antiGravityRadiusSq = ANTI_GRAVITY_RADIUS * ANTI_GRAVITY_RADIUS;
                enemies.forEach(enemy => {
                    if (!enemy.isBoss) {
                        const dx = player.x - enemy.x;
                        const dy = player.y - enemy.y;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < antiGravityRadiusSq && distSq > 0) {
                            const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                            enemy.x += Math.cos(angle) * ANTI_GRAVITY_STRENGTH;
                            enemy.y += Math.sin(angle) * ANTI_GRAVITY_STRENGTH;
                        }
                    }
                });
                lastAntiGravityPushTime = now;
            }
            
            if (blackHoleActive && !isTimeStopped && now - lastBlackHoleTime > BLACK_HOLE_INTERVAL) {
                // Find nearest enemy to spawn black hole at their position
                let closestEnemy = null;
                let minDistanceSq = Infinity;
                enemies.forEach(enemy => {
                    if (!enemy.isHit) {
                        const distSq = (player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2;
                        if (distSq < minDistanceSq) {
                            minDistanceSq = distSq;
                            closestEnemy = enemy;
                        }
                    }
                });
                // Spawn at nearest enemy or player if no enemies
                const spawnX = closestEnemy ? closestEnemy.x : player.x;
                const spawnY = closestEnemy ? closestEnemy.y : player.y;
                blackHoles.push({
                    x: spawnX, y: spawnY, spawnTime: now, lifetime: BLACK_HOLE_DELAY + BLACK_HOLE_PULL_DURATION,
                    radius: BLACK_HOLE_RADIUS, pullStrength: BLACK_HOLE_PULL_STRENGTH
                });
                lastBlackHoleTime = now;
            }

            for (let i = blackHoles.length - 1; i >= 0; i--) {
                const hole = blackHoles[i];
                if (now - hole.spawnTime > hole.lifetime) { blackHoles.splice(i, 1); continue; }
                if (now - hole.spawnTime > BLACK_HOLE_DELAY) {
                    // Use quadtree for spatial query instead of iterating all enemies
                    const nearby = quadtree.retrieve({ x: hole.x - hole.radius, y: hole.y - hole.radius, width: hole.radius * 2, height: hole.radius * 2 });
                    for (let ni = 0; ni < nearby.length; ni++) {
                        const enemy = nearby[ni].ref;
                        if (!enemy || enemy.isBoss) continue;
                        const dx = hole.x - enemy.x, dy = hole.y - enemy.y;
                        const distSq = dx*dx + dy*dy;
                        const rSq = hole.radius * hole.radius;
                        if (distSq < rSq && distSq > 0) {
                            const dist = Math.sqrt(distSq);
                            const pullForce = hole.pullStrength * (1 - dist / hole.radius);
                            enemy.x += (dx / dist) * pullForce;
                            enemy.y += (dy / dist) * pullForce;
                        }
                    }
                }
            }

            // Time Freeze - creates a zone that freezes enemies in place (spawns at closest enemy)
            if (timeFreezeActive && !isTimeStopped && now - lastTimeFreezeTime > TIME_FREEZE_INTERVAL) {
                // Find closest enemy to player
                let closestEnemy = null;
                let minDistanceSq = Infinity;
                enemies.forEach(enemy => {
                    if (enemy.isHit) return;
                    const distSq = (player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2;
                    if (distSq < minDistanceSq) {
                        minDistanceSq = distSq;
                        closestEnemy = enemy;
                    }
                });

                // Spawn zone at closest enemy position, or at player if no enemies
                const spawnX = closestEnemy ? closestEnemy.x : player.x;
                const spawnY = closestEnemy ? closestEnemy.y : player.y;

                timeFreezeZones.push({
                    x: spawnX, y: spawnY, spawnTime: now, lifetime: TIME_FREEZE_DURATION,
                    radius: TIME_FREEZE_RADIUS
                });
                lastTimeFreezeTime = now;
            }

            for (let i = timeFreezeZones.length - 1; i >= 0; i--) {
                const zone = timeFreezeZones[i];
                if (now - zone.spawnTime > zone.lifetime) { timeFreezeZones.splice(i, 1); continue; }

                // Throttle freeze checks to every 3 frames — freeze persists 100ms so skipping frames is safe
                if (update._frame % 3 !== 0) continue;

                // Use quadtree for spatial query instead of iterating all enemies
                const nearby = quadtree.retrieve({ x: zone.x - zone.radius, y: zone.y - zone.radius, width: zone.radius * 2, height: zone.radius * 2 });
                for (let ni = 0; ni < nearby.length; ni++) {
                    const enemy = nearby[ni].ref;
                    if (!enemy) continue;
                    const dx = enemy.x - zone.x, dy = enemy.y - zone.y;
                    if (dx*dx + dy*dy < zone.radius * zone.radius) {
                        enemy.isFrozen = true;
                        enemy.freezeEndTime = now + 300; // Longer freeze to compensate for frame throttling
                    }
                }
            }

            for (let i = playerPuddles.length - 1; i >= 0; i--) { if (now - playerPuddles[i].spawnTime > playerPuddles[i].lifetime) playerPuddles.splice(i, 1); }
            for (let i = snailPuddles.length - 1; i >= 0; i--) { if (now - snailPuddles[i].spawnTime > snailPuddles[i].lifetime) snailPuddles.splice(i, 1); }
            for (let i = mosquitoPuddles.length - 1; i >= 0; i--) { if (now - mosquitoPuddles[i].spawnTime > mosquitoPuddles[i].lifetime) mosquitoPuddles.splice(i, 1); }
            for (let i = spiderWebs.length - 1; i >= 0; i--) { if (now - spiderWebs[i].spawnTime > spiderWebs[i].lifetime) spiderWebs.splice(i, 1); }
            for (let i = bloodSplatters.length - 1; i >= 0; i--) {
                const p = bloodSplatters[i];
                if (now - p.spawnTime > p.lifetime) { bloodSplatters.splice(i, 1); continue; }
                p.x += p.dx * gameTimeScale; p.y += p.dy * gameTimeScale; p.dx *= 0.96; p.dy *= 0.96; 
            }
            // Cap blood arrays — tighter limits for better performance
            if (bloodSplatters.length > 80) bloodSplatters.splice(0, bloodSplatters.length - 80);
            for (let i = bloodPuddles.length - 1; i >= 0; i--) { if (now - bloodPuddles[i].spawnTime > bloodPuddles[i].lifetime) { bloodPuddles.splice(i, 1); } }
            if (bloodPuddles.length > 40) bloodPuddles.splice(0, bloodPuddles.length - 40);

            // Clean up expired dash smoke particles
            for (let i = dashSmokeParticles.length - 1; i >= 0; i--) { if (now - dashSmokeParticles[i].spawnTime > dashSmokeParticles[i].lifetime) dashSmokeParticles.splice(i, 1); }

            for (let si = 0; si < dogHomingShots.length; si++) {
                const shot = dogHomingShots[si];
                if (shot.isHoming && enemies.length > 0) {
                    let closestEnemy = null, minDistanceSq = Infinity;
                    const homingRange = 300;
                    const homingNearby = quadtree.retrieve({ x: shot.x - homingRange, y: shot.y - homingRange, width: homingRange * 2, height: homingRange * 2 });
                    for (let hi = 0; hi < homingNearby.length; hi++) {
                        const enemy = homingNearby[hi].ref;
                        if (!enemy || !enemy.health || enemy.isHit) continue;
                        const distSq = (shot.x - enemy.x)**2 + (shot.y - enemy.y)**2;
                        if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = enemy; }
                    }
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
                shot.x += shot.dx * gameTimeScale; shot.y += shot.dy * gameTimeScale;
                if (now > shot.lifetime) shot.isHit = true;
            }

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
                // Use quadtree for spatial query instead of iterating all enemies
                const nearby = quadtree.retrieve({ x: area.x - area.radius, y: area.y - area.radius, width: area.radius * 2, height: area.radius * 2 });
                for (let ni = 0; ni < nearby.length; ni++) {
                    const enemy = nearby[ni].ref;
                    if (!enemy || enemy.isHit) continue;
                    const dx = enemy.x - area.x;
                    const dy = enemy.y - area.y;
                    if ((dx*dx + dy*dy) < area.radius*area.radius) {
                        if (!enemy.isIgnited || now > enemy.ignitionEndTime) {
                            enemy.isIgnited = true;
                            enemy.ignitionEndTime = now + 6000;
                            enemy.lastIgnitionDamageTime = now;
                        }
                    }
                }
            }

             // Pre-compute closest alive enemy once for all flies (avoids O(flies × enemies))
             let _flyClosestEnemy = null, _flyClosestDistSq = Infinity;
             for (let ei = 0; ei < enemies.length; ei++) {
                 const e = enemies[ei];
                 if (e.isHit) continue;
                 const dSq = (player.x - e.x)**2 + (player.y - e.y)**2;
                 if (dSq < _flyClosestDistSq) { _flyClosestDistSq = dSq; _flyClosestEnemy = e; }
             }
             for (let i = flies.length - 1; i >= 0; i--) {
                const fly = flies[i];
                if (fly.isHit || enemies.length === 0) { flies.splice(i, 1); continue; }
                fly.target = _flyClosestEnemy;
                if (fly.target) {
                    const angle = Math.atan2(fly.target.y - fly.y, fly.target.x - fly.x);
                    fly.x += Math.cos(angle) * FLY_SPEED;
                    fly.y += Math.sin(angle) * FLY_SPEED;
                    const dx = fly.x - fly.target.x;
                    const dy = fly.y - fly.target.y;
                    if ((dx*dx + dy*dy) < ((FLY_SIZE / 2) + (fly.target.size / 2))**2) {
                        const damage = FLY_DAMAGE * player.damageMultiplier;
                        fly.target.health -= damage;
                        createBloodSplatter(fly.target.x, fly.target.y);

                        // Damage number
                        if (floatingTexts.length < 30) {
                            floatingTexts.push({
                                text: String(Math.round(damage * 100) / 100),
                                x: fly.target.x + (Math.random() - 0.5) * fly.target.size,
                                y: fly.target.y - fly.target.size * 0.5,
                                startTime: now, duration: 600,
                                color: '#88ff00', fontSize: 10
                            });
                        }

                        if (fly.target.health <= 0) { handleEnemyDeath(fly.target); }
                        fly.isHit = true;
                    }
                }
            }
            for (let i = owlProjectiles.length - 1; i >= 0; i--) {
                const proj = owlProjectiles[i];
                proj.x += proj.dx * gameTimeScale; proj.y += proj.dy * gameTimeScale;
                if (now > proj.lifetime) proj.isHit = true;
                if (proj.isHit) continue;
                const owlRadius = proj.size;
                const owlNearby = quadtree.retrieve({ x: proj.x - owlRadius, y: proj.y - owlRadius, width: owlRadius * 2, height: owlRadius * 2 });
                for (let j = 0; j < owlNearby.length; j++) {
                    const enemy = owlNearby[j].ref;
                    if (!enemy || !enemy.health || enemy.isHit) continue;
                    const dx = proj.x - enemy.x;
                    const dy = proj.y - enemy.y;
                    if ((dx*dx + dy*dy) < ((proj.size / 2) + (enemy.size / 2))**2) {
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
                p.x += p.dx * gameTimeScale;
                p.y += p.dy * gameTimeScale;
                // Remove if lifetime expired (dash smoke) or alpha faded out (enemy smoke)
                if (p.lifetime && now - p.spawnTime >= p.lifetime) {
                    smokeParticles.splice(i, 1);
                } else if (!p.lifetime) {
                    p.alpha -= 0.03 * gameTimeScale; // fade faster (legacy enemy smoke)
                    if (p.alpha <= 0) smokeParticles.splice(i, 1);
                }
            }
            if (smokeParticles.length > 30) smokeParticles.splice(0, smokeParticles.length - 30);


            // In-place array cleanup to avoid garbage collection from .filter()
            for (let i = antiGravityPulses.length - 1; i >= 0; i--) {
                if (now - antiGravityPulses[i].spawnTime >= antiGravityPulses[i].duration) antiGravityPulses.splice(i, 1);
            }
            for (let i = explosions.length - 1; i >= 0; i--) {
                if (now - explosions[i].startTime >= explosions[i].duration) explosions.splice(i, 1);
            }
            for (let i = vengeanceNovas.length - 1; i >= 0; i--) {
                const nova = vengeanceNovas[i];
                const age = now - nova.startTime;
                if (age < nova.duration) {
                    const currentRadius = nova.maxRadius * (age / nova.duration);
                    // Use quadtree for spatial query instead of iterating all enemies
                    const nearby = quadtree.retrieve({ x: nova.x - currentRadius, y: nova.y - currentRadius, width: currentRadius * 2, height: currentRadius * 2 });
                    for (let j = nearby.length - 1; j >= 0; j--) {
                        const enemy = nearby[j].ref;
                        if (!enemy || enemy.isHit) continue;
                        const dx = nova.x - enemy.x;
                        const dy = nova.y - enemy.y;
                        if ((dx*dx + dy*dy) < currentRadius*currentRadius) {
                            handleEnemyDeath(enemy);
                        }
                    }
                } else {
                    vengeanceNovas.splice(i, 1);
                }
            }
            // Flush any remaining batched floating texts
            if (update._pendingFloatingTexts && update._pendingFloatingTexts.length > 0) {
                const toAdd = update._pendingFloatingTexts.slice(0, 30 - floatingTexts.length);
                floatingTexts.push(...toAdd);
                update._pendingFloatingTexts = [];
            }

            for (let i = floatingTexts.length - 1; i >= 0; i--) {
                if (now - floatingTexts[i].startTime >= floatingTexts[i].duration) floatingTexts.splice(i, 1);
            }
            if (floatingTexts.length > 30) floatingTexts.splice(0, floatingTexts.length - 30);
            for (let i = visualWarnings.length - 1; i >= 0; i--) {
                if (now - visualWarnings[i].startTime >= visualWarnings[i].duration) visualWarnings.splice(i, 1);
            }
            for (let i = enemies.length - 1; i >= 0; i--) {
                if (enemies[i].isHit) enemies.splice(i, 1);
            }
            for (let i = eyeProjectiles.length - 1; i >= 0; i--) {
                if (eyeProjectiles[i].isHit) eyeProjectiles.splice(i, 1);
            }
            for (let i = dogHomingShots.length - 1; i >= 0; i--) {
                if (dogHomingShots[i].isHit) dogHomingShots.splice(i, 1);
            }
            for (let i = owlProjectiles.length - 1; i >= 0; i--) {
                if (owlProjectiles[i].isHit) owlProjectiles.splice(i, 1);
            }
            for (let i = lightningStrikes.length - 1; i >= 0; i--) {
                if (now - lightningStrikes[i].startTime >= lightningStrikes[i].duration) lightningStrikes.splice(i, 1);
            }
            // Cap effect arrays to prevent unbounded growth with all power-ups active
            if (blackHoles.length > 10) blackHoles.splice(0, blackHoles.length - 10);
            if (timeFreezeZones.length > 10) timeFreezeZones.splice(0, timeFreezeZones.length - 10);
            if (antiGravityPulses.length > 20) antiGravityPulses.splice(0, antiGravityPulses.length - 20);
            if (explosions.length > 30) explosions.splice(0, explosions.length - 30);
            if (vengeanceNovas.length > 10) vengeanceNovas.splice(0, vengeanceNovas.length - 10);
            if (flameAreas.length > 20) flameAreas.splice(0, flameAreas.length - 20);
            if (playerPuddles.length > 30) playerPuddles.splice(0, playerPuddles.length - 30);
            if (eyeProjectiles.length > 30) eyeProjectiles.splice(0, eyeProjectiles.length - 30);
            if (dogHomingShots.length > 20) dogHomingShots.splice(0, dogHomingShots.length - 20);
            if (owlProjectiles.length > 20) owlProjectiles.splice(0, owlProjectiles.length - 20);
            if (peas.length > 50) peas.splice(0, peas.length - 50);
            if (flies.length > 30) flies.splice(0, flies.length - 30);
            if (smokeBombClouds.length > 24) smokeBombClouds.splice(0, smokeBombClouds.length - 24);
            if (flameProjectiles.length > 40) flameProjectiles.splice(0, flameProjectiles.length - 40);
            if (boomerangProjectiles.length > 10) boomerangProjectiles.splice(0, boomerangProjectiles.length - 10);
            if (dynamiteProjectiles.length > 15) dynamiteProjectiles.splice(0, dynamiteProjectiles.length - 15);
            if (bombs.length > 15) bombs.splice(0, bombs.length - 15);
            if (chainLightningChains.length > 10) chainLightningChains.splice(0, chainLightningChains.length - 10);
            if (laserCannonBeams.length > 5) laserCannonBeams.splice(0, laserCannonBeams.length - 5);
        }

        // draw() moved to `game_render.js`





        // (bootstrap + UI wiring moved to `game_bootstrap_ui.js`)
