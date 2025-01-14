import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import { NextRequest } from "next/server";
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    
    // Get token from cookies
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // Verify token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email } = decodedToken as { email: string };
    const { knowledgeBase } = await request.json();
    
    // Update user's knowledge base
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { knowledgeBase } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      knowledgeBase: updatedUser.knowledgeBase 
    });
  } catch (error) {
    console.error('Error updating knowledge base:', error);
    return NextResponse.json({ error: 'Failed to update knowledge base' }, { status: 500 });
  }
} 