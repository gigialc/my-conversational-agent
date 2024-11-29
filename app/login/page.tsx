'use client';

import Link from 'next/link';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaAngleLeft } from 'react-icons/fa6';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');

  const [user, setUser] = React.useState({
    email: '',
    password: '',
  });

  const [buttonDisabled, setButtonDisabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const onLogin = async () => {
    try {
      setLoading(true);
      const response = await axios.post('auth_backend/login', user);
      console.log('Login successful', response.data);
      router.push('/home');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Email or password incorrect, please try again.';
      setErrorMessage(message); // Set the error message state
      console.log('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.email.length > 0 && user.password.length > 0) {
      setButtonDisabled(false);
    } else {
      setButtonDisabled(true);
    }
  }, [user]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-pink-500 to-black py-2 text-white">
      <h1 className="py-2 text-4xl font-semibold text-black">
        Mirai
        </h1>
      <h2 className="py-10 mb-5 text-2xl font-semibold">
        {loading ? "We're logging you in..." : 'Login'}
      </h2>


      <input
        className="w-[350px] p-3 text-black border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-gray-600"
        id="email"
        type="text"
        value={user.email}
        onChange={(e) => setUser({ ...user, email: e.target.value })}
        placeholder="Your Email..."
      />

      <input
        className="w-[350px] p-3 text-black border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-gray-600"
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
        onClick={onLogin}
        disabled={buttonDisabled}
        className="p-3 bg-pink-600 text-white uppercase font-bold w-[350px] rounded-lg mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-300 transition"
      >
        Login
      </button>

      <Link href="/signup">
        <p className="mt-10 text-white">
          Do not have an account yet?
          <span className="font-bold text-blue-700 ml-2 cursor-pointer underline">Register your free account now</span>
        </p>
      </Link>

      <Link href="/home">
        <p className="mt-8 opacity-50 text-white">
          <FaAngleLeft className="inline mr-1 text-white" /> Back to the Homepage
        </p>
      </Link>
    </div>
  );
}
