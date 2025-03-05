"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VoiceSetup from "@/components/VoiceSetup"; // Your existing voice setup component

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const response = await fetch("/api/onboarding");
        const data = await response.json();
        
        setHasCompletedOnboarding(data.hasCompletedOnboarding);
        setIsLoading(false);
        
        // Redirect to onboarding if not completed
        if (!data.hasCompletedOnboarding) {
          router.push("/onboarding");
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setIsLoading(false);
      }
    }
    
    checkOnboardingStatus();
  }, [router]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-black text-white">Loading...</div>;
  }

  return hasCompletedOnboarding ? <VoiceSetup /> : null;
} 