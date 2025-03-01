import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!) as { id: string };
    await connectToMongoDB();
    
    const user = await User.findByIdAndUpdate( 
      decodedToken.id,
      { initialMessageHandled: true },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, initialMessageHandled: user.initialMessageHandled });
  } catch (error) {
    console.error('Error updating initial message state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 