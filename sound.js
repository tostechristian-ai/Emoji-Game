// Vibrate function for mobile feedback
function vibrate(duration) {
    if (isMobileDevice && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

// Generic sound playback functions
function playSound(name) {
    if (gameActive && !gamePaused && audioPlayers[name]) {
        audioPlayers[name].start(getSafeToneTime());
    }
}

function playUISound(name) {
    if (audioPlayers[name]) {
        audioPlayers[name].start(getSafeToneTime());
    }
}

// Adjust volume for a specific audio player before it's used elsewhere
audioPlayers['playerScream'].volume.value = -10;

// Synthetic sounds using Tone.js for dynamic effects
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

// Functions to trigger the synthetic sounds
function playBombExplosionSound() {
    if (gameActive && !gamePaused) bombExplosionSynth.triggerAttackRelease("F3", "8n", getSafeToneTime());
}
function playSwordSwingSound() {
    if (gameActive && !gamePaused) swordSwingSynth.triggerAttackRelease("D4", "16n", getSafeToneTime());
}
function playEyeProjectileHitSound() {
    if (gameActive && !gamePaused) eyeProjectileHitSynth.triggerAttackRelease("G2", "16n", getSafeToneTime());
}


// Background Music (BGM) Management
const backgroundMusicPaths = [
    'audio/background_music.mp3', 'audio/background_music2.mp3',
    'audio/background_music3.mp3', 'audio/background_music4.mp3', 'audio/background_music5.mp3',
    'audio/background_music6.mp3', 'audio/background_music7.mp3', 'audio/background_music8.mp3',
    'audio/background_music9.mp3', 'audio/background_music10.mp3', 'audio/background_music11.mp3',
];
let currentBGMPlayer = null;

function startBGM() {
    if (currentBGMPlayer && currentBGMPlayer.state !== 'started') {
        currentBGMPlayer.start();
    }
    Tone.Transport.start();
}

function stopBGM() {
    if (currentBGMPlayer) {
        currentBGMPlayer.stop();
    }
    Tone.Transport.stop();
}

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

function stopMainMenuBGM() {
    if (audioPlayers['mainMenu'] && audioPlayers['mainMenu'].state === 'started') {
        audioPlayers['mainMenu'].stop();
    }
}

async function tryLoadMusic(retries = 3) {
    if (backgroundMusicPaths.length === 0) {
        console.error("No background music paths available.");
        return;
    }
    let availableTracks = [...backgroundMusicPaths];
    for (let i = 0; i < retries; i++) {
        try {
            if (availableTracks.length === 0) availableTracks = [...backgroundMusicPaths]; // Reset if all failed
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

            // This will need to connect to the UI slider later
            const musicVolumeSlider = document.getElementById('musicVolume');
            if(musicVolumeSlider) {
                currentBGMPlayer.volume.value = musicVolumeSlider.value;
            }

            await Tone.loaded();
            startBGM();
            return; // Success
        } catch (error) {
            console.error(`Failed to load music track. Attempt ${i + 1}/${retries}.`, error);
        }
    }
    console.error("Failed to load any background music after multiple retries.");
}
