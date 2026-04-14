        // ═══════════════════════════════════════════════════════════════════════════
        // EMOJI PRE-RENDERING SYSTEM
        // ═══════════════════════════════════════════════════════════════════════════
        // This system pre-renders emojis to canvas elements for better performance.
        // Instead of drawing text every frame, we draw images which is much faster.
        
        // Storage for all pre-rendered emoji canvases
        const preRenderedEntities = {};

        // Pre-render an emoji to a canvas for faster drawing later
        // @param emoji - The emoji character to render (e.g., '🧟', '💀')
        // @param size - The font size in pixels
        // @param options - Optional rendering options (outlineColor, outlineWidth)
        function preRenderEmoji(emoji, size, options = {}) {
            const outlineColor = options.outlineColor || null;
            const outlineWidth = Math.max(0, Number(options.outlineWidth) || 0);
            
            // Draw the emoji first on a base canvas
            const baseSize = Math.ceil(size * 1.3);
            const emojiCanvas = document.createElement('canvas');
            const emojiCtx = emojiCanvas.getContext('2d');
            emojiCanvas.width = baseSize;
            emojiCanvas.height = baseSize;
            emojiCtx.font = `${size}px sans-serif`;
            emojiCtx.textAlign = 'center';
            emojiCtx.textBaseline = 'middle';
            emojiCtx.fillText(emoji, baseSize / 2, baseSize / 2);

            // Final canvas gets extra room for the outline halo
            const extraPadding = outlineWidth > 0 ? Math.ceil(outlineWidth * 2 + 2) : 0;
            const paddedSize = baseSize + extraPadding;
            const centerOffset = (paddedSize - baseSize) / 2;
            const bufferCanvas = document.createElement('canvas');
            const bufferCtx = bufferCanvas.getContext('2d');
            bufferCanvas.width = paddedSize;
            bufferCanvas.height = paddedSize;

            // Build white outline from the emoji alpha mask (works with color emoji fonts)
            if (outlineWidth > 0 && outlineColor) {
                const radii = [outlineWidth, outlineWidth * 0.65];
                radii.forEach(radius => {
                    if (radius <= 0) return;
                    const steps = Math.max(12, Math.ceil(radius * 10));
                    for (let i = 0; i < steps; i++) {
                        const angle = (i / steps) * Math.PI * 2;
                        const offsetX = Math.cos(angle) * radius;
                        const offsetY = Math.sin(angle) * radius;
                        bufferCtx.drawImage(emojiCanvas, centerOffset + offsetX, centerOffset + offsetY);
                    }
                });
                bufferCtx.globalCompositeOperation = 'source-in';
                bufferCtx.fillStyle = outlineColor;
                bufferCtx.fillRect(0, 0, paddedSize, paddedSize);
                bufferCtx.globalCompositeOperation = 'source-over';
            }
            
            // Draw the original emoji on top of the outline
            bufferCtx.drawImage(emojiCanvas, centerOffset, centerOffset);
            
            // Store the canvas for later use
            preRenderedEntities[emoji] = bufferCanvas;
        }

        // Initialize all emoji pre-renders when the game loads
        // This is called once after all assets are loaded
        function initializePreRenders() {
            // ─── ENEMY EMOJIS ───────────────────────────────────────────────────
            const preRenderEnemyEmoji = (emoji, size) => preRenderEmoji(emoji, size, {
                outlineColor: 'rgba(255, 0, 0, 0.5)',
                outlineWidth: Math.max(1.2, size * 0.08)
            });
            preRenderEnemyEmoji('🧟', 17);              // Zombie - basic enemy
            preRenderEnemyEmoji('💀', 20);              // Skull - faster enemy
            preRenderEnemyEmoji('🦇', 25 * 0.85);       // Bat - dashing enemy
            preRenderEnemyEmoji('🐌', 22);              // Snail - leaves slowing puddles
            preRenderEnemyEmoji('🦟', 15);              // Mosquito - erratic movement
            preRenderEnemyEmoji('🕷️', 18);              // Spider - jumps diagonally, leaves webs
            preRenderEnemyEmoji('😈', 20 * 0.8);        // Devil - axis-based movement
            preRenderEnemyEmoji('👹', 28 * 0.7);        // Demon - alternating behavior
            preRenderEnemyEmoji('👻', 22);              // Ghost - phases in/out
            preRenderEnemyEmoji('👁️', 25 * 0.6);       // Eye - ranged attacker
            preRenderEnemyEmoji('🧟‍♀️', 17 * 1.75);    // Female Zombie - large & slow
            preRenderEnemyEmoji('🧛‍♀️', 20);           // Vampire - dodges bullets
            
            // ─── PICKUP & EFFECT EMOJIS ─────────────────────────────────────────
            preRenderEmoji('🔸', COIN_SIZE);       // Coin - basic XP
            preRenderEmoji('🔹', DIAMOND_SIZE);    // Diamond - better XP
            preRenderEmoji('💍', RING_SYMBOL_SIZE); // Ring - even better XP
            preRenderEmoji('♦️', RING_SYMBOL_SIZE); // Demon XP - best XP
            preRenderEmoji('🍎', APPLE_ITEM_SIZE); // Apple - health item
            preRenderEmoji('💣', BOMB_SIZE);       // Bomb - explosive weapon
            preRenderEmoji('⚡️', LIGHTNING_SIZE);  // Lightning - electric attack
            preRenderEmoji('🧿', EYE_PROJECTILE_SIZE); // Eye projectile
            preRenderEmoji('🪓', WHIRLWIND_AXE_SIZE);  // Whirlwind axe powerup
            preRenderEmoji('🕸️', 25);              // Spider web - slowing effect
            preRenderEmoji('🐶', 25);              // Dog companion
            preRenderEmoji('🦉', 30);              // Owl companion
            preRenderEmoji('🧱', 30);              // Brick wall - destructible
            preRenderEmoji('🛢️', 15);             // Barrel - explodes when destroyed
            
            console.log("All emojis have been pre-rendered to memory.");
        }


        // ═══════════════════════════════════════════════════════════════════════════
        // SPRITE & ASSET LOADING SYSTEM
        // ═══════════════════════════════════════════════════════════════════════════
        // This section handles loading all game images and sounds before gameplay starts
        
        // ─── IMAGE SPRITE PATHS ─────────────────────────────────────────────────
        // Maps sprite names to their file paths
        const spritePaths = {
            gun: 'sprites/gun.png',                 // Player's gun weapon
            bullet: 'sprites/bullet.png',           // Bullet projectile
            circle: 'sprites/circle.png',           // Damaging circle powerup
            pickupBox: 'sprites/pickupbox.png',     // Powerup box
            slime: 'sprites/slime.png',             // Slowing puddle effect
            playerUp: 'sprites/playerup.png',       // Player facing up
            playerDown: 'sprites/playerdown.png',   // Player facing down
            playerLeft: 'sprites/playerleft.png',   // Player facing left
            playerRight: 'sprites/playerright.png', // Player facing right
            levelUpBox: 'sprites/levelupbox.png',   // Level up screen decoration
            spinninglight: 'sprites/spinninglight.png', // Orbiting light powerup
            bloodPuddle: 'sprites/blood.png',       // Blood splatter effect
            crosshair: 'sprites/crosshair.png'      // Aiming crosshair
        };

        // Storage for loaded sprite images
        const sprites = {};
        
        // Asset loading progress tracking
        let assetsLoadedCount = 0;
        const totalSprites = Object.keys(spritePaths).length;

        // ─── AUDIO SOUND PATHS ──────────────────────────────────────────────────
        // Maps sound effect names to their file paths
        const audioPaths = {
            playerShoot: 'audio/fire_shot.mp3',      // Gun firing sound
            xpPickup: 'audio/pick_up_xp.mp3',        // Collecting XP gems
            boxPickup: 'audio/pick_up_power.mp3',    // Collecting powerup boxes
            levelUp: 'audio/level_up.mp3',           // Level up fanfare
            levelUpSelect: 'audio/level_up_end.mp3', // Selecting upgrade
            enemyDeath: 'audio/enemy_death.mp3',     // Enemy killed
            gameOver: 'audio/gameover.mp3',          // Player dies
            playerScream: 'audio/scream.mp3',        // Player takes damage
            uiClick: 'audio/click.mp3',              // Menu button click
            mainMenu: 'audio/mainmenu.mp3',          // Main menu music
            dodge: 'audio/dodge.mp3'                 // Dash/dodge sound
        };
        
        // Storage for loaded audio players (using Tone.js)
        const audioPlayers = {};
        const totalAudio = Object.keys(audioPaths).length;
        // ─── BACKGROUND MAP IMAGES ──────────────────────────────────────────────
        // Array of background images for different maps
        // Players can unlock additional maps through the upgrade shop
        const backgroundPaths = [ 
            'sprites/Background6.png',  // Map 1: Grass Map 1
            'sprites/Background2.png',  // Map 2: Desert Map 1
            'sprites/Background3.png',  // Map 3: Desert Map 2
            'sprites/Background4.png',  // Map 4: Lava Map 1
            'sprites/Background5.png',  // Map 5: Lava Map 2
            'sprites/Background8.png',  // Map 6: Desert Map 3
            'sprites/Background1.png',  // Map 7: Ice Map 1
            'sprites/Background7.png',  // Map 8: Grass Map 2
            'sprites/Background9.png',  // Map 9: Ice Map 2
            'sprites/Background10.png', // Map 10: Junkyard (unlockable)
            'sprites/Background12.png', // Map 11: Log Cabin (unlockable)
            'sprites/Background13.png'  // Map 12: Cellar (unlockable)
        ];
        
        // Storage for loaded background images
        const backgroundImages = new Array(backgroundPaths.length);
        const totalBackgrounds = backgroundPaths.length;
        
        // Total count of all assets to load (for progress tracking)
        const totalAssets = totalSprites + totalAudio + totalBackgrounds;
        
        // Detect if the player is on a mobile device
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

       

        // ─── ASSET LOADING FUNCTIONS ────────────────────────────────────────────
        
        // Called each time an asset finishes loading
        // When all assets are loaded, hide loading screen and show start button
        function assetLoaded() {
            assetsLoadedCount++;
            
            // Check if all assets have finished loading
            if (assetsLoadedCount === totalAssets) {
                console.log('All game assets loaded successfully.');
                
                // Set the level up box image source
                document.getElementById('levelUpBox').src = sprites.levelUpBox.src;
                
                // Pre-render all emojis for better performance
                initializePreRenders();

                // Hide loading screen and show start button
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('startScreen').style.display = 'flex';
            }
        }
        
        // Load a single sprite image
        // @param name - The key to store the sprite under
        // @param path - The file path to the image
        function loadSprite(name, path) {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                sprites[name] = img;
                assetLoaded(); // Increment loaded count
            };
            img.onerror = () => console.error(`Failed to load sprite: ${path}`);
        }

        // Load a single audio file using Tone.js
        // @param name - The key to store the audio player under
        // @param path - The file path to the audio
        function loadAudio(name, path) {
            const player = new Tone.Player({
                url: path,
                autostart: false,
                loop: name === 'mainMenu', // Only loop the main menu music
                onload: assetLoaded // Increment loaded count when ready
            }).toDestination();
            audioPlayers[name] = player;
        }

        // Load a single background image
        // @param path - The file path to the background
        // @param index - The array index to store it at
        function loadBackground(path, index) {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                backgroundImages[index] = img; // Store at specific index
                assetLoaded(); // Increment loaded count
            };
            img.onerror = () => console.error(`Failed to load background: ${path}`);
        }

        // ─── START LOADING ALL ASSETS ───────────────────────────────────────────
        // These loops kick off the loading process for all game assets
        for (const [name, path] of Object.entries(spritePaths)) loadSprite(name, path);
        for (const [name, path] of Object.entries(audioPaths)) loadAudio(name, path);
        backgroundPaths.forEach((path, index) => loadBackground(path, index));

