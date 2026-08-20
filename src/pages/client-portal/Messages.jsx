import { Send, User, MessageCircle, Search, Paperclip, Phone, MoreVertical, Menu, Loader, Users, X, Download, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/notificationSound';
import { isImage, toLocalBlobUrl, revokeLocalBlobUrl, compressImage } from '../../utils/chatAttachmentUtils';

const Messages = () => {
  const { user, socket } = useAuth();
  const [activeChat, setActiveChatState] = useState(() => {
    return localStorage.getItem('activeClientChat') || null;
  });
  const setActiveChat = (id) => {
    setActiveChatState(id);
    if (id) {
      localStorage.setItem('activeClientChat', id);
    } else {
      localStorage.removeItem('activeClientChat');
    }
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchProjects();
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  useEffect(() => {
    if (activeChat) {
      fetchChatHistory(activeChat);
      fetchMembers(activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (!socket || !rooms || rooms.length === 0) return;

    const joinRooms = () => {
      rooms.forEach(room => {
        const rid = room.roomId || room.roomInfo?._id || room.roomInfo?.id || room.id || room._id;
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
    if (!socket) return;

    const handleNewMessage = (payload) => {
      if (!payload) return;
      const incomingRoomId = String(payload.roomId?._id || payload.roomId || '');
      const incomingProjectId = String(payload.projectId?._id || payload.projectId || '');
      const currentActiveProjectId = activeChatRef.current;

      console.log('[Client Messages Socket] new_message:', payload);

      if (currentActiveProjectId && (incomingProjectId === currentActiveProjectId || incomingRoomId === currentActiveProjectId)) {
        setMessages(prev => {
          const currentMessages = Array.isArray(prev) ? prev : [];
          if (currentMessages.some(m => String(m._id || m.id) === String(payload._id || payload.id))) {
            return currentMessages;
          }
          return [...currentMessages, payload];
        });
        playSound('MESSAGE_RECEIVED');
        api.put(`/chat/mark-read/${incomingRoomId}`).catch(() => {});
      }
    };

    const handleMessageUpdated = (payload) => {
      if (!payload) return;
      const incomingRoomId = String(payload.roomId?._id || payload.roomId || '');
      const incomingProjectId = String(payload.projectId?._id || payload.projectId || '');
      const currentActiveProjectId = activeChatRef.current;

      if (currentActiveProjectId && (incomingProjectId === currentActiveProjectId || incomingRoomId === currentActiveProjectId)) {
        setMessages(prev => {
          const currentMessages = Array.isArray(prev) ? prev : [];
          return currentMessages.map(m => {
            if (String(m._id || m.id) === String(payload._id || payload.id)) {
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

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
    };
  }, [socket]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(res.data);
      
      const saved = localStorage.getItem('activeClientChat');
      if (saved && (res.data || []).some(p => String(p._id) === String(saved))) {
        setActiveChatState(saved);
        return;
      }

      if (res.data.length > 0) {
        setActiveChat(res.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (projectId) => {
    try {
      const res = await api.get(`/projects/${projectId}/members`);
      setMembers(res.data);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchChatHistory = async (projectId) => {
    try {
      setLoadingChat(true);
      const res = await api.get(`/chat/${projectId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setLoadingChat(false);
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
      alert(`Failed to upload ${file.name}`);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const rawAttachments = attachments;
    const validAttachments = rawAttachments.filter(att => !att.isPending);
    const finalAttachments = validAttachments.map(att => ({
      name: att.name,
      url: att.url,
      fileType: att.fileType
    }));

    let messageContent = newMessage;
    if (messageContent.trim() === '' && finalAttachments.length > 0) {
      messageContent = `Sent ${finalAttachments.length} attachment(s)`;
    }

    if (messageContent.trim() === '' || !activeChat) return;

    const tempId = 'optimistic-' + Date.now().toString();
    const optimisticMsg = {
      _id: tempId,
      sender: { _id: user._id, fullName: user.fullName, role: user.role },
      message: messageContent,
      attachments: validAttachments.map(att => ({
        name: att.name,
        url: att.url,
        fileType: att.fileType
      })),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      const res = await api.post('/chat', {
        projectId: activeChat,
        message: messageContent,
        attachments: finalAttachments
      });

      setMessages(prev => prev.map(msg => msg._id === tempId ? {
        ...msg,
        _id: res.data._id,
        createdAt: res.data.createdAt
      } : msg));

      rawAttachments.forEach(att => {
        if (att.url && att.url.startsWith('blob:')) {
          revokeLocalBlobUrl(att.url);
        }
      });
      setAttachments([]);
      playSound('MESSAGE_SENT');
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentProject = projects.find(p => p._id === activeChat);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader className="animate-spin text-blue-600" size={40} />
          <p className="font-medium animate-pulse">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Sidebar List */}
      <div className={`absolute md:static inset-y-0 left-0 z-20 w-80 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex justify-between items-center">
            Messages
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400"><MoreVertical size={20} /></button>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredProjects.map((project) => (
            <div
              key={project._id}
              onClick={() => { setActiveChat(project._id); setSidebarOpen(false); }}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeChat === project._id ? 'bg-white shadow-sm border border-slate-100' : 'hover:bg-slate-100 border border-transparent'}`}
            >
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm border border-white/20 ${activeChat === project._id ? 'bg-blue-600' : 'bg-slate-400'}`}>
                  {project.name?.charAt(0)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`text-sm font-semibold truncate ${activeChat === project._id ? 'text-slate-900' : 'text-slate-700'}`}>{project.name}</h3>
                </div>
                <p className={`text-xs truncate ${activeChat === project._id ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
                  Project Channel
                </p>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-slate-400">No projects found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white w-full relative z-10 md:z-0">
        {/* Chat Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg">
              <Menu size={20} />
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold border border-blue-50 shadow-sm">
                {currentProject?.name?.charAt(0) || 'P'}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{currentProject?.name || 'Select Project'}</h3>
              <div className="flex items-center gap-2">
                <Users size={12} className="text-slate-400" />
                <p className="text-[10px] text-slate-500 font-medium">
                  {members.length} team members
                </p>
              </div>
            </div>
          </div>
        
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 scroll-smooth">
          {loadingChat ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader className="animate-spin text-blue-400" size={24} />
              <p className="text-xs font-medium">Syncing messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <MessageCircle size={32} />
              </div>
              <p className="text-sm font-medium">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isMe = msg.sender?._id === user?._id;
                const showSender = idx === 0 || messages[idx - 1].sender?._id !== msg.sender?._id;

                return (
                  <div key={msg._id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end max-w-[85%] md:max-w-[70%] gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mb-1 bg-slate-400 border border-white shadow-sm">
                          {msg.sender?.fullName?.charAt(0)}
                        </div>
                      )}
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && showSender && (
                          <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">
                            {msg.sender?.fullName} <span className="font-medium text-slate-400">({msg.sender?.role})</span>
                          </span>
                        )}
                        <div className={`px-5 py-3 rounded-2xl text-sm shadow-sm leading-relaxed
                                              ${isMe
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                          } ${msg.attachments?.some(a => isImage(a.url)) && !msg.message ? 'p-1' : ''}`}>
                          {msg.message && msg.message !== `Sent ${msg.attachments?.length || 0} attachment(s)` && (
                            <p>{msg.message}</p>
                          )}
                          {msg.attachments?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/20 flex flex-col gap-2">
                              {msg.attachments.map((att, i) => {
                                const isImg = isImage(att.url);
                                if (isImg) {
                                  const isRemote = att.url?.startsWith('http');
                                  const isBlobOrData = att.url?.startsWith('blob:') || att.url?.startsWith('data:');
                                  const isLocalFile = !isRemote && !isBlobOrData;
                                  
                                  // Show spinner when: explicitly pending OR URL is local file:// (can't load in browser)
                                  const showPlaceholder = att.isPending === true || (isLocalFile && !att.failed);
                                  // Show failed when not showing spinner AND (local file stuck OR explicitly failed)
                                  const isFailed = !showPlaceholder && (isLocalFile || att.failed === true);
                                  return (
                                    <div key={i} className="relative group/img cursor-pointer max-w-sm rounded-xl overflow-hidden" onClick={() => !showPlaceholder && !isFailed && setLightboxImage(att)}>
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
                                          <img src={att.url} alt={att.name} className="max-w-full rounded-xl object-contain bg-slate-100 max-h-72 w-full" loading="lazy" />
                                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors rounded-xl flex items-center justify-center">
                                            <Download className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-md hover:scale-110" size={24} onClick={(e) => { e.stopPropagation(); window.open(att.url, '_blank'); }} />
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <a key={i} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] bg-black/10 p-1.5 rounded-lg hover:bg-black/20 transition">
                                    <Paperclip size={12} /> {att.name}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] mt-1.5 px-1 font-medium ${isMe ? 'text-blue-600/60' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4 max-w-4xl mx-auto px-1">
              {attachments.map((att, i) => {
                const isImg = isImage(att.url);
                return (
                  <div key={att.id || i} className="relative group animate-in zoom-in duration-200">
                    {isImg ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-200 relative">
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        {att.isPending && (
                          <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white text-[9px] font-black">
                            <Loader size={12} className="animate-spin mb-1 text-blue-400" />
                            <span>{att.progress}%</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-100 p-2 pr-8 rounded-lg border border-slate-200 text-xs relative">
                        <Paperclip size={12} className="text-blue-500" />
                        <span className="truncate max-w-[150px]">{att.name}</span>
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
          <form onSubmit={handleSendMessage} className="flex gap-3 items-end max-w-4xl mx-auto">
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= 10}
              className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
            >
              <Paperclip size={20} />
            </button>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl flex items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all overflow-hidden">
              <input
                type="text"
                className="w-full bg-transparent px-4 py-3 text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={(!newMessage.trim() && attachments.length === 0) || attachments.some(a => a.isPending)}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
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

export default Messages;
