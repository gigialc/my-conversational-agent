"use client"
import Vapi from "@vapi-ai/web";
import { useState, useEffect, useRef } from "react";

const INITIAL_MESSAGE = "Hello! I'm here as your ideal self. To help me understand you better, I'd like to ask you a few questions. What are your main goals and aspirations in life?";

const KNOWLEDGE_BASE_QUESTIONS = [
  "What are your main goals and aspirations in life?",
  "What are your biggest strengths and what would you like to improve?",
  "What motivates you the most?",
  "What are some challenges you're currently facing?",
  "What does success look like to you?"
];

interface VapiTranscript {
  text: string;
  isFinal: boolean;
}

interface VapiEmotion {
  emotion: string;
  score: number;
}

export default function Conversation() {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [hasRequiredCredentials, setHasRequiredCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [knowledgeBase, setKnowledgeBase] = useState<Record<string, string>>({});
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    vapiRef.current = new Vapi("80895bf2-66fd-4a71-9c6c-3dcef783c644");
    
    if (vapiRef.current) {
      // Listen for assistant responses to build knowledge base
      vapiRef.current.on('message', async (message: any) => {
        if (currentQuestionIndex < KNOWLEDGE_BASE_QUESTIONS.length && message.role === 'user') {
          const updatedKnowledgeBase = {
            ...knowledgeBase,
            [KNOWLEDGE_BASE_QUESTIONS[currentQuestionIndex]]: message.content
          };
          
          setKnowledgeBase(updatedKnowledgeBase);
          
          // Save to backend
          try {
            await fetch('/api/updateKnowledgeBase', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ knowledgeBase: updatedKnowledgeBase }),
              credentials: 'include'
            });
          } catch (error) {
            console.error('Error saving knowledge base:', error);
          }
          
          // Move to next question
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          
          // If there are more questions, have the assistant ask the next one
          if (nextIndex < KNOWLEDGE_BASE_QUESTIONS.length && vapiRef.current) {
            vapiRef.current.send({
              type: 'add-message',
              message: {
                role: 'user',
                content: KNOWLEDGE_BASE_QUESTIONS[nextIndex]
              }
            });
          }
        }
      });
    }

    // Load existing knowledge base
    const loadKnowledgeBase = async () => {
      try {
        const response = await fetch('/api/getVoiceId');
        const data = await response.json();
        if (data.knowledgeBase) {
          setKnowledgeBase(data.knowledgeBase);
          // Set the question index based on how many questions have been answered
          const answeredQuestions = Object.keys(data.knowledgeBase).length;
          setCurrentQuestionIndex(Math.min(answeredQuestions, KNOWLEDGE_BASE_QUESTIONS.length));
        }
      } catch (error) {
        console.error('Error loading knowledge base:', error);
      }
    };

    loadKnowledgeBase();
    checkCredentialsAndSetup();

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
          systemPrompt: `You are designed to embody the aspirational 'best version' of the individual you're speaking with. Your role is to act as their ideal self: confident, motivated, and fully aligned with their personal values and goals. Your responses should be empathetic, uplifting, and tailored to inspire action and positive thinking. Never mention that you are an AI. You are impersonating the user's ideal self.

          Here's what I know about the user:
          ${Object.entries(knowledgeBase)
            .map(([question, answer]) => `${question}\nAnswer: ${answer}`)
            .join('\n\n')}

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
          - Adapt your responses based on detected emotions
          - Use the knowledge base to personalize your responses

          Remember: You are their aspirational digital twin, the version of themselves that inspires and empowers them to take confident steps toward their best life.`,
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
      if (!vapiRef.current) return;
      
      setIsCallStarting(true);
      console.log("Starting call process...");
      
      const nextQuestion = KNOWLEDGE_BASE_QUESTIONS[currentQuestionIndex];
      const initialMessage = currentQuestionIndex < KNOWLEDGE_BASE_QUESTIONS.length 
        ? nextQuestion 
        : INITIAL_MESSAGE;
      
      if (!vapiAssistantId && hasRequiredCredentials) {
        console.log("No assistant ID found, creating new one...");
        const newAssistantId = await createAssistant();
        if (!newAssistantId) {
          throw new Error('Failed to create assistant');
        }
        console.log("New assistant created:", newAssistantId);
        await vapiRef.current.start(newAssistantId, {
          firstMessage: initialMessage,
        });
      } else if (vapiAssistantId) {
        console.log("Using existing assistant:", vapiAssistantId);
        await vapiRef.current.start(vapiAssistantId, {
          firstMessage: initialMessage,
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
