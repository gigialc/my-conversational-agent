import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import { OnboardingResponse } from "@/models/OnboardingResponse";
import jwt from 'jsonwebtoken';
import User from "@/models/User";
import axios from 'axios';

// POST to save a response for a specific onboarding question
export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    
    // Get token from cookie
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      }, { status: 401 });
    }
    
    // Verify token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
    } catch (err) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Invalid token' 
      }, { status: 401 });
    }
    
    // Get user from email in token
    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found" 
      }, { status: 404 });
    }
    
    const userId = user._id.toString();
    
    // Get request data
    const data = await request.json();
    const { questionType, callId, vapiAssistantId, messages: frontendMessages } = data;
    
    if (!questionType || !callId || !vapiAssistantId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    // Fetch messages from Vapi API
    const VAPI_API_KEY = process.env.VAPI_API_KEY || "332f4870-c32c-4f96-8f26-bcf9c02b90b8";
    const url = `https://api.vapi.ai/call/${callId}`;

    const vapiResponse = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`
      }
    });

    const call = vapiResponse.data;
    
    // Extract messages from the call data
    let vapiMessages = [];
    
    // Check both potential message locations based on Vapi API structure
    if (call.messages && call.messages.length > 0) {
      vapiMessages = call.messages;
    } else if (call.artifact && call.artifact.messages && call.artifact.messages.length > 0) {
      vapiMessages = call.artifact.messages;
    } else if (call.artifact && call.artifact.messagesOpenAIFormatted && call.artifact.messagesOpenAIFormatted.length > 0) {
      vapiMessages = call.artifact.messagesOpenAIFormatted;
    }

    // Use frontend messages if available, otherwise use filtered Vapi messages
    const finalMessages = (frontendMessages || vapiMessages)
      .filter((msg: any) => msg.role === 'user')
      .map((msg: any) => ({
        role: 'user', // Ensure role is always 'user'
        content: msg.content || msg.message || msg.input || '',
        timestamp: msg.timestamp || new Date().toISOString()
      }));

    // Validate that we have at least one user message
    if (finalMessages.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "No user messages found in the conversation" 
      }, { status: 400 });
    }
    
    // Find existing onboarding response or create new one
    let onboardingResponse = await OnboardingResponse.findOne({ userId });
    
    if (!onboardingResponse) {
      onboardingResponse = new OnboardingResponse({
        userId,
        aboutYou: { completed: false },
        goals: { completed: false },
        idealSelf: { completed: false },
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Update the specific question response
    onboardingResponse[questionType] = {
      messages: finalMessages,
      callId,
      vapiAssistantId,
      completed: true
    };
    
    // Check if all questions are completed
    const allCompleted = 
      onboardingResponse.aboutYou?.completed && 
      onboardingResponse.goals?.completed && 
      onboardingResponse.idealSelf?.completed;
    
    onboardingResponse.isCompleted = allCompleted;
    onboardingResponse.updatedAt = new Date();
    
    await onboardingResponse.save();
    
    return NextResponse.json({ 
      success: true, 
      onboardingResponse,
      allCompleted
    });
    
  } catch (error) {
    console.error("Error saving onboarding response:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to save onboarding response",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// GET to check onboarding status and next questions
export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB();
    
    // Get token from cookie
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      }, { status: 401 });
    }
    
    // Verify token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
    } catch (err) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Invalid token' 
      }, { status: 401 });
    }
    
    // Get user from email in token
    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found" 
      }, { status: 404 });
    }
    
    const userId = user._id.toString();
    
    // Get onboarding data
    const onboardingResponse = await OnboardingResponse.findOne({ userId });
    
    if (!onboardingResponse) {
      // No onboarding data yet, start with first question
      return NextResponse.json({ 
        success: true, 
        isCompleted: false,
        nextQuestion: 'aboutYou',
        onboardingResponse: {
          aboutYou: { completed: false },
          goals: { completed: false },
          idealSelf: { completed: false }
        }
      });
    }
    
    // Determine next question if not completed
    let nextQuestion = null;
    if (!onboardingResponse.isCompleted) {
      if (!onboardingResponse.aboutYou?.completed) {
        nextQuestion = 'aboutYou';
      } else if (!onboardingResponse.goals?.completed) {
        nextQuestion = 'goals';
      } else if (!onboardingResponse.idealSelf?.completed) {
        nextQuestion = 'idealSelf';
      }
    }
    
    return NextResponse.json({
      success: true,
      isCompleted: onboardingResponse.isCompleted,
      nextQuestion,
      onboardingResponse
    });
    
  } catch (error) {
    console.error("Error retrieving onboarding responses:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to retrieve onboarding responses",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 