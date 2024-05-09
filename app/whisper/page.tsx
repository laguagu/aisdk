"use client";
import React from "react";
import { useState } from "react";
import { getWhisperTranscription } from "../actions";

export default function Page() {
  const [file, setFile] = useState(null);

  const handleFileChange = (event: any) => {
    setFile(event.target.files[0]);
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    try {
      const response = await getWhisperTranscription();
      console.log(response);
    } catch (error) {
      console.error("Error transcribing audio:", error);
    }
  };

  return (
    <div className="p-20">
      <form onSubmit={handleSubmit}>
        <input type="file" accept="audio/*" onChange={handleFileChange} />
        <button type="submit">Transcribe Audio</button>
      </form>
    </div>
  );
}
