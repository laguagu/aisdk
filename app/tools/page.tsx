"use client";

import { useState } from "react";
import { Message, toolCall } from "@/app/actions";

export default function Home() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");

  return (
    <div className="p-20 bg-red-100">
      <div>
        {conversation.map((message, index) => (
          <div key={index}>
            {message.role}: {message.content}
            {message.display}
          </div>
        ))}
      </div>

      <div>
        <input
          type="text"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
          }}
        />
        <button
          onClick={async () => {
            const { messages } = await toolCall([
              // exclude React components from being sent back to the server:
              ...conversation.map(({ role, content }) => ({ role, content })),
              { role: "user", content: input },
            ]);

            setConversation(messages);
          }}
        >
          Send Message
        </button>
      </div>
    </div>
  );
}
