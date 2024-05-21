import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";

import dotenv from "dotenv";

dotenv.config({ path: "../.env.local" });

async function main() {
  const model = new ChatOpenAI({
    model: "gpt-3.5-turbo",
  });

  const messageHistories = {};

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful assistant who remembers all details the user shares with you.`,
    ],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
  ]);

  const chain = prompt.pipe(model);

  const withMessageHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: async (sessionId) => {
      if (!messageHistories[sessionId]) {
        messageHistories[sessionId] = new InMemoryChatMessageHistory();
      }
      return messageHistories[sessionId];
    },
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
  });

  const config = {
    configurable: {
      sessionId: "abc2",
    },
  };

  const response = await withMessageHistory.invoke(
    {
      input: "What's my name?",
    },
    config
  );

  console.log(response.content);
  // const followupResponse = await withMessageHistory.invoke(
  //   {
  //     input: "What's my name?",
  //   },
  //   config
  // );
  
  // console.log('followupResponse', followupResponse.content)
  
}

main().catch(console.error);