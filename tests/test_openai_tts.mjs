import fs from "fs";
import OpenAI from "openai";

const envFile = fs.readFileSync(".env.local", "utf-8");
const match = envFile.match(/OPENAI_API_KEY=(.+)/);
const apiKey = match[1].trim().replace(/^["']|["']$/g, "");

const openai = new OpenAI({ apiKey });

console.log("Testing OpenAI TTS...");
const text = "That sounds great! A dental clinic website can really help connect with patients. What specific services or features would you like to include on the site?";

try {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text,
    response_format: "pcm", // 24kHz 16-bit mono PCM!
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  console.log(`✔ OpenAI TTS SUCCESS: got ${buffer.length} bytes of raw 24kHz PCM!`);
} catch (err) {
  console.error("✖ OpenAI TTS failed:", err.message);
}
