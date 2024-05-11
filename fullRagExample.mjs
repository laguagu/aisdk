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
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
dotenv.config();

(async () => {
  const output_parsers = new StringOutputParser();
  const splitter = new RecursiveCharacterTextSplitter();

  const embeddings = new OpenAIEmbeddings();

  const chatModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Lataa dokumentti
  const loader = new CheerioWebBaseLoader(
    "https://docs.smith.langchain.com/user_guide"
  );
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

  const myRetriever = vectorstore.asRetriever();

  // const retrievalChain = await createRetrievalChain({
  //   combineDocsChain: documentChain,
  //   retriever: myRetriever,
  // });


  const historyAwarePrompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
    [
      "user",
      "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
    ],
  ]);
  
  const historyAwareRetrieverChain = await createHistoryAwareRetriever({
    llm: chatModel,
    retriever: myRetriever,
    rephrasePrompt: historyAwarePrompt,
  });

  const chatHistory = [
    new HumanMessage("Can LangSmith help test my LLM applications?"),
    new AIMessage("Yes!"),
  ];
  
  const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Answer the user's questions based on the below context:\n\n{context}",
    ],
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
  ]);

  const historyAwareCombineDocsChain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt: historyAwareRetrievalPrompt,
  });
  
  const conversationalRetrievalChain = await createRetrievalChain({
    retriever: historyAwareRetrieverChain,
    combineDocsChain: historyAwareCombineDocsChain,
  });


  const result2 = await conversationalRetrievalChain.invoke({
    chat_history: chatHistory,
    input: "tell me how",
  });
  
  console.log(result2.answer);

  })();
