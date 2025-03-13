import mongoose, { Schema } from 'mongoose';

interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

const OnboardingResponseSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  aboutYou: {
    messages: [{
      role: String,
      content: String,
      timestamp: String
    }],
    callId: String,
    vapiAssistantId: String,
    completed: {
      type: Boolean,
      default: false
    }
  },
  goals: {
    messages: [{
      role: String,
      content: String,
      timestamp: String
    }],
    callId: String,
    vapiAssistantId: String,
    completed: {
      type: Boolean,
      default: false
    }
  },
  idealSelf: {
    messages: [{
      role: String,
      content: String,
      timestamp: String
    }],
    callId: String,
    vapiAssistantId: String,
    completed: {
      type: Boolean,
      default: false
    }
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

export interface OnboardingResponseDocument extends mongoose.Document {
  userId: string;
  aboutYou: {
    messages: Message[];
    callId: string;
    vapiAssistantId: string;
    completed: boolean;
  };
  goals: {
    messages: Message[];
    callId: string;
    vapiAssistantId: string;
    completed: boolean;
  };
  idealSelf: {
    messages: Message[];
    callId: string;
    vapiAssistantId: string;
    completed: boolean;
  };
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Export the model
export const OnboardingResponse = mongoose.models.OnboardingResponse || 
  mongoose.model<OnboardingResponseDocument>('OnboardingResponse', OnboardingResponseSchema); 