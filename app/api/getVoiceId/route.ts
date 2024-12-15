import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
await connectToMongoDB();
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
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  console.log(user);
    return NextResponse.json({ voiceId: user.elevenlabsagentid, apiKey: user.elevenlabsapi }, { status: 200 });

}