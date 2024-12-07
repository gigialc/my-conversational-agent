import { connectToMongoDB } from '@/dbConfig/dbconfig';

import User from '@/models/User';

import { NextRequest, NextResponse } from 'next/server';

import bcryptjs from 'bcryptjs';

connectToMongoDB();

// POST route (Create a new user inside the DB)
export async function POST(request: NextRequest) {
  try {
    // Grab data from body
    const reqBody = await request.json();

    // Destructure the incoming variables
    const { username, email, password } = reqBody;

    // REMOVE IN PRODUCTION
    console.log(reqBody);

    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const conflictField = existingUser.email === email ? 'email' : 'username';
      return NextResponse.json(
        {
          error: `A user with this ${conflictField} already exists.`,
        },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    // Save it inside the DB
    const savedUser = await newUser.save();

    return NextResponse.json({
      message: 'User created!',
      success: true,
      savedUser,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
