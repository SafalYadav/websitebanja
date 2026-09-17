// src/app/api/agent/sse/route.ts

import { NextResponse } from 'next/server';
import { ModelRouter } from '@/lib/ai/router/modelRouter';
import { MODEL_CONFIG, sanitizeErrorOutput } from '@/lib/ai/router/modelConfig';
import { recordAgentRun } from '@/lib/agents/telemetry';
import { getProjectKnowledge, setProjectKnowledge } from '@/lib/knowledge';
import { z } from 'zod';
import { checkMemoryRateLimit } from '@/lib/rateLimit';
import type { ExtractedUserNeeds } from '@/types/aiAgent';
import { normalizeAgentResponse } from '@/lib/ai/agentNormalizer';
import { getClientIp, authenticateRequest } from '@/lib/supabaseServer';
import { dbCheckProjectExists } from '@/lib/db/queries';

// Custom error to indicate that the LLM provider returned an empty response.
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
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  projectId: z.string().trim().max(100).optional(),
  // Optional existing extracted needs – persisted per project.
  currentNeeds: z.object({}).passthrough().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(2000, 'History item cannot exceed 2000 characters'),
      })
    )
    .max(12, 'History cannot exceed 12 items')
    .optional(),
});

/**
 * Authoritative system prompt for the conversational agent.
 */
const systemPrompt = `You are Mitra, a warm, energetic, friendly AI Website Architect & Design Partner at WebsiteBanja.
You speak like an enthusiastic, supportive creative designer chatting naturally with a friend.

CRITICAL RULES:
1. ALWAYS return valid JSON matching the schema below. NEVER wrap in markdown code blocks or fences.
2. "reply": Clean conversational text for the user. 2-3 friendly sentences. NEVER put JSON or code fences in reply. Ask ONE relevant next question.
3. "speechText": MUST be identical to "reply". Every word displayed in the chat is spoken aloud.
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
  // Rate‑limit per IP using spoof-resistant client IP extraction
  const ip = getClientIp(req);
  const { success: allowed } = checkMemoryRateLimit(`agent_sse_${ip}`, 60, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ success: false, message: 'Too many messages. Please wait.' }, { status: 429 });
  }

  const authenticatedUser = await authenticateRequest(req);

  // Parse and validate request body.
  let payload: { message: string; projectId?: string; currentNeeds?: ExtractedUserNeeds; history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> };
  try {
    const raw = await req.json();
    payload = RequestSchema.parse(raw);
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request payload.' }, { status: 400 });
  }

  // Async generator that yields SSE events.
  async function* eventGenerator() {
    // start event – useful for UI to show loading indicator.
    yield { type: 'start', data: { status: 'processing' } };

    try {
      const router = new ModelRouter();
      const policy = MODEL_CONFIG.agentPolicies.mitra();

      const conversationHistoryText = (payload.history || [])
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'User' : 'Mitra'}: ${m.content}`)
        .join('\n');

      const userPrompt = conversationHistoryText
        ? `Conversation History:\n${conversationHistoryText}\n\nLatest User Input: ${payload.message}`
        : `Latest User Input: ${payload.message}`;

      const sysPromptWithNeeds = payload.currentNeeds
        ? `${systemPrompt}\n\nPrior accumulated extracted needs: ${JSON.stringify(payload.currentNeeds)}`
        : systemPrompt;

      const routerRes = await router.route({
        systemPrompt: sysPromptWithNeeds,
        userPrompt,
        temperature: 0.7,
        maxTokens: 1000,
        timeoutMs: policy.timeoutMs,
      }, policy);

      // Record non-blocking telemetry
      recordAgentRun({
        agentName: 'mitra',
        userId: authenticatedUser?.id,
        projectId: payload.projectId,
        status: routerRes.success ? 'success' : 'failed',
        modelProvider: routerRes.provider,
        modelName: routerRes.model,
        latencyMs: Math.round(routerRes.latencyMs),
        tokensUsed: {},
        metadata: {
          channel: 'sse',
          fallbackCount: routerRes.fallbackCount,
          error: routerRes.error?.message ? sanitizeErrorOutput(routerRes.error.message) : undefined,
        },
      }).catch(() => {});

      if (!routerRes.success || !routerRes.rawText) {
        throw new ModelResponseError(routerRes.error?.message || 'Provider returned empty response');
      }

      // Parse and normalize the structured output server-side
      const normalized = normalizeAgentResponse(
        routerRes.rawText,
        payload.currentNeeds as ExtractedUserNeeds,
        payload.message
      );

      // If projectId is provided, persist canonical facts to Project Knowledge only if caller owns it
      if (payload.projectId && authenticatedUser) {
        try {
          const projectExists = await dbCheckProjectExists(payload.projectId, authenticatedUser.id);

          if (projectExists) {
            await setProjectKnowledge(
              payload.projectId,
              'extracted_needs',
              normalized.extractedNeeds,
              authenticatedUser.id,
              'business_info'
            );
          } else {
            console.warn('[Agent SSE] Skipped project knowledge write: caller is not project owner');
          }
        } catch (pkErr) {
          console.warn('[Agent SSE] Project Knowledge write skipped:', pkErr instanceof Error ? pkErr.message : pkErr);
        }
      }

      yield { type: 'message', data: normalized };
    } catch (err) {
      if (err instanceof ModelResponseError) {
        console.warn('[Agent SSE] Validation error:', sanitizeErrorOutput(err.message));
        yield { type: 'error', data: { message: err.message } };
        return;
      }
      console.error('[Agent SSE] Provider error:', sanitizeErrorOutput(String(err)));
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
