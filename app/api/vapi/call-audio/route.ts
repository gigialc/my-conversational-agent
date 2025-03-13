import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';

// Fetch audio recording from a Vapi call
export async function GET(request: NextRequest) {
  try {
    console.log('Call audio API request received');
    
    // Get token from cookies for authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      console.error('No authentication token found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Verify the token - FIXING THE JWT SECRET TO MATCH WHAT'S USED ELSEWHERE
    try {
      // Use TOKEN_SECRET instead of JWT_SECRET to match other parts of the app
      jwt.verify(token, process.env.TOKEN_SECRET!);
      console.log('Token verified successfully');
    } catch (error) {
      console.error('Invalid authentication token:', error);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    
    // Get call ID from query parameters
    const url = new URL(request.url);
    const callId = url.searchParams.get('callId');
    
    if (!callId) {
      console.error('No call ID provided');
      return NextResponse.json({ error: 'Call ID is required' }, { status: 400 });
    }
    
    console.log(`Fetching audio for call ID: ${callId}`);
    
    // Get VAPI API key - use the one from environment variables or fallback to provided key
    // Note: In production, you should always use environment variables for security
    const VAPI_API_KEY = process.env.VAPI_API_KEY || "332f4870-c32c-4f96-8f26-bcf9c02b90b8";
    console.log(`Using VAPI API key: ${VAPI_API_KEY.substring(0, 5)}...`);
    
    // Check call status first
    console.log(`Checking call status for call ID: ${callId}`);
    const statusResponse = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error(`Failed to get call status: ${statusResponse.status} - ${errorText}`);
      return NextResponse.json({ 
        error: `Unable to verify call status: ${statusResponse.status}`,
        details: errorText
      }, { status: statusResponse.status });
    }
    
    const callData = await statusResponse.json();
    console.log(`Call status: ${callData.status}`);
    
    // Only proceed if call is complete or ended
    if (callData.status !== 'completed' && callData.status !== 'ended') {
      console.log(`Cannot fetch recording because call status is: ${callData.status}`);
      return NextResponse.json({ 
        error: 'Call recording not available', 
        status: callData.status 
      }, { status: 400 });
    }
    
    // Fetch the audio
    console.log('Call is complete, fetching audio...');
    const audioResponse = await fetch(`https://api.vapi.ai/call/${callId}/recording`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav', // Explicitly request WAV format
      },
    });
    
    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error(`Failed to fetch audio: ${audioResponse.status} - ${errorText}`);
      
      // If artifact URLs are available in the call data, try using those
      if (callData.artifact && callData.artifact.recordingUrl) {
        console.log(`Attempting to fetch recording from artifact URL: ${callData.artifact.recordingUrl}`);
        try {
          const artifactResponse = await fetch(callData.artifact.recordingUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${VAPI_API_KEY}`,
            }
          });
          
          if (artifactResponse.ok) {
            const artifactBuffer = await artifactResponse.arrayBuffer();
            if (artifactBuffer.byteLength > 0) {
              console.log(`Successfully retrieved audio from artifact URL: ${(artifactBuffer.byteLength / 1024).toFixed(2)}KB`);
              const artifactBlob = new Blob([artifactBuffer], { type: 'audio/wav' });
              const response = new NextResponse(artifactBlob);
              response.headers.set('Content-Type', 'audio/wav');
              response.headers.set('Content-Disposition', `attachment; filename="call_${callId}.wav"`);
              return response;
            }
          }
        } catch (artifactError) {
          console.error('Error fetching from artifact URL:', artifactError);
        }
      }
      
      return NextResponse.json({ 
        error: `Failed to fetch audio: ${audioResponse.status}`,
        details: errorText
      }, { status: audioResponse.status });
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    
    // Check if the audio file is empty
    if (audioBuffer.byteLength === 0) {
      console.error('Received empty audio file from Vapi API');
      return NextResponse.json({ error: 'Received empty audio file' }, { status: 500 });
    }
    
    console.log(`Successfully retrieved audio: ${(audioBuffer.byteLength / 1024).toFixed(2)}KB`);
    
    // Return the audio as a blob
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    const response = new NextResponse(audioBlob);
    response.headers.set('Content-Type', 'audio/wav');
    response.headers.set('Content-Disposition', `attachment; filename="call_${callId}.wav"`);
    
    return response;
  } catch (error) {
    console.error('Error retrieving call audio:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve call audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 