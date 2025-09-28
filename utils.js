// A safe way to get a unique Tone.js time
function getSafeToneTime() {
    let now = Tone.now();
    let lastTime = getSafeToneTime.lastTime || 0;
    if (now <= lastTime) {
        now = lastTime + 0.001;
    }
    getSafeToneTime.lastTime = now;
    return now;
}

// ================================================================================= //
// ======================= OPTIMIZATION: QUADTREE IMPLEMENTATION =================== //
// ================================================================================= //
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


// ================================================================================= //
// ======================= OPTIMIZATION: PRE-RENDERING SYSTEM ====================== //
// ================================================================================= //
const preRenderedEntities = {};

function preRenderEmoji(emoji, size) {
    const bufferCanvas = document.createElement('canvas');
    const bufferCtx = bufferCanvas.getContext('2d');
    const paddedSize = size * 1.3;
    bufferCanvas.width = paddedSize;
    bufferCanvas.height = paddedSize;
    bufferCtx.font = `${size}px sans-serif`;
    bufferCtx.textAlign = 'center';
    bufferCtx.textBaseline = 'middle';
    bufferCtx.fillText(emoji, paddedSize / 2, paddedSize / 2);
    preRenderedEntities[emoji] = bufferCanvas;
}

function initializePreRenders() {
    // --- ENEMIES ---
    preRenderEmoji('🧟', 17);
    preRenderEmoji('💀', 20);
    preRenderEmoji('🦇', 25 * 0.85);
    preRenderEmoji('🌀', 22);
    preRenderEmoji('🦟', 15);
    preRenderEmoji('😈', 20 * 0.8);
    preRenderEmoji('👹', 28 * 0.7);
    preRenderEmoji('👻', 22);
    preRenderEmoji('👁️', 25 * 0.6);
    preRenderEmoji('🧟‍♀️', 17 * 1.75);
    preRenderEmoji('🧛‍♀️', 20);
    // --- PICKUPS & EFFECTS ---
    preRenderEmoji('🔸', COIN_SIZE);
    preRenderEmoji('🔹', DIAMOND_SIZE);
    preRenderEmoji('💍', RING_SYMBOL_SIZE);
    preRenderEmoji('♦️', RING_SYMBOL_SIZE);
    preRenderEmoji('🍎', APPLE_ITEM_SIZE);
    preRenderEmoji('💣', BOMB_SIZE);
    preRenderEmoji('⚡️', LIGHTNING_SIZE);
    preRenderEmoji('🧿', EYE_PROJECTILE_SIZE);
    preRenderEmoji('🪓', WHIRLWIND_AXE_SIZE);
    preRenderEmoji('🐶', 25);
    preRenderEmoji('🦉', 30);
    preRenderEmoji('🧱', 30);
    preRenderEmoji('🛢️', 15);
    console.log("All emojis have been pre-rendered to memory.");
}
