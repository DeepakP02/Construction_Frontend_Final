import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBQlbwSu-63k5lCkg-_RbhimHdUahJIh3c",
  authDomain: "construction-bard.firebaseapp.com",
  projectId: "construction-bard",
  storageBucket: "construction-bard.firebasestorage.app",
  messagingSenderId: "923654871925",
  appId: "1:923654871925:web:f8e06f190fea759719d13c",
  measurementId: "G-9CG002EJT7"
};

const app = initializeApp(firebaseConfig);

export const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: "BE3EbGLzDbwvCXSZvPQVOQOp0sSxpOc4vL8mUtqLpf7iA2JRpKc4QfwJJ7hAuTgebLhRuX3PqQV8YLRZdO1Tr-s"
    });

    return token;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const listenNotifications = () => {
  onMessage(messaging, (payload) => {
    console.log("Notification Received:", payload);
  });
};