import { GoogleGenAI } from "@google/genai";
import { AppSettings, ColorDefinition } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const recolorImageWithGemini = async (
  base64Image: string,
  settings: AppSettings,
  targetColor: ColorDefinition
): Promise<string> => {

  // Strip prefix if present (e.g., "data:image/png;base64,")
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';

  const prompt = `
    ACT AS A PROFESSIONAL FASHION IMAGE RECOLORING ENGINE.
    
    TASK:
    Accurately change the color of the garment in the provided image.
    
    USER INPUTS:
    • Product Category: ${settings.category}
    • Target Garment Color: ${targetColor.name} (Hex: ${targetColor.hex})
    • Fabric Type: ${settings.fabricType}
    
    STRICT RULES:
    1. Modify ONLY the ${settings.category} region.
    2. Do NOT alter background, model skin, hair, accessories.
    3. Preserve original fabric texture, stitching, seams, folds, and lighting.
    4. ${settings.printProtection ? 'PROTECT printed graphics, embroidery, logos.' : 'Recolor everything on the garment.'}
    5. ${settings.colorAccuracy ? 'Ensure realistic textile dye accuracy (avoid over-saturation).' : 'Match color exactly.'}
    6. ${settings.edgePrecision ? 'Use pixel-perfect masking.' : 'Standard edges.'}

    NEGATIVE PROMPT (AVOID):
    • Flat color overlay
    • Texture loss
    • Color spill on skin/background
    • Artificial smoothing
    • Color halos
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using Flash Image for editing capabilities
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    // Extract the generated image
    let generatedImageBase64 = '';
    
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImageBase64) {
      throw new Error("No image data returned from Gemini.");
    }

    return generatedImageBase64;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};