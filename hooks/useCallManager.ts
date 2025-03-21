import { useState, useRef, useEffect } from 'react';
import Vapi from "@vapi-ai/web";

interface UseCallManagerProps {
  userId: string | null;
  assistantId: string | null;
  onTranscriptUpdate?: (transcript: string) => void;
  onMessageReceived?: (message: any) => void;
}

interface VapiCall {
  id: string;
}

interface VapiMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  type?: string;
  transcript?: string;
  input?: string;
  output?: string;
  messages?: VapiMessage[];
  conversationId?: string;
  emotion?: string;
}

interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function useCallManager({
  userId,
  assistantId,
  onTranscriptUpdate,
  onMessageReceived,
}: UseCallManagerProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [isWaitingForVapi, setIsWaitingForVapi] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [fullTranscript, setFullTranscript] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [messages, setMessages] = useState<VapiMessage[]>([]);
  const [micFound, setMicFound] = useState<boolean>(true);
  
  const vapiRef = useRef<Vapi | null>(null);
  
  // Initialize Vapi instance if needed
  useEffect(() => {
    if (!vapiRef.current) {
      vapiRef.current = new Vapi(
        process.env.NEXT_PUBLIC_VAPI_PROJECT_ID || "80895bf2-66fd-4a71-9c6c-3dcef783c644"
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

  // Message handler for Vapi
  const messageHandler = (message: any) => {
    console.log("🎯 Received message event:", JSON.stringify(message, null, 2));
    
    try {
      // Forward message to parent component if callback provided
      if (onMessageReceived) {
        onMessageReceived(message);
      }
      
      if (message.type === "transcript") {
        const transcript = message.transcript || "";
        console.log(`📝 Transcript chunk: "${transcript}"`);
        
        setCurrentTranscript((prev) => {
          const updated = prev + " " + transcript;
          console.log(`📝 Current transcript now: "${updated}"`);
          
          // Forward updated transcript to parent component if callback provided
          if (onTranscriptUpdate) {
            onTranscriptUpdate(updated.trim());
          }
          
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
          conversationId: currentCallId || undefined
        };
        
        // Add to messages state
        setMessages(prev => [...prev, userMessage]);
        
        // Add to conversation history with proper formatting
        setConversationHistory(prev => [
          ...prev, 
          {
            role: "user",
            content: input.trim(),
            timestamp: new Date().toISOString()
          }
        ]);
      } else if (message.role === 'assistant' && message.content) {
        console.log(`🤖 Assistant response: "${message.content}" (length: ${message.content.length})`);
        
        // Store complete assistant message with proper metadata
        const assistantMessage: VapiMessage = {
          role: 'assistant',
          content: message.content,
          timestamp: new Date().toISOString(),
          conversationId: currentCallId || undefined
        };
        
        // Add to messages state
        setMessages(prev => [...prev, assistantMessage]);
        
        // Add to conversation history with proper formatting
        setConversationHistory(prev => [
          ...prev, 
          {
            role: "assistant",
            content: message.content,
            timestamp: new Date().toISOString()
          }
        ]);
        setCurrentTranscript('');
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
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
  }, [currentCallId]);

  // Start call with Vapi
   const startCall = async (firstMessage?: string) => {
    if (!assistantId || !micFound) {
      console.error("Cannot start call: missing assistantId or microphone");
      return false;
    }
    
    try {
      setIsCallStarting(true);
      
      if (!vapiRef.current) {
        vapiRef.current = new Vapi(
          process.env.NEXT_PUBLIC_VAPI_PROJECT_ID || "80895bf2-66fd-4a71-9c6c-3dcef783c644"
        );
        vapiRef.current.on("message", messageHandler);
      }
      
      // Start options
      const startOptions = firstMessage ? { firstMessage } : undefined;
      
      // Start the call
      console.log(`🚀 Starting call with assistant ID: ${assistantId}`);
      const callResult = await vapiRef.current.start(assistantId, startOptions);
      const call = callResult as VapiCall;
      console.log(`📞 Call created with ID: ${call.id}`);
      setCurrentCallId(call.id);
      
      // Create a new call record in MongoDB if userId is provided
      if (userId) {
        try {
          console.log(`💾 Creating MongoDB record for call ${call.id}`);
          const response = await fetch('/api/call-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              callId: call.id,
              vapiAssistantId: assistantId,
              startTime: new Date().toISOString()
            })
          });
          
          const result = await response.json();
          console.log(`💾 MongoDB call record created:`, result);
        } catch (error) {
          console.error('❌ Error creating call record:', error);
        }
      }
      
      setIsCallActive(true);
      return true;
    } catch (error) {
      console.error("Error starting call:", error);
      return false;
    } finally {
      setIsCallStarting(false);
    }
  };

  // Stop call and save data
  const stopCall = async () => {
    try {
      console.log(`⏹️ Stopping call ${currentCallId}`);
      if (vapiRef.current) {
        await vapiRef.current.stop();
      }
      setIsCallActive(false);
      setIsWaitingForVapi(true); // Show waiting UI

      if (currentCallId && userId) {
        console.log(`💾 Saving call data to MongoDB for call ${currentCallId}`);
        
        // Add a retry mechanism for fetching messages
        let vapiMessages = [];
        let retryCount = 0;
        const MAX_RETRIES = 5;
        let messagesData = null;
        
        while (retryCount < MAX_RETRIES) {
          console.log(`🔄 Fetching messages from Vapi API for call ${currentCallId} (attempt ${retryCount + 1})`);
          
          const messagesResponse = await fetch(`/api/vapi/call-messages?callId=${currentCallId}&retry=true`);
          
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
        
        // Extract summary directly from the proper location in the response
        const summary = messagesData?.rawCallData?.summary || 
                        messagesData?.rawCallData?.analysis?.summary || '';
        console.log(`📝 Call summary: "${summary.substring(0, 100)}${summary.length > 100 ? '...' : ''}"`);

        // Save the call data to MongoDB
        const response = await fetch('/api/call-history', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            callId: currentCallId,
            endTime: new Date().toISOString(),
            messages: vapiMessages,
            transcript: fullTranscript,
            summary
          })
        });
        
        const result = await response.json();
        console.log(`💾 MongoDB call record updated:`, result);
        
        // Upload to knowledge base
        if (conversationHistory.length > 0) {
          // Format conversation for Vapi
          const formattedConversation = conversationHistory
            .map(entry => `${entry.role}: ${entry.content}`)
            .join('\n\n');

          try {
            console.log('Uploading conversation to knowledge base...');
            const response = await fetch('/api/knowledge-base/vapi', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                action: 'upload',
                content: formattedConversation,
                timestamp: new Date().toISOString()
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Upload error details:', errorData);
              throw new Error(`Failed to upload conversation: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Upload successful:', result);
            setConversationHistory([]);
          } catch (error) {
            console.error('Error uploading conversation:', error);
            // Don't clear conversation history on error so we can retry
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error stopping call:', error);
      return false;
    } finally {
      setIsWaitingForVapi(false);
    }
  };

  return {
    isCallActive,
    isCallStarting,
    isWaitingForVapi,
    currentCallId,
    currentTranscript,
    fullTranscript,
    micFound,
    conversationHistory,
    messages,
    startCall,
    stopCall
  };
} 