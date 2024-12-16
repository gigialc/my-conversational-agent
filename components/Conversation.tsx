import Vapi from "@vapi-ai/web";
import { useState, useEffect } from "react";

const vapi = new Vapi(process.env.VAPI_PROJECT_ID!); // TODO: change to env variable

const INITIAL_MESSAGE = "Hello! I'm here as your ideal self - the confident, motivated version of you that knows your true potential. How can I help you shine today?";

export default function Conversation() {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);

  useEffect(() => {
    fetchVoiceId();
  }, []);

  const fetchVoiceId = async () => {
    try {
      const response = await fetch('/api/getVoiceId', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch Vapi Assistant ID');
      }
      const data = await response.json();
      setVapiAssistantId(data.vapiAssistantId);
      console.log("Vapi Assistant ID:", data.vapiAssistantId);
      return data.vapiAssistantId;
    } catch (error) {
      console.error('Failed to fetch Vapi Assistant ID:', error);
      return null;
    }
  };

  const createAssistant = async () => {
    try {
      console.log("Creating assistant");
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
      setVapiAssistantId(data.vapiAssistantid);
      console.log("Assistant ID:", data.vapiAssistantid);
      return data.vapiAssistantid;
    } catch (error) {
      console.error('Error creating assistant:', error);
      return null;
    }
  };

  const handleStartCall = async () => {
    try {
      console.log("Starting call process...");
      
      if (!vapiAssistantId) {
        const newAssistantId = await createAssistant();
        if (newAssistantId) {
          await vapi.start(newAssistantId, {
            firstMessage: INITIAL_MESSAGE
          });
        }
      } else {
        await vapi.start(vapiAssistantId, {
          firstMessage: INITIAL_MESSAGE
        });
      }
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const handleStopCall = () => {
    vapi.stop();
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <img
          src="BetterYou.png"
          alt="Better You"
          onClick={vapiAssistantId ? handleStartCall : undefined}
          className={`cursor-pointer w-[300px] h-auto rounded-full bounce mb-4 ${
            !vapiAssistantId ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />
        <button
          onClick={handleStopCall}
          className="mt-4 p-2 bg-red-500 text-white rounded-full"
        >
          Stop Call
        </button>
      </div>
    </div>
  );
}
