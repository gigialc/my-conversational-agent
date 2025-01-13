'use client';
import Link from 'next/link';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaAngleLeft } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
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
      setLoading(true);
      const response = await axios.post('/auth_backend/signup', user);
      console.log('Account successfully created!', response.data);
      router.push('/login');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Sign up failed, please try again.';
      setErrorMessage(message);
      console.log('Sign up failed:', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/home' });
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
        {loading ? "We're creating your account..." : 'Register'}
      </h2>

      <button
        onClick={handleGoogleSignIn}
        className="w-full sm:w-[350px] p-3 border border-gray-300 rounded-lg mb-6 flex items-center justify-center space-x-2 hover:bg-gray-100 hover:text-black transition-colors"
      >
        <FcGoogle className="text-2xl" />
        <span>Continue with Google</span>
      </button>

      <div className="w-full sm:w-[350px] flex items-center mb-6">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-4 text-gray-500">or</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

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

      {errorMessage && (
        <div className="text-red-500 text-sm mt-2 mb-2">
          {errorMessage}
        </div>
      )}

      <button
        onClick={onSignUp}
        disabled={buttonDisabled}
        className="p-3 bg-pink-600 text-white uppercase font-bold w-full sm:w-[350px] rounded-lg mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-300 transition"
      >
        {buttonDisabled ? 'Fill in all fields' : 'Create Account'}
      </button>

      <Link href="/login">
        <p className="mt-10 text-white text-center">
          Already have an account?{' '}
          <span className="font-bold text-blue-700 ml-2 cursor-pointer underline">Login here</span>
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
