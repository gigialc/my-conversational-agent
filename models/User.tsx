import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Define the schema
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true, // Removes leading/trailing spaces
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Converts email to lowercase
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    elevenlabsapi: {
      type: String,
      required: false,
      index: false,  // Explicitly prevent indexing
      default: null,
    },
    elevenlabsagentid: {
      type: String,
      required: false,
      index: false,  // Explicitly prevent indexing
      default: null,
    },
    vapiAssistantId: {
      type: String,
      required: false,
      index: false,  // Explicitly prevent indexing
      default: null,
    },
    knowledgeBase: {
      type: Map,
      of: String,
      default: {}
    }
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Define the model
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
