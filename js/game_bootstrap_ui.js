// Startup + menu wiring + config tables.

function gameLoop() {
  update();
  handleGamepadInput();
  draw();
  updateUIStats();
  if (!gameOver && gameActive) animationFrameId = requestAnimationFrame(gameLoop);
}

// Separate lightweight loop that keeps gamepad working on menus too
function menuGamepadLoop() {
  if (!gameActive || gamePaused) handleGamepadInput();
  requestAnimationFrame(menuGamepadLoop);
}
requestAnimationFrame(menuGamepadLoop);

let playerData = {};
const PERMANENT_UPGRADES = {
  playerDamage: { name: "Weapon Power", desc: "Permanently increase base damage by 2%.", baseCost: 100, costIncrease: 1.2, effect: 0.02, maxLevel: 10, icon: '💥' },
  playerSpeed: { name: "Movement Speed", desc: "Permanently increase base movement speed by 1.5%.", baseCost: 80, costIncrease: 1.2, effect: 0.015, maxLevel: 10, icon: '🏃' },
  xpGain: { name: "XP Gain", desc: "Gain 3% more experience from all sources.", baseCost: 90, costIncrease: 1.2, effect: 0.03, maxLevel: 10, icon: '📈' },
  enemyHealth: { name: "Weaken Foes", desc: "Enemies spawn with 2% less health.", baseCost: 150, costIncrease: 1.25, effect: -0.02, maxLevel: 5, icon: '💔' },
  magnetRadius: { name: "Pickup Radius", desc: "Increase pickup attraction radius by 4%.", baseCost: 60, costIncrease: 1.2, effect: 0.04, maxLevel: 10, icon: '🧲' },
  luck: { name: "Luck", desc: "Increase the chance for better drops by 0.1%.", baseCost: 200, costIncrease: 1.3, effect: 0.001, maxLevel: 5, icon: '🍀' }
};

const ALWAYS_AVAILABLE_PICKUPS = {
  v_shape_projectile: { id: 'v_shape_projectile', name: 'V-Shape Shots' }, magnetic_projectile: { id: 'magnetic_projectile', name: 'Magnetic Shots' },
  ice_projectile: { id: 'ice_projectile', name: 'Ice Projectiles' }, ricochet: { id: 'ricochet', name: 'Ricochet Shots' },
  explosive_bullets: { id: 'explosive_bullets', name: 'Explosive Bullets' }, puddle_trail: { id: 'puddle_trail', name: 'Slime Trail' },
  sword: { id: 'sword', name: 'Auto-Sword' }, laser_pointer: { id: 'laser_pointer', name: 'Laser Pointer' },
  auto_aim: { id: 'auto_aim', name: 'Auto Aim' }, dual_gun: { id: 'dual_gun', name: 'Dual Gun' },
  bomb: { id: 'bomb', name: 'Bomb Emitter' }, orbiter: { id: 'orbiter', name: 'Spinning Orbiter' },
  lightning_projectile: { id: 'lightning_projectile', name: 'Lightning Projectile' },
  ice_shard_cannon: { id: 'ice_shard_cannon', name: 'Ice Shard Cannon' }
};

const UNLOCKABLE_PICKUPS = {
  map_select: { name: "Map Select", desc: "Unlocks the ability to choose your map.", cost: 1500, icon: '🗺️' },
  night_owl: { name: "Night Owl", desc: "Unlocks a companion that snipes enemies.", cost: 1300, icon: '🦉' },
  whirlwind_axe: { name: "Whirlwind Axe", desc: "Unlocks a large, damaging orbiting axe.", cost: 1000, icon: '🪓' },
  doppelganger: { name: "Doppelganger", desc: "Unlocks the doppelganger pickup.", cost: 1200, icon: '👯' },
  dog_companion: { name: "Dog Companion", desc: "Unlocks the loyal dog companion pickup.", cost: 500, icon: '🐶' },
  anti_gravity: { name: "Anti-Gravity", desc: "Unlocks the enemy-repelling pulse pickup.", cost: 600, icon: '💨' },
  temporal_ward: { name: "Temporal Ward", desc: "Unlocks the time-freezing defensive pickup.", cost: 800, icon: '⏱️' },
  rocket_launcher: { name: "Heavy Shells", desc: "Unlocks the powerful heavy shells pickup.", cost: 1100, icon: '🚀' },
  circle: { name: "Damaging Circle", desc: "Unlocks the persistent damaging aura pickup.", cost: 900, icon: '⭕' },
  flaming_bullets: { name: "Flaming Bullets", desc: "Unlocks bullets that ignite enemies.", cost: 1150, icon: '🔥' },
  black_hole: { name: "Black Hole", desc: "Unlocks the enemy-vortex pickup.", cost: 1180, icon: '⚫' },
  vengeance_nova: { name: "Vengeance Nova", desc: "Unlocks the defensive blast pickup.", cost: 700, icon: '🛡️' }
};

function showCharacterSelectScreen() {
  difficultyContainer.style.display = 'none';
  characterSelectContainer.style.display = 'block';
  characterTilesContainer.innerHTML = ''; // Clear previous tiles

  // Loop through each character in the CHARACTERS object
  Object.values(CHARACTERS).forEach(character => {
    let isUnlocked = false;

    // Determine if the character is unlocked
    if (character.unlockCondition.type === 'start') {
      isUnlocked = true;
    } else if (character.unlockCondition.type === 'achievement') {
      if (ACHIEVEMENTS[character.unlockCondition.id] && ACHIEVEMENTS[character.unlockCondition.id].unlocked) {
        isUnlocked = true;
      }
    } else if (character.unlockCondition.type === 'store') {
      // Unlocked by purchasing in the upgrades shop
      if (playerData && playerData.unlockedPickups && playerData.unlockedPickups[character.id]) {
        isUnlocked = true;
      }
    }

    const tile = document.createElement('div');
    tile.className = 'character-tile';
    if (!isUnlocked) tile.classList.add('locked');
    if (equippedCharacterID === character.id) tile.classList.add('selected');

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

    if (isUnlocked) {
      tile.addEventListener('click', () => {
        playUISound('levelUpSelect');
        vibrate(10);
        equippedCharacterID = character.id;
        characterSelectContainer.style.display = 'none';
        difficultyContainer.style.display = 'block';
      });
    }

    characterTilesContainer.appendChild(tile);
  });
}

window.onload = function() {
  if (isMobileDevice) document.body.classList.add('is-mobile');

  loadPlayerData();
  loadPlayerStats();
  loadCheats();
  displayHighScores();

  resizeCanvas();
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

  startButton.addEventListener('click', () => {
    Tone.start().then(() => {
      console.log("AudioContext started by user.");
      showInitialScreen();
    });
  }, { once: true });

  [gameGuideModal, achievementsModal, cheatsModal, merchantShop].forEach(modal => {
    if (!modal) return;
    const content = modal.querySelector('.content-wrapper') || modal.querySelector('.merchant-options-container');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal.id === 'merchantShop') closeMerchantShop();
        else modal.style.display = 'none';
      }
    });
    if (content) {
      content.addEventListener('click', (e) => e.stopPropagation());
      content.addEventListener('touchstart', (e) => e.stopPropagation());
    }
  });

  difficultyButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      vibrate(10);
      playUISound('uiClick');
      currentDifficulty = e.target.dataset.difficulty;
      if (playerData.unlockedPickups.map_select) showMapSelectScreen();
      else { selectedMapIndex = -1; startGame(); }
    });
    button.addEventListener('mouseover', () => playUISound('uiClick'));
  });

  if (howToPlayButton) {
    howToPlayButton.addEventListener('click', async () => {
      vibrate(10);
      if (difficultyContainer) difficultyContainer.style.display = 'none';
      if (gameGuideModal) gameGuideModal.style.display = 'flex';
    });
    howToPlayButton.addEventListener('mouseover', () => playUISound('uiClick'));
  }

  if (backToDifficultyButton) {
    backToDifficultyButton.addEventListener('click', () => {
      vibrate(10);
      if (gameGuideModal) gameGuideModal.style.display = 'none';
      if (difficultyContainer) difficultyContainer.style.display = 'block';
    });
  }

  backToDifficultySelectButton.addEventListener('click', () => {
    vibrate(10); playUISound('uiClick');
    selectedMapIndex = -1;
    mapSelectContainer.style.display = 'none'; difficultyContainer.style.display = 'block';
  });

  characterSelectButton.addEventListener('click', () => {
    vibrate(10); playUISound('uiClick');
    showCharacterSelectScreen();
  });

  backToMenuFromCharsButton.addEventListener('click', () => {
    vibrate(10); playUISound('uiClick');
    characterSelectContainer.style.display = 'none';
    difficultyContainer.style.display = 'block';
  });

  const openShopAction = () => { vibrate(10); playUISound('uiClick'); openUpgradeShop(); };
  desktopUpgradesButton.addEventListener('click', openShopAction);
  if (mobileMenuUpgradesButton) mobileMenuUpgradesButton.addEventListener('click', openShopAction);

  backToMenuButton.addEventListener('click', () => { vibrate(10); playUISound('uiClick'); showDifficultyScreen(); });

  const resetAction = () => { vibrate(20); resetAllData(); };
  desktopResetButton.addEventListener('click', resetAction);
  mobileResetButton.addEventListener('click', resetAction);
  if (mobileMenuResetButton) mobileMenuResetButton.addEventListener('click', resetAction);

  const achievementsAction = () => {
    vibrate(10); playUISound('uiClick');
    difficultyContainer.style.display = 'none';
    displayAchievements();
    achievementsModal.style.display = 'flex';
  };
  desktopAchievementsButton.addEventListener('click', achievementsAction);
  if (mobileMenuTrophiesButton) mobileMenuTrophiesButton.addEventListener('click', achievementsAction);

  const cheatsAction = () => {
    vibrate(10); playUISound('uiClick');
    achievementsModal.style.display = 'none';
    displayCheats();
    cheatsModal.style.display = 'flex';
  };
  cheatsMenuButton.addEventListener('click', cheatsAction);
  if (mobileMenuCheatsButton) mobileMenuCheatsButton.addEventListener('click', cheatsAction);

  backToMenuFromAchievements.addEventListener('click', () => {
    vibrate(10); playUISound('uiClick');
    achievementsModal.style.display = 'none';
    difficultyContainer.style.display = 'block';
  });

  backToAchievementsButton.addEventListener('click', () => {
    vibrate(10); playUISound('uiClick');
    cheatsModal.style.display = 'none';
    displayAchievements();
    achievementsModal.style.display = 'flex';
  });

  if (pauseButton) {
    pauseButton.addEventListener('click', togglePause);
    pauseButton.addEventListener('touchstart', (e) => { e.preventDefault(); vibrate(10); togglePause(); });
  }

  if (resumeButton) {
    const resumeAction = (e) => { e.preventDefault(); vibrate(10); playUISound('uiClick'); togglePause(); };
    resumeButton.addEventListener('click', resumeAction);
    resumeButton.addEventListener('touchstart', resumeAction);
  }

  leaveMerchantButton.addEventListener('click', () => {
    vibrate(10);
    playUISound('uiClick');
    closeMerchantShop();
  });

  musicVolumeSlider.addEventListener('input', (e) => { if (currentBGMPlayer) currentBGMPlayer.volume.value = e.target.value; });
  effectsVolumeSlider.addEventListener('input', (e) => {
    const newVolume = parseFloat(e.target.value);
    for (const key in audioPlayers) { if (audioPlayers.hasOwnProperty(key)) audioPlayers[key].volume.value = newVolume; }
    swordSwingSynth.volume.value = newVolume; eyeProjectileHitSynth.volume.value = newVolume; bombExplosionSynth.volume.value = newVolume;
  });
  zoomToggle.addEventListener('change', (e) => { cameraZoom = e.target.checked ? 1.4 : 1.0; });
  pauseRestartButton.addEventListener('click', () => {
    playUISound('uiClick'); vibrate(10); togglePause(); endGame(); showDifficultyScreen();
  });
};

