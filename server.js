import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import 'dotenv/config';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize clients (replace with your actual credentials)
const supabaseUrl = process.env.supabaseUrl;
const supabaseKey = process.env.supabaseKey;
const genAiApiKey = process.env.genAiApiKey;

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(genAiApiKey);

// Function to read a local file and split it into chunks
async function splitDocument(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf-8");
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 250,
      chunkOverlap: 35,
    });
    const output = await splitter.createDocuments([text]);
    return output;
  } catch (error) {
    console.error("Error reading or splitting document:", error);
    return [];
  }
}

// Create an embedding vector representing the query
async function createEmbedding(input) {
  const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const embeddingResponse = await embeddingModel.embedContent(input);
  return embeddingResponse.embedding.values;
}

// Query Supabase and return a semantically matching text chunk
async function findNearestMatch(embedding) {
  const { data } = await supabase.rpc('match_albums', {
    query_embedding: embedding,
    match_threshold: 0.05,
    match_count: 4
  });

  // Manage multiple returned matches
  const match = data.map(obj => obj.content).join('\n');
  return match;
}

// Use Gemini to make the response conversational with markdown formatting
const systemPrompt = `You are an enthusiastic album expert who loves recommending albums to people. You will be given context about albums from a database and a user question. Your main job is to formulate a helpful answer using ONLY the provided context.

FORMAT YOUR RESPONSE USING MARKDOWN:
- Use **bold** for album titles and artist names
- Use *italic* for emphasis and explanations
- Use proper line breaks and paragraphs
- Structure your response clearly and readably

CRITICAL RULES FOR ARTIST RECOMMENDATIONS:
- If a user mentions liking a specific artist (e.g., "I like Kendrick Lamar"), you MUST recommend albums by DIFFERENT artists who have similar musical styles
- NEVER recommend albums by the same artist the user mentioned
- Focus on finding artists with similar genres, themes, or production styles
- If the context contains albums by the mentioned artist, IGNORE them and recommend others

EXAMPLES:
❌ WRONG: "If you like Kendrick Lamar, you should listen to To Pimp a Butterfly and DAMN. by Kendrick Lamar"
✅ RIGHT: "If you like **Kendrick Lamar**, you should listen to **2014 Forest Hills Drive** by **J. Cole** or **Illmatic** by **Nas** - they have similar *conscious hip hop styles*"

❌ WRONG: "Since you like Radiohead, check out Kid A and OK Computer by Radiohead"
✅ RIGHT: "Since you like **Radiohead**, check out **Disintegration** by **The Cure** - they share similar *experimental and atmospheric qualities*"

RECOMMENDATION STRATEGY:
1. Identify the genre/style from the user's mentioned artist
2. Look for other artists in the context with similar styles
3. Recommend 3-4 albums by different artists
4. Explain why these artists/styles are similar
5. Keep recommendations enthusiastic and conversational

If you cannot find suitable recommendations in the context, say "Based on the available albums, I don't have great recommendations that match that style, but here are some other great albums you might enjoy..." and recommend ALBUMS from different genres.

Always be helpful, enthusiastic, and focus on music discovery!`;

async function getChatCompletion(text, query) {
  const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `${systemPrompt}\n\nContext: ${text}\nQuestion: ${query}`;

  const response = await chatModel.generateContent({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
    }
  });

  return response.response.text();
}

// Main function
async function main(input) {
  console.log("🎵 Processing query:", input);

  try {
    const embedding = await createEmbedding(input);
    console.log("✅ Embedding created");

    const match = await findNearestMatch(embedding);
    console.log("✅ Found nearest matches");

    const result = await getChatCompletion(match, input);
    console.log("✅ Generated response");

    return result;
  } catch (error) {
    console.error("❌ Error in main function:", error);
    throw error;
  }
}

// API Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/recommend', async (req, res) => {
  try {
    const { mood, artist, album, additional } = req.body;

    // Generate query from form data
    let query = '';

    if (mood) {
      query += `I'm feeling ${mood}. `;
    }

    if (artist) {
      query += `I like ${artist}. `;
    }

    if (album) {
      query += `I enjoyed ${album}. `;
    }

    if (additional) {
      query += additional;
    }

    // If no specific preferences, create a general query
    if (!query.trim()) {
      query = 'Suggest some great albums for me to discover';
    }

    console.log('🎵 Processing recommendation request...');

    // Process the query using your existing system
    const result = await main(query);

    res.json({
      success: true,
      query: query,
      recommendation: result
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations. Please try again.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AlbumAtlas Y2K Server running on http://localhost:${PORT}`);
  console.log(`🎵 Ready to discover amazing albums!`);
});
