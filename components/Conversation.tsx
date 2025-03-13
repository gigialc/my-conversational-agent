"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAssistantManager } from "@/hooks/useAssistantManager";
import { useCallManager } from "@/hooks/useCallManager";
import OnboardingFlow from "./OnboardingFlow";
import VoiceSetup from "./VoiceSetup";

const FREE_TIME_LIMIT_MINUTES = 10;

export default function Conversation() {
  const router = useRouter();
  
  // State for user details
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  
  // State for time tracking
  const [timeUsed, setTimeUsed] = useState(0);
  const [hasReachedTimeLimit, setHasReachedTimeLimit] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    FREE_TIME_LIMIT_MINUTES * 60
  );
  
  // State for app flow
  const [isLoading, setIsLoading] = useState(true);
  const [hasRequiredCredentials, setHasRequiredCredentials] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  
  // Assistant manager hook
  const {
    vapiAssistantId,
    initialMessage,
    createAssistant
  } = useAssistantManager({ userId });
  
  // Call manager hook
  const {
    isCallActive,
    isCallStarting,
    isWaitingForVapi,
    currentTranscript,
    micFound,
    startCall,
    stopCall
  } = useCallManager({ userId, assistantId: vapiAssistantId });
  
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

  // Check onboarding status first, then credentials
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      console.log('Checking user status...');
      
      try {
        // First check if user has completed onboarding
        let onboardingData;
        try {
          const onboardingResponse = await fetch("/api/onboarding-responses");
          
          // Check if the response is valid JSON
          const contentType = onboardingResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            onboardingData = await onboardingResponse.json();
          } else {
            console.error("Received non-JSON response from onboarding API");
            // Default to showing onboarding
            setIsOnboarding(true);
            setShowSetup(false);
            setIsLoading(false);
            return;
          }
        } catch (onboardingError) {
          console.error("Error checking onboarding status:", onboardingError);
          // Default to showing onboarding
          setIsOnboarding(true);
          setShowSetup(false);
          setIsLoading(false);
          return;
        }
        
        if (!onboardingData.success || !onboardingData.isCompleted) {
          // Onboarding is not complete, show onboarding flow
          setIsOnboarding(true);
          setShowSetup(false);
          setIsLoading(false);
          return;
        }
        
        // Onboarding is complete, now check credentials
        const credsResponse = await fetch("/api/getVoiceId");
        const credsData = await credsResponse.json();
        
        // Check time usage
        if (credsData.timeUsed) {
          setTimeUsed(credsData.timeUsed);
          if (credsData.timeUsed >= FREE_TIME_LIMIT_MINUTES * 60) {
            setHasReachedTimeLimit(true);
          }
          setRemainingSeconds(FREE_TIME_LIMIT_MINUTES * 60 - credsData.timeUsed);
        }
        
        // Check if we have required voice setup - we'll just check if we have voice ID
        // since the API key collection is now part of onboarding
        if (credsData.voiceId) {
          setHasRequiredCredentials(true);
          setShowSetup(false);
          
          // Check if user already has an assistant ID in the database
          if (credsData.vapiAssistantId) {
            // If they do, skip creation since assistant already exists
            console.log('Assistant already exists with ID:', credsData.vapiAssistantId);
          } else {
            // Only create a new assistant if they don't have one in DB
            console.log('No existing assistant found, creating new one...');
            try {
              const assistantId = await createAssistant();
              if (!assistantId) {
                throw new Error('Failed to create assistant');
              }
              console.log('Successfully created new assistant with ID:', assistantId);
            } catch (error) {
              console.error("Error creating assistant:", error);
            }
          }
        } else {
          // If we don't have voice ID but onboarding is complete, 
          // there was an issue with voice cloning - go back to onboarding
          setIsOnboarding(true);
          setShowSetup(false);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking user status:", error);
        // Default to showing onboarding on error
        setIsOnboarding(true);
        setShowSetup(false);
        setIsLoading(false);
      }
    };
    
    checkUserStatus();
  }, [userId]); // Only depend on userId changes

  // Update time used during an active call
  useEffect(() => {
    let timeUpdateInterval: NodeJS.Timeout | null = null;
    
    if (isCallActive) {
      timeUpdateInterval = setInterval(async () => {
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
            stopCall();
            setHasReachedTimeLimit(true);
            clearInterval(timeUpdateInterval!);
            alert(
              "You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!"
            );
          }
        } catch (error) {
          console.error("Error updating time:", error);
        }
      }, 1000);
      
      return () => {
        if (timeUpdateInterval) {
          clearInterval(timeUpdateInterval);
        }
      };
    }
  }, [isCallActive, stopCall]);

  // Handle start call button click
  const handleStartCall = async () => {
    if (!micFound) {
      alert("No microphone detected. Please connect a microphone and refresh the page.");
      return;
    }
    
    if (hasReachedTimeLimit) {
      alert("You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!");
      return;
    }
    
    try {
      // If we don't have an assistant yet, create one
      if (!vapiAssistantId && hasRequiredCredentials) {
        await createAssistant();
      }
      
      // Start the call
      await startCall(initialMessage);
    } catch (error) {
      console.error("Error in handleStartCall:", error);
    }
  };

  // Handle when setup is completed
  const handleSetupCompleted = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/getVoiceId");
      const data = await response.json();
      
      if (data.apiKey && data.voiceId) {
        setHasRequiredCredentials(true);
        setShowSetup(false);
      }
    } catch (error) {
      console.error("Error checking credentials after setup:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle when onboarding is completed
  const handleOnboardingCompleted = () => {
    setIsOnboarding(false);
    
    // Now check if we need credentials directly - skip setup screen
    setIsLoading(true);
    fetch("/api/getVoiceId")
      .then(response => response.json())
      .then(data => {
        if (data.voiceId) {
          setHasRequiredCredentials(true);
          setShowSetup(false);
        } else {
          // If we don't have voice ID, there was an issue with voice cloning
          // Go back to onboarding to try again
          setIsOnboarding(true);
          setShowSetup(false);
        }
      })
      .catch(error => {
        console.error("Error checking credentials after onboarding:", error);
        setIsOnboarding(true); // Go back to onboarding on error
        setShowSetup(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Render the appropriate view based on state
  if (isLoading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-white text-center">Loading...</div>
      </div>
    );
  }
  
  // Always show onboarding first if it's not completed
  if (isOnboarding) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <OnboardingFlow 
          userId={userId} 
          onComplete={handleOnboardingCompleted} 
        />
      </div>
    );
  }
  
  // Then show setup if onboarding is done but we don't have credentials
  if (showSetup) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <VoiceSetup />
      </div>
    );
  }
  
  // Main conversation view
  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center max-w-md w-full px-6">
        {/* Status messages */}
        {!micFound && (
          <div className="text-red-500 text-center mb-6 p-4 rounded-lg bg-gray-800">
            No microphone detected. Please connect a mic and refresh the page.
          </div>
        )}
        
        {!hasRequiredCredentials ? (
          <div className="text-white text-center mb-6 p-4">
            <button 
              onClick={() => setShowSetup(true)} 
              className="px-4 py-2 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
            >
              Set up your voice first
            </button>
          </div>
        ) : hasReachedTimeLimit ? (
          <div className="text-white text-center mb-6 p-3 rounded-lg bg-purple-800">
            You've reached your daily limit of 5 minutes. Please upgrade for unlimited conversations!
          </div>
        ) : isCallStarting ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg">Starting conversation...</div>
        ) : isWaitingForVapi ? (
          <div className="text-white text-center mb-6 p-4 rounded-lg bg-blue-900 animate-pulse">
            Processing conversation data... Please wait.
          </div>
        ) : null}
        
        {/* Avatar image */}
        <img
          src="BetterYou.png"
          alt="Better You"
          className={`w-[300px] h-auto rounded-full mb-8 ${
            (!hasRequiredCredentials || isCallStarting || hasReachedTimeLimit)
              ? "opacity-50"
              : "hover:scale-105 transition-transform"
          }`}
        />
        
        {/* Call controls */}
        <div className="flex items-center space-x-4">
          {!isCallActive ? (
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
              Start Conversation
            </button>
          ) : (
            <button
              onClick={stopCall}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 active:scale-95 rounded-full font-semibold transition-all duration-200"
            >
              End Conversation
            </button>
          )}
        </div>
        
        {/* Remaining time display */}
        {isCallActive && (
          <div className="mt-4 text-gray-400 text-sm">
            Remaining time: {Math.floor(remainingSeconds / 60)}:
            {(remainingSeconds % 60).toString().padStart(2, "0")}
          </div>
        )}
        
      </div>
    </div>
  );
}