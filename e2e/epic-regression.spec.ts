/// <reference types="node" />

import { expect, test } from '@playwright/test'
import { completeOnboarding } from './helpers'

test.describe('Epic regression - Core authoring', () => {
  test('workspace shell boots with key panels', async ({ page }) => {
    await page.goto('/')
    await completeOnboarding(page)
    // Icon rail buttons use aria-label — getByRole matches accessible name
    await expect(page.getByRole('button', { name: 'Proyecto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Colecciones' })).toBeVisible()
  })
})

test.describe('Epic regression - Graph & relations', () => {
  test('graph view toggle remains available', async ({ page }) => {
    await page.goto('/')
    await completeOnboarding(page)
    await page.getByRole('button', { name: 'Mapa' }).click()
    await expect(page.getByText('Mapa narrativo')).toBeVisible()
  })
})

test.describe('Epic regression - Inspector operations', () => {
  test('inspector sync panel renders controls', async ({ page }) => {
    await page.goto('/')
    await completeOnboarding(page)
    // RightIconRail button has aria-label="Contexto"
    await page.getByRole('button', { name: 'Contexto' }).click()
    await page.getByText('Métricas operativas').click().catch(() => undefined)
    await expect(page.getByText('Sync remoto')).toBeVisible()
  })
})
