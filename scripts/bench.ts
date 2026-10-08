/**
 * Frame-rate benchmark: plays the timeline and samples the in-app perf monitor.
 * Usage: node scripts/bench.ts [baseUrl] [patients] [quality] [speed]
 * Uses the real GPU (ANGLE/Metal) on macOS; elsewhere falls back to SwiftShader, whose
 * numbers are only meaningful for the CPU column.
 */
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://localhost:4173/TrialFlow/'
const n = Number(process.argv[3] ?? 15000)
const quality = process.argv[4] ?? 'high'
const speed = process.argv[5] ?? '1'
/** CPU slowdown factor via CDP (4 ≈ a mid-range laptop relative to an M1 Pro). */
const cpuThrottle = Number(process.argv[6] ?? 1)
/** Pass "auto" as quality to leave auto-degrade on and report where it settles. */
const auto = quality === 'auto'

const mac = process.platform === 'darwin'
const browser = await chromium.launch(
  mac
    ? { channel: 'chromium', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] }
    : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
)
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2')
  const ext = gl?.getExtension('WEBGL_debug_renderer_info')
  return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown'
})
if (cpuThrottle > 1) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle })
}
const qualityParam = auto ? '' : `&quality=${quality}`
await page.goto(`${base}?n=${n}&week=0&nointro&stats${qualityParam}`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => (window.__trialFlow?.perf()?.particles ?? 0) > 0, null, {
  timeout: 30000,
})
if (speed !== '1') await page.getByRole('radio', { name: `${speed}×` }).click()
await page.getByRole('button', { name: 'Play' }).click()
await page.waitForTimeout(2000)

const samples: { fps: number; tickMs: number; worstMs: number }[] = []
for (let i = 0; i < (auto ? 30 : 24); i++) {
  await page.waitForTimeout(500)
  const s = await page.evaluate(() => window.__trialFlow?.perf() ?? null)
  if (s) samples.push(s)
}
const avg = (k: 'fps' | 'tickMs') => samples.reduce((a, s) => a + s[k], 0) / samples.length
const worst = Math.max(...samples.map((s) => s.worstMs))
const minFps = Math.min(...samples.map((s) => s.fps))
// With auto quality, read where the auto-degrade rule settled (perf overlay is open via ?stats).
const settled = auto
  ? await page.evaluate(
      () =>
        document.querySelector('[aria-label=Performance] [aria-pressed=true]')?.textContent ??
        'n/a',
    )
  : quality
console.log(
  JSON.stringify({
    renderer,
    patients: n,
    quality,
    settled,
    cpuThrottle,
    speed,
    avgFps: +avg('fps').toFixed(1),
    minFps: +minFps.toFixed(1),
    sceneCpuMs: +avg('tickMs').toFixed(2),
    worstFrameMs: +worst.toFixed(1),
  }),
)
await browser.close()
