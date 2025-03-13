import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get formData from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }
    
    // Create a temporary file for the audio
    const tempDir = path.join(process.cwd(), 'tmp');
    await mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `${randomUUID()}.webm`);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    await writeFile(tempFilePath, audioBuffer);
    
    try {
      // Use OpenAI's Whisper API
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'audio.webm');
      formData.append('model', 'whisper-1');
      
      const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: formData
      });
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`);
      }
      
      const result = await openaiResponse.json();
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
      
      return NextResponse.json({ text: result.text });
    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError);
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
      
      return NextResponse.json({ 
        error: "Failed to transcribe audio",
        details: transcriptionError instanceof Error ? transcriptionError.message : String(transcriptionError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ 
      error: "Error processing audio",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 