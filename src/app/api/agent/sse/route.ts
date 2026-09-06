// src/app/api/agent/sse/route.ts

import { NextResponse } from 'next/server';
import { AgentProviderFactory } from '@/lib/ai/agentProviderFactory';
import type { ModelProvider, ModelResponse } from '@/lib/ai/provider';
import { getProjectKnowledge, setProjectKnowledge } from '@/lib/knowledge';
import { z } from 'zod';
import { checkMemoryRateLimit } from '@/lib/rateLimit';
import type { ExtractedUserNeeds } from '@/types/aiAgent';

import { normalizeAgentResponse } from '@/lib/ai/agentNormalizer';

// Custom error to indicate that the LLM provider returned an empty response.
// Used to differentiate validation errors from provider failures.
class ModelResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelResponseError';
  }
}

/**
 * Request payload for the SSE endpoint.
 */
const RequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  projectId: z.string().optional(),
  // Optional existing extracted needs – persisted per project.
  currentNeeds: z.object({}).passthrough().optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() })).optional(),
});

/**
 * Authoritative system prompt for the conversational agent.
 */
const systemPrompt = `You are Mitra, a warm, energetic, friendly AI Website Architect & Design Partner at WebsiteBanja.
You speak like an enthusiastic, supportive creative designer chatting naturally with a friend.

CRITICAL RULES:
1. ALWAYS return valid JSON matching the schema below. NEVER wrap in markdown code blocks or fences.
2. "reply": Clean conversational text for the user. 2-3 friendly sentences. NEVER put JSON or code fences in reply. Ask ONE relevant next question.
3. "speechText": 1 punchy, concise, friendly spoken sentence (under 15 words) for instant low-latency voice synthesis. NO markdown, NO bullet points, NO emoji names, NO JSON, NO lists.
4. "suggestedReplies": 3 to 4 quick-tap suggested options for the user.
5. "extractedNeeds": Extract canonical facts from conversation:
   {
     "businessName": string,
     "category": string,
     "description": string,
     "targetAudience": string,
     "services": string[],
     "features": string[],
     "style": string,
     "primaryColor": string,
     "secondaryColor": string,
     "phone": string,
     "email": string,
     "whatsappNumber": string,
     "location": string
   }
6. Never auto-generate. Only set "triggerImmediateBuild": true if the user explicitly instructs to build/generate the website now.

JSON Schema:
{
  "reply": string,
  "speechText": string,
  "suggestedReplies": string[],
  "extractedNeeds": object,
  "readinessScore": number,
  "isReadyToBuild": boolean,
  "triggerImmediateBuild": boolean,
  "nextMissingAspect"?: string
}`;

/**
 * Helper to stream Server‑Sent Events over a POST request.
 * The response is a ReadableStream that yields properly formatted SSE chunks.
 */
function createSseStream(
  asyncGenerator: AsyncGenerator<any, void, unknown>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      for await (const event of asyncGenerator) {
        const chunk = `event: ${event.type}\n` + `data: ${JSON.stringify(event.data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(chunk));
        // If the client aborted, abort the generator.
        if (controller.desiredSize === null) break;
      }
      controller.close();
    },
  });
}

/**
 * Main SSE handler – one turn of the Agent.
 * It validates the payload, builds the message list, invokes the selected LLM
 * provider, normalises the response and streams the result back to the client.
 */
export async function POST(req: Request) {
  // Rate‑limit per IP – keep existing behaviour from the talk route.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { success: allowed } = checkMemoryRateLimit(`agent_sse_${ip}`, 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ success: false, message: 'Too many messages. Please wait.' }, { status: 429 });
  }

  // Parse and validate request body.
  let payload: { message: string; projectId?: string; currentNeeds?: ExtractedUserNeeds; history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> };
  try {
    const raw = await req.json();
    payload = RequestSchema.parse(raw);
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Invalid request payload.' }, { status: 400 });
  }

  // Build conversation for the model – system prompt + prior needs + history + user message.
  const priorHistory = (payload.history || []).slice(-8).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...(payload.currentNeeds
      ? [{ role: 'system' as const, content: `Prior accumulated extracted needs: ${JSON.stringify(payload.currentNeeds)}` }]
      : []),
    ...priorHistory,
    { role: 'user' as const, content: payload.message },
  ];

  // Async generator that yields SSE events.
  async function* eventGenerator() {
    // start event – useful for UI to show loading indicator.
    yield { type: 'start', data: { status: 'processing' } };

    try {
      // Use Agent-specific provider with fallback
      const primaryProvider = AgentProviderFactory.createPrimary();
      const fallbackProvider = AgentProviderFactory.createFallback();
      let provider: ModelProvider = primaryProvider;

      // Helper to process a successful response
      async function* handleResponse(response: ModelResponse) {
        // Normalise response – ensure we always have text or a tool call.
        if (!response.text && !response.toolCall) {
          throw new ModelResponseError('Provider returned empty response');
        }

        // If the model emitted a tool call, handle it via the whitelist.
        if (response.toolCall) {
          const { name, arguments: args } = response.toolCall;
          if (['getGlobalKnowledge', 'getProjectKnowledge', 'setProjectKnowledge', 'checkRequirements'].includes(name)) {
            let toolResult: any = null;
            switch (name) {
              case 'getGlobalKnowledge':
                toolResult = {};
                break;
              case 'getProjectKnowledge':
                toolResult = await getProjectKnowledge(
                  args.projectId,
                  args.category,
                  args.key
                );
                break;
              case 'setProjectKnowledge':
                await setProjectKnowledge(args.projectId, args.key, args.value);
                toolResult = { ok: true };
                break;
              case 'checkRequirements':
                toolResult = args;
                break;
            }
            yield { type: 'tool', data: { name, result: toolResult } };
            return;
          } else {
            console.warn('[Agent SSE] Unsupported tool call', name);
            yield { type: 'error', data: { message: `Tool ${name} is not allowed.` } };
            return;
          }
        }

        // Parse and normalize the structured output server-side
        const normalized = normalizeAgentResponse(
          response.text ?? '',
          payload.currentNeeds as ExtractedUserNeeds,
          payload.message
        );

        // If projectId is provided, persist canonical facts to Project Knowledge
        if (payload.projectId) {
          try {
            await setProjectKnowledge(
              payload.projectId,
              'extracted_needs',
              normalized.extractedNeeds,
              'system',
              'business_info'
            );
          } catch (pkErr) {
            console.warn('[Agent SSE] Project Knowledge write error:', pkErr);
          }
        }

        yield { type: 'message', data: normalized };
      }

      try {
        // Try primary provider first (OpenAI) with native JSON mode
        const response = await provider.generate(messages, {
          signal: (req as any).signal,
          jsonMode: true,
        });
        yield* handleResponse(response);
      } catch (primaryErr) {
        console.warn('[Agent SSE] Primary provider failed, falling back to fallback provider:', primaryErr);
        // Switch to fallback provider (Gemini) with native JSON mode
        provider = fallbackProvider;
        try {
          const response = await provider.generate(messages, {
            signal: (req as any).signal,
            jsonMode: true,
          });
          yield* handleResponse(response);
        } catch (fallbackErr) {
          console.error('[Agent SSE] Fallback provider error', fallbackErr);
          throw fallbackErr;
        }
      }

    } catch (err) {
      // Distinguish validation errors from provider failures.
      if (err instanceof ModelResponseError) {
        console.warn('[Agent SSE] Validation error', err.message);
        // Emit a safe error event without attempting fallback.
        yield { type: 'error', data: { message: err.message } };
        return;
      }
      // Collect safe diagnostic information without leaking secrets.
      const modelName = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
      const errorInfo: Record<string, unknown> = {
        name: (err as any)?.name,
        message: (err as any)?.message,
        // HTTP status if the SDK provides it (e.g., ApiError)
        httpStatus: (err as any)?.status,
        // Additional API response metadata if available
        apiStatus: (err as any)?.response?.status,
        // Additional details that may contain underlying Gemini error info (safe to log)
        details: (err as any)?.details,
        causeMessage: (err as any)?.cause?.message,
        model: modelName,
      };
      console.error('[Agent SSE] Provider error', errorInfo, err);
      yield { type: 'error', data: { message: (err as any)?.message ?? 'Failed to generate response.' } };
    }
  }

  const stream = createSseStream(eventGenerator());
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      // Prevent caching of streaming responses.
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
