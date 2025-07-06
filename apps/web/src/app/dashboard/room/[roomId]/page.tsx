'use client';

import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Loading from '../../../loading';

export default function ChatRoomPage() {
  const { roomId } = useParams();
  const { isSignedIn } = useUser();
  const [room, setRoom] = useState<{ id: string; mood: string } | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<string[]>([]);
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

      newSocket.on('chatMessage', (msg: string) => {
        setMessages((prev) => [...prev, msg]);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [roomId]);

  const handleSendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit('chatMessage', { roomId, message: newMessage });
      setNewMessage('');
    }
  };

  if (!isSignedIn) return <Loading />;
  if (loadingRoom) return <div className="p-4 text-center">Loading room...</div>;
  if (!room) return <div className="p-4 text-center">Room not found.</div>;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-blue-600 p-4">
        <h1 className="text-xl font-bold text-white text-center">
          {room.mood}
        </h1>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className="bg-gray-200 rounded p-2 text-gray-900">
              {msg}
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