import { GoogleGenAI } from "@google/genai";
import { AppSettings, ColorDefinition, GenerationSettings } from "../types";

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 8,
  baseDelay: number = 4000
): Promise<T> {
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      
      const errorStr = error.toString() || error.message || "";
      const isRateLimit = errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED");
      const isTransient = isRateLimit || 
                         errorStr.includes("500") || 
                         errorStr.includes("503") ||
                         errorStr.includes("Rpc failed") || 
                         errorStr.includes("xhr error");

      if (attempt <= retries && isTransient) {
        const backoffFactor = isRateLimit ? 2.5 : 2.0;
        const backoffDelay = baseDelay * Math.pow(backoffFactor, attempt - 1);
        const jitter = backoffDelay * 0.25 * (Math.random() * 2 - 1);
        const finalDelay = Math.max(2000, backoffDelay + jitter);
        
        console.warn(`[Gemini Service] ${isRateLimit ? 'QUOTA EXHAUSTED' : 'Transient error'}. Attempt ${attempt}/${retries}. Retrying in ${Math.round(finalDelay / 1000)}s...`);
        
        await new Promise(resolve => setTimeout(resolve, finalDelay));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error("Maximum retry attempts exceeded for API quota.");
}

export const recolorImageWithGemini = async (
  base64Image: string,
  settings: AppSettings,
  targetColor: ColorDefinition
): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';

    const modelName = settings.modelTier === 'pro' 
      ? 'gemini-3-pro-image-preview' 
      : 'gemini-2.5-flash-image';

    const modeLabel = settings.modelTier === 'pro' ? 'PRO MODE' : 'FLASH MODE';

    const consistencyInstructions = settings.batchConsistency 
      ? `
      GLOBAL DYE-LOT CONSISTENCY PROTOCOL:
      - This image is part of a high-precision collection batch.
      - TARGET: The hex code ${targetColor.hex} is the MASTER PHYSICAL TEXTILE REFERENCE.
      - MANDATE: Ensure the final garment color matches this master reference identically across every image in the batch.
      - OVERRIDE: Ignore local image white balance shifts. Calibrate the output so all garments in this color look like they came from the same production run (dye lot).
      - Maintain consistent chroma and lightness (L*a*b*) values relative to the master hex.
      ` : "";

    const prompt = `
      ACT AS A PROFESSIONAL FASHION IMAGE RECOLORING ENGINE (${modeLabel}).
      
      TASK:
      Change the color of the ${settings.category} in the provided image.
      
      USER INPUTS:
      • Product Category: ${settings.category}
      • Target Color: ${targetColor.name} (Hex: ${targetColor.hex})
      • Fabric: ${settings.fabricType}
      ${consistencyInstructions}

      STRICT RULES:
      1. Modify ONLY the ${settings.category}. No background or model skin changes.
      2. Preserve original texture details, stitching, and folds.
      3. ${settings.printProtection ? 'PROTECT printed graphics, embroidery, logos.' : 'Recolor everything on the garment.'}
      4. ${settings.colorAccuracy ? 'Ensure absolute e-commerce color calibration.' : ''}

      ${settings.modelTier === 'pro' ? 'PRO DIRECTIVE: Use high-order spectral reasoning to separate lighting highlights from surface pigment.' : 'FLASH DIRECTIVE: Focus on clean edge masks and rapid texture mapping.'}
    `;

    const response = await ai.models.generateContent({
      model: modelName,
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
      throw new Error(`No image data returned from ${modelName}.`);
    }

    return generatedImageBase64;
  });
};

export const generateImageWithGemini = async (
  settings: GenerationSettings
): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: settings.prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: settings.aspectRatio,
          imageSize: settings.imageSize
        }
      }
    });

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
      throw new Error("No image data returned from Gemini 3 Pro.");
    }

    return generatedImageBase64;
  });
};