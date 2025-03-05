import mongoose, { Schema } from 'mongoose';

// User call history schema
const CallHistorySchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  callId: {
    type: String,
    required: true,
    unique: true,
  },
  vapiAssistantId: {
    type: String,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  messages: [{
    role: { type: String, required: true },
    message: { type: String },
    time: { type: Number, required: true },
    source: { type: String, required: true },
    endTime: { type: Number, required: true },
    duration: { type: Number, required: true },
    secondsFromStart: { type: Number, required: true }
  }],
  transcript: {
    type: String,
  },
  summary: {
    type: String,
  }
}, {
  timestamps: true
});

// Define the interface for the document
export interface CallHistoryDocument extends mongoose.Document {
  userId: string;
  callId: string;
  vapiAssistantId?: string;
  startTime: Date;
  endTime?: Date;
  messages: {
    role: string;
    message?: string;
    time: number;
    source: string;
    endTime: number;
    duration: number;
    secondsFromStart: number;
  }[];
  transcript?: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the model
export const CallHistory = mongoose.models.CallHistory || 
  mongoose.model<CallHistoryDocument>('CallHistory', CallHistorySchema); 