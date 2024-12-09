import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
  try {
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const email = session.user.email;
    console.log("Email:", email);
    
    // Get apiKey directly from the request bod
    const body = await req.json();
    const { elevenlabsagentid } = body;
    console.log("Sending payload:", { elevenlabsagentid });

    if ( !elevenlabsagentid) {
      return NextResponse.json({ message: "Email, API key, and agent ID are required" }, { status: 400 });
    }

    await connectToMongoDB();

    const user = await User.findOneAndUpdate(
      { email: email }, // Use email from request body
      { elevenlabsagentid: elevenlabsagentid },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error in saveKeys API:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
