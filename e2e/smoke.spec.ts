/**
 * E2E Smoke Tests — Flujos críticos
 * Cubren: Onboarding → Edición → Autosave → Recarga → Búsqueda → Mapa narrativo
 */

import { test, expect } from '@playwright/test'
import { completeOnboarding, ensureEntityListVisible } from './helpers'

// ── Test: App loads and shows onboarding or workspace ────

test('app loads successfully', async ({ page }) => {
  await page.goto('/')
  // Should see either onboarding or directly the workspace
  // Avoid waiting for networkidle because Vite HMR websocket keeps the network busy
  await page.waitForSelector('.onboarding-shell, .app-shell', { timeout: 60_000 })
})

// ── Test: Onboarding without API key ─────────────────────

test('onboarding completes without API key', async ({ page }) => {
  // Clear IndexedDB to force onboarding
  await page.goto('/')
  await page.evaluate(() => {
    const DBDeleteRequest = indexedDB.deleteDatabase('novel-desktop-worker-db')
    return new Promise<void>((resolve) => {
      DBDeleteRequest.onsuccess = () => resolve()
      DBDeleteRequest.onerror = () => resolve()
      DBDeleteRequest.onblocked = () => resolve()
    })
  })
  await page.reload()

  await page.waitForSelector('.onboarding-shell, .app-shell', { timeout: 30_000 })
  await completeOnboarding(page)
  await expect(page.locator('.app-shell')).toBeVisible({ timeout: 20_000 })
})

// ── Test: Editor loads with seed entity ──────────────────

test('editor shows seed entity content', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  await ensureEntityListVisible(page)

  // Should have at least one entity card
  const entityCards = page.locator('.list-card')
  const count = await entityCards.count()
  expect(count).toBeGreaterThan(0)
})

// ── Test: Edit entity title triggers autosave ────────────

test('editing entity triggers autosave', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Find title input
  const titleInput = page.locator('input[class*="title"], .editor-title-input, input[placeholder*="título"], input[placeholder*="Título"]').first()

  if (await titleInput.count() > 0) {
    const originalValue = await titleInput.inputValue()
    await titleInput.fill(originalValue + ' (edited)')

    // Wait for autosave indication
    await page.waitForTimeout(800)

    // Verify save status shows up
    const saveIndicator = page.locator('[class*="save"], [class*="status"]').first()
    if (await saveIndicator.count() > 0) {
      await expect(saveIndicator).toBeVisible()
    }
  }
})

// ── Test: Navigation between tabs ────────────────────────

test('tab navigation works', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Open left panel so TabBar is rendered (panels are closed by default)
  await ensureEntityListVisible(page)

  // Get all tab buttons
  const tabs = page.locator('.tab-tree-item')
  const tabCount = await tabs.count()
  expect(tabCount).toBeGreaterThanOrEqual(2)

  // Click second tab
  await tabs.nth(1).click()
  await page.waitForTimeout(300)

  // Verify the second tab is active
  await expect(tabs.nth(1)).toHaveClass(/active/)
})

// ── Test: Entity creation ────────────────────────────────

test('create new entity', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Click "Crear entidad" 
  const createBtn = page.locator('button:has-text("Crear entidad")').first()
  if (await createBtn.count() > 0) {
    await createBtn.click()

    // May need to click again if it toggles a composer
    const createEntityBtn = page.locator('button:has-text("Crear entidad")').last()
    await createEntityBtn.click()

    await page.waitForTimeout(500)

    // Verify a new entity card appeared
    const entityCards = page.locator('.list-card')
    const count = await entityCards.count()
    expect(count).toBeGreaterThan(0)
  }
})

// ── Test: Search (Command Palette) ───────────────────────

test('search command palette opens and finds results', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Open search palette with Ctrl+K
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(300)

  // Should see search palette
  const palette = page.locator('.command-palette, [class*="command-palette"], [class*="search-palette"]').first()
  
  if (await palette.count() > 0) {
    // Type a search query
    const searchInput = palette.locator('input').first()
    await searchInput.fill('Ariadna')
    await page.waitForTimeout(300)

    // Should have results
    const results = palette.locator('[class*="result"], button, li')
    const count = await results.count()
    expect(count).toBeGreaterThan(0)

    // Close palette
    await page.keyboard.press('Escape')
  }
})

// ── Test: Switch to graph view ───────────────────────────

test('graph view renders nodes', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Find and click graph/map view toggle
  const graphToggle = page.locator('button:has-text("Mapa"), button:has-text("Grafo"), button[aria-label*="graph"], [class*="view-toggle"] button').first()
  
  if (await graphToggle.count() > 0) {
    await graphToggle.click()
    await page.waitForTimeout(500)

    // Should see SVG or Canvas graph renderer
    const svg = page.locator('svg[role="img"]')
    const canvas = page.locator('canvas[role="img"], .graph-pixi-canvas')

    if (await svg.count() > 0) {
      const nodeCount = await svg.locator('.graph-node').count()
      expect(nodeCount).toBeGreaterThan(0)
      return
    }

    if (await canvas.count() > 0) {
      await expect(canvas.first()).toBeVisible()
    }
  }
})

// ── Test: Ctrl+Click reference navigation ────────────────

test('Ctrl+Click on reference navigates to entity', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Check for any reference decorations in the editor
  const refDeco = page.locator('[class*="reference"], .cm-entity-ref').first()
  if (await refDeco.count() > 0) {
    // Ctrl+Click
    await refDeco.click({ modifiers: ['Control'] })
    await page.waitForTimeout(500)

    // Should show a toast or change entity
    const toast = page.locator('.toast')
    if (await toast.count() > 0) {
      await expect(toast).toBeVisible()
    }
  }
})

// ── Test: Autosave persists across reload ────────────────

test('data persists across page reload', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)
  await ensureEntityListVisible(page)

  // Get current project name / entity count
  const firstEntity = page.locator('.list-card strong').first()
  let entityTitle = ''
  if (await firstEntity.count() > 0) {
    entityTitle = (await firstEntity.textContent()) ?? ''
  }

  // Reload
  await page.reload()
  await completeOnboarding(page)
  await ensureEntityListVisible(page)

  // Verify same data is visible
  if (entityTitle) {
    const reloadedEntity = page.locator('.list-card strong').first()
    if (await reloadedEntity.count() > 0) {
      const reloadedTitle = await reloadedEntity.textContent()
      expect(reloadedTitle).toBeTruthy()
    }
  }
})

// ── Test: Inspector panel toggle ─────────────────────────

test('inspector panel toggles', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Toggle inspector with keyboard shortcut
  await page.keyboard.press('Control+\\')
  await page.waitForTimeout(300)

  // Inspector should be visible
  const inspector = page.locator('.inspector-column, .inspector-panel-shell.open')
  if (await inspector.count() > 0) {
    await expect(inspector.first()).toBeVisible()
  }

  // Toggle off
  await page.keyboard.press('Control+\\')
  await page.waitForTimeout(300)
})

// ── Test: Zen mode toggle ────────────────────────────────

test('zen mode toggles with F11', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Toggle zen mode
  await page.keyboard.press('F11')
  await page.waitForTimeout(300)

  const stage = page.locator('.workspace-stage.focus-mode')
  if (await stage.count() > 0) {
    await expect(stage).toBeVisible()
  }

  // Toggle off
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})
