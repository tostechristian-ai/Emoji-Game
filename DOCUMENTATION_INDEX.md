# 📚 Emoji Survivor - Documentation Index

Welcome! This is your complete guide to understanding the Emoji Survivor codebase.

---

## 📖 Documentation Files

### **1. FILE_INDEX.md** - Complete Section-by-Section Index ⭐ NEW!
**Best for:** Finding specific code blocks and understanding what every section does

**Contents:**
- Line-by-line breakdown of every major section in every file
- What each variable, function, and code block does
- Quick reference tables for common tasks
- Console commands for debugging
- Where to add new enemies, powerups, features

**Start here if:** You want to find exactly where specific code is and understand what it does.

---

### **2. CODE_GUIDE.md** - Architecture Overview
**Best for:** Understanding how the entire game works

**Contents:**
- File structure overview
- How the game loop works
- Detailed explanation of each JavaScript file
- Key game systems (object pooling, quadtree, pre-rendering)
- How to add new enemies, powerups, and achievements
- Debugging tips and console commands

**Start here if:** You want to understand the big picture of how everything fits together.

---

### **2. QUICK_REFERENCE.md** - Fast Lookup Guide
**Best for:** Finding specific features quickly

**Contents:**
- Where to find player features
- Where to find enemy features
- Where to find powerup features
- Where to find economy & progression
- Where to find visual effects
- Where to find audio system
- Common variables to check when debugging
- Most commonly modified values

**Start here if:** You know what you want to change and just need to find where it is.

---

### **3. README.md** - Game Overview
**Best for:** Understanding what the game is about

**Contents:**
- Game description
- How to play
- Features list
- Installation instructions

**Start here if:** You're new to the project and want to know what the game does.

---

## 🗂️ Code Files with Comments

All JavaScript files now have detailed comments explaining what each section does:

### **Core Game Files**
- ✅ **`js/asset_loader.js`** - Fully commented (asset loading, pre-rendering)
- ✅ **`js/achievements.js`** - Fully commented (trophy system, statistics)
- ⚠️ **`js/game_core.js`** - Partially commented (needs more detail)
- ⚠️ **`js/game_update.js`** - Partially commented (needs more detail)
- ⚠️ **`js/game_render.js`** - Partially commented (needs more detail)
- ⚠️ **`js/game_bootstrap_ui.js`** - Partially commented (needs more detail)

### **Feature Files**
- ⚠️ **`js/persistence_upgrades.js`** - Partially commented
- ⚠️ **`js/game_merchant_powerups.js`** - Partially commented
- ⚠️ **`js/menu_effects.js`** - Partially commented

### **Character Files**
- ⚠️ **`js/skull_character_plugin.js`** - Needs comments
- ⚠️ **`js/lumberjack_character_plugin.js`** - Needs comments
- ⚠️ **`js/knight_character_plugin.js`** - Needs comments

---

## 🎯 How to Use This Documentation

### **Scenario 1: "I want to understand how the game works"**
1. Read **CODE_GUIDE.md** from top to bottom
2. Open the code files and follow along
3. Use **QUICK_REFERENCE.md** when you need to find something specific

### **Scenario 2: "I want to change something specific"**
1. Open **QUICK_REFERENCE.md**
2. Find the feature you want to change
3. Go to the file and line mentioned
4. Read the comments around that code

### **Scenario 3: "I want to add a new feature"**
1. Read the relevant section in **CODE_GUIDE.md**:
   - "Adding a New Enemy Type"
   - "Adding a New Powerup"
   - "Adding a New Achievement"
2. Follow the step-by-step instructions
3. Use **QUICK_REFERENCE.md** to find similar existing code

### **Scenario 4: "Something is broken and I need to debug"**
1. Check the "Debugging Tips" section in **CODE_GUIDE.md**
2. Check "Common Variables to Check When Debugging" in **QUICK_REFERENCE.md**
3. Open browser console (F12) and look for error messages
4. Use the console commands listed in **CODE_GUIDE.md**

---

## 🔍 Understanding the Code Structure

### **The Big Picture**
```
┌─────────────────────────────────────────────────────────┐
│                    index.html                           │
│  (The main page with all UI elements)                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  asset_loader.js                        │
│  (Loads all images, sounds, backgrounds)                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   game_core.js                          │
│  (Defines all game variables and constants)             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              game_bootstrap_ui.js                       │
│  (Connects buttons to functions, starts game loop)      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────┴─────────────────┐
        ▼                                    ▼
┌──────────────────┐              ┌──────────────────┐
│ game_update.js   │◄────────────►│ game_render.js   │
│ (Game logic)     │   60 FPS     │ (Draw graphics)  │
└──────────────────┘              └──────────────────┘
        │                                    │
        ▼                                    ▼
┌─────────────────────────────────────────────────────────┐
│              Feature Files                              │
│  • achievements.js (trophies & cheats)                  │
│  • persistence_upgrades.js (shop & save system)         │
│  • game_merchant_powerups.js (merchant & powerups)      │
│  • menu_effects.js (visual polish)                      │
│  • Character plugins (special characters)               │
└─────────────────────────────────────────────────────────┘
```

### **The Game Loop** (runs 60 times per second)
```
┌──────────────────────────────────────────────────────┐
│  1. game_update.js: Update game logic                │
│     • Move player                                    │
│     • Move enemies                                   │
│     • Check collisions                               │
│     • Spawn new objects                              │
│     • Update powerup effects                         │
└──────────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  2. game_render.js: Draw everything                  │
│     • Draw background                                │
│     • Draw enemies                                   │
│     • Draw player                                    │
│     • Draw bullets & effects                         │
│     • Draw UI                                        │
└──────────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  3. Repeat (requestAnimationFrame)                   │
└──────────────────────────────────────────────────────┘
```

---

## 📝 Code Comment Legend

Throughout the code, you'll see different types of comments:

### **Section Headers**
```javascript
// ═══════════════════════════════════════════════════════════════════════════
// MAJOR SECTION NAME
// ═══════════════════════════════════════════════════════════════════════════
```
These mark major sections of code (like "Player Movement" or "Enemy AI")

### **Subsection Headers**
```javascript
// ─── Subsection Name ────────────────────────────────────────────────────
```
These mark smaller sections within a major section

### **Function Descriptions**
```javascript
// Brief description of what this function does
// @param paramName - What this parameter is for
// @returns What the function returns
function myFunction(paramName) {
    // ...
}
```

### **Inline Comments**
```javascript
const speed = 5; // How fast the player moves
```
These explain what a specific line does

### **Block Comments**
```javascript
// This is a longer explanation of what the next
// few lines of code do and why they're necessary
```

---

## 🎓 Learning Path

### **Beginner** (New to the codebase)
1. Read **README.md** to understand what the game is
2. Read "How the Game Works" in **CODE_GUIDE.md**
3. Open `game_core.js` and read the player object definition
4. Open `game_update.js` and find the player movement code
5. Try changing `player.speed` and see what happens

### **Intermediate** (Comfortable with basics)
1. Read "Detailed File Breakdown" in **CODE_GUIDE.md**
2. Pick a feature you want to understand (e.g., powerups)
3. Use **QUICK_REFERENCE.md** to find all related code
4. Read through that code with the comments
5. Try adding a simple new powerup

### **Advanced** (Ready to add major features)
1. Read "Key Game Systems Explained" in **CODE_GUIDE.md**
2. Understand object pooling, quadtree, and pre-rendering
3. Study how existing complex features work (e.g., doppelganger)
4. Try adding a new enemy type with unique AI
5. Try adding a new character with special abilities

---

## 🔧 Common Tasks

### **Task: Change Player Speed**
1. Open **QUICK_REFERENCE.md**
2. Search for "Player movement speed"
3. Go to `game_core.js` → `player.speed`
4. Change the value (default is 1.4)

### **Task: Add More Enemies**
1. Open **CODE_GUIDE.md**
2. Go to "Adding a New Enemy Type"
3. Follow the 4-step process
4. Test your new enemy

### **Task: Make Game Easier/Harder**
1. Open **QUICK_REFERENCE.md**
2. Go to "Most Commonly Modified Values"
3. Adjust values like:
   - `player.lives` (more health = easier)
   - `enemySpawnInterval` (slower spawns = easier)
   - `boxDropChance` (more powerups = easier)

### **Task: Debug a Problem**
1. Press F12 to open browser console
2. Look for red error messages
3. Check **CODE_GUIDE.md** → "Debugging Tips"
4. Check **QUICK_REFERENCE.md** → "Common Variables to Check"
5. Use console commands to test things

---

## 💡 Tips for Reading the Code

### **1. Start with the Comments**
Read the section headers first to understand what each part does, then dive into the details.

### **2. Follow the Data Flow**
Pick a feature (like "shooting bullets") and follow it through:
- Where is the bullet created? (`game_update.js`)
- Where is it updated? (`game_update.js`)
- Where is it drawn? (`game_render.js`)
- Where is it removed? (`game_update.js`)

### **3. Use Browser DevTools**
- Set breakpoints to pause code execution
- Inspect variables to see their values
- Step through code line by line

### **4. Make Small Changes**
Don't try to understand everything at once. Change one small thing, see what happens, then move on.

### **5. Use the Console**
Type variable names in the console to see their current values:
```javascript
player.x        // Player's X position
enemies.length  // Number of enemies
gameActive      // Is game running?
```

---

## 🚀 Next Steps

Now that you have all this documentation:

1. **Read CODE_GUIDE.md** to understand the overall structure
2. **Keep QUICK_REFERENCE.md** open while coding for fast lookups
3. **Experiment!** Change values, add features, break things and fix them
4. **Use the browser console** to test ideas quickly
5. **Read the comments** in the code files as you explore

Remember: The best way to learn is by doing. Start small, make changes, and see what happens!

---

## 📞 Documentation Summary

| File | Purpose | When to Use |
|------|---------|-------------|
| **FILE_INDEX.md** | Section-by-section index | Finding specific code blocks |
| **CODE_GUIDE.md** | Architecture overview | Learning how everything works |
| **QUICK_REFERENCE.md** | Fast lookup table | Finding specific features |
| **README.md** | Game overview | Understanding what the game is |
| **DOCUMENTATION_INDEX.md** | This file | Navigating the documentation |

---

Happy coding! 🎮✨
