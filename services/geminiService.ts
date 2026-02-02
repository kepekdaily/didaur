
import { GoogleGenAI, Type } from "@google/genai";
import { RecyclingRecommendation } from "../types";

const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

export const generateDIYImage = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A vibrant, high-quality close-up of a DIY project: ${prompt}. Professional craft photography, eco-friendly style, bright lighting.` }],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;
  } catch (error) {
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;
  }
};

export const analyzeImage = async (base64Image: string): Promise<RecyclingRecommendation> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key tidak ditemukan.");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Analisis barang ini. Berikan 3 ide daur ulang kreatif. Penting: Gunakan estimasi CO2 yang realistis (misal: botol plastik 50-100g, kardus kecil 20-50g). Berikan nama barang, material, tingkat kesulitan (Mudah/Sedang/Sulit), poin XP (range 10-30), dampak CO2 (gram), dan ide DIY detail dengan minimal 5 langkah teks. Kembalikan dalam format JSON murni." }
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

    const cleanedText = cleanJsonResponse(response.text || "");
    const recommendation: RecyclingRecommendation = JSON.parse(cleanedText);
    
    const ideasWithImages = await Promise.all(recommendation.diyIdeas.map(async (idea) => {
      const img = await generateDIYImage(idea.title);
      return { ...idea, imageUrl: img };
    }));

    return { ...recommendation, diyIdeas: ideasWithImages };
  } catch (error: any) {
    console.error("AI Error:", error);
    throw new Error("Gagal memproses gambar.");
  }
};
