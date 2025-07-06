'use client';

import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Loading from '../../../loading';

export default function ChatRoomPage() {
  const { roomId } = useParams();
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  const [room, setRoom] = useState<{ id: string; mood: string } | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

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

  const handleSendMessage = () => {
    if (socket && newMessage.trim()) {
      const payload = {
        roomId,
        message: newMessage,
        sender: user?.fullName || 'Anonymous',
        photo: user?.imageUrl || null,
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
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-blue-600 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white text-center flex-1">
          {room.mood}
        </h1>
        <button
          onClick={handleLeaveRoom}
          className="bg-red-500 text-white rounded px-3 py-1 hover:bg-red-600 ml-4"
        >
          Leave Room
        </button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className="bg-gray-200 rounded p-2 text-gray-900">
              {typeof msg === 'string' ? msg : msg.message}
            </div>
          ))}
        </div>
      </main>

      <footer className="p-4 bg-gray-100 border-t flex gap-2">
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
          className="flex-1 border rounded p-2 text-gray-900 placeholder-gray-500"
          placeholder="Type your message..."
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600"
        >
          Send
        </button>
      </footer>
    </div>
  );
}