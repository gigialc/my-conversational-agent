import { useState } from 'react';
import VoiceCloningInstructions from './VoiceCloningInstructions';
import AudioRecorder from './AudioRecorder';
import UserDetailsForm from './UserDetailsForm';

type SetupTab = 'clone' | 'existing';

export default function Setup() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState<SetupTab>('clone');
  const [apiKey, setApiKey] = useState('');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <div className="sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as SetupTab)}
            className="block w-full rounded-md border-gray-700 bg-gray-800 text-white focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="clone">Clone Voice</option>
            <option value="existing">Use Existing Voice</option>
          </select>
        </div>

        <div className="hidden sm:block">
          <nav className="flex space-x-4 bg-gray-800 p-1 rounded-xl" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('clone')}
              className={`${
                activeTab === 'clone'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              } px-5 py-2.5 rounded-lg transition-all duration-200 flex-1 text-sm font-medium`}
            >
              Clone Voice
            </button>
            <button
              onClick={() => setActiveTab('existing')}
              className={`${
                activeTab === 'existing'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              } px-5 py-2.5 rounded-lg transition-all duration-200 flex-1 text-sm font-medium`}
            >
              Use Existing Voice
            </button>
          </nav>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <div className={activeTab === 'clone' ? 'block' : 'hidden'}>
          <VoiceCloningInstructions />
          <AudioRecorder onRecordingComplete={setAudioBlob} />
        </div>
        
        <div className={activeTab === 'existing' ? 'block' : 'hidden'}>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Use Existing Voice ID</h2>
            <p className="text-gray-300 mb-4">
              If you already have an ElevenLabs voice ID, you can use it directly without going through the voice cloning process.
            </p>
            <p className="text-gray-300 mb-4">
              Simply enter your voice ID and API key below to start using it with your AI assistant.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Eleven Labs API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <p className="mt-1 text-sm text-gray-400">
                  Required to create your AI assistant
                </p>
              </div>
            </div>
          </div>
        </div>

        <UserDetailsForm 
          audioBlob={audioBlob} 
          setupMode={activeTab}
          existingApiKey={apiKey}
        />
      </div>
    </div>
  );
}
