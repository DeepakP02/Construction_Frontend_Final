import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, User, Search, Crosshair, Phone, Loader, Activity, ShieldCheck } from 'lucide-react';
import api, { BASE_URL } from '../../utils/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

// Fix for default marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker for moving/live users
const LiveIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class='w-10 h-10 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center shadow-xl animate-pulse'>
             <div class='w-2 h-2 bg-white rounded-full animate-ping'></div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

// Helper component to center map on selected employee
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] !== 0) map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const GPS = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const socketRef = useRef();

    const fetchData = async () => {
        try {
            const response = await api.get('/timelogs');
            // Filter only active logs (not clocked out)
            const activeLogs = response.data.filter(log => !log.clockOut);

            const crewData = activeLogs.map(log => ({
                id: log.userId?._id || log._id,
                name: log.userId?.fullName || 'Unknown',
                role: log.userId?.role || 'Worker',
                location: log.projectId?.name || 'On Site',
                lat: log.gpsIn?.latitude || 0,
                lng: log.gpsIn?.longitude || 0,
                status: log.geofenceStatus === 'outside' ? 'Flagged' : 'Active',
                lastPing: 'Stable Connection'
            }));

            // If some employees are already set via socket, don't overwrite their live coordinates with stale DB coordinates
            setEmployees(prev => {
                const combined = [...crewData];
                prev.forEach(liveEmp => {
                    const idx = combined.findIndex(e => e.id === liveEmp.id);
                    if (idx !== -1) {
                        combined[idx] = { ...combined[idx], ...liveEmp };
                    } else if (liveEmp.lastPing === 'Live Movement') {
                        combined.push(liveEmp);
                    }
                });
                return combined;
            });
        } catch (error) {
            console.error('Error fetching GPS data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Socket setup
        const socketUrl = BASE_URL;
        const token = localStorage.getItem('token');
        socketRef.current = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
            socketRef.current.emit('register_user', user);
        });

        socketRef.current.on('location_update', (data) => {
            if (data.companyId === user.companyId) {
                setEmployees(prev => {
                    const idx = prev.findIndex(e => e.id === data.userId);
                    const updatedEmp = {
                        id: data.userId,
                        name: data.fullName,
                        role: data.role,
                        lat: data.lat,
                        lng: data.lng,
                        status: 'Active',
                        lastPing: 'Live Movement',
                        location: 'Broadcasting...'
                    };

                    if (idx !== -1) {
                        const newArr = [...prev];
                        newArr[idx] = { ...newArr[idx], ...updatedEmp };
                        return newArr;
                    } else {
                        return [...prev, updatedEmp];
                    }
                });
            }
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 animate-fade-in">
            <div className="flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Control Center <span className="text-blue-600">GPS</span></h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Satellite Tracking: <span className="text-emerald-500">Live Grid Active</span></p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-widest">{employees.length} Crew Online</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                {/* Sidebar List */}
                <div className="w-full md:w-80 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search tactical units..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {filteredEmployees.map(emp => (
                            <div
                                key={emp.id}
                                onClick={() => setSelectedEmployee(emp)}
                                className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all duration-300 border
                            ${selectedEmployee?.id === emp.id
                                        ? 'bg-slate-900 border-slate-800 text-white shadow-lg'
                                        : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}
                        `}
                            >
                                <div className="relative">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all
                                        ${selectedEmployee?.id === emp.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}
                                    `}>
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 
                                        ${selectedEmployee?.id === emp.id ? 'border-slate-900' : 'border-white'} 
                                        ${emp.lastPing === 'Live Movement' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}
                                    `}></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-sm uppercase tracking-tight truncate">{emp.name}</h4>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 truncate
                                        ${selectedEmployee?.id === emp.id ? 'text-slate-400' : 'text-slate-500'}
                                    `}>
                                        <Activity size={10} className="text-blue-500" /> {emp.role}
                                    </p>
                                </div>
                                {emp.lastPing === 'Live Movement' && (
                                    <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase tracking-tighter">
                                        Live
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredEmployees.length === 0 && (
                            <div className="p-8 text-center space-y-3 opacity-40">
                                <Search size={32} className="mx-auto text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No matching units</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Map View */}
                <div className="flex-1 bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center z-10 shrink-0">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-blue-600" size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Tactical Map View v4.0</span>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                <span className="text-[8px] font-black uppercase text-slate-400">Stable</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-[8px] font-black uppercase text-slate-400">Moving</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        {loading && employees.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 backdrop-blur-sm z-50">
                                <Loader className="animate-spin text-blue-600" size={48} />
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 space-y-4">
                                <div className="p-6 bg-slate-900 rounded-3xl shadow-2xl">
                                    <Navigation className="text-white animate-bounce" size={48} />
                                </div>
                                <div className="text-center">
                                    <p className="text-slate-800 font-black text-2xl uppercase tracking-tighter">Zero Ground Activity</p>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Satellite scanning for active workers...</p>
                                </div>
                            </div>
                        ) : null}

                        <MapContainer
                            center={[40.7128, -74.0060]} // Default to NY or user's last known center
                            zoom={13}
                            className="h-full w-full z-0"
                            zoomControl={false}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {selectedEmployee && selectedEmployee.lat !== 0 && (
                                <ChangeView center={[selectedEmployee.lat, selectedEmployee.lng]} zoom={15} />
                            )}

                            {employees.filter(e => e.lat !== 0).map(emp => (
                                <Marker
                                    key={emp.id}
                                    position={[emp.lat, emp.lng]}
                                    icon={emp.lastPing === 'Live Movement' ? LiveIcon : DefaultIcon}
                                    eventHandlers={{
                                        click: () => setSelectedEmployee(emp),
                                    }}
                                >
                                    <Popup className="custom-popup">
                                        <div className="p-2 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-white text-xs">
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-xs uppercase tracking-tight m-0">{emp.name}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest m-0">{emp.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] font-black uppercase text-slate-400">Position Status</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {emp.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] font-black uppercase text-slate-400">Signal Strength</span>
                                                    <div className="flex gap-0.5">
                                                        <div className="w-1 h-2 bg-blue-600 rounded-sm"></div>
                                                        <div className="w-1 h-3 bg-blue-600 rounded-sm"></div>
                                                        <div className="w-1 h-4 bg-blue-600 rounded-sm"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="w-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest py-2 rounded-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                                <Phone size={12} /> Establish Comm Link
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>

                        {/* Map Controls */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                            <button className="bg-white p-3 rounded-2xl shadow-2xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition border border-slate-100 group">
                                <Search size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <button
                                onClick={() => {
                                    if (employees.length > 0) {
                                        const firstWithLoc = employees.find(e => e.lat !== 0);
                                        if (firstWithLoc) setSelectedEmployee(firstWithLoc);
                                    }
                                }}
                                className="bg-white p-3 rounded-2xl shadow-2xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition border border-slate-100 group"
                            >
                                <Crosshair size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GPS;
