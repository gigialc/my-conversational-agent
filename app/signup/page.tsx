'use client';

import Link from 'next/link';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image'; // Import the Image component
import { FaAngleLeft } from 'react-icons/fa6';
import { signIn } from 'next-auth/react';
import Footer from '../../components/Footer';

export default function SignUpPage() {
  const [successMessage, setSuccessMessage] = React.useState('');
  const router = useRouter();

  const [user, setUser] = React.useState({
    username: '',
    email: '',
    password: '',
  });

  const [buttonDisabled, setButtonDisabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const onSignUp = async () => {
    try {
      console.log('Starting signup process with user data:', {
        username: user.username,
        email: user.email,
        passwordLength: user.password.length // Don't log actual password
      });
      
      setLoading(true);
      console.log('Loading state set to true');

      console.log('Sending POST request to /auth_backend/signup');
      const response = await axios.post('/auth_backend/signup', user);
      console.log('Signup response received:', response.data);

      // Automatically sign the user in
      console.log('Attempting automatic sign in');
      const signInResponse = await signIn('credentials', {
        redirect: false,
        email: user.email,
        password: user.password,
      });
      console.log('Sign in response:', signInResponse);

      if (signInResponse?.error) {
        console.error('Sign-in error occurred:', signInResponse.error);
        setErrorMessage('Error during sign-in. Please try logging in manually.');
        return;
      }

      console.log('Sign in successful, redirecting to login page');
      router.push('/login');
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      const message =
        error.response?.data?.error || error.response?.data?.message || 'Sign up failed, please try again.';
      setErrorMessage(message);
      console.log('Error message set to:', message);
    } finally {
      console.log('Signup process completed, loading set to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      user.username.length > 0 &&
      user.email.length > 0 &&
      user.password.length > 0
    ) {
      setButtonDisabled(false);
    } else {
      setButtonDisabled(true);
    }
  }, [user]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-6 px-4 sm:px-8 text-white mt-10">

      <h1 className="py-2 text-2xl font-semibold text-white sm:text-5xl">Mirai</h1>
      <h2 className="py-10 text-2xl font-semibold sm:text-3xl">
        {loading ? "We're logging you in..." : 'Register'}
      </h2>

      {successMessage && (
        <div className="mb-4 text-green-600 font-bold text-center">
          {successMessage}
        </div>
      )}

      <input
        className="w-full sm:w-[350px] p-3 text-black border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-gray-600"
        id="username"
        type="text"
        value={user.username}
        onChange={(e) => setUser({ ...user, username: e.target.value })}
        placeholder="Your Username..."
      />

      <input
        className="w-full sm:w-[350px] p-3 text-black border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-gray-600"
        id="email"
        type="text"
        value={user.email}
        onChange={(e) => setUser({ ...user, email: e.target.value })}
        placeholder="Your Email..."
      />

      <input
        className="w-full sm:w-[350px] p-3 text-black border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-gray-600"
        id="password"
        type="password"
        value={user.password}
        onChange={(e) => setUser({ ...user, password: e.target.value })}
        placeholder="Your Password..."
      />

      <button
        onClick={onSignUp}
        disabled={buttonDisabled}
        className="p-3 bg-purple-600 text-white uppercase font-bold w-full sm:w-[350px] rounded-lg mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition"
      >
        {buttonDisabled ? 'Sign Up' : 'Register My Account Now'}
      </button>

      <Link href="/login">
        <p className="mt-10 text-white text-center">
          Do you have a free account already?{' '}
          <span className="font-bold text-blue-700 ml-2 cursor-pointer underline">Login to your account</span>
        </p>
      </Link>

      <Link href="/home">
        <p className="mt-8 opacity-50 text-white text-center">
          <FaAngleLeft className="inline mr-1 text-white" /> Skip Authentication
        </p>
      </Link>
      <Footer />
    </div>
  );
}
