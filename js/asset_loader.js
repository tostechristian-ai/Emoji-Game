        const preRenderedEntities = {};

        function preRenderEmoji(emoji, size) {
            const bufferCanvas = document.createElement('canvas');
            const bufferCtx = bufferCanvas.getContext('2d');
            const paddedSize = size * 1.3;
            bufferCanvas.width = paddedSize;
            bufferCanvas.height = paddedSize;
            bufferCtx.font = `${size}px sans-serif`;
            bufferCtx.textAlign = 'center';
            bufferCtx.textBaseline = 'middle';
            bufferCtx.fillText(emoji, paddedSize / 2, paddedSize / 2);
            preRenderedEntities[emoji] = bufferCanvas;
        }

        function initializePreRenders() {
            // --- ENEMIES ---
            preRenderEmoji('🧟', 17);
            preRenderEmoji('💀', 20);
            preRenderEmoji('🦇', 25 * 0.85);
            preRenderEmoji('🐌', 22);
            preRenderEmoji('🦟', 15);
            preRenderEmoji('😈', 20 * 0.8);
            preRenderEmoji('👹', 28 * 0.7);
            preRenderEmoji('👻', 22);
            preRenderEmoji('👁️', 25 * 0.6);
            preRenderEmoji('🧟‍♀️', 17 * 1.75);
            preRenderEmoji('🧛‍♀️', 20);
            // --- PICKUPS & EFFECTS ---
            preRenderEmoji('🔸', COIN_SIZE);
            preRenderEmoji('🔹', DIAMOND_SIZE);
            preRenderEmoji('💍', RING_SYMBOL_SIZE);
            preRenderEmoji('♦️', RING_SYMBOL_SIZE);
            preRenderEmoji('🍎', APPLE_ITEM_SIZE);
            preRenderEmoji('💣', BOMB_SIZE);
            preRenderEmoji('⚡️', LIGHTNING_SIZE);
            preRenderEmoji('🧿', EYE_PROJECTILE_SIZE);
            preRenderEmoji('🪓', WHIRLWIND_AXE_SIZE);
            preRenderEmoji('🐶', 25);
            preRenderEmoji('🦉', 30);
            preRenderEmoji('🧱', 30); 
            preRenderEmoji('🛢️', 15); 
            console.log("All emojis have been pre-rendered to memory.");
        }


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
            'sprites/Background6.png', // NOW Map 1 will load Background6.png
            'sprites/Background2.png', // NOW Map 2 will load Background2.png
            'sprites/Background3.png', // NOW Map 3 will load Background3.png
            'sprites/Background4.png', // NOW Map 4 will load Background4.png
            'sprites/Background5.png',  // Map 5: Molten Lava
            'sprites/Background8.png',  // Map 6: Orange Dirt
            'sprites/Background1.png',  // Map 7: Grey Stone
            'sprites/Background7.png', // Map 8: Other Grassy
            'sprites/Background9.png'  // Map 9: Other Stone
            
        ];
        const backgroundImages = new Array(backgroundPaths.length);
        const totalBackgrounds = backgroundPaths.length;
        const totalAssets = totalSprites + totalAudio + totalBackgrounds;
        
        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

       

        function assetLoaded() {
            assetsLoadedCount++;
            if (assetsLoadedCount === totalAssets) {
                console.log('All game assets loaded successfully.');
                document.getElementById('levelUpBox').src = sprites.levelUpBox.src;
                
                initializePreRenders(); // <-- OPTIMIZATION: Initialize pre-renders

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
                backgroundImages[index] = img; // Assign to the correct index instead of push
                assetLoaded();
            };
            img.onerror = () => console.error(`Failed to load background: ${path}`);
        }

        for (const [name, path] of Object.entries(spritePaths)) loadSprite(name, path);
        for (const [name, path] of Object.entries(audioPaths)) loadAudio(name, path);
        backgroundPaths.forEach((path, index) => loadBackground(path, index));

