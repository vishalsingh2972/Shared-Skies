'use client';

import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import Loading from '../../../loading';

const USER_COLORS = [
  'bg-blue-100 border-blue-300',
  'bg-green-100 border-green-300',
  'bg-yellow-100 border-yellow-300',
  'bg-purple-100 border-purple-300'
];

type ReactionData = {
  count: number;
  users: any[];
};

type Message = {
  id?: string;
  message?: string;
  sender: string;
  photo?: string;
  userId?: string;
  timestamp?: string;
  reactions?: Record<string, ReactionData>;
  audioData?: string; // Base64 audio data
  isAudio?: boolean;
};

type User = {
  id: string;
  name: string;
  photo?: string;
  userId?: string;
};

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export default function ChatRoomPage() {
  const { roomId } = useParams();
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  const [room, setRoom] = useState<{ id: string; mood: string } | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userColors, setUserColors] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const popupRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showMicTip, setShowMicTip] = useState(false);
  const [isMicHovered, setIsMicHovered] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Convert base64 to blob URL
  const base64ToBlob = (base64Data: string, contentType: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:audio/wav;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    try {
      setShowMicTip(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      setMediaRecorder(recorder);

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });

        try {
          const base64Data = await blobToBase64(audioBlob);

          if (socket) {
            const payload = {
              roomId,
              audioData: base64Data,
              sender: user?.fullName || 'Anonymous',
              photo: user?.imageUrl || null,
              userId: user?.id || null,
              timestamp: new Date().toISOString(),
              isAudio: true
            };
            socket.emit('audioMessage', payload);
          }
        } catch (error) {
          console.error('Error processing audio:', error);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      // Auto-stop recording after 2 minutes
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 120000);

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setShowMicTip(false);
    }
  };

  // Get or create audio URL for a message
  const getAudioUrl = (msg: Message, index: number) => {
    const key = `${msg.userId}_${index}_${msg.timestamp}`;

    if (audioUrls.has(key)) {
      return audioUrls.get(key);
    }

    if (msg.audioData) {
      const blob = base64ToBlob(msg.audioData, 'audio/webm');
      const url = URL.createObjectURL(blob);
      setAudioUrls(prev => new Map(prev).set(key, url));
      return url;
    }

    return null;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        const data = await res.json();
        if (res.ok) {
          setRoom(data);
        } else {
          console.error(data.error);
        }
      } catch (error) {
        console.error('Failed to fetch room:', error);
      } finally {
        setLoadingRoom(false);
      }
    };

    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (roomId && user) {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL as string);
      setSocket(newSocket);

      newSocket.emit('joinRoom', roomId, {
        userId: user.id,
        name: user.fullName,
        photo: user.imageUrl
      });

      newSocket.on('chatMessage', (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      });

      newSocket.on('audioMessage', (audioMsg: Message) => {
        console.log('Received audio message:', audioMsg);
        setMessages((prev) => [...prev, audioMsg]);
      });

      newSocket.on('emojiReaction', (reaction) => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.id === reaction.messageId) {
              const currentReactions = msg.reactions || {};
              currentReactions[reaction.emoji] = {
                count: reaction.count,
                users: reaction.users
              };
              return { ...msg, reactions: currentReactions };
            }
            return msg;
          })
        );
      });

      newSocket.on('typing', (payload) => {
        setTypingUser(payload.user);
      });

      newSocket.on('stopTyping', () => {
        setTypingUser(null);
      });

      newSocket.on('currentUsers', (users: User[]) => {
        setOnlineUsers(users);
      });

      return () => {
        newSocket.emit('leaveRoom', roomId);
        newSocket.disconnect();
      };
    }
  }, [roomId, user]);

  // Fetch old messages from DB and set them as initial state
  useEffect(() => {
    const fetchOldMessages = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/api/messages/${roomId}`);
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.error('Unexpected response:', data);
          return;
        }

        // Transform DB format to UI message format
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id,
          message: msg.content === '[Audio Message]' ? '' : msg.content,
          sender: msg.user?.username || 'Anonymous',
          photo: msg.user?.photo || undefined,
          userId: msg.userClerkId,
          timestamp: msg.createdAt,
          isAudio: msg.content === '[Audio Message]'
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Failed to fetch old messages:', error);
      }
    };

    if (roomId) fetchOldMessages();
  }, [roomId]);


  useEffect(() => {
    const newUserColors = { ...userColors };
    let changed = false;
    messages.forEach((msg) => {
      if (msg.userId && !newUserColors[msg.userId]) {
        const colorIndex = [...msg.userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % USER_COLORS.length;
        newUserColors[msg.userId] = USER_COLORS[colorIndex];
        changed = true;
      }
    });
    if (changed) setUserColors(newUserColors);
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup audio URLs when component unmounts
  useEffect(() => {
    return () => {
      audioUrls.forEach(url => URL.revokeObjectURL(url));
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
    };
  }, [audioUrls, mediaRecorder, isRecording]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (socket && newMessage.trim()) {
      const payload = {
        roomId,
        message: newMessage,
        sender: user?.fullName || 'Anonymous',
        photo: user?.imageUrl || null,
        userId: user?.id || null,
        timestamp: new Date().toISOString()
      };
      socket.emit('chatMessage', payload);
      setNewMessage('');
      socket.emit('stopTyping', { roomId, user: user?.fullName });
    }
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom', roomId);
      socket.disconnect();
    }
    router.push('/dashboard');
  };

  const handleEmojiClick = (msg: Message, emoji: string) => {
    if (socket) {
      const payload = {
        roomId,
        messageId: msg.id || null,
        emoji,
        messageContent: msg.message || '[Audio Message]',
        sender: user?.fullName || 'Anonymous',
        originalSender: msg.sender,
        userId: user?.id || null,
      };
      socket.emit('emojiReaction', payload);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (socket) {
      socket.emit('typing', { roomId, user: user?.fullName });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { roomId, user: user?.fullName });
      }, 2000);
    }
  };

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  if (!isSignedIn) return <Loading />;
  if (loadingRoom) return <div className="p-4 text-center">Loading room...</div>;
  if (!room) return <div className="p-4 text-center">Room not found.</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold text-white text-center flex-1">
          {room.mood} Room
        </h1>
        <div className="flex items-center gap-8 relative">
          <button
            onClick={togglePopup}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full p-2 transition duration-200 flex items-center justify-center relative"
          >
            <span className="w-5 h-5 flex items-center justify-center">ℹ️</span>
            <span className="absolute -top-1 -right-1 h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </button>

          {showPopup && (
            <div
              ref={popupRef}
              className="absolute right-0 top-12 z-50 bg-white rounded-lg shadow-lg w-64 max-h-96 overflow-y-auto animate-fadeIn"
            >
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">ONLINE USERS ({onlineUsers.length})</h3>
              </div>
              <div className="p-3">
                <div className="space-y-2">
                  {onlineUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 p-1">
                      {u.photo ? (
                        <img
                          src={u.photo}
                          alt={u.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {u.name}
                        {u.userId === user?.id && <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                          You
                        </span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLeaveRoom}
            className="bg-white text-indigo-700 rounded-full px-4 py-2 transition duration-200 flex items-center 
             hover:bg-red-500 hover:text-white active:bg-red-600 active:text-white"
          >
            <span>Leave Room</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto bg-gray-100">
        <div className="space-y-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`group p-3 rounded-lg relative ${msg.userId === user?.id ?
                'ml-auto bg-indigo-100 max-w-[80%]' :
                'mr-auto bg-white max-w-[80%]'} 
                border border-gray-100 transition-all duration-200 hover:border-gray-200`}
            >
              <div className="flex items-start gap-3">
                {msg.photo && (
                  <img
                    src={msg.photo}
                    alt={msg.sender}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-800">
                      {msg.sender}
                      {msg.userId === user?.id && (
                        <span className="ml-1 text-xs font-normal text-gray-600"> (You)</span>
                      )}
                    </div>
                    {msg.timestamp && (
                      <span className="text-xs text-gray-600">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    )}
                  </div>

                  {msg.isAudio && msg.audioData && (
                    <div className="mt-2">
                      <audio
                        controls
                        src={getAudioUrl(msg, idx) || undefined}
                        className="w-full max-w-xs"
                        preload="metadata"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Voice message
                      </div>
                    </div>
                  )}

                  {msg.message && (
                    <>
                      <div className="mt-1 text-gray-800">
                        {msg.message}
                      </div>
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries(msg.reactions).map(([emoji, data]) => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiClick(msg, emoji)}
                              className="text-xs px-1.5 py-0.5 rounded-full bg-white border border-gray-200 
        hover:bg-gray-50 flex items-center gap-0.5 transition-colors"
                            >
                              <span className="text-xs">{emoji}</span>
                              <span className="text-[0.65rem] font-medium text-black">{(data as ReactionData).count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Emoji Reaction Buttons (appear on hover) */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {['❤️', '😂', '👍', '😮', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    className="text-xs hover:scale-125 transition-transform bg-white rounded-full p-1 shadow-sm"
                    onClick={() => handleEmojiClick(msg, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-4 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto">
          {typingUser && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
              <span className="ml-2 text-red-600 font-medium">
                {typingUser} is typing...
              </span>
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black"
              placeholder="Type your message..."
            />
            <div className="relative group">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseEnter={() => setIsMicHovered(true)}
                onMouseLeave={() => setIsMicHovered(false)}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`p-3 rounded-full ${isRecording
                  ? 'bg-red-500 animate-pulse'
                  : isMicHovered
                    ? 'bg-gray-600'
                    : 'bg-black hover:bg-gray-700'
                  } transition duration-200 flex items-center justify-center`}
                aria-label="Hold to record audio"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
              {!isRecording && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Press & hold to record
                </div>
              )}
              {isRecording && (
                <div className="absolute -top-2 -right-2 flex items-center">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleSendMessage}
              className="bg-indigo-600 text-white rounded-full px-6 py-3 hover:bg-indigo-700 transition duration-200 flex items-center justify-center"
            >
              <span>Send</span>
            </button>
          </div>
          {showMicTip && (
            <div className="mt-2 text-center text-sm text-gray-500">
              Hold to record, release to send
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}