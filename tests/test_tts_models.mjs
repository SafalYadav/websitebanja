import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const envFile = fs.readFileSync(".env.local", "utf-8");
const match = envFile.match(/GEMINI_API_KEY=(.+)/);
const apiKey = match[1].trim().replace(/^["']|["']$/g, "");

const ai = new GoogleGenAI({ apiKey, vertexai: false });

console.log("Testing models for TTS...");
const text = "That sounds great! A dental clinic website can really help connect with patients.";

const modelsToTest = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.5-flash-preview-tts",
  "gemini-3.1-flash-tts-preview"
];

for (const model of modelsToTest) {
  try {
    console.log(`\nTesting model: ${model}`);
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" },
          },
        },
      },
    });
    const audioPart = response.candidates?.[0]?.content?.parts?.find((p) => Boolean(p.inlineData?.data));
    if (audioPart?.inlineData?.data) {
      console.log(`✔ SUCCESS with ${model}: got ${audioPart.inlineData.data.length} base64 chars`);
      break;
    } else {
      console.log(`✖ ${model} returned no audio part`);
    }
  } catch (err) {
    console.log(`✖ ${model} failed: ${err.message}`);
    if (err.status) console.log(`   status: ${err.status}`);
  }
}
