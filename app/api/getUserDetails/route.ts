import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";

export async function GET() {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Connect to the database
    await connectToMongoDB();

    // Retrieve the user details
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Return the API key and Agent ID
    return NextResponse.json({
      elevenlabsapi: user.elevenlabsapi || null,
      elevenlabsagentid: user.elevenlabsagentid || null,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
