import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    callId: {
        type: String,
        required: true
    },
    transcript: {
        type: String,
        default: ''
    },
    messages: [{
        role: String,
        message: String
    }],
    startTime: Date,
    endTime: Date,
    duration: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema); 