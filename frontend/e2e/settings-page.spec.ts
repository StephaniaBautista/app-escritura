import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@archivum.app')
    await page.fill('input[name="password"]', 'Test1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/app')
  })

  test('navegar a /app/settings muestra la página de configuración', async ({ page }) => {
    await page.goto('/app/settings')
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toContainText(/Settings|Configuración/)
  })

  test('sidebar tiene link a configuración en topbar', async ({ page }) => {
    const topbar = page.locator('header')
    const settingsLink = topbar.locator('a[href="/app/settings"]')
    await expect(settingsLink).toBeVisible()
  })

  test('muestra sección de versionado automático con 6 triggers', async ({ page }) => {
    await page.goto('/app/settings')
    await expect(page.getByText(/Automatic versioning|Versionado automático/)).toBeVisible()
    await expect(page.getByText(/On inactivity|Por inactividad/)).toBeVisible()
    await expect(page.getByText(/On document exit|Al salir del documento/)).toBeVisible()
    await expect(page.getByText(/Every hour|Cada hora/)).toBeVisible()
    await expect(page.getByText(/Every day|Cada día/)).toBeVisible()
    await expect(page.getByText(/Every week|Cada semana/)).toBeVisible()
    await expect(page.getByText(/Every month|Cada mes/)).toBeVisible()
  })

  test('toggle de inactividad tiene switch role y es interactivo', async ({ page }) => {
    await page.goto('/app/settings')
    await page.waitForTimeout(1000)
    const switches = page.locator('button[role="switch"]')
    const inactivitySwitch = switches.first()
    await expect(inactivitySwitch).toBeVisible()

    const initialState = await inactivitySwitch.getAttribute('aria-checked')
    await inactivitySwitch.click()
    await page.waitForTimeout(500)
    const newState = await inactivitySwitch.getAttribute('aria-checked')
    expect(newState).not.toBe(initialState)

    await inactivitySwitch.click()
    await page.waitForTimeout(500)
    const restoredState = await inactivitySwitch.getAttribute('aria-checked')
    expect(restoredState).toBe(initialState)
  })

  test('selector de intervalo aparece cuando trigger está activo', async ({ page }) => {
    await page.goto('/app/settings')
    await page.waitForTimeout(1000)
    const switches = page.locator('button[role="switch"]')
    const inactivitySwitch = switches.first()
    const isChecked = await inactivitySwitch.getAttribute('aria-checked')

    if (isChecked === 'true') {
      await expect(page.locator('select').first()).toBeVisible()
    } else {
      await inactivitySwitch.click()
      await page.waitForTimeout(500)
      await expect(page.locator('select').first()).toBeVisible()
    }
  })

  test('topbar settings icon redirige a /app/settings', async ({ page }) => {
    await page.goto('/app')
    const topbar = page.locator('header')
    const settingsIcon = topbar.locator('a[href="/app/settings"]')
    await expect(settingsIcon).toBeVisible()
    await settingsIcon.click()
    await page.waitForURL('/app/settings')
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toContainText(/Settings|Configuración/)
  })
})
