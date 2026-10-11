import type { Scenery } from './gameRun'
import { paintFrame, paintPlate } from './gameView'
import { PAPER, Screens } from './look'
import { fit, type Fit } from './stage'

// The game on a real canvas. The Mount owns the canvas and its size; this
// keeps the plate (everything still, painted once for a size of surface) and
// the dot screens made for that size, stamps the plate once a frame, and draws
// what moves on top. One full-surface composite a frame, and no more.

export class GameCanvas {
  private plate: HTMLCanvasElement | null = null
  private screens: Screens | null = null
  private key = ''
  private by: Fit = fit(1, 1)

  /** Draws one frame on the canvas as it is sized now, or the bare page while there is no game yet. Returns the figures drawn, the stamp of the plate included. */
  draw(canvas: HTMLCanvasElement, scenery: Scenery | null): number {
    const ctx = canvas.getContext('2d')
    if (!ctx || canvas.width <= 0 || canvas.height <= 0) return 0
    const key = `${canvas.width}x${canvas.height}`
    if (!this.plate || !this.screens || this.key !== key) {
      // A new size or pixel ratio: the page is fitted again, and the dots and the plate are made again at that density.
      const plate = document.createElement('canvas')
      plate.width = canvas.width
      plate.height = canvas.height
      const to = plate.getContext('2d')
      if (!to) return 0
      this.by = fit(canvas.width, canvas.height)
      this.screens = new Screens(this.by.k)
      to.fillStyle = PAPER
      to.fillRect(0, 0, plate.width, plate.height)
      to.setTransform(this.by.k, 0, 0, this.by.k, this.by.ox, this.by.oy)
      paintPlate(to, this.screens)
      this.plate = plate
      this.key = key
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.plate, 0, 0)
    if (!scenery) return 1
    ctx.setTransform(this.by.k, 0, 0, this.by.k, this.by.ox, this.by.oy)
    const drawn = paintFrame(ctx, this.screens, scenery)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return drawn + 1
  }
}
