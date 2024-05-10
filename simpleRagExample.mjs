import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RetrievalQAChain } from "langchain/chains";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PromptTemplate } from "@langchain/core/prompts";
import * as fs from "fs";
import dotenv from 'dotenv';
dotenv.config();

const apiKey =  process.env.OPENAI_API_KEY;

const fileContent = fs.readFileSync('hoito-ohjeet.txt', 'utf8');

// Kovakoodattu esimerkki data
const data = [
  {
    title: "Nikari December-tuoli",
    content: "Nikari December on tammesta valmistettu tuoli. Hoito-ohje: Puhdista säännöllisesti kuivalla tai nihkeällä liinalla. Vältä liiallista kosteutta."
  },
  {
    title: "Nikari Fino-pöytä",
    content: "Nikari Fino on massiivitammesta valmistettu ruokapöytä. Hoito-ohje: Pyyhi pöytä säännöllisesti kuivalla tai nihkeällä liinalla. Vältä voimakkaita puhdistusaineita."
  },
];

const template = `Olet Nikari-huonekalujen ystävällinen ja asiantunteva chatbot-avustaja. Vastaa käyttäjien kysymyksiin kohteliaasti ja selkeästi, tarjoten hyödyllisiä neuvoja Nikari-huonekalujen hoitoon ja käyttöön liittyen
annetun kontekstin perusteella.

Kysymys: {question}

Vastaus:`;

const prompt = new PromptTemplate({
  template: template,
  inputVariables: ["question"],
});

(async () => {
  // Alusta OpenAI LLM ja Embeddings
  const model = new OpenAI({apiKey});
  const embeddings = new OpenAIEmbeddings();

  // Jaa data pienempiin osiin
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
  // const docs = await textSplitter.createDocuments(data.map(d => d.title + "\n" + d.content));
  const docs = await textSplitter.createDocuments([fileContent]);

  // Luo vektoritietokanta käyttäen HNSW-kirjastoa
  const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);

  // Initialize a retriever wrapper around the vector store
  const vectorStoreRetriever = vectorStore.asRetriever();

  // Luo RetrievalQAChain käyttäen LLM:ää ja vektoritietokantaa
  const chain = RetrievalQAChain.fromLLM(model, vectorStoreRetriever, {
    promptTemplate: prompt,
  });

  // Kysy kysymys ja hae vastaus
  const question = "Miten Nikari December -tuolia tulisi hoitaa?";
  const res = await chain.invoke({ query: question });
;
  console.log("Vastaus:", res.text);
  
})();