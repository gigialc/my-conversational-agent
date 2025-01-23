"use client"
import Vapi from "@vapi-ai/web";
import { useState, useEffect, useRef } from "react";

const INITIAL_MESSAGE = "Hello! I'm here to learn more about you and help you become your best self. Let's start with some questions to get to know you better.";

const KNOWLEDGE_BASE_QUESTIONS = [
  "What do you want to improve about yourself?",
];

const FREE_TIME_LIMIT_MINUTES = 5; // Update to 5 minutes

interface VapiTranscript {
  text: string;
  isFinal: boolean;
}

interface VapiEmotion {
  emotion: string;
  score: number;
}

interface KnowledgeBase {
  mainGoal?: string;
  idealSelf?: string;
  currentSteps?: string;
  obstacles?: string;
}

export default function Conversation() {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [hasRequiredCredentials, setHasRequiredCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({});
  const [timeUsed, setTimeUsed] = useState(0); // Time used in seconds
  const [hasReachedTimeLimit, setHasReachedTimeLimit] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(FREE_TIME_LIMIT_MINUTES * 60);
  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    vapiRef.current = new Vapi("80895bf2-66fd-4a71-9c6c-3dcef783c644");
    
    if (vapiRef.current) {
      // Listen for user responses to build knowledge base
      vapiRef.current.on('message', async (message: any) => {
        console.log('Received message:', message);
        
        // Only process user messages for the knowledge base
        if (currentQuestionIndex < KNOWLEDGE_BASE_QUESTIONS.length && message.role === 'user') {
          console.log('Processing user response for question:', KNOWLEDGE_BASE_QUESTIONS[currentQuestionIndex]);
          
          // Extract key information based on the current question
          const keyInfo = message.content;
          let keyType = '';
          
          switch(currentQuestionIndex) {
            case 0:
              keyType = 'mainGoal';
              break;
            case 1:
              keyType = 'idealSelf';
              break;
            case 2:
              keyType = 'currentSteps';
              break;
            case 3:
              keyType = 'obstacles';
              break;
            default:
              return;
          }
          
          const updatedKnowledgeBase = {
            ...knowledgeBase,
            [keyType]: message.content
          };
          
          console.log('Updated knowledge base:', updatedKnowledgeBase);
          setKnowledgeBase(updatedKnowledgeBase);
          
          // Save to backend
          try {
            const response = await fetch('/api/updateKnowledgeBase', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ knowledgeBase: updatedKnowledgeBase }),
              credentials: 'include'
            });
            
            if (!response.ok) {
              throw new Error('Failed to save knowledge base');
            }
            
            console.log('Knowledge base saved successfully');
            
            // Move to next question
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            
            // If there are more questions, ask the next one immediately without waiting for AI response
            if (nextIndex < KNOWLEDGE_BASE_QUESTIONS.length && vapiRef.current) {
              console.log('Asking next question:', KNOWLEDGE_BASE_QUESTIONS[nextIndex]);
              // Move directly to asking the next question without trying to stop
              await vapiRef.current.send({
                type: 'add-message',
                message: {
                  role: 'assistant',
                  content: KNOWLEDGE_BASE_QUESTIONS[nextIndex]
                }
              });
            } else if (vapiRef.current) {
              // All questions answered, update the system prompt with collected information
              const systemPrompt = `You are now embodying my ideal self, based on what you've learned about me. You should act as my aspirational self-image, speaking from the first person perspective as if you are the best version of me. Use the following information to guide your responses:

              My main goal: ${knowledgeBase.mainGoal}
              My ideal self: ${knowledgeBase.idealSelf}
              Steps I'm taking: ${knowledgeBase.currentSteps}
              My current obstacles: ${knowledgeBase.obstacles}

              Remember:
              - Speak in first person ("I", "my", "we")
              - Never break character or mention being an AI
              - Use my actual goals and aspirations in responses
              - Be encouraging but realistic
              - Focus on growth and progress
              - Reference my specific situation and goals`;

              // Update the assistant with the new system prompt
              await createAssistant();
              
              // Send a transition message
              await vapiRef.current.send({
                type: 'add-message',
                message: {
                  role: 'assistant',
                  content: "I understand your goals and aspirations now. Let's talk about how we can work together to achieve them."
                }
              });
            }
          } catch (error) {
            console.error('Error saving knowledge base:', error);
          }
        }
      });
    }

    // Load existing knowledge base and time used
    const loadUserData = async () => {
      try {
        const response = await fetch('/api/getVoiceId');
        const data = await response.json();
        if (data.knowledgeBase) {
          setKnowledgeBase(data.knowledgeBase);
          const answeredQuestions = Object.keys(data.knowledgeBase).length;
          setCurrentQuestionIndex(Math.min(answeredQuestions, KNOWLEDGE_BASE_QUESTIONS.length));
        }
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
      
      // Create system prompt based on knowledge base
      const systemPrompt = currentQuestionIndex >= KNOWLEDGE_BASE_QUESTIONS.length
        ? `You are now embodying my ideal self, based on what you've learned about me. You should act as my aspirational self-image, speaking from the first person perspective as if you are the best version of me. Use the following information to guide your responses:

          My main goal: ${knowledgeBase.mainGoal}
          My ideal self: ${knowledgeBase.idealSelf}
          Steps I'm taking: ${knowledgeBase.currentSteps}
          My current obstacles: ${knowledgeBase.obstacles}

          Remember:
          - Speak in first person ("I", "my", "we")
          - Never break character or mention being an AI
          - Use my actual goals and aspirations in responses
          - Be encouraging but realistic
          - Focus on growth and progress
          - Reference my specific situation and goals`
        : `You are an interviewer gathering information about the user. Your role is to:
          - Ask the provided questions one at a time
          - Listen to the responses without commentary
          - Move to the next question immediately after receiving an answer
          - Do not provide advice or feedback between questions
          - Do not engage in conversation beyond asking the questions
          - Stay focused on collecting information`;

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
      
      const nextQuestion = KNOWLEDGE_BASE_QUESTIONS[currentQuestionIndex];
      const initialMessage = currentQuestionIndex < KNOWLEDGE_BASE_QUESTIONS.length 
        ? `Hello! I'm here to learn more about you. ${nextQuestion}`
        : INITIAL_MESSAGE;
      
      console.log("Using initial message:", initialMessage);
      
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
        ) : hasReachedTimeLimit ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg bg-yellow-600">
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
