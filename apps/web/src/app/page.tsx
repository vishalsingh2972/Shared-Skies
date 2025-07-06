'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SignInButton, SignUpButton } from '@clerk/nextjs';

export default function Home() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push('/dashboard');
    }
  }, [isSignedIn, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex justify-end items-center p-4 gap-4 h-16">
        <SignInButton mode="modal" />
        <SignUpButton mode="modal">
          <button className="bg-blue-600 text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
            Sign Up
          </button>
        </SignUpButton>
      </header>
      
      <div className="flex flex-col items-center justify-center flex-grow text-center gap-8 p-8">
        <h1 className="text-5xl font-bold">Shared Skies</h1>
        <p className="text-lg text-gray-200 max-w-xl">
          Connect with people who understand. Find your tribe through meaningful conversations.
        </p>
      </div>
    </div>
  );
}