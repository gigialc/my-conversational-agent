"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingFlow from "@/components/OnboardingFlow";

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user details when component mounts
    const fetchUserDetails = async () => {
      try {
        const response = await fetch("/api/getUserDetails");
        const data = await response.json();
        if (data.user) {
          setUserId(data.user.id);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };
    fetchUserDetails();
  }, []);

  const handleOnboardingComplete = () => {
    router.push("/home");
  };

  return <OnboardingFlow userId={userId} onComplete={handleOnboardingComplete} />;
} 