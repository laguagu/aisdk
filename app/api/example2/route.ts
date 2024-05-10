import { NextRequest, NextResponse } from "next/server";
import {
  Message as VercelChatMessage,
  StreamingTextResponse,
  OpenAIStream,
  createStreamDataTransformer,
} from "ai";

import { createClient } from "@supabase/supabase-js";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { Document } from "@langchain/core/documents";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  BytesOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";

export const runtime = "edge";

// Apufunktio dokumenttien yhdistämiseen yhdeksi tekstiksi.
const combineDocumentsFn = (docs: Document[]) => {
  const serializedDocs = docs.map((doc) => doc.pageContent);
  return serializedDocs.join("\n\n");
};

// Apufunktio keskusteluhistorian formaatoinnille viestien roolien mukaan.
const formatVercelMessages = (chatHistory: VercelChatMessage[]) => {
  const formattedDialogueTurns = chatHistory.map((message) => {
    if (message.role === "user") {
      return `Human: ${message.content}`;
    } else if (message.role === "assistant") {
      return `Assistant: ${message.content}`;
    } else {
      return `${message.role}: ${message.content}`;
    }
  });
  return formattedDialogueTurns.join("\n");
};

// Template kysymyksen tiivistämiseen standalone-kysymykseksi.
const CONDENSE_QUESTION_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

<chat_history>
  {chat_history}
</chat_history>

Follow Up Input: {question}
Standalone question:`;
const condenseQuestionPrompt = PromptTemplate.fromTemplate(
  CONDENSE_QUESTION_TEMPLATE
);

// Vastausmalli, joka käyttää aiempaa keskusteluhistoriaa ja kontekstia vastauksen generoimiseen.
const ANSWER_TEMPLATE = `
You are an AI assistant created specifically for Nikari, a prestigious Finnish furniture manufacturer renowned for its expertly crafted wooden furniture and sustainable design practices. 
Your role is to offer accurate and thoughtful responses that reflect Nikari's dedication to quality, environmental responsibility, and excellent customer service.

As you formulate your responses, consider the principles of craftsmanship and customer care that Nikari upholds. 
Provide detailed advice, maintenance tips, or insights into furniture design, tailored to the nuances of the question. Use a tone that is professional yet approachable, mirroring the ethos of a brand that values both heritage and innovation in design.

Answer the question based on the following context and chat history:
<context>
  {context}
</context>

<chat_history>
  {chat_history}
</chat_history>

Question: {question}
`;
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);

/**
 * This handler initializes and calls a retrieval chain. It composes the chain using
 * LangChain Expression Language. See the docs for more information:
 *
 * https://js.langchain.com/docs/guides/expression_language/cookbook#conversational-retrieval-chain
 */
/**
 * Handles the POST request for language processing.
 * @param req - The NextRequest object representing the incoming request.
 * @returns A response containing the processed language data.
 */
export async function POST(req: NextRequest) {
  console.log("Request received");
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const previousMessages = messages.slice(0, -1);
    const currentMessageContent = messages[messages.length - 1].content;

    // Alustaa OpenAI-mallin ja Supabase-asiakasohjelman.
    const model = new ChatOpenAI({
      modelName: "gpt-4-turbo-2024-04-09",
      temperature: 0.2,
      verbose: true,
      streaming: true,
    });

    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );
    const vectorstore = new SupabaseVectorStore(new OpenAIEmbeddings(), {
      client,
      tableName: "documents",
      queryName: "match_documents",
    });

    /**
     * We use LangChain Expression Language to compose two chains.
     * To learn more, see the guide here:
     *
     * https://js.langchain.com/docs/guides/expression_language/cookbook
     *
     * You can also use the "createRetrievalChain" method with a
     * "historyAwareRetriever" to get something prebaked.
     */

    // Muodostaa LangChain-ketjuja tiedonhaulle ja vastausten generoinnille.
    const standaloneQuestionChain = RunnableSequence.from([
      condenseQuestionPrompt,
      model,
      new StringOutputParser(),
    ]);

    let resolveWithDocuments: (value: Document[]) => void;
    const documentPromise = new Promise<Document[]>((resolve) => {
      resolveWithDocuments = resolve;
    });

    const retriever = vectorstore.asRetriever({
      callbacks: [
        {
          handleRetrieverEnd(documents) {
            resolveWithDocuments(documents);
          },
        },
      ],
    });

    const retrievalChain = retriever.pipe(combineDocumentsFn);

    const answerChain = RunnableSequence.from([
      {
        context: RunnableSequence.from([
          (input) => input.question,
          retrievalChain,
        ]),
        chat_history: (input) => input.chat_history,
        question: (input) => input.question,
      },
      answerPrompt,
      model,
    ]);

    // Suorittaa ketjun, joka tuottaa vastauksen käyttäjän kysymykseen.
    const conversationalRetrievalQAChain = RunnableSequence.from([
      {
        question: standaloneQuestionChain,
        chat_history: (input) => input.chat_history,
      },
      answerChain,
      new BytesOutputParser(),
    ]);

    // Lähettää vastauksen streamattuna takaisin klientille.
    const stream = await conversationalRetrievalQAChain.stream({
      question: currentMessageContent,
      chat_history: formatVercelMessages(previousMessages),
    });
    console.log("Response sent");

    return new StreamingTextResponse(
      stream.pipeThrough(createStreamDataTransformer())
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
