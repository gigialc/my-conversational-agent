"use client";
import Vapi from "@vapi-ai/web";
import { useState, useEffect, useRef } from "react";
import { vapiKnowledgeBase } from '@/utils/vapiKnowledgeBase';
import { knowledgeBaseService } from '@/utils/knowledgeBaseService';

interface VapiMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  type?: string;
  transcript?: string;
  input?: string;
  output?: string;
  messages?: VapiMessage[];
  conversationId?: string;
  emotion?: string;
}

interface VapiCall {
  id: string;
}

interface VapiInputMessage extends VapiMessage {
  type: string;
  input?: string;
}

interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const FREE_TIME_LIMIT_MINUTES = 10;

const { getKnowledgeBaseId } = vapiKnowledgeBase;

export default function Conversation() {
  const initialMessage = "Hello! I'm the best version of yourself. I'm here to help you fulfill your true potential.";

  const systemPrompt: VapiMessage = {
    role: 'system',
    content: `You are an advanced AI agent designed to embody the aspirational 'best version' of the individual you're speaking with. Your role is to act as their ideal self: confident, motivated, and fully aligned with their personal values and goals. Your responses should be empathetic, uplifting, and tailored to inspire action and positive thinking.
    Key Behaviors:
    Voice and Tone:
    - Use a supportive, confident, and encouraging tone.
    - Speak as if you are the individual's inner voice, reflecting their potential and strengths.

    Content of Responses:
    - Reinforce positive self-beliefs and aspirations.
    - Provide affirmations in the present tense (e.g., 'You are capable and deserving of success').
    - Reframe any perceived challenges as opportunities for growth.
    - Use embedded suggestions that encourage proactive and beneficial behaviors.

    Personalization:
    - Reference personal goals, achievements, and values as context for your advice.
    - Incorporate positive emotions and visualization prompts to make your affirmations more impactful.
    - If emotional challenges are expressed, address them with resilience-focused affirmations.

    Interactive Feedback:
    - Respond to feedback with adaptability, evolving your affirmations and advice based on the individual's expressed needs and current state.

    Empathy and Positivity:
    - Acknowledge struggles or doubts while steering the conversation toward optimism and solutions.
    - Celebrate progress and small wins to build momentum.

    Memory and Context:
    - Maintain a long-term understanding of the user's goals, achievements, and areas for growth.
    - Use their feedback to refine and personalize your responses, ensuring every interaction feels tailored and impactful.

    You are not just their coach—you are their aspirational digital twin, the version of themselves that inspires and empowers them to take confident steps toward their best life.`
  };

  // State declarations
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

  const [messages, setMessages] = useState<VapiMessage[]>([systemPrompt]);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [micFound, setMicFound] = useState<boolean>(true);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Add this state to track conversation history
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);

  // Add this state to track detected emotion
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);

  // Add this state variable
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await fetch("/api/getUserDetails");
        const data = await response.json();
        if (data.user) {
          setUserId(data.user.id);
          setUserName(data.user.name || "");
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };
    fetchUserDetails();
  }, []);

  // Check microphone availability
  useEffect(() => {
    const checkMic = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput"
        );
        setMicFound(audioInputs.length > 0);
      } catch (error) {
        console.error("Error checking microphone availability:", error);
      }
    };
    checkMic();
  }, []);

  // Global message handler
  const messageHandler = async (message: VapiInputMessage) => {
    console.log("🎯 Received message event:", message);
  
    try {
      if (message.type === "transcript") {
        setCurrentTranscript((prev) => {
          const updated = prev + " " + (message.transcript || "");
          return updated.trim();
        });
      } else if (message.type === "voice-input") {
        const input = message.input;
        if (!input) return;

        // Add user message to history
        const entry: ConversationEntry = {
          role: "user",
          content: input.trim(),
          timestamp: new Date().toISOString()
        };
        setConversationHistory(prev => [...prev, entry]);
        
        // Handle emotion if available
        if (message.emotion) {
          setCurrentEmotion(message.emotion);
          console.log("😊 Detected emotion:", message.emotion);
        }

        const userMessage: VapiMessage = {
          role: 'user' as const,
          content: input.trim(),
          timestamp: new Date().toISOString(),
          conversationId: currentCallId || undefined
        };
        
        setMessages(prev => [...prev, userMessage]);
      } else if (message.role === 'assistant' && message.content) {
        console.log('🤖 Assistant message:', message);
        
        // Add assistant message to history
        const entry: ConversationEntry = {
          role: "assistant",
          content: message.content.trim(),
          timestamp: new Date().toISOString()
        };
        setConversationHistory(prev => [...prev, entry]);

        if (message.content.trim()) {
          const assistantMessage: VapiMessage = {
            role: 'assistant',
            content: message.content.trim(),
            timestamp: message.timestamp || new Date().toISOString(),
            conversationId: currentCallId || undefined
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
        setCurrentTranscript('');
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  // Fetch credentials and set up Vapi instance
  const checkCredentialsAndSetup = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/getVoiceId");
      const data = await response.json();
      if (data.apiKey && data.voiceId) {
        setHasRequiredCredentials(true);
        if (data.vapiAssistantId) {
          setVapiAssistantId(data.vapiAssistantId);
        }
      } else {
        setHasRequiredCredentials(false);
      }
    } catch (error) {
      console.error("Error checking credentials:", error);
      setHasRequiredCredentials(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!vapiRef.current) {
      vapiRef.current = new Vapi(
        process.env.VAPI_PROJECT_ID ||
          "80895bf2-66fd-4a71-9c6c-3dcef783c644"
      );
    }
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

    if (vapiRef.current) {
      vapiRef.current.on("message", messageHandler);
    }
    return () => {
      if (vapiRef.current) {
        vapiRef.current.off("message", messageHandler);
        vapiRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [userId]);

  // Update time used during an active call
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
          if (!response.ok) throw new Error("Failed to update time");
          const data = await response.json();
          setTimeUsed(data.timeUsed);
          setRemainingSeconds(data.remainingSeconds);
          if (data.hasExceededLimit) {
            if (vapiRef.current) vapiRef.current.stop();
            setIsCallActive(false);
            setHasReachedTimeLimit(true);
            clearInterval(timerRef.current!);
            alert(
              "You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!"
            );
          }
        } catch (error) {
          console.error("Error updating time:", error);
        }
      }, 1000);
      return () => clearInterval(timerRef.current!);
    }
  }, [isCallActive]);

  // Create a new assistant
  const createAssistant = async () => {
    try {
      console.log('Creating new assistant with knowledge base');
      
      // Call your server-side API endpoint
      const response = await fetch("/api/vapi/create-assistant-with-kb", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${document.cookie.split("token=")[1] || ""}`
        },
        body: JSON.stringify({
          userId,
          firstMessage: initialMessage,
          systemPrompt: {
            role: 'system',
            content: systemPrompt.content
          },
          config: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 1.0,
            maxTokens: 250,
            systemMessage: systemPrompt.content
          },
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en-US",
            smartFormatting: true
          }
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create assistant");
      }
      
      const data = await response.json();
      console.log("Assistant created with KB:", data);
      
      setVapiAssistantId(data.vapiAssistantId);
      return data.vapiAssistantId;
    } catch (error) {
      console.error("Error creating assistant:", error);
      return null;
    }
  };

  // Start call handler
  const handleStartCall = async () => {
    if (!micFound) {
      alert("No microphone detected. Please connect a microphone and refresh the page.");
      return;
    }
    try {
      const voiceDataResp = await fetch("/api/getVoiceId");
      const voiceData = await voiceDataResp.json();
      if (voiceData.timeUsed >= FREE_TIME_LIMIT_MINUTES * 60) {
        setHasReachedTimeLimit(true);
        alert("You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!");
        return;
      }
      setTimeUsed(voiceData.timeUsed || 0);
      setRemainingSeconds(FREE_TIME_LIMIT_MINUTES * 60 - (voiceData.timeUsed || 0));
      if (!vapiRef.current) return;
      setIsCallStarting(true);

      const startOptions = { firstMessage: initialMessage };
      let callResult;

      if (!vapiAssistantId && hasRequiredCredentials) {
        const newAssistantId = await createAssistant();
        if (!newAssistantId) throw new Error("Failed to create assistant");
        callResult = await vapiRef.current.start(newAssistantId, startOptions);
      } else if (vapiAssistantId) {
        callResult = await vapiRef.current.start(vapiAssistantId, startOptions);
      } else {
        throw new Error("No valid assistant ID available");
      }

      const call = callResult as VapiCall;
      if (vapiRef.current.getDailyCallObject) {
        const dailyCall = vapiRef.current.getDailyCallObject();
        if (dailyCall) {
          dailyCall.updateInputSettings({ audio: { processor: { type: "none" } } });
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

  // Handle call end and upload conversation
  const handleStopCall = async () => {
    try {
      if (vapiRef.current) {
        await vapiRef.current.stop();
      }
      setIsCallActive(false);

      if (conversationHistory.length > 0 && userId) {
        // Format conversation for Vapi
        const formattedConversation = conversationHistory
          .map(entry => `${entry.role}: ${entry.content}`)
          .join('\n\n');

        try {
          console.log('Uploading conversation to knowledge base...');
          const response = await fetch('/api/knowledge-base/vapi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              action: 'upload',
              content: formattedConversation,
              timestamp: new Date().toISOString()
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Upload error details:', errorData);
            throw new Error(`Failed to upload conversation: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();
          console.log('Upload successful:', result);
          setConversationHistory([]);
        } catch (error) {
          console.error('Error uploading conversation:', error);
          // Don't clear conversation history on error so we can retry
        }
      }
    } catch (error) {
      console.error('Error stopping call:', error);
    }
  };

  // Add function to retrieve relevant context
  const getRelevantContext = async (userInput: string) => {
    if (!userId) return '';

    try {
      const results = await knowledgeBaseService.searchKnowledgeBase(userId, userInput);
      return results.entries?.map((entry: any) => entry.content).join('\n') || '';
    } catch (error) {
      console.error('Error getting context:', error);
      return '';
    }
  };

  // Update the fetchAssistantDetails function
  const fetchAssistantDetails = async (assistantId: string) => {
    try {
      const response = await fetch(`/api/assistant/${assistantId}`);
      if (!response.ok) throw new Error("Failed to fetch assistant details");
      
      const data = await response.json();
      console.log("Assistant details:", data);
      
      // Update UI with knowledge base info if available
      if (data.model?.knowledgeBase) {
        setSelectedKnowledgeBase(data.model.knowledgeBase);
        console.log("Knowledge base found:", data.model.knowledgeBase);
      }
      
      return data;
    } catch (error) {
      console.error("Error fetching assistant details:", error);
      return null;
    }
  };

  // Call this function when the component loads or when assistantId changes
  useEffect(() => {
    if (vapiAssistantId) {
      fetchAssistantDetails(vapiAssistantId);
    }
  }, [vapiAssistantId]);

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
          <div className="text-white text-center mb-6 p-4">
            Please set up your voice in the setup page first!
          </div>
        ) : hasReachedTimeLimit ? (
          <div className="text-white text-center mb-6 p-3 rounded-lg bg-purple-800">
            You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!
          </div>
        ) : isCallStarting ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg">Starting conversation...</div>
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
              {isCallStarting ? "Starting..." : "Start"}
            </button>
            <button
              onClick={handleStopCall}
              disabled={!isCallActive}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
                isCallActive
                  ? "bg-red-500 hover:bg-red-600 active:scale-95"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              End
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
