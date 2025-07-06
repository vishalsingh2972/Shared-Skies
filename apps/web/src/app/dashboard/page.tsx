'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Loading from '../loading';

export default function DashboardPage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, router]);

  if (!isSignedIn) {
    return <Loading />;
  }

  const moodCategories = [
    { name: "Loneliness & Isolation", hoverColor: "hover:bg-purple-100" },
    { name: "Relationships & Dating", hoverColor: "hover:bg-pink-100" },
    { name: "Career & Work Life", hoverColor: "hover:bg-blue-100" },
    { name: "Anxiety & Stress", hoverColor: "hover:bg-red-100" },
    { name: "Self-Discovery", hoverColor: "hover:bg-yellow-100" },
    { name: "Hobbies & Interests", hoverColor: "hover:bg-green-100" },
    { name: "Life Transitions", hoverColor: "hover:bg-orange-100" },
    { name: "Need to Vent", hoverColor: "hover:bg-gray-100" },
    { name: "Celebrating Good News", hoverColor: "hover:bg-emerald-100" },
    { name: "Deep Conversations", hoverColor: "hover:bg-indigo-100" },
    { name: "Health & Wellness", hoverColor: "hover:bg-teal-100" },
    { name: "Family & Parenting", hoverColor: "hover:bg-rose-100" },
  ];

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
            <UserButton/>
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
                className={`bg-white border border-gray-200 rounded-lg p-6 text-center transition-all duration-200 ${mood.hoverColor}`}
                onClick={() => console.log(`Selected mood: ${mood.name}`)}
              >
                <div className="text-lg font-medium text-gray-900">{mood.name}</div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}