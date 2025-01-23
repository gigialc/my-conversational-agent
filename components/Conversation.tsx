"use client"
import Vapi from "@vapi-ai/web";
import { useState, useEffect, useRef } from "react";

const INITIAL_MESSAGE = "What do you want to improve about yourself in the next 30 days, be specific and realistic?";

const FREE_TIME_LIMIT_MINUTES = 10;

export default function Conversation() {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [hasRequiredCredentials, setHasRequiredCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [timeUsed, setTimeUsed] = useState(0);
  const [hasReachedTimeLimit, setHasReachedTimeLimit] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(FREE_TIME_LIMIT_MINUTES * 60);
  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    vapiRef.current = new Vapi("80895bf2-66fd-4a71-9c6c-3dcef783c644");
    
    // Load time used
    const loadUserData = async () => {
      try {
        const response = await fetch('/api/getVoiceId');
        const data = await response.json();
        if (data.timeUsed) {
          setTimeUsed(data.timeUsed);
          if (data.timeUsed >= FREE_TIME_LIMIT_MINUTES * 60) {
            setHasReachedTimeLimit(true);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
    checkCredentialsAndSetup();

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(async () => {
        try {
          // Update time in backend
          const response = await fetch('/api/updateTimeUsed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeToAdd: 1 }),
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error('Failed to update time');
          }

          const data = await response.json();
          setTimeUsed(data.timeUsed);
          setRemainingSeconds(data.remainingSeconds);

          if (data.hasExceededLimit) {
            // Stop the call immediately
            if (vapiRef.current) {
              vapiRef.current.stop();
            }
            setIsCallActive(false);
            setHasReachedTimeLimit(true);
            
            // Clear the interval
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            // Show alert to user
            alert("You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!");
          }
        } catch (error) {
          console.error('Error updating time:', error);
        }
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isCallActive]);

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
      
      const systemPrompt = `You are impersonating the user you are talking to.
      Use only I, myslef, me, and my in your responses.
      You are talking to the user and you are trying to help them become their best self.
      You are not allowed to say anything that is not related to the user.
      You are not allowed to say that you are an AI assistant.
      Be very positive, don't use negative words.`

      const response = await fetch('/api/create-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt,
          config: {
            emotionDetection: true
          }
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
      // Check current time used from backend
      const response = await fetch('/api/getVoiceId');
      const data = await response.json();
      
      if (data.timeUsed >= FREE_TIME_LIMIT_MINUTES * 60) {
        setHasReachedTimeLimit(true);
        alert("You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!");
        return;
      }

      setTimeUsed(data.timeUsed || 0);
      setRemainingSeconds((FREE_TIME_LIMIT_MINUTES * 60) - (data.timeUsed || 0));

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
        ) : hasReachedTimeLimit ? (
          <div className="text-white text-center mb-6 p-3 rounded-lg bg-purple-800">
            You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!
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
            (!hasRequiredCredentials || isCallStarting || hasReachedTimeLimit) ? "opacity-50" : "hover:scale-105 transition-transform"
          }`}
        />

        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={handleStartCall}
              disabled={!hasRequiredCredentials || isCallActive || isCallStarting || hasReachedTimeLimit}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
                isCallActive 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 active:scale-95'
              } ${
                !hasRequiredCredentials || isCallStarting || hasReachedTimeLimit
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
        </div>

        {isCallActive && (
          <div className="mt-4 space-y-2">
            <div className="text-green-500 text-center">
              Conversation is active - speak freely!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
