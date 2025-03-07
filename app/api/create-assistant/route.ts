import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Return success response with user data
    // This endpoint is now just for authentication and retrieving user data
    // The actual assistant creation happens in the client-side and vapi/create-assistant-with-kb
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    });

  } catch (error: any) {
    console.error('Error in create-assistant endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error.message 
    }, { status: 500 });
  }
}
