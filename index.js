import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";


// Initialize Supabase and Google GenAI clients
// Replace with your actual credentials

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(genAiApiKey);

// Query about our music data
const query = "Which albums should I listen to if i like Magdalena Bay?";
main(query);

async function main(input) {
  const embedding = await createEmbedding(input);
  const match = await findNearestMatch(embedding);
  await getChatCompletion(match, input);
}

// Create an embedding vector representing the query
async function createEmbedding(input) {
  console.log("Creating embedding, this may take some time...");
  const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const embeddingResponse = await embeddingModel.embedContent(input);
  return embeddingResponse.embedding.values;
}

// Query Supabase and return a semantically matching text chunk
async function findNearestMatch(embedding) {
  console.log("Finding nearest match...");
  const { data } = await supabase.rpc('match_albums', {
    query_embedding: embedding,
    match_threshold: 0.50,
    match_count: 4
  });
  
  // Manage multiple returned matches
  const match = data.map(obj => obj.content).join('\n');
  // Removed console.log(match) to only show the final response
  return match;
}

// Use Gemini to make the response conversational
const systemPrompt = `You are an enthusiastic album expert who loves recommending albums to people. You will be given context about albums from a database and a user question. Your main job is to formulate a helpful answer using ONLY the provided context.

CRITICAL RULES FOR ARTIST RECOMMENDATIONS:
- If a user mentions liking a specific artist (e.g., "I like Kendrick Lamar"), you MUST recommend albums by DIFFERENT artists who have similar musical styles
- NEVER recommend albums by the same artist the user mentioned
- Focus on finding artists with similar genres, themes, or production styles
- If the context contains albums by the mentioned artist, IGNORE them and recommend others

EXAMPLES:
❌ WRONG: "If you like Kendrick Lamar, you should listen to To Pimp a Butterfly and DAMN. by Kendrick Lamar"
✅ RIGHT: "If you like Kendrick Lamar, you should listen to 2014 Forest Hills Drive by J. Cole or Illmatic by Nas - they have similar conscious hip hop styles"

❌ WRONG: "Since you like Radiohead, check out Kid A and OK Computer by Radiohead"
✅ RIGHT: "Since you like Radiohead, check out In a Silent Way by Miles Davis or Disintegration by The Cure - they share similar experimental and atmospheric qualities"

RECOMMENDATION STRATEGY:
1. Identify the genre/style from the user's mentioned artist
2. Look for other artists in the context with similar styles
3. Recommend 3-4 albums by different artists
4. Explain why these artists/styles are similar
5. Keep recommendations enthusiastic and conversational

If you cannot find suitable recommendations in the context, say "Based on the available albums, I don't have great recommendations that match that style, but here are some other great albums you might enjoy..." and recommend from different genres.

Always be helpful, enthusiastic, and focus on music discovery!`;

async function getChatCompletion(text, query) {
  console.log("Getting chat completion...");
  const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `${systemPrompt}\n\nContext: ${text}\nQuestion: ${query}`;

  const response = await chatModel.generateContent({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      frequencyPenalty: 0.5
    }
  });

  console.log(response.response.text());
}