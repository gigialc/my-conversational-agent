import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import FormData from "form-data";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const tempDir = "/tmp"; // Temporary directory
  let tempFilePath: string | null = null;

  try {
    // Save the audio file to a temporary location
    const formData = await req.formData();
    const audio = formData.get("files") as File;

    tempFilePath = path.join(tempDir, audio.name);
    const buffer = Buffer.from(await audio.arrayBuffer());
    await fsp.writeFile(tempFilePath, buffer);
    console.log("File saved at:", tempFilePath);

    // Prepare FormData for Eleven Labs API
    const apiForm = new FormData();
    apiForm.append("name", "Cloned Voice");
    apiForm.append("files", fs.createReadStream(tempFilePath), "recording.wav");

    // Send the request
    const apiResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { ...apiForm.getHeaders(), "xi-api-key": "YOUR_API_KEY" },
      body: apiForm as any,
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(`Error from Eleven Labs API: ${JSON.stringify(errorData)}`);
    }

    const apiData = await apiResponse.json();
    console.log("Voice cloned:", apiData);

    return NextResponse.json({ message: "Voice cloned successfully!", voiceId: apiData.voice_id });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ message: "Error occurred", error }, { status: 500 });
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        await fsp.unlink(tempFilePath);
        console.log("Temporary file cleaned up:", tempFilePath);
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    }
  }
}
