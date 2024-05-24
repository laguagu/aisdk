"use client";

import { useState, useRef } from "react";
import { getSpeechFromText, getWhisperTranscription } from "../actions";

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [ttsURL, setTtsURL] = useState("");
  const [text, setText] = useState("");

  const handleStartRecording = () => {
    // Request access to the user's microphone
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      // Create a new MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      // When the MediaRecorder has data available, create a new Blob and set the audio URL
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

    // if there is an audio blob, send it to the server
    if (audioBlob) {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      const audio = await getWhisperTranscription(formData);
      console.log("audio: ", audio);
    }
  };

  const handleTTS = async (event: React.FormEvent) => {
    event.preventDefault();
    if (text) {
      const audioURL = await getSpeechFromText(text);
      setTtsURL(audioURL);
    }
  };

  const handleListenToSpeech = async () => {
    const audio = new Audio(ttsURL);
    audio.play();
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
    {/* Text to speech */}
    <div className="mt-5 bg-red-50">
      <h2 className="font-bold">Text to Speech</h2>
      <form onSubmit={handleTTS}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          cols={50}
          placeholder="Enter text to convert to speech"
        />
        <button type="submit" disabled={!text} className="flex">
          Convert to Speech
        </button>
      </form>
      {ttsURL && (
        <div className="mt-2">
          <h2>Generated Speech:</h2>
          <audio src={ttsURL} controls />
          <button onClick={handleListenToSpeech}>Listen to Speech</button>
        </div>
      )}
    </div>
  </div>
  );
}
