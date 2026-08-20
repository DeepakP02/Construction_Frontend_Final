import { messaging } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import api from './api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BE3EbGLzDbwvCXSZvPQVOQOp0sSxpOc4vL8mUtqLpf7iA2JRpKc4QfwJJ7hAuTgebLhRuX3PqQV8YLRZdO1Tr-s";

/**
 * Request notification permissions and register token with backend
 */
export async function registerWebFcmToken() {
  if (!messaging) {
    console.log('[WebPush] Messaging is not initialized. Skipping registration.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[WebPush] Permission not granted for notifications.');
      return null;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      console.log('[WebPush] FCM Token obtained:', token);
      localStorage.setItem('fcm_token', token);
      
      // Upload to backend
      await api.post('/notifications/fcm-token', {
        token,
        platform: 'web'
      });
      console.log('[WebPush] FCM Token successfully registered on backend.');
      return token;
    } else {
      console.warn('[WebPush] No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('[WebPush] Error retrieving web FCM token:', error.message);
    return null;
  }
}

/**
 * Deactivate FCM Token on web logout
 */
export async function deactivateWebFcmToken() {
  try {
    const token = localStorage.getItem('fcm_token');
    if (!token) {
      console.log('[WebPush] No web FCM token found to deactivate.');
      return;
    }

    console.log('[WebPush] Deactivating web FCM token:', token);
    try {
      await api.post('/notifications/fcm-token/deactivate', { token });
    } catch (apiErr) {
      console.log('[WebPush] Deactivate API call returned non-2xx status (already cleared on backend).');
    }
    
    localStorage.removeItem('fcm_token');
    console.log('[WebPush] Web FCM Token cleared successfully.');
  } catch (error) {
    console.error('[WebPush] Deactivation failed:', error.message);
  }
}

/**
 * Set up foreground notification listeners
 */
export function setupWebNotificationListeners(onMessageCallback) {
  if (!messaging) return () => {};

  // 1. Listen for foreground push notifications
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('[WebPush] Foreground message received:', payload);
    if (onMessageCallback) {
      onMessageCallback(payload);
    }
  });

  // 2. Listen for service worker navigate_chat message clicks
  const handleServiceWorkerMessage = (event) => {
    if (event.data && event.data.type === 'NAVIGATE_CHAT') {
      const roomId = event.data.roomId;
      console.log('[WebPush] Navigating to chat room from notification tap:', roomId);
      // Trigger navigation event or direct URL update
      if (roomId) {
        window.location.href = `/company-admin/chat?roomId=${roomId}`;
      }
    }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }

  return () => {
    unsubscribe();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    }
  };
}
