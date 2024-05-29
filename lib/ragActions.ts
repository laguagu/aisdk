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
import { wrapOpenAI } from "langsmith/wrappers";
import OpenAI from "openai";
export const dynamic = "force-dynamic";

// Apufunktio dokumenttien yhdistämiseen yhdeksi tekstiksi.
const combineDocumentsFn = (docs: Document[]) => {
  return docs.map((doc) => doc.pageContent).join("\n\n");
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
You are an AI assistant created specifically for Piiroinen, a distinguished Finnish company known for its expertise in furniture care and maintenance. Your primary role is to provide accurate and thoughtful responses about the maintenance, care, and repair of furniture.

As you formulate your responses, consider the principles of craftsmanship and customer care that Piiroinen upholds. Offer detailed advice, maintenance tips, or insights into furniture repair and care, tailored to the nuances of the question. Use a tone that is professional yet approachable, reflecting the ethos of a brand that values both heritage and innovation in design.

Do not generate or fabricate any information beyond what is given in the context.

Answer the question based on the following context and chat history (if any). If the context is not relevant to the question, disregard it:
<context>
  {context}
</context>

<chat_history>
  {chat_history}
</chat_history>

Question: {question}
`;


const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE);

export async function getAnswerFromExample2(input: {
  chat_history?: any;
  question?: any;
  messages: any;
}) {
  console.log("Request received");
  console.log("input", input);
  return "Hello, world!";
  try {
    const messages = input.messages ?? []; // Ottaa viestit syötteestä tai tyhjän taulukon, jos viestejä ei ole
    const previousMessages = messages.slice(0, -1); // Ottaa kaikki viestit paitsi viimeisen
    const currentMessageContent = messages[messages.length - 1].content; // Ottaa viimeisen viestin sisällön

    // Alustaa OpenAI-mallin ja Supabase-asiakasohjelman.
    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.2,
      verbose: true, // Tulostaa lisätietoja, jos true
      streaming: true,
    });

    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );

    const vectorstore = new SupabaseVectorStore(new OpenAIEmbeddings(), {
      client,
      tableName: "exampleDocs", // Tietokantataulun nimi
      queryName: "matching_documents", // Kysely funktion nimi
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

    // Hakee dokumentit Supabase-tietokannasta.
    const retriever = vectorstore.asRetriever({
      callbacks: [
        {
          handleRetrieverEnd(documents: Document<Record<string, any>>[]) {
            console.log("documents", documents); // Tulostaa kaikki haetut dokumentit
            resolveWithDocuments(documents); // Kun dokumentit on haettu, ratkaisee lupauksen dokumenteilla
          },
        },
      ],
    });

    const retrievalChain = retriever.pipe(combineDocumentsFn); // Kombinoi haetut dokumentit yhdeksi tekstiksi

    // Alustaa ketjun vastauksen generoimiseen.
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
        question: standaloneQuestionChain, // Saa standalone-kysymyksen ketjusta
        chat_history: (input) => input.chat_history, // Saa keskusteluhistorian syötteenä
      },
      answerChain,
      //   new BytesOutputParser(), // Käytä tätä, jos käytät striimausta
      new StringOutputParser(), // Käytä tätä, jos et käytä striimausta
    ]);

    // Lähettää vastauksen streamattuna takaisin klientille.
    const result = await conversationalRetrievalQAChain.invoke({
      question: currentMessageContent,
      chat_history: formatVercelMessages(previousMessages), // Muotoilee keskusteluhistorian
    });
    console.log("Response sent");
    return JSON.stringify(result);

    return result.pipeThrough(createStreamDataTransformer()); // Luo ja muuntaa streamin vastaukselle
  } catch (e: any) {
    console.error(e);
    throw new Error(e.message);
  }
}
