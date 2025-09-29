// ================================================================================= //
// ============================= SOUND.JS ========================================== //
// ================================================================================= //

// --- AUDIO SYSTEM GLOBALS ---
let currentBGMPlayer = null;

// --- TONE.JS SYNTHS ---
const swordSwingSynth = new Tone.Synth({ 
    oscillator: { type: "sine" }, 
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.01, release: 0.05 } 
}).toDestination();

const eyeProjectileHitSynth = new Tone.Synth({ 
    oscillator: { type: "triangle" }, 
    envelope: { attack: 0.001, decay: 0.08, sustain: 0.01, release: 0.1 } 
}).toDestination();

const bombExplosionSynth = new Tone.Synth({ 
    oscillator: { type: "sawtooth" }, 
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.01, release: 0.2 } 
}).toDestination();

// --- SOUND PLAYBACK FUNCTIONS ---

/**
 * Plays a sound effect from the audioPlayers collection.
 * @param {string} name - The name of the sound to play.
 */
function playSound(name) { 
    if (gameActive && !gamePaused && audioPlayers[name]) { 
        audioPlayers[name].start(getSafeToneTime()); 
    } 
}

/**
 * Plays a UI sound effect (bypasses game state checks).
 * @param {string} name - The name of the sound to play.
 */
function playUISound(name) { 
    if (audioPlayers[name]) { 
        audioPlayers[name].start(getSafeToneTime()); 
    } 
}

/**
 * Plays the bomb explosion synth sound.
 */
function playBombExplosionSound() { 
    if (gameActive && !gamePaused) bombExplosionSynth.triggerAttackRelease("F3", "8n", getSafeToneTime()); 
}

/**
 * Plays the sword swing synth sound.
 */
function playSwordSwingSound() { 
    if (gameActive && !gamePaused) swordSwingSynth.triggerAttackRelease("D4", "16n", getSafeToneTime()); 
}

/**
 * Plays the eye projectile hit synth sound.
 */
function playEyeProjectileHitSound() { 
    if (gameActive && !gamePaused) eyeProjectileHitSynth.triggerAttackRelease("G2", "16n", getSafeToneTime()); 
}

// --- BACKGROUND MUSIC FUNCTIONS ---

/**
 * Starts the background music player.
 */
function startBGM() { 
    if (currentBGMPlayer && currentBGMPlayer.state !== 'started') { 
        currentBGMPlayer.start(); 
    } 
    Tone.Transport.start(); 
}

/**
 * Stops the background music player.
 */
function stopBGM() { 
    if (currentBGMPlayer) { 
        currentBGMPlayer.stop(); 
    } 
    Tone.Transport.stop(); 
}

/**
 * Starts the main menu background music.
 */
function startMainMenuBGM() {
    if (Tone.context.state !== 'running') {
        Tone.start().then(() => {
            if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') { 
                stopBGM(); 
                audioPlayers['mainMenu'].start(); 
            }
        });
    } else {
        if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state !== 'started') { 
            stopBGM(); 
            audioPlayers['mainMenu'].start(); 
        }
    }
}

/**
 * Stops the main menu background music.
 */
function stopMainMenuBGM() { 
    if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state === 'started') { 
        audioPlayers['mainMenu'].stop(); 
    } 
}

/**
 * Attempts to load a random background music track with retry logic.
 * @param {number} [retries=3] - Number of retry attempts.
 */
async function tryLoadMusic(retries = 3) {
    if (backgroundMusicPaths.length === 0) {
        console.error("No background music paths available.");
        return;
    }
    let availableTracks = [...backgroundMusicPaths];
    for(let i = 0; i < retries; i++) {
        try {
            if(availableTracks.length === 0) availableTracks = [...backgroundMusicPaths];
            const musicIndex = Math.floor(Math.random() * availableTracks.length);
            const randomMusicPath = availableTracks.splice(musicIndex, 1)[0];

            if (currentBGMPlayer) { 
                currentBGMPlayer.stop(); 
                currentBGMPlayer.dispose(); 
            }
            
            currentBGMPlayer = new Tone.Player({ 
                url: randomMusicPath, 
                loop: true, 
                autostart: false, 
                volume: -10 
            }).toDestination();
            
            musicVolumeSlider.dispatchEvent(new Event('input'));
            await Tone.loaded();
            startBGM();
            return;
        } catch (error) {
            console.error(`Failed to load music track. Attempt ${i + 1}/${retries}.`, error);
        }
    }
    console.error("Failed to load any background music after multiple retries.");
}

// --- AUDIO SETUP ---
audioPlayers['playerScream'].volume.value = -10;
