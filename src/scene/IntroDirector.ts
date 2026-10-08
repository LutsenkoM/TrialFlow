import gsap from 'gsap'
import { Graphics, type Container } from 'pixi.js'
import { WORLD, layout } from '../core/layout'
import type { CameraController } from './CameraController'

/**
 * First-load sequence: zone line-work draws in left → right behind a growing mask, the
 * starfield fades up and the camera eases out from the screening zone into the home view.
 */
export class IntroDirector {
  private readonly timeline = gsap.timeline()
  private readonly mask = new Graphics()
  private readonly reveal = { x: 0 }
  private readonly targets: Container[]
  private readonly ambient: Container

  constructor(
    world: Container,
    targets: Container[],
    ambient: Container,
    camera: CameraController,
  ) {
    this.targets = targets
    this.ambient = ambient
    world.addChild(this.mask)
    for (const t of targets) {
      t.mask = this.mask
      t.alpha = 0
    }
    ambient.alpha = 0
    this.drawMask()

    const home = camera.computeHome()
    camera.home()
    camera.jumpTo(layout.screening.x + 300, layout.screening.y, home.scale * 1.9)

    this.timeline
      .to(ambient, { alpha: 1, duration: 1.2, ease: 'power2.out' }, 0)
      .to(targets, { alpha: 1, duration: 0.8, ease: 'power2.out', stagger: 0.15 }, 0.2)
      .to(
        this.reveal,
        { x: 1, duration: 1.9, ease: 'power2.inOut', onUpdate: () => this.drawMask() },
        0.2,
      )
      .call(() => camera.flyTo(home.x, home.y, home.scale, 2.2), [], 0.35)
  }

  private drawMask() {
    const x = -WORLD.width * 0.2 + this.reveal.x * WORLD.width * 1.6
    this.mask
      .clear()
      .rect(-WORLD.width, -WORLD.height, WORLD.width + x, WORLD.height * 3)
      .fill(0xffffff)
  }

  /** Jump to the end state (skip or natural finish). */
  finish() {
    this.timeline.progress(1).kill()
    for (const t of this.targets) {
      t.mask = null
      t.alpha = 1
    }
    this.ambient.alpha = 1
    this.mask.destroy()
  }
}
