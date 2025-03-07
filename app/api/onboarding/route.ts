import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import { Onboarding } from "@/models/Onboarding";
import jwt from 'jsonwebtoken';
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    console.log("Onboarding POST request received");
    await connectToMongoDB();
    console.log("MongoDB connected");
    
    // Get token from cookie
    const token = request.cookies.get('token')?.value;
    console.log("Token present:", !!token);
    
    if (!token) {
      return NextResponse.json({
        error: 'Unauthorized: No token provided'
      }, { status: 401 });
    }
    
    // Verify token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!);
      console.log("Token decoded successfully:", decodedToken);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    
    // Extract user data
    const { email } = decodedToken as { email: string };
    console.log("Looking up user with email:", email);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    console.log("User found:", user._id);
    const requestData = await request.json();
    console.log("Request data:", requestData);
    
    const { aboutYou, goals, idealSelf } = requestData;
    
    // Validate inputs
    if (!aboutYou || !goals || !idealSelf) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    
    // Save or update onboarding info
    const onboardingData = {
      userId: user._id.toString(),
      aboutYou,
      goals,
      idealSelf,
      updatedAt: new Date()
    };
    
    console.log("Saving onboarding data:", onboardingData);
    
    const onboarding = await Onboarding.findOneAndUpdate(
      { userId: user._id.toString() },
      onboardingData,
      { upsert: true, new: true }
    );
    
    console.log("Onboarding saved successfully:", onboarding);
    
    return NextResponse.json({ success: true, onboarding });
  } catch (error) {
    console.error("Error saving onboarding data:", error);
    return NextResponse.json({ 
      error: "Failed to save onboarding data", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
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