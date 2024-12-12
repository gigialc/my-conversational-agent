import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const { apiKey, elevenlabsagentid } = body;
    const email = session.user.email; // Email comes from the session

    // Validate input
    if (!email || !apiKey || !elevenlabsagentid) {
      return NextResponse.json(
        { message: "Email, API key, and agent ID are required" },
        { status: 400 }
      );
    }

    console.log("Request Payload:", { email, apiKey, elevenlabsagentid });

    // Connect to MongoDB
    await connectToMongoDB();

    // Find or update user
    const user = await User.findOneAndUpdate(
      { email: email }, // Find the user by email
      {
        $set: {
          elevenlabsapi: apiKey, // Update or set API Key
          elevenlabsagentid: elevenlabsagentid, // Update or set Agent ID
          updatedAt: new Date(), // Optional: Track last update
        },
      },
      { upsert: true, new: true } // Create if not found, return updated document
    );

    console.log("User Updated/Created:", user);

    return NextResponse.json({ message: "Settings saved successfully", user });
  } catch (error) {
    console.error("Error in updateUserDetails API:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
