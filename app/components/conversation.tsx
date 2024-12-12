import { useConversation } from '@11labs/react';
import Image from 'next/image';
import Footer from './Footer';

export default function Conversation() {
  const conversation = useConversation({
    apiKey: '',
    agentId: '',
    onConnect: () => console.log('Connected'),
    onMessage: (message) => console.log('Message:', message),
  });

  

  return (
    <div className="flex flex-col items-center mt-10">
      {/* Image Section */}
      <div className="mt-10">
        <Image src="/BetterYou.png" alt="Listening" width={300} height={300} />
      </div>

      {/* Buttons Section */}
      <div className="mt-10 flex gap-6">
        <button
          onClick={() => conversation.startSession()}
          className="px-6 py-2 bg-green-500 rounded-full text-white hover:bg-green-600 transition"
        >
          Start
        </button>
        <button
          onClick={() => conversation.endSession()}
          className="px-6 py-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition"
        >
          Stop
        </button>
      </div>
      <Footer />
    </div>
  );
}
