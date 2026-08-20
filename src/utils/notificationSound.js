/**
 * Utility to handle notification sounds across the application.
 * All sounds are now using reliable Mixkit CDN to ensure playback works across all browsers.
 */

const SOUNDS = {
    // Elegant chime for incoming messages and alerts
    NOTIFICATION: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
    // Stronger tone for direct chat messages
    // Short incoming-message ping (distinct from generic notification chime)
    MESSAGE_RECEIVED: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    // Subtle bubble pop for sent messages
    MESSAGE_SENT: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
};

let audioUnlocked = false;

/**
 * Unlocks audio on first user interaction to comply with browser policies.
 */
export const unlockAudio = () => {
    if (audioUnlocked) return;
    
    // Create a temporary audio element and try to play it
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'; // Tiny silent wav
    
    const playPromise = silentAudio.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            audioUnlocked = true;
            console.log('✅ Audio system unlocked and ready');
        }).catch(err => {
            console.warn('⚠️ Audio unlock pending user interaction:', err);
        });
    }
};

/**
 * Plays a notification sound.
 * @param {('NOTIFICATION'|'MESSAGE_RECEIVED'|'MESSAGE_SENT')} type 
 */
export const playSound = (type = 'NOTIFICATION') => {
    try {
        console.log(`[Audio] Attempting to play sound: ${type}`);
        const soundUrl = SOUNDS[type] || SOUNDS.NOTIFICATION;
        const audio = new Audio(soundUrl);
        
        // Ensure volume is up
        audio.volume = 1.0; 
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log(`[Audio] Successfully played: ${type}`);
            }).catch(error => {
                console.error(`[Audio] Blocked or Failed: ${type}`, error);
                
                // If blocked, we try one more time if audio might have been unlocked meanwhile
                if (audioUnlocked) {
                    setTimeout(() => {
                        audio.play().catch(() => {});
                    }, 100);
                }
            });
        }
    } catch (err) {
        console.error('[Audio] Utility fatal error:', err);
    }
};

export default {
    playSound,
    unlockAudio,
    types: {
        NOTIFICATION: 'NOTIFICATION',
        MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
        MESSAGE_SENT: 'MESSAGE_SENT'
    }
};

