"use server";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  RunnableWithMessageHistory,
  RunnablePassthrough,
  RunnableSequence,
  RunnableLambda,
} from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";

export const invokeLangChain = async (data: any) => {
  const model = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Luo filterMessages RunnableLambda instanssin avulla
  const filterMessages = new RunnableLambda({
    func: async ({ chat_history }: { chat_history: BaseMessage[] }) => {
      return chat_history.slice(-10);
    },
  });

  const messages = [
    new HumanMessage({ content: "hi! I'm bob" }),
    new AIMessage({ content: "hi!" }),
    new HumanMessage({ content: "I like vanilla ice cream" }),
    new AIMessage({ content: "nice" }),
    new HumanMessage({ content: "whats 2 + 2" }),
    new AIMessage({ content: "4" }),
    new HumanMessage({ content: "thanks" }),
    new AIMessage({ content: "No problem!" }),
    new HumanMessage({ content: "having fun?" }),
    new AIMessage({ content: "yes!" }),
    new HumanMessage({ content: "That's great!" }),
    new AIMessage({ content: "yes it is!" }),
  ];

  const messageHistories: Record<string, InMemoryChatMessageHistory> = {};

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful assistant who remembers all details the user shares with you.`,
    ],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
  ]);

  const chain = RunnableSequence.from([
    RunnablePassthrough.assign({
      chat_history: filterMessages,
    }),
    prompt,
    model,
  ]);

  const withMessageHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: async (sessionId) => {
      if (messageHistories[sessionId] === undefined) {
        const messageHistory = new InMemoryChatMessageHistory();
        await messageHistory.addMessages(messages);
        messageHistories[sessionId] = messageHistory;
      }
      return messageHistories[sessionId];
    },
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
  });
  const config = {
    configurable: {
      sessionId: "abc4",
    },
  };

  const response = await withMessageHistory.invoke(
    {
      input: "whats my favorite ice cream?",
    },
    config
  );

  console.log(response.content);

};
