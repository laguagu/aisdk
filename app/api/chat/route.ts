import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

export async function GET(request: Request) {
  const { object } = await generateObject({
    model: openai("gpt-4-turbo"),
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
    prompt: "Generate a lasagna recipe.",
  });

  console.log(object);
  return new Response("GET /api/chat");
}
