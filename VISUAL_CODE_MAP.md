# 🗺️ Visual Code Map - Emoji Survivor

This visual guide shows you exactly where different parts of your game are located.

---

## 📂 File Organization

```
emoji-survivor/
│
├── index.html              ← Main game page (all UI elements)
├── style.css               ← All visual styling
├── README.md               ← Game overview
│
├── 📚 Documentation/
│   ├── CODE_GUIDE.md           ← Complete code walkthrough
│   ├── QUICK_REFERENCE.md      ← Fast lookup guide
│   ├── DOCUMENTATION_INDEX.md  ← Documentation navigation
│   └── VISUAL_CODE_MAP.md      ← This file!
│
├── 🎵 audio/               ← Sound effects & music
│   ├── fire_shot.mp3
│   ├── enemy_death.mp3
│   ├── level_up.mp3
│   └── ... (15 audio files)
│
├── 🎨 sprites/             ← Images & graphics
│   ├── playerup.png
│   ├── gun.png
│   ├── bullet.png
│   ├── Background1.png
│   └── ... (40+ image files)
│
└── 💻 js/                  ← All game code
    ├── asset_loader.js              ← Loads images/sounds
    ├── game_core.js                 ← Main game variables
    ├── game_update.js               ← Game logic (AI, collisions)
    ├── game_render.js               ← Drawing graphics
    ├── game_bootstrap_ui.js         ← UI connections & startup
    ├── achievements.js              ← Trophy system
    ├── persistence_upgrades.js      ← Shop & save system
    ├── game_merchant_powerups.js    ← Merchant & powerups
    ├── menu_effects.js              ← Menu visual effects
    ├── skull_character_plugin.js    ← Skeleton character
    ├── lumberjack_character_plugin.js ← Lumberjack character
    └── knight_character_plugin.js   ← Knight character
```

---

## 🎮 Game Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         GAME STARTUP                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  index.html      │
                    │  loads           │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ asset_loader.js  │
                    │ • Load images    │
                    │ • Load sounds    │
                    │ • Pre-render     │
                    │   emojis         │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Show "Tap to     │
                    │ Start" button    │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN MENU                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Player selects:  │
                    │ • Difficulty     │
                    │ • Map (optional) │
                    │ • Character      │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GAME INITIALIZATION                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ game_core.js     │
                    │ • Reset player   │
                    │ • Clear enemies  │
                    │ • Load upgrades  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ game_bootstrap   │
                    │ _ui.js           │
                    │ • Start game     │
                    │   loop           │
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GAME LOOP (60 FPS)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │ game_update.js   │        │ game_render.js   │
    │                  │        │                  │
    │ • Move player    │        │ • Draw map       │
    │ • Move enemies   │        │ • Draw enemies   │
    │ • Fire bullets   │        │ • Draw player    │
    │ • Check          │        │ • Draw bullets   │
    │   collisions     │        │ • Draw effects   │
    │ • Spawn enemies  │        │ • Draw UI        │
    │ • Update         │        │                  │
    │   powerups       │        │                  │
    └──────────────────┘        └──────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                    ┌──────────────────┐
                    │ Repeat forever   │
                    │ (until game over)│
                    └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         GAME OVER                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ • Save stats     │
                    │ • Show score     │
                    │ • Award coins    │
                    │ • Check          │
                    │   achievements   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Back to main     │
                    │ menu             │
                    └──────────────────┘
```

---

## 🧩 Code Responsibility Map

### **Who Does What?**

```
┌─────────────────────────────────────────────────────────────────┐
│                    asset_loader.js                              │
│  "The Loader" - Gets everything ready before game starts        │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Load all images (sprites, backgrounds)                        │
│ ✓ Load all sounds (effects, music)                              │
│ ✓ Pre-render emojis to canvases                                 │
│ ✓ Show loading progress                                         │
│ ✓ Hide loading screen when done                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     game_core.js                                │
│  "The Database" - Stores all game data and constants            │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Player object (position, health, stats)                       │
│ ✓ Enemy arrays and constants                                    │
│ ✓ Powerup flags and timers                                      │
│ ✓ World size and camera settings                                │
│ ✓ Input handling (keyboard, mouse, gamepad)                     │
│ ✓ Quadtree collision system                                     │
│ ✓ Weapon object pool                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    game_update.js                               │
│  "The Brain" - All game logic and AI                            │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Player movement and controls                                  │
│ ✓ Enemy AI (each type has unique behavior)                      │
│ ✓ Bullet firing and movement                                    │
│ ✓ Collision detection (bullets vs enemies, etc.)                │
│ ✓ Spawning (enemies, pickups, merchants)                        │
│ ✓ Powerup effects (doppelganger, dog, lightning, etc.)          │
│ ✓ Level up system                                               │
│ ✓ Game over detection                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    game_render.js                               │
│  "The Artist" - Draws everything to the screen                  │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Camera system (follow player, screen shake)                   │
│ ✓ Draw background map                                           │
│ ✓ Draw enemies (with effects like frozen, burning)              │
│ ✓ Draw player (with animation and facing direction)             │
│ ✓ Draw bullets and projectiles                                  │
│ ✓ Draw visual effects (explosions, blood, smoke)                │
│ ✓ Draw UI (health, XP bar, powerup icons)                       │
│ ✓ Viewport culling (don't draw off-screen objects)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 game_bootstrap_ui.js                            │
│  "The Connector" - Links buttons to functions                   │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Start game loop                                               │
│ ✓ Connect all button click events                               │
│ ✓ Handle menu navigation                                        │
│ ✓ Gamepad menu navigation                                       │
│ ✓ Configuration tables (upgrades, powerups)                     │
│ ✓ Character selection screen                                    │
│ ✓ Fullscreen toggle                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   achievements.js                               │
│  "The Tracker" - Records accomplishments                        │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Define all 30+ achievements                                   │
│ ✓ Track lifetime stats (total kills, coins, etc.)               │
│ ✓ Track run stats (kills this game, time survived, etc.)        │
│ ✓ Check achievement conditions                                  │
│ ✓ Unlock achievements and show banners                          │
│ ✓ Define all cheats                                             │
│ ✓ Map achievements to cheats                                    │
│ ✓ Save/load achievement progress                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                persistence_upgrades.js                          │
│  "The Bank" - Manages money and permanent upgrades              │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Save/load player data (coins, upgrades)                       │
│ ✓ Permanent upgrade shop                                        │
│ ✓ Buy upgrades (damage, speed, luck, etc.)                      │
│ ✓ Unlock powerups for purchase                                  │
│ ✓ Map selection system                                          │
│ ✓ Destructible objects (barrels, bricks)                        │
│ ✓ Reset all progress                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              game_merchant_powerups.js                          │
│  "The Shopkeeper" - Merchant and powerup activation             │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Show merchant shop UI                                         │
│ ✓ Generate random merchant offerings                            │
│ ✓ Handle purchases (apples, coins)                              │
│ ✓ Activate powerups (all 30+ types)                             │
│ ✓ Track powerup collection for achievements                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   menu_effects.js                               │
│  "The Decorator" - Makes menus look pretty                      │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Floating dust particles on menus                              │
│ ✓ Mouse cursor particle trail                                   │
│ ✓ Enemy flyby animations                                        │
│ ✓ Smooth menu transitions                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Character Plugin Files                             │
│  "The Heroes" - Special playable characters                     │
├─────────────────────────────────────────────────────────────────┤
│ skull_character_plugin.js                                       │
│   ✓ Skeleton character                                          │
│   ✓ Shoots spinning bones                                       │
│   ✓ Dash creates bone nova                                      │
│                                                                  │
│ lumberjack_character_plugin.js                                  │
│   ✓ Lumberjack character                                        │
│   ✓ Throws spinning axes                                        │
│   ✓ Dash creates axe nova                                       │
│                                                                  │
│ knight_character_plugin.js                                      │
│   ✓ Knight character                                            │
│   ✓ Unique sword combat                                         │
│   ✓ Special abilities                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Examples

### **Example 1: Player Shoots a Bullet**

```
1. game_update.js
   ↓
   Player presses mouse button
   ↓
   createWeapon() function called
   ↓
   Find inactive bullet in weaponPool
   ↓
   Set bullet position, angle, speed
   ↓
   Mark bullet as active

2. game_update.js (every frame)
   ↓
   Update bullet position
   ↓
   Check collision with enemies
   ↓
   If hit: damage enemy, mark bullet inactive

3. game_render.js (every frame)
   ↓
   Loop through weaponPool
   ↓
   Draw active bullets
   ↓
   Skip inactive bullets
```

### **Example 2: Enemy Spawns and Attacks**

```
1. game_update.js
   ↓
   Check if spawn timer expired
   ↓
   createEnemy() function called
   ↓
   Choose random enemy type
   ↓
   Set enemy stats (size, health, speed)
   ↓
   Add to enemies array

2. game_update.js (every frame)
   ↓
   Loop through enemies array
   ↓
   Calculate direction to player
   ↓
   Move enemy toward player
   ↓
   Check collision with player
   ↓
   If hit: damage player, screen shake

3. game_render.js (every frame)
   ↓
   Loop through enemies array
   ↓
   Draw each enemy
   ↓
   Apply visual effects (frozen, burning)
```

### **Example 3: Player Levels Up**

```
1. game_update.js
   ↓
   Player collects XP gem
   ↓
   player.xp increases
   ↓
   Check if xp >= xpToNextLevel
   ↓
   levelUp() function called

2. game_update.js
   ↓
   Pause game
   ↓
   Show upgrade menu
   ↓
   Generate 3 random upgrades

3. game_bootstrap_ui.js
   ↓
   Player clicks upgrade
   ↓
   Apply stat boost
   ↓
   Close menu
   ↓
   Resume game
```

### **Example 4: Achievement Unlocked**

```
1. game_update.js
   ↓
   Player kills 100th enemy
   ↓
   runStats.killsThisRun = 100

2. achievements.js
   ↓
   checkAchievements() called (every second)
   ↓
   Check if killsThisRun >= 100
   ↓
   unlockAchievement('hunter') called

3. achievements.js
   ↓
   Mark achievement as unlocked
   ↓
   Add to banner queue
   ↓
   showAchievementBanner()
   ↓
   Display banner with animation
   ↓
   Save progress to localStorage
```

---

## 🎯 Where to Find Common Features

### **Player Features**

```
┌─────────────────────────────────────────────────────────────────┐
│ Feature              │ File              │ Search For           │
├──────────────────────┼───────────────────┼──────────────────────┤
│ Movement             │ game_update.js    │ if (keys['ArrowUp']  │
│ Shooting             │ game_update.js    │ createWeapon()       │
│ Dashing              │ game_update.js    │ player.isDashing     │
│ Health               │ game_core.js      │ player.lives         │
│ Stats                │ game_core.js      │ const player = {     │
│ Drawing              │ game_render.js    │ playerSprite         │
└─────────────────────────────────────────────────────────────────┘
```

### **Enemy Features**

```
┌─────────────────────────────────────────────────────────────────┐
│ Feature              │ File              │ Search For           │
├──────────────────────┼───────────────────┼──────────────────────┤
│ Spawning             │ game_update.js    │ createEnemy()        │
│ AI Behavior          │ game_update.js    │ enemies.forEach      │
│ Stats                │ game_core.js      │ BASE_ZOMBIE_HEALTH   │
│ Drawing              │ game_render.js    │ enemies.forEach      │
│ Boss Creation        │ game_update.js    │ createBoss()         │
└─────────────────────────────────────────────────────────────────┘
```

### **Powerup Features**

```
┌─────────────────────────────────────────────────────────────────┐
│ Feature              │ File                      │ Search For   │
├──────────────────────┼───────────────────────────┼──────────────┤
│ Activation           │ game_merchant_powerups.js │ activatePowerup() │
│ Update Logic         │ game_update.js            │ [powerup]Active │
│ Drop Chance          │ game_core.js              │ boxDropChance │
│ Merchant Shop        │ game_merchant_powerups.js │ showMerchantShop() │
└─────────────────────────────────────────────────────────────────┘
```

### **UI Features**

```
┌─────────────────────────────────────────────────────────────────┐
│ Feature              │ File                  │ Search For       │
├──────────────────────┼───────────────────────┼──────────────────┤
│ Button Clicks        │ game_bootstrap_ui.js  │ addEventListener │
│ Menu Navigation      │ game_bootstrap_ui.js  │ handleGamepadInput() │
│ Health Display       │ index.html            │ playerLivesIcon  │
│ XP Bar               │ index.html            │ xpBar            │
│ Powerup Icons        │ index.html            │ powerupIcons     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧭 Navigation Tips

### **Finding a Specific Feature**

1. **Check QUICK_REFERENCE.md** first - It has a lookup table
2. **Use your editor's search** (Ctrl+F or Cmd+F)
3. **Follow the data flow** - Start where it begins, follow to where it ends

### **Understanding a System**

1. **Read CODE_GUIDE.md** for the big picture
2. **Open the relevant file**
3. **Read the section header comments**
4. **Read the function comments**
5. **Read the inline comments**

### **Making Changes**

1. **Find the feature** using QUICK_REFERENCE.md
2. **Read the surrounding code** to understand context
3. **Make a small change**
4. **Test it**
5. **Iterate**

---

## 📊 Code Statistics

```
Total Lines of Code: ~15,000+

Breakdown by File:
├── game_update.js         ~3,500 lines  (Game logic)
├── game_render.js         ~1,500 lines  (Drawing)
├── game_core.js           ~2,000 lines  (Data & systems)
├── game_bootstrap_ui.js   ~1,000 lines  (UI connections)
├── achievements.js        ~500 lines    (Trophies)
├── persistence_upgrades.js ~800 lines   (Shop & save)
├── game_merchant_powerups.js ~600 lines (Merchant)
├── asset_loader.js        ~200 lines    (Loading)
├── menu_effects.js        ~300 lines    (Menu polish)
└── Character plugins      ~600 lines    (Special characters)

Total Game Objects:
├── 30+ Achievements
├── 30+ Cheats
├── 11 Enemy Types
├── 30+ Powerups
├── 4 Playable Characters
├── 12 Maps
├── 9 Upgrade Types
└── 500 Bullet Pool Size
```

---

## 🎓 Learning Roadmap

```
Week 1: Basics
├── Read CODE_GUIDE.md
├── Understand game loop
├── Find player movement code
└── Change player speed

Week 2: Features
├── Understand enemy AI
├── Understand powerup system
├── Add a simple powerup
└── Modify enemy behavior

Week 3: Systems
├── Understand object pooling
├── Understand quadtree
├── Understand pre-rendering
└── Optimize something

Week 4: Advanced
├── Add new enemy type
├── Add new character
├── Add new achievement
└── Create custom feature
```

---

This visual map should help you navigate the codebase more easily! 🗺️✨
