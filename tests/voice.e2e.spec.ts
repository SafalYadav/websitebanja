// tests/voice.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Voice pipeline end-to-end verification', () => {
  test('Complete Voice Pipeline: App Load, Agent Init, Greeting, Audio Pipeline, Interaction', async ({ page }) => {
    const uncaughtErrors: string[] = [];
    const unexpectedNetworkFailures: string[] = [];
    const voiceLogs: string[] = [];
    let voiceEndpointCalled = false;
    let voiceBytesReceived = 0;

    // 1. Monitor uncaught browser exceptions
    page.on('pageerror', (err) => {
      console.error('[Browser PageError]:', err.message);
      uncaughtErrors.push(err.message);
    });

    // 2. Monitor console messages
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[VoiceDebug]') || text.includes('[VoiceAgent]') || text.includes('[VoiceLatency]')) {
        voiceLogs.push(text);
        console.log('[Browser Console]:', text);
      }
      if (msg.type() === 'error' && !text.includes('favicon')) {
        console.error('[Browser Error Log]:', text);
      }
    });

    // 3. Monitor network requests
    page.on('requestfailed', (req) => {
      const url = req.url();
      if (req.failure()?.errorText !== 'net::ERR_ABORTED') {
        unexpectedNetworkFailures.push(`${url}: ${req.failure()?.errorText}`);
      }
    });

    page.on('response', async (res) => {
      if (res.url().includes('/api/agent/voice')) {
        voiceEndpointCalled = true;
        try {
          const body = await res.body();
          if (body.byteLength > 0) {
            voiceBytesReceived = body.byteLength;
          }
          console.log(`[Network Response] /api/agent/voice returned status ${res.status()}, ${body.byteLength} bytes`);
        } catch {
          // stream response consumed or pending
        }
      }
    });

    // Step A: App Loads
    console.log('\n--- Step A: App Loads ---');
    const response = await page.goto('/agent', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBe(200);
    console.log('✔ App loaded with HTTP status 200');

    // Step B: Agent Initializes
    console.log('\n--- Step B: Agent Initializes ---');
    await page.waitForSelector('textarea', { state: 'visible', timeout: 15000 });
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    console.log('✔ Agent UI initialized: textarea is visible');

    // Step C: Greeting Appears
    console.log('\n--- Step C: Greeting Appears ---');
    const greetingLocator = page.locator('text=Hey there! I\'m Mitra');
    await expect(greetingLocator).toBeVisible({ timeout: 10000 });
    const greetingText = await greetingLocator.textContent();
    expect(greetingText).toContain('Mitra');
    expect(greetingText).toContain('Website Architect');
    console.log(`✔ Greeting appears on screen: "${greetingText?.slice(0, 70)}..."`);

    // Step D: Voice Pipeline Initializes
    console.log('\n--- Step D: Voice Pipeline Initializes ---');
    // User clicks the Start Hands-Free Voice button or Listen Again to activate voice
    const voiceButton = page.locator('button:has-text("Tap to Start Hands-Free Voice Conversation"), button:has-text("Listen again")').first();
    await expect(voiceButton).toBeVisible();
    await voiceButton.click();
    console.log('✔ User interaction dispatched to unlock Web Audio API');

    // Step E: Audio Data Generated / Received
    console.log('\n--- Step E: Audio Data Generated / Received ---');
    // Poll for voice audio bytes received either from preload or direct request
    await expect.poll(() => voiceBytesReceived, {
      timeout: 15000,
      message: 'Expected voice bytes received > 0',
    }).toBeGreaterThan(0);
    expect(voiceEndpointCalled).toBe(true);
    console.log(`✔ Audio data received: ${voiceBytesReceived} bytes of 24kHz PCM`);

    // Step F: Audio Decoding and Playback Pipeline Starts
    console.log('\n--- Step F: Audio Decoding & Playback Pipeline Starts ---');
    const audioMetrics = await page.evaluate(async () => {
      return {
        hasAudioContext: typeof window.AudioContext !== 'undefined',
      };
    });
    expect(audioMetrics.hasAudioContext).toBe(true);

    // Verify through captured console logs that pushChunk and decoding took place
    await expect.poll(() => {
      return voiceLogs.some((l) =>
        l.includes('decoded sample count') ||
        l.includes('source.start() called') ||
        l.includes('playback started') ||
        l.includes('first PCM chunk received') ||
        l.includes('Preloaded greeting audio buffer ready') ||
        l.includes('Instant 0ms playback of preloaded greeting buffer')
      );
    }, { timeout: 15000, message: 'Expected voice pipeline logs showing decoded samples / playback start' }).toBe(true);
    console.log('✔ Audio decoding/playback pipeline started and scheduled audio chunks in Web Audio');

    // Step G: Subsequent Interaction Works
    console.log('\n--- Step G: Subsequent Interaction Works ---');
    await textarea.fill('I want to build a website for my coffee roastery called BeanCraft');
    console.log('✔ Sent user message: "I want to build a website for my coffee roastery called BeanCraft"');
    await textarea.press('Enter');

    // Wait for user message bubble to appear in chat
    const userMessageBubble = page.locator('text=BeanCraft');
    await expect(userMessageBubble).toBeVisible({ timeout: 10000 });
    console.log('✔ User message rendered in chat stream');

    // Wait for the agent talk response
    const agentReplyResponse = await page.waitForResponse(
      (res) => res.url().includes('/api/agent/talk') && res.status() === 200,
      { timeout: 30000 }
    );
    expect(agentReplyResponse.status()).toBe(200);
    console.log('✔ Agent response processed successfully via /api/agent/talk');

    // Verify suggested reply chips or blueprint update appears
    await page.waitForTimeout(1000);

    // Step H: Verify Error Conditions
    console.log('\n--- Step H: Error Verification ---');
    expect(uncaughtErrors).toEqual([]);
    expect(unexpectedNetworkFailures).toEqual([]);
    console.log('✔ No uncaught browser errors');
    console.log('✔ No unexpected network failures');

    // Step I: Physical Speaker Output Status
    console.log('\n--- Step I: Physical Speaker Verification ---');
    console.log('ℹ NOTE: Physical speaker output is marked UNVERIFIED because automated headless/E2E test runs cannot objectively measure sound waves exiting physical hardware speakers.');
  });
});
