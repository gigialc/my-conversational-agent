import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ message: "User email not found" }, { status: 400 });
    }

    const body = await req.json();
    const { apiKey, agentId } = body;

    if (!apiKey || !agentId) {
      return NextResponse.json({ message: "Both fields are required" }, { status: 400 });
    }

    await connectToMongoDB();

    const user = await User.findOneAndUpdate(
      { email: userEmail },
      { elevenlabsapi: apiKey, elevenlabsagentid: agentId },
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
