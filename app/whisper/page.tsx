"use client";

import { useState, useRef, useEffect } from "react";
import { deleteTempFile, getSpeechFromText, getWhisperTranscription } from "../actions";

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const [ttsURL, setTtsURL] = useState("");
  const [text, setText] = useState("");

  const handleStartRecording = () => {
    // Request access to the user's microphone
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      // Create a new MediaRecorder instance
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        setAudioBlob(null);
        setAudioURL("");
      }
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
      const transcriptionText = await getWhisperTranscription(formData);
      setTranscription(transcriptionText);
      setText(transcriptionText); // Set text for TTS
    }
  };

  useEffect(() => {
    if (transcription) {
      const fetchTTS = async () => {
        const ttsAudioURL = await getSpeechFromText(transcription);
        setTtsURL(ttsAudioURL);
        console.log("ttsAudioURL: ", ttsAudioURL);
        
        const audio = new Audio(ttsAudioURL);
        audio.onended = async () => {
          // Delete the temporary file when the audio has finished playing
          await deleteTempFile(ttsAudioURL);
        };
        audio.play();
      };
      fetchTTS();
    }
  }, [transcription]);


  // Buttons for text to speech
  const handleTTS = async (event: React.FormEvent) => {
    event.preventDefault();
    if (text) {
      const audioURL = await getSpeechFromText(text);
      setTtsURL(audioURL);
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
        </div>
      )}
    </div>
  </div>
  );
}
