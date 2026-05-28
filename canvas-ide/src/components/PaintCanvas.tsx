import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'

// ── Colour helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  if (!hex || hex.length < 7) return [0, 0, 0]
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

// ── Paint algorithms ──────────────────────────────────────────────────────────

/**
 * Watercolor: scatter many translucent bristle dabs with a wet-edge ring.
 * Each dab has slight per-bristle colour jitter so successive strokes create
 * the characteristic granular / bloomy look of real watercolour.
 */
function paintWatercolor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  color: string, opacity: number,
) {
  const [r, g, b] = hexToRgb(color)
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'

  // Bristle dabs scattered around the centre
  const bristles = Math.max(6, Math.floor(size * 0.6))
  for (let i = 0; i < bristles; i++) {
    const angle  = (i / bristles) * Math.PI * 2 + Math.random() * 0.8
    const spread = size * 0.48 * Math.sqrt(Math.random())
    const bx     = x + Math.cos(angle) * spread
    const by     = y + Math.sin(angle) * spread
    const br     = size * (0.22 + Math.random() * 0.32)

    // Slight per-bristle colour variation
    const rv = Math.max(0, Math.min(255, r + ((Math.random() - 0.5) * 24) | 0))
    const gv = Math.max(0, Math.min(255, g + ((Math.random() - 0.5) * 24) | 0))
    const bv = Math.max(0, Math.min(255, b + ((Math.random() - 0.5) * 24) | 0))

    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br)
    grad.addColorStop(0,   `rgba(${rv},${gv},${bv},${opacity * 0.14})`)
    grad.addColorStop(0.55,`rgba(${rv},${gv},${bv},${opacity * 0.07})`)
    grad.addColorStop(1,   `rgba(${rv},${gv},${bv},0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(bx, by, br, 0, Math.PI * 2)
    ctx.fill()
  }

  // Wet-edge darkening ring — paint "pools" at the outer boundary
  const edge = ctx.createRadialGradient(x, y, size * 0.6, x, y, size * 1.1)
  edge.addColorStop(0, `rgba(${r},${g},${b},0)`)
  edge.addColorStop(1, `rgba(${r},${g},${b},${opacity * 0.13})`)
  ctx.fillStyle = edge
  ctx.beginPath()
  ctx.arc(x, y, size * 1.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

/**
 * Oil paint: pixel-level colour blending using getImageData / putImageData.
 *
 * Key behaviours:
 *   • First stroke on a blank canvas  → full, vibrant colour (≈85% coverage)
 *   • Painting over existing paint    → picks up ≈25% of the colour underneath
 *                                        and blends it with the new colour
 *   • Repeated strokes in same spot   → builds opacity toward fully opaque
 *
 * NOTE: the canvas context MUST be created with { willReadFrequently: true }
 * (done below) otherwise Chrome may discard the CPU buffer between calls,
 * causing getImageData to return stale zeroes and silently erase your work.
 */
function paintOil(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  x: number, y: number, size: number,
  color: string, opacity: number,
) {
  const [nr, ng, nb] = hexToRgb(color)
  const r  = Math.ceil(size)
  const sx = Math.max(0, Math.floor(x - r))
  const sy = Math.max(0, Math.floor(y - r))
  const ex = Math.min(canvas.width,  Math.ceil(x + r))
  const ey = Math.min(canvas.height, Math.ceil(y + r))
  const w  = ex - sx, h = ey - sy
  if (w <= 0 || h <= 0) return

  let imgData: ImageData
  try { imgData = ctx.getImageData(sx, sy, w, h) }
  catch { return }   // tainted canvas — skip silently
  const d = imgData.data

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const ddx  = sx + px - x, ddy = sy + py - y
      const dist = Math.sqrt(ddx * ddx + ddy * ddy)
      if (dist > r) continue

      // Smooth-step S-curve (1 at centre → 0 at edge)
      const tt = 1 - dist / r
      const ss = tt * tt * (3 - 2 * tt)

      const idx = (py * w + px) * 4

      // How saturated the existing paint is (0 = fresh canvas, 1 = fully painted)
      const existAlpha = d[idx + 3] / 255

      // Pick up a fraction of whatever colour is already there
      const pickUp  = existAlpha * 0.25
      const mixedR  = Math.round(nr * (1 - pickUp) + d[idx]     * pickUp)
      const mixedG  = Math.round(ng * (1 - pickUp) + d[idx + 1] * pickUp)
      const mixedB  = Math.round(nb * (1 - pickUp) + d[idx + 2] * pickUp)

      // Layer the blended paint over the existing pixel — strong coverage
      const cover = opacity * ss
      d[idx]     = Math.round(d[idx]     * (1 - cover) + mixedR * cover)
      d[idx + 1] = Math.round(d[idx + 1] * (1 - cover) + mixedG * cover)
      d[idx + 2] = Math.round(d[idx + 2] * (1 - cover) + mixedB * cover)
      d[idx + 3] = Math.min(255, d[idx + 3] + Math.round(ss * opacity * 220))
    }
  }

  ctx.putImageData(imgData, sx, sy)

  // Specular highlight gleam (impasto sheen)
  const hx = x - r * 0.3, hy = y - r * 0.3, hr = r * 0.3
  const shine = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr)
  shine.addColorStop(0, `rgba(255,255,255,${opacity * 0.42})`)
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save()
  ctx.fillStyle = shine
  ctx.beginPath()
  ctx.arc(hx, hy, hr, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * Acrylic: thick opaque dabs with visible bristle texture streaks.
 * High coverage, minimal colour mixing — like paint straight from a tube.
 */
function paintAcrylic(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  color: string, opacity: number,
) {
  const [r, g, b] = hexToRgb(color)
  ctx.save()

  // Opaque flat core
  const grad = ctx.createRadialGradient(x, y, 0, x, y, size)
  grad.addColorStop(0,    `rgba(${r},${g},${b},${opacity * 0.92})`)
  grad.addColorStop(0.72, `rgba(${r},${g},${b},${opacity * 0.78})`)
  grad.addColorStop(1,    `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.fill()

  // Bristle texture streaks (lighter, drawn across the dab)
  const lr = Math.min(255, r + 42), lg = Math.min(255, g + 42), lb = Math.min(255, b + 42)
  ctx.globalAlpha = opacity * 0.28
  ctx.lineWidth   = size * 0.1
  ctx.lineCap     = 'round'
  for (let i = 0; i < 3; i++) {
    const ang = Math.random() * Math.PI
    const len = size * (0.55 + Math.random() * 0.45)
    ctx.strokeStyle = `rgb(${lr},${lg},${lb})`
    ctx.beginPath()
    ctx.moveTo(x - Math.cos(ang) * len * 0.5, y - Math.sin(ang) * len * 0.5)
    ctx.lineTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Ink wash: calligraphic strokes where fast movement produces lighter marks,
 * slow deliberate strokes lay down dense ink — mimics a loaded ink brush.
 * A feathered outer halo gives the "wash" effect.
 */
function paintInkwash(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  color: string, speed: number, opacity: number,
) {
  const [r, g, b] = hexToRgb(color)
  // speed is px/ms — slow ≈ 0 → full opacity; fast > 4 → very light
  const speedFactor = Math.max(0.07, 1 / (1 + speed * 1.4))
  const inkOpacity  = opacity * speedFactor

  ctx.save()

  // Dense ink core (sharp centre)
  const core = ctx.createRadialGradient(x, y, 0, x, y, size * 0.7)
  core.addColorStop(0, `rgba(${r},${g},${b},${inkOpacity * 0.75})`)
  core.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(x, y, size * 0.7, 0, Math.PI * 2)
  ctx.fill()

  // Soft wash halo
  const halo = ctx.createRadialGradient(x, y, size * 0.4, x, y, size * 1.4)
  halo.addColorStop(0, `rgba(${r},${g},${b},${inkOpacity * 0.28})`)
  halo.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, size * 1.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PaintCanvas({
  screenId,
  initialData,
  deviceWidth,
  deviceHeight,
}: {
  screenId: string
  initialData: string | undefined
  deviceWidth: number
  deviceHeight: number
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  // Cache the context with willReadFrequently:true so Chrome never discards the
  // CPU-side pixel buffer between getImageData calls (which would return stale
  // zeros and silently erase the oil-brush strokes).
  const ctxRef     = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawing  = useRef(false)
  const lastPt     = useRef<{ x: number; y: number } | null>(null)
  const lastTime   = useRef(0)
  const lastSpeed  = useRef(0)

  /** Return (or lazily create) the 2D context with willReadFrequently set. */
  function getCtx(): CanvasRenderingContext2D | null {
    if (ctxRef.current) return ctxRef.current
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) ctxRef.current = ctx
    return ctx
  }

  // Reload stored paint whenever the active screen changes
  useEffect(() => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (initialData) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = initialData
    }
  // Intentionally only depends on screenId — we don't want to re-draw on every
  // save (which would flicker); the canvas already has the latest state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId])

  function getCanvasPt(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  /** Interpolate and paint from one point to the next along the stroke path. */
  function applyPaint(fromX: number, fromY: number, toX: number, toY: number) {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    const { drawTool: tool, drawColor: color, drawWidth: size, drawOpacity: opacity } = useStore.getState()

    const dx   = toX - fromX, dy = toY - fromY
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
    // step every ~15% of brush radius so strokes are always smooth regardless of speed
    const step  = Math.max(1, size * 0.15)
    const steps = Math.ceil(dist / step)

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps
      const x = fromX + dx * t
      const y = fromY + dy * t
      if      (tool === 'watercolor') paintWatercolor(ctx, x, y, size, color, opacity)
      else if (tool === 'oil')        paintOil(ctx, canvas, x, y, size, color, opacity)
      else if (tool === 'acrylic')    paintAcrylic(ctx, x, y, size, color, opacity)
      else if (tool === 'inkwash')    paintInkwash(ctx, x, y, size, color, lastSpeed.current, opacity)
    }
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation()
    useStore.getState()._pushHistory()   // allow undo
    isDrawing.current = true
    const pt = getCanvasPt(e)
    lastPt.current    = pt
    lastTime.current  = Date.now()
    lastSpeed.current = 0
    applyPaint(pt.x, pt.y, pt.x, pt.y) // single dab on click
    e.currentTarget.setPointerCapture(e.pointerId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPt.current) return
    const pt  = getCanvasPt(e)
    const now = Date.now()
    const dt  = Math.max(1, now - lastTime.current)
    const dx  = pt.x - lastPt.current.x, dy = pt.y - lastPt.current.y
    lastSpeed.current = Math.sqrt(dx * dx + dy * dy) / dt
    lastTime.current  = now
    applyPaint(lastPt.current.x, lastPt.current.y, pt.x, pt.y)
    lastPt.current = pt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false
    lastPt.current    = null
    const canvas = canvasRef.current
    if (!canvas) return
    // Persist the painted state into the store (use existing ctx — avoids
    // creating a new one without willReadFrequently)
    const dataUrl = canvas.toDataURL('image/png')
    useStore.getState().setPaintCanvas(screenId, dataUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId])

  return (
    <canvas
      ref={canvasRef}
      width={deviceWidth}
      height={deviceHeight}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        cursor: 'crosshair', touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  )
}
