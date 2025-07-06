'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push('/dashboard');
    }
  }, [isSignedIn, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center gap-8 p-8">
      <h1 className="text-5xl font-bold">Shared Skies</h1>
      <p className="text-lg text-gray-600 max-w-xl">
        Connect with people who understand. Find your tribe through meaningful conversations.
      </p>
    </div>
  );
}