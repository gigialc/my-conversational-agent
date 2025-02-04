import { connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

connectToMongoDB();

export async function POST(request: NextRequest) {
	try {
		// Check if TOKEN_SECRET exists
		if (!process.env.TOKEN_SECRET) {
			throw new Error('TOKEN_SECRET is not defined in environment variables');
		}

		// Grab data from body
		const reqBody = await request.json();
		console.log('Login Request Body:', reqBody); // Debugging statement

		const { email, password } = reqBody;

		if (!email || !password) {
			console.log('Validation Error: Missing fields'); // Debugging statement
			return NextResponse.json(
				{ error: 'Email and password are required.' },
				{ status: 400 }
			);
		}

		// Check if user exists
		const user = await User.findOne({ email });
		console.log('User Found:', user); // Debugging statement

		if (!user) {
			console.log('Login Error: User not found'); // Debugging statement
			return NextResponse.json(
				{ error: 'Email or password incorrect, please try again.' },
				{ status: 401 }
			);
		}

		// Check password
		const isPasswordValid = await bcryptjs.compare(password, user.password);
		console.log('Password Validity:', isPasswordValid); // Debugging statement

		if (!isPasswordValid) {
			console.log('Login Error: Incorrect password'); // Debugging statement
			return NextResponse.json(
				{ error: 'Email or password incorrect, please try again.' },
				{ status: 401 }
			);
		}

		// Successful login
		console.log('Login Successful for:', user.email); // Debugging statement

		// Create JWT payload
		const tokenData = {
			id: user._id,
			username: user.username,
			email: user.email,
			
		};
		//check for session data
		 console.log("Token Data:", tokenData);
		// Sign JWT token
		const token = jwt.sign(tokenData, process.env.TOKEN_SECRET, { expiresIn: '2d' });

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
		console.error('Login Error:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal Server Error' },
			{ status: 500 }
		);
	}
}
