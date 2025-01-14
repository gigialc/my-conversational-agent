'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

interface UserDetailsFormProps {
  audioBlob: Blob | null;
  setupMode: 'clone' | 'existing';
  existingApiKey: string;
}

export default function UserDetailsForm({ audioBlob, setupMode, existingApiKey }: UserDetailsFormProps) {
  const [elevenlabsagentid, setElevenLabsAgentId] = useState('');
  const [elevenlabsapi, setElevenLabsApi] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const { data: session } = useSession();

  useEffect(() => {
    if (setupMode === 'existing') {
      setElevenLabsApi(existingApiKey);
    }
  }, [existingApiKey, setupMode]);

  const saveUserDetails = async () => {
    if (setupMode === 'clone' && (!audioBlob || !elevenlabsapi)) {
      setError('API key and audio recording are required for voice cloning');
      return;
    }
    
    if (setupMode === 'existing' && !elevenlabsagentid) {
      setError('Voice ID is required when using an existing voice');
      return;
    }
  
    try {
      let finalVoiceId = setupMode === 'existing' ? elevenlabsagentid : null;
      
      if (setupMode === 'clone') {
        // Only clone voice if in clone mode
        const clonedVoiceId = await cloneVoice();
        if (clonedVoiceId) {
          finalVoiceId = clonedVoiceId;
        } else {
          return;
        }
      }

      if (!finalVoiceId) {
        setError('Failed to get voice ID');
        return;
      }

      await postVoiceDetailsToBackend(
        setupMode === 'existing' ? existingApiKey : elevenlabsapi,
        finalVoiceId
      );
      
      setStatus(setupMode === 'clone' 
        ? 'Voice cloned and details saved successfully!' 
        : 'Voice ID saved successfully!'
      );
      setError('');
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred while saving details');
    }
  };
  
  // Function to clone voice and return voice_id
  const cloneVoice = async (): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('name',"Georgina");
      formData.append('files', audioBlob as Blob, 'recording.wav');
  
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: { 'xi-api-key': elevenlabsapi },
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to clone voice: ${errorData}`);
      }
  
      const responseData = await response.json();
      const voiceId = responseData.voice_id;
  
      if (!voiceId) {
        throw new Error('Voice ID not returned by ElevenLabs API');
      }
  
      setStatus('Voice cloned successfully!');
      console.log('Voice cloned successfully:', voiceId);
      return voiceId;
    } catch (err) {
      console.error('Voice cloning error:', err);
      setError('Failed to clone voice in cloneVoice');
      return null;
    }
  };
  
  // Function to post voice_id and apiKey to backend
  const postVoiceDetailsToBackend = async (elevenlabsapi: string | null, voiceId: string) => {
    try {
      console.log("Sending to backend:", { elevenlabsapi, elevenlabsagentid: voiceId }); // Debug log
      const response = await fetch('/api/updateUserDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elevenlabsapi,
          elevenlabsagentid: voiceId
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Backend response error:", data); // Debug log
        throw new Error(`Failed to save to backend: ${JSON.stringify(data)}`);
      }

      const data = await response.json();
      console.log("Backend save successful:", data);
      return data;
    } catch (error) {
      console.error("Backend save error:", error);
      throw error;
    }
  };
  


  return (
    <div className="space-y-6 mt-5">
      {setupMode === 'existing' ? (
        <div>
          <label className="block text-sm font-medium mb-2">
            Eleven Labs Voice ID
          </label>
          <input
            type="text"
            value={elevenlabsagentid}
            onChange={(e) => setElevenLabsAgentId(e.target.value)}
            placeholder="Enter your existing voice ID"
            className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <p className="mt-1 text-sm text-gray-400">
            Enter your existing ElevenLabs voice ID here
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2">
            Eleven Labs API Key
          </label>
          <input
            type="text"
            value={elevenlabsapi}
            onChange={(e) => setElevenLabsApi(e.target.value)}
            placeholder="Enter your API key"
            className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <p className="mt-1 text-sm text-gray-400">
            Required for voice cloning
          </p>
        </div>
      )}

      <button 
        onClick={saveUserDetails} 
        className="w-full px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        {setupMode === 'clone' ? 'Save and Clone Voice' : 'Save Voice ID'}
      </button>
      
      {error && (
        <div className="p-4 rounded-md bg-red-500 bg-opacity-20 border border-red-500 text-red-500">
          {error}
        </div>
      )}
      {status && (
        <div className="p-4 rounded-md bg-green-500 bg-opacity-20 border border-green-500 text-green-500">
          {status}
        </div>
      )}
    </div>
  );
}
