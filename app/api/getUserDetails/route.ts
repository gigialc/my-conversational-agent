import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
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

    console.log("Decoded Token:", decodedToken);

    // Step 3: Connect to MongoDB
    await connectToMongoDB();

    // Step 4: Fetch user details from the database
    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Step 5: Return user details
    return NextResponse.json({
      message: 'User fetched successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        elevenlabsapi: user.elevenlabsapi,
        elevenlabsagentid: user.elevenlabsagentid
      },
    });
  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
