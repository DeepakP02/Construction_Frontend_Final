import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const ClockContext = createContext();

export const useClock = () => useContext(ClockContext);

const formatElapsed = (seconds) => {
    const safe = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Global clock state for the CURRENT logged-in user (self clock-in/out).
 *
 * Lives at the app root so the running timer and clocked-in status persist across
 * route/page navigation — exactly like the mobile app's global AppContext. The elapsed
 * time is always recomputed from the server `clockIn` timestamp, so it stays accurate
 * even if the browser tab was backgrounded. Crew clock (clocking OTHER users) is a
 * separate flow and is not tracked here.
 */
export const ClockProvider = ({ children }) => {
    const { user } = useAuth();
    const [activeLog, setActiveLog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const tickRef = useRef(null);

    const isClockedIn = !!activeLog && !activeLog.clockOut;

    // Resolve the current user's currently-open time log (no clockOut).
    const refresh = useCallback(async () => {
        if (!user?._id) {
            setActiveLog(null);
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/timelogs');
            const mine = (res.data || []).filter(log => {
                const uid = log.userId?._id || log.userId;
                return uid?.toString() === user._id?.toString();
            });
            const open = mine.find(log => !log.clockOut) || null;
            setActiveLog(open);
        } catch (error) {
            console.error('[Clock] refresh failed:', error);
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    // Load active log on login / user change.
    useEffect(() => {
        setLoading(true);
        refresh();
    }, [refresh]);

    // Single global ticking timer — recomputed from the server clockIn so it never drifts.
    useEffect(() => {
        if (tickRef.current) clearInterval(tickRef.current);

        if (!isClockedIn || !activeLog?.clockIn) {
            setElapsed(0);
            return;
        }

        const compute = () => {
            const start = new Date(activeLog.clockIn).getTime();
            setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
        };
        compute();
        tickRef.current = setInterval(compute, 1000);

        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
        };
    }, [isClockedIn, activeLog?.clockIn]);

    // Self clock-in — payload must NOT contain a userId (server uses the auth token = self).
    const clockIn = useCallback(async (payload) => {
        const res = await api.post('/timelogs/clock-in', payload);
        setActiveLog(res.data);
        return res.data;
    }, []);

    const clockOut = useCallback(async (payload) => {
        await api.post('/timelogs/clock-out', payload);
        setActiveLog(null);
        setElapsed(0);
    }, []);

    return (
        <ClockContext.Provider
            value={{
                activeLog,
                isClockedIn,
                loading,
                elapsed,
                formattedElapsed: formatElapsed(elapsed),
                clockIn,
                clockOut,
                refresh,
            }}
        >
            {children}
        </ClockContext.Provider>
    );
};
