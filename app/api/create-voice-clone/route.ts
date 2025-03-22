import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Get the form data with the audio file
    const formData = await request.formData();
    const audioBlob = formData.get('files') as Blob;
    const name = formData.get('name') as string || 'My Voice Clone';

    if (!audioBlob) {
      console.error('No audio file provided in request. Form data keys:', [...formData.keys()]);
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Examine the audio file
    const fileSize = audioBlob.size;
    console.log(`Processing audio for voice cloning, size: ${fileSize} bytes, type: ${audioBlob.type}`);
    
    if (fileSize < 1000) {
      return NextResponse.json({ 
        error: 'Audio file too small to be valid. ElevenLabs requires at least a few seconds of clear speech.'
      }, { status: 400 });
    }

    // Get API key from environment (not exposing to client)
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured on server' }, { status: 500 });
    }

    try {
      // Convert the blob to an array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Log detailed request information
      console.log('Creating voice clone with name:', name);
      console.log('Audio buffer size:', buffer.length);

      // Create a new FormData for the ElevenLabs API request
      const elevenLabsFormData = new FormData();
      elevenLabsFormData.append('name', name);
      // Add description - required by ElevenLabs API
      elevenLabsFormData.append('description', 'Voice created from onboarding conversations');
      
      // Create a smaller test file if needed for debugging
      const maxSizeForTesting = 5 * 1024 * 1024; // 5MB max
      const finalBuffer = buffer.length > maxSizeForTesting ? buffer.slice(0, maxSizeForTesting) : buffer;
      
      // Add the audio file as a blob with proper filename and type
      const audioFile = new Blob([finalBuffer], { type: 'audio/wav' });
      elevenLabsFormData.append('files', audioFile, 'recording.wav');
      
      // Log the request we're about to make
      console.log('Sending request to ElevenLabs API with audio file, size:', audioFile.size);

      // Send directly to ElevenLabs API with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: { 
          'xi-api-key': apiKey
        },
        body: elevenLabsFormData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', errorText);
        return NextResponse.json({ 
          error: `ElevenLabs API error: ${response.status} ${response.statusText}`,
          details: errorText
        }, { status: response.status });
      }

      const data = await response.json();
      const voiceId = data.voice_id;

      if (!voiceId) {
        return NextResponse.json({ error: 'No voice ID returned from ElevenLabs' }, { status: 500 });
      }

      console.log('Voice clone created successfully:', voiceId);

      // Save the voice ID to the user's profile
      await connectToMongoDB();
      const { email } = decodedToken as { email: string };
      
      await User.findOneAndUpdate(
        { email },
        { 
          $set: { 
            elevenlabsagentid: voiceId,
            updatedAt: new Date() 
          } 
        }
      );

      return NextResponse.json({
        success: true,
        voiceId: voiceId
      });
    } catch (error: any) {
      console.error('Error in ElevenLabs API communication:', error);
      if (error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'Request to ElevenLabs timed out after 60 seconds'
        }, { status: 504 });
      }
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error('Error in create-voice-clone:', error);
    return NextResponse.json({ 
      error: error.message || 'An error occurred during voice cloning'
    }, { status: 500 });
  }
} 