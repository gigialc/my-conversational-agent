import { NextResponse, NextRequest } from 'next/server';
import { connectToMongoDB } from '../../../dbConfig/dbconfig';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const FREE_TIME_LIMIT_MINUTES = 5;
const FREE_TIME_LIMIT_SECONDS = FREE_TIME_LIMIT_MINUTES * 60;

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    
    // Step 1: Retrieve token from cookies
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // Step 2: Verify the token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Step 3: Connect to MongoDB
    await connectToMongoDB();
    // Step 4: Fetch user details from the database
    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const timeToAdd = Number(body.timeToAdd);

    // Validate timeToAdd
    if (isNaN(timeToAdd) || timeToAdd <= 0) {
      return NextResponse.json({ error: 'Invalid time value' }, { status: 400 });
    }

    // Calculate new time
    const currentTime = user.timeUsed || 0;
    const newTime = Math.floor(currentTime + timeToAdd);
    const remainingSeconds = Math.max(0, FREE_TIME_LIMIT_SECONDS - newTime);
    const hasExceededLimit = newTime >= FREE_TIME_LIMIT_SECONDS;

    // Update user's time
    user.timeUsed = newTime;
    await user.save();

    return NextResponse.json({
      timeUsed: newTime,
      remainingSeconds,
      hasExceededLimit
    });

  } catch (error) {
    console.error('Error updating time used:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 