import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// More comprehensive type definitions
interface VapiMessage {
  role: string;
  message: string;
  time?: number;
  endTime?: number;
  secondsFromStart: number;
  duration?: number;
  [key: string]: any; // Allow additional properties
}

interface VapiCallResponse {
  id: string;
  status: string;
  startedAt?: string;
  messages?: VapiMessage[];
  artifact?: {
    messages?: VapiMessage[];
    messagesOpenAIFormatted?: any[];
    transcript?: string;
    [key: string]: any;
  };
  [key: string]: any; // Allow for additional properties
}

export async function GET(request: NextRequest) {
  try {
    const callId = request.nextUrl.searchParams.get('callId');
    const retry = request.nextUrl.searchParams.get('retry') === 'true';
    // Force option allows retrieving messages even if call isn't completed
    const force = request.nextUrl.searchParams.get('force') === 'true';
    
    if (!callId) {
      return NextResponse.json({ error: "Missing call ID" }, { status: 400 });
    }
    
    const apiKey = process.env.VAPI_API_KEY;
    console.log(`🔑 API Key available: ${!!apiKey}`); // Log if key exists without exposing it
    
    if (!apiKey) {
      console.error("❌ Missing VAPI_API_KEY environment variable");
      return NextResponse.json({ error: "API configuration error" }, { status: 500 });
    }
    
    console.log(`🔍 Fetching messages for call ID: ${callId}`);
    
    // Get call details from Vapi API
    const url = `https://api.vapi.ai/call/${callId}`;
    console.log(`📡 Making API request to: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // Change from const to let to allow reassignment
    let call: VapiCallResponse = response.data;
    
    // Check if call is still in progress and wait if needed
    if (call.status === 'in-progress' && !force) {
      console.log('⏳ Call still in progress. You may need to wait for call to complete.');
      // Return a specific response for in-progress calls
      return NextResponse.json({
        success: false,
        callId,
        status: call.status,
        message: 'Call in progress - messages not yet available',
        inProgress: true
      });
    }
    
    // Add delay and retry if requested
    if (retry && call.status === 'in-progress') {
      console.log('⏳ Retry requested, waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try fetching again
      const retryResponse = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      call = retryResponse.data;
      console.log(`📊 Retry: Retrieved call data. Status: ${call.status}`);
    }
    
    // Extract messages from the call data
    console.log(`📊 Retrieved call data. Status: ${call.status}`);
    
    // Check both potential message locations based on Vapi API structure
    let vapiMessages = [];
    
    // Add debugging for the raw Vapi response
    console.log(`📊 Raw Vapi response:`, JSON.stringify(call, null, 2));
    
    // Preserve original message structure
    if (call.messages && call.messages.length > 0) {
      console.log(`📊 Found ${call.messages.length} raw Vapi messages`);
      // Return messages EXACTLY as they come from Vapi
      vapiMessages = call.messages;
    } 
    // Check artifact messages as fallback
    else if (call.artifact && call.artifact.messages && call.artifact.messages.length > 0) {
      console.log(`📊 Found ${call.artifact.messages.length} messages in artifact.messages array`);
      // Return messages EXACTLY as they come from Vapi artifact
      vapiMessages = call.artifact.messages;
    }
    // Try messagesOpenAIFormatted as last resort
    else if (call.artifact && call.artifact.messagesOpenAIFormatted && call.artifact.messagesOpenAIFormatted.length > 0) {
      console.log(`📊 Found ${call.artifact.messagesOpenAIFormatted.length} messages in OpenAI formatted array`);
      vapiMessages = call.artifact.messagesOpenAIFormatted;
    }
    
    console.log(`📊 Final message count: ${vapiMessages.length}`);
    
    // Add a clearer inProgress flag to the response
    const inProgress = call.status !== 'ended' && call.status !== 'failed';

    return NextResponse.json({
      success: true,
      callId,
      messages: vapiMessages,
      rawCallData: call,
      inProgress: call.status !== 'ended' && call.status !== 'failed',
      hasMessages: vapiMessages.length > 0,
      status: call.status
    });
  } catch (error) {
    console.error("Error fetching call messages");
    return NextResponse.json(
      { error: "Failed to fetch call messages"},
      { status: 500 }
    );
  }
} 