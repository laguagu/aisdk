# LangChain Chat Application

This project demonstrates a chat application built with Next.js, utilizing the LangChain library for document processing, OpenAI's Whisper API for speech-to-text transcription, and Vercel AI SDK for integrating AI capabilities. The application supports various features including streaming text and objects, conversational retrieval with RAG (Retrieval-Augmented Generation) models, and more.

## Features

- **Audio Recording and Transcription**
  - Record audio directly from the browser.
  - Transcribe audio to text using OpenAI's Whisper API.

- **Chat Interface**
  - Interactive chat interface built with Next.js.
  - Supports streaming text responses using Vercel AI SDK.

- **Document Processing with LangChain**
  - Load and split documents.
  - Create embeddings and vector stores.
  - Implement conversational retrieval with History-Aware Retriever.

- **Generative AI Features**
  - Generate text and objects using OpenAI models.
  - Stream text and object responses.

## Getting Started

### Prerequisites

- OpenAI API Key

### Document Processing

The application uses LangChain for document processing, including loading, splitting, and creating vector stores from documents. It also supports conversational retrieval with history-aware retrievers.

### Generative AI Features

The application includes various generative AI features, such as generating notifications, recipes, and handling conversational history.
