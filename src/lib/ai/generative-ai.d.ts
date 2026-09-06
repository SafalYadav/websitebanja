// Type declarations for @google/generative-ai (minimal) to satisfy TypeScript compiler
declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: {
      model: string;
      generationConfig?: {
        maxOutputTokens?: number;
        temperature?: number;
        [key: string]: any;
      };
    }): GenerativeModel;
  }

  export interface GenerativeModel {
    generateContent(request: { contents: Array<any> }): Promise<GenerateResult>;
  }

  export interface GenerateResult {
    response?: {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
  }
}
