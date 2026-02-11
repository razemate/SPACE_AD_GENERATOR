
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }

  async generateAdBackground(prompt: string, aspectRatio: string = '16:9'): Promise<string> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{
            text: `High-end professional advertising background: ${prompt}. Cinematic lighting, luxury brand aesthetic. NO TEXT, NO CHARACTERS.`
          }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image data returned");
    } catch (error) {
      console.error("Image generation failed:", error);
      throw error;
    }
  }

  async editImage(base64Image: string, editPrompt: string): Promise<string> {
    const ai = this.getAI();
    const mimeType = base64Image.split(';')[0].split(':')[1];
    const data = base64Image.split(',')[1];
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: `Modify this image based on the following request: ${editPrompt}. Maintain the same layout and aspect ratio.` }
        ]
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : base64Image;
  }

  async analyzeImage(base64Image: string): Promise<{ headline: string; subheadline: string }> {
    const ai = this.getAI();
    const mimeType = base64Image.split(';')[0].split(':')[1];
    const data = base64Image.split(',')[1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: "Analyze this image and suggest a compelling marketing headline and subheadline for an ad campaign. Return only a JSON object with 'headline' and 'subheadline' keys." }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch {
      return { headline: "Stunning Visual", subheadline: "Explore the possibilities today." };
    }
  }

  async refinePrompt(headline: string, subheadline: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short AI image prompt for a background that matches this ad copy: Headline: "${headline}", Sub: "${subheadline}". Return ONLY the prompt text. No people, no text.`
    });
    return response.text || headline;
  }
}

export const gemini = new GeminiService();
