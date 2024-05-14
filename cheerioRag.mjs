import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import dotenv from "dotenv";

delete process.env.OPENAI_API_KEY;

dotenv.config({ path: "./.env.local"});

(async () => {
  const output_parsers = new StringOutputParser();
  const splitter = new RecursiveCharacterTextSplitter();

  const embeddings = new OpenAIEmbeddings();
  console.log('API KEY:', process.env.OPENAI_API_KEY)
  
  const chatModel = new ChatOpenAI({
    model: "gpt-4o",
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Lataa dokumentti
  const loader = new CheerioWebBaseLoader("https://www.is.fi/");
  const docs = await loader.load();

  // Splitataan dokumentti
  const splitDocs = await splitter.splitDocuments(docs);
  console.log(splitDocs.length);
  console.log(splitDocs[0].pageContent.length);

  // Luodaan vectorstore
  const vectorstore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings
  );

  const prompt =
    ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

  <context>
  {context}
  </context>

  Question: {input}`);

  const documentChain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt,
  });

  const retriever = vectorstore.asRetriever();

  const retrievalChain = await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever,
  });

  const result = await retrievalChain.invoke({
    input: "Missä pieni lapsi pelastettiin?",
  });

  console.log(result.answer);

  // const prompTemplate = PromptTemplate.fromTemplate(
  //   "Tell me about {question}?",
  // )

  // const chain = RunnableSequence.from([prompTemplate, chatModel, output_parsers]);

  // let result = await chain.invoke({ question: "Albert Einstein" });
  // console.log("result:", result);
})();
