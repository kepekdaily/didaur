
import { GoogleGenAI, Type } from "@google/genai";
import { RecyclingRecommendation } from "../types";

const cleanJsonResponse = (text: string): string => {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^JSON/i, "")
    .trim();
};

// Fungsi pembantu untuk jeda waktu (delay)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi utama: Menganalisis gambar dengan logika Retry Otomatis
export const analyzeImage = async (base64Image: string, retries = 3): Promise<RecyclingRecommendation> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY belum terpasang.");

  const ai = new GoogleGenAI({ apiKey });

  for (let i = 0; i < retries; i++) {
    try {
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
      const isOverloaded = error.message?.includes("503") || error.message?.includes("overloaded");
      
      // Jika server sibuk dan masih ada jatah retry, tunggu sebentar lalu coba lagi
      if (isOverloaded && i < retries - 1) {
        console.log(`AI Overloaded. Mencoba lagi (${i + 1}/${retries})...`);
        await sleep(2000 * (i + 1)); // Eksponensial backoff
        continue;
      }
      
      console.error("ANALYSIS FAILED:", error);
      if (isOverloaded) throw new Error("Server AI sedang sangat sibuk. Silakan coba klik 'Analisis' lagi dalam beberapa detik.");
      throw new Error(error.message || "Koneksi AI terputus.");
    }
  }
  throw new Error("Gagal terhubung ke AI setelah beberapa kali mencoba.");
};

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

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return `https://picsum.photos/seed/${encodeURIComponent(ideaTitle)}/600/400`;
  } catch (err) {
    return `https://picsum.photos/seed/${encodeURIComponent(ideaTitle)}/600/400`;
  }
};
