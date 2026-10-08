/**
 * Design-review + smoke-check script.
 * Usage: node scripts/screenshot.ts [url] [outDir] [waitMs]
 * Opens the app at desktop and mobile sizes, saves screenshots and fails on console errors.
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const url = process.argv[2] ?? 'http://localhost:4173/TrialFlow/'
const outDir = process.argv[3] ?? 'docs/screenshots'
const waitMs = Number(process.argv[4] ?? 6000)

const viewports = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
] as const

mkdirSync(outDir, { recursive: true })
// Real GPU on macOS (ANGLE/Metal); software rendering elsewhere.
const browser = await chromium.launch(
  process.platform === 'darwin'
    ? { channel: 'chromium', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] }
    : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
)
const errors: string[] = []

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  })
  const page = await context.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${vp.name}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`[${vp.name}] ${err.message}`))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(waitMs)
  await page.screenshot({ path: join(outDir, `${vp.name}.png`) })
  await context.close()
}

await browser.close()
if (errors.length > 0) {
  console.error('Console errors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log(`Saved screenshots to ${outDir}, no console errors.`)
