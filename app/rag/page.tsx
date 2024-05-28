"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "ai/react";
import { useRef, useEffect, useState } from "react";
import { Message } from "ai";
import { v4 as uuidv4 } from 'uuid';

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
    api: "api/example3",
    onError: (e) => {
      console.log(e);
    },
  });

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return; // Prevent sending empty messages or multiple messages while loading
    const messagesWithUserReply = primaryMessages.concat({
      id: primaryMessages.length.toString(),
      content: input,
      role: "user",
    });

    setMessages(messagesWithUserReply);

    setInput("");

    const response = await fetch('api/example3', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messagesWithUserReply,
      }),
    });

    if (!response.ok) {
      console.error("Failed to send message", response);
      return;
    }
    const newMessages = messagesWithUserReply;

    const responseText = await response.text();
    const gptAnswer = responseText;

    setMessages([
      ...newMessages,
      { id: primaryMessages.length.toString(), role: "assistant", content: gptAnswer },
    ]);
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
        <h1 className="text-2xl font-bold">LangChain Chat</h1>
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
