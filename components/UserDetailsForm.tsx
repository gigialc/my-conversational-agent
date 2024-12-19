'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

interface UserDetailsFormProps {
  audioBlob: Blob | null;
}

export default function UserDetailsForm({ audioBlob }: UserDetailsFormProps) {
  const [elevenlabsagentid, setElevenLabsAgentId] = useState('');
  const [elevenlabsapi, setElevenLabsApi] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const { data: session } = useSession();

  const saveUserDetails = async () => {
    if (!audioBlob || !elevenlabsapi) {
      setError('Email, API key, and audio file are required');
      return;
    }
  
    try {
      const voiceId = await cloneVoice();
      if (voiceId) {
        await postVoiceDetailsToBackend(elevenlabsapi, voiceId);
        setStatus('Voice cloned and details saved successfully!');
        setError('');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred in SaveUserDetails');
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
  const postVoiceDetailsToBackend = async (elevenlabsapi: string, voiceId: string) => {
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
      <div>
        <label>Eleven Labs API key</label>
        <input
          type="text"
          value={elevenlabsapi}
          onChange={(e) => setElevenLabsApi(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border"
        />
      </div>

      <button onClick={saveUserDetails} className="px-4 py-2 bg-purple-900 rounded-full">
        Save and Clone Voice
      </button>
      {error && <div className="bg-red-600 p-4 rounded-md mt-4">{error}</div>}
      {status && <div className="bg-green-600 p-4 rounded-md mt-4">{status}</div>}
    </div>
  );
}
