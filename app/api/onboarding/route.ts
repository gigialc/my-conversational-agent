import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import { Onboarding } from "@/models/Onboarding";
import jwt from 'jsonwebtoken';
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();
    
    // Get token from cookie - same auth pattern as other routes
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    
    // Verify token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
      console.log("Decoded Token:", decodedToken);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    
    // Get user from email in token
    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    
    const userId = user._id;
    const { aboutYou, goals, idealSelf } = await request.json();
    
    // Validate inputs
    if (!aboutYou || !goals || !idealSelf) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    
    // Save or update onboarding info
    const onboarding = await Onboarding.findOneAndUpdate(
      { userId },
      { 
        userId,
        aboutYou,
        goals,
        idealSelf,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ success: true, onboarding });
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB();
    
    // Get token from cookie
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
    
    // Get user from email in token
    const { email } = decodedToken as { email: string };
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    
    const userId = user._id;
    
    // Get onboarding data
    const onboarding = await Onboarding.findOne({ userId });
    
    if (!onboarding) {
      return NextResponse.json({ 
        success: false, 
        message: "No onboarding data found",
        hasCompletedOnboarding: false 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      onboarding,
      hasCompletedOnboarding: true 
    });
  } catch (error) {
    console.error("Error retrieving onboarding data:", error);
    return NextResponse.json({ error: "Failed to retrieve onboarding data" }, { status: 500 });
  }
} 