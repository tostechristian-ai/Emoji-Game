# 🎮 Emoji Survivor - Code Structure Guide

This document explains how your game code is organized and what each file does.

---

## 📁 File Structure Overview

### **HTML & CSS**
- **`index.html`** - Main game page with all UI elements (menus, overlays, game canvas)
- **`style.css`** - All visual styling for menus, buttons, animations, and game UI

### **JavaScript Files** (in `/js` folder)

#### **Core Game Files**
1. **`asset_loader.js`** - Loads all images, sounds, and backgrounds before game starts
2. **`game_core.js`** - Main game variables, player data, enemy data, and core systems
3. **`game_update.js`** - Game logic that runs every frame (movement, collisions, AI)
4. **`game_render.js`** - Drawing everything to the screen (player, enemies, effects)
5. **`game_bootstrap_ui.js`** - Connects buttons to functions, starts the game loop

#### **Feature Files**
6. **`achievements.js`** - Trophy system and unlockable cheats
7. **`persistence_upgrades.js`** - Permanent upgrades shop and save/load system
8. **`game_merchant_powerups.js`** - Merchant shop and powerup activation
9. **`menu_effects.js`** - Visual effects on menus (dust particles, enemy flyby)

#### **Character Plugin Files**
10. **`skull_character_plugin.js`** - Skeleton character with bone attacks
11. **`lumberjack_character_plugin.js`** - Lumberjack character with axe throws
12. **`knight_character_plugin.js`** - Knight character with unique abilities

---

## 🎯 How the Game Works (High-Level Flow)

### **1. Game Startup**
```
index.html loads → asset_loader.js runs → Loads all images/sounds
→ Shows "Tap to Start" button → Player clicks → Shows main menu
```

### **2. Starting a Game**
```
Player selects difficulty → (Optional: Select map) → game_bootstrap_ui.js calls startGame()
→ Initializes player, enemies, powerups → Starts game loop
```

### **3. Game Loop** (runs 60 times per second)
```
game_update.js: Update game logic
  ├─ Move player based on keyboard/mouse input
  ├─ Move enemies toward player
  ├─ Check bullet collisions with enemies
  ├─ Spawn new enemies
  ├─ Update powerup effects
  └─ Check for level up / game over

game_render.js: Draw everything
  ├─ Draw background map
  ├─ Draw enemies
  ├─ Draw player
  ├─ Draw bullets and effects
  └─ Draw UI (health, score, XP bar)
```

### **4. Game Over**
```
Player dies → Save stats → Show game over screen
→ Player clicks "Restart" → Back to main menu
```

---

## 🗂️ Detailed File Breakdown

### **`asset_loader.js`** - Asset Loading System
**Purpose:** Load all game resources before gameplay starts

**Key Sections:**
- **Pre-rendering System** - Converts emojis to images for faster drawing
- **Sprite Loading** - Loads PNG images (player, gun, bullets, etc.)
- **Audio Loading** - Loads sound effects and music using Tone.js
- **Background Loading** - Loads map background images

**Important Functions:**
- `preRenderEmoji(emoji, size)` - Converts an emoji to a canvas image
- `loadSprite(name, path)` - Loads a single image file
- `loadAudio(name, path)` - Loads a single sound file
- `assetLoaded()` - Tracks loading progress, shows start button when done

---

### **`game_core.js`** - Core Game Data & Systems
**Purpose:** Defines all game variables, constants, and core systems

**Key Sections:**

#### **Player Object**
```javascript
const player = {
    x, y,              // Position on map
    size,              // Size in pixels
    speed,             // Movement speed
    lives,             // Current health
    xp, level,         // Experience and level
    damageMultiplier,  // Damage boost
    // ... many more properties
}
```

#### **Game Arrays** (store active game objects)
- `enemies[]` - All active enemies
- `weaponPool[]` - Bullet object pool (reused for performance)
- `pickupItems[]` - XP gems and powerup boxes
- `explosions[]` - Visual explosion effects
- `bloodSplatters[]` - Blood particle effects
- `merchants[]` - Active merchant NPCs

#### **Constants** (game balance numbers)
- Enemy sizes, speeds, health values
- Powerup intervals and durations
- World size, spawn rates, etc.

#### **Quadtree System** (performance optimization)
- Spatial partitioning for fast collision detection
- Divides the game world into regions
- Only checks collisions between nearby objects

---

### **`game_update.js`** - Game Logic (The Brain)
**Purpose:** Updates all game state every frame

**Key Sections:**

#### **1. Player Movement**
- Reads keyboard (WASD/arrows) and mouse input
- Applies movement speed and dash mechanics
- Keeps player within world bounds
- Handles collision with obstacles

#### **2. Player Combat**
- Auto-fires bullets toward mouse cursor
- Handles special weapons (V-shape, dual gun, etc.)
- Manages dash cooldown and invincibility

#### **3. Enemy AI**
- Each enemy type has unique behavior:
  - **Zombie** - Walks straight toward player
  - **Bat** - Pauses then dashes
  - **Ghost** - Phases in/out of visibility
  - **Eye** - Keeps distance and shoots projectiles
  - **Vampire** - Dodges incoming bullets
- Enemies slow down in puddles
- Frozen enemies can't move

#### **4. Collision Detection**
- **Bullets vs Enemies** - Damage and kill enemies
- **Player vs Enemies** - Player takes damage
- **Player vs Pickups** - Collect XP, coins, powerups
- **Bullets vs Obstacles** - Destroy barrels and bricks

#### **5. Powerup Systems**
- **Doppelganger** - Spawns a clone that fights with you
- **Dog Companion** - Follows player and attacks enemies
- **Lightning Strike** - Random enemy gets struck
- **Flamethrower** - Emits flames that ignite enemies
- **Ice Shard Cannon** - Fires freezing projectiles
- ... and many more!

#### **6. Spawning**
- Spawns enemies at intervals (faster as you level up)
- Spawns bosses every 11 levels
- Spawns merchant every 3 minutes
- Spawns barrels and bricks periodically

---

### **`game_render.js`** - Drawing System (The Eyes)
**Purpose:** Draws everything visible on screen

**Key Sections:**

#### **1. Camera System**
- Follows the player around the large world
- Adds slight offset based on aim direction
- Applies screen shake when player is hit
- Supports zoom in/out

#### **2. Culling** (performance optimization)
- Only draws objects visible on screen
- Skips objects outside camera view
- Saves processing power

#### **3. Drawing Order** (back to front)
```
Background map
↓
Destructible objects (barrels, bricks)
↓
Flame areas and puddles
↓
Blood splatters
↓
Enemies
↓
Explosions and effects
↓
Bullets and projectiles
↓
Player
↓
UI elements (health, XP bar)
```

#### **4. Visual Effects**
- **Smoke particles** - Trail behind dashing player
- **Blood splatters** - Spray when enemies are hit
- **Explosions** - Expanding circles with fade
- **Lightning strikes** - Flash effects
- **Frozen enemies** - Blue tint overlay
- **Boss health bars** - Show above boss enemies

---

### **`game_bootstrap_ui.js`** - UI Connections & Startup
**Purpose:** Connects HTML buttons to JavaScript functions

**Key Sections:**

#### **1. Game Loop Setup**
```javascript
function gameLoop() {
    update();              // Update game logic
    handleGamepadInput();  // Check gamepad
    draw();                // Draw to screen
    updateUIStats();       // Update UI text
    requestAnimationFrame(gameLoop); // Repeat
}
```

#### **2. Button Event Listeners**
- Difficulty buttons → Start game
- Upgrade shop button → Open shop
- Pause button → Pause game
- Character select → Choose character
- How to Play → Show guide

#### **3. Configuration Tables**
- **PERMANENT_UPGRADES** - Shop upgrades (damage, speed, etc.)
- **UNLOCKABLE_PICKUPS** - Powerups you can buy
- **ALWAYS_AVAILABLE_PICKUPS** - Powerups that drop naturally

#### **4. Gamepad Support**
- Detects connected controllers
- Handles button presses and stick movement
- Navigates menus with gamepad

---

### **`achievements.js`** - Trophy & Cheat System
**Purpose:** Track player accomplishments and unlock cheats

**Key Sections:**

#### **1. Achievement Definitions**
```javascript
ACHIEVEMENTS = {
    'first_blood': { name: "First Blood", desc: "Kill 1 enemy", icon: '🔫' },
    'slayer': { name: "Slayer", desc: "Kill 1,000 enemies", icon: '🔫' },
    // ... 30+ achievements
}
```

#### **2. Statistics Tracking**
- **playerStats** - Lifetime stats (total kills, coins, etc.)
- **runStats** - Current game stats (kills this run, time survived, etc.)

#### **3. Achievement Checking**
- Runs every second during gameplay
- Checks if conditions are met (e.g., "survived 5 minutes")
- Unlocks achievement and shows banner

#### **4. Cheat System**
- Each achievement unlocks a cheat
- Cheats modify gameplay (god mode, horde mode, etc.)
- Saved to localStorage

---

### **`persistence_upgrades.js`** - Save System & Shop
**Purpose:** Permanent upgrades and progress saving

**Key Sections:**

#### **1. Save/Load System**
```javascript
playerData = {
    currency: 0,           // Coins for shop
    upgrades: {},          // Permanent upgrade levels
    unlockedPickups: {}    // Which powerups are unlocked
}
```
- Saves to browser localStorage
- Persists between game sessions

#### **2. Permanent Upgrades Shop**
- Spend coins earned during runs
- Upgrades persist forever:
  - Weapon Power - More damage
  - Movement Speed - Move faster
  - XP Gain - Level up faster
  - Luck - Better drop rates

#### **3. Unlockable Powerups**
- Buy new powerups to add to drop pool:
  - Dog Companion
  - Black Hole
  - Temporal Ward
  - Night Owl

#### **4. Map Selection**
- Unlock new maps to play on
- Each map has different visuals

#### **5. Destructible Objects**
- **Barrels** - Explode when destroyed, damage nearby enemies
- **Bricks** - Block movement, can be destroyed

---

### **`game_merchant_powerups.js`** - Merchant & Powerup Activation
**Purpose:** Merchant shop and powerup activation logic

**Key Sections:**

#### **1. Merchant Shop**
- Appears randomly during gameplay
- Offers 3 random items:
  - Trade apples for XP or healing
  - Buy XP or healing with coins
  - Buy specific powerups with coins
  - Temporary fire rate boost

#### **2. Powerup Activation**
```javascript
function activatePowerup(id) {
    if (id === 'magnetic_projectile') {
        magneticProjectileActive = true;
        // Bullets now home toward enemies
    }
    // ... handles all 30+ powerups
}
```

#### **3. Powerup Types**
- **Weapon Modifiers** - Change how bullets work
  - Magnetic Shots - Bullets home toward enemies
  - Explosive Bullets - Bullets explode on impact
  - Ice Projectiles - Bullets freeze enemies
  - V-Shape Shots - Fire multiple bullets in a spread

- **Passive Effects** - Always active
  - Puddle Trail - Leave slowing puddles
  - Laser Pointer - Show aiming line
  - Auto-Aim - Automatically target nearest enemy

- **Active Abilities** - Trigger periodically
  - Lightning Strike - Strike random enemy every 7s
  - Black Hole - Pull enemies to a point every 10s
  - Anti-Gravity - Push enemies away every 5s

- **Companions** - AI helpers
  - Dog Companion - Chases and attacks enemies
  - Night Owl - Snipes enemies from above
  - Doppelganger - Clone that fights with you

---

### **`menu_effects.js`** - Menu Visual Effects
**Purpose:** Add visual polish to menus

**Key Features:**
- **Dust Particles** - Floating particles on menu screens
- **Mouse Trail** - Particles follow cursor on menus
- **Enemy Flyby** - Random enemies fly across main menu
- **Animations** - Smooth transitions between screens

---

### **Character Plugin Files**
Each character has unique abilities defined in their plugin file:

#### **`skull_character_plugin.js`** - Skeleton Character
- Shoots spinning bones instead of bullets
- Dash creates a 6-bone nova explosion
- Unlocked by earning "Slayer" trophy

#### **`lumberjack_character_plugin.js`** - Lumberjack Character
- Throws spinning axes (no gun)
- Dash creates an 8-axe nova explosion
- Purchased in upgrade shop for 500 coins

#### **`knight_character_plugin.js`** - Knight Character
- Unique sword-based combat
- Special abilities and playstyle
- Unlocked via achievements

---

## 🎮 Key Game Systems Explained

### **Object Pooling** (Performance Optimization)
Instead of creating/destroying bullets constantly:
```javascript
// Create 500 bullet objects at start
const weaponPool = [];
for (let i = 0; i < 500; i++) {
    weaponPool.push({ active: false });
}

// When firing, reuse an inactive bullet
function fireBullet() {
    for (const weapon of weaponPool) {
        if (!weapon.active) {
            weapon.active = true;
            weapon.x = player.x;
            weapon.y = player.y;
            // ... set other properties
            break; // Found one, stop looking
        }
    }
}
```

### **Quadtree** (Collision Optimization)
Divides the world into regions to avoid checking every object against every other object:
```
Without Quadtree: 100 enemies × 100 bullets = 10,000 checks per frame
With Quadtree: Only check objects in same region = ~500 checks per frame
```

### **Pre-rendering** (Drawing Optimization)
Emojis are slow to draw as text. Pre-render them once as images:
```javascript
// Slow (every frame):
ctx.fillText('🧟', x, y);

// Fast (draw once, reuse):
const zombieImage = preRenderEmoji('🧟', 20);
ctx.drawImage(zombieImage, x, y); // Much faster!
```

---

## 🔧 Common Modifications

### **Adding a New Enemy Type**
1. Define constants in `game_core.js`:
```javascript
const NEW_ENEMY_EMOJI = '👾';
const NEW_ENEMY_SIZE = 25;
const NEW_ENEMY_HEALTH = 3;
const NEW_ENEMY_SPEED_MULTIPLIER = 1.2;
```

2. Add to spawn function in `game_update.js`:
```javascript
function createEnemy() {
    // ... existing code
    if (player.level >= 15 && Math.random() < 0.2) {
        emoji = NEW_ENEMY_EMOJI;
        size = NEW_ENEMY_SIZE;
        health = NEW_ENEMY_HEALTH;
        speed = baseEnemySpeed * NEW_ENEMY_SPEED_MULTIPLIER;
    }
}
```

3. Add AI behavior in `game_update.js`:
```javascript
enemies.forEach(enemy => {
    if (enemy.emoji === NEW_ENEMY_EMOJI) {
        // Custom movement logic here
    }
});
```

4. Pre-render in `asset_loader.js`:
```javascript
function initializePreRenders() {
    // ... existing code
    preRenderEmoji(NEW_ENEMY_EMOJI, NEW_ENEMY_SIZE);
}
```

### **Adding a New Powerup**
1. Add activation logic in `game_merchant_powerups.js`:
```javascript
function activatePowerup(id) {
    // ... existing code
    else if (id === 'my_new_powerup') {
        myNewPowerupActive = true;
        // Set up powerup state
    }
}
```

2. Add update logic in `game_update.js`:
```javascript
if (myNewPowerupActive) {
    // Run powerup effect every frame
}
```

3. Add to powerup pool in `game_merchant_powerups.js`:
```javascript
const powerupPool = [
    // ... existing powerups
    { id: 'my_new_powerup', name: 'My Powerup', icon: '✨', active: myNewPowerupActive }
];
```

### **Adding a New Achievement**
1. Define in `achievements.js`:
```javascript
ACHIEVEMENTS = {
    // ... existing achievements
    'my_achievement': {
        name: "My Achievement",
        desc: "Do something cool",
        icon: '🏆',
        unlocked: false
    }
}
```

2. Add check logic in `achievements.js`:
```javascript
function checkAchievements() {
    // ... existing checks
    if (someCondition) {
        unlockAchievement('my_achievement');
    }
}
```

3. (Optional) Link to a cheat:
```javascript
const TROPHY_UNLOCKS_CHEAT = {
    // ... existing mappings
    'my_achievement': 'my_cheat_id'
};
```

---

## 🐛 Debugging Tips

### **Check Browser Console**
Press F12 to open developer tools and see error messages

### **Common Issues**

**Game won't start:**
- Check console for asset loading errors
- Make sure all image/audio files exist

**Enemies not spawning:**
- Check `enemySpawnCap` in `game_update.js`
- Check `currentEnemySpawnInterval` calculation

**Powerup not working:**
- Check if `activatePowerup()` is called
- Check if update logic exists in `game_update.js`
- Check if flag variable is defined in `game_core.js`

**Performance issues:**
- Check enemy count (too many?)
- Check particle count (blood, smoke, etc.)
- Check if culling is working (objects off-screen should not draw)

---

## 📚 Additional Resources

### **Technologies Used**
- **HTML5 Canvas** - For drawing graphics
- **Tone.js** - For audio playback
- **localStorage** - For saving progress
- **Gamepad API** - For controller support

### **Useful Console Commands** (type in browser console)
```javascript
// Give yourself coins
playerData.currency += 1000;

// Unlock all achievements
for (const id in ACHIEVEMENTS) {
    ACHIEVEMENTS[id].unlocked = true;
}

// Enable god mode
cheats.god_mode = true;

// Spawn a boss
createBoss();

// Level up instantly
player.xp = player.xpToNextLevel;
```

---

## 🎯 Summary

Your game is organized into clear sections:
- **Loading** (`asset_loader.js`) - Get resources ready
- **Core** (`game_core.js`) - Define game data
- **Update** (`game_update.js`) - Game logic
- **Render** (`game_render.js`) - Draw graphics
- **UI** (`game_bootstrap_ui.js`) - Connect buttons
- **Features** (other files) - Achievements, shop, merchant, etc.

The game loop runs 60 times per second:
1. Update player position
2. Update enemy positions
3. Check collisions
4. Spawn new objects
5. Draw everything
6. Repeat!

Everything is commented to help you understand what each part does. Happy coding! 🚀
