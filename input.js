// ================================================================================= //
// ============================= INPUT.JS ========================================== //
// ================================================================================= //

// --- GLOBAL INPUT STATE VARIABLES ---
const keys = {};
let mouseX = 0;
let mouseY = 0;
let isMouseInCanvas = false;

let joystickDirX = 0;
let joystickDirY = 0;
let aimDx = 0;
let aimDy = 0;
let p2aimDx = 0;
let p2aimDy = 0;

let lastMoveStickTapTime = 0;
let lastFireStickTapTime = 0;
let lastMoveStickDirection = {x: 0, y: 0};
let activeTouches = {};
let mouseActiveStick = null;

let gamepadIndex = null;
let isGamepadUpgradeMode = false;
let selectedUpgradeIndex = 0;
let lastGamepadUpdate = 0;


// --- GAMEPAD INPUT HANDLING ---
window.addEventListener("gamepadconnected", (e) => {
  console.log("Gamepad connected:", e.gamepad.id);
  gamepadIndex = e.gamepad.index;
});

window.addEventListener("gamepaddisconnected", (e) => {
  if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
});

/**
 * Handles all gamepad input for both gameplay and menus.
 */
function handleGamepadInput() {
    if (gamepadIndex == null) return;
    const gp = navigator.getGamepads?.()[gamepadIndex];
    if (!gp) return;

    if (isGamepadUpgradeMode) {
        const now = Date.now();
        if (now - lastGamepadUpdate > GAMEPAD_INPUT_DELAY) {
            let moved = false;
            const prevIndex = selectedUpgradeIndex;
            const numOptions = document.querySelectorAll('.upgrade-card').length;
            const cardsPerRow = 3;

            // D-pad or Left Stick horizontal movement
            if (gp.buttons[15].pressed || gp.axes[0] > 0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex + 1) % numOptions;
                moved = true;
            } else if (gp.buttons[14].pressed || gp.axes[0] < -0.5) {
                selectedUpgradeIndex = (selectedUpgradeIndex - 1 + numOptions) % numOptions;
                moved = true;
            }
            // D-pad or Left Stick vertical movement
            else if (gp.buttons[12].pressed || gp.axes[1] < -0.5) {
                selectedUpgradeIndex = Math.max(0, selectedUpgradeIndex - cardsPerRow);
                moved = true;
            } else if (gp.buttons[13].pressed || gp.axes[1] > 0.5) {
                selectedUpgradeIndex = Math.min(numOptions - 1, selectedUpgradeIndex + cardsPerRow);
                moved = true;
            }

            if (moved && prevIndex !== selectedUpgradeIndex) {
                const prevCard = document.querySelectorAll('.upgrade-card')[prevIndex];
                if (prevCard) prevCard.classList.remove('selected');

                const newCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (newCard) {
                    newCard.classList.add('selected');
                    playUISound('uiClick');
                    vibrate(10);
                }
                lastGamepadUpdate = now;
            }

            // Confirmation button (A/X)
            if (gp.buttons[0].pressed) {
                const selectedCard = document.querySelectorAll('.upgrade-card')[selectedUpgradeIndex];
                if (selectedCard) {
                    selectedCard.querySelector('button').click();
                    isGamepadUpgradeMode = false; // Exit menu mode
                    lastGamepadUpdate = now;
                    return; // Stop further processing this frame
                }
            }
        }
    } else { // --- Gameplay Input ---
        let lx = applyDeadzone(gp.axes[0] || 0);
        let ly = applyDeadzone(gp.axes[1] || 0);
        const lmag = Math.hypot(lx, ly);
        if (lmag > 0) {
            joystickDirX = lx / lmag;
            joystickDirY = ly / lmag;
        } else {
            joystickDirX = 0;
            joystickDirY = 0;
        }

        let rx = applyDeadzone(gp.axes[2] || 0);
        let ry = applyDeadzone(gp.axes[3] || 0);
        const rmag = Math.hypot(rx, ry);
        if (rmag > 0) {
            aimDx = rx / rmag;
            aimDy = ry / rmag;
        } else {
            aimDx = 0;
            aimDy = 0;
        }

        const pressed = (i) => !!gp.buttons?.[i]?.pressed;

        // Dash (Right Trigger)
        if (pressed(7) && !gp._rTriggerLatch) {
            gp._rTriggerLatch = true;
            triggerDash(player);
        } else if (!pressed(7)) {
            gp._rTriggerLatch = false;
        }

        // Pause (Start or B/Circle)
        if ((pressed(9) || pressed(1)) && !gp._pauseLatch) {
            gp._pauseLatch = true;
            if (gameActive && !gameOver) togglePause();
        } else if (!pressed(9) && !pressed(1)) {
            gp._pauseLatch = false;
        }
    }
}


// --- KEYBOARD & MOUSE INPUT ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if(gameActive && !gameOver) { togglePause(); }
        return;
    }
     if (e.key === 'o') {
        triggerDash(player2);
    }
    if (keys['-'] && keys['=']) { // Secret coin cheat
        playerData.currency += 5000;
        savePlayerData();
        floatingTexts.push({ text: "+5000 Coins!", x: player.x, y: player.y - player.size, startTime: Date.now(), duration: 2000, color: '#FFD700' });
    }

    if (e.key === 'Insert' && gameActive && !gameOver && !gamePaused) {
        if (player.lives > 1 && (!player2 || !player2.active)) {
            player.lives--;
            updateUIStats();
            player2 = {
                active: true, x: player.x, y: player.y, size: 35, speed: 1.4,
                facing: 'down', stepPhase: 0, gunAngle: -Math.PI / 2,
                lastFireTime: 0, fireInterval: 400,
                isDashing: false, dashEndTime: 0, lastDashTime: 0, dashCooldown: 6000,
                spinStartTime: null,
                spinDirection: 0,
                dx: 0, dy: 0
            };
            floatingTexts.push({
                text: "Player 2 has joined!", x: player.x, y: player.y - player.size,
                startTime: Date.now(), duration: 2000, color: '#FFFF00'
            });
        }
    }
    keys[e.key] = true;
    // Aiming with arrow keys is handled here to allow multiple keys at once
    if (e.key === 'ArrowUp') aimDy = -1;
    else if (e.key === 'ArrowDown') aimDy = 1;
    else if (e.key === 'ArrowLeft') aimDx = -1;
    else if (e.key === 'ArrowRight') aimDx = 1;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    // Reset aiming axis only if the corresponding keys are released
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (keys['ArrowDown']) { aimDy = 1; } else if (keys['ArrowUp']) { aimDy = -1; } else { aimDy = 0; }
        if (keys['ArrowRight']) { aimDx = 1; } else if (keys['ArrowLeft']) { aimDx = -1; } else { aimDx = 0; }
    }
});

window.addEventListener('mousemove', (e) => {
    if (gamePaused || gameOver || !gameActive) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    // This logic is for direct aiming, not joystick emulation
    if (!mouseActiveStick) {
        const playerScreenX = player.x - cameraOffsetX;
        const playerScreenY = player.y - cameraOffsetY;
        aimDx = mouseX - playerScreenX;
        aimDy = mouseY - playerScreenY;
    }
});

canvas.addEventListener('mouseenter', () => { if (gameActive && !document.body.classList.contains('is-mobile')) { isMouseInCanvas = true; } });
canvas.addEventListener('mouseleave', () => { if (gameActive) { isMouseInCanvas = false; } });
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gameActive && !gamePaused && !gameOver) {
        triggerDash(player);
    }
});


// --- TOUCH INPUT & JOYSTICK HELPERS ---

/**
 * Calculates the displacement and distance of a touch from a joystick's center.
 * @param {number} touchClientX - The clientX of the touch event.
 * @param {number} touchClientY - The clientY of the touch event.
 * @param {HTMLElement} baseElement - The joystick base element.
 * @param {HTMLElement} capElement - The joystick cap element to move visually.
 * @returns {{dx: number, dy: number, distance: number}} - The displacement vector and distance.
 */
function getJoystickInput(touchClientX, touchClientY, baseElement, capElement) {
    const rect = baseElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touchClientX - centerX;
    let dy = touchClientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > joystickRadius) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * joystickRadius;
        dy = Math.sin(angle) * joystickRadius;
    }
    if (capElement) capElement.style.transform = `translate(${dx}px, ${dy}px)`;
    return { dx, dy, distance };
}

document.body.addEventListener('touchstart', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const moveRect = movementStickBase.getBoundingClientRect();
        const fireRect = firestickBase.getBoundingClientRect();

        // Left (Movement) stick
        if (touch.clientX > moveRect.left && touch.clientX < moveRect.right && touch.clientY > moveRect.top && touch.clientY < moveRect.bottom) {
            if (!activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = { type: 'movement' };
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                const magnitude = Math.hypot(dx, dy);
                if (magnitude > 0) {
                    joystickDirX = dx / magnitude;
                    joystickDirY = dy / magnitude;
                }
            }
        }
        // Right (Aiming) stick
        else if (touch.clientX > fireRect.left && touch.clientX < fireRect.right && touch.clientY > fireRect.top && touch.clientY < fireRect.bottom) {
            if (!activeTouches[touch.identifier]) {
                activeTouches[touch.identifier] = { type: 'fire' };
                // Dodge on double tap
                const now = Date.now();
                if (now - lastFireStickTapTime < 300) {
                    triggerDash(player);
                }
                lastFireStickTapTime = now;

                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                aimDx = dx;
                aimDy = dy;
            }
        }
    }
}, { passive: false });

document.body.addEventListener('touchmove', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchInfo = activeTouches[touch.identifier];
        if (touchInfo) {
            if (touchInfo.type === 'movement') {
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, movementStickBase, movementStickCap);
                const magnitude = Math.hypot(dx, dy);
                if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; }
                else { joystickDirX = 0; joystickDirY = 0; }
            } else if (touchInfo.type === 'fire') {
                const { dx, dy } = getJoystickInput(touch.clientX, touch.clientY, firestickBase, firestickCap);
                aimDx = dx; aimDy = dy;
            }
        }
    }
}, { passive: false });

const endTouch = (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchInfo = activeTouches[touch.identifier];
        if (touchInfo) {
            if (touchInfo.type === 'movement') { if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)'; joystickDirX = 0; joystickDirY = 0; }
            else if (touchInfo.type === 'fire') { if (firestickCap) firestickCap.style.transform = 'translate(0, 0)'; aimDx = 0; aimDy = 0; }
            delete activeTouches[touch.identifier];
        }
    }
};

document.body.addEventListener('touchend', endTouch);
document.body.addEventListener('touchcancel', endTouch);


// --- MOUSE-AS-JOYSTICK INPUT (for desktop testing) ---
document.body.addEventListener('mousedown', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    const moveRect = movementStickBase.getBoundingClientRect();
    const fireRect = firestickBase.getBoundingClientRect();
    if (e.clientX > moveRect.left && e.clientX < moveRect.right && e.clientY > moveRect.top && e.clientY < moveRect.bottom) {
        mouseActiveStick = 'movement';
        activeTouches['mouse'] = { type: 'movement' };
        const { dx, dy } = getJoystickInput(e.clientX, e.clientY, movementStickBase, movementStickCap);
        const magnitude = Math.hypot(dx, dy);
        if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; }
    } else if (e.clientX > fireRect.left && e.clientX < fireRect.right && e.clientY > fireRect.top && e.clientY < fireRect.bottom) {
        mouseActiveStick = 'fire';
        activeTouches['mouse'] = { type: 'fire' };
        const { dx, dy } = getJoystickInput(e.clientX, e.clientY, firestickBase, firestickCap);
        aimDx = dx; aimDy = dy;
    }
});

window.addEventListener('mousemove', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    if (mouseActiveStick) {
        if (mouseActiveStick === 'movement') {
            const { dx, dy } = getJoystickInput(e.clientX, e.clientY, movementStickBase, movementStickCap);
             const magnitude = Math.hypot(dx, dy);
            if (magnitude > 0) { joystickDirX = dx / magnitude; joystickDirY = dy / magnitude; }
            else { joystickDirX = 0; joystickDirY = 0; }
        } else if (mouseActiveStick === 'fire') {
            const { dx, dy } = getJoystickInput(e.clientX, e.clientY, firestickBase, firestickCap);
            aimDx = dx; aimDy = dy;
        }
    }
});

window.addEventListener('mouseup', (e) => {
    if (gameGuideModal.style.display === 'flex' || achievementsModal.style.display === 'flex' || cheatsModal.style.display === 'flex') return;
    if (!gameActive || gamePaused || gameOver) return;
    if (mouseActiveStick === 'movement') { if (movementStickCap) movementStickCap.style.transform = 'translate(0, 0)'; joystickDirX = 0; joystickDirY = 0; }
    else if (mouseActiveStick === 'fire') { if (firestickCap) firestickCap.style.transform = 'translate(0, 0)'; aimDx = 0; aimDy = 0; }
    mouseActiveStick = null;
    delete activeTouches['mouse'];
});
