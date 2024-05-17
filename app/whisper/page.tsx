"use client";

import { useState, useRef } from "react";
import { getWhisperTranscription } from "../actions";

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleStartRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioBlob(event.data);
          const audioURL = URL.createObjectURL(event.data);
          setAudioURL(audioURL);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    });
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (audioBlob) {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      const audio = await getWhisperTranscription(formData)
      console.log("audio: ", audio);
      
    }
  };

  return (
    <div className="p-20">
      <button onClick={recording ? handleStopRecording : handleStartRecording}>
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
      {audioURL && <audio src={audioURL} controls />}
      <form onSubmit={handleSubmit}>
        <button type="submit" disabled={!audioBlob}>
          Transcribe Audio
        </button>
      </form>
      {transcription && (
        <div>
          <h2>Transcription:</h2>
          <p>{transcription}</p>
        </div>
      )}
    </div>
  );
}
