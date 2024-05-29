"use server";

import { generateObject, streamObject, streamText, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createStreamableValue, createStreamableUI } from "ai/rsc";
import { ReactNode } from "react";
import { DefaultValues } from "./page";
import { OpenAI } from "openai";
import fs from "fs";
import { nanoid } from "nanoid";
import path from "path";

export interface Message {
  role: "user" | "assistant";
  content: string;
  display?: ReactNode; // [!code highlight]
}

export async function getNotifications(input: string): Promise<{
  notifications: { name: string; message: string; minutesAgo: number }[];
}> {
  "use server";
  console.log("getNotifications called");

  const { object: notifications } = await generateObject({
    model: openai("gpt-4-turbo"),
    system: "You generate one notifications for a messages app.",
    prompt: input,
    schema: z.object({
      notifications: z.array(
        z.object({
          name: z.string().describe("Name of a fictional person."),
          message: z.string().describe("Do not use emojis or links."),
          minutesAgo: z.number(),
        })
      ),
    }),
  });
  console.log(notifications);
  return notifications;
}

export async function getRecipe(input: string) {
  "use server";
  console.log("getRecipe called");
  const { object: recipe } = await generateObject({
    model: openai("gpt-4-turbo"),
    prompt: input,
    schema: z.object({
      recipe: z.object({
        name: z.string().describe("name of recipe"),
        ingredients: z.array(
          z.object({
            name: z.string().describe("ingredient name"),
            amount: z.string().describe("amount of ingredient"),
          })
        ),
        steps: z.array(z.string()).describe("steps to prepare recipe"),
      }),
    }),
  });
  console.log("getRecipe called 2");
  return { steps: recipe.recipe.steps };
}

export async function generate(input: string) {
  "use server";

  const stream = createStreamableValue();

  (async () => {
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4-turbo"),
      system: "You generate three notifications for a messages app.",
      prompt: input,
      schema: z.object({
        notifications: z.array(
          z.object({
            name: z.string().describe("Name of a fictional person."),
            message: z.string().describe("Do not use emojis or links."),
            minutesAgo: z.number(),
          })
        ),
      }),
    });

    for await (const partialObject of partialObjectStream) {
      stream.update(partialObject);
    }

    stream.done();
  })();

  return { object: stream.value };
}

export async function getWhisperTranscription(formData: FormData) {
  "use server";
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const file = formData.get("file") as File;
  console.log("getWhisperTranscription called with file: ", file.name);
  
  // Luodaan väliaikainen tiedosto
  const tempDir = path.join(process.cwd(), "public", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const uniqueId = nanoid();
  const tempFilePath = path.join(tempDir, `Temp_${uniqueId}.webm`);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(tempFilePath, buffer);

  // Lähetä tiedosto Whisper API:lle
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(tempFilePath),
    model: "whisper-1",
  });

  // Poistetaan väliaikainen tiedosto
  fs.unlinkSync(tempFilePath);

  return response.text;
}

export async function getSpeechFromText(text: string) {
  "use server";
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("getTextToSpeech called with text: ", text);

  const response = await openai.audio.speech.create({
    input: text,
    voice: "alloy", // Valitse haluamasi ääni
    model: "tts-1",
  });

  // Save the audio file to a temporary location
  const tempDir = path.join(process.cwd(), "public", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const uniqueId = nanoid();
  const tempFilePath = path.join(tempDir, `tts_output_${uniqueId}.mp3`);

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tempFilePath, buffer);

  // Return the path to the audio file
  const audioURL = `/temp/tts_output_${uniqueId}.mp3`;
  return { audioURL, tempFilePath };
}

export async function deleteTempFile(filePath: string) {
  "use server";
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted file: ${filePath}`);
  } else {
    console.log(`File ${filePath} does not exist`);
  }
}

export async function continueConversation(history: Message[]) {
  "use server";

  const stream = createStreamableValue();

  (async () => {
    const { textStream } = await streamText({
      model: openai("gpt-3.5-turbo"),
      system:
        "You are a dude that doesn't drop character until the DVD commentary.",
      messages: history,
    });

    for await (const text of textStream) {
      stream.update(text);
    }

    stream.done();
  })();

  return {
    messages: history,
    newMessage: stream.value,
  };
}

function getWeather({ city, unit }: { city: string; unit: string }) {
  // This function would normally make an
  // API request to get the weather.
  return { value: 25, description: "Sunny" };
}

export async function toolCall(history: Message[]) {
  "use server";
  const stream = createStreamableUI();
  const { text, toolResults } = await generateText({
    model: openai("gpt-3.5-turbo"),
    system: "You are a friendly weather assistant!",
    messages: history,
    tools: {
      getWeather: {
        description: "Get the weather for a location",
        parameters: z.object({
          city: z.string().describe("The city to get the weather for"),
          unit: z
            .enum(["C", "F"])
            .describe("The unit to display the temperature in"),
        }),
        execute: async ({ city, unit }) => {
          const weather = getWeather({ city, unit });
          return `It is currently ${weather.value}°C and ${weather.description} in ${city}!`;
        },
      },
    },
  });

  return {
    messages: [
      ...history,
      {
        role: "assistant" as const,
        content:
          text || toolResults.map((toolResult) => toolResult.result).join("\n"),
      },
    ],
  };
}

// Generative UI
