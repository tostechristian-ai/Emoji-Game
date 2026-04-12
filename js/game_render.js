// Rendering-only code.
// `update()` lives in `game_update.js`.

        function draw() {
            if (!gameActive) return;
            const now = Date.now();

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
                if(obs.health !== Infinity) ctx.globalAlpha = 0.5 + (obs.health / obs.maxHealth) * 0.5;
                const preRendered = preRenderedEntities[obs.emoji];
                if(preRendered) {
                    ctx.drawImage(preRendered, obs.x - preRendered.width / 2, obs.y - preRendered.height / 2);
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
                const size = DAMAGING_CIRCLE_RADIUS * 2 * pulse;
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
                    ctx.globalAlpha = opacity * 0.7;
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
            
            bloodPuddles.forEach(puddle => {
                if (!inView(puddle.x, puddle.y, puddle.initialSize)) return;
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
            
            smokeParticles.forEach(p => {
                if (!inView(p.x, p.y, p.size)) return;
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.font = `${p.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💨', p.x, p.y);
                ctx.restore();
            });

            enemies.forEach(enemy => {
                if (!inView(enemy.x, enemy.y, enemy.size)) return;
                ctx.save();
                
                // White flash when hit
                const now = Date.now();
                if (enemy.hitFlashTime && now - enemy.hitFlashTime < 100) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = 0.8;
                }
                
                if (enemy.emoji === '👻') {
                    ctx.globalAlpha = enemy.isVisible ? 1.0 : 0.2;
                }
                
                // Frozen: blue tint
                if (enemy.isFrozen) {
                    ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.7;
                }
                
                const emojiToDraw = enemy.isBoss ? enemy.mimics : enemy.emoji;
                const preRenderedImage = preRenderedEntities[emojiToDraw];
                if(preRenderedImage) {
                    // Apply blue tint for frozen enemies
                    if (enemy.isFrozen) {
                        ctx.save();
                        ctx.filter = 'hue-rotate(180deg) saturate(2)';
                        ctx.drawImage(preRenderedImage, enemy.x - preRenderedImage.width / 2, enemy.y - preRenderedImage.height / 2 + (enemy.bobOffset || 0));
                        ctx.restore();
                    } else {
                        ctx.drawImage(preRenderedImage, enemy.x - preRenderedImage.width / 2, enemy.y - preRenderedImage.height / 2 + (enemy.bobOffset || 0));
                    }
                }

                if (enemy.isIgnited) {
                    ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.8);
                    ctx.font = `${enemy.size * 0.8}px sans-serif`;
                    ctx.fillText('🔥', enemy.x, enemy.y + (enemy.bobOffset || 0));
                }
                ctx.restore();

                // Boss health bar
                if (enemy.isBoss) {
                    const maxHp = Math.floor(20 + (player.level || 1) * 1.5);
                    const hpRatio = Math.max(0, enemy.health / maxHp);
                    const barW = enemy.size * 1.2;
                    const barH = 5;
                    const barX = enemy.x - barW / 2;
                    const barY = enemy.y + enemy.size / 2 + 6 + (enemy.bobOffset || 0);
                    ctx.fillStyle = '#222';
                    ctx.fillRect(barX, barY, barW, barH);
                    // Colour shifts green → orange → red as health drops
                    const r = Math.floor(255 * (1 - hpRatio));
                    const g = Math.floor(200 * hpRatio);
                    ctx.fillStyle = `rgb(${r},${g},0)`;
                    ctx.fillRect(barX, barY, barW * hpRatio, barH);
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(barX, barY, barW, barH);
                }
            });

            explosions.forEach(explosion => {
                const age = now - explosion.startTime;
                if (age < explosion.duration) {
                    const lifeRatio = age / explosion.duration;
                    const currentRadius = explosion.radius * lifeRatio;
                    const alpha = 1 - lifeRatio;
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
                    const currentRadius = nova.maxRadius * lifeRatio;
                    const alpha = 1 - lifeRatio;
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
                // Lumberjack: spinning axes instead of bullets
                if (player._isLumberjack) {
                    weapon._axeSpin = ((weapon._axeSpin || weapon.angle) + 0.3);
                    ctx.rotate(weapon._axeSpin);
                    const axePre = preRenderedEntities && preRenderedEntities['🪓'];
                    if (axePre) { ctx.drawImage(axePre, -11, -11, 22, 22); }
                    ctx.restore();
                    continue;
                }
                ctx.rotate(weapon.angle);
                const bSize = weapon.size * 1.4;
                const bH = bSize * 0.5;
                // Blue box for ice projectiles
                if (iceProjectileActive) {
                    ctx.globalAlpha = 0.08;
                    ctx.fillStyle = '#00aaff';
                    ctx.fillRect(-bSize / 2, -bH / 2, bSize, bH);
                    ctx.globalAlpha = 1;
                }
                ctx.drawImage(sprites.bullet, -bSize / 2, -bH / 2, bSize, bH);
                ctx.restore();
            }
            
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
                const alpha = 1 - (age / beam.lifetime);
                
                ctx.save();
                ctx.globalAlpha = alpha * 0.6;
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 8;
                ctx.lineCap = 'round';
                
                // Draw outer glow
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.moveTo(beam.startX, beam.startY);
                ctx.lineTo(beam.endX, beam.endY);
                ctx.stroke();
                
                // Draw inner bright line
                ctx.shadowBlur = 0;
                ctx.globalAlpha = alpha * 0.9;
                ctx.strokeStyle = '#88ff88';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(beam.startX, beam.startY);
                ctx.lineTo(beam.endX, beam.endY);
                ctx.stroke();
                
                ctx.restore();
            });

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
                    ctx.drawImage(preRendered, -preRendered.width/2, -preRendered.height/2);
                    ctx.restore();
                }
            });

            bombs.forEach(bomb => {
                const preRendered = preRenderedEntities['💣'];
                if(preRendered) ctx.drawImage(preRendered, bomb.x - preRendered.width/2, bomb.y - preRendered.height/2);
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
                drawGlimmer(item);
                const preRendered = preRenderedEntities[APPLE_ITEM_EMOJI];
                if(preRendered) ctx.drawImage(preRendered, item.x - preRendered.width/2, item.y - preRendered.height/2);
            });
            eyeProjectiles.forEach(proj => { 
                const preRendered = preRenderedEntities[proj.emoji];
                if(preRendered) ctx.drawImage(preRendered, proj.x - preRendered.width/2, proj.y - preRendered.height/2);
            });
            
            merchants.forEach(m => {
    ctx.save();
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
            
            ctx.save();
            ctx.translate(player.x, player.y + bobOffset);
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


            if ((aimDx !== 0 || aimDy !== 0 || autoAimActive) && !player._isLumberjack && !player._isKnight) {
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
                    ctx.drawImage(sprites.gun, gunXOffset, gunYOffset, gunWidth, gunHeight);
                    if (dualGunActive) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(sprites.gun, -gunXOffset, gunYOffset, gunWidth, gunHeight); ctx.restore(); }
                    if (laserPointerActive) {
                        ctx.save(); ctx.beginPath();
                        const startX = gunXOffset + gunWidth * 0.9; const startY = gunYOffset + gunHeight / 2;
                        ctx.moveTo(startX, startY); 
                        const isMobile = document.body.classList.contains('is-mobile');
                        const isUsingGamepad = (aimDx !== 0 || aimDy !== 0) && (mouseX === 0 && mouseY === 0);
                        
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
            }

            // Clone army cheat rendering
            if (cheats.clone_army && window.cloneArmy) {
                window.cloneArmy.forEach(clone => {
                    ctx.save();
                    ctx.globalAlpha = 0.7; ctx.filter = 'hue-rotate(90deg)';
                    ctx.drawImage(playerSprite, clone.x - clone.size / 2, clone.y - clone.size / 2, clone.size, clone.size);
                    ctx.restore();
                });
            }

            if (orbitingPowerUpActive && sprites.spinninglight) {
                const orbitX = player.x + ORBIT_RADIUS * Math.cos(player.orbitAngle);
                const orbitY = player.y + ORBIT_RADIUS * Math.sin(player.orbitAngle);
                orbitingImageAngle -= 0.2;
                ctx.save();
                ctx.translate(orbitX, orbitY);
                ctx.rotate(orbitingImageAngle);
                ctx.drawImage(sprites.spinninglight, -ORBIT_POWER_UP_SIZE / 2, -ORBIT_POWER_UP_SIZE / 2, ORBIT_POWER_UP_SIZE, ORBIT_POWER_UP_SIZE);
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

            if (dogCompanionActive) {
                const preRendered = preRenderedEntities['🐶'];
                if(preRendered) ctx.drawImage(preRendered, dog.x - preRendered.width/2, dog.y - preRendered.height/2);
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
                if(preRendered) ctx.drawImage(preRendered, -preRendered.width/2, -preRendered.height/2);
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

            if (isMouseInCanvas && gameActive && sprites.crosshair) {
                const reticleSize = 24;
                ctx.save();
                // Orange-red circle glow behind the crosshair sprite
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#ff5500';
                ctx.beginPath();
                ctx.arc(mouseX, mouseY, reticleSize / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.shadowColor = '#ff5500';
                ctx.shadowBlur = 12;
                ctx.drawImage(sprites.crosshair, mouseX - reticleSize / 2, mouseY - reticleSize / 2, reticleSize, reticleSize);
                ctx.restore();
            }
        }

