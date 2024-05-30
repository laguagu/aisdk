"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "ai/react";
import { useRef, useEffect, useState } from "react";
import { Message } from "ai";
import { nanoid } from "nanoid";
import {
  deleteTempFile,
  getSpeechFromText,
  getWhisperTranscription,
} from "@/app/actions";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface TTSResponse {
  audioURL: string;
  tempFilePath: string;
}

export default function Chat() {
  const {
    messages: primaryMessages,
    input,
    append,
    setMessages,
    handleInputChange,
    handleSubmit,
    setInput,
    isLoading,
  } = useChat({
    api: `${API_URL}example2`,
    onError: (e) => {
      console.log(e);
    },
  });
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  async function sendMessageToAPI(messages: Message[], API_URL: string) {
    const response = await fetch(`${API_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send message", response);
      return null;
    }

    const responseText = await response.text();
    const uniqueId = nanoid();
    // const gptAnswer = responseText;

    if (responseText !== null) {
      setMessages([
        ...messages,
        {
          id: uniqueId,
          role: "assistant",
          content: responseText,
        },
      ]);
    }
    return responseText;
  }
  const handleAudioData = (data: BlobPart) => {
    const audioBlob = new Blob([data], { type: "audio/webm" });
    const audioURL = URL.createObjectURL(audioBlob);
    return { audioBlob, audioURL };
  };

  const addUserMessage = (messages: Message[], id: string, content: string) => {
    return messages.concat({
      id,
      content,
      role: "user",
    });
  };

  const addAssistantMessage = (
    messages: Message[],
    id: string,
    content: string
  ) => {
    return messages.concat({
      id,
      role: "assistant",
      content,
    });
  };

  const handleStartRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      const uniqueId = nanoid();

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const { audioBlob, audioURL } = handleAudioData(event.data);

          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");
          const transcriptionText = await getWhisperTranscription(formData);

          let messagesWithUserReply: Message[] = addUserMessage(
            primaryMessages,
            uniqueId,
            transcriptionText
          );
          setMessages(messagesWithUserReply);

          const llmResponse = await sendMessageToAPI(
            messagesWithUserReply,
            "http://localhost:3000/api/simple"
          );

          console.log(llmResponse);
          if (!llmResponse) return;
          
          const ttsResponse: TTSResponse = await getSpeechFromText(
            llmResponse
          );

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

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return; // Prevent sending empty messages or multiple messages while loading
    const uniqueId = nanoid();

    let messagesWithUserReply: Message[] = addUserMessage(
      primaryMessages,
      uniqueId,
      input
    );

    setMessages(messagesWithUserReply);
    setInput("");

    await sendMessageToAPI(
      messagesWithUserReply,
      "http://localhost:3000/api/simple"
    );
  };

  const chatParent = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const domNode = chatParent.current;
    if (domNode) {
      domNode.scrollTop = domNode.scrollHeight;
    }
  });

  return (
    <main className="flex flex-col w-full h-screen max-h-dvh bg-background">
      <header className="p-4 border-b w-full max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Whiper chat</h1>
      </header>

      <section className="p-4">
        <form
          onSubmit={sendMessage}
          className="flex w-full max-w-3xl mx-auto items-center"
        >
          <Input
            className="flex-1 min-h-[40px]"
            placeholder="Type your question here..."
            type="text"
            value={input}
            onChange={handleInputChange}
          />
          <Button className="ml-2" type="submit" disabled={isLoading}>
            Submit
          </Button>
          <Button
            className="ml-2"
            onClick={recording ? handleStopRecording : handleStartRecording}
            disabled={isLoading}
          >
            {recording ? "Stop Recording" : "Start Recording"}
          </Button>
        </form>
      </section>

      <section className="container px-0 pb-10 flex flex-col flex-grow gap-4 mx-auto max-w-3xl">
        <ul
          ref={chatParent}
          className="h-1 p-4 flex-grow bg-muted/50 rounded-lg overflow-y-auto flex flex-col gap-4"
        >
          {primaryMessages.map((m, index) => (
            <div key={index}>
              {m.role === "user" ? (
                <li key={m.id} className="flex flex-row">
                  <div className="rounded-xl p-4 bg-background shadow-md flex">
                    <p className="text-primary">{m.content}</p>
                  </div>
                </li>
              ) : (
                <li key={m.id} className="flex flex-row-reverse">
                  <div className="rounded-xl p-4 bg-background shadow-md flex w-3/4">
                    <p className="text-primary">{m.content}</p>
                  </div>
                </li>
              )}
            </div>
          ))}
        </ul>
      </section>
    </main>
  );
}
