"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to home where the Conversation component will handle 
    // the proper flow (onboarding or setup as needed)
    router.push("/home");
  }, [router]);

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="text-white">Redirecting to onboarding...</div>
    </div>
  );
} 