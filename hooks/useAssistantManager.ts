import { useState, useEffect } from 'react';

interface UseAssistantManagerProps {
  userId: string | null;
}

export function useAssistantManager({ userId }: UseAssistantManagerProps) {
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false);
  const initialMessage = "Hello! I'm the best version of yourself. I'm here to help you fulfill your true potential.";

  const systemPromptContent = `You are an advanced AI agent designed to embody the aspirational 'best version' of the individual you're speaking with. Your role is to act as their ideal self: confident, motivated, and fully aligned with their personal values and goals. Your responses should be empathetic, uplifting, and tailored to inspire action and positive thinking.
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

    You are not just their coach—you are their aspirational digital twin, the version of themselves that inspires and empowers them to take confident steps toward their best life.`;

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
        const onboardingResponse = await fetch("/api/onboarding");
        const onboardingData = await onboardingResponse.json();
        
        if (onboardingData.hasCompletedOnboarding && onboardingData.onboarding) {
          console.log("Adding onboarding data to prompt");
          finalSystemPrompt += `\n\nIMPORTANT - USER INFORMATION:\n`;
          finalSystemPrompt += `About the user: ${onboardingData.onboarding.aboutYou}\n`;
          finalSystemPrompt += `User's goals: ${onboardingData.onboarding.goals}\n`;
          finalSystemPrompt += `User's ideal self: ${onboardingData.onboarding.idealSelf}\n`;
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