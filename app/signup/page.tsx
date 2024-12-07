'use client';

import Link from 'next/link';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image'; // Import the Image component
import { FaAngleLeft } from 'react-icons/fa6';
import { signIn } from 'next-auth/react';

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

      // Automatically sign the user in
      const signInResponse = await signIn('credentials', {
        redirect: false,
        email: user.email,
        password: user.password,
      });

      if (signInResponse?.error) {
        setErrorMessage('Error during sign-in. Please try logging in manually.');
        console.log('Sign-in error:', signInResponse.error);
        return;
      }

      router.push('/onboardingPage');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Sign up failed, please try again.';
      setErrorMessage(message);
      console.log('Sign up failed:', message);
    } finally {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-pink-500 to-black py-6 px-4 sm:px-8 text-white">
      {/* Logo */}
      {/* <div className="w-[150px] h-[150px] mb-6">
        <Image
          src="/mirailogo.png" // Path to the logo in the public folder
          alt="Mirai Logo"
          width={100}
          height={100}
          className="object-contain"
        />
      </div> */}

      <h1 className="py-2 text-2xl font-semibold text-black sm:text-5xl">Mirai</h1>
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
        className="p-3 bg-pink-600 text-white uppercase font-bold w-full sm:w-[350px] rounded-lg mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-300 transition"
      >
        {buttonDisabled ? 'Sign Up' : 'Register My Account Now'}
      </button>

      <Link href="/login">
        <p className="mt-10 text-white text-center">
          Do you have a free account already?{' '}
          <span className="font-bold text-blue-700 ml-2 cursor-pointer underline">Login to your account</span>
        </p>
      </Link>

      <Link href="/">
        <p className="mt-8 opacity-50 text-white text-center">
          <FaAngleLeft className="inline mr-1 text-white" /> Back to the Homepage
        </p>
      </Link>
    </div>
  );
}
