import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import jwt from 'jsonwebtoken';
import axios from "axios";
import FormData from 'form-data';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    const token = request.cookies.get('token')?.value;
    console.log('Token:', token ? 'Present' : 'Missing');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
      console.log("Decoded Token:", decodedToken);
    } catch (err) {
      console.error('Token verification error:', err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email } = decodedToken as { email: string };
    console.log('Looking up user with email:', email);
    const user = await User.findOne({ email });

    if (!user) {
      console.error('User not found for email:', email);
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    console.log('Found user:', user.username);

    // Get request body
    const requestBody = await request.json();
    console.log('Request body keys:', Object.keys(requestBody));
    const { firstMessage, systemPrompt, config, transcriber, userId } = requestBody;
    
    if (!userId) {
      console.error('Missing userId in request body');
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    console.log('Using userId:', userId);

    // Check API key
    const apiKey = process.env.VAPI_API_KEY;
    if (!apiKey) {
      console.error('VAPI_API_KEY is not set in environment variables');
      return NextResponse.json({ error: 'Server configuration error: API key missing' }, { status: 500 });
    }
    console.log('API key is present (length:', apiKey.length, ')');

    // 1. Create assistant without knowledge base first
    const assistantResponse = await axios.post('https://api.vapi.ai/assistant', {
      name: `${user.username}'s Assistant`,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.5,
        maxTokens: 250,
        messages: [
          {
            role: "system",
            content: systemPrompt.content || config.systemMessage
          }
        ]
      },
      firstMessage: firstMessage,
      transcriber: {
        provider: "deepgram",
        model: "nova-2"
      },
      voice: {
        provider: "11labs",
        voiceId: user.elevenlabsagentid || ''
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const assistant = assistantResponse.data;
    console.log("Vapi Assistant Created:", assistant);

    // 2. If we have a knowledge base ID, update the assistant with it
    let kbId;
    try {
      console.log('Attempting to get or create knowledge base');
      // Check if knowledge base exists
      console.log('Checking for existing knowledge bases');
      const kbResponse = await axios.get('https://api.vapi.ai/knowledge-base', {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
        }
      });
      
      console.log('Knowledge bases found:', kbResponse.data.length);
      const userKB = kbResponse.data.find((kb: any) => kb.name === `User_${userId}_KB`);
      
      if (userKB) {
        kbId = userKB.id;
        console.log('Using existing knowledge base:', kbId);
      } else {
        // Create a new knowledge base
        console.log('No existing knowledge base found, creating new one');
        const initialContent = "Initial knowledge base for user conversations";
        
        // Create FormData for file upload
        console.log('Creating FormData for file upload');
        const formData = new FormData();
        formData.append('file', Buffer.from(initialContent), {
          filename: 'initial-content.txt',
          contentType: 'text/plain',
        });
        
        // Upload file
        console.log('Uploading file to Vapi API');
        try {
          const fileResponse = await axios.post('https://api.vapi.ai/file', 
            formData,
            {
              headers: {
                'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
                ...formData.getHeaders()
              }
            }
          );
          
          const fileId = fileResponse.data.id;
          console.log('File uploaded successfully, ID:', fileId);
          
          // Create knowledge base
          console.log('Creating knowledge base with file ID:', fileId);
          const newKbResponse = await axios.post('https://api.vapi.ai/knowledge-base', {
            name: `User_${userId}_KB`,
            provider: "trieve",
            searchPlan: {
              searchType: "semantic",
              topK: 3,
              removeStopWords: true,
              scoreThreshold: 0.5
            },
            createPlan: {
              type: "create",
              chunkPlans: [{
                fileIds: [fileId],
                targetSplitsPerChunk: 50,
                splitDelimiters: [".!?\n"],
                rebalanceChunks: true
              }]
            }
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          kbId = newKbResponse.data.id;
          console.log('Created new knowledge base, ID:', kbId);
        } catch (fileError) {
          console.error('Error uploading file or creating KB:');
          throw fileError;
        }
      }
    } catch (error) {
      console.error('Error with knowledge base:');
      console.error('Error stack');
      // Continue without knowledge base if there's an error
    }

    if (kbId) {
      try {
        console.log(`[KB-UPDATE] Starting assistant update with KB. Assistant ID: ${assistant.id}, KB ID: ${kbId}`);
        
        // Include both knowledgeBaseId and the system messages
        const updatePayload = {
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.5,
            maxTokens: 250,
            knowledgeBaseId: kbId,
            messages: [
              {
                role: "system",
                content: systemPrompt.content || config.systemMessage
              }
            ]
          }
        };
        
        console.log(`[KB-UPDATE] Update payload with system prompt and KB: ${JSON.stringify(updatePayload, null, 2)}`);
        
        const updateResponse = await axios.patch(`https://api.vapi.ai/assistant/${assistant.id}`, updatePayload, {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`[KB-UPDATE] Response status: ${updateResponse.status}`);
        console.log(`[KB-UPDATE] Assistant successfully updated with KB and system prompt: ${JSON.stringify(updateResponse.data, null, 2)}`);
      } catch (updateError: unknown) {
        const error = updateError as any;
        console.error(`[KB-UPDATE] ERROR updating assistant with KB: ${error.message}`);
        console.error(`[KB-UPDATE] Error response:`, error.response?.data);
        console.error(`[KB-UPDATE] Error status:`, error.response?.status);
        console.error(`[KB-UPDATE] Error stack:`, error.stack);
      }
    }

    // Update user with new assistant ID
    user.vapiAssistantId = assistant.id;
    await user.save();
    console.log("User Updated with Assistant ID:", user.vapiAssistantId);

    return NextResponse.json({ 
      vapiAssistantId: assistant.id,
      knowledgeBaseId: kbId
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating Vapi assistant:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return NextResponse.json({ 
      error: 'Failed to create assistant',
      details: error.response?.data || error.message 
    }, { status: 500 });
  }
} 