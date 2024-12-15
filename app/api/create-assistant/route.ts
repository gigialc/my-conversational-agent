import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import jwt from 'jsonwebtoken';
import axios from 'axios';

export async function POST(request: NextRequest) {
  await connectToMongoDB();
  const token = request.cookies.get('token')?.value;
  console.log(token);

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  }

  console.log("Decoded Token:", decodedToken);

  const { email } = decodedToken as { email: string };
  const user = await User.findOne({ email });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // Check if user already has a Vapi assistant ID
  if (!user.vapiAssistantId) {
    try {
      // Create Vapi assistant
      const vapiResponse = await axios.post('https://api.vapi.ai/assistant', {
        name: `${user.username}'s Assistant`,
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [
            { 
              role: "system", 
              content: "You are a helpful personal assistant." 
            }
          ]
        },
        voice: {
          provider: "11labs",
          voiceId: user.elevenlabsagentid
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("Vapi Assistant Created:", vapiResponse.data);
      
      user.vapiAssistantId = vapiResponse.data.id; // Update with the new ID
      await user.save(); // Save the user with the new field
      console.log("User Updated with Assistant ID:", user);
      return NextResponse.json({ vapiAssistantid: user.vapiAssistantId }, { status: 200 });

    } catch (error: any) {
      console.error('Error creating Vapi assistant:', error.response?.data || error.message);
      return NextResponse.json({ 
        error: 'Failed to create assistant',
        details: error.response?.data || error.message 
      }, { status: 500 });
    }
  } else {
    return NextResponse.json({ vapiAssistantid: user.vapiAssistantId }, { status: 200 });
  }

  return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 });
}
