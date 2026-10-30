import { test, expect } from '@playwright/test'

test('shows the welcome screen on an empty CV', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Write it with my AI/i })).toBeVisible()
})

test('loads a CV from a hand-off link and exposes the agent API', async ({ page }) => {
  const payload = { cv: { name: 'Ada Lovelace', email: 'ada@example.com', experiences: [] } }
  await page.goto('/#cv=' + encodeURIComponent(JSON.stringify(payload)))
  await expect.poll(() => page.evaluate(() => (window as any).cvEditor?.getState().cv.name)).toBe('Ada Lovelace')
  expect(page.url()).not.toContain('#cv=')
  const pages = await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 1200))
    return (window as any).cvEditor.pageCount()
  })
  expect(pages).toBe(1)
})
