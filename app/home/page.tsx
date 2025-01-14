'use client';

import { useState } from 'react';
import Setup from '../../components/Setup';
import Conversation from '../../components/Conversation'
import { signOut, useSession } from 'next-auth/react';

export default function Home() {
  const [currentTab, setCurrentTab] = useState('setup');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();

  const handleSignOut = async () => {
    try {
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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
      <div className="fixed top-0 left-0 right-0 z-50 shadow-md bg-black">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-2xl font-bold">Mirai</div>
          
          {/* Mobile menu button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:space-x-6 md:items-center">
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

        {/* Mobile navigation */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-gray-800 bg-black`}>
          <div className="px-4 pt-3 pb-4 space-y-3">
            <button
              onClick={() => {
                setCurrentTab('setup');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-6 py-3 rounded-md ${
                currentTab === 'setup' ? 'bg-gray-800' : 'hover:bg-gray-800'
              }`}
            >
              Setup
            </button>
            <button
              onClick={() => {
                setCurrentTab('conversation');
                setIsMenuOpen(false);
              }}
              className={`block w-full text-left px-6 py-3 rounded-md ${
                currentTab === 'conversation' ? 'bg-gray-800' : 'hover:bg-gray-800'
              }`}
            >
              Conversation
            </button>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-6 py-3 text-red-400 hover:bg-gray-800 rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="pt-20 p-6">
        {currentTab === 'setup' ? <Setup /> : <Conversation />}
      </div>
    </div>
  );
}
