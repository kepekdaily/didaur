
import { GoogleGenAI, Type } from "@google/genai";
import { RecyclingRecommendation } from "../types";

const cleanJsonResponse = (text: string): string => {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^JSON/i, "")
    .trim();
};

// Fungsi utama: Menganalisis gambar dan memberikan ide teks (Sangat Cepat)
export const analyzeImage = async (base64Image: string): Promise<RecyclingRecommendation> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY belum terpasang.");

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Gunakan gemini-3-flash-preview untuk kecepatan JSON maksimal
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Identifikasi barang ini. Berikan 3 ide daur ulang kreatif. Balas dalam JSON murni Bahasa Indonesia. Struktur: { \"itemName\": string, \"materialType\": string, \"difficulty\": \"Mudah\"|\"Sedang\", \"estimatedPoints\": number, \"co2Impact\": number, \"diyIdeas\": [ { \"title\": string, \"description\": string, \"timeEstimate\": string, \"toolsNeeded\": string[], \"steps\": string[] } ] }" }
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
    return JSON.parse(cleanedText);
  } catch (error: any) {
    console.error("ANALYSIS FAILED:", error);
    throw new Error(error.message || "Koneksi AI terputus.");
  }
};

// Fungsi pendukung: Membuat visual nyata untuk setiap ide DIY secara terpisah
export const generateDIYImage = async (ideaTitle: string, originalItem: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return `https://picsum.photos/seed/${encodeURIComponent(ideaTitle)}/600/400`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: `A beautiful and realistic photo of a finished DIY recycling project: ${ideaTitle}, made from ${originalItem}. High quality, clean background, 4k resolution.` },
        ],
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    // Cari part gambar dalam response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    // Fallback jika gagal generate gambar spesifik
    return `https://picsum.photos/seed/${encodeURIComponent(ideaTitle)}/600/400`;
  } catch (err) {
    console.error("Image gen failed:", err);
    return `https://picsum.photos/seed/${encodeURIComponent(ideaTitle)}/600/400`;
  }
};
