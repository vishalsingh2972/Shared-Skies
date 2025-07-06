'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, router]);

  if (!isSignedIn) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
  }

  // Mood categories for selection
  const moodCategories = [
    "Loneliness & Isolation",
    "Relationships & Dating",
    "Career & Work Life",
    "Anxiety & Stress",
    "Self-Discovery",
    "Hobbies & Interests",
    "Life Transitions",
    "Need to Vent",
    "Celebrating Good News",
    "Deep Conversations"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Shared Skies</h1>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 hidden sm:block">
              Hi, {user?.firstName || "Friend"}!
            </div>
            <img
              src={user?.imageUrl}
              alt="User profile"
              className="w-8 h-8 rounded-full"
            />
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
            {moodCategories.map((mood, index) => (
              <button
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
                onClick={() => console.log(`Selected mood: ${mood}`)}
              >
                <div className="text-lg font-medium text-gray-900">{mood}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}