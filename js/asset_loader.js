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
        function preRenderEmoji(emoji, size) {
            // Create an off-screen canvas to draw the emoji once
            const bufferCanvas = document.createElement('canvas');
            const bufferCtx = bufferCanvas.getContext('2d');
            
            // Add padding around the emoji so it doesn't get cut off
            const paddedSize = size * 1.3;
            bufferCanvas.width = paddedSize;
            bufferCanvas.height = paddedSize;
            
            // Draw the emoji centered on the canvas
            bufferCtx.font = `${size}px sans-serif`;
            bufferCtx.textAlign = 'center';
            bufferCtx.textBaseline = 'middle';
            bufferCtx.fillText(emoji, paddedSize / 2, paddedSize / 2);
            
            // Store the canvas for later use
            preRenderedEntities[emoji] = bufferCanvas;
        }

        // Initialize all emoji pre-renders when the game loads
        // This is called once after all assets are loaded
        function initializePreRenders() {
            // ─── ENEMY EMOJIS ───────────────────────────────────────────────────
            preRenderEmoji('🧟', 17);              // Zombie - basic enemy
            preRenderEmoji('💀', 20);              // Skull - faster enemy
            preRenderEmoji('🦇', 25 * 0.85);       // Bat - dashing enemy
            preRenderEmoji('🐌', 22);              // Snail - leaves slowing puddles
            preRenderEmoji('🦟', 15);              // Mosquito - erratic movement
            preRenderEmoji('😈', 20 * 0.8);        // Devil - axis-based movement
            preRenderEmoji('👹', 28 * 0.7);        // Demon - alternating behavior
            preRenderEmoji('👻', 22);              // Ghost - phases in/out
            preRenderEmoji('👁️', 25 * 0.6);       // Eye - ranged attacker
            preRenderEmoji('🧟‍♀️', 17 * 1.75);    // Female Zombie - large & slow
            preRenderEmoji('🧛‍♀️', 20);           // Vampire - dodges bullets
            
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

