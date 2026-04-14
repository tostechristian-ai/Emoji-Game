🤠 Emoji Survivor - Official Game Guide
📖 The Story
Emoji Land is under siege! Dark forces have corrupted the peaceful emoji inhabitants, turning them into hostile creatures bent on destruction.
As the legendary Cowboy Hero, you must defend Emoji Land from endless waves of corrupted emojis.
Defeat enemies, collect power-ups, and grow stronger with each battle. Only by mastering your abilities can you push back the darkness!
Seek out the mysterious 🧙‍♂️ Wandering Merchant who appears to aid brave heroes with powerful items and knowledge.
Every 11 levels, a massive Boss emerges — defeat it to prove your worth and continue your quest!
Your Goal: Survive as long as possible, level up your character, unlock new abilities, and become the ultimate defender of Emoji Land!
👥 2-Player Co-op Mode
Double the Firepower: You don't have to fight the corruption alone! You can summon a second player to join the battle at any time.
How to Join: Simply press the Insert key on your keyboard to spawn Player 2.
The Cost of Bravery: Spawning a second player costs 1 life from your total pool, so use this backup wisely when things get intense!
🎮 Controls
WASD / Arrow Keys — Move your character.
Mouse — Aim & control fire direction.
Left Click — Dash (or fire if Click-to-Fire cheat is on).
P / Escape — Pause game.
Insert — Spawn Player 2 (costs 1 life).
Mobile — Left stick: move · Right stick: aim · Double-tap right stick: dash.
Gamepad — Left stick: move · Right stick: aim · RT: dash · Start/B: pause.
⚔️ How to Play
Survive endless waves of corrupted emoji enemies that grow stronger over time.
Shoot enemies to earn XP — fill your XP bar to level up and choose powerful stat upgrades.
Collect boxes dropped by enemies to unlock random power-ups that enhance your abilities.
Gather 🍎 apples — collect 5 to gain +1 max heart and fully heal yourself.
Find the 🧙‍♂️ Merchant who appears randomly to sell power-ups, XP, and healing for coins or apples.
Destroy 🛢️ barrels to trigger massive fire explosions that damage nearby enemies.
Break 🧱 bricks for strategic positioning and to clear paths.
Enemies scale — they get faster, tougher, and more numerous as you level up.
Boss battles — every 11 levels, a giant boss version of a random enemy spawns. Defeat it for glory!
Earn coins during runs to spend in the Permanent Upgrades shop between games.
📈 Level-Up Upgrades
Enhance your hero with these essential stat boosts as you level up:

🏃 Fast Runner: +8% movement speed (essential for survival).
🔫 Rapid Fire: +8% fire rate (more bullets = more damage).
🧲 Magnet Field: +8% pickup radius (collect items from farther away).
💥 Increased Damage: +15% bullet damage (highest damage boost!).
💨 Swift Shots: +8% projectile speed (bullets travel faster).
💪 Power Shot: +8% knockback (push enemies away).
🍀 Lucky Charm: +0.5% drop rate (more boxes and apples).
🎯 Giant's Might: +10% bullet & AOE size (makes all attacks larger).
⚡ Swift Dodge: -8% dash cooldown (dash more frequently).
💡 Pro Tips & Strategies
Master the Dash: Your dash is your lifeline! Use it to escape tight situations, dodge projectiles, and reposition quickly. Time it wisely — it has a cooldown!
Upgrade Wisely: Early game, prioritize movement speed and fire rate. Late game, focus on damage and survivability. Adapt to your playstyle!
Kite Enemies: Keep moving in circles while shooting. Never let enemies surround you!
Synergize Power-Ups: Combine Auto-Aim + Magnetic Shots for homing bullets. Pair Explosive Bullets + V-Shape Shots for massive area damage!
Merchant Strategy: Save coins for power-ups early, but buy XP if you're close to leveling up before a boss fight.
Boss Preparation: Try to level up right before levels 11, 22, 33, etc. to face bosses with fresh upgrades.
Dash Invincibility: If unlocked via the shop, use your dash offensively to phase through enemy projectiles and crowds.
## Emoji Survivor (project notes)

### Folder layout
- `index.html`: Entry point. Loads scripts in the required order.
- `style.css`: All styling.
- `js/`: Game JavaScript (kept as separate files, loaded by `index.html`).
- `sprites/`: Images.
- `audio/`: Sound + music.

### Scripts (high-level)
- `js/asset_loader.js`: Loads sprites/audio references and shows the loading screen.
- `js/game_core.js`: Core game setup + shared systems (spawning, weapons pool, level-up flow, etc.).
- `js/achievements.js`: Achievements + cheats definitions, save/load, banner + UI rendering.
- `js/persistence_upgrades.js`: Permanent upgrades, unlockables, and persistence (`localStorage`).
- `js/game_merchant_powerups.js`: Merchant shop UI + `activatePowerup()` logic.
- `js/game_update.js`: The big `update()` loop and gameplay simulation.
- `js/game_render.js`: The big `draw()` function (rendering only).
- `js/game_bootstrap_ui.js`: Startup (`window.onload`), UI button wiring, and config tables.
- `js/skull_character_plugin.js`: Skull character plugin/patches (special rendering + dash nova).

### Suggested next cleanups (optional)
- Split `js/game_loop_ui.js` into smaller files over time:
  - `js/game_loop.js` (update/draw)
  - `js/ui_menus.js` (menu/DOM wiring)
  - `js/combat.js` (weapons + collisions)

