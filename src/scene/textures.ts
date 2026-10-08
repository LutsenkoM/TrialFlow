import { Texture } from 'pixi.js'

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  draw(ctx, size)
  return Texture.from(canvas)
}

/** Soft glowing dot: bright core with a smooth falloff. Shared by every particle. */
export function createGlowTexture(size = 64): Texture {
  return canvasTexture(size, (ctx, s) => {
    const c = s / 2
    const g = ctx.createRadialGradient(c, c, 0, c, c, c)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.18, 'rgba(255,255,255,0.85)')
    g.addColorStop(0.42, 'rgba(255,255,255,0.22)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

/** Very wide, faint radial falloff used for zone halos and nebula blobs. */
export function createHaloTexture(size = 256): Texture {
  return canvasTexture(size, (ctx, s) => {
    const c = s / 2
    const g = ctx.createRadialGradient(c, c, 0, c, c, c)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.14)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })
}

/** Thin ring for selection halos and ripples. */
export function createRingTexture(size = 128): Texture {
  return canvasTexture(size, (ctx, s) => {
    const c = s / 2
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = s * 0.035
    ctx.shadowColor = 'white'
    ctx.shadowBlur = s * 0.06
    ctx.beginPath()
    ctx.arc(c, c, c * 0.78, 0, Math.PI * 2)
    ctx.stroke()
  })
}
