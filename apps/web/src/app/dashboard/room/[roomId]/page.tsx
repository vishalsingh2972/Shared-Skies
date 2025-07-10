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
  message: string;
  sender: string;
  photo?: string;
  userId?: string;
  timestamp?: string;
  reactions?: Record<string, ReactionData>;
};

type User = {
  id: string;
  name: string;
  photo?: string;
};

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
      
      // Join room with user data
      newSocket.emit('joinRoom', roomId, {
        userId: user.id,
        name: user.fullName,
        photo: user.imageUrl
      });

      newSocket.on('chatMessage', (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      });

      newSocket.on('emojiReaction', (reaction) => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.message === reaction.messageContent && msg.sender === reaction.originalSender) {
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
        messageContent: msg.message,
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
        <div className="flex items-center gap-2">
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
          <button
            onClick={handleLeaveRoom}
            className="bg-white text-indigo-700 rounded-full px-4 py-2 hover:bg-indigo-100 transition duration-200 flex items-center"
          >
            <span>Leave Room</span>
          </button>
        </div>
      </header>

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl animate-fadeIn max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Room Stats</h3>
              <button
                onClick={togglePopup}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Online Users ({onlineUsers.length})</h4>
                <div className="space-y-3">
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      {user.photo ? (
                        <img
                          src={user.photo}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-lg">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">Active now</p>
                      </div>
                      {user.id === user?.id && (
                        <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 overflow-y-auto bg-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Welcome to the chat!</h2>
            <p className="text-gray-600">
              This is a {room.mood.toLowerCase()} themed room. Be respectful and enjoy the conversation!
            </p>
          </div>

          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${msg.userId && userColors[msg.userId] ? userColors[msg.userId] : 'bg-gray-100 border-gray-300'
                  } transition-all duration-300 hover:shadow-md relative group`}
              >
                <div className="flex items-start gap-3">
                  {msg.photo && (
                    <img
                      src={msg.photo}
                      alt={msg.sender}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <div className="font-semibold text-gray-800">{msg.sender}</div>
                        {msg.userId === user?.id && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      {msg.timestamp && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-gray-700">{msg.message}</div>
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(msg.reactions).map(([emoji, data]) => (
                          <div
                            key={emoji}
                            className="bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-sm flex items-center gap-1 cursor-pointer"
                            onClick={() => handleEmojiClick(msg, emoji)}
                          >
                            <span>{emoji}</span>
                            <span className="text-gray-600">{(data as ReactionData).count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute top-12 right-0 opacity-0 group-hover:opacity-100 transition bg-white rounded-full shadow-md p-1 flex gap-1">
                  {['❤️', '😂', '👍', '😮', '🔥'].map((emoji) => (
                    <button
                      key={emoji}
                      className="text-lg hover:scale-125 transition-transform"
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
            <button
              onClick={handleSendMessage}
              className="bg-indigo-600 text-white rounded-full px-6 py-3 hover:bg-indigo-700 transition duration-200 flex items-center justify-center"
            >
              <span>Send</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}