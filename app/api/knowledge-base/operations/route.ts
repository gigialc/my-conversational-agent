import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import { KnowledgeBase } from "@/models/KnowledgeBase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📥 KB API - Received request:', body);
    
    const { operation, userId, message, query } = body;
    
    if (!operation) {
      console.error('❌ KB API - Missing operation');
      return NextResponse.json({ error: "Missing operation parameter" }, { status: 400 });
    }
    
    if (!userId) {
      console.error('❌ KB API - Missing userId');
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }
    
    await connectToMongoDB();
    console.log('🔌 KB API - Connected to MongoDB');
    
    // Handle different operations
    switch (operation) {
      case 'add':
        console.log('➕ KB API - Add operation', { message });
        
        if (!message) {
          console.error('❌ KB API - Missing message object');
          return NextResponse.json({ error: "Missing message object" }, { status: 400 });
        }
        
        if (!message.role || !message.content) {
          console.error('❌ KB API - Invalid message format', message);
          return NextResponse.json({ 
            error: "Invalid message format - requires role and content",
            received: message
          }, { status: 400 });
        }
        
        const addResult = await KnowledgeBase.findOneAndUpdate(
          { userId },
          { 
            $push: { entries: { 
              role: message.role, 
              content: message.content, 
              timestamp: message.timestamp || new Date().toISOString(), 
              conversationId: message.conversationId,
              tags: ['conversation']
            }},
            $set: { lastUpdated: new Date() }
          },
          { upsert: true, new: true }
        );
        
        return NextResponse.json({ success: true, result: addResult });
        
      case 'search':
        if (!userId || !query) {
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        
        const searchResult = await KnowledgeBase.findOne({ 
          userId,
          'entries.content': { $regex: query, $options: 'i' }
        });
        
        return NextResponse.json({ 
          success: true,
          entries: searchResult?.entries.filter((entry: any) => 
            entry.content.toLowerCase().includes(query.toLowerCase())
          ) || [] 
        });
        
      default:
        return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }
  } catch (error) {
    console.error("Knowledge base operation error:", error);
    return NextResponse.json(
      { error: "Knowledge base operation failed" },
      { status: 500 }
    );
  }
} 