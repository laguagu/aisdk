import {
  Message as VercelChatMessage,
  StreamingTextResponse,
  createStreamDataTransformer,
} from "ai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import {
  BytesOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { CharacterTextSplitter } from "langchain/text_splitter";

const loader = new JSONLoader(
  "data/arabiaKaikkiTilaukset.json"
  // ["/state", "/code", "/nickname", "/website", "/admission_date", "/admission_number", "/capital_city", "/capital_url", "/population", "/population_rank", "/constitution_url", "/twitter_url"],
);

export const dynamic = "force-dynamic";

/**
 * Basic memory formatter that stringifies and passes
 * message history directly into the model.
 */
const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

const TEMPLATE = `Answer the user's questions based solely on the context provided. If the information is not available in the context, respond politely with "I'm sorry, but I do not have that information available." Do not generate or fabricate any information beyond what is given in the context.
Context: {context}
==============================
Current conversation: {chat_history}

user: {question}
assistant:`;

export async function POST(req: Request) {
  try {
    // Extract the `messages` from the body of the request
    const { messages } = await req.json();

    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);

    const currentMessageContent = messages[messages.length - 1].content;

    const docs = await loader.load();

    // load a JSON object
    // const textSplitter = new CharacterTextSplitter();
    // const docs = await textSplitter.createDocuments([JSON.stringify({
    //     "state": "Kansas",
    //     "slug": "kansas",
    //     "code": "KS",
    //     "nickname": "Sunflower State",
    //     "website": "https://www.kansas.gov",
    //     "admission_date": "1861-01-29",
    //     "admission_number": 34,
    //     "capital_city": "Topeka",
    //     "capital_url": "http://www.topeka.org",
    //     "population": 2893957,
    //     "population_rank": 34,
    //     "constitution_url": "https://kslib.info/405/Kansas-Constitution",
    //     "twitter_url": "http://www.twitter.com/ksgovernment",
    // })]);

    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      model: "gpt-3.5-turbo",
      temperature: 0,
      streaming: true,
      verbose: true,
    });
    /**
     * Chat models stream message chunks rather than bytes, so this
     * output parser handles serialization and encoding.
     */
    // const parser = new StringOutputParser(); // Ei striimaukseen sendMessage kanssa frontendissa
    const parser = new BytesOutputParser(); // Striimaukseen handleSubmit funktion kanssa frontendissa

    const chain = RunnableSequence.from([
      {
        question: (input) => input.question,
        chat_history: (input) => input.chat_history,
        context: () => formatDocumentsAsString(docs),
      },
      prompt,
      model,
      parser,
    ]);

    // Convert the response into a friendly text-stream
    const stream = await chain.stream({
      chat_history: formattedPreviousMessages.join("\n"),
      question: currentMessageContent,
    });

    // return new Response(stream);
    // Respond with the stream
    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer())
    );
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
