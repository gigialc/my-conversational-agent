import mongoose, { Schema } from 'mongoose';

const OnboardingResponseSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  aboutYou: {
    transcript: String,
    callId: String,
    vapiAssistantId: String,
    completed: {
      type: Boolean,
      default: false
    }
  },
  goals: {
    transcript: String,
    callId: String,
    vapiAssistantId: String,
    completed: {
      type: Boolean,
      default: false
    }
  },
  idealSelf: {
    transcript: String,
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
    transcript: string;
    callId: string;
    vapiAssistantId: string;
    completed: boolean;
  };
  goals: {
    transcript: string;
    callId: string;
    vapiAssistantId: string;
    completed: boolean;
  };
  idealSelf: {
    transcript: string;
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