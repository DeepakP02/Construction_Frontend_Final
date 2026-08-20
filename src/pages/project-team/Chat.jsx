import { useState, useEffect, useRef } from 'react';
import { Send, Search, Paperclip, Smile, MessageSquare, Users as UsersIcon, Circle, Shield, User as UserIcon, HardHat, X, Download, Loader, AlertCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/notificationSound';
import { isImage, toLocalBlobUrl, revokeLocalBlobUrl, compressImage } from '../../utils/chatAttachmentUtils';

const Chat = () => {
    const { user, socket } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoomState] = useState(() => {
        const saved = localStorage.getItem('activeChatRoom');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const setActiveRoom = (room) => {
        setActiveRoomState(room);
        if (room) {
            localStorage.setItem('activeChatRoom', JSON.stringify(room));
        } else {
            localStorage.removeItem('activeChatRoom');
        }
    };
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [onlineCount, setOnlineCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('INTERNAL'); // INTERNAL, CLIENT, SUB
    const [showDirectory, setShowDirectory] = useState(false);
    const [directoryUsers, setDirectoryUsers] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [lightboxImage, setLightboxImage] = useState(null);

    const commonEmojis = [
        '😊', '😂', '👍', '🙏', '🔥', '❤️', '👏', '🙌', 
        '🏠', '🏗️', '📐', '🔧', '🔨', '⛏️', '🚧', '🚜',
        '✅', '❌', '⚠️', '🏢', '📅', '⏰', '💰', '✉️'
    ];
    const fileInputRef = useRef(null);
    // socketRef removed: using global shared socket
    const messagesEndRef = useRef(null);

    // Handled globally in App.jsx

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const activeRoomRef = useRef(activeRoom);
    useEffect(() => {
        activeRoomRef.current = activeRoom;
    }, [activeRoom]);

    const roomsRef = useRef([]);
    useEffect(() => {
        roomsRef.current = Array.isArray(rooms) ? rooms : [];
    }, [rooms]);

    useEffect(() => {
        if (!user || !socket) return;

        const handleConnect = () => {
            console.log('Real-time channel established');
            socket.emit('register_user', user);
            // Re-join known rooms if we reconnect
            (roomsRef.current || []).forEach(room => {
                const rid = room.id || room._id;
                if (rid) socket.emit('join_room', rid);
            });
        };

        const handleOnlineCount = (count) => {
            setOnlineCount(count);
        };

        const handleNewMessage = (payload) => {
            if (!payload) return;
            const incomingRoomId = String(payload.roomId?._id || payload.roomId || '');
            const currentActiveRoom = activeRoomRef.current;
            const activeRoomId = currentActiveRoom ? String(currentActiveRoom.id || currentActiveRoom._id || '') : '';

            console.log('[Web Socket] new_message payload:', payload);
            console.log('[Web Socket] incomingRoomId:', incomingRoomId, 'activeRoomId:', activeRoomId);

            setRooms(prev => {
                const currentRooms = Array.isArray(prev) ? prev : [];
                const roomIndex = currentRooms.findIndex(r => String(r.id || r._id) === incomingRoomId);
                if (roomIndex === -1) {
                    fetchRooms().catch(() => {});
                    return currentRooms;
                }

                const room = { ...currentRooms[roomIndex] };
                room.lastMessage = {
                    text: payload.message,
                    sender: payload.sender?.fullName || 'User',
                    time: payload.createdAt
                };
                room.unreadCount = (activeRoomId === incomingRoomId) ? 0 : (room.unreadCount || 0) + 1;

                const otherRooms = currentRooms.filter(r => String(r.id || r._id) !== incomingRoomId);
                return [room, ...otherRooms];
            });

            const senderId = payload.sender?._id || payload.sender || '';
            const isIncoming = String(senderId) !== String(user?._id);

            if (activeRoomId && incomingRoomId === activeRoomId) {
                setMessages(prev => {
                    const currentMessages = Array.isArray(prev) ? prev : [];
                    if (currentMessages.some(m => String(m.id || m._id) === String(payload._id || payload.id))) {
                        return currentMessages;
                    }

                    return [...currentMessages, {
                        id: payload._id || payload.id,
                        sender: payload.sender?.fullName || 'User',
                        role: payload.sender?.role || 'User',
                        text: payload.message,
                        attachments: payload.attachments || [],
                        time: new Date(payload.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isMe: !isIncoming
                    }];
                });
                api.put(`/chat/mark-read/${activeRoomId}`).catch(() => {});
                if (isIncoming) playSound('MESSAGE_RECEIVED');
            } else {
                if (isIncoming) playSound('MESSAGE_RECEIVED');
            }
        };

        const handleMessageUpdated = (payload) => {
            if (!payload) return;
            const incomingRoomId = String(payload.roomId?._id || payload.roomId || '');
            const currentActiveRoom = activeRoomRef.current;
            const activeRoomId = currentActiveRoom ? String(currentActiveRoom.id || currentActiveRoom._id || '') : '';

            if (activeRoomId && incomingRoomId === activeRoomId) {
                setMessages(prev => {
                    const currentMessages = Array.isArray(prev) ? prev : [];
                    return currentMessages.map(m => {
                        if (String(m.id || m._id) === String(payload._id || payload.id)) {
                            return {
                                ...m,
                                attachments: payload.attachments || []
                            };
                        }
                        return m;
                    });
                });
            }
        };

        const handleNewNotification = (notif) => {
            if (notif.type === 'chat') {
                const currentActiveRoom = activeRoomRef.current;
                if (!currentActiveRoom || notif.roomId !== currentActiveRoom.id) {
                    setRooms(prev => {
                        const currentRooms = Array.isArray(prev) ? prev : [];
                        const roomIndex = currentRooms.findIndex(r => r.id === notif.roomId);
                        if (roomIndex !== -1) {
                            const room = { ...currentRooms[roomIndex], unreadCount: (currentRooms[roomIndex].unreadCount || 0) + 1 };
                            const otherRooms = currentRooms.filter(r => r.id !== notif.roomId);
                            return [room, ...otherRooms];
                        } else {
                            fetchRooms();
                            return currentRooms;
                        }
                    });
                    playSound('NOTIFICATION');
                }
            }
        };

        socket.on('connect', handleConnect);
        socket.on('online_users_count', handleOnlineCount);
        socket.on('new_message', handleNewMessage);
        socket.on('message_updated', handleMessageUpdated);
        socket.on('new_notification', handleNewNotification);

        if (socket.connected) handleConnect();

        return () => {
            socket.off('connect', handleConnect);
            socket.off('online_users_count', handleOnlineCount);
            socket.off('new_message', handleNewMessage);
            socket.off('message_updated', handleMessageUpdated);
            socket.off('new_notification', handleNewNotification);
        };
    }, [user?._id, socket]);

    const fetchDirectoryUsers = async () => {
        try {
            const res = await api.get('/chat/users');
            setDirectoryUsers(res.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const startDirectChat = async (targetUserId) => {
        try {
            const res = await api.post('/chat/direct', { targetUserId });
            const room = res.data;
            if (!rooms.find(r => r.id === room.id)) {
                setRooms(prev => [room, ...prev]);
            }
            setActiveRoom(room);
            setShowDirectory(false);
            if (room.otherRole === 'CLIENT') setActiveTab('CLIENT');
            else if (room.otherRole === 'SUBCONTRACTOR') setActiveTab('SUB');
            else setActiveTab('INTERNAL');
        } catch (error) {
            console.error('Error starting direct chat:', error);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await api.get('/chat/rooms');
            setRooms(res.data || []);
            
            const savedRoom = localStorage.getItem('activeChatRoom');
            if (savedRoom) {
                try {
                    const parsed = JSON.parse(savedRoom);
                    const found = (res.data || []).find(r => String(r.id || r._id) === String(parsed.id || parsed._id));
                    if (found) {
                        setActiveRoomState(found);
                        return;
                    }
                } catch (e) {}
            }

            if (!activeRoom && res.data.length > 0) {
                const tabRooms = filterRoomsByTab(res.data, activeTab);
                if (tabRooms.length > 0) setActiveRoom(tabRooms[0]);
            }
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, [user?._id]);

    useEffect(() => {
        if (!socket || !rooms || rooms.length === 0) return;

        const joinRooms = () => {
            rooms.forEach(room => {
                const rid = room.id || room._id;
                if (rid) {
                    socket.emit('join_room', String(rid));
                }
            });
        };

        if (socket.connected) {
            joinRooms();
        }

        socket.on('connect', joinRooms);
        return () => {
            socket.off('connect', joinRooms);
        };
    }, [socket, rooms]);

    useEffect(() => {
        if (!activeRoom?.id) return;
        const fetchMessages = async () => {
            try {
                const res = await api.get(`/chat/${activeRoom.id}`);
                const formattedMessages = res.data.map(msg => ({
                    id: msg._id,
                    sender: msg.sender?.fullName || 'Unknown',
                    role: msg.sender?.role || 'User',
                    text: msg.message,
                    attachments: msg.attachments || [],
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: msg.sender?._id === user?._id || msg.sender === user?._id
                }));
                setMessages(formattedMessages);
                setRooms(prev => Array.isArray(prev) ? prev.map(r => r.id === activeRoom.id ? { ...r, unreadCount: 0 } : r) : []);
                await api.put(`/chat/mark-read/${activeRoom.id}`);
            } catch (error) {
                console.error('Error fetching room messages:', error);
            }
        };
        fetchMessages();
    }, [activeRoom?.id]);

    const uploadSingleFile = async (file, tempId) => {
        const formData = new FormData();
        formData.append('files', file);

        try {
            const res = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setAttachments(prev => prev.map(att => 
                        att.id === tempId ? { ...att, progress: percentCompleted } : att
                    ));
                }
            });

            const uploadedFile = res.data[0];
            setAttachments(prev => prev.map(att => 
                att.id === tempId ? { 
                    ...att, 
                    url: uploadedFile.url, 
                    isPending: false, 
                    progress: 100 
                } : att
            ));
        } catch (error) {
            console.error('File upload failed:', error);
            setAttachments(prev => prev.filter(att => att.id !== tempId));
            alert(`Failed to upload ${file.name}`);
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0 || !activeRoom) return;

        if (fileInputRef.current) fileInputRef.current.value = '';

        for (const file of files) {
            const tempId = 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            const isImg = file.type.startsWith('image/');
            let localUrl = '';
            let fileToUpload = file;

            if (isImg) {
                fileToUpload = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
                localUrl = toLocalBlobUrl(fileToUpload);
            }

            const newAttachment = {
                id: tempId,
                name: fileToUpload.name,
                url: localUrl || '',
                fileType: fileToUpload.type,
                isPending: true,
                progress: 0
            };

            setAttachments(prev => [...prev, newAttachment]);
            uploadSingleFile(fileToUpload, tempId);
        }
    };

    const removeAttachment = (index) => {
        const removed = attachments[index];
        if (removed && removed.url && removed.url.startsWith('blob:')) {
            revokeLocalBlobUrl(removed.url);
        }
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleSend = async (messageText = null, attachmentsOverride = null) => {
        let messageContent = messageText !== null ? messageText : newMessage;
        const rawAttachments = attachmentsOverride !== null ? attachmentsOverride : attachments;
        
        const validAttachments = rawAttachments.filter(att => !att.isPending);
        const finalAttachments = validAttachments.map(att => ({
            name: att.name,
            url: att.url,
            fileType: att.fileType
        }));
        
        if (!messageContent.trim() && finalAttachments.length > 0) {
            messageContent = `Sent ${finalAttachments.length} attachment(s)`;
        }
        
        if (!messageContent.trim() || !activeRoom) return;

        const tempId = 'optimistic-' + Date.now().toString();
        const optimisticMsg = {
            id: tempId,
            sender: user?.fullName || 'Me',
            role: user?.role || 'User',
            text: messageContent,
            attachments: validAttachments.map(att => ({
                name: att.name,
                url: att.url,
                fileType: att.fileType
            })),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
            pending: true
        };

        setMessages(prev => [...prev, optimisticMsg]);
        if (messageText === null) setNewMessage('');
        if (showEmojiPicker) setShowEmojiPicker(false);

        try {
            const res = await api.post('/chat', {
                roomId: activeRoom.id,
                message: messageContent,
                attachments: finalAttachments
            });
            const serverMsg = res.data;
            setMessages(prev => prev.map(msg => msg.id === tempId ? {
                ...msg,
                id: serverMsg._id,
                time: new Date(serverMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                pending: false
            } : msg));

            setRooms(prev => {
                const currentRooms = Array.isArray(prev) ? prev : [];
                const roomIndex = currentRooms.findIndex(r => r.id === activeRoom.id);
                const otherRooms = currentRooms.filter(r => r.id !== activeRoom.id);
                const updatedRoom = roomIndex !== -1 ? { ...currentRooms[roomIndex] } : { ...activeRoom };
                updatedRoom.lastMessage = {
                    text: serverMsg.message,
                    sender: serverMsg.sender?.fullName || user?.fullName,
                    time: serverMsg.createdAt
                };
                return [updatedRoom, ...otherRooms];
            });

            rawAttachments.forEach(att => {
                if (att.url && att.url.startsWith('blob:')) {
                    revokeLocalBlobUrl(att.url);
                }
            });
            setAttachments([]);
            playSound('MESSAGE_SENT');
        } catch (error) {
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
    };

    const downloadFile = async (url, name) => {
        try {
            const response = await api.get(`/chat/download`, { params: { url, name }, responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = blobUrl; link.download = name;
            document.body.appendChild(link); link.click(); link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) { alert('Download failed'); }
    };

    const filterRoomsByTab = (allRooms, tab) => {
        if (!Array.isArray(allRooms)) return [];
        return allRooms.filter(room => {
            if (tab === 'INTERNAL') {
                if (room.roomType === 'INTERNAL' || room.roomType === 'PROJECT_GROUP') return true;
                if (room.roomType === 'DIRECT') {
                    const internalRoles = ['SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER'];
                    return internalRoles.includes(room.otherRole);
                }
            }
            if (tab === 'CLIENT') {
                if (room.roomType === 'ADMIN_CLIENT' || room.roomType === 'SUB_CLIENT') return true;
                if (room.roomType === 'DIRECT' && room.otherRole === 'CLIENT') return true;
                if (room.roomType === 'PROJECT_GROUP' && room.hasClient) return true;
            }
            if (tab === 'SUB') {
                if (room.roomType === 'ADMIN_SUB') return true;
                if (room.roomType === 'DIRECT' && room.otherRole === 'SUBCONTRACTOR') return true;
                if (room.roomType === 'PROJECT_GROUP' && room.hasSub) return true;
            }
            return false;
        });
    };

    const displayRooms = (['COMPANY_OWNER', 'SUPER_ADMIN', 'PM', 'FOREMAN', 'WORKER'].includes(user?.role)
        ? filterRoomsByTab(rooms, activeTab)
        : rooms
    ).filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.projectName && room.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="p-10 text-center uppercase font-black text-slate-300">Loading Frequencies...</div>;

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in shadow-2xl">
            <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-4 border-b border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-slate-800 uppercase tracking-tighter text-lg">COMMUNICATIONS</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setShowDirectory(true); fetchDirectoryUsers(); }} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><UsersIcon size={16} /></button>
                            <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">{onlineCount} ACTIVE</div>
                        </div>
                    </div>
                    {['COMPANY_OWNER', 'SUPER_ADMIN', 'PM', 'FOREMAN', 'WORKER'].includes(user?.role) && (
                        <div className="flex p-1 bg-slate-200/50 rounded-2xl gap-1">
                            {[
                                { id: 'INTERNAL', label: 'Internal', icon: Shield },
                                { id: 'CLIENT', label: 'Clients', icon: UserIcon, adminOnly: true, pmAllowed: true },
                                { id: 'SUB', label: 'Subs', icon: HardHat, pmAllowed: true }
                            ].filter(tab => !tab.adminOnly || tab.pmAllowed || ['COMPANY_OWNER', 'SUPER_ADMIN'].includes(user?.role)).map(tab => {
                                const unreadCount = filterRoomsByTab(rooms, tab.id).reduce((sum, r) => sum + (r.unreadCount || 0), 0);
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all relative ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        <tab.icon size={14} className="mb-0.5" />
                                        <span className="text-[9px] font-black uppercase tracking-wider">{tab.label}</span>
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm animate-bounce">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input type="text" placeholder="Filter transmissions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {displayRooms.map(room => (
                        <div key={room.id} onClick={() => setActiveRoom(room)} className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-white transition-all flex gap-3 ${activeRoom?.id === room.id ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : ''}`}>
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-sm ${activeRoom?.id === room.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>{room.name?.[0] || '?'}</div>
                                {room.unreadCount > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg animate-bounce">{room.unreadCount}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                    <h4 className={`font-bold text-sm truncate ${activeRoom?.id === room.id ? 'text-blue-600' : 'text-slate-700'}`}>{room.name}</h4>
                                    {room.lastMessage && <span className="text-[8px] font-bold text-slate-400">{new Date(room.lastMessage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                </div>
                                {room.lastMessage && <div className="flex items-center gap-1.5 italic text-[10px] text-slate-400 truncate"><span className="px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-black uppercase tracking-widest">{room.lastMessage.sender.split(' ')[0]}</span>{room.lastMessage.text}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-white">
                {activeRoom ? (
                    <>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl ${activeRoom.roomType === 'INTERNAL' ? 'bg-blue-600' : 'bg-slate-900'}`}>{activeRoom.name?.[0] || '?'}</div>
                                <div><h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{activeRoom.name}</h3><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>SECURE CHANNEL</p></div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20 custom-scrollbar">
                            {messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                    <div className="max-w-[70%] relative group">
                                        {!msg.isMe && <div className="flex items-center gap-2 mb-1 px-1"><span className="text-[10px] font-black text-slate-800 uppercase">{msg.sender}</span><span className="px-1 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black italic">{msg.role}</span></div>}
                                        <div className={`rounded-2xl overflow-hidden shadow-sm border ${msg.isMe ? 'bg-blue-600 text-white border-blue-500 rounded-br-none' : 'bg-white text-slate-700 border-slate-100 rounded-bl-none'} ${msg.attachments?.some(a => isImage(a.url)) && !msg.text ? 'p-1' : 'p-3'}`}>
                                            {msg.attachments?.map((att, i) => {
                                                const isImg = isImage(att.url);
                                                if (isImg) {
                                                    const isRemote = att.url?.startsWith('http');
                                                    const isBlobOrData = att.url?.startsWith('blob:') || att.url?.startsWith('data:');
                                                    // Anything that isn't an HTTP url or a browser blob/data uri is a local device path (file://, content://, /data/, /var/)
                                                    const isLocalFile = !isRemote && !isBlobOrData;
                                                    
                                                    // Show spinner when: explicitly pending OR URL is a local file:// (can never load in browser while upload in progress)
                                                    const showPlaceholder = att.isPending === true || (isLocalFile && !att.failed);
                                                    // Show failed when not pending AND local file (stuck) OR explicitly marked failed
                                                    const isFailed = !showPlaceholder && (isLocalFile || att.failed === true);
                                                    return (
                                                        <div key={i} className="mb-2 last:mb-0 relative group/img cursor-pointer" onClick={() => !showPlaceholder && !isFailed && setLightboxImage(att)}>
                                                            {showPlaceholder ? (
                                                                <div className="w-64 h-48 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 border border-slate-200 border-dashed animate-pulse">
                                                                    <Loader className="animate-spin text-blue-500" size={24} />
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Attachment...</span>
                                                                </div>
                                                            ) : isFailed ? (
                                                                <div className="w-64 h-48 flex flex-col items-center justify-center p-4 bg-red-50 text-red-500 rounded-xl border border-red-100">
                                                                    <AlertCircle size={32} className="mb-2 text-red-500" />
                                                                    <span className="text-xs text-center font-black uppercase">Upload Failed</span>
                                                                    <span className="text-[9px] text-red-400 mt-1 uppercase tracking-widest">Image not synced</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <img
                                                                        src={att.url}
                                                                        alt={att.name}
                                                                        className="max-w-full rounded-xl object-contain bg-slate-100 max-h-96 w-full"
                                                                        loading="lazy"
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors rounded-xl flex items-center justify-center">
                                                                        <Download 
                                                                            className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-md hover:scale-110" 
                                                                            size={32} 
                                                                            onClick={(e) => { 
                                                                                e.stopPropagation(); 
                                                                                downloadFile(att.url, att.name); 
                                                                            }} 
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                // Document/File UI (WhatsApp Document Style)
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => downloadFile(att.url, att.name)}
                                                        className={`flex items-center gap-3 p-3 mb-2 last:mb-0 rounded-xl border cursor-pointer transition-all hover:bg-opacity-80 active:scale-[0.98] ${msg.isMe ? 'bg-blue-700/50 border-blue-400/30' : 'bg-slate-50 border-slate-100'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${msg.isMe ? 'bg-blue-500' : 'bg-white shadow-sm border border-slate-200'}`}>
                                                            <Paperclip size={18} className={msg.isMe ? 'text-white' : 'text-slate-400'} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-[11px] font-black truncate leading-tight ${msg.isMe ? 'text-white' : 'text-slate-800'}`}>
                                                                {att.name}
                                                            </div>
                                                            <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${msg.isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                                                {att.name.split('.').pop() || 'FILE'} • Download
                                                            </div>
                                                        </div>
                                                        <Download size={16} className={msg.isMe ? 'text-blue-200' : 'text-slate-300'} />
                                                    </div>
                                                );
                                            })}
                                            {msg.text && <p className="text-sm font-medium">{msg.text}</p>}
                                            <div className="text-[8px] opacity-60 text-right mt-1">{msg.time}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-6 bg-white border-t border-slate-100 sticky bottom-0">
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-3 mb-4 max-w-4xl mx-auto px-1">
                                    {attachments.map((att, i) => {
                                        const isImg = isImage(att.url);
                                        return (
                                            <div key={att.id || i} className="relative group animate-in zoom-in duration-200">
                                                {isImg ? (
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg ring-1 ring-slate-200 relative">
                                                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                                        {att.isPending && (
                                                            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white text-[9px] font-black">
                                                                <Loader size={12} className="animate-spin mb-1 text-blue-400" />
                                                                <span>{att.progress}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 bg-slate-100 p-2 pr-8 rounded-lg border border-slate-200 text-[10px] font-bold uppercase tracking-tight relative">
                                                        <Paperclip size={12} className="text-blue-600" />
                                                        <span className="truncate max-w-[120px]">{att.name}</span>
                                                        {att.isPending && (
                                                            <div className="absolute inset-0 bg-slate-100/90 flex items-center justify-center text-slate-700 text-[8px] font-black px-2 gap-1 rounded-lg">
                                                                <Loader size={10} className="animate-spin text-blue-500" />
                                                                <span>{att.progress}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => removeAttachment(i)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-all z-10"
                                                >
                                                    <X size={10} strokeWidth={3} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="flex gap-3 items-center">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= 10} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl border border-slate-100 transition-all">
                                    <Paperclip size={20} />
                                </button>
                                <div className="flex-1 relative">
                                    <input type="text" placeholder="Transmission..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-12 py-3.5 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="absolute right-4 top-4 text-slate-300 hover:text-slate-600"><Smile size={20} /></button>
                                    {showEmojiPicker && <div className="absolute bottom-full right-0 mb-4 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 grid grid-cols-6 gap-2 z-[100]">{commonEmojis.map(e => <button key={e} onClick={() => { setNewMessage(p => p + e); setShowEmojiPicker(false); }} className="text-lg hover:bg-slate-50 p-1 rounded-lg transition-all">{e}</button>)}</div>}
                                </div>
                                <button 
                                    onClick={() => handleSend()} 
                                    disabled={(!newMessage.trim() && attachments.length === 0) || attachments.some(a => a.isPending)}
                                    className={`p-3.5 rounded-2xl shadow-xl transition-all ${(newMessage.trim() || attachments.length > 0) && !attachments.some(a => a.isPending) ? 'bg-blue-600 text-white scale-105 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 opacity-50"><UsersIcon size={48} className="text-slate-200" /><p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-4">Select a secure frequency to begin coordination.</p></div>
                )}
            </div>
            {showDirectory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden scale-up">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><div><h3 className="font-black text-slate-800 uppercase text-lg leading-none">New Direct Frequency</h3><p className="text-[10px] font-bold text-slate-400 mt-1">Select a contact to initiate secure line</p></div><button onClick={() => setShowDirectory(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">{directoryUsers.map(u => (<div key={u._id} onClick={() => startDirectChat(u._id)} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer border border-transparent hover:border-slate-100 group transition-all"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">{u.fullName[0]}</div><div className="flex-1 overflow-hidden"><h4 className="font-bold text-slate-800 text-sm truncate">{u.fullName}</h4><p className="text-[10px] text-slate-400 italic">{u.role}</p></div></div>))}</div>
                    </div>
                </div>
            )}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in cursor-zoom-out"
                    onClick={() => setLightboxImage(null)}
                >
                    <button 
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                    <img 
                        src={lightboxImage.url} 
                        alt={lightboxImage.name} 
                        className="max-w-[90%] max-h-[90%] object-contain rounded-lg shadow-2xl animate-zoom-in"
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}
        </div>
    );
};

export default Chat;
