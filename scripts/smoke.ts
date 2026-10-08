/**
 * Runtime smoke test for the main flow (used in the quality gate).
 * Usage: node scripts/smoke.ts [url]
 */
import { chromium } from '@playwright/test'

declare global {
  interface Window {
    __trialFlow?: { screenPositionOf(id: number): { x: number; y: number } | null }
  }
}

const url = process.argv[2] ?? 'http://localhost:4173/TrialFlow/'
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors: string[] = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))

function check(cond: boolean, message: string) {
  if (!cond) {
    console.error(`✗ ${message}`)
    process.exitCode = 1
  } else console.log(`✓ ${message}`)
}

const readWeek = async () =>
  Number(await page.getAttribute('[role=slider][aria-label="Study week"]', 'aria-valuenow'))

await page.goto(url + '?week=5', { waitUntil: 'networkidle' })
await page.waitForSelector('canvas')
await page.waitForTimeout(1500)
check((await readWeek()) === 5, 'starts at ?week=5')

await page.getByRole('button', { name: 'Play' }).click()
await page.waitForTimeout(1500)
const afterPlay = await readWeek()
check(afterPlay > 5.5, `playback advances (week ${afterPlay})`)
await page.getByRole('button', { name: 'Pause' }).click()

const slider = page.getByRole('slider', { name: 'Study week' })
const box = await slider.boundingBox()
if (box) {
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height - 20)
  const forward = await readWeek()
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height - 20)
  const back = await readWeek()
  check(forward > 35 && back < 15, `scrubbing works both directions (${forward} → ${back})`)
}

await slider.focus()
const beforeKey = await readWeek()
await page.keyboard.press('ArrowLeft')
check((await readWeek()) < beforeKey, 'arrow key steps backwards')

// Click-to-inspect: find a visible particle on screen and click it.
await page.waitForTimeout(500)
const pos = await page.evaluate(() => {
  for (let id = 0; id < 600; id++) {
    const p = window.__trialFlow?.screenPositionOf(id)
    if (p && p.x > 100 && p.x < 1300 && p.y > 180 && p.y < 760) return { id, ...p }
  }
  return null
})
if (pos) {
  await page.mouse.move(pos.x, pos.y)
  await page.waitForTimeout(200)
  await page.mouse.click(pos.x, pos.y)
  await page.waitForTimeout(1500)
  const card = await page.locator('aside[aria-label^="Patient"]').count()
  check(card === 1, 'clicking a particle opens the patient card')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  check(
    (await page.locator('aside[aria-label^="Patient"]').count()) === 0,
    'Escape closes the card',
  )
} else check(false, 'found a particle on screen to click')

// Filters: High Dose only should reduce the randomized KPI to about a third.
const kpi = async (label: string) =>
  Number(
    (
      await page
        .locator(`text=${label}`)
        .locator('xpath=ancestor::div[contains(@class,"card")][1]')
        .locator('.num')
        .first()
        .textContent()
    )?.replace(/,/g, ''),
  )
await page.keyboard.press('End')
await page.waitForTimeout(1200)
const before = await kpi('Randomized')
await page.getByRole('button', { name: 'Filters', exact: true }).click()
await page.getByRole('button', { name: 'High Dose' }).click()
await page.waitForTimeout(1200)
const after = await kpi('Randomized')
check(
  after > before * 0.28 && after < before * 0.38,
  `arm filter narrows KPIs (${before} → ${after})`,
)
await page.getByRole('button', { name: 'Reset', exact: true }).click()

check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
await browser.close()
