
import { GoogleGenAI, Type } from "@google/genai";
import { RecyclingRecommendation } from "../types";

const cleanJsonResponse = (text: string): string => {
  // Membersihkan kemungkinan markdown atau teks tambahan dari model
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^JSON/i, "")
    .trim();
};

export const generateDIYImage = async (prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key") {
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      // Menggunakan model stabil untuk generate gambar
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A clean, professional close-up photo of a DIY recycled project: ${prompt}. High resolution, bright background.` }],
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
    console.warn("DIY Image gen error, using fallback:", error);
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/400`;
  }
};

export const analyzeImage = async (base64Image: string): Promise<RecyclingRecommendation> => {
  const apiKey = process.env.API_KEY;
  
  // Validasi awal API KEY
  if (!apiKey || apiKey === "your-gemini-api-key" || apiKey.trim() === "") {
    throw new Error("API Key belum disetel atau tidak valid di Vercel/Environment Variables.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Menggunakan gemini-3-flash-preview (Model terbaru dan paling stabil untuk visi)
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Identifikasi barang bekas dalam foto ini. Berikan 3 ide daur ulang kreatif. Berikan respon dalam format JSON murni. Pastikan field itemName, materialType, difficulty, estimatedPoints (angka), co2Impact (angka gram), dan diyIdeas (array 3 objek berisi title, description, timeEstimate, toolsNeeded (array), steps (array)). Gunakan Bahasa Indonesia." }
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
      throw new Error("Respon kosong dari AI.");
    }

    const cleanedText = cleanJsonResponse(rawText);
    const recommendation: RecyclingRecommendation = JSON.parse(cleanedText);
    
    // Membuat gambar DIY secara paralel tanpa menggagalkan proses utama jika salah satu gagal
    const ideasWithImages = await Promise.all(recommendation.diyIdeas.map(async (idea) => {
      try {
        const imageUrl = await generateDIYImage(idea.title);
        return { ...idea, imageUrl };
      } catch {
        return { ...idea, imageUrl: `https://picsum.photos/seed/${encodeURIComponent(idea.title)}/600/400` };
      }
    }));

    return { ...recommendation, diyIdeas: ideasWithImages };
  } catch (error: any) {
    console.error("ANALYSIS ERROR:", error);
    
    // Menampilkan pesan error yang lebih informatif di alert browser
    let friendlyMessage = "Gagal memproses gambar.";
    
    if (error.message?.includes("403")) {
      friendlyMessage = "Izin Ditolak (403): API Key tidak diizinkan untuk model ini atau wilayah Anda.";
    } else if (error.message?.includes("429")) {
      friendlyMessage = "Terlalu Banyak Permintaan (429): Mohon tunggu 1 menit sebelum mencoba lagi.";
    } else if (error.message?.includes("500")) {
      friendlyMessage = "Kesalahan Server AI (500): Server Google sedang sibuk.";
    } else if (error instanceof SyntaxError) {
      friendlyMessage = "Format Data AI Salah: Gagal memproses data JSON.";
    }

    throw new Error(`${friendlyMessage} (Pesan: ${error.message?.substring(0, 40)}...)`);
  }
};
