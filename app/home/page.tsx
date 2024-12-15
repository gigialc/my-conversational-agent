'use client';

import { useState } from 'react';
import Setup from '../../components/Setup';
import Conversation from '../../components/Conversation'

export default function Page() {
  const [currentTab, setCurrentTab] = useState('setup');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Tabs */}
      <div className="fixed top-0 left-0 right-0 z-50 shadow-md flex items-center justify-between px-6 py-4">
        <div className="text-2xl font-bold">Mirai</div>
        <div className="flex space-x-6">
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
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-20 p-6">
        {currentTab === 'setup' ? <Setup /> : <Conversation />}
      </div>
    </div>
  );
}
