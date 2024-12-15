import Vapi from "@vapi-ai/web";
import { useState, useEffect } from "react";

const vapi = new Vapi(process.env.VAPI_PROJECT_ID!); // TODO: change to env variable

export default function Conversation() {
  const [voiceId, setVoiceId] = useState<string | null>(null);
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
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setVoiceId(data.voiceId);
      return data.voiceId;
    } catch (error) {
      console.error('Failed to fetch voiceId:', error);
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
        }
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
    if (!vapiAssistantId) {
      const newAssistantId = await createAssistant();
      if (newAssistantId) {
        vapi.start(newAssistantId);
      }
    } else {
      vapi.start(vapiAssistantId);
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
          onClick={voiceId ? handleStartCall : undefined}
          className={`cursor-pointer w-[300px] h-auto rounded-full bounce mb-4 ${
            !voiceId ? "opacity-50 cursor-not-allowed" : ""
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
