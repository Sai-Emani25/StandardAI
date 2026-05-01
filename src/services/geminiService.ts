import { GoogleGenAI, Type } from "@google/genai";
import { BUILDING_MATERIAL_STANDARDS } from "../constants";
import { Recommendation } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

export async function recommendBISStandards(query: string): Promise<Recommendation[]> {
  try {
    const prompt = `
      You are a BIS (Bureau of Indian Standards) expert specialized in Building Materials.
      Based on the following knowledge base of standards:
      ${JSON.stringify(BUILDING_MATERIAL_STANDARDS, null, 2)}

      Recommend the top 3 relevant standards for this product or query: "${query}"
      For each recommendation, provide a detailed and technically accurate rationale explaining WHY this standard applies.
      
      Return ONLY a JSON list of objects.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: {
                type: Type.STRING,
                description: "The IS code (e.g., IS 456:2000)",
              },
              rationale: {
                type: Type.STRING,
                description: "The technical reasoning for this recommendation.",
              },
              relevanceScore: {
                type: Type.NUMBER,
                description: "Confidence score between 0 and 1",
              }
            },
            required: ["id", "rationale"]
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from Gemini API");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini BIS Recommendation Error:", error);
    throw error;
  }
}
