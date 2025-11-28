import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, UrlItem } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

/**
 * Uses Gemini to analyze a list of URLs for SEO quality and structure
 * before submitting them to the Indexing API.
 */
export const analyzeUrls = async (urls: string[]): Promise<AnalysisResponse> => {
  if (!GEMINI_API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `
    You are a Senior Technical SEO Specialist. 
    Analyze the following list of URLs that a user wants to submit to the Google Search Console Indexing API.
    
    For each URL, determine:
    1. Is the structure valid?
    2. Does it look like a high-quality, indexable page based on the path (e.g., avoids query params, clearly named)?
    3. Assign a quality score (0-100).
    4. Provide a brief reasoning.

    URLs to analyze:
    ${JSON.stringify(urls)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  url: { type: Type.STRING },
                  qualityLabel: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
                  qualityScore: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING },
                },
                required: ["url", "qualityLabel", "qualityScore", "reasoning"],
              },
            },
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResponse;
    }
    throw new Error("No response from Gemini.");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * Simulates a check to see if the content matches recent trends (using Grounding if available)
 * This is a placeholder for a more advanced feature using gemini-3-pro-preview with googleSearch.
 */
export const checkTrendAlignment = async (topic: string) => {
    // Implementation for future expansion
};
