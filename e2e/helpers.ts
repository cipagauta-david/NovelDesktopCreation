/**
 * Shared E2E helpers — imported by multiple spec files.
 * Keep helpers focused on navigation/setup; assertions belong in specs.
 */

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

// ── Onboarding ────────────────────────────────────────────────────────────────

/**
 * Brings the app past the onboarding screen into the main workspace.
 * Safe to call even when the app is already onboarded (persisted IndexedDB state).
 */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.waitForSelector('.onboarding-shell, .app-shell', { timeout: 60_000 })

  // Already onboarded — nothing to do
  if ((await page.locator('.app-shell').count()) > 0) return

  // Landing page → onboarding form
  const startButton = page.locator('button:has-text("Empieza a diseñar tu mundo")')
  if (await startButton.count() > 0) {
    await startButton.click()
    await page.waitForTimeout(300)
  }

  // Onboarding form → demo mode (no API key required)
  const demoButton = page.locator('button:has-text("Probar sin API key")')
  if (await demoButton.count() > 0) {
    await demoButton.click()
  }

  await page.waitForSelector('.app-shell', { timeout: 20_000 })
}

/**
 * Clears all persistence (localStorage + IndexedDB) and reloads.
 * Useful to force onboarding from a known clean state.
 */
export async function resetAppState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear()
    const req = indexedDB.deleteDatabase('novel-desktop-worker-db')
    return new Promise<void>((resolve) => {
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
  await page.reload()
}

// ── Panel helpers ─────────────────────────────────────────────────────────────

/**
 * Ensures the entity list (`.entity-column`) is visible.
 * Opens the "Colecciones" icon-rail tab if needed.
 * On repeated failure, optionally resets app state and retries once.
 */
export async function ensureEntityListVisible(page: Page, allowReset = true): Promise<void> {
  const entityList = page.locator('.entity-column').first()

  if ((await entityList.count()) > 0 && (await entityList.isVisible())) return

  const colButton = page.locator('button[aria-label="Colecciones"]').first()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await colButton.count()) === 0) break
    await colButton.click()
    await page.waitForTimeout(450)
    if ((await entityList.count()) > 0 && (await entityList.isVisible())) return
  }

  if (allowReset) {
    await resetAppState(page)
    await completeOnboarding(page)
    await ensureEntityListVisible(page, false)
    return
  }

  await expect(entityList).toBeVisible({ timeout: 10_000 })
}

/**
 * Opens the left navigation panel via the icon rail (Proyecto tab).
 * Idempotent — does nothing if panel is already open.
 */
export async function openLeftPanel(page: Page): Promise<void> {
  const proyectoBtn = page.locator('button[aria-label="Proyecto"]').first()
  await proyectoBtn.click()
  await page.waitForTimeout(300)
}

/**
 * Opens the inspector panel via the icon rail (Contexto tab).
 * Idempotent — does nothing if inspector is already open.
 */
export async function openInspectorPanel(page: Page): Promise<void> {
  const contextoBtn = page.locator('button[aria-label="Contexto"]').first()
  await contextoBtn.click()
  await page.waitForTimeout(300)
}
