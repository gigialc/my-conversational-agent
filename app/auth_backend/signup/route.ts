import { connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log("1. Starting signup process...");
    
    await connectToMongoDB();
    console.log("2. MongoDB connected");
    
    const reqBody = await request.json();
    console.log("3. Request body:", reqBody);

    const { username, email, password } = reqBody;

    if (!username || !email || !password) {
      console.log("4. Validation failed - missing fields");
      return NextResponse.json(
        { error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    try {
      console.log("5. Checking for existing user");
      const existingUser = await User.findOne({
        $or: [{ email: email.trim() }, { username }],
      });

      if (existingUser) {
        const field = existingUser.email === email.trim() ? 'email' : 'username';
        console.log(`6. Duplicate ${field} found`);
        return NextResponse.json(
          { error: `This ${field} is already registered.` },
          { status: 409 }
        );
      }

      console.log("7. Hashing password");
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      console.log("8. Creating user object");
      const newUser = new User({
        username,
        email: email.trim(),
        password: hashedPassword,
        timeUsed: 0,
        lastTimeUpdate: new Date()
      });

      console.log("9. Attempting to save user:", {
        username: newUser.username,
        email: newUser.email,
        timeUsed: newUser.timeUsed,
        lastTimeUpdate: newUser.lastTimeUpdate
      });

      try {
        const savedUser = await newUser.save();
        console.log("10. User saved successfully:", savedUser._id);
        
        return NextResponse.json({
          message: 'User created successfully',
          success: true
        });
      } catch (saveError: any) {
        console.error("Save Error Details:", {
          name: saveError.name,
          message: saveError.message,
          code: saveError.code,
          errors: saveError.errors,
          stack: saveError.stack
        });
        
        return NextResponse.json(
          { error: `Database save failed: ${saveError.message}` },
          { status: 500 }
        );
      }

    } catch (dbError: any) {
      console.error("Database Error Details:", {
        name: dbError.name,
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      });
      
      return NextResponse.json(
        { error: `Database operation failed: ${dbError.message}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("General Error Details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}