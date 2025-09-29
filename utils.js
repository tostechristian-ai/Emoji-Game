// ================================================================================= //
// ============================= UTILS.JS ========================================== //
// ================================================================================= //

// --- GLOBAL CONSTANTS ---
const joystickRadius = 51;
const WORLD_WIDTH = 1125 * 1.5;
const WORLD_HEIGHT = 845 * 1.5;

const CAMERA_PULL_STRENGTH = 35;
const CAMERA_LERP_FACTOR = 0.05;
const PLAYER_HIT_SHAKE_DURATION = 300;
const MAX_PLAYER_HIT_SHAKE_OFFSET = 5;
const BOB_AMPLITUDE = 2.5;

const COIN_SIZE = 10;
const COIN_EMOJI = '🔸';
const COIN_XP_VALUE = 1;
const DIAMOND_SIZE = 12;
const DIAMOND_EMOJI = '🔹';
const DIAMOND_XP_VALUE = 2;
const RING_SYMBOL_SIZE = 11;
const RING_SYMBOL_EMOJI = '💍';
const RING_SYMBOL_XP_VALUE = 3;
const DEMON_XP_EMOJI = '♦️';
const DEMON_XP_VALUE = 4;

const ORBIT_POWER_UP_SIZE = 20;
const ORBIT_RADIUS = 35;
const ORBIT_SPEED = 0.05;
const DAMAGING_CIRCLE_SPIN_SPEED = 0.03;
const DAMAGING_CIRCLE_RADIUS = 70;
const DAMAGING_CIRCLE_DAMAGE_INTERVAL = 2000;
const LIGHTNING_EMOJI = '⚡️';
const LIGHTNING_SIZE = 10;
const LIGHTNING_SPAWN_INTERVAL = 3000;
const V_SHAPE_INCREMENT_ANGLE = Math.PI / 18;
const SWORD_SWING_INTERVAL = 2000;
const SWORD_SWING_DURATION = 200;
const EYE_PROJECTILE_LIFETIME = 4000;
const EYE_PROJECTILE_INTERVAL = 2000;
const PLAYER_PUDDLE_SPAWN_INTERVAL = 80;
const PLAYER_PUDDLE_LIFETIME = 3000;
const PLAYER_PUDDLE_SLOW_FACTOR = 0.5;
const MOSQUITO_PUDDLE_SPAWN_INTERVAL = 500;
const MOSQUITO_PUDDLE_LIFETIME = 2000;
const MOSQUITO_PUDDLE_SLOW_FACTOR = 0.5;
const MERCHANT_SPAWN_INTERVAL = 140000;
const BUG_SWARM_INTERVAL = 9000;
const BUG_SWARM_COUNT = 6;
const FLY_DAMAGE = 0.34;
const FLY_SPEED = 3.5;
const FLY_SIZE = 8;
const OWL_FIRE_INTERVAL = 1500;
const OWL_PROJECTILE_SPEED = 6;
const OWL_PROJECTILE_SIZE = 15;
const OWL_FOLLOW_DISTANCE = 60;
const WHIRLWIND_AXE_RADIUS = ORBIT_RADIUS * 2;
const WHIRLWIND_AXE_SPEED = 0.04;
const WHIRLWIND_AXE_SIZE = 30;
const LIGHTNING_STRIKE_INTERVAL = 7000;
const LIGHTNING_STRIKE_DAMAGE = 1;
const APPLE_ITEM_SIZE = 15;
const APPLE_LIFETIME = 5000;
const MAGNET_STRENGTH = 0.5;
const BOX_SIZE = 25;
const BOMB_SIZE = 14;
const BOMB_LIFETIME_MS = 8000;
const BOMB_INTERVAL_MS = 5000;
const ANTI_GRAVITY_INTERVAL = 5000;
const ANTI_GRAVITY_RADIUS = 200;
const ANTI_GRAVITY_STRENGTH = 60;
const BLACK_HOLE_INTERVAL = 10000;
const BLACK_HOLE_PULL_DURATION = 3000;
const BLACK_HOLE_DELAY = 3000;
const BLACK_HOLE_RADIUS = 167;
const BLACK_HOLE_PULL_STRENGTH = 2.5;
const DOG_HOMING_SHOT_INTERVAL = 3000;
const DOPPELGANGER_SPAWN_INTERVAL = 14000;
const DOPPELGANGER_DURATION = 8000;
const DOPPELGANGER_FIRE_INTERVAL = 500;
const FIRE_RATE_BOOST_DURATION = 3000;
const GAMEPAD_DEADZONE = 0.2;
const GAMEPAD_INPUT_DELAY = 200; // milliseconds
const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const BOSS_SPAWN_INTERVAL_LEVELS = 11;

// --- OPTIMIZATION: QUADTREE IMPLEMENTATION ---
class Quadtree {
    constructor(bounds, maxObjects = 10, maxLevels = 4, level = 0) {
        this.bounds = bounds;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
    }

    clear() {
        this.objects = [];
        if (this.nodes.length) {
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i].clear();
            }
        }
        this.nodes = [];
    }

    split() {
        const nextLevel = this.level + 1;
        const subWidth = this.bounds.width / 2;
        const subHeight = this.bounds.height / 2;
        const x = this.bounds.x;
        const y = this.bounds.y;

        this.nodes[0] = new Quadtree({ x: x + subWidth, y: y, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
        this.nodes[1] = new Quadtree({ x: x, y: y, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
        this.nodes[2] = new Quadtree({ x: x, y: y + subHeight, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
        this.nodes[3] = new Quadtree({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, this.maxObjects, this.maxLevels, nextLevel);
    }

    getIndex(pRect) {
        let index = -1;
        const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
        const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

        const topQuadrant = (pRect.y < horizontalMidpoint && pRect.y + pRect.height < horizontalMidpoint);
        const bottomQuadrant = (pRect.y > horizontalMidpoint);

        if (pRect.x < verticalMidpoint && pRect.x + pRect.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;
            } else if (bottomQuadrant) {
                index = 2;
            }
        } else if (pRect.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;
            } else if (bottomQuadrant) {
                index = 3;
            }
        }
        return index;
    }

    insert(pRect) {
        if (this.nodes.length) {
            const index = this.getIndex(pRect);
            if (index !== -1) {
                this.nodes[index].insert(pRect);
                return;
            }
        }

        this.objects.push(pRect);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (!this.nodes.length) {
                this.split();
            }
            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }

    retrieve(pRect) {
        let returnObjects = this.objects;
        const index = this.getIndex(pRect);
        if (this.nodes.length && index !== -1) {
            returnObjects = returnObjects.concat(this.nodes[index].retrieve(pRect));
        }
         // Add all objects from child nodes that might overlap
        else if (this.nodes.length) {
             for(let i=0; i < this.nodes.length; i++) {
                 returnObjects = returnObjects.concat(this.nodes[i].retrieve(pRect));
             }
        }

        return returnObjects;
    }
}

// --- HELPER FUNCTIONS ---

/**
 * A safe way to get a unique Tone.js time to prevent scheduling conflicts.
 * Ensures that each scheduled event has a slightly later time than the previous one.
 * @returns {number} A unique, safe time for a Tone.js event.
 */
function getSafeToneTime() {
    let now = Tone.now();
    let lastTime = getSafeToneTime.lastTime || 0;
    if (now <= lastTime) {
        now = lastTime + 0.001;
    }
    getSafeToneTime.lastTime = now;
    return now;
}

/**
 * Applies a deadzone to a gamepad axis value.
 * @param {number} v - The axis value.
 * @param {number} [dz=GAMEPAD_DEADZONE] - The deadzone threshold.
 * @returns {number} The axis value, or 0 if it's within the deadzone.
 */
function applyDeadzone(v, dz = GAMEPAD_DEADZONE) {
  return Math.abs(v) < dz ? 0 : v;
}

/**
 * Triggers a vibration on the device if it's a mobile device.
 * @param {number} duration - The duration of the vibration in milliseconds.
 */
function vibrate(duration) {
    if (isMobileDevice && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}
