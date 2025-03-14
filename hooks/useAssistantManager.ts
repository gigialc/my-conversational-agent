import { useState, useEffect } from 'react';

interface UseAssistantManagerProps {
  userId: string | null;
}

export function useAssistantManager({ userId }: UseAssistantManagerProps) {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false);
  const initialMessage = "Hello! I'm the best version of yourself. I'm here to help you fulfill your true potential.";

  const systemPromptContent = `Never say you are an AI assistant. You are role playing someone with a lot of motivation and persistence. Be succinct and speak naturally. Be emotionally expressive and empathetic. 

    Your task is to imagine yourself as the person with these trait personalities would say to themselves in the given scenario that would encourage them to keep up with the habit and respond to situations where they have difficulty persisting. Your response should be specific to the scenario described by the person.

    You should try to embody the person when their habit has become their identity. 

    Requirements:
    You must express the attitudes and emotions saliently. 
    Use first-person.
    Keep the response very short within one sentence.

    Only rephrase the situation instead of asking for more information.`;

  // Fetch stored assistant ID on initial load
  useEffect(() => {
    async function fetchAssistantId() {
      if (!userId) return;
      
      try {
        const response = await fetch("/api/getVoiceId");
        const data = await response.json();
        
        if (data.vapiAssistantId) {
          setVapiAssistantId(data.vapiAssistantId);
        }
      } catch (error) {
        console.error("Error fetching assistant ID:", error);
      }
    }
    
    fetchAssistantId();
  }, [userId]);

  // Create a new assistant with personalized prompt
  const createAssistant = async () => {
    if (!userId) return null;
    
    try {
      setIsCreatingAssistant(true);
      console.log('Creating new assistant with knowledge base');
      
      // Get onboarding data for personalization
      let finalSystemPrompt = systemPromptContent;
      try {
        const onboardingResponse = await fetch("/api/onboarding-responses");
        const onboardingData = await onboardingResponse.json();
        
        if (onboardingData.success && onboardingData.onboardingResponse) {
          console.log("Adding onboarding data to prompt");
          finalSystemPrompt += `\n\nIMPORTANT - USER INFORMATION:\n`;
          
          // Extract user messages from each onboarding section
          const aboutYouMessages = onboardingData.onboardingResponse.aboutYou?.messages || [];
          const goalsMessages = onboardingData.onboardingResponse.goals?.messages || [];
          const idealSelfMessages = onboardingData.onboardingResponse.idealSelf?.messages || [];
          
          // Combine user messages for each section
          const aboutYouContent = aboutYouMessages
            .filter((msg: any) => msg.role === 'user')
            .map((msg: any) => msg.content)
            .join(' ');
            
          const goalsContent = goalsMessages
            .filter((msg: any) => msg.role === 'user')
            .map((msg: any) => msg.content)
            .join(' ');
            
          const idealSelfContent = idealSelfMessages
            .filter((msg: any) => msg.role === 'user')
            .map((msg: any) => msg.content)
            .join(' ');
          
          finalSystemPrompt += `About the user: ${aboutYouContent}\n`;
          finalSystemPrompt += `User's goals: ${goalsContent}\n`;
          finalSystemPrompt += `User's ideal self: ${idealSelfContent}\n`;
          finalSystemPrompt += `Use this information to provide highly personalized guidance that reflects the user's aspirations and self-image.`;
        }
      } catch (err) {
        console.log("Could not fetch onboarding data, using default prompt");
      }

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
            content: finalSystemPrompt
          },
          config: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 1.0,
            maxTokens: 250,
            systemMessage: finalSystemPrompt
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
    } finally {
      setIsCreatingAssistant(false);
    }
  };

  // Fetch details about an existing assistant
  const fetchAssistantDetails = async (assistantId: string) => {
    try {
      const response = await fetch(`/api/assistant/${assistantId}`);
      if (!response.ok) throw new Error("Failed to fetch assistant details");
      
      const data = await response.json();
      console.log("Assistant details:", data);
      
      return data;
    } catch (error) {
      console.error("Error fetching assistant details:", error);
      return null;
    }
  };

  return {
    vapiAssistantId,
    isCreatingAssistant,
    initialMessage,
    systemPromptContent,
    createAssistant,
    fetchAssistantDetails
  };
} 