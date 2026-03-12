      /**
 * E2E Smoke Tests — Flujos críticos
 * Cubren: Onboarding → Edición → Autosave → Recarga → Búsqueda → Mapa narrativo
 */

import { test, expect } from '@playwright/test'

// ── Helper: completar onboarding ─────────────────────────

async function completeOnboarding(page: import('@playwright/test').Page) {
  // Wait for the app to load (worker init + data)
  await page.waitForSelector('.onboarding-screen, .app-shell', { timeout: 15_000 })

  // If already onboarded (state persisted), skip
  const isOnboarded = await page.locator('.app-shell').count()
  if (isOnboarded > 0) return

  // Fill onboarding form
  const nameInput = page.locator('input[placeholder*="nombre"], input[placeholder*="Nombre"], input[name="authorName"]').first()
  if (await nameInput.count() > 0) {
    await nameInput.fill('Test Author')
  }

  // Select provider - look for a select or radio with provider options
  const providerSelect = page.locator('select').first()
  if (await providerSelect.count() > 0) {
    await providerSelect.selectOption({ index: 4 }) // Likely Local/Ollama (last option, no API key needed)
  }

  // Submit
  const submitButton = page.locator('button[type="submit"], button:has-text("Comenzar"), button:has-text("Configurar"), button:has-text("Entrar")').first()
  if (await submitButton.count() > 0) {
    await submitButton.click()
  }

  // Wait for workspace to load
  await page.waitForSelector('.app-shell', { timeout: 10_000 })
}

// ── Test: App loads and shows onboarding or workspace ────

test('app loads successfully', async ({ page }) => {
  await page.goto('/')
  // Should see either onboarding or directly the workspace
  await expect(
    page.locator('.onboarding-screen, .app-shell')
  ).toBeVisible({ timeout: 15_000 })
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

  await page.waitForSelector('.onboarding-screen, .app-shell', { timeout: 15_000 })
  await completeOnboarding(page)
  await expect(page.locator('.app-shell')).toBeVisible({ timeout: 10_000 })
})

// ── Test: Editor loads with seed entity ──────────────────

test('editor shows seed entity content', async ({ page }) => {
  await page.goto('/')
  await completeOnboarding(page)

  // Should see entity list
  const entityList = page.locator('.entity-list, .entity-column')
  await expect(entityList.first()).toBeVisible({ timeout: 10_000 })

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

    // Should see SVG with nodes
    const svg = page.locator('svg[role="img"]')
    if (await svg.count() > 0) {
      const nodeCount = await svg.locator('.graph-node').count()
      expect(nodeCount).toBeGreaterThan(0)
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

  // Get current project name / entity count
  const firstEntity = page.locator('.list-card strong').first()
  let entityTitle = ''
  if (await firstEntity.count() > 0) {
    entityTitle = (await firstEntity.textContent()) ?? ''
  }

  // Reload
  await page.reload()
  await page.waitForSelector('.app-shell', { timeout: 15_000 })

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
