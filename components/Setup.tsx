import { useState } from 'react';
import AudioRecorder from './AudioRecorder';
import UserDetailsForm from './UserDetailsForm';
import VoiceCloningInstructions from './VoiceCloningInstructions';
import Footer from './Footer';

export default function Setup() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voiceCloningStatus, setVoiceCloningStatus] = useState('');

  return (
    <div className="max-w-lg mx-auto p-8 rounded-lg shadow-lg mt-10">
      <h2 className="text-3xl text-left">Setup✨</h2>
      <VoiceCloningInstructions />
      <AudioRecorder setAudioBlob={setAudioBlob} setAudioUrl={setAudioUrl} />
      {audioUrl && (
        <div className="mt-4">
          <audio controls src={audioUrl}></audio>
        </div>
      )}
      <UserDetailsForm audioBlob={audioBlob} />
      <Footer />
    </div>
  );
}
