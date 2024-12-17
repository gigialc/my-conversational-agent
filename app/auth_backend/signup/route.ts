import { connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';

connectToMongoDB();

export async function POST(request: NextRequest) {
  try {
    // Grab data from body
    const reqBody = await request.json();
    console.log('Request Body:', reqBody);

    const { username, email, password } = reqBody;

    if (!username || !email || !password) {
      console.log('Validation Error: Missing fields');
      return NextResponse.json(
        { error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    console.log('Incoming Request:', reqBody);

    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    console.log('Existing User Check:', existingUser);

    if (existingUser) {
      const conflictField = existingUser.email === email ? 'email' : 'username';
      console.log(`Conflict Detected: ${conflictField}`);
      return NextResponse.json(
        { error: `A user with this ${conflictField} already exists.` },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    console.log('Hashed Password:', hashedPassword);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    // Save it inside the DB
    const savedUser = await newUser.save();
    console.log('User Saved:', savedUser);

    return NextResponse.json({
      message: 'User created!',
      success: true,
      savedUser,
    });

  } catch (error: any) {
    console.error('Signup Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}