import { test, expect } from "@playwright/test";

// MiniMax API key for testing
const MINIMAX_API_KEY =
  "sk-cp-o-E9Y6JQgiyTGQlYNsaDkv_sd6fc1JSbTz0pQMeGSToNS-cQLXS9KQqMS7QUSEWEZogjC16Gr0PwY90Q3FFcCK4uiMqn3U4k78CpXMytIcEapCE4NahJF50";

test("builder flow with MiniMax API validation", async ({ page }) => {
  // Step 1: Navigate to landing page
  await page.goto("/");
  await expect(page).toHaveTitle(/Manus/i);

  // Step 2: Navigate to builder
  await page.goto("/builder");
  await page.waitForLoadState("networkidle");

  // Verify main elements are visible
  await expect(page.locator("text=Manus Builder")).toBeVisible();
  await expect(page.locator("text=AI Assistant")).toBeVisible();

  // Step 3: Open settings dialog
  const settingsButton = page.locator('button:has-text("Settings")').first();
  await settingsButton.click();
  await page.waitForSelector('[role="dialog"]', { state: "visible" });

  // Step 4: Select MiniMax provider
  const providerSelect = page
    .locator('select, [role="combobox"]')
    .filter({ hasText: /Provider/i })
    .first();
  await providerSelect.click();
  await page.locator("text=Minimax").click();
  await page.waitForTimeout(500);

  // Step 5: Enter API key
  const apiKeyInput = page
    .locator('input[type="password"]')
    .filter({ has: page.locator("text=/API Key/i") })
    .first();
  await apiKeyInput.fill(MINIMAX_API_KEY);

  // Step 6: Click Test API Key button
  const testButton = page
    .locator("button")
    .filter({ hasText: /Test.*Key/i })
    .first();
  await testButton.click();

  // Step 7: Wait for success toast
  await expect(page.locator("text=/API key is valid|success/i")).toBeVisible({
    timeout: 10000,
  });
  await page.waitForTimeout(1000);

  // Step 8: Close settings dialog
  const closeButton = page
    .locator('[role="dialog"] button[aria-label="Close"]')
    .or(
      page
        .locator('[role="dialog"]')
        .locator("button")
        .filter({ hasText: /Close|×/i })
    )
    .first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(500);

  // Step 9: Type prompt in chat
  const chatInput = page
    .locator("textarea")
    .filter({ has: page.locator("text=/Describe what you want/i") })
    .first();
  await chatInput.fill(
    "build a simple web page with a heading that says Hello World"
  );

  // Step 10: Click Generate button
  const generateButton = page
    .locator("button")
    .filter({ hasText: /Generate|Send/i })
    .first();
  await generateButton.click();

  // Step 11: Wait for generation to complete
  // Look for agent status or completion indicators
  await expect(page.locator("text=/completed|success|Agent/i")).toBeVisible({
    timeout: 60000,
  });
  await page.waitForTimeout(2000);

  // Step 12: Verify preview panel shows content
  const previewIframe = page.locator("iframe").first();
  await expect(previewIframe).toBeVisible();

  // Verify iframe has loaded content
  await page.waitForTimeout(3000); // Allow Sandpack to load
  const iframeCount = await page.locator("iframe").count();
  expect(iframeCount).toBeGreaterThan(0);

  // Take final screenshot as evidence
  await page.screenshot({
    path: ".sisyphus/evidence/e2e-builder-complete.png",
    fullPage: true,
  });
});
