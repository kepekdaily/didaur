
import { GoogleGenAI, Type } from "@google/genai";
import { RecyclingRecommendation } from "../types";

const cleanJsonResponse = (text: string): string => {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^JSON/i, "")
    .trim();
};

export const analyzeImage = async (base64Image: string): Promise<RecyclingRecommendation> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "your-gemini-api-key" || apiKey.trim() === "") {
    throw new Error("API_KEY belum terpasang di Vercel. Harap cek Environment Variables.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Gunakan gemini-3-flash-preview untuk kecepatan maksimal
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Identifikasi barang bekas ini dan berikan 3 ide daur ulang. Berikan respon dalam JSON murni Bahasa Indonesia. Struktur: { \"itemName\": string, \"materialType\": string, \"difficulty\": \"Mudah\"|\"Sedang\"|\"Sulit\", \"estimatedPoints\": number, \"co2Impact\": number, \"diyIdeas\": [ { \"title\": string, \"description\": string, \"timeEstimate\": string, \"toolsNeeded\": string[], \"steps\": string[] } ] }" }
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

    const rawText = response.text;
    if (!rawText) throw new Error("Gagal menerima data dari AI.");

    const cleanedText = cleanJsonResponse(rawText);
    const recommendation: RecyclingRecommendation = JSON.parse(cleanedText);
    
    // OPTIMASI: Gunakan placeholder gambar agar hasil muncul INSTAN.
    // Menghapus generateDIYImage di sini karena membuat proses sangat lambat (30 detik+).
    const ideasWithImages = recommendation.diyIdeas.map((idea) => ({
      ...idea,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(idea.title)}/600/400`
    }));

    return { ...recommendation, diyIdeas: ideasWithImages };
  } catch (error: any) {
    console.error("ANALYSIS FAILED:", error);
    throw new Error(`Koneksi AI terputus atau API Key bermasalah. (${error.message?.substring(0, 50)})`);
  }
};

// Fungsi ini tetap ada untuk kebutuhan mendatang, tapi tidak dipanggil di alur utama agar cepat.
export const generateDIYImage = async (prompt: string): Promise<string> => {
  return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;
};
