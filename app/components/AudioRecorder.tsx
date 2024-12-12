import { useRef, useState } from 'react';
import { Dispatch, SetStateAction } from 'react';

interface AudioRecorderProps {
  setAudioBlob: Dispatch<SetStateAction<Blob | null>>;
  setAudioUrl: Dispatch<SetStateAction<string | null>>;
}

export default function AudioRecorder({ setAudioBlob, setAudioUrl }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/wav' });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div>
      {isRecording ? (
        <button onClick={stopRecording} className="bg-red-500 px-4 py-2 rounded-md">
          Stop Recording
        </button>
      ) : (
        <button onClick={startRecording} className="bg-green-500 px-4 py-2 rounded-full">
          Record
        </button>
      )}
    </div>
  );
}
