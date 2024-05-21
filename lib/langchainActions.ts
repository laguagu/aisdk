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
import { z } from "zod";
export const basicChatBot = async (data: any) => {
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

export async function output_parsers() {
  // Schema
  const personSchema = z.object({
    name: z.string().nullish().describe("The name of the person"),
    hair_color: z
      .string()
      .nullish()
      .describe("The color of the person's hair if known"),
    height_in_meters: z
      .string()
      .nullish()
      .describe("Height measured in meters"),
  });
  // promptemplate
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert extraction algorithm.
  Only extract relevant information from the text.
  If you do not know the value of an attribute asked to extract,
  return null for the attribute's value.`,
    ],
    // Please see the how-to about improving performance with
    // reference examples.
    // ["placeholder", "{examples}"],
    ["human", "{text}"],
  ]);

  // llm
  const llm = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
  });
  // Chain
  const runnable = RunnableSequence.from([
    prompt,
    llm.withStructuredOutput(personSchema),
  ]);
  // Output
  const text =
    "The person's name is John Doe. He has brown hair and is 1.8 meters tall.";
  const response = await runnable.invoke({ text });
  console.log(response);
  
}
