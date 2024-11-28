'use client';

import { useState } from 'react';

export default function Onboarding() {
  const [apiKey, setApiKey] = useState('');
  const [agentId, setAgentId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!apiKey.trim() || !agentId.trim()) {
      setError('Both fields are required.');
      return;
    }

    // Save to localStorage or send to backend
    localStorage.setItem('elevenLabsApiKey', apiKey);
    localStorage.setItem('elevenLabsAgentId', agentId);

    setError('');
    alert('Settings saved successfully!');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1 className="text-2xl font-bold text-pink-400 mb-4">Onboarding</h1>
      <p className="text-gray-300 text-center mb-6">
        Enter your Eleven Labs API key and Agent ID to get started.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-md"
      >
        {error && (
          <div className="text-red-500 text-sm mb-4">{error}</div>
        )}

        <div className="mb-4">
          <label
            htmlFor="apiKey"
            className="block text-gray-700 font-medium mb-2"
          >
            Eleven Labs API Key
          </label>
          <input
            type="text"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Enter your API key"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="agentId"
            className="block text-gray-700 font-medium mb-2"
          >
            Eleven Labs Agent ID
          </label>
          <input
            type="text"
            id="agentId"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your Agent ID"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-pink-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700"
        >
          Save and Continue
        </button>
      </form>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Need Help?</h2>
        <p className="text-gray-600 mb-2">
          Follow these steps to get your API key and Agent ID:
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>
            Visit the{' '}
            <a
              href="https://docs.elevenlabs.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Eleven Labs Documentation
            </a>
          </li>
          <li>
            Log in to your Eleven Labs account and navigate to{' '}
            <a
              href="https://api.elevenlabs.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              API Settings
            </a>
          </li>
          <li>
            Generate an API key and copy your Agent ID from the dashboard.
          </li>
        </ul>
      </div>
    </div>
  );
}

