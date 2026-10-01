import { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Send, Search, Paperclip, Smile, MessageSquare, X, Loader, 
    Download, ChevronLeft, AlertCircle, Users, User, 
    Lock, ShieldAlert, RotateCcw, Check, Clock, UserPlus
} from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/notificationSound';
import toast from 'react-hot-toast';
import { isImage, toLocalBlobUrl, revokeLocalBlobUrl, compressImage } from '../../utils/chatAttachmentUtils';

const getRoleBadgeStyle = (role) => {
    switch (role) {
        case 'SUPER_ADMIN':
            return { label: 'SUPER ADMIN', bg: 'bg-purple-100 text-purple-700 border-purple-200' };
        case 'COMPANY_OWNER':
        case 'ADMIN':
            return { label: 'ADMIN', bg: 'bg-amber-100 text-amber-700 border-amber-200' };
        case 'PM':
            return { label: 'PROJECT MGR', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
        case 'ENGINEER':
            return { label: 'ENGINEER', bg: 'bg-cyan-100 text-cyan-700 border-cyan-200' };
        case 'FOREMAN':
            return { label: 'FOREMAN', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
        case 'SUBCONTRACTOR':
            return { label: 'SUBCONTRACTOR', bg: 'bg-orange-100 text-orange-700 border-orange-200' };
        case 'WORKER':
            return { label: 'WORKER', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
        case 'CLIENT':
            return { label: 'CLIENT', bg: 'bg-rose-100 text-rose-700 border-rose-200' };
        default:
            return { label: role || 'STAFF', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
};

const Chat = () => {
    const { user, socket } = useAuth();
    const [activeTab, setActiveTab] = useState('PROJECT_GROUP'); // 'PROJECT_GROUP' | 'DIRECT'
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
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const isSendingRef = useRef(false);

    // Group participants state
    const [groupParticipants, setGroupParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [participantSearch, setParticipantSearch] = useState('');

    // Hierarchy Search State for Direct Messaging
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [isStartingDirect, setIsStartingDirect] = useState(false);

    const commonEmojis = [
        '😊', '😂', '👍', '🙏', '🔥', '❤️', '👏', '🙌',
        '🏠', '🏗️', '📐', '🔧', '🔨', '⛏️', '🚧', '🚜',
        '✅', '❌', '⚠️', '🏢', '📅', '⏰', '💰', '✉️'
    ];
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const roomsRef = useRef([]);
    const activeRoomRef = useRef(activeRoom);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        activeRoomRef.current = activeRoom;
    }, [activeRoom]);

    useEffect(() => {
        roomsRef.current = Array.isArray(rooms) ? rooms : [];
    }, [rooms]);

    // Socket.IO event listeners
    useEffect(() => {
        if (!user || !socket) return;

        const handleConnect = () => {
            console.log('Real-time chat socket established');
            socket.emit('register_user', user);
            (roomsRef.current || []).forEach(room => {
                const rid = room.id || room._id;
                if (rid) socket.emit('join_room', String(rid));
            });
        };

        const handleOnlineCount = (count) => {
            setOnlineCount(count);
        };

        const handleNewMessage = (payload) => {
            if (!payload) return;
            const payloadRoomId = String(
                typeof payload.roomId === 'object' && payload.roomId !== null
                    ? payload.roomId._id
                    : payload.roomId || ''
            );
            const currentActiveRoom = activeRoomRef.current;
            const activeId = currentActiveRoom ? String(currentActiveRoom.id || currentActiveRoom._id || '') : '';

            // Update rooms preview list
            setRooms(prev => {
                const currentRooms = Array.isArray(prev) ? prev : [];
                const roomIndex = currentRooms.findIndex((r) => String(r.id || r._id) === payloadRoomId);
                if (roomIndex === -1) {
                    fetchRooms().catch(() => {});
                    return currentRooms;
                }

                const room = { ...currentRooms[roomIndex] };
                room.unreadCount = activeId === payloadRoomId ? 0 : (room.unreadCount || 0) + 1;
                room.lastMessage = {
                    text: payload.message,
                    sender: payload.sender?.fullName || 'Colleague',
                    time: payload.createdAt || new Date().toISOString()
                };

                const updated = [...currentRooms];
                updated.splice(roomIndex, 1);
                return [room, ...updated];
            });

            // Append to active message thread if viewing this room
            if (activeId === payloadRoomId) {
                setMessages(prev => {
                    const canonicalId = String(payload._id || payload.id);
                    const clientMsgId = payload.clientMsgId;

                    // 1. If message already exists by canonical ID, do not add duplicate
                    if (prev.some(m => String(m.id || m._id) === canonicalId)) {
                        return prev;
                    }

                    // 2. Reconcile optimistic message by clientMsgId in place
                    if (clientMsgId && prev.some(m => String(m.id || m._id) === clientMsgId)) {
                        return prev.map(m => String(m.id || m._id) === clientMsgId ? {
                            ...m,
                            id: canonicalId,
                            _id: canonicalId,
                            text: payload.message,
                            attachments: payload.attachments || [],
                            time: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            pending: false,
                            failed: false
                        } : m);
                    }

                    // 3. Fallback: If message is from me and matches a pending optimistic message with identical text
                    const isFromMe = String(payload.sender?._id || payload.sender) === String(user?._id);
                    if (isFromMe) {
                        const pendingIndex = prev.findIndex(m => m.pending && m.text === payload.message);
                        if (pendingIndex !== -1) {
                            const updated = [...prev];
                            updated[pendingIndex] = {
                                ...updated[pendingIndex],
                                id: canonicalId,
                                _id: canonicalId,
                                time: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                pending: false,
                                failed: false
                            };
                            return updated;
                        }
                    }

                    // 4. Genuine incoming message from another user
                    return [...prev, {
                        id: canonicalId,
                        _id: canonicalId,
                        sender: payload.sender?.fullName || 'Colleague',
                        role: payload.sender?.role || 'User',
                        text: payload.message,
                        attachments: payload.attachments || [],
                        time: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isMe: isFromMe
                    }];
                });
                const isFromMe = String(payload.sender?._id || payload.sender) === String(user?._id);
                if (!isFromMe) {
                    playSound('MESSAGE_RECEIVED');
                }
                api.put(`/chat/mark-read/${payloadRoomId}`).catch(() => {});
            } else {
                const isFromMe = String(payload.sender?._id || payload.sender) === String(user?._id);
                if (!isFromMe) {
                    playSound('NOTIFICATION');
                }
            }
        };

        socket.on('connect', handleConnect);
        socket.on('new_message', handleNewMessage);
        socket.on('online_users_count', handleOnlineCount);

        if (socket.connected) handleConnect();

        return () => {
            socket.off('connect', handleConnect);
            socket.off('new_message', handleNewMessage);
            socket.off('online_users_count', handleOnlineCount);
        };
    }, [user?._id, socket]);

    const fetchRooms = async () => {
        try {
            const res = await api.get('/chat/rooms');
            const fetchedRooms = res.data || [];
            setRooms(fetchedRooms);

            const savedRoom = localStorage.getItem('activeChatRoom');
            if (savedRoom) {
                try {
                    const parsed = JSON.parse(savedRoom);
                    const found = fetchedRooms.find(r => String(r.id || r._id) === String(parsed.id || parsed._id));
                    if (found) {
                        setActiveRoomState(found);
                        if (found.roomType === 'DIRECT') {
                            setActiveTab('DIRECT');
                        }
                        return;
                    }
                } catch (e) {}
            }

            if (!activeRoom && fetchedRooms.length > 0) {
                setActiveRoom(fetchedRooms[0]);
                if (fetchedRooms[0].roomType === 'DIRECT') {
                    setActiveTab('DIRECT');
                }
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

    // Socket Room Joining
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

    // Fetch messages for active room
    useEffect(() => {
        const roomId = activeRoom?.id || activeRoom?._id;
        if (!roomId) return;

        const fetchMessages = async () => {
            try {
                const res = await api.get(`/chat/${roomId}`);
                const formattedMessages = res.data.map(msg => ({
                    id: msg._id,
                    sender: msg.sender?.fullName || 'Unknown',
                    role: msg.sender?.role || 'User',
                    text: msg.message,
                    attachments: msg.attachments || [],
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: String(msg.sender?._id || msg.sender) === String(user?._id)
                }));
                setMessages(formattedMessages);
                setRooms(prev => Array.isArray(prev) ? prev.map(r => String(r.id || r._id) === String(roomId) ? { ...r, unreadCount: 0 } : r) : []);
                await api.put(`/chat/mark-read/${roomId}`);
            } catch (error) {
                console.error('Error fetching room messages:', error);
            }
        };
        fetchMessages();

        // Safe fallback: sync every 10s if socket is disconnected, and sync on window focus
        const fallbackInterval = setInterval(() => {
            if (!socket || !socket.connected) {
                fetchMessages();
            }
        }, 10000);

        const handleFocus = () => fetchMessages();
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(fallbackInterval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [activeRoom?.id, activeRoom?._id, socket, user?._id]);

    // Fetch participants for active group room with robust fallback
    useEffect(() => {
        const roomId = activeRoom?.id || activeRoom?._id;
        if (!roomId || activeRoom?.roomType === 'DIRECT') {
            setGroupParticipants([]);
            setLoadingParticipants(false);
            return;
        }

        // Initialize immediately from room object if available, otherwise clear stale data
        if (Array.isArray(activeRoom.participants) && activeRoom.participants.length > 0) {
            setGroupParticipants(activeRoom.participants);
        } else {
            setGroupParticipants([]);
        }

        let isMounted = true;
        setLoadingParticipants(true);

        const fetchParticipants = async () => {
            let fetched = false;

            // 1. Primary: Dedicated room participants endpoint
            try {
                const res = await api.get(`/chat/${roomId}/participants`);
                const list = res.data?.participants || (Array.isArray(res.data) ? res.data : []);
                if (isMounted && Array.isArray(list) && list.length > 0) {
                    setGroupParticipants(list);
                    fetched = true;
                }
            } catch (err) {
                console.warn('[Chat] Primary participants endpoint failed, attempting project fallback:', err?.message || err);
            }

            // 2. Fallback: If primary failed or returned empty, query project members & project details
            if (!fetched) {
                const pid = activeRoom.projectId?._id || activeRoom.projectId || (activeRoom.roomType === 'PROJECT_GROUP' ? activeRoom.id : null);
                if (pid && typeof pid === 'string') {
                    try {
                        const [membersRes, projectRes] = await Promise.allSettled([
                            api.get(`/projects/${pid}/members`),
                            api.get(`/projects/${pid}`)
                        ]);

                        const membersList = membersRes.status === 'fulfilled' && Array.isArray(membersRes.value.data)
                            ? membersRes.value.data
                            : [];

                        const projectData = projectRes.status === 'fulfilled' ? projectRes.value.data : null;

                        const userMap = new Map();

                        // Add client if present in project data
                        if (projectData?.clientId) {
                            const c = projectData.clientId;
                            const cId = c._id || c;
                            if (cId) {
                                userMap.set(String(cId), {
                                    id: cId,
                                    participantId: cId,
                                    userId: cId,
                                    fullName: c.fullName || 'Client',
                                    role: 'CLIENT',
                                    avatar: c.avatar || null,
                                    email: c.email || null,
                                    isOnline: false
                                });
                            }
                        }

                        // Add members from project members endpoint
                        membersList.forEach(m => {
                            if (m && m._id) {
                                userMap.set(String(m._id), {
                                    id: m._id,
                                    participantId: m._id,
                                    userId: m._id,
                                    fullName: m.fullName || 'User',
                                    role: m.role || 'MEMBER',
                                    avatar: m.avatar || null,
                                    email: m.email || null,
                                    isOnline: false
                                });
                            }
                        });

                        const fallbackList = Array.from(userMap.values());
                        if (isMounted && fallbackList.length > 0) {
                            setGroupParticipants(fallbackList);
                        }
                    } catch (fallbackErr) {
                        console.error('[Chat] Fallback participant loading failed:', fallbackErr);
                    }
                }
            }

            if (isMounted) {
                setLoadingParticipants(false);
            }
        };

        fetchParticipants();

        return () => {
            isMounted = false;
        };
    }, [activeRoom?.id, activeRoom?._id, activeRoom?.roomType, activeRoom?.projectId]);

    // Filter participants for modal search
    const filteredParticipants = useMemo(() => {
        if (!participantSearch.trim()) return groupParticipants;
        const query = participantSearch.toLowerCase();
        return groupParticipants.filter(p => 
            p.fullName?.toLowerCase().includes(query) ||
            p.role?.toLowerCase().includes(query) ||
            p.email?.toLowerCase().includes(query)
        );
    }, [groupParticipants, participantSearch]);

    // Debounced Hierarchy Users Search (for Private Messaging)
    useEffect(() => {
        if (activeTab !== 'DIRECT' || !userSearchQuery.trim()) {
            setUserSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingUsers(true);
            try {
                const res = await api.get(`/chat/hierarchy-users?q=${encodeURIComponent(userSearchQuery.trim())}`);
                setUserSearchResults(res.data?.users || []);
            } catch (err) {
                console.error('Error searching hierarchy contacts:', err);
                toast.error('Failed to search directory contacts');
            } finally {
                setIsSearchingUsers(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [userSearchQuery, activeTab]);

    const handleStartDirectChat = async (targetUser) => {
        try {
            setIsStartingDirect(true);
            const res = await api.post('/chat/direct', { targetUserId: targetUser._id });
            const directRoom = res.data;

            // Merge into rooms list if not exists
            setRooms(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const exists = current.find(r => String(r.id || r._id) === String(directRoom.id || directRoom._id));
                if (!exists) {
                    return [directRoom, ...current];
                }
                return current.map(r => String(r.id || r._id) === String(directRoom.id || directRoom._id) ? directRoom : r);
            });

            setActiveRoom(directRoom);
            if (socket && socket.connected) {
                socket.emit('join_room', String(directRoom.id || directRoom._id));
            }
            setUserSearchQuery('');
            setUserSearchResults([]);
            toast.success(`Connected with ${targetUser.fullName}`);
        } catch (err) {
            console.error('Error starting direct chat:', err);
            toast.error(err.response?.data?.message || 'Could not initiate private chat');
        } finally {
            setIsStartingDirect(false);
        }
    };

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
            toast.error(`Failed to upload ${file.name}`);
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
        const roomId = activeRoom?.id || activeRoom?._id;
        if (!roomId || activeRoom?.isArchived || activeRoom?.readOnly) return;
        if (isSendingRef.current) return;

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
        
        if (!messageContent.trim()) return;

        isSendingRef.current = true;
        setIsSending(true);

        const tempId = 'optimistic-' + Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7);
        const optimisticMsg = {
            id: tempId,
            _id: tempId,
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
            pending: true,
            failed: false,
            retryPayload: {
                roomId: roomId,
                message: messageContent,
                attachments: finalAttachments,
                clientMsgId: tempId
            }
        };

        setMessages(prev => [...prev, optimisticMsg]);
        if (messageText === null) setNewMessage('');
        if (showEmojiPicker) setShowEmojiPicker(false);

        try {
            const res = await api.post('/chat', {
                roomId: roomId,
                message: messageContent,
                attachments: finalAttachments,
                clientMsgId: tempId
            });
            const serverMsg = res.data;
            const canonicalId = String(serverMsg._id || serverMsg.id);

            setMessages(prev => {
                // If canonicalId was already added by socket event, just remove tempId
                const alreadyHasCanonical = prev.some(m => String(m.id || m._id) === canonicalId);
                if (alreadyHasCanonical) {
                    return prev.filter(m => String(m.id || m._id) !== tempId);
                }
                return prev.map(msg => String(msg.id || msg._id) === tempId ? {
                    ...msg,
                    id: canonicalId,
                    _id: canonicalId,
                    time: new Date(serverMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    pending: false,
                    failed: false
                } : msg);
            });

            setRooms(prev => {
                const currentRooms = Array.isArray(prev) ? prev : [];
                const roomIndex = currentRooms.findIndex(r => String(r.id || r._id) === String(roomId));
                const otherRooms = currentRooms.filter(r => String(r.id || r._id) !== String(roomId));
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
            console.error('Failed to send message:', error);
            setMessages(prev => prev.map(msg => String(msg.id || msg._id) === tempId ? {
                ...msg,
                pending: false,
                failed: true
            } : msg));
            toast.error(error.response?.data?.message || 'Failed to deliver message. Click Retry.');
        } finally {
            isSendingRef.current = false;
            setIsSending(false);
        }
    };

    const handleRetryMessage = async (failedMsg) => {
        if (!failedMsg.retryPayload) return;
        setMessages(prev => prev.map(m => m.id === failedMsg.id ? { ...m, pending: true, failed: false } : m));
        try {
            const res = await api.post('/chat', failedMsg.retryPayload);
            const serverMsg = res.data;
            setMessages(prev => prev.map(m => m.id === failedMsg.id ? {
                ...m,
                id: serverMsg._id,
                time: new Date(serverMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                pending: false,
                failed: false
            } : m));
            playSound('MESSAGE_SENT');
            toast.success('Delivered successfully');
        } catch (error) {
            setMessages(prev => prev.map(m => m.id === failedMsg.id ? { ...m, pending: false, failed: true } : m));
            toast.error(error.response?.data?.message || 'Retry failed');
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

    // Calculate unread counts
    const groupUnread = (Array.isArray(rooms) ? rooms : [])
        .filter(r => (r.roomType || 'PROJECT_GROUP') === 'PROJECT_GROUP')
        .reduce((sum, r) => sum + (r.unreadCount || 0), 0);

    const privateUnread = (Array.isArray(rooms) ? rooms : [])
        .filter(r => r.roomType === 'DIRECT')
        .reduce((sum, r) => sum + (r.unreadCount || 0), 0);

    // Filter displayed rooms by active tab and search query
    const tabFilteredRooms = (Array.isArray(rooms) ? rooms : []).filter(room => {
        if (activeTab === 'PROJECT_GROUP') {
            return (room.roomType || 'PROJECT_GROUP') === 'PROJECT_GROUP';
        }
        return room.roomType === 'DIRECT';
    });

    const displayRooms = tabFilteredRooms.filter(room =>
        (room.name && room.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (room.projectName && room.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="p-10 text-center uppercase font-black text-slate-300">Loading Secure Chat Channels...</div>;

    const activeRoomName = activeRoom?.roomType === 'DIRECT' 
        ? (activeRoom.otherUser?.fullName || activeRoom.name)
        : (activeRoom?.projectName || activeRoom?.name);

    const activeRoomBadge = activeRoom?.roomType === 'DIRECT'
        ? getRoleBadgeStyle(activeRoom.otherUser?.role)
        : null;

    return (
        <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in shadow-2xl">
            {/* Sidebar */}
            <div className={`w-full md:w-88 border-r border-slate-100 flex flex-col bg-slate-50/50 ${activeRoom ? 'hidden md:flex' : 'flex'}`}>
                {/* Header & Tabs */}
                <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-slate-800 uppercase tracking-tighter text-lg leading-none">COMMUNICATIONS</h2>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">{onlineCount} ACTIVE</div>
                        </div>
                    </div>

                    {/* Top Tab Switcher */}
                    <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
                        <button
                            onClick={() => { setActiveTab('PROJECT_GROUP'); setSearchTerm(''); }}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all ${
                                activeTab === 'PROJECT_GROUP' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Users size={14} />
                            <span>PROJECT GROUPS</span>
                            {groupUnread > 0 && (
                                <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-black">
                                    {groupUnread}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('DIRECT'); setSearchTerm(''); }}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all ${
                                activeTab === 'DIRECT' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <User size={14} />
                            <span>PRIVATE</span>
                            {privateUnread > 0 && (
                                <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-black">
                                    {privateUnread}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Search Bars */}
                    {activeTab === 'PROJECT_GROUP' ? (
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Filter project channels..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500" 
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search hierarchy contacts..." 
                                    value={userSearchQuery} 
                                    onChange={(e) => setUserSearchQuery(e.target.value)} 
                                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500" 
                                />
                                {userSearchQuery && (
                                    <button 
                                        onClick={() => setUserSearchQuery('')}
                                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'DIRECT' && userSearchQuery.trim() ? (
                        /* Direct Hierarchy Contact Search Results */
                        <div className="p-2 space-y-2">
                            <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                                <span>Hierarchy Contacts</span>
                                {isSearchingUsers && <Loader size={12} className="animate-spin text-blue-600" />}
                            </div>

                            {userSearchResults.length > 0 ? (
                                userSearchResults.map(u => {
                                    const roleBadge = getRoleBadgeStyle(u.role);
                                    return (
                                        <div 
                                            key={u._id}
                                            onClick={() => !isStartingDirect && handleStartDirectChat(u)}
                                            className="p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-black flex items-center justify-center text-sm border border-blue-100">
                                                        {u.fullName?.[0] || 'U'}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${u.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-xs text-slate-800 truncate">{u.fullName}</h4>
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${roleBadge.bg}`}>
                                                            {roleBadge.label}
                                                        </span>
                                                    </div>
                                                    {u.sharedProjects?.length > 0 ? (
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                            Shared: {u.sharedProjects.map(p => p.title).join(', ')}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                            {u.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                disabled={isStartingDirect}
                                                className="shrink-0 p-2 bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white rounded-lg transition-colors"
                                                title="Open conversation"
                                            >
                                                <UserPlus size={14} />
                                            </button>
                                        </div>
                                    );
                                })
                            ) : !isSearchingUsers ? (
                                <div className="p-6 text-center text-slate-400 text-xs">
                                    No hierarchy-authorized contacts match "{userSearchQuery}".
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        /* Room List (Project Groups or Direct Messages) */
                        <>
                            {displayRooms.length > 0 ? (
                                displayRooms.map(room => {
                                    const isSelected = activeRoom?.id === room.id || activeRoom?._id === room.id;
                                    const isDirect = room.roomType === 'DIRECT';
                                    const roleBadge = isDirect && room.otherUser?.role ? getRoleBadgeStyle(room.otherUser.role) : null;

                                    return (
                                        <div 
                                            key={room.id} 
                                            onClick={() => setActiveRoom(room)} 
                                            className={`p-3.5 border-b border-slate-50 cursor-pointer hover:bg-white transition-all flex gap-3 ${
                                                isSelected ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : ''
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-sm ${
                                                    isSelected 
                                                        ? 'bg-blue-600 text-white' 
                                                        : isDirect ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-white border border-slate-200 text-slate-600'
                                                }`}>
                                                    {isDirect ? (room.otherUser?.fullName?.[0] || 'U') : (room.name?.[0] || 'P')}
                                                </div>
                                                {room.unreadCount > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-bounce shadow">
                                                        {room.unreadCount}
                                                    </div>
                                                )}
                                                {isDirect && (
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                                        room.otherUser?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                                    }`} />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <h4 className={`font-bold text-xs truncate ${isSelected ? 'text-blue-600' : 'text-slate-800'}`}>
                                                            {isDirect ? (room.otherUser?.fullName || room.name) : room.name}
                                                        </h4>
                                                        {roleBadge && (
                                                            <span className={`px-1 py-0.2 rounded text-[7px] font-black border ${roleBadge.bg}`}>
                                                                {roleBadge.label}
                                                            </span>
                                                        )}
                                                        {room.isArchived && (
                                                            <span className="px-1 py-0.2 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[7px] font-bold">
                                                                ARCHIVED
                                                            </span>
                                                        )}
                                                    </div>
                                                    {room.lastMessage && (
                                                        <span className="text-[8px] font-bold text-slate-400 shrink-0 ml-1">
                                                            {new Date(room.lastMessage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                                {room.lastMessage ? (
                                                    <div className="flex items-center gap-1.5 italic text-[10px] text-slate-400 truncate">
                                                        <span className="px-1 py-0.2 bg-slate-100 text-slate-600 rounded text-[7px] font-black uppercase">
                                                            {room.lastMessage.sender?.split(' ')[0] || 'User'}
                                                        </span>
                                                        <span className="truncate">{room.lastMessage.text}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-slate-400 italic">No messages yet</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    {activeTab === 'PROJECT_GROUP' 
                                        ? 'No project group conversations available.'
                                        : 'No direct conversations yet. Use the search bar above to start private chats.'}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Chat Conversation Area */}
            <div className={`flex-1 flex flex-col bg-white ${activeRoom ? 'flex' : 'hidden md:flex'}`}>
                {activeRoom ? (
                    <>
                        {/* Conversation Header */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveRoom(null)}
                                    className="md:hidden p-2 -ml-2 text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <div className="relative">
                                    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                                        activeRoom.roomType === 'DIRECT' ? 'bg-indigo-600' : 'bg-blue-600'
                                    }`}>
                                        {activeRoom.roomType === 'DIRECT' 
                                            ? (activeRoom.otherUser?.fullName?.[0] || 'U') 
                                            : (activeRoom.name?.[0] || 'P')}
                                    </div>
                                    {activeRoom.roomType === 'DIRECT' && (
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                            activeRoom.otherUser?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                        }`} />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-slate-800 text-sm md:text-base uppercase tracking-tight truncate max-w-[200px] md:max-w-none">
                                            {activeRoomName}
                                        </h3>
                                        {activeRoomBadge && (
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${activeRoomBadge.bg}`}>
                                                {activeRoomBadge.label}
                                            </span>
                                        )}
                                        {activeRoom.isArchived && (
                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-[8px] font-black">
                                                READ ONLY
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        {activeRoom.roomType === 'DIRECT' ? (
                                            activeRoom.otherUser?.isOnline ? (
                                                <span className="text-emerald-600 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                    ONLINE
                                                </span>
                                            ) : (
                                                <span>SECURE DIRECT CHANNEL</span>
                                            )
                                        ) : (
                                            <span className="text-blue-600 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                                PROJECT FREQUENCY{groupParticipants.length > 0 ? ` • ${groupParticipants.length} MEMBERS` : ''}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Group Members Button */}
                            {activeRoom.roomType !== 'DIRECT' && (
                                <button
                                    onClick={() => setShowParticipantsModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/80 rounded-lg text-slate-700 font-bold text-xs shadow-xs transition-all duration-150 cursor-pointer shrink-0"
                                    title="View all group participants"
                                >
                                    <Users size={15} className="text-blue-600" />
                                    <span className="hidden sm:inline font-semibold">Members</span>
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full">
                                        {groupParticipants.length}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Group Participants Quick Bar */}
                        {activeRoom.roomType !== 'DIRECT' && groupParticipants.length > 0 && (
                            <div className="bg-slate-50/90 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 overflow-hidden py-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                                        <Users size={12} className="text-slate-400" />
                                        Members:
                                    </span>
                                    <div className="flex items-center -space-x-1.5 shrink-0">
                                        {groupParticipants.slice(0, 5).map((p) => {
                                            const roleInfo = getRoleBadgeStyle(p.role);
                                            return (
                                                <div
                                                    key={p.userId || p.id}
                                                    className="relative w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-700 shadow-xs"
                                                    title={`${p.fullName} (${roleInfo.label})`}
                                                >
                                                    {p.avatar ? (
                                                        <img src={getServerUrl(p.avatar)} alt={p.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{(p.fullName || 'U').charAt(0).toUpperCase()}</span>
                                                    )}
                                                    {p.isOnline && (
                                                        <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full border border-white" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <span className="text-[11px] text-slate-600 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                                        {groupParticipants.slice(0, 3).map(p => p.fullName).join(', ')}
                                        {groupParticipants.length > 3 ? ` +${groupParticipants.length - 3} more` : ''}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowParticipantsModal(true)}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap ml-2 shrink-0 cursor-pointer"
                                >
                                    View All ({groupParticipants.length})
                                </button>
                            </div>
                        )}

                        {/* Read-only Banner if room is archived */}
                        {activeRoom.isArchived && (
                            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-800 text-xs font-semibold">
                                <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                                <span>This conversation is archived and read-only. Current project assignments or hierarchy permissions no longer permit new messages. Historical messages are preserved.</span>
                            </div>
                        )}

                        {/* Message Feed */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/20 custom-scrollbar">
                            {messages.map((msg, idx) => (
                                <div key={msg.id || idx} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                    <div className="max-w-[75%] md:max-w-[65%] group relative">
                                        {!msg.isMe && (
                                            <div className="flex items-center gap-1.5 mb-1 px-1">
                                                <span className="text-[10px] font-black text-slate-800 uppercase">{msg.sender}</span>
                                                <span className="px-1 py-0.2 bg-slate-100 text-slate-500 rounded text-[7px] font-black italic">{msg.role}</span>
                                            </div>
                                        )}
                                        <div className={`rounded-2xl overflow-hidden shadow-sm border ${
                                            msg.isMe 
                                                ? 'bg-blue-600 text-white border-blue-500 rounded-br-none' 
                                                : 'bg-white text-slate-700 border-slate-100 rounded-bl-none'
                                        } ${msg.attachments?.some(a => isImage(a.url)) && !msg.text ? 'p-1' : 'p-3'}`}>
                                            {/* Attachments rendering */}
                                            {msg.attachments?.map((att, i) => {
                                                const isImg = isImage(att.url);
                                                if (isImg) {
                                                    const isRemote = att.url?.startsWith('http');
                                                    const isBlobOrData = att.url?.startsWith('blob:') || att.url?.startsWith('data:');
                                                    const isLocalFile = !isRemote && !isBlobOrData;
                                                    const showPlaceholder = att.isPending === true || (isLocalFile && !att.failed);
                                                    const isFailed = !showPlaceholder && (isLocalFile || att.failed === true);

                                                    return (
                                                        <div key={i} className="mb-2 last:mb-0 relative group/img cursor-pointer" onClick={() => !showPlaceholder && !isFailed && setLightboxImage(att)}>
                                                            {showPlaceholder ? (
                                                                <div className="w-64 h-48 bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-2 border border-slate-200 border-dashed animate-pulse">
                                                                    <Loader className="animate-spin text-blue-500" size={24} />
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Syncing Attachment...</span>
                                                                </div>
                                                            ) : isFailed ? (
                                                                <div className="w-64 h-48 flex flex-col items-center justify-center p-4 bg-red-50 text-red-500 rounded-xl border border-red-100">
                                                                    <AlertCircle size={28} className="mb-1 text-red-500" />
                                                                    <span className="text-xs text-center font-black uppercase">Upload Failed</span>
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
                                                                            size={28} 
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

                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={() => downloadFile(att.url, att.name)}
                                                        className={`flex items-center gap-3 p-2.5 mb-2 last:mb-0 rounded-xl border cursor-pointer transition-all hover:bg-opacity-80 active:scale-[0.98] ${
                                                            msg.isMe ? 'bg-blue-700/50 border-blue-400/30' : 'bg-slate-50 border-slate-100'
                                                        }`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                            msg.isMe ? 'bg-blue-500' : 'bg-white shadow-sm border border-slate-200'
                                                        }`}>
                                                            <Paperclip size={16} className={msg.isMe ? 'text-white' : 'text-slate-400'} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-[11px] font-black truncate leading-tight ${msg.isMe ? 'text-white' : 'text-slate-800'}`}>
                                                                {att.name}
                                                            </div>
                                                            <div className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${msg.isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                                                {att.name.split('.').pop() || 'FILE'} • Download
                                                            </div>
                                                        </div>
                                                        <Download size={14} className={msg.isMe ? 'text-blue-200' : 'text-slate-300'} />
                                                    </div>
                                                );
                                            })}

                                            {msg.text && (
                                                <p className={`text-xs md:text-sm font-semibold leading-relaxed ${
                                                    msg.attachments?.length > 0 ? 'mt-2 border-t pt-2 ' + (msg.isMe ? 'border-blue-500/30' : 'border-slate-50') : ''
                                                }`}>
                                                    {msg.text}
                                                </p>
                                            )}

                                            {/* Status and timestamp footer */}
                                            <div className="flex items-center justify-end gap-1.5 mt-1">
                                                <span className={`text-[8px] font-black uppercase tracking-widest opacity-70 ${
                                                    msg.attachments?.some(a => isImage(a.url)) && !msg.text 
                                                        ? 'px-2 py-0.5 bg-black/30 backdrop-blur-md rounded text-white shadow-sm' 
                                                        : ''
                                                }`}>
                                                    {msg.time}
                                                </span>
                                                {msg.isMe && (
                                                    msg.pending ? (
                                                        <Clock size={10} className="animate-spin text-blue-200" />
                                                    ) : msg.failed ? (
                                                        <button 
                                                            onClick={() => handleRetryMessage(msg)}
                                                            className="flex items-center gap-0.5 text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black hover:bg-red-200"
                                                            title="Failed. Click to retry."
                                                        >
                                                            <RotateCcw size={10} />
                                                            <span>Retry</span>
                                                        </button>
                                                    ) : (
                                                        <Check size={10} className="text-blue-200" />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input bar */}
                        <div className="p-3 md:p-4 bg-white border-t border-slate-100 sticky bottom-0">
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3 max-w-4xl mx-auto px-1">
                                    {attachments.map((att, i) => {
                                        const isImg = isImage(att.url);
                                        return (
                                            <div key={att.id || i} className="relative group animate-in zoom-in duration-200">
                                                {isImg ? (
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-200 relative">
                                                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                                        {att.isPending && (
                                                            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white text-[8px] font-black">
                                                                <Loader size={10} className="animate-spin mb-0.5 text-blue-400" />
                                                                <span>{att.progress}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 bg-slate-100 p-2 pr-7 rounded-lg border border-slate-200 text-[10px] font-bold uppercase tracking-tight relative">
                                                        <Paperclip size={12} className="text-blue-600" />
                                                        <span className="truncate max-w-[100px]">{att.name}</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => removeAttachment(i)}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-all z-10"
                                                >
                                                    <X size={10} strokeWidth={3} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {activeRoom.isArchived ? (
                                <div className="text-center py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-xl border border-slate-200">
                                    Conversation is archived (Read-Only)
                                </div>
                            ) : (
                                <div className="flex gap-2 items-center">
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        disabled={attachments.length >= 10} 
                                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-100 transition-all"
                                    >
                                        <Paperclip size={18} />
                                    </button>
                                    <div className="flex-1 relative">
                                        <input 
                                            type="text" 
                                            placeholder="Write message..." 
                                            value={newMessage} 
                                            onChange={(e) => setNewMessage(e.target.value)} 
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }} 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-xs md:text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner" 
                                        />
                                        <button 
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <Smile size={18} />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-full right-0 mb-3 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 grid grid-cols-6 gap-2 z-[100]">
                                                {commonEmojis.map(e => (
                                                    <button 
                                                        key={e} 
                                                        onClick={() => { setNewMessage(p => p + e); setShowEmojiPicker(false); }} 
                                                        className="text-lg hover:bg-slate-50 p-1 rounded-lg transition-all active:scale-125"
                                                    >
                                                        {e}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => handleSend()} 
                                        disabled={isSending || (!newMessage.trim() && attachments.length === 0) || attachments.some(a => a.isPending)}
                                        className={`p-2.5 md:p-3 rounded-xl shadow-md transition-all ${
                                            !isSending && (newMessage.trim() || attachments.length > 0) && !attachments.some(a => a.isPending) 
                                                ? 'bg-blue-600 text-white scale-105 active:scale-95' 
                                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                        }`}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-60">
                        <MessageSquare size={44} className="text-slate-300 mb-3" />
                        <h3 className="text-sm font-black uppercase text-slate-700">No Conversation Selected</h3>
                        <p className="text-slate-400 font-semibold text-xs mt-1 max-w-xs">
                            Select a project group frequency or search hierarchy contacts to initiate private messaging.
                        </p>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
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

            {/* Group Participants Modal */}
            {showParticipantsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                                    <Users size={18} className="text-blue-600" />
                                    Group Participants
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {loadingParticipants && groupParticipants.length === 0
                                        ? 'Loading members...'
                                        : `${groupParticipants.length} total members in this project frequency`}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowParticipantsModal(false);
                                    setParticipantSearch('');
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Filter */}
                        <div className="p-4 border-b border-slate-100 bg-white">
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={participantSearch}
                                    onChange={(e) => setParticipantSearch(e.target.value)}
                                    placeholder="Search participants by name or role..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                {participantSearch && (
                                    <button
                                        onClick={() => setParticipantSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Participants List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {loadingParticipants && groupParticipants.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    Loading participants...
                                </div>
                            ) : filteredParticipants.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs">
                                    {participantSearch.trim()
                                        ? `No participants found matching "${participantSearch}"`
                                        : 'No participants found in this group'}
                                </div>
                            ) : (
                                filteredParticipants.map((p) => {
                                    const roleBadge = getRoleBadgeStyle(p.role);
                                    const isMe = String(p.userId) === String(user?._id);
                                    return (
                                        <div
                                            key={p.userId || p.id}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="relative shrink-0">
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm shadow-xs border border-slate-100">
                                                        {p.avatar ? (
                                                            <img
                                                                src={getServerUrl(p.avatar)}
                                                                alt={p.fullName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span>{(p.fullName || 'U').charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                                            p.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                                        }`}
                                                        title={p.isOnline ? 'Online' : 'Offline'}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 text-sm truncate">
                                                            {p.fullName}
                                                        </span>
                                                        {isMe && (
                                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                                                                YOU
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        {p.email || (p.isOnline ? 'Active Now' : 'Offline')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge.bg}`}>
                                                    {roleBadge.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowParticipantsModal(false);
                                    setParticipantSearch('');
                                }}
                                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
