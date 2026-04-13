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

