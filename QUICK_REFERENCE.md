# 🔍 Quick Reference - Where to Find Things

Use this guide to quickly locate specific features in your code.

---

## 🎮 Player Features

| Feature | File | Search For |
|---------|------|------------|
| Player movement speed | `game_core.js` | `player.speed` |
| Player starting health | `game_core.js` | `player.lives` |
| Player size | `game_core.js` | `player.size` |
| Dash cooldown | `game_core.js` | `player.dashCooldown` |
| Dash speed multiplier | `game_update.js` | `currentPlayerSpeed *= 3.5` |
| Player damage multiplier | `game_core.js` | `player.damageMultiplier` |
| Movement controls | `game_update.js` | `if (keys['ArrowUp']` |
| Shooting logic | `game_update.js` | `function createWeapon()` |

---

## 👾 Enemy Features

| Feature | File | Search For |
|---------|------|------------|
| Enemy spawn rate | `game_update.js` | `currentEnemySpawnInterval` |
| Enemy spawn cap | `game_update.js` | `enemySpawnCap` |
| Zombie stats | `game_core.js` | `BASE_ZOMBIE_HEALTH` |
| Skull stats | `game_core.js` | `SKULL_SIZE` |
| Bat stats | `game_core.js` | `BAT_SIZE` |
| Eye stats | `game_core.js` | `EYE_SIZE` |
| Vampire stats | `game_core.js` | `VAMPIRE_SIZE` |
| Enemy AI behavior | `game_update.js` | `enemies.forEach((enemy` |
| Boss spawn interval | `game_core.js` | `BOSS_SPAWN_INTERVAL_LEVELS` |
| Boss creation | `game_update.js` | `function createBoss()` |

---

## ⚡ Powerup Features

| Feature | File | Search For |
|---------|------|------------|
| Powerup drop chance | `game_core.js` | `boxDropChance` |
| Powerup activation | `game_merchant_powerups.js` | `function activatePowerup(id)` |
| Magnetic shots | `game_update.js` | `magneticProjectileActive` |
| Explosive bullets | `game_update.js` | `explosiveBulletsActive` |
| Ice projectiles | `game_update.js` | `iceProjectileActive` |
| V-shape shots | `game_update.js` | `vShapeProjectileLevel` |
| Auto-aim | `game_update.js` | `autoAimActive` |
| Doppelganger | `game_update.js` | `doppelgangerActive` |
| Dog companion | `game_update.js` | `dogCompanionActive` |
| Lightning strike | `game_update.js` | `lightningStrikeActive` |
| Flamethrower | `game_update.js` | `flamethrowerActive` |
| Laser cannon | `game_update.js` | `laserCannonActive` |

---

## 💰 Economy & Progression

| Feature | File | Search For |
|---------|------|------------|
| XP required to level up | `game_core.js` | `player.xpToNextLevel` |
| XP from coins | `game_core.js` | `COIN_XP_VALUE` |
| XP from diamonds | `game_core.js` | `DIAMOND_XP_VALUE` |
| Level up menu | `game_update.js` | `function levelUp()` |
| Upgrade options | `game_bootstrap_ui.js` | `UPGRADE_OPTIONS` |
| Permanent upgrades | `game_bootstrap_ui.js` | `PERMANENT_UPGRADES` |
| Shop currency | `persistence_upgrades.js` | `playerData.currency` |
| Save/load system | `persistence_upgrades.js` | `function savePlayerData()` |

---

## 🏪 Merchant System

| Feature | File | Search For |
|---------|------|------------|
| Merchant spawn interval | `game_core.js` | `MERCHANT_SPAWN_INTERVAL` |
| Merchant spawn logic | `game_update.js` | `function spawnMerchant()` |
| Merchant shop UI | `game_merchant_powerups.js` | `function showMerchantShop()` |
| Merchant offerings | `game_merchant_powerups.js` | `const allOptions` |
| Apple trades | `game_merchant_powerups.js` | `'xp_for_apples'` |
| Coin trades | `game_merchant_powerups.js` | `'xp_for_coins'` |

---

## 🏆 Achievements & Cheats

| Feature | File | Search For |
|---------|------|------------|
| All achievements | `achievements.js` | `const ACHIEVEMENTS` |
| All cheats | `achievements.js` | `const CHEATS` |
| Achievement checking | `achievements.js` | `function checkAchievements()` |
| Unlock achievement | `achievements.js` | `function unlockAchievement(id)` |
| Trophy → cheat mapping | `achievements.js` | `TROPHY_UNLOCKS_CHEAT` |
| Player stats tracking | `achievements.js` | `playerStats` |
| Run stats tracking | `achievements.js` | `runStats` |
| Achievement banner | `achievements.js` | `function showAchievementBanner()` |

---

## 🎨 Visual Effects

| Feature | File | Search For |
|---------|------|------------|
| Blood splatters | `game_update.js` | `function createBloodSplatter()` |
| Explosions | `game_render.js` | `explosions.forEach` |
| Smoke particles | `game_render.js` | `smokeParticles.forEach` |
| Screen shake | `game_render.js` | `isPlayerHitShaking` |
| Camera follow | `game_render.js` | `cameraOffsetX` |
| Zoom level | `game_core.js` | `cameraZoom` |
| Floating damage text | `game_update.js` | `floatingTexts.push` |
| Menu dust particles | `menu_effects.js` | `function makeParticle()` |
| Enemy flyby | `menu_effects.js` | `function spawnFlyby()` |

---

## 🔊 Audio System

| Feature | File | Search For |
|---------|------|------------|
| All sound files | `asset_loader.js` | `const audioPaths` |
| Play sound effect | `game_core.js` | `function playSound()` |
| Play UI sound | `game_core.js` | `function playUISound()` |
| Background music | `game_core.js` | `function startMainMenuBGM()` |
| Music volume | `game_bootstrap_ui.js` | `musicVolumeSlider` |
| Effects volume | `game_bootstrap_ui.js` | `effectsVolumeSlider` |

---

## 🗺️ Map & World

| Feature | File | Search For |
|---------|------|------------|
| World size | `game_core.js` | `WORLD_WIDTH` |
| Background images | `asset_loader.js` | `const backgroundPaths` |
| Map selection | `persistence_upgrades.js` | `function showMapSelectScreen()` |
| Unlockable maps | `persistence_upgrades.js` | `mapUnlockRequirements` |
| Destructible barrels | `persistence_upgrades.js` | `function handleBarrelDestruction()` |
| Destructible bricks | `persistence_upgrades.js` | `function handleBrickDestruction()` |

---

## 🎮 Controls & Input

| Feature | File | Search For |
|---------|------|------------|
| Keyboard input | `game_core.js` | `const keys = {}` |
| Mouse input | `game_core.js` | `let aimDx, aimDy` |
| Gamepad support | `game_core.js` | `function handleGamepadInput()` |
| Mobile joysticks | `game_core.js` | `const joystickRadius` |
| Dash input | `game_core.js` | `keys['Shift']` |
| Pause input | `game_core.js` | `keys['Escape']` |

---

## 🎭 Character System

| Feature | File | Search For |
|---------|------|------------|
| Character definitions | `game_core.js` | `const CHARACTERS` |
| Cowboy (default) | `game_render.js` | `playerSprite` |
| Skeleton character | `skull_character_plugin.js` | entire file |
| Lumberjack character | `lumberjack_character_plugin.js` | entire file |
| Knight character | `knight_character_plugin.js` | entire file |
| Character selection | `game_bootstrap_ui.js` | `function showCharacterSelectScreen()` |
| Equipped character | `game_core.js` | `equippedCharacterID` |

---

## 🔧 Performance Optimizations

| Feature | File | Search For |
|---------|------|------------|
| Object pooling | `game_core.js` | `const weaponPool` |
| Quadtree system | `game_core.js` | `class Quadtree` |
| Emoji pre-rendering | `asset_loader.js` | `function preRenderEmoji()` |
| Viewport culling | `game_render.js` | `const inView` |
| Frame throttling | `game_update.js` | `update._frame` |

---

## 🎯 Game States & Screens

| Feature | File | Search For |
|---------|------|------------|
| Loading screen | `index.html` | `id="loadingScreen"` |
| Start screen | `index.html` | `id="startScreen"` |
| Splash screen | `index.html` | `id="splashScreen"` |
| Difficulty select | `index.html` | `id="difficultyContainer"` |
| Map select | `index.html` | `id="mapSelectContainer"` |
| Character select | `index.html` | `id="characterSelectContainer"` |
| Game canvas | `index.html` | `id="gameCanvas"` |
| Level up menu | `index.html` | `id="upgradeMenu"` |
| Merchant shop | `index.html` | `id="merchantShop"` |
| Pause menu | `index.html` | `id="pauseOverlay"` |
| Game over screen | `index.html` | `id="gameOverlay"` |
| Upgrade shop | `index.html` | `id="upgradeShop"` |
| Achievements | `index.html` | `id="achievementsModal"` |
| Cheats menu | `index.html` | `id="cheatsModal"` |
| Game guide | `index.html` | `id="gameGuideModal"` |

---

## 🔢 Important Constants

| Constant | File | Purpose |
|----------|------|---------|
| `WORLD_WIDTH` | `game_core.js` | Width of game world in pixels |
| `WORLD_HEIGHT` | `game_core.js` | Height of game world in pixels |
| `BOX_SIZE` | `game_core.js` | Size of powerup boxes |
| `BASE_BOX_DROP_CHANCE` | `game_core.js` | Chance for enemy to drop powerup |
| `APPLE_ITEM_SIZE` | `game_core.js` | Size of apple pickups |
| `COIN_SIZE` | `game_core.js` | Size of coin pickups |
| `MAGNET_STRENGTH` | `game_core.js` | How fast pickups fly to player |
| `CAMERA_PULL_STRENGTH` | `game_core.js` | How much camera follows aim |
| `BOB_AMPLITUDE` | `game_core.js` | How much player bobs up/down |

---

## 🎨 UI Elements

| Element | File | Purpose |
|---------|------|---------|
| Health display | `index.html` | `id="playerLivesIcon"` |
| XP bar | `index.html` | `id="xpBar"` |
| Level display | `index.html` | `id="currentLevel"` |
| Score display | `index.html` | `id="currentScore"` |
| Coin counter | `index.html` | `id="coinCounter"` |
| Apple counter | `index.html` | `id="appleCounter"` |
| Powerup icons | `index.html` | `id="powerupIcons"` |
| Upgrade stats | `index.html` | `id="upgradeStats"` |

---

## 🐛 Common Variables to Check When Debugging

### **Game Not Starting?**
- `assetsLoadedCount` in `asset_loader.js` - Should equal `totalAssets`
- `gameActive` in `game_core.js` - Should be `true` during gameplay
- `gameOver` in `game_core.js` - Should be `false` during gameplay

### **Enemies Not Spawning?**
- `enemies.length` in `game_core.js` - Current enemy count
- `enemySpawnCap` in `game_update.js` - Maximum allowed enemies
- `lastEnemySpawnTime` in `game_core.js` - Last spawn timestamp

### **Powerup Not Working?**
- `[powerupName]Active` in `game_core.js` - Should be `true` when active
- Check `activatePowerup()` in `game_merchant_powerups.js`
- Check update logic in `game_update.js`

### **Performance Issues?**
- `enemies.length` - Too many enemies?
- `weaponPool` - Are bullets being reused?
- `bloodSplatters.length` - Too many particles?
- `smokeParticles.length` - Too many particles?

---

## 📝 Quick Tips

### **To Change Game Difficulty:**
Look for these in `game_update.js`:
- `enemySpawnInterval` - How fast enemies spawn
- `baseEnemySpeed` - How fast enemies move
- `BASE_ZOMBIE_HEALTH` - Enemy health values

### **To Add More Powerups:**
1. Add flag variable in `game_core.js`: `let myPowerupActive = false;`
2. Add activation in `game_merchant_powerups.js`: `activatePowerup()`
3. Add update logic in `game_update.js`: `if (myPowerupActive) { ... }`
4. Add to powerup pool in `game_merchant_powerups.js`

### **To Modify Player Stats:**
All in `game_core.js`:
- `player.speed` - Movement speed
- `player.damageMultiplier` - Damage dealt
- `player.lives` - Current health
- `player.maxLives` - Maximum health
- `player.magnetRadius` - Pickup collection range

### **To Change Visual Effects:**
All in `game_render.js`:
- Blood color: Search for `'red'`
- Explosion color: Search for `'rgba(255, 165, 0'`
- Screen shake: Search for `MAX_PLAYER_HIT_SHAKE_OFFSET`
- Camera zoom: Search for `cameraZoom`

---

## 🚀 Most Commonly Modified Values

| What You Want to Change | Where to Find It |
|--------------------------|------------------|
| Player starting health | `game_core.js` → `player.lives` |
| Player movement speed | `game_core.js` → `player.speed` |
| Enemy spawn rate | `game_update.js` → `enemySpawnInterval` |
| Powerup drop chance | `game_core.js` → `boxDropChance` |
| Dash cooldown | `game_core.js` → `player.dashCooldown` |
| XP needed to level up | `game_core.js` → `player.xpToNextLevel` |
| Boss spawn frequency | `game_core.js` → `BOSS_SPAWN_INTERVAL_LEVELS` |
| Merchant spawn time | `game_core.js` → `MERCHANT_SPAWN_INTERVAL` |
| World size | `game_core.js` → `WORLD_WIDTH` and `WORLD_HEIGHT` |
| Bullet damage | `game_core.js` → `player.damageMultiplier` |

---

This quick reference should help you find anything in your code quickly! 🎯
