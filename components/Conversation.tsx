"use client"
import Vapi from "@vapi-ai/web";
import { useState, useEffect, useRef } from "react";

// Add types for Vapi responses
interface VapiTranscript {
  text: string;
}

interface VapiMessage {
  role: 'user' | 'assistant';
  content: string;
  // Optionally, if transcript messages include additional fields:
  type?: string;  // e.g. "transcript"
  text?: string;
}

// VapiCall now only needs an id property
interface VapiCall {
  id: string;
}

const INITIAL_MESSAGE =
  "What do you want to improve about yourself in the next 30 days, be specific and realistic?";
const FREE_TIME_LIMIT_MINUTES = 10;

export default function Conversation() {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [hasRequiredCredentials, setHasRequiredCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [timeUsed, setTimeUsed] = useState(0);
  const [hasReachedTimeLimit, setHasReachedTimeLimit] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    FREE_TIME_LIMIT_MINUTES * 60
  );
  const [messages, setMessages] = useState<VapiMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [micFound, setMicFound] = useState<boolean>(true);
  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  // Check for available microphone devices
  useEffect(() => {
    async function checkMic() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput"
        );
        console.log("Audio input devices found:", audioInputs);
        if (audioInputs.length === 0) {
          console.error("No microphone found. Please connect a mic.");
          setMicFound(false);
        } else {
          setMicFound(true);
        }
      } catch (error) {
        console.error("Error checking microphone availability:", error);
      }
    }
    checkMic();
  }, []);

  // Global message handler for transcript and regular messages
  const messageHandler = (message: any) => {
    console.log("Received message event:", message);
    
    if (message && message.type === "transcript" && message.transcript) {
      setCurrentTranscript((prev) => {
        const updated = prev + " " + message.transcript;
        console.log("Updated transcript:", updated);
        return updated;
      });
    } else if (message && message.type === "voice-input" && message.input) {
      // Add user messages
      setMessages(prev => [...prev, {
        role: 'user',
        content: message.input
      }]);
    } else if (message && message.type === "model-output" && message.output) {
      // Accumulate model outputs and add them as complete messages
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          // Update the last message if it's from the assistant
          return [
            ...prev.slice(0, -1),
            { ...lastMessage, content: lastMessage.content + message.output }
          ];
        } else {
          // Start a new assistant message
          return [...prev, {
            role: 'assistant',
            content: message.output
          }];
        }
      });
    } else if (message && message.type === "conversation-update" && message.messages) {
      // Update messages from conversation state
      const formattedMessages = message.messages
        .filter((msg: any) => msg.role && (msg.message || msg.content))
        .map((msg: any) => ({
          role: msg.role === 'bot' ? 'assistant' : msg.role,
          content: msg.message || msg.content
        }));
      
      setMessages(formattedMessages);
    }
  };

  useEffect(() => {
    if (!vapiRef.current) {
      // Initialize Vapi instance with your public key
      vapiRef.current = new Vapi(
        process.env.VAPI_PROJECT_ID || "80895bf2-66fd-4a71-9c6c-3dcef783c644"
      );
    }

    // Load user data from backend
    const loadUserData = async () => {
      try {
        const response = await fetch("/api/getVoiceId");
        const data = await response.json();
        if (data.timeUsed) {
          setTimeUsed(data.timeUsed);
          if (data.timeUsed >= FREE_TIME_LIMIT_MINUTES * 60) {
            setHasReachedTimeLimit(true);
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
    checkCredentialsAndSetup();

    // Attach global message handler
    if (vapiRef.current) {
      vapiRef.current.on("message", messageHandler);
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.off("message", messageHandler);
        vapiRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Modify the transcript saving useEffect
  useEffect(() => {
    console.log("Transcript save effect triggered with:", {
      isCallActive,
      hasCallId: !!currentCallId,
      transcriptLength: currentTranscript.length,
      messagesCount: messages.length
    });

    const saveTranscriptUpdate = async (type: 'start' | 'end') => {
      console.log(`Attempting to save ${type} transcript`);
      try {
        const token = document.cookie.split("token=")[1] || "";
        console.log("Using token:", token ? "Present" : "Missing");
        
        const payload = {
          callId: currentCallId,
          transcript: currentTranscript.trim(),
          messages: messages.map((msg) => ({
            role: msg.role,
            message: msg.content,
          })),
          type: type,
          timestamp: new Date().toISOString()
        };
        console.log("Sending payload:", payload);

        const response = await fetch("/api/save-conversation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(payload)
        });

        const result = await response.text();
        console.log(`Save ${type} response:`, result);

        if (!response.ok) {
          throw new Error(`Failed to save ${type} transcript: ${result}`);
        }
        console.log(`${type} transcript saved successfully`);
      } catch (error) {
        console.error(`Error saving ${type} transcript:`, error);
      }
    };

    // Only save if we have a callId
    if (currentCallId) {
      if (isCallActive) {
        console.log("Call became active, saving start transcript");
        saveTranscriptUpdate('start');
      } else {
        console.log("Call became inactive, saving end transcript");
        saveTranscriptUpdate('end');
      }
    }
  }, [isCallActive, currentCallId]);

  // Timer effect to update backend time used
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(async () => {
        try {
          const response = await fetch("/api/updateTimeUsed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ timeToAdd: 1 }),
            credentials: "include",
          });
          if (!response.ok) {
            throw new Error("Failed to update time");
          }
          const data = await response.json();
          setTimeUsed(data.timeUsed);
          setRemainingSeconds(data.remainingSeconds);
          if (data.hasExceededLimit) {
            if (vapiRef.current) {
              vapiRef.current.stop();
            }
            setIsCallActive(false);
            setHasReachedTimeLimit(true);
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            alert(
              "You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!"
            );
          }
        } catch (error) {
          console.error("Error updating time:", error);
        }
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isCallActive]);

  // Fetch credentials from backend
  const checkCredentialsAndSetup = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/getVoiceId");
      const data = await response.json();
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
      console.error("Error checking credentials:", error);
      setHasRequiredCredentials(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new assistant (including transcriber settings)
  const createAssistant = async () => {
    try {
      console.log("ting new Vapi assistant");
      const systemPrompt = `You are impersonating the user you are talking to.
      Use only I, myslef, me, and my in your responses.
      You are talking to the user and you are trying to help them become their best self.
      You are not allowed to say anything that is not related to the user.
      You are not allowed to say that you are an AI assistant.
      Be very positive, don't use negative words.`;
      const response = await fetch("/api/create-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          config: { emotionDetection: true },
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en-US",
          },
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create assistant");
      }
      const data = await response.json();
      setVapiAssistantId(data.vapiAssistantId);
      return data.vapiAssistantId;
    } catch (error) {
      console.error("Error creating assistant:", error);
      return null;
    }
  };

  // Start the call
  const handleStartCall = async () => {
    if (!micFound) {
      alert("No microphone detected. Please connect a microphone and refresh the page.");
      return;
    }
    try {
      const response = await fetch("/api/getVoiceId");
      const data = await response.json();
      if (data.timeUsed >= FREE_TIME_LIMIT_MINUTES * 60) {
        setHasReachedTimeLimit(true);
        alert(
          "You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!"
        );
        return;
      }
      setTimeUsed(data.timeUsed || 0);
      setRemainingSeconds(FREE_TIME_LIMIT_MINUTES * 60 - (data.timeUsed || 0));
      if (!vapiRef.current) return;
      setIsCallStarting(true);
      console.log("Starting call process...");
      const startOptions = { firstMessage: INITIAL_MESSAGE };
      let callResult;
      if (!vapiAssistantId && hasRequiredCredentials) {
        console.log("No assistant ID found, creating new one...");
        const newAssistantId = await createAssistant();
        if (!newAssistantId) {
          throw new Error("Failed to create assistant");
        }
        console.log("New assistant created:", newAssistantId);
        callResult = await vapiRef.current.start(newAssistantId, startOptions);
        if (!callResult) {
          throw new Error("Failed to start call");
        }
      } else if (vapiAssistantId) {
        console.log("Using existing assistant:", vapiAssistantId);
        callResult = await vapiRef.current.start(vapiAssistantId, startOptions);
        if (!callResult) {
          throw new Error("Failed to start call");
        }
      } else {
        throw new Error("No valid assistant ID available");
      }
      const call = callResult as VapiCall;
      // Override audio settings to disable unsupported audio processing
      if (vapiRef.current.getDailyCallObject) {
        const dailyCall = vapiRef.current.getDailyCallObject();
        if (dailyCall) {
          dailyCall.updateInputSettings({
            audio: { processor: { type: "none" } },
          });
          console.log("Audio processor overridden to 'none'.");
        }
      }
      // Initialize conversation in the database
      if (call.id) {
        try {
          const token = document.cookie.split("token=")[1] || "";
          console.log("Initializing conversation with token:", token);
          const initResponse = await fetch("/api/save-conversation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({
              callId: call.id,
              transcript: "",
              messages: [],
              duration: 0,
            }),
          });
          if (!initResponse.ok) {
            console.error("Failed to initialize conversation");
          } else {
            console.log("Conversation initialized in database");
          }
        } catch (error) {
          console.error("Error initializing conversation:", error);
        }
      }
      setCurrentCallId(call.id);
      setIsCallActive(true);
    } catch (error) {
      console.error("Error starting call:", error);
    } finally {
      setIsCallStarting(false);
    }
  };

  // Stop call and save conversation
  const handleStopCall = async () => {
    console.log("handleStopCall initiated");
    if (!isCallActive) {
      console.log("Call is not active, cannot stop");
      return;
    }
    try {
      if (!vapiRef.current || !currentCallId) {
        console.log("Missing vapiRef or currentCallId:", {
          hasVapiRef: !!vapiRef.current,
          currentCallId,
        });
        return;
      }
      console.log("Stopping call...");
      await vapiRef.current.stop();
      console.log("Call stopped successfully");
      
      // Add conversation history logging
      console.log("=== Conversation History ===");
      console.log("Full Transcript:", currentTranscript);
      console.log("Messages:", messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
      console.log("========================");

      // Wait a moment to ensure transcript events are processed
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Final conversation state:", {
        currentCallId,
        transcript: currentTranscript,
        messages: messages,
        timeUsed,
      });
      try {
        const token = document.cookie.split("token=")[1] || "";
        const response = await fetch("/api/save-conversation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            callId: currentCallId,
            transcript: currentTranscript.trim(),
            messages: messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            duration: timeUsed,
          }),
        });
        const responseText = await response.text();
        console.log("Save conversation response:", responseText);
        if (!response.ok) {
          throw new Error(`Failed to save conversation: ${responseText}`);
        }
      } catch (error) {
        console.error("Error saving conversation:", error);
      }
      // Reset state after stopping call
      setIsCallActive(false);
      setCurrentTranscript("");
      setMessages([]);
      setCurrentCallId(null);
    } catch (error) {
      console.error("Error in handleStopCall:", error);
    }
  };

  // Also modify the periodic save useEffect
  useEffect(() => {
    let saveInterval: NodeJS.Timeout;
    
    if (isCallActive && currentCallId) {
      console.log("Setting up periodic save interval");
      saveInterval = setInterval(async () => {
        if (messages.length === 0 && currentTranscript.length === 0) {
          console.log("No content to save yet");
          return;
        }

        console.log("Attempting periodic save");
        try {
          const token = document.cookie.split("token=")[1] || "";
          const response = await fetch("/api/save-conversation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({
              callId: currentCallId,
              transcript: currentTranscript.trim(),
              messages: messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
              })),
              duration: timeUsed,
              timestamp: new Date().toISOString()
            }),
          });

          const result = await response.text();
          console.log("Periodic save response:", result);

          if (!response.ok) {
            throw new Error(`Failed to save conversation: ${result}`);
          }
        } catch (error) {
          console.error("Periodic save failed:", error);
        }
      }, 5000);
    }

    return () => {
      if (saveInterval) {
        console.log("Cleaning up save interval");
        clearInterval(saveInterval);
      }
    };
  }, [isCallActive, currentCallId, messages, currentTranscript, timeUsed]);

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        {!micFound && (
          <div className="text-red-500 text-center mb-6 p-4 rounded-lg bg-gray-800">
            No microphone detected. Please connect a mic and refresh the page.
          </div>
        )}
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
            (!hasRequiredCredentials || isCallStarting || hasReachedTimeLimit)
              ? "opacity-50"
              : "hover:scale-105 transition-transform"
          }`}
        />
        <div className="flex flex-col items-center space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={handleStartCall}
              disabled={
                !hasRequiredCredentials ||
                isCallActive ||
                isCallStarting ||
                hasReachedTimeLimit ||
                !micFound
              }
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
                isCallActive
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 active:scale-95"
              } ${
                !hasRequiredCredentials ||
                isCallStarting ||
                hasReachedTimeLimit ||
                !micFound
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isCallStarting ? "Starting..." : "Start Conversation"}
            </button>
            <button
              onClick={() => {
                console.log("Stop button clicked");
                handleStopCall();
              }}
              disabled={!isCallActive}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
                isCallActive
                  ? "bg-red-500 hover:bg-red-600 active:scale-95"
                  : "bg-gray-400 cursor-not-allowed"
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
