// ═══════════════════════════════════════════════════════════════════════════
// MOBILE COMPATIBILITY & FALLBACK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

// Comprehensive mobile device detection and capability assessment
function assessMobileCompatibility() {
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !isChrome;
    
    // Device capability detection
    const capabilities = {
        isMobile,
        isIOS,
        isAndroid,
        isChrome,
        isSafari,
        hardwareConcurrency: navigator.hardwareConcurrency || 2,
        deviceMemory: navigator.deviceMemory || 1,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        webgl: checkWebGLSupport(),
        webAudio: checkWebAudioSupport(),
        touchEvents: 'ontouchstart' in window,
        localStorage: checkLocalStorageSupport()
    };
    
    // Determine device tier
    let deviceTier = 'high';
    if (isMobile) {
        if (capabilities.hardwareConcurrency <= 4 || capabilities.deviceMemory <= 2) {
            deviceTier = 'low';
        } else if (capabilities.hardwareConcurrency <= 6 || capabilities.deviceMemory <= 4) {
            deviceTier = 'medium';
        }
    }
    
    return {
        ...capabilities,
        deviceTier,
        userAgent,
        recommendedSettings: getRecommendedSettings(deviceTier, capabilities)
    };
}

// Check WebGL support
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
                 (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

// Check Web Audio API support
function checkWebAudioSupport() {
    return !!(window.AudioContext || window.webkitAudioContext);
}

// Check localStorage support
function checkLocalStorageSupport() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// Get recommended settings based on device capabilities
function getRecommendedSettings(tier, capabilities) {
    const baseSettings = {
        musicTracks: 3,
        backgrounds: 5,
        particleEffects: false,
        emojiPreRendering: false,
        highQualityGraphics: false,
        soundEnabled: capabilities.webAudio,
        touchControls: capabilities.touchEvents,
        autoSave: capabilities.localStorage
    };
    
    switch (tier) {
        case 'low':
            return {
                ...baseSettings,
                musicTracks: 1,
                backgrounds: 3,
                loadingTimeout: 3000,
                assetRetryAttempts: 1
            };
        case 'medium':
            return {
                ...baseSettings,
                musicTracks: 3,
                backgrounds: 8,
                particleEffects: true,
                loadingTimeout: 5000,
                assetRetryAttempts: 2
            };
        case 'high':
        default:
            return {
                ...baseSettings,
                musicTracks: 5,
                backgrounds: 10,
                particleEffects: true,
                emojiPreRendering: true,
                highQualityGraphics: true,
                loadingTimeout: 8000,
                assetRetryAttempts: 3
            };
    }
}

// Global compatibility assessment
window.mobileCompatibility = assessMobileCompatibility();

// Apply compatibility settings to global scope
window.applyMobileCompatibility = function() {
    const compat = window.mobileCompatibility;
    
    // Set global flags for other scripts to use
    window.IS_MOBILE = compat.isMobile;
    window.IS_LOW_END_DEVICE = compat.deviceTier === 'low';
    window.IS_IOS = compat.isIOS;
    window.IS_ANDROID = compat.isAndroid;
    window.DEVICE_TIER = compat.deviceTier;
    
    // Apply recommended settings
    const settings = compat.recommendedSettings;
    window.MOBILE_SETTINGS = settings;
    
    console.log('Mobile Compatibility Assessment:', {
        device: compat.userAgent,
        tier: compat.deviceTier,
        capabilities: compat,
        settings: settings
    });
    
    return compat;
};

// Initialize compatibility immediately
window.applyMobileCompatibility();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { assessMobileCompatibility, applyMobileCompatibility };
}
