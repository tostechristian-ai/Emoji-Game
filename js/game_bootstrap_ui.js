// ═══════════════════════════════════════════════════════════════════════════
// GAME BOOTSTRAP & UI WIRING
// ═══════════════════════════════════════════════════════════════════════════
// This file is responsible for:
//   - Starting and running the main game loop
//   - Defining all config tables (upgrades, pickups)
//   - Connecting every button/slider to its function
//   - Character select screen logic
//   - Fullscreen toggle (desktop only)

// ═══════════════════════════════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════════════════════════════

// Main game loop — runs every frame (~60fps) while the game is active
// Order matters: update logic first, then draw, then refresh UI text
let _gameSpeedAccumulator = 0; // For fractional speed tracking

function gameLoop() {
  // Game speed handling: support 0.5x (slow-mo), 1x, 2x, 3x
  const scale = gameTimeScale || 1;
  
  if (scale < 1) {
    // Slow motion: accumulate and update every other frame
    _gameSpeedAccumulator += scale;
    if (_gameSpeedAccumulator >= 1) {
      _gameSpeedAccumulator -= 1;
      update();
    }
  } else {
    // Normal or fast speed: run multiple updates per frame
    for (let i = 0; i < scale; i++) {
      update();
    }
  }
  
  handleGamepadInput(); // Poll gamepad buttons/sticks
  draw();              // Render everything to the canvas
  updateUIStats();     // Refresh HUD text (level, score, XP bar, etc.)
  if (!gameOver && gameActive) animationFrameId = requestAnimationFrame(gameLoop);
}

// Lightweight secondary loop that keeps gamepad navigation working on menus
// Runs even when the game is not active (so you can navigate menus with a controller)
function menuGamepadLoop() {
  if (!gameActive || gamePaused) handleGamepadInput();
  requestAnimationFrame(menuGamepadLoop);
}
requestAnimationFrame(menuGamepadLoop); // Start immediately on page load

// ═══════════════════════════════════════════════════════════════════════════
// PLAYER DATA STORAGE
// ═══════════════════════════════════════════════════════════════════════════

// Holds all persistent player data (coins, upgrade levels, unlocked items)
// Loaded from localStorage on startup, saved whenever something changes
let playerData = {};

// ═══════════════════════════════════════════════════════════════════════════
// PERMANENT UPGRADES CONFIG TABLE
// ═══════════════════════════════════════════════════════════════════════════
// These upgrades are purchased in the shop between runs and persist forever.
// Each entry defines: display name, description, base cost, cost scaling,
// the stat effect per level, max level, and icon.
const PERMANENT_UPGRADES = {
  playerDamage: { name: "Weapon Power",    desc: "Permanently increase base damage by 2%.",          baseCost: 100, costIncrease: 1.2,  effect: 0.02,   maxLevel: 10, icon: '💥' },
  playerSpeed:  { name: "Movement Speed",  desc: "Permanently increase base movement speed by 1.5%.", baseCost: 80,  costIncrease: 1.2,  effect: 0.015,  maxLevel: 10, icon: '🏃' },
  xpGain:       { name: "XP Gain",         desc: "Gain 3% more experience from all sources.",         baseCost: 90,  costIncrease: 1.2,  effect: 0.03,   maxLevel: 10, icon: '📈' },
  enemyHealth:  { name: "Weaken Foes",     desc: "Enemies spawn with 2% less health.",                baseCost: 150, costIncrease: 1.25, effect: -0.02,  maxLevel: 5,  icon: '💔' },
  magnetRadius: { name: "Pickup Radius",   desc: "Increase pickup attraction radius by 4%.",          baseCost: 60,  costIncrease: 1.2,  effect: 0.04,   maxLevel: 10, icon: '🧲' },
  luck:         { name: "Luck",            desc: "Increase the chance for better drops by 0.1%.",     baseCost: 200, costIncrease: 1.3,  effect: 0.001,  maxLevel: 5,  icon: '🍀' }
};

// ═══════════════════════════════════════════════════════════════════════════
// ALWAYS-AVAILABLE PICKUPS
// ═══════════════════════════════════════════════════════════════════════════
// These powerups can drop from boxes or appear at the merchant without needing
// to be unlocked in the shop first.
const ALWAYS_AVAILABLE_PICKUPS = {
  v_shape_projectile: { id: 'v_shape_projectile', name: 'V-Shape Shots' },
  magnetic_projectile: { id: 'magnetic_projectile', name: 'Magnetic Shots' },
  ice_projectile: { id: 'ice_projectile', name: 'Ice Projectiles' },
  ricochet: { id: 'ricochet', name: 'Ricochet Shots' },
  explosive_bullets: { id: 'explosive_bullets', name: 'Explosive Bullets' },
  puddle_trail: { id: 'puddle_trail', name: 'Slime Trail' },
  sword: { id: 'sword', name: 'Auto-Sword' },
  laser_pointer: { id: 'laser_pointer', name: 'Laser Pointer' },
  auto_aim: { id: 'auto_aim', name: 'Auto Aim' },
  dual_gun: { id: 'dual_gun', name: 'Dual Gun' },
  dual_revolvers: { id: 'dual_revolvers', name: 'Dual Revolvers' },
  bomb: { id: 'bomb', name: 'Bomb Emitter' },
  orbiter: { id: 'orbiter', name: 'Spinning Orbiter' },
  lightning_projectile: { id: 'lightning_projectile', name: 'Lightning Projectile' },
  flamethrower: { id: 'flamethrower', name: 'Flamethrower' },
  laser_cannon: { id: 'laser_cannon', name: 'Laser Cannon' }
};

// ═══════════════════════════════════════════════════════════════════════════
// UNLOCKABLE PICKUPS CONFIG TABLE
// ═══════════════════════════════════════════════════════════════════════════
// These items must be purchased in the upgrade shop before they can appear
// in-game (from boxes or the merchant). Includes maps, companions, and
// special powerups.
const UNLOCKABLE_PICKUPS = {
  // ─── MAPS ─────────────────────────────────────────────────────────────────
  map_select:       { name: "Map Select",       desc: "Unlocks the ability to choose your map.",         cost: 1500, icon: '🗺️' },
  map_junkyard:     { name: "Junkyard Map",     desc: "Unlocks the Junkyard map for selection.",         cost: 800,  icon: '🏭' },
  map_log_cabin:    { name: "Log Cabin Map",    desc: "Unlocks the Log Cabin map for selection.",        cost: 800,  icon: '🪵' },
  map_cellar:       { name: "Cellar Map",       desc: "Unlocks the Cellar map for selection.",           cost: 800,  icon: '🕯️' },
  map_desert_dunes: { name: "Desert Dunes Map", desc: "Unlocks the Desert Dunes map for selection.",   cost: 800,  icon: '🏜️' },
  map_mossy_rocks:  { name: "Mossy Rocks Map",  desc: "Unlocks the Mossy Rocks map for selection.",     cost: 800,  icon: '🪨' },
  map_golden_caves: { name: "Golden Caves Map", desc: "Unlocks the Golden Caves map for selection.",    cost: 800,  icon: '💎' },
  map_grid:         { name: "Grid Map",         desc: "Unlocks the Grid map for selection.",             cost: 800,  icon: '▦' },
  // ─── COMPANIONS ───────────────────────────────────────────────────────────
  night_owl:    { name: "Night Owl",     desc: "Unlocks a companion that snipes enemies.",     cost: 1300, icon: '🦉' },
  whirlwind_axe:{ name: "Whirlwind Axe", desc: "Unlocks a large, damaging orbiting axe.",     cost: 1000, icon: '🪓' },
  doppelganger: { name: "Doppelganger",  desc: "Unlocks the doppelganger pickup.",             cost: 1200, icon: '👯' },
  dog_companion:{ name: "Dog Companion", desc: "Unlocks the loyal dog companion pickup.",      cost: 500,  icon: '🐶' },
  // ─── SPECIAL POWERUPS ─────────────────────────────────────────────────────
  anti_gravity: { name: "Anti-Gravity",  desc: "Unlocks the enemy-repelling pulse pickup.",   cost: 600,  icon: '💨' },
  temporal_ward:{ name: "Temporal Ward", desc: "Unlocks the time-freezing defensive pickup.", cost: 800,  icon: '⏱️' },
  rocket_launcher:{ name: "Heavy Shells",desc: "Unlocks the powerful heavy shells pickup.",   cost: 1100, icon: '🚀' },
  circle:       { name: "Damaging Circle",desc: "Unlocks the persistent damaging aura pickup.",cost: 900, icon: '⭕' },
  flaming_bullets:{ name: "Flaming Bullets",desc: "Unlocks bullets that ignite enemies.",     cost: 1150, icon: '🔥' },
  black_hole:   { name: "Black Hole",    desc: "Unlocks the enemy-vortex pickup.",            cost: 1180, icon: '⚫' },
  vengeance_nova:{ name: "Vengeance Nova",desc: "Unlocks the defensive blast pickup.",        cost: 700,  icon: '🛡️' },
  robot_drone:  { name: "Robot Drone",   desc: "Unlocks the autonomous combat drone.",       cost: 900,  icon: '🤖' },
  game_speed:   { name: "Game Speed",      desc: "Unlocks game speed control (0.5x, 1x, 2x, 3x).", cost: 1200, icon: '⏩' },
  // ─── WEAPON PICKUPS ───────────────────────────────────────────────────────
  shotgun:      { name: "Shotgun",       desc: "Unlocks the shotgun powerup.",               cost: 950,  icon: '🔫' },
  ice_cannon:   { name: "Ice Cannon",      desc: "Unlocks the ice cannon powerup.",            cost: 1000, icon: '❄️' },
  dynamite:     { name: "Dynamite",        desc: "Unlocks the dynamite throwing powerup.",     cost: 1100, icon: '🧨' },
  pistol:       { name: "Pistol",          desc: "Unlocks pistol for non-cowboy characters.",  cost: 800,  icon: '🔫' },
  // ─── QUALITY OF LIFE ──────────────────────────────────────────────────────
  fourth_heart: { name: "4th Heart",       desc: "Start each run with 4 hearts instead of 3.", cost: 3000, icon: '❤️' },
  four_choices: { name: "4 Level Choices", desc: "Get 4 choices on level up instead of 3.",  cost: 3500, icon: '📋' }
};

// ═══════════════════════════════════════════════════════════════════════════
// CHARACTER SELECT SCREEN
// ═══════════════════════════════════════════════════════════════════════════

// Build and show the character selection screen
// Checks unlock conditions for each character and shows lock hints if needed
function showCharacterSelectScreen() {
  difficultyContainer.style.display = 'none';
  characterSelectContainer.style.display = 'block';
  characterTilesContainer.innerHTML = ''; // Clear previous tiles

  Object.values(CHARACTERS).forEach(character => {
    let isUnlocked = false;

    // Check unlock condition type
    if (character.unlockCondition.type === 'start') {
      isUnlocked = true; // Default character, always available
    } else if (character.unlockCondition.type === 'achievement') {
      // Unlocked by earning a specific trophy
      if (ACHIEVEMENTS[character.unlockCondition.id]?.unlocked) isUnlocked = true;
    } else if (character.unlockCondition.type === 'store') {
      // Unlocked by purchasing in the upgrades shop
      if (playerData?.unlockedPickups?.[character.id]) isUnlocked = true;
    }

    // Build the tile element
    const tile = document.createElement('div');
    tile.className = 'character-tile';
    if (!isUnlocked) tile.classList.add('locked');
    if (equippedCharacterID === character.id) tile.classList.add('selected');

    // Hint text shown on locked characters
    const lockHint = character.unlockCondition.type === 'store'
      ? `Buy in Upgrades shop`
      : character.unlockCondition.type === 'achievement'
        ? `Unlock "${ACHIEVEMENTS[character.unlockCondition.id]?.name || ''}" trophy`
        : 'LOCKED';

    tile.innerHTML = `
      <p class="char-emoji">${character.emoji}</p>
      <h4 class="char-name">${character.name}</h4>
      <p class="char-perk">${isUnlocked ? character.perk : lockHint}</p>
    `;

    // Only add click handler if the character is unlocked
    if (isUnlocked) {
      tile.addEventListener('click', () => {
        playUISound('levelUpSelect');
        vibrateUI();
        equippedCharacterID = character.id; // Set as active character
        characterSelectContainer.style.display = 'none';
        difficultyContainer.style.display = 'block';
      });
    }

    characterTilesContainer.appendChild(tile);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE LOAD — INITIALIZATION & BUTTON WIRING
// ═══════════════════════════════════════════════════════════════════════════

// Runs once when the page finishes loading
// Sets up all UI, loads saved data, and wires every button to its function
window.onload = function() {

  // Add mobile CSS class if on a touch device
  if (isMobileDevice) document.body.classList.add('is-mobile');

  // ─── LOAD SAVED DATA ──────────────────────────────────────────────────────
  loadPlayerData();    // Coins, upgrades, unlocked items
  loadPlayerStats();   // Achievement progress, lifetime stats
  loadCheats();        // Which cheats are enabled
  displayHighScores(); // Show best scores on main menu

  // ─── HIDE ALL SCREENS ON STARTUP ──────────────────────────────────────────
  // Everything is hidden; asset_loader.js will show the start button when ready
  resizeCanvas();
  startScreen.style.display = 'none';           // Hidden until assets load
  gameContainer.style.display = 'none';
  difficultyContainer.style.display = 'none';
  mapSelectContainer.style.display = 'none';
  characterSelectContainer.style.display = 'none';
  movementStickBase.style.display = 'none';
  firestickBase.style.display = 'none';
  upgradeMenu.style.display = 'none';
  gameOverlay.style.display = 'none';
  gameGuideModal.style.display = 'none';
  achievementsModal.style.display = 'none';
  cheatsModal.style.display = 'none';
  pauseButton.style.display = 'none';

  // ─── START BUTTON ─────────────────────────────────────────────────────────
  // Must be triggered by user interaction to unlock the Web Audio API
  startButton.addEventListener('click', () => {
    Tone.start().then(() => {
      console.log("AudioContext started by user.");
      showInitialScreen(); // Show splash → intro video → main menu
    });
  }, { once: true }); // Only fires once

  // ─── CLOSE MODALS BY CLICKING OUTSIDE ─────────────────────────────────────
  // Clicking the dark backdrop behind a modal closes it
  [gameGuideModal, achievementsModal, cheatsModal, merchantShop].forEach(modal => {
    if (!modal) return;
    const content = modal.querySelector('.content-wrapper') || modal.querySelector('.merchant-options-container');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'merchantShop') closeMerchantShop();
        else modal.style.display = 'none';
      }
    });
    // Prevent clicks inside the content from closing the modal
    if (content) {
      content.addEventListener('click', (e) => e.stopPropagation());
      content.addEventListener('touchstart', (e) => e.stopPropagation());
    }
  });

  // ─── DIFFICULTY BUTTONS (Easy / Medium / Hard) ────────────────────────────
  difficultyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      vibrateUI('select');
      playUISound('uiClick');
      currentDifficulty = e.target.dataset.difficulty; // 'easy', 'medium', or 'hard'
      // If map select is unlocked, show map picker; otherwise start immediately
      if (playerData.unlockedPickups.map_select) showMapSelectScreen();
      else { selectedMapIndex = -1; startGame(); }
    });
    button.addEventListener('mouseover', () => playUISound('uiClick'));
  });

  // ─── HOW TO PLAY BUTTON ───────────────────────────────────────────────────
  if (howToPlayButton) {
    howToPlayButton.addEventListener('click', async () => {
      vibrateUI();
      difficultyContainer.style.display = 'none';
      if (gameGuideModal) {
        gameGuideModal.style.display = 'flex';
        const contentWrapper = gameGuideModal.querySelector('.content-wrapper');
        if (contentWrapper) contentWrapper.scrollTop = 0; // Always scroll to top
      }
    });
    howToPlayButton.addEventListener('mouseover', () => playUISound('uiClick'));
  }

  // Back button inside the game guide
  if (backToDifficultyButton) {
    backToDifficultyButton.addEventListener('click', () => {
      vibrateUI();
      if (gameGuideModal) gameGuideModal.style.display = 'none';
      if (difficultyContainer) difficultyContainer.style.display = 'block';
    });
  }

  // ─── MAP SELECT NAVIGATION ────────────────────────────────────────────────
  backToDifficultySelectButton.addEventListener('click', () => {
    vibrateUI(); playUISound('uiClick');
    selectedMapIndex = -1;
    mapSelectContainer.style.display = 'none';
    difficultyContainer.style.display = 'block';
  });

  // ─── CHARACTER SELECT NAVIGATION ─────────────────────────────────────────
  characterSelectButton.addEventListener('click', () => {
    vibrateUI(); playUISound('uiClick');
    showCharacterSelectScreen();
  });
  backToMenuFromCharsButton.addEventListener('click', () => {
    vibrateUI(); playUISound('uiClick');
    characterSelectContainer.style.display = 'none';
    difficultyContainer.style.display = 'block';
  });

  // ─── UPGRADE SHOP ─────────────────────────────────────────────────────────
  const openShopAction = () => { vibrateUI(); playUISound('uiClick'); openUpgradeShop(); };
  desktopUpgradesButton.addEventListener('click', openShopAction);
  if (mobileMenuUpgradesButton) mobileMenuUpgradesButton.addEventListener('click', openShopAction);
  if (mobileUpgradesButton) mobileUpgradesButton.addEventListener('click', openShopAction);
  backToMenuButton.addEventListener('click', () => { vibrateUI(); playUISound('uiClick'); showDifficultyScreen(); });

  // ─── RESET BUTTON ─────────────────────────────────────────────────────────
  const resetAction = () => { vibrate(20); resetAllData(); };
  desktopResetButton.addEventListener('click', resetAction);
  mobileResetButton.addEventListener('click', resetAction);
  if (mobileResetGameButton) mobileResetGameButton.addEventListener('click', resetAction);

  // ─── ACHIEVEMENTS / TROPHIES ──────────────────────────────────────────────
  const achievementsAction = () => {
    vibrateUI(); playUISound('uiClick');
    difficultyContainer.style.display = 'none';
    displayAchievements();
    achievementsModal.style.display = 'flex';
    const contentWrapper = achievementsModal.querySelector('.content-wrapper');
    if (contentWrapper) contentWrapper.scrollTop = 0;
  };
  desktopAchievementsButton.addEventListener('click', achievementsAction);
  if (mobileMenuTrophiesButton) mobileMenuTrophiesButton.addEventListener('click', achievementsAction);
  if (mobileAchievementsButton) mobileAchievementsButton.addEventListener('click', achievementsAction);

  // ─── CHEATS MENU ──────────────────────────────────────────────────────────
  const cheatsAction = () => {
    vibrateUI(); playUISound('uiClick');
    achievementsModal.style.display = 'none';
    displayCheats();
    cheatsModal.style.display = 'flex';
    const contentWrapper = cheatsModal.querySelector('.content-wrapper');
    if (contentWrapper) contentWrapper.scrollTop = 0;
  };
  cheatsMenuButton.addEventListener('click', cheatsAction);
  if (mobileMenuCheatsButton) mobileMenuCheatsButton.addEventListener('click', cheatsAction);

  // Back buttons inside achievements/cheats modals
  backToMenuFromAchievements.addEventListener('click', () => {
    vibrateUI(); playUISound('uiClick');
    achievementsModal.style.display = 'none';
    difficultyContainer.style.display = 'block';
  });
  backToAchievementsButton.addEventListener('click', () => {
    vibrateUI(); playUISound('uiClick');
    cheatsModal.style.display = 'none';
    displayAchievements();
    achievementsModal.style.display = 'flex';
    const contentWrapper = achievementsModal.querySelector('.content-wrapper');
    if (contentWrapper) contentWrapper.scrollTop = 0;
  });

  // ─── PAUSE BUTTON ─────────────────────────────────────────────────────────
  if (pauseButton) {
    pauseButton.addEventListener('click', togglePause);
    pauseButton.addEventListener('touchstart', (e) => { e.preventDefault(); vibrateUI(); togglePause(); });
  }
  if (resumeButton) {
    const resumeAction = (e) => { e.preventDefault(); vibrateUI(); playUISound('uiClick'); togglePause(); };
    resumeButton.addEventListener('click', resumeAction);
    resumeButton.addEventListener('touchstart', resumeAction);
  }

  // ─── GAME SPEED BUTTON ────────────────────────────────────────────────────
  // Check if game speed is unlocked and show/hide button accordingly
  window.updateGameSpeedButtonVisibility = function() {
    if (gameSpeedButton) {
      const isUnlocked = playerData?.unlockedPickups?.game_speed;
      gameSpeedUnlocked = isUnlocked;
      gameSpeedButton.style.display = isUnlocked ? 'block' : 'none';
      if (isUnlocked) {
        const speedLabel = gameTimeScale === 0.5 ? '0.5x' : `${gameTimeScale}x`;
        gameSpeedButton.textContent = `Speed: ${speedLabel}`;
      }
    }
  };
  
  if (gameSpeedButton) {
    const speedAction = (e) => { e.preventDefault(); toggleGameSpeed(); };
    gameSpeedButton.addEventListener('click', speedAction);
    gameSpeedButton.addEventListener('touchstart', speedAction);
    // Initial visibility check
    window.updateGameSpeedButtonVisibility();
  }

  // ─── MERCHANT LEAVE BUTTON ────────────────────────────────────────────────
  leaveMerchantButton.addEventListener('click', () => {
    vibrateUI();
    playUISound('uiClick');
    closeMerchantShop();
  });

  // ─── AUDIO VOLUME SLIDERS ─────────────────────────────────────────────────
  // Music volume — controls the background music player
  musicVolumeSlider.addEventListener('input', (e) => {
    if (currentBGMPlayer) currentBGMPlayer.volume.value = e.target.value;
  });
  // Effects volume — controls all sound effect players
  effectsVolumeSlider.addEventListener('input', (e) => {
    const newVolume = parseFloat(e.target.value);
    for (const key in audioPlayers) {
      if (audioPlayers.hasOwnProperty(key)) audioPlayers[key].volume.value = newVolume;
    }
    // Also update synth volumes (sword, eye projectile, bomb)
    swordSwingSynth.volume.value = newVolume;
    eyeProjectileHitSynth.volume.value = newVolume;
    bombExplosionSynth.volume.value = newVolume;
  });

  // ─── ZOOM TOGGLE ──────────────────────────────────────────────────────────
  // Toggles camera zoom in/out (1.0 = normal, 1.4 = zoomed in)
  zoomToggle.addEventListener('change', (e) => {
    cameraZoom = e.target.checked ? 1.4 : 1.0;
  });

  // ─── PAUSE MENU RESTART ───────────────────────────────────────────────────
  pauseRestartButton.addEventListener('click', () => {
    playUISound('uiClick'); vibrateUI();
    togglePause();
    endGame();
    showDifficultyScreen();
  });

  // ─── FULLSCREEN TOGGLE (DESKTOP ONLY) ────────────────────────────────────
  const fsBtn = document.getElementById('fullscreenToggle');
  if (fsBtn && !isMobileDevice) {
    // Helper: check if currently fullscreen
    function isFullscreen() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement ||
                document.mozFullScreenElement || document.msFullscreenElement);
    }
    // Update the button icon to reflect current state
    function updateFsIcon() {
      fsBtn.textContent = isFullscreen() ? '✕' : '⛶';
      fsBtn.title = isFullscreen() ? 'Exit Fullscreen' : 'Enter Fullscreen';
    }
    // Request fullscreen (cross-browser)
    function enterFS() {
      const el = document.documentElement;
      return el.requestFullscreen?.() || el.webkitRequestFullscreen?.() ||
             el.mozRequestFullScreen?.() || el.msRequestFullscreen?.();
    }
    // Exit fullscreen (cross-browser)
    function exitFS() {
      return document.exitFullscreen?.() || document.webkitExitFullscreen?.() ||
             document.mozCancelFullScreen?.() || document.msExitFullscreen?.();
    }
    fsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      vibrateUI();
      const p = isFullscreen() ? exitFS() : enterFS();
      if (p?.catch) p.catch((err) => console.warn('Fullscreen error:', err));
    });
    // Keep icon in sync with actual fullscreen state
    document.addEventListener('fullscreenchange', updateFsIcon);
    document.addEventListener('webkitfullscreenchange', updateFsIcon);
    document.addEventListener('mozfullscreenchange', updateFsIcon);
    document.addEventListener('MSFullscreenChange', updateFsIcon);
    updateFsIcon();
  }
};
