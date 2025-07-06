'use client';

import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import Loading from '../../../loading';

// Color options for user messages
const USER_COLORS = [
  'bg-blue-100 border-blue-300',
  'bg-green-100 border-green-300',
  'bg-yellow-100 border-yellow-300',
  'bg-purple-100 border-purple-300'
];

export default function ChatRoomPage() {
  const { roomId } = useParams();
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  
  const [room, setRoom] = useState<{ id: string; mood: string } | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Store user color assignments
  const [userColors, setUserColors] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (roomId) {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL as string);
      setSocket(newSocket);

      newSocket.emit('joinRoom', roomId);

      newSocket.on('chatMessage', (msg) => {
        console.log('📥 Received message from server:', msg);
        setMessages((prev) => [...prev, msg]);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [roomId]);

  // Assign colors to users when they appear in messages
  useEffect(() => {
    const newUserColors = { ...userColors };
    let changed = false;
    
    messages.forEach(msg => {
      if (msg.userId && !newUserColors[msg.userId]) {
        // Assign a color based on user ID hash
        const colorIndex = [...msg.userId].reduce((sum, char) => 
          sum + char.charCodeAt(0), 0) % USER_COLORS.length;
        newUserColors[msg.userId] = USER_COLORS[colorIndex];
        changed = true;
      }
    });
    
    if (changed) {
      setUserColors(newUserColors);
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (socket && newMessage.trim()) {
      const payload = {
        roomId,
        message: newMessage,
        sender: user?.fullName || 'Anonymous',
        photo: user?.imageUrl || null,
        userId: user?.id || null,
      };
      console.log('📤 Sending message payload:', payload);
      socket.emit('chatMessage', payload);
      setNewMessage('');
    }
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom', roomId);
      socket.disconnect();
    }
    router.push('/dashboard');
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
        <button
          onClick={handleLeaveRoom}
          className="bg-white text-indigo-700 rounded-full px-4 py-2 hover:bg-indigo-100 transition duration-200 flex items-center"
        >
          <span>Leave Room</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
        </button>
      </header>

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
                className={`p-3 rounded-lg border ${msg.userId && userColors[msg.userId] ? userColors[msg.userId] : 'bg-gray-100 border-gray-300'} transition-all duration-300 hover:shadow-md`}
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
                    <div className="flex items-baseline">
                      <div className="font-semibold text-gray-800">{msg.sender}</div>
                      {msg.userId === user?.id && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-gray-700">{msg.message}</div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <footer className="p-4 bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}