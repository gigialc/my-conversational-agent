import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/dbConfig/dbconfig";
import Conversation from "@/models/Conversation";
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
    console.log("Save conversation API called");
    
    try {
        await connectToMongoDB();
        console.log("MongoDB connected");
        
        const token = request.cookies.get('token')?.value;
        console.log("Token present:", !!token);
        
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET!) as { id: string };
        const userId = new mongoose.Types.ObjectId(decodedToken.id);
        console.log("User ID:", userId.toString());

        const body = await request.json();
        console.log("Request body received:", {
            callId: body.callId,
            type: body.type,
            transcriptLength: body.transcript?.length,
            messagesCount: body.messages?.length,
            timestamp: body.timestamp
        });

        // Try to find existing conversation
        let conversation = await Conversation.findOne({ 
            userId, 
            callId: body.callId 
        });

        if (conversation) {
            console.log("Updating existing conversation:", conversation._id);
            conversation.transcript = body.transcript;
            conversation.messages = body.messages;
            
            // Handle transcript update types
            if (body.type === 'start') {
                conversation.startTime = new Date(body.timestamp);
                console.log("Conversation start time set:", body.timestamp);
            } else if (body.type === 'end') {
                conversation.endTime = new Date(body.timestamp);
                console.log("Conversation end time set:", body.timestamp);
            }
            
            if (body.duration) {
                conversation.duration = body.duration;
            }

            await conversation.save();
            console.log("Conversation updated:", conversation._id);
        } else {
            console.log("Creating new conversation");
            conversation = new Conversation({
                userId,
                callId: body.callId,
                transcript: body.transcript,
                messages: body.messages,
                startTime: body.type === 'start' ? new Date(body.timestamp) : undefined,
                endTime: body.type === 'end' ? new Date(body.timestamp) : undefined,
                duration: body.duration || 0,
                timestamp: new Date()
            });
            await conversation.save();
            console.log("New conversation created:", conversation._id);
        }

        return NextResponse.json({
            success: true,
            conversationId: conversation._id,
            message: body.type ? `Conversation ${body.type} saved` : 'Conversation updated'
        });

    } catch (error: any) {
        console.error('Save conversation error:', error);
        return NextResponse.json(
            { error: 'Failed to save conversation', details: error.message },
            { status: 500 }
        );
    }
} 