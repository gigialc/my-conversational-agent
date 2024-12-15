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
      type: String, // Optional field, no need for `required: false`
      sparse: true, // Ignore null or missing fields for uniqueness
    },
    elevenlabsagentid: {
      type: String, // Stores the cloned voice agent ID
      sparse: true, // Allows multiple null values
    },
    vapiAssistantId: {
      type: String,
      sparse: true,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Define the model
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
