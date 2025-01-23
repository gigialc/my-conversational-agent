import mongoose, { Schema } from 'mongoose';

const conversationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    callId: String,
    transcript: String,
    summary: String,
    recordingUrl: String,
    messages: [{
      role: String,
      message: String
    }],
    timestamp: { type: Date, default: Date.now }
  });

  const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

export default Conversation;

