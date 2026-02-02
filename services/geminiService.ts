
import { GoogleGenAI, Type } from "@google/genai";
import { RecyclingRecommendation } from "../types";

// Helper function to clean potential markdown from JSON response
const cleanJsonResponse = (text: string): string => {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^JSON/i, "")
    .trim();
};

export const analyzeImage = async (base64Image: string): Promise<RecyclingRecommendation> => {
  // Ensure the API key is available as per guidelines.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY belum terpasang di environment variables.");
  }

  try {
    // Correct initialization: always use new GoogleGenAI({ apiKey: process.env.API_KEY }).
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Use gemini-3-flash-preview as the optimal model for basic text and JSON tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Identifikasi barang ini. Berikan 3 ide daur ulang kreatif. Balas dalam JSON murni Bahasa Indonesia. Struktur: { \"itemName\": string, \"materialType\": string, \"difficulty\": \"Mudah\"|\"Sedang\", \"estimatedPoints\": 20, \"co2Impact\": 500, \"diyIdeas\": [ { \"title\": string, \"description\": string, \"timeEstimate\": string, \"toolsNeeded\": string[], \"steps\": string[] } ] }" }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            materialType: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            estimatedPoints: { type: Type.NUMBER },
            co2Impact: { type: Type.NUMBER },
            diyIdeas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  timeEstimate: { type: Type.STRING },
                  toolsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["title", "description", "timeEstimate", "toolsNeeded", "steps"]
              }
            }
          },
          required: ["itemName", "materialType", "difficulty", "estimatedPoints", "co2Impact", "diyIdeas"]
        }
      }
    });

    // Extracting text output: always use the .text property (not a method).
    const rawText = response.text;
    if (!rawText) throw new Error("AI tidak merespon tepat waktu.");

    const cleanedText = cleanJsonResponse(rawText);
    const recommendation: RecyclingRecommendation = JSON.parse(cleanedText);
    
    // Enrich the result with placeholder images for a better user experience.
    const ideasWithImages = recommendation.diyIdeas.map((idea) => ({
      ...idea,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(idea.title)}/600/400`
    }));

    return { ...recommendation, diyIdeas: ideasWithImages };
  } catch (error: any) {
    console.error("ANALYSIS FAILED:", error);
    throw new Error(error.message || "Gagal menghubungkan ke server AI.");
  }
};
