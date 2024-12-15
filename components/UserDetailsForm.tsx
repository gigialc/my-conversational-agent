import { useState } from 'react';
import { useRouter } from 'next/router';

interface UserDetailsFormProps {
  audioBlob: Blob | null;
  setVoiceCloningStatus: (status: string) => void;
}

export default function UserDetailsForm({ audioBlob, setVoiceCloningStatus }: UserDetailsFormProps) {
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const saveUserDetails = async () => {
    if (!email || !apiKey || !audioBlob) {
      setError('Email, API key, and audio file are required');
      return;
    }
  
    try {
      const voiceId = await cloneVoice(); // Step 1: Clone the voice
      if (voiceId) {
        await postVoiceDetailsToBackend(voiceId); // Step 2: Save to backend
        setVoiceCloningStatus('Voice cloned and details saved successfully!');
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
      formData.append('name', email);
      formData.append('files', audioBlob as Blob, 'recording.wav');
  
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
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
  
      setVoiceCloningStatus('Voice cloned successfully!');
      console.log('Voice cloned successfully:', voiceId);
      return voiceId;
    } catch (err) {
      console.error('Voice cloning error:', err);
      setError('Failed to clone voice in cloneVoice');
      return null;
    }
  };
  
  // Function to post voice_id and apiKey to backend
  const postVoiceDetailsToBackend = async (voiceId: string) => {
    try {
      const response = await fetch('/api/updateUserDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          elevenlabsagentid: voiceId,
        }),
      });
  
      if (!response.ok) {
        const backendError = await response.text();
        throw new Error(`Failed to save to backend: ${backendError}`);
      }
  
      console.log('User details saved to backend successfully');
    } catch (err) {
      console.error('Backend save error:', err);
      throw new Error('Failed to save user details to backend.');
    }
  };
  


  return (
    <div className="space-y-6 mt-5">
      <div>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border"
        />
      </div>
      <div>
        <label>Eleven Labs API key</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border"
        />
      </div>

      <button onClick={saveUserDetails} className="px-4 py-2 bg-purple-900 rounded-full">
        Save and Clone Voice
      </button>
      {error && <div className="bg-red-600 p-4 rounded-md mt-4">{error}</div>}
    </div>
  );
}
