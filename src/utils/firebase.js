import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app = null;
let messaging = null;

if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId) {
  try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    console.log('[Firebase Web] Initialized successfully.');
  } catch (err) {
    console.error('[Firebase Web] Initialization error:', err.message);
  }
} else {
  console.warn('[Firebase Web] Config keys missing in env. Web notifications will operate in DRY-RUN mode.');
}

export { app, messaging };
