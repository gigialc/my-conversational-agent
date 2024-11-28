'use client';

import { useConversation } from '@11labs/react';
import { useCallback } from 'react';
import { useState } from 'react';
import Image from 'next/image';

export function Conversation() {
  const [isListening, setIsListening] = useState(false);

  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start the conversation with your agent
      await conversation.startSession({
        agentId: 'AP75bObawmAbTpaDIy4h', // Replace with your agent ID
      });

      setIsListening(true);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setIsListening(false);
  }, [conversation]);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="flex flex-col items-center">
        <div className={`relative ${isListening ? 'pulse-animation' : ''}`}>
          <Image
            src="/BetterYou.png"
            alt="Listening Indicator"
            width={300}
            height={300}
          />
        </div>

        <div className="flex gap-4 mt-20">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected'}
          className="px-6 py-2 bg-pink-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Start
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Stop
        </button>
      </div>

        <p className="mt-4 text-lg text-gray-700">
          {isListening
            ? 'Listening...'
            : conversation.status === 'connected'
          }
        </p>
      </div>
     {/* Footer */}
     <footer className="mt-10 text-center text-gray-600">
     <p className="text-sm">
       By Georgina and Cathy ❤️
     </p>
   </footer>
 </div>
);
}

