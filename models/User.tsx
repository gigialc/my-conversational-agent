import mongoose from 'mongoose';
import { Schema } from 'mongoose';

// First, try to delete the existing model if it exists
if (mongoose.models.User) {
    delete mongoose.models.User;
}

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    elevenlabsapi: {
      type: String,
      required: false,
      index: false,
      default: null,
    },
    elevenlabsagentid: {
      type: String,
      required: false,
      index: false,
      default: null,
    },
    vapiAssistantId: {
      type: String,
      required: false,
      index: false,
      default: null,
    },
    initialMessageHandled: {
      type: Boolean,
      default: false,
    },
    timeUsed: {
      type: Number,
      default: 0,
    },
    lastTimeUpdate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    // Add this to ensure Mongoose doesn't enforce fields not in schema
    strict: true,
    // Add this to ensure schema is properly initialized
    versionKey: false
  }
);

// Create and export the model
const User = mongoose.model('User', userSchema);
export default User;
