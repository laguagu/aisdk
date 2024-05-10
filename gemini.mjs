import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
dotenv.config();

// export GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
process.env.GOOGLE_APPLICATION_CREDENTIALS
// Initialize Vertex with your Cloud project and location
console.log('GOOGLE_PROJECT:', process.env.GOOGLE_PROJECT);
console.log('GOOGLE_LOCATION:', process.env.GOOGLE_LOCATION);


const vertex_ai = new VertexAI({project: process.env.GOOGLE_PROJECT, location: process.env.GOOGLE_LOCATION});
const model = 'gemini-1.5-pro-preview-0409';

// Instantiate the models
const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    'maxOutputTokens': 8192,
    'temperature': 1,
    'topP': 0.95,
  },
  safetySettings: [
    {
        'category': 'HARM_CATEGORY_HATE_SPEECH',
        'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
        'category': 'HARM_CATEGORY_DANGEROUS_CONTENT',
        'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
        'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
        'category': 'HARM_CATEGORY_HARASSMENT',
        'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ],
});

async function generateContent() {
  const req = {
    contents: [
        {role: 'user', parts: [{text: `Hello`}]}
      ],
  };

  const streamingResp = await generativeModel.generateContentStream(req);

  for await (const item of streamingResp.stream) {
    process.stdout.write('stream chunk: ' + JSON.stringify(item) + '\n');
  }

  process.stdout.write('aggregated response: ' + JSON.stringify(await streamingResp.response));
}

generateContent();
