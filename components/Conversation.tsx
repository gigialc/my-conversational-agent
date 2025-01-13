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
    vapiRef.current = new Vapi("80895bf2-66fd-4a71-9c6c-3dcef783c644");
    checkCredentialsAndSetup();

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  const handleStopCall = async () => {
    try {
      if (vapiRef.current) {
        await vapiRef.current.stop();
        setIsCallActive(false);
      }
    } catch (error) {
      console.error('Error stopping call:', error);
    }
  };

  //fetching voice id from backend
  const checkCredentialsAndSetup = async () => {
    try {
      console.log("Checking credentials and setup...");
      const response = await fetch('/api/getUserDetails', {
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Get user details error:', response.status, response.statusText);
        throw new Error('Failed to get user details');
      }

      const data = await response.json();
      console.log("User details:", data);

      if (!data.user) {
        console.error('No user data found');
        setHasRequiredCredentials(false);
        return;
      }

      // If we have a voice ID but no assistant ID, create one
      if (data.user.elevenlabsagentid && !data.user.vapiAssistantId) {
        console.log("Voice ID found but no assistant ID, creating assistant...");
        try {
          const assistantId = await createAssistant();
          setVapiAssistantId(assistantId);
          setHasRequiredCredentials(true);
        } catch (error) {
          console.error('Failed to create assistant:', error);
          setHasRequiredCredentials(false);
        }
        return;
      }

      // If we have both voice ID and assistant ID, we're good to go
      if (data.user.elevenlabsagentid && data.user.vapiAssistantId) {
        console.log("Found both voice ID and assistant ID");
        setVapiAssistantId(data.user.vapiAssistantId);
        setHasRequiredCredentials(true);
        return;
      }

      // If we don't have a voice ID, we need the user to set up their voice
      console.log("No voice ID found");
      setHasRequiredCredentials(false);
    } catch (error) {
      console.error('Error in checkCredentialsAndSetup:', error);
      setHasRequiredCredentials(false);
    }
  };

  //creating assistant
  const createAssistant = async () => {
    try {
      console.log("Creating assistant...");
      const response = await fetch('/api/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('Create assistant error response:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('Error data:', errorData);
        throw new Error('Failed to create Vapi assistant');
      }

      const data = await response.json();
      console.log("Assistant created:", data);

      if (!data.assistantId) {
        throw new Error('No assistant ID returned from create-assistant endpoint');
      }

      // Save the assistant ID to the database
      const saveResponse = await fetch('/api/updateUserDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          vapiAssistantId: data.assistantId
        })
      });

      if (!saveResponse.ok) {
        console.error('Save assistant ID error:', saveResponse.status, saveResponse.statusText);
        const errorData = await saveResponse.json();
        console.error('Error data:', errorData);
        throw new Error('Failed to save assistant ID');
      }

      const saveData = await saveResponse.json();
      console.log("Assistant ID saved:", saveData);

      return data.assistantId;
    } catch (error) {
      console.error('Error in createAssistant:', error);
      throw error;
    }
  };

  //starting call
  const handleStartCall = async () => {
    try {
      if (!vapiRef.current) return;
      
      setIsCallStarting(true);
      console.log("Starting call process...");
      
      let assistantIdToUse = vapiAssistantId;
      
      // Create new assistant if we don't have one, regardless of how we got the voice ID
      if (!assistantIdToUse) {
        const newAssistantId = await createAssistant();
        if (!newAssistantId) {
          throw new Error('Failed to create assistant');
        }
        assistantIdToUse = newAssistantId;
      }

      if (!assistantIdToUse) {
        throw new Error('No assistant ID available');
      }

      await vapiRef.current.start(assistantIdToUse, {
        firstMessage: INITIAL_MESSAGE,
      });
      
      setIsCallActive(true);
      setIsCallStarting(false);
    } catch (error) {
      console.error('Error starting call:', error);
      setIsCallStarting(false);
      setIsCallActive(false);
    }
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        {isLoading ? (
          <div className="text-white">Loading...</div>
        ) : !hasRequiredCredentials ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg bg-pink-600">
            Please set up your voice in the setup page first!
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
        <div className="flex space-x-4">
          <button
            onClick={hasRequiredCredentials && !isCallActive ? handleStartCall : undefined}
            className="px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          >
            Start
          </button>
          <button
            onClick={isCallActive ? handleStopCall : undefined}
            className={`px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors ${!isCallActive ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
