'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loading from '../loading';

export default function DashboardPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [rooms, setRooms] = useState<{ id: string; mood: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, router]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        setRooms(data);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (!isSignedIn) return <Loading />;
  if (loading) return <div className="p-4 text-center">Loading rooms...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Shared Skies</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 hidden sm:block">
              Hi, {user?.firstName || "Friend"}!
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user?.firstName || user?.username || 'Friend'}!
          </h1>
        </div>

        {/* Mood selection section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              How are you feeling today?
            </h2>
            <p className="text-gray-600">
              Choose a mood to connect with others who feel the same
            </p>
          </div>

          {/* Mood buttons grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <button
                key={room.id}
                className="bg-white border border-gray-200 rounded-lg p-6 text-center transition-all duration-200 hover:bg-gray-100"
                onClick={() => router.push(`/dashboard/room/${room.id}`)}
              >
                <div className="text-lg font-medium text-gray-900">{room.mood}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}