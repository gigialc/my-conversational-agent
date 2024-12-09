'use client';

import { useConversation } from '@11labs/react';
import { useCallback, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRef } from 'react';

export function Conversation() {
  const [currentTab, setCurrentTab] = useState('setup');
  const [isListening, setIsListening] = useState(false);
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [agentId, setAgentId] = useState('');
  const [voiceCloningStatus, setVoiceCloningStatus] = useState('');
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [elevenlabsagentid, setElevenlabsagentid] = useState('');

  // Conversation handlers
  const conversation = useConversation({
    apiKey,
    agentId,
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId });
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setError('Failed to start conversation. Check microphone permissions.');
    }
  }, [conversation, agentId]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setIsListening(false);
  }, [conversation]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
  
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob); // Set the blob to be used in FormData
        setAudioUrl(URL.createObjectURL(blob)); // For playback preview
      };
  
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop(); // Stops the recording
      setIsRecording(false);
    } else {
      console.error('No active recorder to stop.');
    }
  };
  
  // Save user details and audio file
  const saveUserDetails = async () => {
    try {
      if (!email || !apiKey || !audioBlob
      ) {
        setError('Email, API key, and audio file are required');
        return;
      }
      // Create FormData and append necessary fields
      const form = new FormData();
      form.append("name", email);
      form.append("files", audioBlob, "recording.wav"); // Append audio file
      form.append("remove_background_noise", "true");

      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${apiKey}`
        },
        body: form
      });

      const data = await response.json();

      console.log(data);
      console.log('API Response:', data);
      // Handle successful response
      setVoiceCloningStatus(`Voice cloned successfully!`);
      setElevenlabsagentid(data.voice_id);
      postAgentIdToDatabase();
      console.log('Voice cloned successfully! Voice ID:',elevenlabsagentid);
      setError('');
    } catch (error) {
      console.error('Failed to save user details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };
  
  const postAgentIdToDatabase = async () => {
    try {
      const response = await fetch('/api/updateUserDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ elevenlabsagentid , email}),
      });

      console.log('elevenlabsagentid:', elevenlabsagentid);
      if (!response.ok) {
        throw new Error('Failed to post agent ID to database');
      }

      const data = await response.json();
      console.log('Agent ID posted to database:', data);
    } catch (error) {
      console.error('Error posting agent ID to database:', error);
      setError('Failed to post agent ID to database. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Tabs */}
      <div className="fixed top-0 left-0 right-0 z-50 shadow-md flex items-center justify-between px-6 py-4">
        <div className="text-2xl font-bold">Mirai</div>
        <div className="flex space-x-6">
          <button
            onClick={() => setCurrentTab('setup')}
            className={`px-6 py-2 rounded-md transition-all ${
              currentTab === 'setup' ? 'text-white scale-105' : 'text-white'
            }`}
          >
            Setup
          </button>
          <button
            onClick={() => setCurrentTab('conversation')}
            className={`px-6 py-2 rounded-md transition-all ${
              currentTab === 'conversation' ? 'text-white scale-105' : 'text-white'
            }`}
          >
            Conversation
          </button>
        </div>
      </div>

     {/* Main Content */}
    <div className="pt-20 p-6">
      {currentTab === 'setup' && (
        <div className="max-w-lg mx-auto bg-gray-900 p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl text-center mb-6">Setup</h2>

          {error && <div className="bg-red-600 p-4 rounded-md mb-4">{error}</div>}

          <div className="space-y-6">
            <div>
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border"
              />
            </div>
            <div>
              <label>Eleven Labs API Key:</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border"
              />
            </div>
            <div>
              <label>Record Audio(30 seconds):</label>
              <div>
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="bg-red-500 px-4 py-2 rounded-md"
                  >
                    Stop Recording
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="bg-green-500 px-4 py-2 rounded-md"
                  >
                    Start Recording
                  </button>
                )}
              </div>
              {audioUrl && (
                <div className="mt-4">
                  <audio controls src={audioUrl}></audio>
                </div>
              )}
            </div>
            <button
              onClick={saveUserDetails}
              className="w-full py-3 bg-indigo-600 rounded-md text-white hover:bg-indigo-700"
            >
              Save and Clone Voice
            </button>
            {voiceCloningStatus && <p className="mt-4 text-center">{voiceCloningStatus}</p>}
          </div>
        </div>
      )}

      {currentTab === 'conversation' && (
        <div className="flex flex-col items-center">
          <div>
            <Image src="/BetterYou.png" alt="Listening" width={300} height={300} />
          </div>
          <div className="flex gap-6 mt-20">
            <button
              onClick={startConversation}
              className=" px-4 py-2 rounded-md"
            >
              Start
            </button>
            <button
              onClick={stopConversation}
              className="px-4 py-2 rounded-md"
            >
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
