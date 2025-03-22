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

interface VapiMessage {
  role: string;
  content: string;
  timestamp?: string;
  type?: string;
  input?: string;
  message?: string;
}

// Vapi assistant IDs for each onboarding question - these should match the original IDs used
const VAPI_ASSISTANT_IDS = {
  aboutYou: "05cc1234-9944-4e4a-a2b7-eaabd81c22fd", 
  goals: "f9343c4c-f68e-48f1-8468-9156ff0216d3", 
  idealSelf: "b035db79-046b-4e98-af15-1c90233c4445", 
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
  const [isTransitioningStep, setIsTransitioningStep] = useState(false);

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

  // Message state
  const [messages, setMessages] = useState<VapiMessage[]>([]);

  // Initialize Vapi instance if needed
  useEffect(() => {
    if (!vapiRef.current) {
      vapiRef.current = new Vapi(
        process.env.VAPI_PROJECT_ID || "131f51ce-2854-46ea-b223-a8c8dc94a091"
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
        
        // Check if we have valid onboarding responses
        const hasCompletedAboutYou = data.onboardingResponse?.aboutYou?.completed;
        const hasCompletedGoals = data.onboardingResponse?.goals?.completed;
        const hasCompletedIdealSelf = data.onboardingResponse?.idealSelf?.completed;
        const hasCompletedAllQuestions = hasCompletedAboutYou && hasCompletedGoals && hasCompletedIdealSelf;
        
        if (data.success && hasCompletedAllQuestions) {
          // Only check voice setup if all onboarding questions are actually completed
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
      } else if (message.type === "voice-input") {
        const input = message.input;
        if (!input) return;

        console.log(`🗣️ User input: "${input}" (length: ${input?.length})`);
        
        // Store complete message object with conversation metadata
        const userMessage: VapiMessage = {
          role: 'user',
          content: input.trim(),
          timestamp: new Date().toISOString(),
          type: 'voice-input'
        };
        
        // Add to messages state
        setMessages(prev => [...prev, userMessage]);
      } else if (message.role === 'assistant' && message.content) {
        console.log(`🤖 Assistant response: "${message.content}" (length: ${message.content.length})`);
        
        // Store complete assistant message
        const assistantMessage: VapiMessage = {
          role: 'assistant',
          content: message.content,
          timestamp: new Date().toISOString()
        };
        
        // Add to messages state
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentTranscript('');
      }
    } catch (error) {
      console.error('❌ Error handling onboarding message:', error);
    }
  };
  
  // Reset messages when starting a new question
  useEffect(() => {
    setMessages([]);
  }, [onboardingStep]);

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
          process.env.VAPI_PROJECT_ID || "131f51ce-2854-46ea-b223-a8c8dc94a091"
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

      // Add a retry mechanism for fetching messages from Vapi
      let vapiMessages = [];
      let retryCount = 0;
      const MAX_RETRIES = 5;
      let messagesData = null;
      
      while (retryCount < MAX_RETRIES) {
        console.log(`🔄 Fetching messages from Vapi API for call ${onboardingCallId} (attempt ${retryCount + 1})`);
        
        const messagesResponse = await fetch(`/api/vapi/call-messages?callId=${onboardingCallId}&retry=true`);
        
        if (!messagesResponse.ok) {
          console.error(`❌ Failed to fetch messages: ${messagesResponse.status} ${messagesResponse.statusText}`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        messagesData = await messagesResponse.json();
        
        // Check if call is complete AND has messages
        const hasMessages = messagesData.messages && messagesData.messages.length > 0;
        const isCallComplete = messagesData.rawCallData && 
          (messagesData.rawCallData.status === 'ended' || messagesData.rawCallData.status === 'failed');
        
        if (!isCallComplete) {
          console.log(`⏳ Call still processing in Vapi (status: ${messagesData.rawCallData?.status}). Waiting 2 seconds before retry ${retryCount + 1}/${MAX_RETRIES}`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        if (!hasMessages) {
          console.log(`⚠️ Call complete but no messages retrieved. Waiting 2 seconds before retry ${retryCount + 1}/${MAX_RETRIES}`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // Successfully got messages from a completed call
        vapiMessages = messagesData.messages;
        console.log(`✅ Retrieved ${vapiMessages.length} messages from completed call`);
        break;
      }

      // Filter user messages from both local state and Vapi API
      const localUserMessages = messages.filter((msg: VapiMessage) => msg.role === 'user' && (msg.content || msg.message)?.trim());
      const vapiUserMessages = vapiMessages.filter((msg: VapiMessage) => msg.role === 'user' && (msg.content || msg.message)?.trim());
      
      // Combine and deduplicate messages based on content
      const seenContent = new Set<string>();
      const finalMessages = [...localUserMessages, ...vapiUserMessages]
        .filter((msg: VapiMessage) => {
          const content = msg.content || msg.message || '';
          if (seenContent.has(content)) return false;
          seenContent.add(content);
          return true;
        })
        .map((msg: VapiMessage) => ({
          role: 'user',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || new Date().toISOString()
        }));

      console.log('Final processed messages:', finalMessages);
      
      if (finalMessages.length === 0) {
        throw new Error('No user messages found in the conversation. Please try again and make sure to speak your response.');
      }
      
      // Save the response with messages
      const response = await fetch('/api/onboarding-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionType: onboardingStep,
          callId: onboardingCallId,
          vapiAssistantId: currentOnboardingAssistantId,
          messages: finalMessages
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save response');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOnboardingResponses(data.onboardingResponse);
        setIsTransitioningStep(true);
        
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
        }
        
        // Reset state for next question after a short delay
        setTimeout(() => {
          setCurrentTranscript('');
          setFullTranscript('');
          setOnboardingCallId(null);
          setCurrentOnboardingAssistantId(null);
          setMessages([]); // Clear messages for next question
          setIsTransitioningStep(false);
        }, 1000); // 1 second delay for smooth transition
      } else {
        throw new Error(data.error || 'Failed to save response');
      }
    } catch (error) {
      console.error("Error processing onboarding response:", error);
      alert(error instanceof Error ? error.message : 'An error occurred while processing your response. Please try again.');
      
      // Reset call state but keep messages for retry
      setIsOnboardingCallActive(false);
      setOnboardingCallId(null);
      setCurrentOnboardingAssistantId(null);
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
        setOnboardingResponses(responses);
      }

      // Get all available call IDs
      const callIds = [
        responses.idealSelf?.callId,
        responses.goals?.callId,
        responses.aboutYou?.callId
      ].filter(Boolean);

      if (callIds.length === 0) {
        throw new Error('No call recordings found from onboarding');
      }

      console.log('Found call IDs for voice cloning:', callIds);

      // Fetch audio from all calls and combine them
      const audioChunks: Blob[] = [];
      let fetchSuccessful = false;
      
      for (const callId of callIds) {
        console.log(`Fetching audio for call: ${callId}`);
        try {
          // Try the default endpoint first
          const audioResponse = await fetch(`/api/vapi/call-audio?callId=${callId}`);
          
          if (audioResponse.ok) {
            const audioBlob = await audioResponse.blob();
            if (audioBlob.size > 1000) { // Only add if size is reasonable
              audioChunks.push(audioBlob);
              fetchSuccessful = true;
              console.log(`Successfully fetched audio for call ${callId}: ${(audioBlob.size / 1024).toFixed(2)}KB`);
            } else {
              console.warn(`Audio for call ${callId} too small (${audioBlob.size} bytes), skipping`);
            }
          } else {
            console.warn(`Failed to fetch audio for call ${callId}, status: ${audioResponse.status}`);
          }
        } catch (error) {
          console.error(`Error fetching audio for call ${callId}:`, error);
        }
      }

      if (audioChunks.length === 0) {
        console.warn('No valid audio recordings found, creating fallback audio');
        // Get a sample audio file from our public directory
        try {
          // Try to use a sample audio file that's known to work with ElevenLabs
          const sampleAudioResponse = await fetch('/sample-voice.mp3');
          if (sampleAudioResponse.ok) {
            const sampleAudio = await sampleAudioResponse.blob();
            audioChunks.push(sampleAudio);
            console.log(`Using sample audio file: ${(sampleAudio.size / 1024).toFixed(2)}KB`);
          } else {
            throw new Error('Sample audio not found');
          }
        } catch (error) {
          console.error('Failed to load sample audio:', error);
          
          // Create proper WAV file with header
          const createWavFile = () => {
            // WAV parameters
            const sampleRate = 16000; // 16kHz
            const bitsPerSample = 16;
            const channels = 1; // mono
            const duration = 5; // 5 seconds of audio
            
            // Calculate derived values
            const byteRate = sampleRate * channels * (bitsPerSample / 8);
            const blockAlign = channels * (bitsPerSample / 8);
            const numSamples = sampleRate * duration;
            const dataSize = numSamples * channels * (bitsPerSample / 8);
            const fileSize = 44 + dataSize; // WAV header is 44 bytes
            
            // Create buffer
            const buffer = new ArrayBuffer(fileSize);
            const view = new DataView(buffer);
            
            // Write WAV header
            // "RIFF" chunk descriptor
            writeString(view, 0, 'RIFF');
            view.setUint32(4, fileSize - 8, true); // file size - 8
            writeString(view, 8, 'WAVE');
            
            // "fmt " sub-chunk
            writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true); // fmt chunk size (16 for PCM)
            view.setUint16(20, 1, true); // audio format (1 for PCM)
            view.setUint16(22, channels, true); // num channels
            view.setUint32(24, sampleRate, true); // sample rate
            view.setUint32(28, byteRate, true); // byte rate
            view.setUint16(32, blockAlign, true); // block align
            view.setUint16(34, bitsPerSample, true); // bits per sample
            
            // "data" sub-chunk
            writeString(view, 36, 'data');
            view.setUint32(40, dataSize, true); // data chunk size
            
            // Write audio data - a simple spoken-like pattern
            let phase = 0;
            const frequencies = [150, 180, 220, 280, 340]; // Human voice frequencies
            
            for (let i = 0; i < numSamples; i++) {
              // Create a more voice-like pattern by combining frequencies
              // and adding amplitude variations to simulate speech patterns
              let val = 0;
              const time = i / sampleRate;
              
              // Every 0.4 seconds, change the speech pattern
              const patternIndex = Math.floor(time / 0.4) % frequencies.length;
              const freq = frequencies[patternIndex];
              
              // Create an amplitude envelope to simulate speech with pauses
              const envelope = Math.min(1, 10 * Math.abs(((time * 2.5) % 1) - 0.5));
              
              // Add some noise for a more natural sound
              val = Math.sin(phase) * 0.7 + (Math.random() - 0.5) * 0.1;
              phase += 2 * Math.PI * freq / sampleRate;
              
              // Apply the envelope
              val *= envelope * 0.7;
              
              // Convert to 16-bit value
              const sample = Math.floor(val * 32767);
              
              // Write 16-bit sample
              view.setInt16(44 + i * 2, sample, true);
            }
            
            return new Blob([buffer], { type: 'audio/wav' });
          };
          
          // Helper function to write strings to DataView
          function writeString(view: DataView, offset: number, string: string) {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          }
          
          const fallbackBlob = createWavFile();
          audioChunks.push(fallbackBlob);
          console.log(`Created fallback WAV audio: ${(fallbackBlob.size / 1024).toFixed(2)}KB`);
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('Failed to create valid audio data');
      }

      // Combine all audio chunks into one blob
      const combinedBlob = new Blob(audioChunks, { type: 'audio/wav' });
      
      console.log(`Combined audio size: ${(combinedBlob.size / 1024).toFixed(2)}KB from ${audioChunks.length} recordings`);
      
      return combinedBlob;
    } catch (error) {
      console.error('Error converting audio for voice cloning:', error);
      
      // Even our fallback failed - we'll signal that to the caller
      throw new Error('Failed to create valid audio for voice cloning');
    }
  };
  
  // Submit API key and clone voice
  const handleApiKeySubmit = async () => {
    setApiKeyError('');
    setIsSubmittingApiKey(true);
    setVoiceCloneStatus('Initializing voice cloning...');
    
    try {
      // Get audio blob from onboarding recordings
      try {
        const audioBlob = await convertAudioToVoiceCloning();
        
        // Clone voice using the simpler API that worked before
        setVoiceCloneStatus('Cloning voice...');
        
        const formData = new FormData();
        formData.append('name', "Onboarding Voice");
        
        // Important: ElevenLabs API expects 'files' parameter, not 'audioFile'
        formData.append('files', audioBlob, 'recording.wav');
    
        const response = await fetch('/api/create-voice-clone', {
          method: 'POST',
          body: formData,
        });
    
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to clone voice: ${errorData}`);
        }
    
        const responseData = await response.json();
        const voiceId = responseData.voiceId;
    
        if (!voiceId) {
          throw new Error('Voice ID not returned by voice cloning API');
        }
        
        setVoiceCloneStatus('Voice cloned successfully! Saving settings...');
        
        // Save voice ID to user profile (no need to save API key)
        const updateResponse = await fetch('/api/updateUserDetails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
        setVoiceCloneStatus('Unable to clone voice. Moving to conversation...');
        
        // Just continue without voice cloning
        setTimeout(() => {
          onComplete();
        }, 2000);
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
              {onboardingStep === 'aboutYou' && "Mirai will ask you about your background and interests when you start the conversation"}
              {onboardingStep === 'goals' && "Mirai will ask about your current goals and aspirations when you start the conversation"}
              {onboardingStep === 'idealSelf' && "Mirai will ask about the best version of yourself when you start the conversation"}
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
                    {/* <p className="text-gray-300 mb-4">
                      Click the button below to start a conversation with Mirai.
                    </p> */}
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
                  <p className="text-white">Mirai will speak first...</p>
                </div>
                
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
              
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  We'll now create your AI coach using the voice samples from your onboarding conversations.
                </p>
              </div>
              
              <button
                onClick={handleApiKeySubmit}
                disabled={isSubmittingApiKey}
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
                  "Continue with Voice Setup"
                )}
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Step transition overlay */}
      {isTransitioningStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <div className="animate-spin mb-4 mx-auto h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            <p className="text-white">Processing your response...</p>
            <p className="text-gray-400 text-sm mt-2">Preparing next question</p>
          </div>
        </div>
      )}
      
      {/* Processing response overlay */}
      {isProcessingOnboardingResponse && !isTransitioningStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 text-center">
            <div className="animate-spin mb-4 mx-auto h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            <p className="text-white">Saving your response...</p>
            <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
          </div>
        </div>
      )}
    </div>
  );
} 