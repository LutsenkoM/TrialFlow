import { Application, extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { useRef } from 'react'

extend({ Container, Graphics })

export function SceneCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0 }}>
      <Application resizeTo={hostRef} background={0x070b16} antialias autoDensity />
    </div>
  )
}
