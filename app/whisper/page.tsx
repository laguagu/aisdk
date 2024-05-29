"use client";

import { useState, useRef } from "react";
import {
  deleteTempFile,
  getSpeechFromText,
  getWhisperTranscription,
} from "../actions";

interface TTSResponse {
  audioURL: string;
  tempFilePath: string;
}

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [transcription, setTranscription] = useState("");
  const [ttsURL, setTtsURL] = useState("");
  const [text, setText] = useState("");

  const handleStartRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        setAudioURL("");
      }
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const audioBlob = new Blob([event.data], { type: "audio/webm" });
          const audioURL = URL.createObjectURL(audioBlob);
          setAudioURL(audioURL);

          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");
          const transcriptionText = await getWhisperTranscription(formData);
          setTranscription(transcriptionText);
          setText(transcriptionText);

          const ttsResponse: TTSResponse = await getSpeechFromText(
            transcriptionText
          );
          setTtsURL(ttsResponse.audioURL);

          const audio = new Audio(ttsResponse.audioURL);
          audio.onended = async () => {
            await deleteTempFile(ttsResponse.tempFilePath);
          };
          audio.play();
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

  const handleTTS = async (event: React.FormEvent) => {
    event.preventDefault();
    if (text) {
      const ttsResponse: TTSResponse = await getSpeechFromText(text);
      setTtsURL(ttsResponse.audioURL);

      const audio = new Audio(ttsResponse.audioURL);
      audio.onended = async () => {
        await deleteTempFile(ttsResponse.tempFilePath);
      };
      audio.play();
    }
  };

  return (
    <div className="p-20">
      <button onClick={recording ? handleStopRecording : handleStartRecording}>
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
      {audioURL && <audio src={audioURL} controls />}
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
        <div className="mt-10 bg-green-100">
          {ttsURL && (
            <div className="mt-2">
              <h2>Generated Speech:</h2>
              <audio src={ttsURL} controls />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
