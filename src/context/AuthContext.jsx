import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api, { BASE_URL } from '../utils/api';
import locationTracker from '../utils/LocationTracker';
import { io } from 'socket.io-client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef();

  const refreshPermissions = async (currentUser) => {
    try {
      const permRes = await api.get('/roles/my-permissions');
      const updatedUser = {
        ...currentUser,
        permissions: permRes.data.permissions || []
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('Permissions refreshed real-time');
    } catch (error) {
      console.error('Failed to refresh permissions real-time:', error);
    }
  };

  // Track token to control socket lifecycle — NOT user._id
  // This prevents socket disconnect/reconnect on every user state update (permissions refresh etc.)
  const tokenRef = useRef(localStorage.getItem('token'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    tokenRef.current = token;

    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      return;
    }

    // If socket already exists and is connected with the same token, do nothing
    if (socketRef.current && socketRef.current.connected) {
      return;
    }
    // If socket exists but disconnected, let Socket.IO auto-reconnect handle it
    if (socketRef.current) {
      return;
    }

    const socketUrl = BASE_URL;
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socketInstance.on('permissions_updated', (data) => {
      setUser(prev => {
        if (prev && prev.role === data.role) {
          refreshPermissions(prev);
        }
        return prev;
      });
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
    // Only re-run when user logs in (null -> value) or logs out (value -> null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user ? 'logged-in' : 'logged-out']);

  useEffect(() => {
    // Check for stored token/user on load
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (storedUser && token) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setLoading(false); // Set loading to false immediately after setting local user

          // Refresh permissions/verify token in background
          api.get('/roles/my-permissions').then(permRes => {
            const updatedUser = {
              ...parsedUser,
              permissions: permRes.data.permissions || []
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            locationTracker.init(updatedUser);
          }).catch(error => {
            console.error('Background permission refresh failed:', error);
            if (error.response?.status === 401) {
              console.log('[Auth] Token is invalid or expired. Performing logout cleanup.');
              logout();
            }
          });

        } catch (error) {
          console.error('Init Auth error:', error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      locationTracker.stopTracking();
    };
  }, []);

  // Web FCM registration and listener setup on user authentication
  useEffect(() => {
    if (user && user._id) {
      const registerFCM = async () => {
        try {
          const { registerWebFcmToken } = await import('../utils/webPushNotifications');
          await registerWebFcmToken();
        } catch (fcmErr) {
          console.log('[WebPush Register Error]', fcmErr.message);
        }
      };

      // Delay slightly to ensure browser environments/service workers are loaded
      const timer = setTimeout(registerFCM, 2000);
      return () => clearTimeout(timer);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user) {
      let unsubscribe = () => { };
      const setupListeners = async () => {
        try {
          const { setupWebNotificationListeners } = await import('../utils/webPushNotifications');
          unsubscribe = setupWebNotificationListeners((payload) => {
            console.log('[WebPush] Foreground notification payload:', payload);
            // Show a native browser notification if granted
            if (Notification.permission === 'granted') {
              new Notification(payload.notification?.title || payload.data?.title || 'New Message', {
                body: payload.notification?.body || payload.data?.body || '',
                icon: '/logo.webp'
              });
            }
          });
        } catch (err) {
          console.log('[WebPush Listeners Setup Error]', err.message);
        }
      };

      setupListeners();
      return () => unsubscribe();
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const userData = response.data;

      // Now permissions are included in the login response
      const permissions = userData.permissions || [];

      const userWithPerms = {
        ...userData,
        permissions
      };

      // Set token and user data in local storage
      localStorage.setItem('token', userData.token);
      setUser(userWithPerms);
      localStorage.setItem('user', JSON.stringify(userWithPerms));

      // Start location tracking on login
      locationTracker.init(userWithPerms);

      return userWithPerms;
    } catch (error) {
      console.error('Login Error:', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { deactivateWebFcmToken } = await import('../utils/webPushNotifications');
      await deactivateWebFcmToken();
    } catch (fcmErr) {
      console.log('[WebPush Logout Error]', fcmErr.message);
    }

    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    locationTracker.stopTracking();
  };

  const updateUserData = (newData) => {
    const updatedUser = { ...user, ...newData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUserData, loading, socket }}>
      {children}
    </AuthContext.Provider>
  );
};
