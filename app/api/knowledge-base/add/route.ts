import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import { KnowledgeBase } from "@/models/KnowledgeBase";
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    await connectToMongoDB();
    
    const { userId, role, content, timestamp, conversationId, tags } = await request.json();
    
    if (!userId || !role || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    console.log('Adding to knowledge base:', { userId, role, content });
    
    const result = await KnowledgeBase.findOneAndUpdate(
      { userId },
      { 
        $push: { entries: { role, content, timestamp, conversationId, tags } },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, new: true }
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error adding to knowledge base:", error);
    return NextResponse.json(
      { error: "Failed to add to knowledge base" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!) as { id: string };
    const userId = decodedToken.id;

    await connectToMongoDB();
    
    const knowledgeBase = await KnowledgeBase.findOne({ userId })
      .sort({ 'entries.timestamp': -1 })
      .limit(10);

    return NextResponse.json({ 
      success: true, 
      entries: knowledgeBase?.entries || [] 
    });

  } catch (error) {
    console.error('Error retrieving knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve knowledge base' }, 
      { status: 500 }
    );
  }
} 