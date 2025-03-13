'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

interface UserDetailsFormProps {
  audioBlob: Blob | null;
  setupMode: 'clone' | 'existing';
  existingApiKey: string;
  onVoiceIdChange?: (voiceId: string) => void;
}

export default function UserDetailsForm({ audioBlob, setupMode, existingApiKey, onVoiceIdChange }: UserDetailsFormProps) {
  const [elevenlabsagentid, setElevenLabsAgentId] = useState('');
  const [elevenlabsapi, setElevenLabsApi] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (setupMode === 'existing') {
      setElevenLabsApi(existingApiKey);
    }
  }, [existingApiKey, setupMode]);

  const saveUserDetails = async () => {
    setIsSubmitting(true);
    
    if (setupMode === 'clone' && !elevenlabsapi) {
      setError('API key is required for voice cloning');
      setIsSubmitting(false);
      return;
    }
    
    if (setupMode === 'clone' && !audioBlob) {
      setError('A voice recording is required for voice cloning');
      setIsSubmitting(false);
      return;
    }
    
    if (setupMode === 'existing' && !elevenlabsagentid) {
      setError('Voice ID is required when using an existing voice');
      setIsSubmitting(false);
      return;
    }
  
    try {
      let finalVoiceId = setupMode === 'existing' ? elevenlabsagentid : null;
      
      if (setupMode === 'clone') {
        // Clone voice using audio blob
        if (audioBlob) {
          setStatus('Cloning voice... This may take a moment.');
          const clonedVoiceId = await cloneVoice();
          if (clonedVoiceId) {
            finalVoiceId = clonedVoiceId;
          } else {
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (!finalVoiceId) {
        setError('Failed to get voice ID');
        setIsSubmitting(false);
        return;
      }

      setStatus('Saving your voice settings...');
      await postVoiceDetailsToBackend(
        setupMode === 'existing' ? existingApiKey : elevenlabsapi,
        finalVoiceId
      );
      
      setStatus(setupMode === 'clone' 
        ? 'Voice cloned and saved successfully!' 
        : 'Voice ID saved successfully!'
      );
      setError('');

      if (onVoiceIdChange) {
        onVoiceIdChange(finalVoiceId);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred while saving details');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to clone voice using audio and return voice_id
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
      console.log("Sending to backend:", { elevenlabsapi, elevenlabsagentid: voiceId });
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
        console.error("Backend response error:", data);
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
    <div className="space-y-4">
      {setupMode === 'existing' && (
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            ElevenLabs Voice ID
          </label>
          <input
            type="text"
            value={elevenlabsagentid}
            onChange={(e) => {
              const value = e.target.value;
              setElevenLabsAgentId(value);
              if (onVoiceIdChange) {
                onVoiceIdChange(value);
              }
            }}
            placeholder="Enter your existing voice ID"
            className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
      )}

      <button 
        onClick={saveUserDetails} 
        disabled={isSubmitting}
        className={`w-full px-4 py-2 flex justify-center items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900
          ${isSubmitting 
            ? 'bg-gray-700 cursor-wait' 
            : 'bg-purple-600 hover:bg-purple-700'}`}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          setupMode === 'clone' ? 'Submit' : 'Save Voice ID'
        )}
      </button>
      
      {error && (
        <div className="p-3 rounded-md bg-red-900 bg-opacity-20 border border-red-500 text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {status && !error && (
        <div className="p-3 rounded-md bg-green-900 bg-opacity-20 border border-green-500 text-green-400 text-sm">
          {status}
        </div>
      )}
    </div>
  );
}
