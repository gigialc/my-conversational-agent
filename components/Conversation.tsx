import Vapi from "@vapi-ai/web";
import { useState, useEffect } from "react";


const INITIAL_MESSAGE = "Hello! I'm here as your ideal self - the confident, motivated version of you that knows your true potential. How can I help you shine today?";

export default function Conversation() {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [hasRequiredCredentials, setHasRequiredCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const vapi = new Vapi("80895bf2-66fd-4a71-9c6c-3dcef783c644");

  useEffect(() => {
    checkCredentialsAndSetup();
  }, []);

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

  const handleStartCall = async () => {
    try {
      setIsCallStarting(true);
      console.log("Starting call process...");
      
      if (!vapiAssistantId && hasRequiredCredentials) {
        const newAssistantId = await createAssistant();
        if (newAssistantId) {
          await vapi.start(newAssistantId, {
            firstMessage: INITIAL_MESSAGE,
          });
        }
      } else if (vapiAssistantId) {
        await vapi.start(vapiAssistantId, {
          firstMessage: INITIAL_MESSAGE,
        });
      }
    } catch (error) {
      console.error('Error starting call:', error);
      setIsCallStarting(false);
    }
  };

  const handleStopCall = () => {
    vapi.stop();
    setIsCallActive(false);
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        {isLoading ? (
          <div className="text-white">Loading...</div>
        ) : !hasRequiredCredentials ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg bg-pink-600">
            Please set your Eleven Labs API key and clone your voice in setup first!
          </div>
        ) : isCallStarting ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg">
            Starting call process...
          </div>
        ) : null}
        
        <img
          src="BetterYou.png"
          alt="Better You"
          onClick={hasRequiredCredentials && !isCallActive ? handleStartCall : undefined}
          className={`cursor-pointer w-[300px] h-auto rounded-full bounce mb-4 ${
            (!hasRequiredCredentials || isCallActive) ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />
        
        <button
          onClick={handleStopCall}
          className="mt-2 px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
