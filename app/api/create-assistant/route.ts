import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import jwt from 'jsonwebtoken';
import { VapiClient } from "@vapi-ai/server-sdk";
import axios from "axios";
import { Onboarding } from "@/models/Onboarding";

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    const token = request.cookies.get('token')?.value;
    console.log(token);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
      console.log("Decoded Token:", decodedToken);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Get request body
    const { firstMessage, systemPrompt, config, transcriber } = await request.json();

    // Get onboarding data to personalize the assistant
    const onboarding = await Onboarding.findOne({ userId: user._id });

    // Start with the existing system prompt
    let personalizedPrompt = systemPrompt.content || "You are an advanced AI agent designed to embody the aspirational 'best version' of the individual you're speaking with.";

    // Add personalized information if available
    if (onboarding) {
      console.log("Adding onboarding data to existing prompt");
      personalizedPrompt += `\n\nIMPORTANT - USER INFORMATION:\n`;
      personalizedPrompt += `About the user: ${onboarding.aboutYou}\n\n`;
      personalizedPrompt += `The user's goals: ${onboarding.goals}\n\n`;
      personalizedPrompt += `The user's ideal self: ${onboarding.idealSelf}\n\n`;
      personalizedPrompt += `Use this information to provide highly personalized guidance that reflects the user's aspirations and self-image.`;
    }

    // Add this to log the complete personalized prompt
    console.log("\n===== FINAL PERSONALIZED PROMPT =====");
    console.log(personalizedPrompt);
    console.log("======================================\n");

    // Initialize Vapi with SDK
    const vapi = new VapiClient({
      token: process.env.VAPI_API_KEY || ""
    });
    
    // Create assistant with proper configuration
    const assistant = await vapi.assistants.create({
      name: `${user.username}'s Assistant`,
      model: {
        provider: config.provider,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        knowledgeBase: config.knowledgeBaseId,
        messages: [
          {
            role: "system",
            content: personalizedPrompt
          }
        ]
      },
      firstMessage: firstMessage,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en-US"
      },
      voice: {
        provider: "11labs",
        voiceId: user.elevenlabsagentid || ''
      }
    });

    console.log("Vapi Assistant Created:", assistant);

    // Update user with new assistant ID
    user.vapiAssistantId = assistant.id;
    await user.save();
    console.log("User Updated with Assistant ID:", user);

    // Create assistant with Vapi API
    const assistantData = {
      name: "BetterYou Personal Assistant",
      model: {
        provider: "openai",
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        systemPrompt: personalizedPrompt
      },
      voice: {
        provider: "11labs",
        voiceId: "11labs-voice-id"  // You'll set this later after voice cloning
      },
      // Other settings...
    };
    
    const response = await axios.post(
      "https://api.vapi.ai/assistant",
      assistantData,
      {
        headers: {
          "Authorization": `Bearer ${process.env.VAPI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    return NextResponse.json({ 
      success: true, 
      assistantId: response.data.id,
      message: "Assistant created with personalized information" 
    });

  } catch (error: any) {
    console.error('Error creating Vapi assistant:', error);
    return NextResponse.json({ 
      error: 'Failed to create assistant',
      details: error.message 
    }, { status: 500 });
  }
}
