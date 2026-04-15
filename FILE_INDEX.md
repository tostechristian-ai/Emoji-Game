# 📁 Complete File Index - Emoji Survivor

Quick navigation to every major code section across all files.

---

## 📂 File Organization

```
Emoji-Game/
├── index.html              # UI containers (menus, game canvas)
├── style.css               # All visual styling
├── README.md               # Game overview
├── FILE_INDEX.md         # ← This file
├── js/
│   ├── asset_loader.js     # Asset loading & emoji pre-rendering
│   ├── game_core.js        # All game variables & constants
│   ├── game_update.js      # Game logic (60fps)
│   ├── game_render.js      # Drawing (60fps)
│   ├── game_bootstrap_ui.js # UI wiring & config tables
│   ├── game_merchant_powerups.js # Merchant & powerup activation
│   ├── persistence_upgrades.js   # Save system & permanent upgrades
│   ├── achievements.js     # Trophy & cheat system
│   ├── menu_effects.js       # Menu polish
│   └── *_character_plugin.js # Character-specific code
```

---

## 🔍 Quick Reference by Feature

| Feature | File | Search For |
|---------|------|------------|
| **Player Movement** | `game_update.js` | `keys['ArrowUp']` or `if (player.isDashing)` |
| **Player Combat** | `game_update.js` | `createWeapon(player, angle)` |
| **Enemy AI** | `game_update.js` | `switch (enemyBehaviorType)` |
| **Enemy Spawning** | `game_update.js` | `createEnemy()` or `createBoss()` |
| **Bullet Collision** | `game_update.js` | `weaponPool.forEach` collision section |
| **Powerup Activation** | `game_merchant_powerups.js` | `activatePowerup(id)` |
| **Powerup Updates** | `game_update.js` | Various `if (xxxActive)` blocks |
| **Drawing Player** | `game_render.js` | `ctx.drawImage(playerSprite` |
| **Drawing Enemies** | `game_render.js` | `enemies.forEach` render section |
| **UI Overlay** | `game_render.js` | `ctx.fillText` for XP bar, hearts |
| **Save/Load** | `persistence_upgrades.js` | `savePlayerData()` / `loadPlayerData()` |

---

## 📄 Detailed File Breakdowns

### **js/game_core.js** - Game Data & Constants

#### Major Variable Sections:

| Lines | Section | Key Variables |
|-------|---------|---------------|
| 1-50 | Game State | `gameActive`, `gamePaused`, `gameOver` |
| 51-100 | Input State | `keys`, `aimDx`, `aimDy`, `joystick` |
| 151-200 | Player Object | `player.x`, `player.y`, `player.speed`, `player.lives`, `player.xp`, `player.level` |
| 251-350 | Enemy Configs | `ENEMY_CONFIGS` - stats for all enemy types |
| 351-500 | Game Arrays | `enemies[]`, `weaponPool[]`, `pickupItems[]`, `explosions[]`, `bloodSplatters[]`, `smokeBombClouds[]` |
| 501-800 | Powerup Flags | All `xxxActive` booleans (magneticProjectileActive, explosiveBulletsActive, etc.) |
| 801-900 | Timing Constants | All `INTERVAL` and `DURATION` constants |
| 901-1000 | World Constants | `WORLD_WIDTH`, `WORLD_HEIGHT`, `BOX_SIZE`, `BASE_BOX_DROP_CHANCE` |
| 1001-2000 | Core Functions | `createWeapon()`, `levelUp()`, `updateUIStats()`, `endGame()`, `createEnemy()`, `createBoss()` |
| 2001-2200 | Quadtree Class | `class Quadtree` - spatial partitioning for collision |
| 2201-2500 | Character Configs | `CHARACTERS` - all playable characters |
| 3200-3250 | Game Reset | Variable reset section in `startGame()` |

**Newest Additions:**
- Line ~714: `smokeBombActive`, `lastSmokeBombTime`, `smokeBombEffectEndTime`, `smokeBombClouds[]`
- Line ~3240: Smoke bomb reset in game start

---

### **js/game_update.js** - Game Logic

#### Major Sections:

| Lines | Section | Description |
|-------|---------|-------------|
| 1-100 | `update()` | Main entry - calls all subsystems |
| 101-400 | Player Movement | Keyboard/mouse input, dash mechanics, camera follow |
| 401-900 | Player Combat | Bullet firing, special weapons (V-shape, dual gun, shotgun, etc.) |
| 901-1100 | Dash Mechanics | Dash activation, dodge nova, invincibility |
| 1101-1800 | Enemy AI | `switch(enemyBehaviorType)` - unique AI for each enemy |
| 1801-2500 | Bullet-Enemy Collisions | Damage application, knockback, effects (freeze, ignite, explode) |
| 2501-3400 | Powerup Updates | All periodic powerup logic (bomb emitter, orbiter, flamethrower, etc.) |
| 3301-3360 | **Smoke Bomb** | Trigger logic, invulnerability, cloud creation |
| 3401-3600 | Item Collection | XP/coin magnet, pickup collection, apple max health |
| 3601-3800 | Companion Updates | Dog, cat, owl, doppelganger, flying turret behavior |
| 3801-4000 | Spawning Systems | Enemy, boss, merchant, barrel, brick spawning |

**Enemy AI Types (in switch statement):**
- `bat` - Pause/move cycle
- `skull` - Approach/flee cycle
- `devil` - Axis swapping
- `demon` - Follow/random alternation
- `ghost` - Phase in/out
- `eye` - Distance keeping + projectiles
- `vampire` - Bullet dodging
- `mosquito` - Erratic + puddles
- `spider` - Jumping + webs
- `snail` - Random direction changes
- `invader` - Zig-zag
- `genie` - Medium distance strafing
- `charger` - Approach → Aim → Charge cycle
- `vortex` - Spin + gravity pull
- `pulsing_eye` - Expanding damage ring
- `scorpion` - Side-to-side strafing
- `default` (zombie) - Simple pursuit

---

### **js/game_render.js** - Drawing System

#### Major Sections:

| Lines | Section | Description |
|-------|---------|-------------|
| 1-100 | `draw()` | Main render - background, camera transform |
| 101-200 | Background | Map background, optional grid |
| 201-250 | Destructibles | Barrels, bricks |
| 251-350 | Flame/Puddle Areas | Fire circles, slowing puddles |
| **196-214** | **Smoke Bomb Clouds** | Gray circles with dark cores |
| 351-450 | Blood/Effects | Blood splatters, explosions, smoke particles |
| 451-650 | Enemies | Enemy rendering, shadows, special effects (Vortex AOE, Charger arrow, Pulsing Eye ring) |
| **651-900** | **Player** | Player sprite, gun, dash bar, **smoke bomb transparency** |
| 901-1200 | Powerup Visuals | Damaging circle, orbiter, books, whirlwind axe, laser cross |
| 1201-1400 | Companions | Dog, cat, owl, doppelganger, turret rendering |
| 1401-1600 | Bullets | Regular bullets, lightning, flames, dynamite, bombs, boomerang, chain lightning |
| 1601-1700 | Floating Text | Damage numbers, notifications |
| 1701-1800 | UI Overlay | XP bar, hearts, level, score, coins, apples, powerup icons, game time |

---

### **js/game_merchant_powerups.js** - Merchant & Powerups

| Lines | Section | Key Functions |
|-------|---------|---------------|
| 1-200 | Merchant Shop | `showMerchantShop()`, trade options, buy powerups |
| 201-600 | Powerup Activation | `activatePowerup(id)` - handles ALL 30+ powerups |
| ~580 | Smoke Bomb | Activation case: sets `smokeBombActive = true` |

**Powerup Categories in activatePowerup():**
- Weapon Modifiers: v_shape, magnetic, ice, ricochet, explosive, flaming, bone_shot
- Passive Effects: puddle_trail, sword, laser_pointer, auto_aim, dual_gun, dual_revolvers
- Active Abilities: bomb, orbiter, damaging_circle, lightning, flamethrower, laser_cannon, shotgun, ice_cannon, dynamite, pistol, **smoke_bomb**
- Companions: dog, cat, doppelganger, owl, whirlwind_axe, bug_swarm, lightning_strike, robot_drone, auto_turret, flying_turret
- Special: spear, boomerang, chain_lightning, rocket_launcher, pea_shooter, vengeance_nova, dodge_nova, anti_gravity, black_hole, time_freeze, dash_invincibility, temporal_ward, levitating_books

---

### **js/game_bootstrap_ui.js** - UI & Startup

| Lines | Section | Description |
|-------|---------|-------------|
| 1-50 | Game Loop | `gameLoop()` - calls update(), draw(), 60fps |
| 51-200 | Config Tables | `PERMANENT_UPGRADES`, `ALWAYS_AVAILABLE_PICKUPS`, `UNLOCKABLE_PICKUPS`, `UPGRADE_OPTIONS` |
| ~96 | Smoke Bomb | Entry in `ALWAYS_AVAILABLE_PICKUPS` |
| 201-350 | Event Listeners | All button click handlers |
| 351-450 | Gamepad Support | Controller input handling |

---

### **js/persistence_upgrades.js** - Save System

| Lines | Section | Key Functions |
|-------|---------|---------------|
| 1-50 | Player Data | `playerData` structure (currency, upgrades, unlocks) |
| 51-150 | Save/Load | `savePlayerData()`, `loadPlayerData()`, `resetPlayerData()` |
| 151-350 | Upgrade Shop | `showUpgradeShop()`, `purchaseUpgrade()` |
| 351-450 | Character Select | `showCharacterSelectScreen()`, `equipCharacter()`, `unlockCharacter()` |
| 451-550 | Map Selection | `showMapSelectScreen()`, map unlock logic |
| 551-650 | Destructibles | `spawnBarrel()`, `spawnBrick()`, destruction handlers |

---

### **js/achievements.js** - Trophies & Cheats

| Lines | Section | Description |
|-------|---------|-------------|
| 1-150 | Achievement Definitions | `ACHIEVEMENTS` - 30+ achievements with conditions |
| 151-250 | Stats Tracking | `playerStats` (lifetime), `runStats` (current run) |
| 251-350 | Achievement Checking | `checkAchievements()`, `unlockAchievement()`, `showAchievementBanner()` |
| 351-500 | Cheat System | `CHEATS` - 20+ cheats, `TROPHY_UNLOCKS_CHEAT` mapping |
| 501-600 | Cheats UI | `showCheatsModal()`, `toggleCheat()` |

---

### **Character Plugin Files** - Special Characters

| File | Character | Unique Features |
|------|-----------|-----------------|
| `skull_character_plugin.js` | Skeleton 💀 | Bone shots, 6-bone dash nova |
| `lumberjack_character_plugin.js` | Lumberjack 🧑‍🚒 | Axe throws, 8-axe dash nova, axes return |
| `knight_character_plugin.js` | Knight 🤺 | Auto-sword attacks, sprite flips |
| `farmer_character_plugin.js` | Farmer 🧑‍🌾 | Permanent shotgun, different gun sprite |
| `snowman_character_plugin.js` | Snowman ⛄ | Permanent ice, snowflake bullets, sprite flips |
| `alien_character_plugin.js` | Alien 👽 | Slime damages enemies, no gun, sprite flips |
| `jackolantern_character_plugin.js` | Jack O Lantern 🎃 | Starts with dynamite, pumpkin projectiles |

---

## 🔧 Common Tasks Reference

### **Add a New Enemy:**
1. `game_core.js`: Add to `ENEMY_CONFIGS` (~line 1766)
2. `game_core.js`: Add reset variables (~line 3230)
3. `game_update.js`: Add AI case in switch statement (~line 1101+)
4. `game_render.js`: Add special rendering if needed (~line 451+)
5. `asset_loader.js`: Add pre-render (~line 66+)

### **Add a New Powerup:**
1. `game_core.js`: Add `xxxActive` flag (~line 501+)
2. `game_core.js`: Add timing constants if needed
3. `game_core.js`: Add reset (~line 3230)
4. `game_bootstrap_ui.js`: Add to `ALWAYS_AVAILABLE_PICKUPS` or `UNLOCKABLE_PICKUPS`
5. `game_merchant_powerups.js`: Add case in `activatePowerup()` (~line 366+)
6. `game_update.js`: Add update logic (~line 2501+)
7. `game_render.js`: Add visual if needed (~line 901+)

### **Change Game Balance:**
- Player speed: `game_core.js` → `player.speed` (default 1.4)
- Enemy health: `game_core.js` → `ENEMY_CONFIGS` → `baseHealth`
- Enemy speed: `game_core.js` → `ENEMY_CONFIGS` → `speedMultiplier`
- Spawn rate: `game_update.js` → `enemySpawnInterval`
- XP needed: `game_core.js` → `player.xpToNextLevel`
- Boss frequency: `game_core.js` → `BOSS_SPAWN_INTERVAL_LEVELS`

### **Debug Common Issues:**
- **Game won't start**: Check `assetsLoadedCount` in console
- **Enemies not spawning**: Check `enemySpawnCap`, `currentEnemySpawnInterval`
- **Powerup not working**: Check if `activatePowerup()` is called, if flag is set
- **Performance lag**: Check `enemies.length`, `bloodSplatters.length`, `smokeParticles.length`

---

## 🎮 Console Commands (F12)

```javascript
// Give coins
playerData.currency += 1000;

// Level up instantly
player.xp = player.xpToNextLevel;

// Spawn boss
createBoss();

// Enable god mode
cheats.god_mode = true;

// Check active enemies
console.log(enemies.length);

// Check player position
console.log(player.x, player.y);

// List all powerups
console.log(Object.keys(ALWAYS_AVAILABLE_PICKUPS));
```

---

**Last Updated:** After smoke bomb powerup implementation
**Total Files:** 17 JavaScript files + HTML/CSS/Assets
**Total Lines:** ~15,000+ lines of code

Happy coding! 🎮
