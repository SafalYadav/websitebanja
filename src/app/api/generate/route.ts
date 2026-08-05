import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { buildWebsitePrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = buildWebsitePrompt(body);

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You are WebsiteBanja AI. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const result = JSON.parse(
      response.choices[0].message.content ?? "{}"
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate website.",
      },
      {
        status: 500,
      }
    );
  }
}