// tests/studio_copilot.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Studio AI Copilot End-to-End Verification', () => {
  test('Complete Studio AI Copilot Flow: Navigation, Natural-Language Edits, Canvas Update & Undo', async ({ page }) => {
    test.setTimeout(90000);

    const uncaughtErrors: string[] = [];
    page.on('pageerror', (err) => {
      console.error('[Browser PageError]:', err.message);
      uncaughtErrors.push(err.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        console.error('[Browser Error Log]:', msg.text());
      }
    });

    console.log('[Test] Navigating to Studio Editor Workspace...');
    await page.goto('http://localhost:3000/editor/demo-copilot/workspace', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 1. Ensure workspace is loaded
    await expect(page.locator('aside').first()).toBeVisible({ timeout: 15000 });
    console.log('[Test] Studio Workspace loaded successfully.');

    // 2. Click the Copilot Tab
    const copilotTab = page.locator('[data-testid="studio-tab-ai"]');
    await expect(copilotTab).toBeVisible();
    await copilotTab.click();
    console.log('[Test] Switched to Studio AI Copilot tab.');

    // 3. Verify Copilot input exists
    const copilotInput = page.locator('[data-testid="studio-copilot-input"]');
    const applyBtn = page.locator('[data-testid="studio-copilot-apply-btn"]');
    await expect(copilotInput).toBeVisible({ timeout: 5000 });
    await expect(applyBtn).toBeVisible({ timeout: 5000 });

    // Initial Hero Title
    const initialHeroTitle = await page.locator('#wb-section-hero h1, #wb-section-hero h2, [data-wb-field="hero.title"]').first().textContent();
    console.log('[Test] Initial hero title:', initialHeroTitle);

    // 4. Test 1: "Make the hero headline more premium & punchy"
    console.log('[Test] Applying prompt: "Make the hero headline more premium & punchy"...');
    await copilotInput.fill('Make the hero headline more premium & punchy');
    await applyBtn.click();

    // Wait for thinking indicator to resolve
    await expect(page.locator('text=Thinking...')).toHaveCount(0, { timeout: 25000 });
    // Check that Session History recorded the update
    await expect(page.locator('text=Session History')).toBeVisible();
    await expect(page.locator('text=/Make the hero headline more premium & punchy/i').first()).toBeVisible({ timeout: 10000 });

    // Verify hero title changed on canvas
    const updatedHeroTitle = await page.locator('#wb-section-hero h1, #wb-section-hero h2, [data-wb-field="hero.title"]').first().textContent();
    console.log('[Test] Updated hero title:', updatedHeroTitle);
    expect(updatedHeroTitle).not.toBe(initialHeroTitle);
    console.log('✓ TEST 1 VERIFIED: Hero headline updated dynamically via Copilot.');

    // 5. Test 2: "Change the hero button to Book on WhatsApp"
    console.log('[Test] Applying prompt: "Change the hero button to Book on WhatsApp"...');
    await copilotInput.fill('Change the hero button to Book on WhatsApp');
    await applyBtn.click();

    await expect(page.locator('text=Thinking...')).toHaveCount(0, { timeout: 25000 });
    await expect(page.locator('text=/Change the hero button to Book on WhatsApp/i').first()).toBeVisible({ timeout: 10000 });

    // Verify hero button text updated on canvas
    const heroBtnLocator = page.locator('#wb-section-hero button, #wb-section-hero a, [data-wb-field="hero.button"]').filter({ hasText: /WhatsApp/i });
    await expect(heroBtnLocator.first()).toBeVisible({ timeout: 10000 });
    console.log('✓ TEST 2 VERIFIED: Hero button updated to Book on WhatsApp.');

    // 6. Test 3: Undo functionality
    console.log('[Test] Testing Undo Last...');
    const undoBtn = page.locator('[data-testid="studio-copilot-undo-btn"]');
    await expect(undoBtn).toBeVisible();
    await undoBtn.click();

    // Wait a brief moment for state reconciliation
    await page.waitForTimeout(1000);
    console.log('✓ TEST 3 VERIFIED: Undo button triggered without exceptions.');

    // 7. Verify no uncaught errors
    expect(uncaughtErrors).toEqual([]);
    console.log('✓ ALL STUDIO COPILOT E2E TESTS PASSED CLEANLY.');
  });
});
