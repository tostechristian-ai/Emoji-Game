// Rendering-only code.
// `update()` lives in `game_update.js`.

        function draw() {
            if (!gameActive) return;
            const realNow = Date.now();
            // Use virtual time for game-state-based animations (like spin), real time for UI effects
            const now = (typeof update !== 'undefined' && update._virtualTime) ? update._virtualTime : realNow;
            
            // Reset ignited enemy counter for this frame
            draw._ignitedCount = 0;

            // Viewport bounds for culling — add a margin so things don't pop in at edges
            const CULL_MARGIN = 80;
            const viewLeft   = cameraOffsetX - CULL_MARGIN;
            const viewTop    = cameraOffsetY - CULL_MARGIN;
            const viewRight  = cameraOffsetX + canvas.width  + CULL_MARGIN;
            const viewBottom = cameraOffsetY + canvas.height + CULL_MARGIN;
            const inView = (x, y, r) =>
                x + r > viewLeft && x - r < viewRight &&
                y + r > viewTop  && y - r < viewBottom;
            let currentHitShakeX = 0, currentHitShakeY = 0;
            if (isPlayerHitShaking) {
                const elapsedTime = realNow - playerHitShakeStartTime;
                if (elapsedTime < PLAYER_HIT_SHAKE_DURATION) {
                    const shakeIntensity = MAX_PLAYER_HIT_SHAKE_OFFSET * (1 - (elapsedTime / PLAYER_HIT_SHAKE_DURATION));
                    currentHitShakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
                    currentHitShakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
                } else isPlayerHitShaking = false;
            }

            // Apply same shake to UI elements (gameStats)
            // Scale is on #gameStatsWrapper, shake transform is on #gameStats — no conflict
            const gameStatsEl = document.getElementById('gameStats');
            if (gameStatsEl) {
                if (currentHitShakeX !== 0 || currentHitShakeY !== 0) {
                    gameStatsEl.style.transform = `translate(${currentHitShakeX}px, ${currentHitShakeY}px)`;
                } else {
                    gameStatsEl.style.transform = '';
                }
            }

            let finalCameraOffsetX = cameraOffsetX - currentHitShakeX;
            let finalCameraOffsetY = cameraOffsetY - currentHitShakeY;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(cameraZoom, cameraZoom);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            
            // Mirror mode: flip entire canvas horizontally
            if (cheats.mirror_mode) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            
            ctx.save();
            ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
            if (backgroundImages.length > 0) ctx.drawImage(backgroundImages[currentBackgroundIndex], 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
            else { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); }
            ctx.restore();
            
            ctx.save();
            ctx.translate(-finalCameraOffsetX, -finalCameraOffsetY);
            
            destructibles.forEach(obs => {
                // Draw shadow under destructibles (like enemies have)
                const isMobile = document.body.classList.contains('is-mobile');
                const shadowY = obs.y + obs.size * 0.4;
                const shadowRadiusX = obs.size * 0.5 * (isMobile ? 1.1 : 1);
                const shadowRadiusY = obs.size * 0.2 * (isMobile ? 1.1 : 1);
                ctx.beginPath();
                ctx.ellipse(obs.x, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = isMobile ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.3)';
                ctx.fill();

                if(obs.health !== Infinity) ctx.globalAlpha = 0.5 + (obs.health / obs.maxHealth) * 0.5;
                const preRendered = preRenderedEntities[obs.emoji];
                if(preRendered) {
                    ctx.drawImage(preRendered, obs.x - preRendered.width / 2, obs.y - preRendered.height / 2);
                }

                // Wall crumbling/cracking effect for damaged walls (bricks)
                if (obs.emoji === '🧱' && obs.health < obs.maxHealth && obs.health > 0) {
                    const damageRatio = 1 - (obs.health / obs.maxHealth);
                    const crackCount = Math.floor(damageRatio * 4) + 2; // 2-5 cracks based on damage

                    ctx.save();
                    ctx.strokeStyle = `rgba(60, 40, 20, ${0.6 + damageRatio * 0.3})`; // Dark brown cracks
                    ctx.lineWidth = 1.2; // 60% of original 2
                    ctx.lineCap = 'round';

                    // Generate consistent crack pattern based on position
                    const seed = Math.floor(obs.x * 1000 + obs.y);
                    const random = (s) => {
                        const x = Math.sin(s) * 10000;
                        return x - Math.floor(x);
                    };

                    for (let i = 0; i < crackCount; i++) {
                        const crackSeed = seed + i * 123;
                        const startX = obs.x + (random(crackSeed) - 0.5) * obs.size * 0.29;
                        const startY = obs.y + (random(crackSeed + 1) - 0.5) * obs.size * 0.29;

                        // Draw main crack line
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);

                        // Create jagged crack with 2-3 segments
                        const segments = 2 + Math.floor(random(crackSeed + 2) * 2);
                        let currentX = startX;
                        let currentY = startY;

                        for (let j = 0; j < segments; j++) {
                            const angle = random(crackSeed + 3 + j) * Math.PI * 2;
                            const length = (0.072 + random(crackSeed + 4 + j) * 0.108) * obs.size; // 60% of original
                            currentX += Math.cos(angle) * length;
                            currentY += Math.sin(angle) * length;
                            ctx.lineTo(currentX, currentY);

                            // Small branch crack occasionally
                            if (random(crackSeed + 5 + j) > 0.6) {
                                ctx.save();
                                ctx.beginPath();
                                ctx.moveTo(currentX, currentY);
                                const branchAngle = angle + (random(crackSeed + 6 + j) - 0.5) * Math.PI;
                                const branchLength = length * 0.4;
                                ctx.lineTo(
                                    currentX + Math.cos(branchAngle) * branchLength,
                                    currentY + Math.sin(branchAngle) * branchLength
                                );
                                ctx.lineWidth = 0.6; // 60% of original 1
                                ctx.stroke();
                                ctx.restore();
                            }
                        }

                        ctx.stroke();
                    }

                    // Add some debris/chips around damaged wall
                    if (damageRatio > 0.5) {
                        const debrisCount = Math.floor(damageRatio * 4);
                        ctx.fillStyle = 'rgba(139, 90, 43, 0.7)'; // Brick-colored debris
                        for (let i = 0; i < debrisCount; i++) {
                            const debrisSeed = seed + i * 777;
                            const dx = obs.x + (random(debrisSeed) - 0.5) * obs.size * 0.6;
                            const dy = obs.y + obs.size * 0.4 + random(debrisSeed + 1) * obs.size * 0.18;
                            const size = 1.2 + random(debrisSeed + 2) * 1.8; // 60% of original
                            ctx.beginPath();
                            ctx.arc(dx, dy, size, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }

                    ctx.restore();
                }

                ctx.globalAlpha = 1.0;
            });

            flameAreas.forEach(area => {
                const age = now - area.startTime;
                const lifeRatio = age / (area.endTime - area.startTime);
                const alpha = 1 - lifeRatio;
                if (!inView(area.x, area.y, area.radius)) return;
                // Throttle flame position recalc to every 120ms — avoids per-frame Math.random
                if (!area._flameCache || now - area._flameCacheTime > 120) {
                    area._flameCache = [];
                    for (let i = 0; i < 3; i++) {
                        const angle = (i / 3) * Math.PI * 2 + (now / 500);
                        const dist  = (0.3 + Math.random() * 0.5) * area.radius;
                        area._flameCache.push({
                            x: area.x + Math.cos(angle) * dist,
                            y: area.y + Math.sin(angle) * dist,
                            size: 10 + Math.random() * 4
                        });
                    }
                    area._flameCacheTime = now;
                }
                ctx.save();
                ctx.globalAlpha = alpha * 0.4;
                ctx.fillStyle = '#1a1a1a';
                ctx.beginPath();
                ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha * 0.7;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Set font once for all flames in this area
                ctx.font = `${area._flameCache[0]?.size || 12}px sans-serif`;
                for (const f of area._flameCache) {
                    ctx.fillText('🔥', f.x, f.y);
                }
                ctx.restore();
            });

            // Render smoke bomb clouds
            smokeBombClouds.forEach(cloud => {
                const age = now - cloud.spawnTime;
                const lifeRatio = age / cloud.lifetime;
                const alpha = (1 - lifeRatio) * cloud.alpha;
                if (!inView(cloud.x, cloud.y, cloud.size)) return;
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
                ctx.fill();
                // Inner darker core
                ctx.fillStyle = 'rgba(60, 60, 60, 0.9)';
                ctx.beginPath();
                ctx.arc(cloud.x, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            bloodSplatters.forEach(p => {
                if (!inView(p.x, p.y, p.size)) return;
                const age = now - p.spawnTime;
                const alpha = 1 - (age / p.lifetime);
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.fillStyle = p.isWhite ? '#FFB6C1' : 'red';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            if (damagingCircleActive) {
                damagingCircleAngle += DAMAGING_CIRCLE_SPIN_SPEED;
                const pulse = 1 + Math.sin(now / 300) * 0.1;
                const scaledRadius = DAMAGING_CIRCLE_RADIUS * (player.bulletSizeMultiplier || 1);
                const size = scaledRadius * 2 * pulse;
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.translate(player.x, player.y);
                ctx.rotate(damagingCircleAngle);
                ctx.drawImage(sprites.circle, -size / 2, -size / 2, size, size);
                ctx.restore();
            }

            for (const puddle of playerPuddles) {
                const age = now - puddle.spawnTime;
                const opacity = 1 - (age / puddle.lifetime);
                if (opacity > 0) {
                    ctx.save();
                    ctx.globalAlpha = opacity * 0.525; // 75% of previous 0.7 max opacity
                    ctx.drawImage(sprites.slime, puddle.x - puddle.size / 2, puddle.y - puddle.size / 2, puddle.size, puddle.size);
                    ctx.restore();
                }
            }

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

            // Render snail slime trails (greenish puddles that slow the player)
            for (const puddle of snailPuddles) {
                const age = now - puddle.spawnTime;
                const opacity = 1 - (age / puddle.lifetime);
                if (opacity > 0) {
                    ctx.save();
                    ctx.globalAlpha = opacity * 0.85;
                    // Dark green border for visibility
                    ctx.strokeStyle = 'rgba(50, 120, 50, 1)';
                    ctx.lineWidth = 3;
                    // Bright green fill
                    ctx.fillStyle = 'rgba(120, 220, 120, 1)';
                    ctx.beginPath();
                    ctx.arc(puddle.x, puddle.y, puddle.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    // Inner highlight
                    ctx.fillStyle = 'rgba(180, 255, 180, 0.7)';
                    ctx.beginPath();
                    ctx.arc(puddle.x - 4, puddle.y - 4, puddle.size / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Render spider webs
            for (const web of spiderWebs) {
                const age = now - web.spawnTime;
                const opacity = 1 - (age / web.lifetime);
                if (opacity > 0) {
                    ctx.save();
                    ctx.globalAlpha = opacity * 0.8;
                    const preRendered = preRenderedEntities['🕸️'];
                    if (preRendered) {
                        ctx.drawImage(preRendered, web.x - preRendered.width / 2, web.y - preRendered.height / 2);
                    }
                    ctx.restore();
                }
            }
            
            bloodPuddles.forEach(puddle => {
                if (!inView(puddle.x, puddle.y, puddle.initialSize)) return;
                const age = now - puddle.spawnTime;
                if (age < puddle.lifetime) {
                    const lifeRatio = age / puddle.lifetime;
                    const currentSize = Math.max(0, puddle.initialSize * (1 - lifeRatio));
                    if (currentSize <= 0) return;
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    ctx.translate(puddle.x, puddle.y);
                    ctx.rotate(puddle.rotation);
                    ctx.drawImage(sprites.bloodPuddle, -currentSize / 2, -currentSize / 2, currentSize, currentSize);
                    ctx.restore();
                }
            });

            antiGravityPulses.forEach(pulse => {
                const age = now - pulse.spawnTime;
                const lifeRatio = age / pulse.duration;
                if (lifeRatio >= 1) return; // Skip expired pulses
                const currentRadius = Math.max(0, ANTI_GRAVITY_RADIUS * lifeRatio);
                const alpha = 1 - lifeRatio;
                ctx.save();
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(pulse.x, pulse.y, currentRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });

            blackHoles.forEach(hole => {
                const age = now - hole.spawnTime;
                const lifeRatio = age / hole.lifetime;
                if (lifeRatio >= 1) return; // Skip expired black holes
                const alpha = Math.max(0, 1 - lifeRatio);
                ctx.save();
                const timeIntoDelay = now - hole.spawnTime;
                let currentRadius = hole.radius;
                let coreRadius = Math.max(0, 20 * (1 - lifeRatio));
                if (timeIntoDelay < BLACK_HOLE_DELAY) {
                    const delayProgress = timeIntoDelay / BLACK_HOLE_DELAY;
                    currentRadius = Math.max(0, hole.radius * delayProgress);
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
                if (coreRadius > 0) {
                    ctx.beginPath();
                    ctx.arc(hole.x, hole.y, coreRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                    ctx.fill();
                }
                ctx.restore();
            });

            // Render time freeze zones
            timeFreezeZones.forEach(zone => {
                const age = now - zone.spawnTime;
                const lifeRatio = age / zone.lifetime;
                if (lifeRatio >= 1) return; // Skip expired zones
                const alpha = Math.max(0, 1 - lifeRatio);
                const pulse = 1 + Math.sin(now / 150) * 0.1;

                ctx.save();

                // Outer transparent purple glow
                ctx.beginPath();
                ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(150, 50, 255, ${alpha * 0.15})`;
                ctx.fill();

                // Middle ring
                ctx.beginPath();
                ctx.arc(zone.x, zone.y, zone.radius * pulse * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180, 100, 255, ${alpha * 0.2})`;
                ctx.fill();

                // Inner bright core
                ctx.beginPath();
                ctx.arc(zone.x, zone.y, zone.radius * 0.3 * pulse, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 150, 255, ${alpha * 0.3})`;
                ctx.fill();

                // Border ring
                ctx.beginPath();
                ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(180, 100, 255, ${alpha * 0.5})`;
                ctx.lineWidth = 3;
                ctx.stroke();

                // Clock-like spiral effect to indicate time freezing
                const spiralAngle = (now / 500) % (Math.PI * 2);
                ctx.beginPath();
                ctx.arc(zone.x, zone.y, zone.radius * 0.5, spiralAngle, spiralAngle + Math.PI * 1.5);
                ctx.strokeStyle = `rgba(220, 180, 255, ${alpha * 0.7})`;
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();

                ctx.restore();
            });

            // Render Stone Glare cone
            if (stoneGlareActive) {
                // Get cone direction from aim or facing
                let coneAngle = 0;
                if (aimDx !== 0 || aimDy !== 0) {
                    coneAngle = Math.atan2(aimDy, aimDx);
                } else {
                    if (player.facing === 'up') coneAngle = -Math.PI / 2;
                    else if (player.facing === 'down') coneAngle = Math.PI / 2;
                    else if (player.facing === 'left') coneAngle = Math.PI;
                    else coneAngle = 0;
                }

                // Scale range with bullet size upgrade
                const scaledRange = STONE_GLARE_RANGE * (player.bulletSizeMultiplier || 1);

                ctx.save();

                // Draw cone arc
                ctx.beginPath();
                ctx.moveTo(player.x, player.y);
                ctx.arc(player.x, player.y, scaledRange, coneAngle - STONE_GLARE_ANGLE / 2, coneAngle + STONE_GLARE_ANGLE / 2);
                ctx.closePath();

                // Transparent purple fill
                ctx.fillStyle = 'rgba(147, 51, 234, 0.15)'; // Purple with low alpha
                ctx.fill();

                // Soft purple border
                ctx.strokeStyle = 'rgba(147, 51, 234, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw arc lines at edges of cone
                ctx.beginPath();
                ctx.moveTo(player.x, player.y);
                ctx.lineTo(
                    player.x + Math.cos(coneAngle - STONE_GLARE_ANGLE / 2) * scaledRange,
                    player.y + Math.sin(coneAngle - STONE_GLARE_ANGLE / 2) * scaledRange
                );
                ctx.moveTo(player.x, player.y);
                ctx.lineTo(
                    player.x + Math.cos(coneAngle + STONE_GLARE_ANGLE / 2) * scaledRange,
                    player.y + Math.sin(coneAngle + STONE_GLARE_ANGLE / 2) * scaledRange
                );
                ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();
            }

            smokeParticles.forEach(p => {
                if (!inView(p.x, p.y, p.size)) return;
                ctx.save();
                // Calculate fade based on lifetime if available, otherwise use static alpha
                let renderAlpha = p.alpha;
                if (p.spawnTime && p.lifetime) {
                    const age = now - p.spawnTime;
                    renderAlpha = p.alpha * (1 - age / p.lifetime);
                }
                ctx.globalAlpha = Math.max(0, renderAlpha);
                ctx.font = `${p.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💨', p.x, p.y);
                ctx.restore();
            });

            enemies.forEach(enemy => {
                if (!inView(enemy.x, enemy.y, enemy.size)) return;
                ctx.save();

                // Draw light shadow under enemy
                const isMobile = document.body.classList.contains('is-mobile');
                const shadowY = enemy.y + enemy.size * 0.4;
                const shadowRadiusX = enemy.size * 0.5 * (isMobile ? 1.1 : 1);
                const shadowRadiusY = enemy.size * 0.2 * (isMobile ? 1.1 : 1);
                ctx.beginPath();
                ctx.ellipse(enemy.x, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = isMobile ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.3)';
                ctx.fill();

                // VORTEX: Draw AOE circle (transparent orange pulsing circle under the enemy)
                if (enemy.emoji === '🌀') {
                    const now = Date.now();
                    const aoeRadius = enemy.size * 3;
                    const pulse = 1 + Math.sin(now / 200) * 0.1; // Pulsing effect
                    const currentRadius = aoeRadius * pulse;
                    
                    // Outer transparent orange circle
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 165, 0, 0.15)`; // Transparent orange
                    ctx.fill();
                    
                    // Inner lighter orange circle
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, currentRadius * 0.6, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 200, 100, 0.1)`;
                    ctx.fill();
                    
                    // Pulsing orange border
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, currentRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 140, 0, 0.4)`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // CHARGER: Draw red arrow under the enemy during aiming phase
                if (enemy.emoji === '🪬' && enemy.chargerState === 'aiming' && enemy.arrowVisible) {
                    const arrowLength = enemy.size * 2.5; // 2-3x length of charger sprite
                    const arrowWidth = enemy.size * 0.4;
                    const angle = enemy.chargeAngle || 0;
                    
                    ctx.save();
                    ctx.translate(enemy.x, enemy.y);
                    ctx.rotate(angle);
                    
                    // Draw semi-transparent red arrow
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.lineWidth = 2;
                    
                    // Arrow shaft
                    ctx.beginPath();
                    ctx.moveTo(0, -arrowWidth / 2);
                    ctx.lineTo(arrowLength, -arrowWidth / 2);
                    ctx.lineTo(arrowLength, arrowWidth / 2);
                    ctx.lineTo(0, arrowWidth / 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    
                    // Arrow head
                    const headLength = enemy.size * 0.6;
                    const headWidth = enemy.size * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(arrowLength, -headWidth / 2);
                    ctx.lineTo(arrowLength + headLength, 0);
                    ctx.lineTo(arrowLength, headWidth / 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.restore();
                }

                // PULSING EYE: Draw red expanding damage ring
                if (enemy.emoji === '🧿' && enemy.pulseRadius > 0) {
                    ctx.save();
                    
                    // Calculate pulse progress for alpha fade
                    const maxRadius = enemy.size * 2;
                    const pulseProgress = enemy.pulseRadius / maxRadius;
                    const alpha = 0.6 * (1 - pulseProgress); // Fade as it expands
                    
                    // Draw red ring (outline only)
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, enemy.pulseRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    
                    // Inner glow effect (ensure radius never goes negative)
                    const innerRadius = Math.max(0, enemy.pulseRadius - 2);
                    if (innerRadius > 0) {
                        ctx.beginPath();
                        ctx.arc(enemy.x, enemy.y, innerRadius, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(255, 100, 100, ${alpha * 0.5})`;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                    
                    ctx.restore();
                }

                // White flash when hit
                if (enemy.hitFlashTime && now - enemy.hitFlashTime < 100) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.8;
                }

                // Mega Boss: purple glow outline
                if (enemy.isMegaBoss) {
                    ctx.shadowColor = '#9900ff';
                    ctx.shadowBlur = 20;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }

                if (enemy.emoji === '👻') {
                    ctx.globalAlpha = enemy.isVisible ? 1.0 : 0.2;
                }

                // Frozen: blue tint
                if (enemy.isFrozen) {
                    ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.7;
                }

                // Stone Glare: grey tint
                if (enemy.isSlowedByStoneGlare) {
                    ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.85;
                }

                const emojiToDraw = enemy.isBoss ? enemy.mimics : enemy.emoji;
                const preRenderedImage = preRenderedEntities[emojiToDraw];
                if(preRenderedImage) {
                    // Calculate scale factor based on enemy's actual size vs pre-rendered size
                    const scaleFactor = enemy.size / preRenderedImage.width;
                    const drawWidth = preRenderedImage.width * scaleFactor;
                    const drawHeight = preRenderedImage.height * scaleFactor;
                    const drawX = enemy.x - drawWidth / 2;
                    const drawY = enemy.y - drawHeight / 2 + (enemy.bobOffset || 0);

                    // Apply blue tint for frozen enemies, grey for stone glare
                    if (enemy.isFrozen) {
                        ctx.save();
                        ctx.filter = 'hue-rotate(180deg) saturate(3) brightness(0.8)';
                        ctx.drawImage(preRenderedImage, drawX, drawY, drawWidth, drawHeight);
                        ctx.restore();
                    } else if (enemy.isSlowedByStoneGlare) {
                        ctx.save();
                        ctx.filter = 'grayscale(100%) brightness(0.7)';
                        ctx.drawImage(preRenderedImage, drawX, drawY, drawWidth, drawHeight);
                        ctx.restore();
                    } else if (enemy.emoji === '🌀') {
                        // Vortex: spin the emoji
                        ctx.save();
                        ctx.translate(enemy.x, enemy.y);
                        ctx.rotate(enemy.vortexAngle || 0);
                        ctx.drawImage(preRenderedImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                        ctx.restore();
                    } else {
                        ctx.drawImage(preRenderedImage, drawX, drawY, drawWidth, drawHeight);
                    }
                }

                if (enemy.isIgnited) {
                    // Count burning enemies for throttling
                    if (!draw._ignitedCount) draw._ignitedCount = 0;
                    draw._ignitedCount++;
                    
                    // Only render fire for every 2nd burning enemy when many burning
                    const manyBurning = draw._ignitedCount > 15;
                    if (!manyBurning || (draw._ignitedCount % 2 === 0)) {
                        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.8);
                        ctx.font = `${enemy.size * 0.8}px sans-serif`;
                        ctx.fillText('🔥', enemy.x, enemy.y + (enemy.bobOffset || 0));
                    }
                }
                ctx.restore();

                // Boss health bar
                if (enemy.isBoss) {
                    let maxHp;
                    if (enemy.isMegaBoss) {
                        // Match createMegaBoss() calculation: base * power-up scaling
                        let baseMegaHp = Math.floor((20 + (player.level || 1) * 1.5) * 10);
                        const powerUpCount = player.boxPickupsCollectedCount || 0;
                        if (powerUpCount >= 15) {
                            maxHp = Math.floor(baseMegaHp * 1.75);
                        } else if (powerUpCount >= 10) {
                            maxHp = Math.floor(baseMegaHp * 1.5);
                        } else {
                            maxHp = baseMegaHp;
                        }
                    } else {
                        maxHp = Math.floor(20 + (player.level || 1) * 1.5);
                    }
                    const hpRatio = Math.max(0, enemy.health / maxHp);
                    const barW = enemy.size * 1.2;
                    const barH = enemy.isMegaBoss ? 8 : 5; // Larger bar for mega boss
                    const barX = enemy.x - barW / 2;
                    const barY = enemy.y + enemy.size / 2 + 6 + (enemy.bobOffset || 0);
                    ctx.fillStyle = '#222';
                    ctx.fillRect(barX, barY, barW, barH);
                    
                    if (enemy.isMegaBoss) {
                        // Mega boss: purple health bar
                        const r = Math.floor(150 + 105 * (1 - hpRatio));
                        const b = Math.floor(255 * (0.5 + 0.5 * hpRatio));
                        ctx.fillStyle = `rgb(${r},0,${b})`;
                    } else {
                        // Regular boss: Colour shifts green → orange → red as health drops
                        const r = Math.floor(255 * (1 - hpRatio));
                        const g = Math.floor(200 * hpRatio);
                        ctx.fillStyle = `rgb(${r},${g},0)`;
                    }
                    ctx.fillRect(barX, barY, barW * hpRatio, barH);
                    ctx.strokeStyle = enemy.isMegaBoss ? '#9900ff' : '#000';
                    ctx.lineWidth = enemy.isMegaBoss ? 2 : 1;
                    ctx.strokeRect(barX, barY, barW, barH);
                    
                    // Reset shadow after drawing
                    if (enemy.isMegaBoss) {
                        ctx.shadowBlur = 0;
                    }
                }
            });

            explosions.forEach(explosion => {
                const age = now - explosion.startTime;
                if (age < explosion.duration) {
                    const lifeRatio = age / explosion.duration;
                    const currentRadius = Math.max(0, explosion.radius * lifeRatio);
                    const alpha = Math.max(0, 1 - lifeRatio);
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(explosion.x, explosion.y, currentRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 165, 0, ${alpha * 0.7})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();
                }
            });

            vengeanceNovas.forEach(nova => {
                const age = now - nova.startTime;
                if (age < nova.duration) {
                    const lifeRatio = age / nova.duration;
                    const currentRadius = Math.max(0, nova.maxRadius * lifeRatio);
                    const alpha = Math.max(0, 1 - lifeRatio);
                    ctx.save();
                    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(nova.x, nova.y, currentRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            });

            for(const weapon of weaponPool) {
                if(!weapon.active) continue;
                ctx.save();
                ctx.translate(weapon.x, weapon.y);
                // Skull: spinning bones instead of bullets
                if (player._isSkull) {
                    weapon._boneSpin = ((weapon._boneSpin || weapon.angle) + 0.25);
                    ctx.rotate(weapon._boneSpin);
                    const bonePre = preRenderedEntities && preRenderedEntities['🦴'];
                    if (bonePre) { ctx.drawImage(bonePre, -10, -10, 20, 20); }
                    ctx.restore();
                    continue;
                }
                // Bone Shot: spinning bones (piercing projectiles)
                if (weapon._isBoneShot) {
                    weapon._boneSpin = ((weapon._boneSpin || weapon.angle) + 0.25);
                    ctx.rotate(weapon._boneSpin);
                    const bonePre = preRenderedEntities && preRenderedEntities['🦴'];
                    const bSize = weapon.size * 0.6; // Scale with projectile size upgrades
                    if (bonePre) {
                        ctx.drawImage(bonePre, -bSize/2, -bSize/2, bSize, bSize);
                    } else {
                        ctx.rotate(weapon.angle);
                        ctx.font = `${weapon.size}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🦴', 0, 0);
                    }
                    ctx.restore();
                    continue;
                }
                // Lumberjack: spinning axes instead of bullets
                if (player._isLumberjack) {
                    weapon._axeSpin = ((weapon._axeSpin || weapon.angle) + 0.3);
                    ctx.rotate(weapon._axeSpin);
                    const axePre = preRenderedEntities && preRenderedEntities['🪓'];
                    if (axePre) { ctx.drawImage(axePre, -11, -11, 22, 22); }
                    ctx.restore();
                    continue;
                }
                // Ice Cannon: snowflakes instead of bullets
                if (weapon._isIceCannon) {
                    const snowflakePre = preRenderedEntities && preRenderedEntities['❄️'];
                    if (snowflakePre) {
                        ctx.rotate(weapon.angle + Math.PI / 2); // Align snowflake
                        ctx.drawImage(snowflakePre, -12, -12, 24, 24);
                    }
                    ctx.restore();
                    continue;
                }
                // Snowman: snowflakes instead of bullets
                if (weapon._isSnowflakeBullet || (player._isSnowman && weapon.owner === 'player')) {
                    const snowflakePre = preRenderedEntities && preRenderedEntities['❄️'];
                    if (snowflakePre) {
                        ctx.rotate(weapon.angle + Math.PI / 2); // Align snowflake
                        ctx.drawImage(snowflakePre, -weapon.size/2, -weapon.size/2, weapon.size, weapon.size);
                    } else {
                        ctx.rotate(weapon.angle);
                        ctx.font = `${weapon.size}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('❄️', 0, 0);
                    }
                    ctx.restore();
                    continue;
                }
                ctx.rotate(weapon.angle);
                const bW = weapon.size * 1.8;
                const bH = weapon.size * 0.6;
                // Draw bullet with solid color tint overlay
                ctx.drawImage(sprites.bullet, -bW / 2, -bH / 2, bW, bH);
                // Overlay red/blue color on top of bullet pixels only - smaller than bullet (1/3 size)
                if (iceProjectileActive || fireRateBoostActive) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = iceProjectileActive ? 'rgba(0, 180, 255, 0.14)' : 'rgba(255, 0, 0, 0.9)';
                    const tintW = bW * 0.33;
                    const tintH = bH * 0.33;
                    ctx.fillRect(-tintW / 2, -tintH / 2, tintW, tintH);
                    ctx.restore();
                }
                ctx.restore();
            }
            
            // Render boomerangs
            boomerangProjectiles.forEach(b => {
                if (!inView(b.x, b.y, b.size)) return;
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.spinAngle);
                
                // Draw the boomerang emoji
                ctx.font = `${b.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🪃', 0, 0);
                
                ctx.restore();
            });
            
            // Render chain lightning
            chainLightningChains.forEach(chain => {
                const age = now - chain.spawnTime;
                const lifeRatio = 1 - (age / chain.lifetime);
                
                if (lifeRatio <= 0) return;
                
                ctx.save();
                
                // Draw each segment of the chain
                chain.segments.forEach((segment, index) => {
                    // Create jagged lightning effect
                    const numJags = 8;
                    const jagSize = 4 * lifeRatio;
                    
                    ctx.beginPath();
                    ctx.moveTo(segment.fromX - finalCameraOffsetX, segment.fromY - finalCameraOffsetY);
                    
                    const dx = segment.toX - segment.fromX;
                    const dy = segment.toY - segment.fromY;
                    const dist = Math.hypot(dx, dy);
                    const angle = Math.atan2(dy, dx);
                    
                    // Draw jagged line
                    for (let i = 1; i <= numJags; i++) {
                        const t = i / numJags;
                        const baseX = segment.fromX + dx * t - finalCameraOffsetX;
                        const baseY = segment.fromY + dy * t - finalCameraOffsetY;
                        
                        // Add random jitter perpendicular to line direction
                        const perpAngle = angle + Math.PI / 2;
                        const jitter = (Math.random() - 0.5) * jagSize * 2 * lifeRatio;
                        
                        ctx.lineTo(baseX + Math.cos(perpAngle) * jitter, baseY + Math.sin(perpAngle) * jitter);
                    }
                    
                    ctx.lineTo(segment.toX - finalCameraOffsetX, segment.toY - finalCameraOffsetY);
                    
                    // Style the lightning
                    ctx.strokeStyle = `rgba(0, 255, 255, ${lifeRatio * 0.9})`;
                    ctx.lineWidth = 3 * lifeRatio;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                    
                    // Add white core
                    ctx.strokeStyle = `rgba(255, 255, 255, ${lifeRatio * 0.6})`;
                    ctx.lineWidth = 1 * lifeRatio;
                    ctx.stroke();
                });
                
                ctx.restore();
            });
            
            // Render flamethrower flames
            flameProjectiles.forEach(flame => {
                if (!inView(flame.x, flame.y, flame.size)) return;
                const age = now - (flame.lifetime - 800);
                const lifeRatio = 1 - (age / 800);
                ctx.save();
                ctx.globalAlpha = lifeRatio * 0.8;
                ctx.translate(flame.x, flame.y);
                
                // Draw flame as gradient circle
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, flame.size);
                gradient.addColorStop(0, '#ffff00');
                gradient.addColorStop(0.4, '#ff6600');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, flame.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add fire emoji for effect
                ctx.globalAlpha = lifeRatio;
                ctx.font = `${flame.size * 1.5}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🔥', 0, 0);
                ctx.restore();
            });
            
            // Render laser cannon beams
            laserCannonBeams.forEach(beam => {
                const age = now - beam.spawnTime;
                const alpha = Math.max(0, 1 - (age / beam.lifetime));
                if (alpha <= 0) return;
                
                ctx.save();
                // Draw outer glow (no shadowBlur — use thick translucent line)
                ctx.globalAlpha = alpha * 0.3;
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 14;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(beam.startX, beam.startY);
                ctx.lineTo(beam.endX, beam.endY);
                ctx.stroke();
                
                // Draw inner bright line
                ctx.globalAlpha = alpha * 0.9;
                ctx.strokeStyle = '#88ff88';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(beam.startX, beam.startY);
                ctx.lineTo(beam.endX, beam.endY);
                ctx.stroke();
                
                ctx.restore();
            });

            // Render laser cross - spinning blue cross beams
            if (laserCrossActive) {
                const pSizeMult = player.bulletSizeMultiplier || 1;
                const beamRadius = player.size * LASER_CROSS_RADIUS_MULTIPLIER * pSizeMult;
                const beamAngles = [
                    laserCrossAngle,
                    laserCrossAngle + Math.PI / 2,
                    laserCrossAngle + Math.PI,
                    laserCrossAngle + Math.PI * 1.5
                ];

                ctx.save();
                ctx.translate(player.x, player.y);

                beamAngles.forEach(angle => {
                    const endX = Math.cos(angle) * beamRadius;
                    const endY = Math.sin(angle) * beamRadius;

                    // Draw outer glow (no shadowBlur — use thick translucent line instead)
                    ctx.globalAlpha = 0.15;
                    ctx.strokeStyle = '#0088ff';
                    ctx.lineWidth = 14 * pSizeMult;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    // Draw middle layer
                    ctx.globalAlpha = 0.25;
                    ctx.strokeStyle = '#00aaff';
                    ctx.lineWidth = 6 * pSizeMult;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    // Draw inner bright core
                    ctx.globalAlpha = 0.35;
                    ctx.strokeStyle = '#88ddff';
                    ctx.lineWidth = 3 * pSizeMult;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                });

                ctx.restore();
            }

            dogHomingShots.forEach(shot => {
                ctx.save();
                ctx.translate(shot.x, shot.y);
                ctx.rotate(shot.angle);
                // No filter — draw a small orange circle tint instead
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#ff8800';
                ctx.beginPath(); ctx.arc(0, 0, shot.size * 0.4, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                ctx.drawImage(sprites.bullet, -shot.size / 2, -shot.size / 2, shot.size, shot.size * 0.5);
                ctx.restore();
            });

            lightningBolts.forEach(bolt => {
                const preRendered = preRenderedEntities[bolt.emoji];
                if(preRendered) {
                    ctx.save();
                    ctx.translate(bolt.x, bolt.y);
                    ctx.rotate(bolt.angle + Math.PI / 2);
                    const boltSize = bolt.size || LIGHTNING_SIZE;
                    ctx.drawImage(preRendered, -boltSize/2, -boltSize/2, boltSize, boltSize);
                    ctx.restore();
                }
            });

            bombs.forEach(bomb => {
                const preRendered = preRenderedEntities['💣'];
                if(preRendered) {
                    const scaledBombSize = BOMB_SIZE * (player.bulletSizeMultiplier || 1);
                    ctx.drawImage(preRendered, bomb.x - scaledBombSize/2, bomb.y - scaledBombSize/2, scaledBombSize, scaledBombSize);
                }
            });

            // Render dynamite projectiles
            dynamiteProjectiles.forEach(dyn => {
                if (!dyn.active) return;
                const preRendered = preRenderedEntities['🧨'];
                if (preRendered) {
                    ctx.save();
                    ctx.translate(dyn.x, dyn.y);
                    // Rotate slowly while moving
                    const rotation = (now - dyn.spawnTime) / 500;
                    ctx.rotate(rotation);
                    ctx.drawImage(preRendered, -preRendered.width/2, -preRendered.height/2);
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.font = '20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🧨', dyn.x, dyn.y);
                    ctx.restore();
                }
            });

            const drawGlimmer = (item) => {
                const glimmerDuration = 1000;
                const timeSinceStart = (now - item.glimmerStartTime) % 2000;
                if (timeSinceStart < glimmerDuration) {
                    const progress = timeSinceStart / glimmerDuration;
                    const alpha = Math.sin(progress * Math.PI);
                    const size = item.size * (1 + progress * 0.5);
                    ctx.save();
                    ctx.globalAlpha = alpha * 0.5;
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            };

            pickupItems.forEach(item => {
                if (!inView(item.x, item.y, item.size)) return;

                // Draw shadow under pickup
                const pickupShadowY = item.y + item.size * 0.35;
                const pickupShadowRadiusX = item.size * 0.4;
                const pickupShadowRadiusY = item.size * 0.15;
                ctx.beginPath();
                ctx.ellipse(item.x, pickupShadowY, pickupShadowRadiusX, pickupShadowRadiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fill();

                drawGlimmer(item);
                if (item.type === 'box') {
                    ctx.drawImage(sprites.pickupBox, item.x - item.size / 2, item.y - item.size / 2, item.size, item.size); 
                    
                    // Draw powerup label above the box
                    if (item.powerupLabel) {
                        ctx.save();
                        ctx.globalAlpha = 0.85;
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillStyle = '#ffffff';
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 2;
                        const labelY = item.y - item.size / 2 - 3;
                        ctx.strokeText(item.powerupLabel, item.x, labelY);
                        ctx.fillText(item.powerupLabel, item.x, labelY);
                        ctx.restore();
                    }
                } else {
                    const preRendered = preRenderedEntities[item.type];
                    if (preRendered) {
                        // XP gems — larger + blue tint circle (no ctx.filter on mobile)
                        const isXp = item.type !== 'box';
                        const scale = isXp ? 1.5 : 1;
                        const w = preRendered.width * scale;
                        const h = preRendered.height * scale;
                        if (isXp) {
                            // Cheap blue glow: draw a circle behind the gem with reduced opacity
                            ctx.save();
                            ctx.globalAlpha = 0.25;
                            ctx.fillStyle = '#44aaff';
                            ctx.beginPath(); ctx.arc(item.x, item.y, w * 0.6, 0, Math.PI * 2); ctx.fill();
                            ctx.restore();
                        }
                        ctx.drawImage(preRendered, item.x - w / 2, item.y - h / 2, w, h);
                    }
                }
            });
            
            appleItems.forEach(item => {
                if (!inView(item.x, item.y, item.size)) return;

                // Draw shadow under apple
                const appleShadowY = item.y + item.size * 0.35;
                const appleShadowRadiusX = item.size * 0.4;
                const appleShadowRadiusY = item.size * 0.15;
                ctx.beginPath();
                ctx.ellipse(item.x, appleShadowY, appleShadowRadiusX, appleShadowRadiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fill();

                drawGlimmer(item);
                const preRendered = preRenderedEntities[APPLE_ITEM_EMOJI];
                if(preRendered) ctx.drawImage(preRendered, item.x - preRendered.width/2, item.y - preRendered.height/2);
            });
            eyeProjectiles.forEach(proj => {
                // Pulsing color cycle: red -> white -> yellow -> red
                const pulsePhase = (Date.now() % 600) / 600;
                let fillColor;
                if (pulsePhase < 0.33) {
                    fillColor = '#FF0000'; // Red
                } else if (pulsePhase < 0.66) {
                    fillColor = '#FFFFFF'; // White
                } else {
                    fillColor = '#FFFF00'; // Yellow
                }

                ctx.save();

                // Glow ring (no shadowBlur — draw a larger translucent circle behind)
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, proj.size * 0.9, 0, Math.PI * 2);
                ctx.fillStyle = fillColor;
                ctx.fill();

                // Plain pulsing circle
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, proj.size * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = fillColor;
                ctx.fill();

                // Red outline
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();
            });
            
            merchants.forEach(m => {
    ctx.save();
    // Draw shadow under merchant wizard
    const isMobile = document.body.classList.contains('is-mobile');
    const mShadowY = m.y + m.size * 0.4;
    const mShadowRX = m.size * 0.5 * (isMobile ? 1.1 : 1);
    const mShadowRY = m.size * 0.2 * (isMobile ? 1.1 : 1);
    ctx.beginPath();
    ctx.ellipse(m.x, mShadowY, mShadowRX, mShadowRY, 0, 0, Math.PI * 2);
    ctx.fillStyle = isMobile ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.font = `${m.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧙‍♂️', m.x, m.y);
    ctx.restore();
});
            
            const bobOffset = player.isDashing ? 0 : Math.sin(player.stepPhase) * BOB_AMPLITUDE;
            const spinDuration = 500; // 0.5 seconds

            const FOOT_SIZE = 8; const FOOT_OFFSET_X = 2; const FOOT_OFFSET_Y = 2;
            const STEP_LENGTH = 10; const stepOffset = Math.sin(player.stepPhase) * STEP_LENGTH;
            
            const isSpinning = player.spinStartTime && now < player.spinStartTime + spinDuration;
            if(!player.isDashing && !isSpinning && !player._isKnight){
                ctx.save();
                ctx.translate(player.x, player.y + bobOffset);
                ctx.rotate(player.rotationAngle - Math.PI / 2);
                ctx.fillStyle = '#322110';
                ctx.beginPath(); ctx.arc(-FOOT_OFFSET_X, FOOT_OFFSET_Y + stepOffset, FOOT_SIZE, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(FOOT_OFFSET_X, FOOT_OFFSET_Y - stepOffset, FOOT_SIZE, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            let playerSprite;
            switch (player.facing) {
                case 'up': playerSprite = sprites.playerUp; break;
                case 'down': playerSprite = sprites.playerDown; break;
                case 'left': playerSprite = sprites.playerLeft; break;
                case 'right': playerSprite = sprites.playerRight; break;
                default: playerSprite = sprites.playerDown;
            }

            // Draw dash smoke trail under player (like kicked-up dust)
            for (const smoke of dashSmokeParticles) {
                const age = now - smoke.spawnTime;
                const lifeRatio = age / smoke.lifetime;
                const opacity = (1 - lifeRatio) * DASH_SMOKE_OPACITY;
                if (opacity > 0) {
                    ctx.save();
                    ctx.globalAlpha = opacity;
                    // Draw shadow first for visibility
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.font = `${smoke.size}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('💨', smoke.x + 2, smoke.y + 2);
                    // Draw main emoji
                    ctx.fillStyle = 'white';
                    ctx.fillText('💨', smoke.x, smoke.y);
                    ctx.restore();
                }
            }

            // Draw light shadow under player
            ctx.save();
            const playerShadowY = player.y + player.size * 0.35 + bobOffset;
            const playerShadowRadiusX = player.size * 0.4;
            const playerShadowRadiusY = player.size * 0.15;
            ctx.beginPath();
            ctx.ellipse(player.x, playerShadowY, playerShadowRadiusX, playerShadowRadiusY, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.translate(player.x, player.y + bobOffset);
            
            // Smoke Bomb: make player semi-transparent when effect is active
            if (player.smokeBombActive) {
                ctx.globalAlpha = 0.4;
            }
            
            if (isSpinning) {
                const spinProgress = (now - player.spinStartTime) / spinDuration;
                const rotation = spinProgress * 2.1 * Math.PI * player.spinDirection;
                ctx.rotate(rotation);
            }
            // Custom character sprites override the cowboy sprite
            if (player._isSkull) {
                const skullPre = preRenderedEntities && preRenderedEntities['💀'];
                if (skullPre) ctx.drawImage(skullPre, -player.size / 2, -player.size / 2, player.size, player.size);
                else { ctx.font = `${player.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💀', 0, 0); }
            } else if (player._isLumberjack) {
                const ljPre = preRenderedEntities && preRenderedEntities['🧑‍🚒'];
                if (ljPre) ctx.drawImage(ljPre, -player.size / 2, -player.size / 2, player.size, player.size);
                else { ctx.font = `${player.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧑‍🚒', 0, 0); }
            } else if (player._isKnight) {
                // 🤺 naturally faces right — mirror it so default is left-facing
                // Only show un-mirrored when explicitly facing right
                if (player.facing === 'right') {
                    ctx.scale(-1, 1); // un-mirror = faces right
                }
                // Default (no scale) = faces left
                const knPre = preRenderedEntities && preRenderedEntities['🤺'];
                if (knPre) ctx.drawImage(knPre, -player.size / 2, -player.size / 2, player.size, player.size);
                else { ctx.font = `${player.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🤺', 0, 0); }
            } else if (player._isSnowman) {
                // ⛄ flips based on aim direction
                // Snowman faces left by default, so mirror for right
                if (player.facing === 'right') {
                    ctx.scale(-1, 1); // mirror = faces right
                }
                const smPre = preRenderedEntities && preRenderedEntities['⛄'];
                if (smPre) ctx.drawImage(smPre, -player.size / 2, -player.size / 2, player.size, player.size);
                else { ctx.font = `${player.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⛄', 0, 0); }
            } else if (player._isFarmer) {
                // 🧑‍🌾 Farmer - normal rendering
                const fmPre = preRenderedEntities && preRenderedEntities['🧑‍🌾'];
                if (fmPre) ctx.drawImage(fmPre, -player.size / 2, -player.size / 2, player.size, player.size);
                else { ctx.font = `${player.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧑‍🌾', 0, 0); }
            } else if (player._isAlien) {
                // 👽 Alien - faces left by default, flip for right
                if (player.facing === 'right') {
                    ctx.scale(-1, 1); // mirror = faces right
                }
                const alienPre = preRenderedEntities && preRenderedEntities['👽'];
                if (alienPre) ctx.drawImage(alienPre, -player.size / 2, -player.size / 2, player.size, player.size);
                else { ctx.font = `${player.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👽', 0, 0); }
            } else if (player._isJackOLantern) {
                // 🎃 Jack O Lantern - faces right by default, flip for left
                if (player.facing === 'left') {
                    ctx.scale(-1, 1); // mirror = faces left
                }
                const pumpkinPre = preRenderedEntities && preRenderedEntities['🎃'];
                if (pumpkinPre) ctx.drawImage(pumpkinPre, -player.size / 2, -player.size / 2, player.size, player.size);
                else { ctx.font = `${player.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎃', 0, 0); }
            } else {
                ctx.drawImage(playerSprite, -player.size / 2, -player.size / 2, player.size, player.size);
            }
            ctx.restore();


            // Dash Cooldown Bar
            const dashCharge = Math.min(1, (now - player.lastDashTime) / player.dashCooldown);
            if (dashCharge < 1) {
                const barWidth = player.size * 0.8;
                const barX = player.x - barWidth / 2;
                const barY = player.y + player.size / 2 + 4;
                ctx.fillStyle = '#444';
                ctx.fillRect(barX, barY, barWidth, 4);
                ctx.fillStyle = '#00FFFF';
                ctx.fillRect(barX, barY, barWidth * dashCharge, 4);
            }

            // Dash Invincibility Shield
            if (player.isInvincible) {
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#007BFF';
                ctx.beginPath();
                ctx.arc(player.x, player.y, player.size / 2 + 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }


            if ((aimDx !== 0 || aimDy !== 0 || autoAimActive) && !player._isLumberjack && !player._isKnight && !player._isAlien && !player._isJackOLantern) {
                const aimAngle = player.rotationAngle;
                ctx.save();
                ctx.translate(player.x, player.y + bobOffset);
                ctx.rotate(aimAngle);
                if (aimAngle > Math.PI / 2 || aimAngle < -Math.PI / 2) { ctx.scale(1, -1); }
                const gunWidth = player.size * 0.8;
                const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
                const gunXOffset = player.size / 4;
                const gunYOffset = -gunHeight / 2;
                if (player._isSkull) {
                    // Skull: bone in place of gun
                    const bonePre = preRenderedEntities && preRenderedEntities['🦴'];
                    if (bonePre) {
                        ctx.drawImage(bonePre, gunXOffset, -gunWidth / 2, gunWidth, gunWidth);
                    } else {
                        ctx.font = `${gunWidth}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('🦴', gunXOffset + gunWidth / 2, 0);
                    }
                } else {
                    if (dualRevolversActive) {
                        // Dual Revolvers: draw 2 guns side by side (not 3!)
                        ctx.save();
                        const gunSpacing = gunHeight * 0.6;
                        ctx.drawImage(sprites.gun, gunXOffset, gunYOffset - gunSpacing/2, gunWidth, gunHeight);
                        ctx.drawImage(sprites.gun, gunXOffset, gunYOffset + gunSpacing/2, gunWidth, gunHeight);
                        ctx.restore();
                    } else {
                        ctx.drawImage(sprites.gun, gunXOffset, gunYOffset, gunWidth, gunHeight);
                        if (dualGunActive) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(sprites.gun, -gunXOffset, gunYOffset, gunWidth, gunHeight); ctx.restore(); }
                    }
                    if (laserPointerActive) {
                        ctx.save(); ctx.beginPath();
                        const startX = gunXOffset + gunWidth * 0.9; const startY = gunYOffset + gunHeight / 2;
                        ctx.moveTo(startX, startY); 
                        const isMobile = document.body.classList.contains('is-mobile');
                        
                        // Better gamepad detection: check if gamepad is connected and being used
                        const gamepadConnected = gamepadIndex !== null && navigator.getGamepads?.()[gamepadIndex];
                        const isUsingGamepad = gamepadConnected && (aimDx !== 0 || aimDy !== 0);
                        
                        if (isMobile || isUsingGamepad) {
                            // Fixed length laser for mobile/gamepad
                            const laserLength = 300;
                            ctx.lineTo(startX + laserLength, startY);
                        } else {
                            const worldMouseX = mouseX / cameraZoom + finalCameraOffsetX; const worldMouseY = mouseY / cameraZoom + finalCameraOffsetY;
                            const rotatedMouseX = (worldMouseX - (player.x)) * Math.cos(-aimAngle) - (worldMouseY - (player.y + bobOffset)) * Math.sin(-aimAngle);
                            ctx.lineTo(rotatedMouseX, startY);
                        }
                        ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)'; ctx.lineWidth = 1; ctx.stroke();
                        ctx.restore();
                    }
                }
                ctx.restore();
            }

            // Lumberjack: axe in hand when aiming
            if (player._isLumberjack && (aimDx !== 0 || aimDy !== 0 || autoAimActive)) {
                const aimAngle = player.rotationAngle;
                const axePre = preRenderedEntities && preRenderedEntities['🪓'];
                ctx.save();
                ctx.translate(player.x, player.y + bobOffset);
                ctx.rotate(aimAngle);
                if (aimAngle > Math.PI / 2 || aimAngle < -Math.PI / 2) ctx.scale(1, -1);
                const axeW = player.size * 0.9;
                if (axePre) ctx.drawImage(axePre, player.size / 4, -axeW / 2, axeW, axeW);
                else { ctx.font = `${axeW}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🪓', player.size / 2, 0); }
                ctx.restore();
            }

            // Knight: no weapon sprite shown — sword is handled by the auto-sword swing animation
            // (the silver bar that appears during swings is sufficient visual feedback)
            
            if (doppelganger) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.drawImage(playerSprite, doppelganger.x - doppelganger.size / 2, doppelganger.y - doppelganger.size / 2, doppelganger.size, doppelganger.size);
                const gunWidth = doppelganger.size * 0.8; const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
                const gunXOffset = doppelganger.size / 4; const gunYOffset = -gunHeight / 2;
                ctx.translate(doppelganger.x, doppelganger.y); ctx.rotate(doppelganger.rotationAngle);
                if (doppelganger.rotationAngle > Math.PI / 2 || doppelganger.rotationAngle < -Math.PI / 2) { ctx.scale(1, -1); }
                ctx.drawImage(sprites.gun, gunXOffset, gunYOffset, gunWidth, gunHeight);
                ctx.restore();

                // Draw HP bar above doppelganger
                const hpBarWidth = doppelganger.size;
                const hpBarHeight = 4;
                const hpBarX = doppelganger.x - hpBarWidth / 2;
                const hpBarY = doppelganger.y - doppelganger.size / 2 - 10;
                const hpPercent = (doppelganger.hp || 3) / (doppelganger.maxHp || 3);

                // Background (empty)
                ctx.fillStyle = '#333';
                ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
                // Health fill
                ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : (hpPercent > 0.3 ? '#ffff00' : '#ff0000');
                ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);
            }

            // Clone army cheat rendering
            if (cheats.clone_army && window.cloneArmy) {
                window.cloneArmy.forEach(clone => {
                    ctx.save();
                    ctx.globalAlpha = 0.7; ctx.filter = 'hue-rotate(90deg)';
                    ctx.drawImage(playerSprite, clone.x - clone.size / 2, clone.y - clone.size / 2, clone.size, clone.size);
                    ctx.restore();

                    // Draw HP bar above clone
                    const hpBarWidth = clone.size;
                    const hpBarHeight = 3;
                    const hpBarX = clone.x - hpBarWidth / 2;
                    const hpBarY = clone.y - clone.size / 2 - 8;
                    const hpPercent = (clone.hp || 3) / (clone.maxHp || 3);

                    // Background (empty)
                    ctx.fillStyle = '#333';
                    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
                    // Health fill
                    ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : (hpPercent > 0.3 ? '#ffff00' : '#ff0000');
                    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);
                });
            }

            if (orbitingPowerUpActive && sprites.spinninglight) {
                const orbitX = player.x + ORBIT_RADIUS * Math.cos(player.orbitAngle);
                const orbitY = player.y + ORBIT_RADIUS * Math.sin(player.orbitAngle);
                orbitingImageAngle -= 0.2;
                ctx.save();
                ctx.translate(orbitX, orbitY);
                ctx.rotate(orbitingImageAngle);
                const scaledOrbitSize = ORBIT_POWER_UP_SIZE * (player.bulletSizeMultiplier || 1);
                ctx.drawImage(sprites.spinninglight, -scaledOrbitSize / 2, -scaledOrbitSize / 2, scaledOrbitSize, scaledOrbitSize);
                ctx.restore();
            }

            // Levitating Books - two books orbiting opposite each other with fade effect
            if (levitatingBooksActive && levitatingBooksAlpha > 0 && levitatingBooksPositions.length === 2) {
                ctx.save();
                ctx.globalAlpha = levitatingBooksAlpha;
                
                // Draw both books
                for (const bookPos of levitatingBooksPositions) {
                    const preRendered = preRenderedEntities[LEVITATING_BOOKS_EMOJI];
                    const scaledBookSize = LEVITATING_BOOKS_SIZE * (player.bulletSizeMultiplier || 1);
                    if (preRendered) {
                        ctx.drawImage(preRendered,
                            bookPos.x - scaledBookSize / 2,
                            bookPos.y - scaledBookSize / 2,
                            scaledBookSize,
                            scaledBookSize
                        );
                    } else {
                        // Fallback to drawing emoji directly
                        ctx.font = `${scaledBookSize}px serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(LEVITATING_BOOKS_EMOJI, bookPos.x, bookPos.y);
                    }
                }
                
                ctx.restore();
            }

            if (player.swordActive && player.currentSwordSwing) {
                const swingProgress = (now - player.currentSwordSwing.startTime) / SWORD_SWING_DURATION;
                let currentOffset = player.size / 2 + (swingProgress >= 0 && swingProgress <= 1 ? SWORD_THRUST_DISTANCE * Math.sin(swingProgress * Math.PI) : 0);
                ctx.save();
                ctx.translate(player.currentSwordSwing.x, player.currentSwordSwing.y);
                ctx.rotate(player.currentSwordSwing.angle);
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(currentOffset, -2, 20, 4);
                ctx.restore();
            }

            // Spear rendering - always visible, points in movement direction
            if (spearActive && currentSpearSwing) {
                const spearSizeMult = player.projectileSizeMultiplier || 1;
                const currentLength = SPEAR_HANDLE_LENGTH * spearSizeMult;
                const handleWidth = SPEAR_HANDLE_WIDTH * spearSizeMult;
                const tipSize = SPEAR_TIP_SIZE * 2 * spearSizeMult;

                ctx.save();
                ctx.translate(currentSpearSwing.x, currentSpearSwing.y);
                ctx.rotate(currentSpearSwing.angle);

                // Brown handle (rectangle) - positioned behind the arrow tip
                ctx.fillStyle = '#8B4513'; // Saddle brown
                ctx.fillRect(player.size / 2, -handleWidth / 2, currentLength, handleWidth);

                // Grey arrow tip (→) - overlapping the handle
                ctx.fillStyle = '#808080'; // Grey
                ctx.font = `${tipSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Position arrow at the end of the handle
                ctx.fillText('→', player.size / 2 + currentLength, 0);

                ctx.restore();
            }

            if (dogCompanionActive) {
                const preRendered = preRenderedEntities['🐶'];
                if(preRendered) ctx.drawImage(preRendered, dog.x - preRendered.width/2, dog.y - preRendered.height/2);
            }
            
            // Cat Ally rendering - shows cat emoji and carried item if any
            if (catAllyActive) {
                const preRendered = preRenderedEntities['🐱'];
                if(preRendered) {
                    ctx.drawImage(preRendered, catAlly.x - preRendered.width/2, catAlly.y - preRendered.height/2);
                    
                    // Draw carried item - visually looks like cat is carrying it
                    if (catAlly.carriedItem) {
                        let carriedEmoji = '💎';
                        if (catAlly.carriedItem.type === 'apple') carriedEmoji = '🍎';
                        else if (catAlly.carriedItem.type === 'box') carriedEmoji = ''; // Hide powerup box when carried
                        else if (catAlly.carriedItem.type === 'xp') {
                            if (catAlly.carriedItem.xpValue >= DEMON_XP_VALUE) carriedEmoji = DEMON_XP_EMOJI;
                            else if (catAlly.carriedItem.xpValue >= RING_SYMBOL_XP_VALUE) carriedEmoji = RING_SYMBOL_EMOJI;
                            else if (catAlly.carriedItem.xpValue >= DIAMOND_XP_VALUE) carriedEmoji = DIAMOND_EMOJI;
                            else carriedEmoji = COIN_EMOJI;
                        }

                        // Only render if there's an actual emoji to show (skip for powerup boxes)
                        if (carriedEmoji) {
                            // Bobbing animation so item looks alive while being carried
                            const bobOffset = Math.sin(Date.now() / 100) * 3;
                            const carryX = catAlly.x + (catAlly.size * 0.3);
                            const carryY = catAlly.y - (catAlly.size * 0.3) + bobOffset;

                            // Draw connection line to show it's being held
                            ctx.beginPath();
                            ctx.moveTo(catAlly.x, catAlly.y - catAlly.size * 0.2);
                            ctx.lineTo(carryX, carryY);
                            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                            ctx.lineWidth = 2;
                            ctx.stroke();

                            // Draw the item with drop shadow for visibility
                            ctx.font = 'bold 16px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                            ctx.fillText(carriedEmoji, carryX + 1, carryY + 1);
                            ctx.fillStyle = 'white';
                            ctx.fillText(carriedEmoji, carryX, carryY);
                        }
                    }
                }
            }
            
            // Robot Drone rendering with blue outline and drop shadow
            if (robotDroneActive) {
                const preRendered = preRenderedEntities['🤖'];
                const now = Date.now();
                
                ctx.save();
                
                // Draw drop shadow under robot
                const shadowY = robotDrone.y + robotDrone.size * 0.4;
                const shadowRadiusX = robotDrone.size * 0.5;
                const shadowRadiusY = robotDrone.size * 0.2;
                ctx.beginPath();
                ctx.ellipse(robotDrone.x, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fill();
                
                // Draw blue outline (similar to enemy outline but blue)
                const outlineSize = robotDrone.size * 0.6;
                ctx.beginPath();
                ctx.arc(robotDrone.x, robotDrone.y, outlineSize / 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Draw the robot emoji
                if (preRendered) {
                    ctx.drawImage(preRendered, robotDrone.x - preRendered.width / 2, robotDrone.y - preRendered.height / 2);
                } else {
                    ctx.font = `${robotDrone.size}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🤖', robotDrone.x, robotDrone.y);
                }
                
                ctx.restore();
            }

            // Turret rendering with green outline (ally indicator) and pistol aiming
            if (turretActive) {
                const preRendered = preRenderedEntities['🏛️'];

                ctx.save();

                // Draw drop shadow under turret
                const shadowY = turret.y + turret.size * 0.4;
                const shadowRadiusX = turret.size * 0.5;
                const shadowRadiusY = turret.size * 0.2;
                ctx.beginPath();
                ctx.ellipse(turret.x, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fill();

                // Draw green outline (ally indicator - opposite of enemy red outline)
                const outlineSize = turret.size * 0.6;
                ctx.beginPath();
                ctx.arc(turret.x, turret.y, outlineSize / 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 200, 0, 0.6)';
                ctx.lineWidth = 3;
                ctx.stroke();

                // Draw the turret base (classical building emoji)
                if (preRendered) {
                    ctx.drawImage(preRendered, turret.x - preRendered.width / 2, turret.y - preRendered.height / 2);
                } else {
                    ctx.font = `${turret.size}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🏛️', turret.x, turret.y);
                }

                // Draw pistol gun pointing at aim angle
                ctx.save();
                ctx.translate(turret.x, turret.y);
                ctx.rotate(turret.aimAngle);
                if (turret.aimAngle > Math.PI / 2 || turret.aimAngle < -Math.PI / 2) { ctx.scale(1, -1); }
                const gunWidth = turret.size * 0.8;
                const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
                const gunXOffset = turret.size / 4;
                const gunYOffset = -gunHeight / 2;
                ctx.drawImage(sprites.gun, gunXOffset, gunYOffset, gunWidth, gunHeight);
                ctx.restore();

                ctx.restore();
            }

            // Flying Turret rendering with purple outline and wings
            if (flyingTurretActive && inView(flyingTurret.x, flyingTurret.y, flyingTurret.size)) {
                ctx.save();

                // Slight bobbing animation to show it's flying
                const bobOffset = Math.sin(now / 200) * 3;
                const renderY = flyingTurret.y + bobOffset;

                // Draw drop shadow under flying turret
                const shadowY = renderY + flyingTurret.size * 0.5;
                const shadowRadiusX = flyingTurret.size * 0.5;
                const shadowRadiusY = flyingTurret.size * 0.2;
                ctx.beginPath();
                ctx.ellipse(flyingTurret.x, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fill();

                // Draw purple outline (flying variant indicator)
                const outlineSize = flyingTurret.size * 0.6;
                ctx.beginPath();
                ctx.arc(flyingTurret.x, renderY, outlineSize / 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(200, 0, 200, 0.6)'; // Purple instead of green
                ctx.lineWidth = 3;
                ctx.stroke();

                // Draw the turret base (classical building emoji)
                ctx.font = `${flyingTurret.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🏛️', flyingTurret.x, renderY);

                // Draw wings on both sides
                const wingSize = flyingTurret.size * 0.5;
                ctx.font = `${wingSize}px sans-serif`;
                // Left wing
                ctx.fillText('🪽', flyingTurret.x - flyingTurret.size * 0.5, renderY - flyingTurret.size * 0.1);
                // Right wing (mirrored by scaling)
                ctx.save();
                ctx.translate(flyingTurret.x + flyingTurret.size * 0.5, renderY - flyingTurret.size * 0.1);
                ctx.scale(-1, 1); // Mirror horizontally
                ctx.fillText('🪽', 0, 0);
                ctx.restore();

                // Draw pistol gun pointing at aim angle
                ctx.save();
                ctx.translate(flyingTurret.x, renderY);
                ctx.rotate(flyingTurret.aimAngle);
                if (flyingTurret.aimAngle > Math.PI / 2 || flyingTurret.aimAngle < -Math.PI / 2) { ctx.scale(1, -1); }
                const gunWidth = flyingTurret.size * 0.8;
                const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
                const gunXOffset = flyingTurret.size / 4;
                const gunYOffset = -gunHeight / 2;
                ctx.drawImage(sprites.gun, gunXOffset, gunYOffset, gunWidth, gunHeight);
                ctx.restore();

                ctx.restore();
            }

            if (player2 && player2.active) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.beginPath(); ctx.arc(player2.x, player2.y, player2.size / 2, 0, Math.PI * 2); ctx.fill();
                let p2Sprite;
                switch (player2.facing) {
                    case 'up': p2Sprite = sprites.playerUp; break;
                    case 'down': p2Sprite = sprites.playerDown; break;
                    case 'left': p2Sprite = sprites.playerLeft; break;
                    case 'right': p2Sprite = sprites.playerRight; break;
                    default: p2Sprite = sprites.playerDown;
                }

                const isP2Spinning = player2.spinStartTime && now < player2.spinStartTime + spinDuration;
                
                ctx.save();
                ctx.translate(player2.x, player2.y);
                if(isP2Spinning) {
                    const spinProgress = (now - player2.spinStartTime) / spinDuration;
                    const rotation = spinProgress * 2 * Math.PI * player2.spinDirection;
                    ctx.rotate(rotation);
                }
                ctx.drawImage(p2Sprite, -player2.size / 2, -player2.size / 2, player2.size, player2.size);
                ctx.restore();
                
                ctx.save();
                ctx.translate(player2.x, player2.y);
                ctx.rotate(player2.gunAngle);
                if (player2.gunAngle > Math.PI / 2 || player2.gunAngle < -Math.PI / 2) { ctx.scale(1, -1); }
                const gunWidth = player2.size * 0.8; const gunHeight = gunWidth * (sprites.gun.height / sprites.gun.width);
                ctx.drawImage(sprites.gun, player2.size / 4, -gunHeight / 2, gunWidth, gunHeight);
                ctx.restore();
                 // P2 Dash Cooldown Bar
                const p2DashCharge = Math.min(1, (now - player2.lastDashTime) / player2.dashCooldown);
                if (p2DashCharge < 1) {
                    const barWidth = player2.size * 0.8;
                    const barX = player2.x - barWidth / 2;
                    const barY = player2.y + player2.size / 2 + 4;
                    ctx.fillStyle = '#444';
                    ctx.fillRect(barX, barY, barWidth, 4);
                    ctx.fillStyle = '#00FFFF';
                    ctx.fillRect(barX, barY, barWidth * p2DashCharge, 4);
                }
            }
            flies.forEach(fly => {
                const color = Math.floor(now / 100) % 2 === 0 ? 'red' : 'black';
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(fly.x, fly.y, FLY_SIZE / 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Render peas (green circles that flash blue)
            peas.forEach(pea => {
                const flashBlue = Math.floor(now / 100) % 2 === 0;
                ctx.fillStyle = flashBlue ? '#4444ff' : '#00ff00'; // Blue flash or green
                ctx.beginPath();
                ctx.arc(pea.x, pea.y, PEA_SIZE / 2, 0, Math.PI * 2);
                ctx.fill();
            });

            if (nightOwlActive && owl) {
                const preRendered = preRenderedEntities['🦉'];
                if(preRendered) ctx.drawImage(preRendered, owl.x - preRendered.width/2, owl.y - preRendered.height/2);
                
                owlProjectiles.forEach(proj => {
                    ctx.save();
                    ctx.translate(proj.x, proj.y); ctx.rotate(proj.angle);
                    ctx.fillStyle = '#FFFACD';
                    ctx.beginPath(); ctx.arc(0, 0, proj.size / 2, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                });
            }
            if (whirlwindAxeActive) {
                const axeX = player.x + WHIRLWIND_AXE_RADIUS * Math.cos(whirlwindAxeAngle);
                const axeY = player.y + WHIRLWIND_AXE_RADIUS * Math.sin(whirlwindAxeAngle);
                ctx.save();
                ctx.translate(axeX, axeY);
                ctx.rotate(whirlwindAxeAngle + Math.PI / 2);
                const preRendered = preRenderedEntities['🪓'];
                const scaledAxeSize = WHIRLWIND_AXE_SIZE * (player.bulletSizeMultiplier || 1);
                if(preRendered) ctx.drawImage(preRendered, -scaledAxeSize / 2, -scaledAxeSize / 2, scaledAxeSize, scaledAxeSize);
                ctx.restore();
            }
            lightningStrikes.forEach(strike => {
                const age = now - strike.startTime;
                const lifeRatio = age / strike.duration;
                const alpha = Math.sin(lifeRatio * Math.PI);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = 'yellow';
                ctx.fillRect(strike.x - 5, 0, 10, WORLD_HEIGHT);
                ctx.font = `40px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('⚡', strike.x, strike.y);
                ctx.restore();
            });


            floatingTexts.forEach(ft => {
                const elapsed = now - ft.startTime;
                const alpha = 1.0 - (elapsed / ft.duration);
                const yOffset = (elapsed / ft.duration) * 20;
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                // Damage numbers use a smaller plain font; other texts use the game font
                if (ft.fontSize) {
                    ctx.font = `bold ${ft.fontSize}px sans-serif`;
                    ctx.lineWidth = 2;
                } else {
                    ctx.font = 'bold 14px "Press Start 2P"';
                    ctx.lineWidth = 3;
                }
                ctx.fillStyle = ft.color || '#FFFFFF';
                ctx.strokeStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.strokeText(ft.text, ft.x, ft.y - yOffset);
                ctx.fillText(ft.text, ft.x, ft.y - yOffset);
                ctx.restore();
            });

            // Render visual warnings (boss warnings, etc.)
            visualWarnings.forEach(vw => {
                if (!vw.text) return; // Skip if no text defined
                const elapsed = now - vw.startTime;
                const alpha = 1.0 - (elapsed / vw.duration);
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.font = `bold ${vw.fontSize || 24}px sans-serif`;
                ctx.fillStyle = vw.color || '#ff0000';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeText(vw.text, vw.x, vw.y);
                ctx.fillText(vw.text, vw.x, vw.y);
                ctx.restore();
            });

            ctx.restore();
            ctx.restore();
            
            if (isTimeStopped) {
                const timeLeft = timeStopEndTime - now;
                const duration = 2000;
                let alpha = 0;
                if (timeLeft > duration - 250) { alpha = 1 - (timeLeft - (duration - 250)) / 250; } 
                else if (timeLeft < 500) { alpha = timeLeft / 500; } 
                else { alpha = 1; }
                alpha = Math.max(0, Math.min(alpha, 1)); 
                ctx.save();
                ctx.fillStyle = `rgba(0, 100, 255, ${alpha * 0.4})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

            // Night mode: dark overlay
            if (cheats.night_mode) {
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 30, 0.72)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Small light circle around player screen position
                const psx = player.x - cameraOffsetX;
                const psy = player.y - cameraOffsetY;
                const grad = ctx.createRadialGradient(psx, psy, 0, psx, psy, 180);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, 'rgba(0,0,30,0.72)');
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(psx, psy, 180, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                ctx.restore();
            }

            // Restore context to exit camera zoom transform - crosshair draws in screen space
            ctx.restore();

            if (isMouseInCanvas && gameActive && sprites.crosshair && !document.body.classList.contains('is-mobile')) {
                const reticleSize = 24;
                ctx.save();
                // Orange-red circle glow behind the crosshair sprite (no shadowBlur)
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#ff5500';
                ctx.beginPath();
                ctx.arc(mouseX, mouseY, reticleSize / 2 + 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.drawImage(sprites.crosshair, mouseX - reticleSize / 2, mouseY - reticleSize / 2, reticleSize, reticleSize);
                ctx.restore();
            }
        }

