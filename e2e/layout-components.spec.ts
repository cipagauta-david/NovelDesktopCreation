/**
 * Layout Components — E2E tests for Phase 3 extractions
 *
 * Covers:
 *   - LeftIconRail   (src/components/layout/IconRail.tsx)
 *   - RightIconRail  (src/components/layout/IconRail.tsx)
 *   - PanelOverlayBackdrop (src/components/layout/PanelOverlayBackdrop.tsx)
 *   - FloatingAssistantFab (src/components/layout/FloatingAssistantFab.tsx)
 */

import { test, expect } from '@playwright/test'
import { completeOnboarding, resetAppState } from './helpers'

// Each test starts from a known clean state to avoid panel-state bleed between tests.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetAppState(page)
  await completeOnboarding(page)
})

// ─────────────────────────────────────────────────────────────────────────────
// LeftIconRail
// ─────────────────────────────────────────────────────────────────────────────

test.describe('LeftIconRail', () => {
  test('renders Proyecto and Colecciones buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Proyecto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Colecciones' })).toBeVisible()
  })

  test('renders Configuración settings button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Configuración' })).toBeVisible()
  })

  test('clicking Colecciones opens the entity list and marks button active', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Colecciones' })
    await btn.click()
    await page.waitForTimeout(300)

    await expect(btn).toHaveClass(/active/)
    await expect(page.locator('.entity-column').first()).toBeVisible()
  })

  test('clicking Proyecto opens the left panel and marks button active', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Proyecto' })
    await btn.click()
    await page.waitForTimeout(300)

    await expect(btn).toHaveClass(/active/)
    // The sidebar becomes open — left-workspace-panel should have class "open"
    await expect(page.locator('.left-workspace-panel.open')).toBeVisible()
  })

  test('clicking Configuración opens the settings dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Configuración' }).click()
    await page.waitForTimeout(300)

    // Settings dialog should appear (SettingsDialog uses a Dialog/modal pattern)
    const dialog = page.locator('[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })
  })

  test('switching from Proyecto to Colecciones tab changes active button', async ({ page }) => {
    // Open with Proyecto
    await page.getByRole('button', { name: 'Proyecto' }).click()
    await page.waitForTimeout(200)

    // Switch to Colecciones
    const colButton = page.getByRole('button', { name: 'Colecciones' })
    await colButton.click()
    await page.waitForTimeout(200)

    await expect(colButton).toHaveClass(/active/)
    await expect(page.getByRole('button', { name: 'Proyecto' })).not.toHaveClass(/active/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RightIconRail
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RightIconRail', () => {
  test('renders all four inspector tab buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Contexto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Metadatos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Historial' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Métricas' })).toBeVisible()
  })

  test('clicking Contexto opens the inspector panel and marks button active', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Contexto' })
    await btn.click()
    await page.waitForTimeout(300)

    await expect(btn).toHaveClass(/active/)
    await expect(page.locator('.inspector-panel-shell.open')).toBeVisible()
  })

  test('clicking Métricas opens inspector panel on Métricas tab', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Métricas' })
    await btn.click()
    await page.waitForTimeout(300)

    await expect(btn).toHaveClass(/active/)
    await expect(page.locator('.inspector-panel-shell.open')).toBeVisible()
    // Other inspector tab buttons should NOT be active
    await expect(page.getByRole('button', { name: 'Contexto' })).not.toHaveClass(/active/)
  })

  test('switching inspector tabs while panel is open does not close the panel', async ({ page }) => {
    // Open inspector on Contexto
    await page.getByRole('button', { name: 'Contexto' }).click()
    await page.waitForTimeout(200)
    await expect(page.locator('.inspector-panel-shell.open')).toBeVisible()

    // Switch to Metadatos — panel must stay open
    await page.getByRole('button', { name: 'Metadatos' }).click()
    await page.waitForTimeout(200)

    await expect(page.locator('.inspector-panel-shell.open')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Metadatos' })).toHaveClass(/active/)
  })

  test('Ctrl+\\ shortcut toggles inspector panel', async ({ page }) => {
    // Panel starts closed — open it
    await page.keyboard.press('Control+\\')
    await page.waitForTimeout(300)
    await expect(page.locator('.inspector-panel-shell.open')).toBeVisible()

    // Close it
    await page.keyboard.press('Control+\\')
    await page.waitForTimeout(300)
    await expect(page.locator('.inspector-panel-shell.open')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PanelOverlayBackdrop
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PanelOverlayBackdrop', () => {
  test('backdrop is hidden when no panels are open', async ({ page }) => {
    // All panels start closed by default
    await expect(page.locator('.panel-overlay-backdrop.visible')).not.toBeVisible()
  })

  test('backdrop becomes visible when a left panel opens', async ({ page }) => {
    await page.getByRole('button', { name: 'Colecciones' }).click()
    await page.waitForTimeout(300)

    await expect(page.locator('.panel-overlay-backdrop.visible')).toBeVisible()
  })

  test('clicking backdrop closes left panels', async ({ page }) => {
    // Open left panel first
    await page.getByRole('button', { name: 'Proyecto' }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.left-workspace-panel.open')).toBeVisible()

    // Click backdrop
    await page.locator('.panel-overlay-backdrop.visible').click()
    await page.waitForTimeout(300)

    await expect(page.locator('.left-workspace-panel.open')).not.toBeVisible()
    await expect(page.locator('.panel-overlay-backdrop.visible')).not.toBeVisible()
  })

  test('clicking backdrop closes the inspector panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Contexto' }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.inspector-panel-shell.open')).toBeVisible()

    await page.locator('.panel-overlay-backdrop.visible').click()
    await page.waitForTimeout(300)

    await expect(page.locator('.inspector-panel-shell.open')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FloatingAssistantFab
// ─────────────────────────────────────────────────────────────────────────────

test.describe('FloatingAssistantFab', () => {
  test('FAB button is always visible on the workspace', async ({ page }) => {
    await expect(page.locator('.ai-fab-button')).toBeVisible()
  })

  test('clicking FAB opens the assistant panel', async ({ page }) => {
    await page.locator('.ai-fab-button').click()
    await page.waitForTimeout(300)

    await expect(page.locator('.ai-fab-panel')).toBeVisible()
    await expect(page.locator('.ai-fab-button')).toHaveClass(/active/)
  })

  test('clicking the close button inside the panel hides the panel', async ({ page }) => {
    await page.locator('.ai-fab-button').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.ai-fab-panel')).toBeVisible()

    await page.locator('.ai-fab-panel button[aria-label="Cerrar asistente"]').click()
    await page.waitForTimeout(300)

    await expect(page.locator('.ai-fab-panel')).not.toBeVisible()
    await expect(page.locator('.ai-fab-button')).not.toHaveClass(/active/)
  })

  test('clicking FAB again while open toggles the panel closed', async ({ page }) => {
    const fab = page.locator('.ai-fab-button')
    await fab.click()
    await page.waitForTimeout(200)
    await expect(page.locator('.ai-fab-panel')).toBeVisible()

    await fab.click()
    await page.waitForTimeout(200)
    await expect(page.locator('.ai-fab-panel')).not.toBeVisible()
  })

  test('assistant panel contains a textarea for input', async ({ page }) => {
    await page.locator('.ai-fab-button').click()
    await page.waitForTimeout(300)

    const textarea = page.locator('.ai-fab-panel textarea').first()
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeEditable()
  })
})
