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
    
    const updateFields: any = {};
    
    // Only include fields that are present in the request
    if (body.elevenlabsapi !== undefined) {
      updateFields.elevenlabsapi = body.elevenlabsapi;
    }
    if (body.elevenlabsagentid !== undefined) {
      updateFields.elevenlabsagentid = body.elevenlabsagentid;
    }
    if (body.vapiAssistantId !== undefined) {
      updateFields.vapiAssistantId = body.vapiAssistantId;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    updateFields.updatedAt = new Date();

    // Update user with new details
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: updateFields },
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
