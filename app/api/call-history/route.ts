import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import { CallHistory } from "@/models/CallHistory";

export async function POST(request: NextRequest) {
  try {
    console.log(`🔌 Connecting to MongoDB for call record creation`);
    await connectToMongoDB();
    
    const body = await request.json();
    console.log(`📥 POST call-history received:`, body);
    
    const { userId, callId, vapiAssistantId, startTime } = body;
    
    if (!userId || !callId) {
      console.error(`❌ Missing required fields:`, { userId, callId });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    console.log(`📝 Creating new call record for call ${callId}`);
    const callRecord = new CallHistory({
      userId,
      callId,
      vapiAssistantId,
      startTime: new Date(startTime),
      messages: [] // Empty array initially
    });
    
    await callRecord.save();
    console.log(`✅ Call record created with _id: ${callRecord._id}`);
    
    return NextResponse.json({ success: true, id: callRecord._id });
  } catch (error) {
    console.error("❌ Error creating call record:", error);
    return NextResponse.json({ error: "Failed to create call record" }, { status: 500 });
  }
}

// Optimize transformation function to store only relevant information
function transformMessages(messages: any[]) {
  // Filter out system messages which contain long prompts
  return messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      // Essential message content
      role: msg.role || 'unknown',
      message: msg.message || '',
      
      // Timing information (keep as numbers for better querying)
      time: msg.time || Date.now(),
      endTime: msg.endTime || msg.time || Date.now(),
      secondsFromStart: typeof msg.secondsFromStart === 'number' ? 
        msg.secondsFromStart : parseFloat(msg.secondsFromStart || '0'),
      duration: parseInt(msg.duration || '0', 10),
      
      // Required by schema but keep minimal
      source: msg.source || ''
    }));
}

export async function PUT(request: NextRequest) {
  try {
    console.log(`🔌 Connecting to MongoDB for call record update`);
    await connectToMongoDB();
    
    const body = await request.json();
    
    const { userId, callId, endTime, messages, transcript } = body;
    
    if (!userId || !callId) {
      console.error(`❌ Missing required fields:`, { userId, callId });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    console.log(`📥 PUT call-history received for call ID: ${callId}`);
    console.log(`📊 Messages count: ${messages?.length}, Transcript length: ${transcript?.length}`);
    
    // Log detailed structure of first few messages to debug
    if (messages && messages.length > 0) {
      console.log(`📋 First message sample:`, JSON.stringify(messages[0], null, 2));
      console.log(`📋 Message keys:`, Object.keys(messages[0]));
      
      // Check for missing required fields
      const requiredFields = ['role', 'time', 'source', 'endTime', 'duration', 'secondsFromStart'];
      const missingFields = requiredFields.filter(field => !messages[0][field]);
      if (missingFields.length > 0) {
        console.warn(`⚠️ Missing required fields in messages: ${missingFields.join(', ')}`);
      }
    }
    
    // Transform messages to match the new CallHistory schema
    const transformedMessages = transformMessages(messages);
    
    // Log a transformed message sample
    if (transformedMessages.length > 0) {
      console.log(`🔄 Transformed message sample:`, JSON.stringify(transformedMessages[0], null, 2));
    }
    
    // Extract summary from the call data if available
    const summary = messages?.rawCallData?.summary || 
                   messages?.rawCallData?.analysis?.summary || 
                   '';
    
    console.log(`🔄 Updating call record for call ${callId}`);
    const updatedCall = await CallHistory.findOneAndUpdate(
      { userId, callId },
      { 
        $set: { 
          endTime: new Date(endTime),
          messages: transformedMessages,
          transcript,
          summary
        }
      },
      { new: true }
    );
    
    if (!updatedCall) {
      console.error(`❌ Call record not found for call ${callId}`);
      return NextResponse.json({ error: "Call record not found" }, { status: 404 });
    }
    
    console.log(`✅ Call record updated successfully`);
    return NextResponse.json({ success: true, call: updatedCall });
  } catch (error) {
    console.error("❌ Error updating call record:", error);
    return NextResponse.json({ error: "Failed to update call record" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log(`🔌 Connecting to MongoDB for call history retrieval`);
    await connectToMongoDB();
    
    const userId = request.nextUrl.searchParams.get('userId');
    console.log(`🔍 Getting call history for user: ${userId}`);
    
    if (!userId) {
      console.error(`❌ Missing userId parameter`);
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }
    
    const calls = await CallHistory.find({ userId }).sort({ startTime: -1 });
    console.log(`📊 Found ${calls.length} calls for user ${userId}`);
    
    return NextResponse.json({ success: true, calls });
  } catch (error) {
    console.error("❌ Error retrieving call history:", error);
    return NextResponse.json({ error: "Failed to retrieve call history" }, { status: 500 });
  }
} 