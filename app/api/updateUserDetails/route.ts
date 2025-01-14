import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import jwt from 'jsonwebtoken';
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    const token = request.cookies.get('token')?.value;
    console.log("Token received:", token);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
      console.log("Decoded Token:", decodedToken);
    } catch (err) {
      console.error("Token verification error:", err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email } = decodedToken as { email: string };
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log("Request body:", body);
    
    const { elevenlabsapi, elevenlabsagentid } = body;

    if (!elevenlabsapi || !elevenlabsagentid) {
      return NextResponse.json(
        { message: "API key and agent ID are required" },
        { status: 400 }
      );
    }

    // Update user with new details
    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          elevenlabsapi,
          elevenlabsagentid,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    console.log("User Updated:", updatedUser);
    return NextResponse.json({ 
      message: "Settings saved successfully", 
      user: updatedUser
    });

  } catch (error) {
    console.error("Error in updateUserDetails API:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
