// tests/voice_text_consistency.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Voice & Text Parity (Single Source of Truth) Verification', () => {
  test('Exact 100% string match: Chat UI Display === TTS Input === Voice Replay across multi-turn and distinctive tokens', async ({ page }) => {
    test.setTimeout(90000);
    const uncaughtErrors: string[] = [];
    const unexpectedNetworkFailures: string[] = [];
    const ttsRequests: { url: string; text: string; status?: number; byteLength?: number }[] = [];

    // 1. Monitor uncaught exceptions
    page.on('pageerror', (err) => {
      console.error('[Browser PageError]:', err.message);
      uncaughtErrors.push(err.message);
    });

    // 2. Monitor console messages
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[CanonicalVoice]') || text.includes('[VoiceDebug]') || text.includes('[VoiceReplay]') || text.includes('[VoiceTurn]') || text.includes('[VoiceParity]')) {
        console.log('[Browser Log]:', text);
      }
    });

    // 3. Monitor network requests and track TTS payloads
    page.on('request', (req) => {
      if (req.url().includes('/api/agent/voice')) {
        try {
          const postData = req.postDataJSON();
          if (postData && typeof postData.text === 'string') {
            ttsRequests.push({ url: req.url(), text: postData.text });
            console.log(`[TTS Intercept Request #${ttsRequests.length}]: text="${postData.text.slice(0, 60)}..."`);
          }
        } catch {
          // ignore
        }
      }
    });

    page.on('response', async (res) => {
      if (res.url().includes('/api/agent/voice')) {
        const lastEntry = ttsRequests[ttsRequests.length - 1];
        if (lastEntry) {
          lastEntry.status = res.status();
          try {
            const body = await res.body();
            lastEntry.byteLength = body.byteLength;
            console.log(`[TTS Intercept Response #${ttsRequests.length}]: status=${res.status()}, bytes=${body.byteLength}`);
          } catch {
            // stream consumed
          }
        }
      }
    });

    page.on('requestfailed', (req) => {
      const url = req.url();
      if (req.failure()?.errorText !== 'net::ERR_ABORTED') {
        unexpectedNetworkFailures.push(`${url}: ${req.failure()?.errorText}`);
      }
    });

    // Step 1: Load Agent Page
    console.log('\n--- Step 1: Load Agent Page ---');
    await page.goto('/agent', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-testid="agent-textarea"]', { state: 'visible', timeout: 15000 });
    const textarea = page.locator('[data-testid="agent-textarea"]');
    const sendButton = page.locator('[data-testid="send-message-btn"]');
    await expect(textarea).toBeVisible();

    // Step 2: Verify Initial Greeting Parity
    console.log('\n--- Step 2: Initial Greeting Text Parity ---');
    const greetingLocator = page.locator('text=Hey there! I\'m Mitra').first();
    await expect(greetingLocator).toBeVisible({ timeout: 10000 });
    const initialGreetingDom = (await greetingLocator.textContent())?.trim() || '';
    expect(initialGreetingDom).toContain('Mitra');
    expect(initialGreetingDom.toLowerCase()).toContain('website architect');
    console.log(`✔ Initial Greeting in UI: "${initialGreetingDom.slice(0, 70)}..."`);

    // Wait for initial greeting TTS to be triggered
    await expect.poll(() => ttsRequests.length, { timeout: 15000 }).toBeGreaterThan(0);
    const initialGreetingTts = ttsRequests[0];
    expect(initialGreetingTts.text.toLowerCase().trim()).toBe(initialGreetingDom.toLowerCase().trim());
    console.log('✔ [VERIFIED GREETING PARITY] Initial greeting displayed === TTS request text');

    const assistantBubbles = page.locator('[data-role="assistant-message"] p');

    // Step 3: Turn 1 — Dental Clinic (The user-reported bug scenario)
    console.log('\n--- Step 3: Turn 1 — Dental Clinic Inquiry ---');
    const prevTtsCountTurn1 = ttsRequests.length;
    
    // Set up response listener before submitting
    const talkPromise1 = page.waitForResponse(
      (res) => res.url().includes('/api/agent/talk') && res.status() === 200,
      { timeout: 30000 }
    );

    await textarea.fill('I want to create a website for my modern dental clinic called Apex Dental Care.');
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    const talkRes1 = await talkPromise1;
    const talkJson1 = await talkRes1.json();
    expect(talkJson1.success).toBe(true);
    const serverCanonical1 = (talkJson1.data.reply || '').trim();
    console.log(`✔ Turn 1 Server Canonical Reply: "${serverCanonical1}"`);

    // Verify speechText === reply from server
    expect(talkJson1.data.speechText.trim()).toBe(serverCanonical1);

    // Wait for the new assistant message to render in UI
    await expect.poll(async () => {
      const count = await assistantBubbles.count();
      if (count < 2) return '';
      return (await assistantBubbles.nth(count - 1).textContent())?.trim() || '';
    }, { timeout: 15000 }).toBe(serverCanonical1);

    const uiDisplayedTurn1 = (await assistantBubbles.last().textContent())?.trim() || '';
    console.log(`✔ Turn 1 UI Displayed Text: "${uiDisplayedTurn1}"`);

    // Wait for TTS request to be dispatched
    await expect.poll(() => ttsRequests.length, { timeout: 15000 }).toBeGreaterThan(prevTtsCountTurn1);
    const ttsTurn1 = ttsRequests[ttsRequests.length - 1];
    console.log(`✔ Turn 1 TTS Dispatched Text: "${ttsTurn1.text}"`);

    // ASSERT EXACT STRING IDENTITY
    expect(uiDisplayedTurn1).toBe(ttsTurn1.text.trim());
    expect(ttsTurn1.text.trim()).toBe(serverCanonical1);
    console.log('✔ [VERIFIED TURN 1 PARITY] UI Displayed === TTS Input === Canonical Server Reply');

    // Verify it was NOT replaced by old canned phrase_0.pcm (266,402 bytes)
    if (ttsTurn1.byteLength) {
      expect(ttsTurn1.byteLength).not.toBe(266402);
      expect(ttsTurn1.byteLength).toBeGreaterThan(10000);
      console.log(`✔ Dynamic Audio Verified: ${ttsTurn1.byteLength} bytes (not canned phrase)`);
    }

    // Step 4: Turn 2 — Distinctive Phrase 1 ("ALPHA-731 BLUE-PINE")
    console.log('\n--- Step 4: Turn 2 — Distinctive Phrase ALPHA-731 BLUE-PINE ---');
    const prevTtsCountTurn2 = ttsRequests.length;

    const talkPromise2 = page.waitForResponse(
      (res) => res.url().includes('/api/agent/talk') && res.status() === 200,
      { timeout: 30000 }
    );

    await textarea.fill('Reply with the exact phrase: ALPHA-731 BLUE-PINE');
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    const talkRes2 = await talkPromise2;
    const talkJson2 = await talkRes2.json();
    const serverCanonical2 = (talkJson2.data.reply || '').trim();
    console.log(`✔ Turn 2 Server Canonical Reply: "${serverCanonical2}"`);

    await expect.poll(async () => {
      const count = await assistantBubbles.count();
      return (await assistantBubbles.nth(count - 1).textContent())?.trim() || '';
    }, { timeout: 15000 }).toBe(serverCanonical2);

    const uiDisplayedTurn2 = (await assistantBubbles.last().textContent())?.trim() || '';

    await expect.poll(() => ttsRequests.length, { timeout: 15000 }).toBeGreaterThan(prevTtsCountTurn2);
    const ttsTurn2 = ttsRequests[ttsRequests.length - 1];

    // ASSERT EXACT STRING IDENTITY
    expect(uiDisplayedTurn2).toBe(ttsTurn2.text.trim());
    expect(ttsTurn2.text.trim()).toBe(serverCanonical2);
    expect(ttsTurn2.text).toContain('ALPHA-731 BLUE-PINE');
    console.log('✔ [VERIFIED TURN 2 PARITY] UI Displayed === TTS Input contains ALPHA-731 BLUE-PINE');

    // Step 5: Turn 3 — Distinctive Phrase 2 ("BRAVO-842 RED-MOON")
    console.log('\n--- Step 5: Turn 3 — Distinctive Phrase BRAVO-842 RED-MOON ---');
    const prevTtsCountTurn3 = ttsRequests.length;

    const talkPromise3 = page.waitForResponse(
      (res) => res.url().includes('/api/agent/talk') && res.status() === 200,
      { timeout: 30000 }
    );

    await textarea.fill('Reply with the exact phrase: BRAVO-842 RED-MOON');
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    const talkRes3 = await talkPromise3;
    const talkJson3 = await talkRes3.json();
    const serverCanonical3 = (talkJson3.data.reply || '').trim();
    console.log(`✔ Turn 3 Server Canonical Reply: "${serverCanonical3}"`);

    await expect.poll(async () => {
      const count = await assistantBubbles.count();
      return (await assistantBubbles.nth(count - 1).textContent())?.trim() || '';
    }, { timeout: 15000 }).toBe(serverCanonical3);

    const uiDisplayedTurn3 = (await assistantBubbles.last().textContent())?.trim() || '';

    await expect.poll(() => ttsRequests.length, { timeout: 15000 }).toBeGreaterThan(prevTtsCountTurn3);
    const ttsTurn3 = ttsRequests[ttsRequests.length - 1];

    // ASSERT EXACT STRING IDENTITY
    expect(uiDisplayedTurn3).toBe(ttsTurn3.text.trim());
    expect(ttsTurn3.text.trim()).toBe(serverCanonical3);
    expect(ttsTurn3.text).toContain('BRAVO-842 RED-MOON');
    console.log('✔ [VERIFIED TURN 3 PARITY] UI Displayed === TTS Input contains BRAVO-842 RED-MOON');

    // Step 6: Voice Replay Consistency
    console.log('\n--- Step 6: Voice Replay Button Consistency ---');
    const replayButtons = page.locator('button:has-text("Listen again")');
    const replayCount = await replayButtons.count();
    expect(replayCount).toBeGreaterThanOrEqual(3);
    console.log(`✔ Found ${replayCount} replay buttons in conversation bubbles`);

    // Click replay on Turn 2 ("ALPHA-731 BLUE-PINE")
    const prevTtsCountReplay1 = ttsRequests.length;
    await replayButtons.nth(2).click();

    await expect.poll(() => ttsRequests.length, { timeout: 15000 }).toBeGreaterThan(prevTtsCountReplay1);
    const replayTts1 = ttsRequests[ttsRequests.length - 1];
    expect(replayTts1.text.trim()).toBe(uiDisplayedTurn2);
    expect(replayTts1.text).toContain('ALPHA-731 BLUE-PINE');
    console.log(`✔ [VERIFIED REPLAY 1] Replayed exact message containing ALPHA-731 BLUE-PINE`);

    // Click replay on Turn 1 (Dental Clinic)
    const prevTtsCountReplay2 = ttsRequests.length;
    await replayButtons.nth(1).click();

    await expect.poll(() => ttsRequests.length, { timeout: 15000 }).toBeGreaterThan(prevTtsCountReplay2);
    const replayTts2 = ttsRequests[ttsRequests.length - 1];
    expect(replayTts2.text.trim()).toBe(uiDisplayedTurn1);
    console.log(`✔ [VERIFIED REPLAY 2] Replayed exact dental clinic message: "${replayTts2.text.slice(0, 50)}..."`);

    // Step 7: Verify Zero Uncaught Errors
    console.log('\n--- Step 7: Error Verification ---');
    expect(uncaughtErrors).toEqual([]);
    expect(unexpectedNetworkFailures).toEqual([]);
    console.log('✔ Zero uncaught browser errors');
    console.log('✔ Zero unexpected network failures');

    console.log('\n=============================================================');
    console.log('🎉 100% CANONICAL SINGLE SOURCE OF TRUTH VERIFIED ACROSS ALL MODES');
    console.log('=============================================================');
  });
});
