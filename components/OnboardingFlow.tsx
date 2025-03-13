"use client";
import { useState, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";

interface OnboardingFlowProps {
  userId: string | null;
  onComplete: () => void;
}

interface VapiCall {
  id: string;
}

// Vapi assistant IDs for each onboarding question - these should match the original IDs used
const VAPI_ASSISTANT_IDS = {
  aboutYou: "f5b8bc6b-42dc-462d-8b54-12dd14290299", 
  goals: "93aee5fd-52d1-4c30-a4f5-6e843000141d", 
  idealSelf: "69e5f070-12ab-4f3e-afcf-1f9338d2b132", 
};

export default function OnboardingFlow({ userId, onComplete }: OnboardingFlowProps) {
  // State for tracking onboarding progress
  const [onboardingStep, setOnboardingStep] = useState<'aboutYou' | 'goals' | 'idealSelf' | 'apiKey' | null>(null);
  const [onboardingResponses, setOnboardingResponses] = useState<any>({});
  const [currentOnboardingAssistantId, setCurrentOnboardingAssistantId] = useState<string | null>(null);
  const [onboardingCallId, setOnboardingCallId] = useState<string | null>(null);
  const [isOnboardingCallActive, setIsOnboardingCallActive] = useState(false);
  const [isOnboardingCallStarting, setIsOnboardingCallStarting] = useState(false);
  const [isProcessingOnboardingResponse, setIsProcessingOnboardingResponse] = useState(false);

  // API key and voice cloning state
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [isSubmittingApiKey, setIsSubmittingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [voiceCloneStatus, setVoiceCloneStatus] = useState('');

  // Transcript state
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [fullTranscript, setFullTranscript] = useState<string>('');
  const [micFound, setMicFound] = useState<boolean>(true);

  // Vapi reference
  const vapiRef = useRef<Vapi | null>(null);

  // Initialize Vapi instance if needed
  useEffect(() => {
    if (!vapiRef.current) {
      vapiRef.current = new Vapi(
        process.env.VAPI_PROJECT_ID || "80895bf2-66fd-4a71-9c6c-3dcef783c644"
      );
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.off("message", messageHandler);
        vapiRef.current.stop();
      }
    };
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

  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!userId) return;
      
      try {
        const response = await fetch("/api/onboarding-responses");
        
        // Check if the response is valid JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Received non-JSON response from onboarding API");
          setOnboardingStep('aboutYou'); // Default to first question
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.isCompleted) {
          // Onboarding questions are complete, check if we need to collect API key
          const voiceResponse = await fetch("/api/getVoiceId");
          const voiceData = await voiceResponse.json();
          
          if (voiceData.apiKey && voiceData.voiceId) {
            // Already has voice setup, skip to main conversation
            onComplete();
          } else {
            // Show API key collection step
            setOnboardingStep('apiKey');
            setOnboardingResponses(data.onboardingResponse);
          }
        } else {
          // Set the next onboarding step for questions
          setOnboardingStep(data.nextQuestion || 'aboutYou');
          
          if (data.onboardingResponse) {
            setOnboardingResponses(data.onboardingResponse);
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setOnboardingStep('aboutYou'); // Default to first question on error
      }
    };

    checkOnboardingStatus();
  }, [userId, onComplete]);

  // Message handler for Vapi
  const messageHandler = (message: any) => {
    console.log("🎯 Received message event:", JSON.stringify(message, null, 2));
    
    try {
      if (message.type === "transcript") {
        const transcript = message.transcript || "";
        console.log(`📝 Transcript chunk: "${transcript}"`);
        
        setCurrentTranscript((prev) => {
          const updated = prev + " " + transcript;
          console.log(`📝 Current transcript now: "${updated}"`);
          return updated.trim();
        });
        
        // Also accumulate to the full transcript
        setFullTranscript(prev => {
          const newFull = prev + " " + transcript;
          console.log(`📜 Full transcript length: ${newFull.length} chars`);
          return newFull;
        });
      }
    } catch (error) {
      console.error('❌ Error handling onboarding message:', error);
    }
  };
  
  // Set up message handler when component mounts
  useEffect(() => {
    if (vapiRef.current) {
      vapiRef.current.on("message", messageHandler);
    }
    
    return () => {
      if (vapiRef.current) {
        vapiRef.current.off("message", messageHandler);
      }
    };
  }, []);

  // Start onboarding call with appropriate Vapi assistant
  const startOnboardingCall = async () => {
    if (!onboardingStep || !micFound || onboardingStep === 'apiKey') return;
    
    try {
      setIsOnboardingCallStarting(true);
      
      if (!vapiRef.current) {
        vapiRef.current = new Vapi(
          process.env.VAPI_PROJECT_ID || "80895bf2-66fd-4a71-9c6c-3dcef783c644"
        );
        vapiRef.current.on("message", messageHandler);
      }
      
      // Get the assistant ID for current step
      const assistantId = VAPI_ASSISTANT_IDS[onboardingStep];
      setCurrentOnboardingAssistantId(assistantId);
      
      // Start the call with no first message (assistant will start)
      const callResult = await vapiRef.current.start(assistantId);
      const call = callResult as VapiCall;
      setOnboardingCallId(call.id);
      
      console.log(`Starting onboarding call for ${onboardingStep} with assistant ${assistantId}`);
      setIsOnboardingCallActive(true);
      setCurrentTranscript('');
      setFullTranscript('');
    } catch (error) {
      console.error("Error starting onboarding call:", error);
      alert("Failed to start voice assistant. Please try again.");
    } finally {
      setIsOnboardingCallStarting(false);
    }
  };

  // End onboarding call and process response
  const endOnboardingCall = async () => {
    if (!onboardingStep || !onboardingCallId || onboardingStep === 'apiKey') return;
    
    try {
      setIsProcessingOnboardingResponse(true);
      
      // Stop the call
      if (vapiRef.current) {
        await vapiRef.current.stop();
      }
      setIsOnboardingCallActive(false);
      
      // Save the response
      const response = await fetch('/api/onboarding-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionType: onboardingStep,
          transcript: fullTranscript || currentTranscript,
          callId: onboardingCallId,
          vapiAssistantId: currentOnboardingAssistantId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOnboardingResponses(data.onboardingResponse);
        
        // Move to next question or finish question flow and go to API key
        if (data.allCompleted) {
          setOnboardingStep('apiKey'); // Move to API key collection
        } else {
          // Move to next question
          if (onboardingStep === 'aboutYou') {
            setOnboardingStep('goals');
          } else if (onboardingStep === 'goals') {
            setOnboardingStep('idealSelf');
          } else {
            setOnboardingStep('apiKey'); // Move to API key collection
          }
          
          // Reset state for next question
          setCurrentTranscript('');
          setFullTranscript('');
          setOnboardingCallId(null);
          setCurrentOnboardingAssistantId(null);
        }
      } else {
        console.error("Failed to save onboarding response:", data.error);
        alert("Failed to save your response. Please try again.");
      }
    } catch (error) {
      console.error("Error processing onboarding response:", error);
      alert("An error occurred while processing your response. Please try again.");
    } finally {
      setIsProcessingOnboardingResponse(false);
    }
  };
  
  // Convert transcript audio from Vapi call to usable format for voice cloning
  const convertAudioToVoiceCloning = async (): Promise<Blob> => {
    try {
      // Get onboarding response data if we don't already have it
      let responses = onboardingResponses;
      if (!responses) {
        const response = await fetch('/api/onboarding-responses');
        if (!response.ok) {
          throw new Error('Failed to fetch onboarding responses');
        }
        responses = await response.json();
        // Update state for future reference
        setOnboardingResponses(responses);
      }

      // Get audio from one of the onboarding call recordings
      // Prioritize the most recent call (idealSelf) as it's likely to be higher quality
      const callId = responses.idealSelf?.callId || 
                     responses.goals?.callId || 
                     responses.aboutYou?.callId;

      if (!callId) {
        throw new Error('No call recordings found from onboarding');
      }

      console.log('Using call ID for voice cloning:', callId);
      console.log('From onboarding response:', 
        callId === responses.idealSelf?.callId ? 'idealSelf' :
        callId === responses.goals?.callId ? 'goals' : 'aboutYou');

      // Fetch audio from our API endpoint
      const audioResponse = await fetch(`/api/vapi/call-audio?callId=${callId}`);
      
      if (!audioResponse.ok) {
        const errorText = await audioResponse.text();
        throw new Error(`Failed to fetch call audio: ${audioResponse.status} ${errorText}`);
      }
      
      const audioBlob = await audioResponse.blob();
      
      // Check if the blob is empty or too small
      if (audioBlob.size < 1000) { // Less than 1KB is likely not valid audio
        throw new Error(`Audio file is too small (${audioBlob.size} bytes), likely empty or invalid`);
      }
      
      console.log(`Successfully retrieved audio: ${(audioBlob.size / 1024).toFixed(2)}KB`);
      
      return audioBlob;
    } catch (error) {
      console.error('Error converting audio for voice cloning:', error);
      throw error;
    }
  };
  
  // Submit API key and clone voice
  const handleApiKeySubmit = async () => {
    if (!elevenlabsApiKey.trim()) {
      setApiKeyError('API key is required');
      return;
    }
    
    setApiKeyError('');
    setIsSubmittingApiKey(true);
    setVoiceCloneStatus('Initializing voice cloning...');
    
    // Create a function that will save the API key without voice cloning
    const saveApiKeyOnly = async () => {
      setVoiceCloneStatus('Saving API key without voice cloning...');
      try {
        const updateResponse = await fetch('/api/updateUserDetails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elevenlabsapi: elevenlabsApiKey,
            // No voice ID - will use default ElevenLabs voice
          }),
          credentials: 'include'
        });
        
        if (!updateResponse.ok) {
          throw new Error('Failed to save API key');
        }
        
        setVoiceCloneStatus('API key saved! Redirecting to conversation...');
        
        // API key is saved, continue to main conversation
        onComplete();
      } catch (error) {
        console.error('Error saving API key:', error);
        setApiKeyError(error instanceof Error ? error.message : 'Failed to save API key');
        setVoiceCloneStatus('');
      }
    };
    
    try {
      // Get audio blob from onboarding recordings
      try {
        const audioBlob = await convertAudioToVoiceCloning();
        
        // Clone voice using ElevenLabs API
        setVoiceCloneStatus('Cloning voice with ElevenLabs...');
        
        const formData = new FormData();
        formData.append('name', "Onboarding Voice");
        formData.append('files', audioBlob, 'recording.wav');
    
        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: { 'xi-api-key': elevenlabsApiKey },
          body: formData,
        });
    
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to clone voice: ${errorData}`);
        }
    
        const responseData = await response.json();
        const voiceId = responseData.voice_id;
    
        if (!voiceId) {
          throw new Error('Voice ID not returned by ElevenLabs API');
        }
        
        setVoiceCloneStatus('Voice cloned successfully! Saving settings...');
        
        // Save voice ID and API key to user profile
        const updateResponse = await fetch('/api/updateUserDetails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            elevenlabsapi: elevenlabsApiKey,
            elevenlabsagentid: voiceId
          }),
          credentials: 'include'
        });
        
        if (!updateResponse.ok) {
          throw new Error('Failed to save voice settings');
        }
        
        setVoiceCloneStatus('All set! Redirecting to conversation...');
        
        // Voice setup complete, move to main conversation
        onComplete();
      } catch (audioError) {
        // Audio retrieval or voice cloning failed
        console.error('Error retrieving or cloning voice:', audioError);
        setVoiceCloneStatus('Unable to clone voice. Checking options...');
        
        // Check if we can retry or should offer alternative
        const { canRetry, message } = await handleAudioRetrievalFailure();
        
        if (canRetry) {
          if (confirm(message)) {
            // User wants to retry with a different recording
            resetApiKeyForm();
            return;
          }
        }
        
        // Offer to just save the API key
        if (confirm(message)) {
          await saveApiKeyOnly();
        } else {
          setApiKeyError('Voice cloning canceled. Please try again when ready.');
          setVoiceCloneStatus('');
        }
      }
    } catch (error) {
      console.error('Error in voice cloning process:', error);
      setApiKeyError(error instanceof Error ? error.message : 'Failed to clone voice');
      setVoiceCloneStatus('');
    } finally {
      setIsSubmittingApiKey(false);
    }
  };

  // Cancel the current call
  const cancelCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setIsOnboardingCallActive(false);
    setCurrentTranscript('');
    setFullTranscript('');
  };

  // Function to reset the API key state and errors
  const resetApiKeyForm = () => {
    setElevenlabsApiKey('');
    setApiKeyError('');
    setVoiceCloneStatus('');
    setIsSubmittingApiKey(false);
  };

  // Reset the form on error  
  useEffect(() => {
    if (apiKeyError) {
      const timer = setTimeout(() => {
        setVoiceCloneStatus('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [apiKeyError]);

  // Function to handle cases where retrieving audio fails completely
  const handleAudioRetrievalFailure = async () => {
    // Check if we should try getting audio from a different onboarding question
    try {
      // Get onboarding response data if we don't already have it
      let responses = onboardingResponses;
      if (!responses) {
        const response = await fetch('/api/onboarding-responses');
        if (!response.ok) {
          throw new Error('Failed to fetch onboarding responses');
        }
        responses = await response.json();
        setOnboardingResponses(responses);
      }
      
      // Check if we have any other call IDs we could try
      const allCallIds = [
        responses.idealSelf?.callId,
        responses.goals?.callId,
        responses.aboutYou?.callId
      ].filter(Boolean);
      
      if (allCallIds.length > 1) {
        // We have more than one call, so we could potentially try another
        return {
          canRetry: true,
          message: 'Would you like to try voice cloning using a different conversation recording?'
        };
      }
    } catch (error) {
      console.error('Error checking for alternative call IDs:', error);
    }
    
    // Default case - offer to save API key only
    return {
      canRetry: false,
      message: 'We couldn\'t retrieve your voice recordings. Would you like to save your ElevenLabs API key without voice cloning?'
    };
  };

  return (
    <div className="flex flex-col items-center max-w-md w-full px-6">
      <h1 className="text-2xl font-semibold text-center mb-6 text-white">Welcome to Mirai</h1>
      
      {/* Progress indicator - include API key step */}
      <div className="mb-6 flex justify-center">
        <div className="flex space-x-2">
          <div 
            className={`h-2 w-16 rounded-full transition-colors duration-300 ${
              onboardingStep === 'aboutYou' ? "bg-purple-500" : onboardingResponses.aboutYou?.completed ? "bg-green-500" : "bg-gray-600"
            }`}
          ></div>
          <div 
            className={`h-2 w-16 rounded-full transition-colors duration-300 ${
              onboardingStep === 'goals' ? "bg-purple-500" : onboardingResponses.goals?.completed ? "bg-green-500" : "bg-gray-600"
            }`}
          ></div>
          <div 
            className={`h-2 w-16 rounded-full transition-colors duration-300 ${
              onboardingStep === 'idealSelf' ? "bg-purple-500" : onboardingResponses.idealSelf?.completed ? "bg-green-500" : "bg-gray-600"
            }`}
          ></div>
          <div 
            className={`h-2 w-16 rounded-full transition-colors duration-300 ${
              onboardingStep === 'apiKey' ? "bg-purple-500" : "bg-gray-600"
            }`}
          ></div>
        </div>
      </div>
      
      {onboardingStep !== 'apiKey' ? (
        // Standard onboarding questions UI
        <>
          {/* Current question title */}
          <div className="mb-4 text-center">
            <h2 className="text-xl font-medium text-white">
              {onboardingStep === 'aboutYou' && "Tell me about yourself"}
              {onboardingStep === 'goals' && "Your goals"}
              {onboardingStep === 'idealSelf' && "Your ideal self"}
            </h2>
            <p className="text-gray-400 mt-2">
              {onboardingStep === 'aboutYou' && "I'll ask about your background and interests"}
              {onboardingStep === 'goals' && "I'll ask about your current goals and aspirations"}
              {onboardingStep === 'idealSelf' && "I'll ask about the best version of yourself"}
            </p>
          </div>
          
          {/* Voice assistant container */}
          <div className="bg-gray-900 rounded-lg p-6 w-full mb-6">
            {!isOnboardingCallActive ? (
              <div className="text-center">
                {isOnboardingCallStarting ? (
                  <div className="text-white mb-4">
                    <div className="animate-pulse">Starting voice assistant...</div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-300 mb-4">
                      Click the button below to start a conversation with our voice assistant.
                    </p>
                    <button
                      onClick={startOnboardingCall}
                      disabled={!micFound || isOnboardingCallStarting}
                      className="px-5 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      Start Voice Conversation
                    </button>
                    
                    {!micFound && (
                      <p className="mt-2 text-red-500 text-sm">
                        No microphone detected. Please connect a mic and refresh the page.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div>
                {/* Active call UI */}
                <div className="flex items-center mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
                  <p className="text-white">Voice assistant is listening...</p>
                </div>
                
                {/* Transcript display */}
                {(currentTranscript || fullTranscript) && (
                  <div className="bg-gray-800 rounded-lg p-4 my-4">
                    <p className="text-gray-400 text-sm mb-1">You said:</p>
                    <p className="text-white">{currentTranscript || fullTranscript}</p>
                  </div>
                )}
                
                <div className="flex justify-between mt-6">
                  <button 
                    onClick={cancelCall}
                    className="px-4 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={endOnboardingCall}
                    disabled={isProcessingOnboardingResponse}
                    className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessingOnboardingResponse ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      "Save & Continue"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        // API Key collection UI
        <>
          <div className="mb-6 text-center">
            <h2 className="text-xl font-medium text-white">
              Final Step: Voice Setup
            </h2>
            <p className="text-gray-400 mt-2">
              We'll use your voice from the onboarding interviews to create your personalized AI coach
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6 w-full mb-6">
            <div className="space-y-4">
              <div className="text-white mb-4">
                <label className="block text-sm font-medium mb-2">
                  ElevenLabs API Key
                </label>
                <input
                  type="text"
                  value={elevenlabsApiKey}
                  onChange={(e) => setElevenlabsApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                
                <p className="text-xs text-gray-400 mt-1">
                  You can get an API key from <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">ElevenLabs.io</a>
                </p>
              </div>
              
              {apiKeyError && (
                <div className="p-3 rounded-md bg-red-900 bg-opacity-20 border border-red-500 text-red-400 text-sm">
                  {apiKeyError}
                </div>
              )}
              
              {voiceCloneStatus && (
                <div className="p-3 rounded-md bg-blue-900 bg-opacity-20 border border-blue-500 text-blue-400 text-sm">
                  {voiceCloneStatus}
                </div>
              )}
              
              <button
                onClick={handleApiKeySubmit}
                disabled={isSubmittingApiKey || !elevenlabsApiKey.trim()}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isSubmittingApiKey ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Submit & Create Voice"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 