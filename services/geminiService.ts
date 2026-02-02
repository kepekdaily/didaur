
import { GoogleGenAI, Type } from "@google/genai";
import { RecyclingRecommendation } from "../types";

const cleanJsonResponse = (text: string): string => {
  // Membersihkan kemungkinan markdown yang disisipkan oleh model
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^JSON/i, "")
    .trim();
};

export const generateDIYImage = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional close-up photo of a DIY project: ${prompt}. Clean background, eco-friendly aesthetic, bright lighting.` }],
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;
  } catch (error) {
    console.warn("Image Gen Error (using fallback):", error);
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;
  }
};

export const analyzeImage = async (base64Image: string): Promise<RecyclingRecommendation> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key") {
    throw new Error("API Key Gemini belum disetel. Sila hubungi pengembang.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Menggunakan gemini-flash-lite-latest untuk kecepatan dan kompatibilitas visi yang lebih baik
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Identifikasi barang bekas dalam foto ini. Berikan 3 ide daur ulang kreatif. Berikan respon dalam format JSON murni dengan struktur: { \"itemName\": string, \"materialType\": string, \"difficulty\": \"Mudah\"|\"Sedang\"|\"Sulit\", \"estimatedPoints\": number, \"co2Impact\": number (dalam gram), \"diyIdeas\": [ { \"title\": string, \"description\": string, \"timeEstimate\": string, \"toolsNeeded\": string[], \"steps\": string[] } ] }. Gunakan Bahasa Indonesia." }
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
    if (!rawText) {
      throw new Error("AI tidak memberikan respon teks.");
    }

    const cleanedText = cleanJsonResponse(rawText);
    const recommendation: RecyclingRecommendation = JSON.parse(cleanedText);
    
    // Generate gambar untuk setiap ide DIY secara paralel
    const ideasWithImages = await Promise.all(recommendation.diyIdeas.map(async (idea) => {
      const img = await generateDIYImage(idea.title);
      return { ...idea, imageUrl: img };
    }));

    return { ...recommendation, diyIdeas: ideasWithImages };
  } catch (error: any) {
    console.error("DEBUG: Gemini API Error Details:", error);
    
    // Pesan error ramah pengguna berdasarkan jenis kegagalan
    if (error.message?.includes("403")) {
      throw new Error("Akses ditolak (403). Periksa apakah API Key Anda aktif.");
    } else if (error.message?.includes("429")) {
      throw new Error("Kuota API habis. Silakan coba lagi beberapa saat lagi.");
    } else if (error instanceof SyntaxError) {
      throw new Error("Format data AI tidak valid. Coba ambil foto lagi.");
    }
    
    throw new Error(error.message || "Gagal memproses gambar. Pastikan internet stabil.");
  }
};
