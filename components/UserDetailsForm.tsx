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
  const [directVoiceId, setDirectVoiceId] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const { data: session } = useSession();

  const saveUserDetails = async () => {
    if (!directVoiceId && (!audioBlob || !elevenlabsapi)) {
      setError('Either provide a direct Voice ID or both API key and audio recording');
      return;
    }
  
    try {
      let finalVoiceId = directVoiceId;
      
      if (!directVoiceId) {
        // Only clone voice if no direct voice ID is provided
        const clonedVoiceId = await cloneVoice();
        if (clonedVoiceId) {
          finalVoiceId = clonedVoiceId;
        } else {
          return;
        }
      }

      // Create Vapi assistant with the voice ID
      const assistantResponse = await fetch('/api/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: `You are an advanced AI agent designed to embody the aspirational 'best version' of the individual you're speaking with. Your role is to act as their ideal self: confident, motivated, and fully aligned with their personal values and goals. Your responses should be empathetic, uplifting, and tailored to inspire action and positive thinking.

          Key Behaviors:
          - Use a supportive, confident, and encouraging tone
          - Speak as their inner voice, reflecting their potential and strengths
          - Reinforce positive self-beliefs and aspirations
          - Provide affirmations in the present tense
          - Reframe challenges as opportunities for growth
          - Reference personal goals and achievements
          - Incorporate positive emotions and visualization
          - Address emotional challenges with resilience-focused affirmations
          - Celebrate progress and small wins
          - Maintain understanding of user's goals and achievements

          Remember: You are their aspirational digital twin, the version of themselves that inspires and empowers them to take confident steps toward their best life.`
        }),
        credentials: 'include'
      });

      if (!assistantResponse.ok) {
        throw new Error('Failed to create Vapi assistant');
      }

      const assistantData = await assistantResponse.json();
      
      // Only send API key if it's provided (needed for voice cloning)
      await postVoiceDetailsToBackend(elevenlabsapi || null, finalVoiceId);
      setStatus('Voice ID and assistant created successfully!');
      setError('');
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
      <div>
        <label>Direct Voice ID (Optional)</label>
        <input
          type="text"
          value={directVoiceId}
          onChange={(e) => setDirectVoiceId(e.target.value)}
          placeholder="Enter your existing ElevenLabs Voice ID"
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border"
        />
        <p className="text-sm text-gray-400 mt-1">
          If you already have an ElevenLabs Voice ID, enter it here. No API key needed in this case.
        </p>
      </div>

      <div className={directVoiceId ? 'opacity-50' : ''}>
        <label>Eleven Labs API key {!directVoiceId && '(Required for voice cloning)'}</label>
        <input
          type="text"
          value={elevenlabsapi}
          onChange={(e) => setElevenLabsApi(e.target.value)}
          disabled={!!directVoiceId}
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border"
          placeholder={directVoiceId ? 'Not needed with direct Voice ID' : 'Required for voice cloning'}
        />
      </div>

      <button 
        onClick={saveUserDetails} 
        className="px-4 py-2 bg-purple-900 rounded-full"
      >
        {directVoiceId ? 'Save Voice ID' : 'Save and Clone Voice'}
      </button>
      
      {error && <div className="bg-red-600 p-4 rounded-md mt-4">{error}</div>}
      {status && <div className="bg-green-600 p-4 rounded-md mt-4">{status}</div>}
    </div>
  );
}
