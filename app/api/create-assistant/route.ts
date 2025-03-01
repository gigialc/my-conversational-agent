import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import jwt from 'jsonwebtoken';
import { VapiClient } from "@vapi-ai/server-sdk";

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
            role: systemPrompt.role,
            content: systemPrompt.content
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

    return NextResponse.json({ vapiAssistantId: assistant.id }, { status: 200 });

  } catch (error: any) {
    console.error('Error creating Vapi assistant:', error);
    return NextResponse.json({ 
      error: 'Failed to create assistant',
      details: error.message 
    }, { status: 500 });
  }
}
