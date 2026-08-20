import { io } from 'socket.io-client';

class LocationTracker {
    constructor() {
        this.socket = null;
        this.watchId = null;
        this.user = null;
        this.socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://construction-production-b18f.up.railway.app';
    }

    init(user) {
        if (!user || this.socket) return;
        this.user = user;

        const token = localStorage.getItem('token');
        this.socket = io(this.socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Location tracker connected to socket');
            this.socket.emit('register_user', user);
            this.startTracking();
        });

        this.socket.on('disconnect', () => {
            console.log('Location tracker disconnected');
            this.stopTracking();
        });
    }

    startTracking() {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by this browser.');
            return;
        }

        // Send initial location
        navigator.geolocation.getCurrentPosition(
            (position) => this.sendLocation(position),
            (error) => console.log('Location tracking suppressed:', error.message),
            { enableHighAccuracy: true }
        );

        // Watch for changes
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.sendLocation(position),
            (error) => console.log('Location watch suppressed:', error.message),
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 5000
            }
        );
    }

    sendLocation(position) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('update_location', {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
        }
    }

    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const locationTracker = new LocationTracker();
export default locationTracker;
