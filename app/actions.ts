"use server";

import { generateObject, streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createStreamableValue } from "ai/rsc";
import { ReactNode } from "react";
import {DefaultValues} from "./page";

export interface Message {
  role: "user" | "assistant";
  content: string;
  display?: ReactNode; // [!code highlight]
}


export async function getNotifications(input: string): Promise<{ notifications: { name: string; message: string; minutesAgo: number; }[] }> {
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
  return notifications ;
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
