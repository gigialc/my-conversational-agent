'use client';

import { useState } from 'react';
import Setup from '../../components/Setup';
import Conversation from '../../components/Conversation'
import { signOut, useSession } from 'next-auth/react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('setup');
  const { data: session } = useSession();

  const handleSignOut = async () => {
    try {
      // Clear the token cookie
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Sign out from NextAuth
      await signOut({ 
        redirect: true,
        callbackUrl: '/'
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 shadow-md flex items-center justify-between px-6 py-4">
        <div className="text-2xl font-bold">Mirai</div>
        <div className="flex space-x-6 items-center">
          <button
            onClick={() => setCurrentTab('setup')}
            className={`px-6 py-2 rounded-md ${currentTab === 'setup' ? 'scale-105' : ''}`}
          >
            Setup
          </button>
          <button
            onClick={() => setCurrentTab('conversation')}
            className={`px-6 py-2 rounded-md ${currentTab === 'conversation' ? 'scale-105' : ''}`}
          >
            Conversation
          </button>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="pt-20 p-6">
        {currentTab === 'setup' ? <Setup /> : <Conversation />}
      </div>
    </div>
  );
}
