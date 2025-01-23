import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/auth-options';
import { connectToMongoDB } from '../../../dbConfig/dbconfig';
import User from '@/models/User';

const FREE_TIME_LIMIT_MINUTES = 5;
const FREE_TIME_LIMIT_SECONDS = FREE_TIME_LIMIT_MINUTES * 60;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const timeToAdd = Number(body.timeToAdd);

    // Validate timeToAdd
    if (isNaN(timeToAdd) || timeToAdd <= 0) {
      return NextResponse.json({ error: 'Invalid time value' }, { status: 400 });
    }

    await connectToMongoDB();
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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