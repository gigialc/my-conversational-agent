import mongoose, { Schema } from 'mongoose';

const OnboardingSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  aboutYou: {
    type: String,
    required: true,
  },
  goals: {
    type: String,
    required: true,
  },
  idealSelf: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export interface OnboardingDocument extends mongoose.Document {
  userId: string;
  aboutYou: string;
  goals: string;
  idealSelf: string;
  createdAt: Date;
  updatedAt: Date;
}

// Export as a named export
export const Onboarding = mongoose.models.Onboarding || 
  mongoose.model<OnboardingDocument>('Onboarding', OnboardingSchema); 