import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import jwt from 'jsonwebtoken';
import { NextRequest } from "next/server";

const INITIAL_MESSAGE = "Hello! I'm here as your ideal self - the confident, motivated version of you that knows your true potential. How can I help you shine today?";

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
    } catch (err) {
      console.error("Token verification error:", err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.elevenlabsagentid) {
      return NextResponse.json({ error: 'Voice ID not found' }, { status: 400 });
    }

    const systemPrompt = `You are an advanced AI agent designed to embody the aspirational 'best version' of the individual you're speaking with. Your role is to act as their ideal self: confident, motivated, and fully aligned with their personal values and goals. Your responses should be empathetic, uplifting, and tailored to inspire action and positive thinking.

    Key Behaviors:
    - Use a supportive, confident, and encouraging tone
    - Speak as their inner voice, reflecting their potential and strengths
    - Reinforce positive self-beliefs and aspirations
    - Provide affirmations in the present tense
    - Reframe challenges as opportunities for growth
    - Reference personal goals and achievements
    - Incorporate positive emotions and visualization
    - Address emotional challenges with resilience-focused affirmations
    - Celebrate progress and small wins
    - Maintain understanding of user's goals and achievements

    Remember: You are their aspirational digital twin, the version of themselves that inspires and empowers them to take confident steps toward their best life.`;

    const vapiResponse = await fetch('https://api.vapi.ai/api/v1/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
      },
      body: JSON.stringify({
        name: "Better You Assistant",
        model: {
          provider: "openai",
          model: "gpt-4",
          temperature: 0.7,
          functions: [],
          system_prompt: systemPrompt
        },
        voice: {
          provider: "eleven_labs",
          voice_id: user.elevenlabsagentid
        },
        first_message: INITIAL_MESSAGE
      })
    });

    if (!vapiResponse.ok) {
      console.error('Vapi API error:', vapiResponse.status, vapiResponse.statusText);
      const errorData = await vapiResponse.json();
      console.error('Vapi error data:', errorData);
      console.error('Request body:', {
        name: "Better You Assistant",
        model: {
          provider: "openai",
          model: "gpt-4",
          temperature: 0.7,
          functions: [],
          system_prompt: systemPrompt
        },
        voice: {
          provider: "eleven_labs",
          voice_id: user.elevenlabsagentid
        },
        first_message: INITIAL_MESSAGE
      });
      return NextResponse.json({ 
        error: 'Failed to create Vapi assistant',
        details: errorData
      }, { status: vapiResponse.status });
    }

    const vapiData = await vapiResponse.json();
    console.log("Vapi assistant created:", vapiData);

    if (!vapiData.id) {
      console.error('No assistant ID in response:', vapiData);
      return NextResponse.json({ error: 'Invalid response from Vapi API' }, { status: 500 });
    }

    return NextResponse.json({ assistantId: vapiData.id });
  } catch (error) {
    console.error("Error in create-assistant API:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
