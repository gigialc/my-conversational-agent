"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AudioRecorder from "./AudioRecorder";
import UserDetailsForm from "./UserDetailsForm";

export default function VoiceSetup() {
  const router = useRouter();
  const [setupMode, setSetupMode] = useState<'clone' | 'existing'>('clone');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState('');
  const [setupCompleted, setSetupCompleted] = useState(false);

  // Handle recording complete
  const handleRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob);
  };

  // Switch setup mode
  const toggleSetupMode = () => {
    setSetupMode(prev => prev === 'clone' ? 'existing' : 'clone');
  };
  
  // Handle setup completion
  const handleSetupComplete = () => {
    setSetupCompleted(true);
    router.push('/home');
  };

  return (
    <div className="flex flex-col items-center max-w-md w-full px-6">
      <h1 className="text-2xl font-semibold text-center mb-6 text-white">Voice Setup</h1>
      
      {/* Key questions section */}
      <div className="mb-8 bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h2 className="text-white text-sm font-medium mb-3">Your AI coach will help you with:</h2>
        <ul className="space-y-2 text-gray-300 text-sm">
          <li className="flex items-start">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-900 text-purple-300 text-xs mr-2 mt-0.5">1</span>
            <span>Understanding who you are and your background</span>
          </li>
          <li className="flex items-start">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-900 text-purple-300 text-xs mr-2 mt-0.5">2</span>
            <span>Identifying and achieving your personal goals</span>
          </li>
          <li className="flex items-start">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-900 text-purple-300 text-xs mr-2 mt-0.5">3</span>
            <span>Becoming the best version of yourself</span>
          </li>
        </ul>
      </div>
      
      <div className="space-y-6">
        {setupMode === 'clone' ? (
          // Voice cloning UI
          <>
            <p className="text-white text-sm mb-4 opacity-75">Record your voice to create a personalized AI coach that will guide you through your self-improvement journey.</p>
            
            <AudioRecorder 
              onRecordingComplete={handleRecordingComplete}
            />
            
            {audioBlob && (
              <div className="bg-purple-900 bg-opacity-20 p-3 rounded-md border border-purple-500 text-sm text-purple-300">
                Voice sample recorded successfully
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2 text-white opacity-75">
                ElevenLabs API Key
              </label>
              <input
                type="text"
                value={elevenlabsApiKey}
                onChange={(e) => setElevenlabsApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            
            {/* UserDetailsForm for cloning */}
            <UserDetailsForm 
              audioBlob={audioBlob} 
              setupMode={setupMode}
              existingApiKey={elevenlabsApiKey}
              onVoiceIdChange={setElevenlabsVoiceId}
            />
          </>
        ) : (
          // Existing voice ID UI
          <>
            <div>
              <label className="block text-sm font-medium mb-2 text-white opacity-75">
                ElevenLabs API Key
              </label>
              <input
                type="text"
                value={elevenlabsApiKey}
                onChange={(e) => setElevenlabsApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            
            {/* UserDetailsForm for existing voice */}
            <UserDetailsForm 
              audioBlob={audioBlob} 
              setupMode={setupMode}
              existingApiKey={elevenlabsApiKey}
              onVoiceIdChange={setElevenlabsVoiceId}
            />
          </>
        )}
        
        {/* Mode switch button */}
        <div className="text-center">
          <button
            onClick={toggleSetupMode}
            className="text-sm text-purple-400 hover:text-purple-300 underline"
          >
            {setupMode === 'clone' 
              ? "Already have a voice ID? Use it instead" 
              : "Don't have a voice ID? Create one instead"}
          </button>
        </div>
        
        {/* Setup completion button */}
        {((setupMode === 'clone' && audioBlob) || 
          (setupMode === 'existing' && elevenlabsApiKey && elevenlabsVoiceId !== '')) && (
          <div className="mt-4 text-center">
            <button
              onClick={handleSetupComplete}
              className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
            >
              Continue to Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 