/**
 * Runtime smoke test for the main flow (used in the quality gate).
 * Usage: node scripts/smoke.ts [url]
 */
import { chromium } from '@playwright/test'

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

check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
await browser.close()
