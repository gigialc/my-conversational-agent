import { connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

connectToMongoDB();

export async function POST(request: NextRequest) {
	try {
		// Parse request body
		const { email, password } = await request.json();

		// Check user existence
		const user = await User.findOne({ email });
		if (!user) {
			return NextResponse.json({ error: 'User does not exist' }, { status: 400 });
		}

		// Verify password
		const validPassword = await bcryptjs.compare(password, user.password);
		if (!validPassword) {
			return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
		}

		// Create JWT payload
		const tokenData = {
			id: user._id,
			username: user.username,
			email: user.email,
			
		};
		//check for session data
		 console.log("Token Data:", tokenData);
		// Sign JWT token
		const token = jwt.sign(tokenData, process.env.TOKEN_SECRET!, { expiresIn: '2d' });

		// Set token in cookies
		const response = NextResponse.json({ message: 'Login Successful', success: true });
		response.cookies.set('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production', // Secure in production
			maxAge: 2 * 24 * 60 * 60, // 2 days
			sameSite: 'lax',
		});
		return response;
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
