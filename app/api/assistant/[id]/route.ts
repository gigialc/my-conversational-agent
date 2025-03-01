import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assistantId = params.id;
    
    const response = await axios.get(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Error fetching assistant:", error);
    return NextResponse.json(
      { error: "Failed to fetch assistant details" },
      { status: 500 }
    );
  }
} 