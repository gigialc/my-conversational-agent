import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import { KnowledgeBase } from '@/models/KnowledgeBase';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!) as { id: string };
    const userId = decodedToken.id;

    await connectToMongoDB();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Search knowledge base using text index
    const results = await KnowledgeBase.findOne(
      { 
        userId,
        $text: { $search: query }
      },
      {
        score: { $meta: "textScore" }
      }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(5);

    return NextResponse.json({ 
      success: true, 
      entries: results?.entries || [] 
    });

  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge base' }, 
      { status: 500 }
    );
  }
} 