import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { assistantId, systemPrompt } = await request.json();
    
    // Get user's Vapi API key
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToMongoDB();
    const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!) as { id: string };
    const user = await User.findById(decodedToken.id);

    if (!user?.elevenlabsapi) {
      return NextResponse.json({ error: 'Vapi API key not found' }, { status: 400 });
    }

    // Make request to Vapi API
    const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PROJECT_ID}`, // Use project ID instead of user API key
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: {
          messages: [{
            role: 'system',
            content: systemPrompt
          }]
        }
      })
    });

    if (!vapiResponse.ok) {
      const errorData = await vapiResponse.text();
      console.error('Vapi API error:', errorData);
      throw new Error(`Vapi API error: ${errorData}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating assistant:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
} 