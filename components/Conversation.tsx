"use client"
import Vapi from "@vapi-ai/web";
import { useState, useEffect, useRef } from "react";

const INITIAL_MESSAGE = "Hello! I'm here as your ideal self - the confident, motivated version of you that knows your true potential. How can I help you shine today?";

export default function Conversation() {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [hasRequiredCredentials, setHasRequiredCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    // Initialize Vapi instance
    vapiRef.current = new Vapi("80895bf2-66fd-4a71-9c6c-3dcef783c644");
    checkCredentialsAndSetup();

    // Cleanup function
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  //fetching voice id from backend
  const checkCredentialsAndSetup = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/getVoiceId');
      const data = await response.json();

      // Check if user has required ElevenLabs credentials
      if (data.apiKey && data.voiceId) {
        setHasRequiredCredentials(true);
        
        if (data.vapiAssistantId) {
          setVapiAssistantId(data.vapiAssistantId);
          console.log("Using existing Vapi Assistant ID:", data.vapiAssistantId);
        }
      } else {
        setHasRequiredCredentials(false);
        console.log("Missing required ElevenLabs credentials");
      }
    } catch (error) {
      console.error('Error checking credentials:', error);
      setHasRequiredCredentials(false);
    } finally {
      setIsLoading(false);
    }
  };

  //creating assistant
  const createAssistant = async () => {
    try {
      console.log("Creating new Vapi assistant");
      const response = await fetch('/api/create-assistant', {
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
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create assistant');
      }
      const data = await response.json();
      setVapiAssistantId(data.vapiAssistantId);
      return data.vapiAssistantId;
    } catch (error) {
      console.error('Error creating assistant:', error);
      return null;
    }
  };

  //starting call
  const handleStartCall = async () => {
    try {
      if (!vapiRef.current) return;
      
      setIsCallStarting(true);
      console.log("Starting call process...");
      
      if (!vapiAssistantId && hasRequiredCredentials) {
        console.log("No assistant ID found, creating new one...");
        const newAssistantId = await createAssistant();
        if (!newAssistantId) {
          throw new Error('Failed to create assistant');
        }
        console.log("New assistant created:", newAssistantId);
        await vapiRef.current.start(newAssistantId, {
          firstMessage: INITIAL_MESSAGE,
        });
      } else if (vapiAssistantId) {
        console.log("Using existing assistant:", vapiAssistantId);
        await vapiRef.current.start(vapiAssistantId, {
          firstMessage: INITIAL_MESSAGE,
        });
      }
      
      setIsCallActive(true);
      console.log("Call started successfully");
    } catch (error) {
      console.error('Error starting call:', error);
    } finally {
      setIsCallStarting(false);
    }
  };

  const handleStopCall = async () => {
    try {
      if (!vapiRef.current) return;
      
      console.log("Stopping call...");
      await vapiRef.current.stop();
      setIsCallActive(false);
      console.log("Call stopped successfully");
    } catch (error) {
      console.error('Error stopping call:', error);
    }
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        {isLoading ? (
          <div className="text-white text-center mb-6">Loading...</div>
        ) : !hasRequiredCredentials ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg bg-pink-600">
            Please set up your voice in the setup page first!
          </div>
        ) : isCallStarting ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg">
            Starting conversation...
          </div>
        ) : null}
        
        <img
          src="BetterYou.png"
          alt="Better You"
          className={`w-[300px] h-auto rounded-full mb-8 ${
            isCallActive ? 'ring-4 ring-green-500' : ''
          } ${
            (!hasRequiredCredentials || isCallStarting) ? "opacity-50" : "hover:scale-105 transition-transform"
          }`}
        />

        <div className="flex space-x-4">
          <button
            onClick={handleStartCall}
            disabled={!hasRequiredCredentials || isCallActive || isCallStarting}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
              isCallActive 
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 active:scale-95'
            } ${
              !hasRequiredCredentials || isCallStarting
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {isCallStarting ? 'Starting...' : 'Start Conversation'}
          </button>

          <button
            onClick={handleStopCall}
            disabled={!isCallActive}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
              isCallActive
                ? 'bg-red-500 hover:bg-red-600 active:scale-95'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            End Conversation
          </button>
        </div>

        {isCallActive && (
          <div className="mt-4 text-green-500 text-center">
            Conversation is active - speak freely!
          </div>
        )}
      </div>
    </div>
  );
}
