import {connectToMongoDB } from '@/dbConfig/dbconfig';
import User from '@/models/User';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed.' });
  }

  try {
    // Connect to MongoDB
    await connectToMongoDB();

    const { email, elevenlabsapi } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Call Eleven Labs API to clone the voice
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${elevenlabsapi}`,
      },
      body: JSON.stringify({
        name: user.username,
        // You can include other metadata here as needed
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to clone voice on Eleven Labs.');
    }

    const data = await response.json();
    const agentId = data.voice_id; // Assuming the API returns a `voice_id`

    // Update the user's agent ID in the database
    user.elevenlabsagentid = agentId;
    await user.save();

    return res.status(200).json({
      message: 'Voice cloning successful.',
      agentId,
    });
  } catch (error) {
    console.error('Error cloning voice:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
