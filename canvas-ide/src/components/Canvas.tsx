import { useRef, useState, useCallback, memo, useEffect } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useStore, selectElements } from '../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import { useUITheme } from '../hooks/useUITheme'
import { ElementRenderer } from './ElementRenderer'
import { PaintCanvas } from './PaintCanvas'
import { DEVICE_SIZES, getDeviceSpec } from '../data/devices'
import type { CanvasElement, DeviceType } from '../types'

const PAINT_TOOLS = new Set(['watercolor', 'oil', 'acrylic', 'inkwash'])

// Module-level constants — defined once, never re-created
const INLINE_EDITABLE = new Set(['button', 'heading', 'text', 'badge', 'toggle', 'input'])
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]

// ─── Drawing helpers (module-level, no React deps) ────────────────────────────
type Pt = { x: number; y: number }
const f = (n: number) => n.toFixed(1)

/** Remove redundant points closer than `tol` px to keep paths lean */
function simplifyPts(pts: Pt[], tol = 2): Pt[] {
  if (pts.length <= 2) return pts
  const out: Pt[] = [pts[0]]
  let prev = pts[0]
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]
    if ((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2 >= tol * tol) { out.push(p); prev = p }
  }
  out.push(pts[pts.length - 1])
  return out
}

/** Catmull-Rom → cubic Bézier (smooth pen / marker) */
function catmullRom(pts: Pt[]): string {
  if (pts.length < 2) return ''
  if (pts.length === 2) return `M${f(pts[0].x)},${f(pts[0].y)} L${f(pts[1].x)},${f(pts[1].y)}`
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2.x)},${f(p2.y)}`
  }
  return d
}

/** Raw polyline with slight jitter — sketchy pencil feel */
function pencilPath(pts: Pt[]): string {
  return pts.map((p, i) => {
    const j = i > 0 && i < pts.length - 1 ? 1.5 : 0
    return `${i === 0 ? 'M' : 'L'}${f(p.x + (Math.random() - 0.5) * j)},${f(p.y + (Math.random() - 0.5) * j)}`
  }).join(' ')
}

/** Arrow path: shaft + two-sided head */
function arrowPath(s: Pt, e: Pt, headSize: number): string {
  const angle = Math.atan2(e.y - s.y, e.x - s.x)
  const a1 = angle - 2.4, a2 = angle + 2.4
  const h1x = e.x + headSize * Math.cos(a1), h1y = e.y + headSize * Math.sin(a1)
  const h2x = e.x + headSize * Math.cos(a2), h2y = e.y + headSize * Math.sin(a2)
  return `M${f(s.x)},${f(s.y)} L${f(e.x)},${f(e.y)} M${f(h1x)},${f(h1y)} L${f(e.x)},${f(e.y)} L${f(h2x)},${f(h2y)}`
}

/** Ellipse via 4-arc Bézier approximation (k ≈ 0.5523) */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  if (rx < 0.5 || ry < 0.5) return ''
  const k = 0.5523
  return (
    `M${f(cx)},${f(cy - ry)}` +
    ` C${f(cx + rx * k)},${f(cy - ry)} ${f(cx + rx)},${f(cy - ry * k)} ${f(cx + rx)},${f(cy)}` +
    ` C${f(cx + rx)},${f(cy + ry * k)} ${f(cx + rx * k)},${f(cy + ry)} ${f(cx)},${f(cy + ry)}` +
    ` C${f(cx - rx * k)},${f(cy + ry)} ${f(cx - rx)},${f(cy + ry * k)} ${f(cx - rx)},${f(cy)}` +
    ` C${f(cx - rx)},${f(cy - ry * k)} ${f(cx - rx * k)},${f(cy - ry)} ${f(cx)},${f(cy - ry)} Z`
  )
}

/** Snap angle to nearest 45° for line/arrow Shift-constraint */
function snapAngle(s: Pt, e: Pt): Pt {
  const angle = Math.atan2(e.y - s.y, e.x - s.x)
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
  const dist = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2)
  return { x: s.x + Math.cos(snapped) * dist, y: s.y + Math.sin(snapped) * dist }
}

/** Get canvas-space coordinates from a pointer event (accounts for device scale + zoom) */
function getCanvasPt(e: React.PointerEvent<HTMLDivElement>): Pt {
  const { devicePreset, zoom } = useStore.getState()
  const scale = getDeviceSpec(devicePreset).scale * zoom
  const rect = e.currentTarget.getBoundingClientRect()
  return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
}

/** Scatter dots around a centre point for the spray/airbrush tool */
function sprayDots(center: Pt, radius: number, count = 8): string {
  let d = ''
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * radius   // sqrt = even circular distribution
    const x = center.x + Math.cos(angle) * r
    const y = center.y + Math.sin(angle) * r
    // Tiny line rendered as filled dot via round linecap
    d += `M${f(x)},${f(y)} L${f(x + 0.01)},${f(y)} `
  }
  return d
}

/** 5-point star centred at (cx,cy) */
function starPath(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    pts.push(`${i === 0 ? 'M' : 'L'}${f(cx + Math.cos(angle) * r)},${f(cy + Math.sin(angle) * r)}`)
  }
  return pts.join(' ') + ' Z'
}

/** Isoceles triangle: tip top-centre, base at bottom */
function trianglePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2
  return `M${f(mx)},${f(y1)} L${f(x2)},${f(y2)} L${f(x1)},${f(y2)} Z`
}

interface LiveShape { tool: 'line' | 'arrow' | 'rect' | 'ellipse' | 'star' | 'triangle'; x1: number; y1: number; x2: number; y2: number }

// ─── DraggableElement ────────────────────────────────────────────────────────
// Memoized so it only re-renders when its own props change.
// Store access is intentionally via getState() inside event handlers
// to avoid subscribing (and re-rendering) on unrelated state changes.
const DraggableElement = memo(function DraggableElement({
  element,
  device,
  devicePreset,
  zoom,
  isSelected,
  isInMultiSelect,
}: {
  element: CanvasElement
  device: DeviceType
  devicePreset: string
  zoom: number
  isSelected: boolean
  isInMultiSelect: boolean
}) {
  const [editing, setEditing] = useState(false)
  const isLocked = !!element.locked

  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: element.id,
    data: { type: 'ELEMENT', elementId: element.id },
    disabled: isLocked,
  })

  const tx = transform?.x ?? 0
  const ty = transform?.y ?? 0

  const textValue =
    element.props.label ?? element.props.text ?? element.props.placeholder ?? ''

  function commitEdit(val: string) {
    setEditing(false)
    const { updateElementProps } = useStore.getState()
    if (element.type === 'button' || element.type === 'badge' || element.type === 'toggle') {
      updateElementProps(element.id, { label: val })
    } else if (element.type === 'text' || element.type === 'heading') {
      updateElementProps(element.id, { text: val })
    } else if (element.type === 'input') {
      updateElementProps(element.id, { placeholder: val })
    }
  }

  // isInMultiSelect is true only when 2+ elements are selected and this is one of them
  const selectionColor = isInMultiSelect ? 'rgba(99,102,241,0.6)' : '#6366f1'
  const selectionStyle =
    isSelected || isInMultiSelect
      ? { outline: `2px solid ${selectionColor}`, outlineOffset: '1px' }
      : {}
  const lockedStyle =
    isLocked && isSelected
      ? { outline: '2px dashed rgba(99,102,241,0.4)', outlineOffset: '1px' }
      : {}

  return (
    <div
      ref={setNodeRef}
      {...(editing ? {} : listeners)}
      {...attributes}
      className={`canvas-element${isSelected ? ' selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        useStore.getState().selectElement(element.id, e.shiftKey)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (INLINE_EDITABLE.has(element.type)) setEditing(true)
      }}
      style={{
        position: 'absolute',
        left: element.x + tx,
        top: element.y + ty,
        width: element.width,
        height: element.height,
        cursor: editing ? 'text' : isLocked ? 'default' : isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.6 : element.hidden ? 0.25 : 1,
        userSelect: 'none',
        touchAction: 'none',
        zIndex: isSelected ? 10 : 1,
        ...selectionStyle,
        ...lockedStyle,
      }}
    >
      {editing && INLINE_EDITABLE.has(element.type) ? (
        <input
          autoFocus
          defaultValue={textValue}
          onBlur={(e) => commitEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit((e.target as HTMLInputElement).value)
            if (e.key === 'Escape') setEditing(false)
          }}
          style={{
            width: '100%', height: '100%',
            background: 'rgba(255,255,255,0.95)',
            border: '2px solid #6366f1', borderRadius: 6,
            padding: '0 10px', fontSize: element.props.fontSize ?? 15,
            fontFamily: 'Inter, sans-serif', color: '#111',
            outline: 'none', textAlign: 'center',
          }}
        />
      ) : (
        <ElementRenderer element={element} />
      )}

      {/* Transparent overlay for iframe-based elements (map, video with a URL set).
          The iframe eats all pointer events into its own document, so without this
          overlay clicking on a map/video in the editor never selects it. */}
      {(element.type === 'map' || element.type === 'video') && !editing && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: isLocked ? 'default' : isDragging ? 'grabbing' : 'grab' }} />
      )}

      {/* Resize handles — all 8 directions for the primary selected element */}
      {isSelected && !isLocked && (
        <ResizeHandles element={element} devicePreset={devicePreset} zoom={zoom} />
      )}
    </div>
  )
})

// ─── Canvas ──────────────────────────────────────────────────────────────────
export function Canvas() {
  const {
    device, devicePreset, selectedId, selectedIds, selectElement,
    screens, activeScreenId, snapToGrid, zoom, setZoom,
    drawMode, drawTool, drawColor, drawWidth, drawFill,
    drawGradientEnabled, drawGradientColor2, drawGradientAngle,
    drawOpacity, drawBlendMode, drawGlow,
  } = useStore(useShallow((s) => ({
    device: s.device,
    devicePreset: s.devicePreset,
    selectedId: s.selectedId,
    selectedIds: s.selectedIds,
    selectElement: s.selectElement,
    screens: s.screens,
    activeScreenId: s.activeScreenId,
    snapToGrid: s.snapToGrid,
    zoom: s.zoom,
    setZoom: s.setZoom,
    drawMode: s.drawMode,
    drawTool: s.drawTool,
    drawColor: s.drawColor,
    drawWidth: s.drawWidth,
    drawFill: s.drawFill,
    drawGradientEnabled: s.drawGradientEnabled,
    drawGradientColor2: s.drawGradientColor2,
    drawGradientAngle: s.drawGradientAngle,
    drawOpacity: s.drawOpacity,
    drawBlendMode: s.drawBlendMode,
    drawGlow: s.drawGlow,
  })))

  const elements = useStore(selectElements)
  const canvasRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const size = getDeviceSpec(devicePreset)
  const t = useUITheme()
  const activeScreen = screens.find((s) => s.id === activeScreenId)
  const canvasBg = activeScreen?.background ?? '#faf8f5'

  // ── Draw tool state ────────────────────────────────────────────────────────
  const isDrawingRef   = useRef(false)
  const drawPointsRef  = useRef<Pt[]>([])
  const drawStartPtRef = useRef<Pt | null>(null)
  const sprayPathRef   = useRef('')          // accumulated spray dot path
  const [livePathD, setLivePathD] = useState('')
  const [liveShape, setLiveShape] = useState<LiveShape | null>(null)

  // Reset all draw state when mode turns off or tool changes
  useEffect(() => {
    isDrawingRef.current = false
    drawPointsRef.current = []
    drawStartPtRef.current = null
    setLivePathD('')
    setLiveShape(null)
  }, [drawMode, drawTool])

  // Non-passive wheel listener on the scroll div so Ctrl+scroll zooms instead of scrolling
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        const { zoom: z, setZoom: sz } = useStore.getState()
        sz(z + (e.deltaY > 0 ? -0.08 : 0.08))
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const FREEHAND_TOOLS = new Set(['pen', 'pencil', 'marker', 'highlighter', 'neon', 'spray'])

  const handleDrawStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    isDrawingRef.current = true
    const pt = getCanvasPt(e)
    const { drawTool: tool, drawWidth: sw } = useStore.getState()

    if (tool === 'spray') {
      sprayPathRef.current = ''
      const dots = sprayDots(pt, Math.max(8, sw * 2))
      sprayPathRef.current = dots
      setLivePathD(dots)
    } else if (FREEHAND_TOOLS.has(tool)) {
      drawPointsRef.current = [pt]
      setLivePathD(`M${f(pt.x)},${f(pt.y)}`)
    } else {
      drawStartPtRef.current = pt
      setLiveShape({ tool: tool as LiveShape['tool'], x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y })
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDrawMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return
    const pt = getCanvasPt(e)
    const { drawTool: tool, drawWidth: sw } = useStore.getState()

    if (tool === 'spray') {
      const dots = sprayDots(pt, Math.max(8, sw * 2))
      sprayPathRef.current += dots
      setLivePathD(sprayPathRef.current)
    } else if (tool === 'pen' || tool === 'pencil' || tool === 'marker' || tool === 'highlighter' || tool === 'neon') {
      drawPointsRef.current.push(pt)
      setLivePathD((d) => `${d} L${f(pt.x)},${f(pt.y)}`)
    } else {
      const start = drawStartPtRef.current
      if (!start) return
      let x2 = pt.x, y2 = pt.y
      if (e.shiftKey) {
        if (tool === 'rect' || tool === 'ellipse') {
          const dx = pt.x - start.x, dy = pt.y - start.y
          const sz = Math.max(Math.abs(dx), Math.abs(dy))
          x2 = start.x + Math.sign(dx) * sz
          y2 = start.y + Math.sign(dy) * sz
        } else {
          const snapped = snapAngle(start, pt)
          x2 = snapped.x; y2 = snapped.y
        }
      }
      setLiveShape({ tool: tool as LiveShape['tool'], x1: start.x, y1: start.y, x2, y2 })
    }
  }, [])

  const handleDrawEnd = useCallback((e?: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const state = useStore.getState()
    const { drawTool: tool, drawColor: color, drawWidth: sw, drawFill: fill, drawOpacity: opacity,
            drawBlendMode: blendMode, drawGlow: glow,
            drawGradientEnabled: gradEnabled, drawGradientColor2: gradColor2, drawGradientAngle: gradAngle } = state
    const gradientFill = gradEnabled && fill ? { color2: gradColor2, angle: gradAngle } : undefined
    const pad = sw + 4 + glow * 2

    // ── Spray / airbrush ──────────────────────────────────────────────────────
    if (tool === 'spray') {
      const accumulated = sprayPathRef.current
      sprayPathRef.current = ''
      setLivePathD('')
      if (!accumulated) return
      // Bounding box from the live path string (parse all coordinates)
      const nums = accumulated.match(/-?\d+\.?\d*/g)?.map(Number) ?? []
      const xs = nums.filter((_, i) => i % 2 === 0)
      const ys = nums.filter((_, i) => i % 2 === 1)
      if (xs.length === 0) return
      const minX = Math.min(...xs), minY = Math.min(...ys)
      const maxX = Math.max(...xs), maxY = Math.max(...ys)
      const elX = Math.max(0, minX - pad), elY = Math.max(0, minY - pad)
      const elW = Math.max(20, maxX - minX + pad * 2)
      const elH = Math.max(20, maxY - minY + pad * 2)
      // Translate path to element-local coords
      const pathData = accumulated.replace(
        /([ML])([-\d.]+),([-\d.]+)/g,
        (_, cmd, x, y) => `${cmd}${f(+x - elX)},${f(+y - elY)}`
      )
      const dotSize = Math.max(2, sw * 0.4)
      state.addElement('draw', elX, elY, elW, elH, {
        pathData, strokeColor: color, strokeWidth: dotSize,
        fillColor: 'none', opacity,
        strokeLinecap: 'round',
        blendMode: blendMode !== 'normal' ? blendMode : undefined,
        glowRadius: glow > 0 ? glow : undefined,
      })

    // ── Freehand (pen / pencil / marker / highlighter / neon) ────────────────
    } else if (tool === 'pen' || tool === 'pencil' || tool === 'marker' || tool === 'highlighter' || tool === 'neon') {
      const raw = drawPointsRef.current
      drawPointsRef.current = []
      setLivePathD('')
      const pts = simplifyPts(raw)
      if (pts.length < 2) return

      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
      const minX = Math.min(...xs), minY = Math.min(...ys)
      const maxX = Math.max(...xs), maxY = Math.max(...ys)
      const elX = Math.max(0, minX - pad), elY = Math.max(0, minY - pad)
      const elW = Math.max(20, maxX - minX + pad * 2)
      const elH = Math.max(20, maxY - minY + pad * 2)

      const rel = pts.map((p) => ({ x: p.x - elX, y: p.y - elY }))
      const pathData = tool === 'pencil' ? pencilPath(rel) : catmullRom(rel)

      // Tool-specific defaults
      const linecap: 'round' | 'square' | 'butt' =
        tool === 'marker' || tool === 'highlighter' ? 'square' : 'round'
      const effectBlend = tool === 'highlighter' ? 'multiply' : blendMode !== 'normal' ? blendMode : undefined
      const effectGlow  = tool === 'neon' && glow === 0 ? 6 : glow > 0 ? glow : undefined

      state.addElement('draw', elX, elY, elW, elH, {
        pathData, strokeColor: color, strokeWidth: sw,
        fillColor: fill || 'none', opacity, strokeLinecap: linecap,
        blendMode: effectBlend,
        glowRadius: effectGlow,
      })
    } else {
      const shape = liveShape ?? (() => {
        // read synchronously from ref if state update hasn't flushed
        const start = drawStartPtRef.current
        if (!start || !e) return null
        const pt = getCanvasPt(e)
        return { tool: tool as LiveShape['tool'], x1: start.x, y1: start.y, x2: pt.x, y2: pt.y }
      })()
      drawStartPtRef.current = null
      setLiveShape(null)
      if (!shape) return

      const { x1, y1, x2, y2 } = shape
      if (Math.abs(x2 - x1) < 3 && Math.abs(y2 - y1) < 3) return   // click with no drag

      const minX = Math.min(x1, x2), minY = Math.min(y1, y2)
      const maxX = Math.max(x1, x2), maxY = Math.max(y1, y2)
      const elX = Math.max(0, minX - pad), elY = Math.max(0, minY - pad)
      const elW = Math.max(20, maxX - minX + pad * 2)
      const elH = Math.max(20, maxY - minY + pad * 2)

      let pathData = ''
      if (tool === 'line') {
        pathData = `M${f(x1 - elX)},${f(y1 - elY)} L${f(x2 - elX)},${f(y2 - elY)}`
      } else if (tool === 'arrow') {
        const headSize = sw * 4 + 10
        pathData = arrowPath({ x: x1 - elX, y: y1 - elY }, { x: x2 - elX, y: y2 - elY }, headSize)
      } else if (tool === 'rect') {
        const iw = maxX - minX, ih = maxY - minY
        pathData = `M${pad},${pad} H${f(pad + iw)} V${f(pad + ih)} H${pad} Z`
      } else if (tool === 'ellipse') {
        const iw = maxX - minX, ih = maxY - minY
        pathData = ellipsePath(pad + iw / 2, pad + ih / 2, iw / 2, ih / 2)
      } else if (tool === 'star') {
        const iw = maxX - minX, ih = maxY - minY
        const outerR = Math.min(iw, ih) / 2
        pathData = starPath(pad + iw / 2, pad + ih / 2, outerR, outerR * 0.4)
      } else if (tool === 'triangle') {
        const iw = maxX - minX, ih = maxY - minY
        pathData = trianglePath(pad, pad, pad + iw, pad + ih)
      }

      state.addElement('draw', elX, elY, elW, elH, {
        pathData, strokeColor: color, strokeWidth: sw,
        fillColor: fill || 'none', opacity, strokeLinecap: 'round',
        blendMode: blendMode !== 'normal' ? blendMode : undefined,
        glowRadius: glow > 0 ? glow : undefined,
        fillGradient: gradientFill,
      })
    }
  // liveShape needed so the shape-tool branch can fall back to it
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveShape])

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' })

  const stepZoom = useCallback((dir: 1 | -1) => {
    const cur = useStore.getState().zoom
    if (dir === 1) {
      const next = ZOOM_STEPS.find((z) => z > cur + 0.01)
      setZoom(next ?? 3)
    } else {
      const prev = [...ZOOM_STEPS].reverse().find((z) => z < cur - 0.01)
      setZoom(prev ?? 0.25)
    }
  }, [setZoom])

  return (
    <div
      style={{
        flex: 1, background: t.bgApp, position: 'relative', overflow: 'hidden',
      }}
      onClick={() => selectElement(null)}
    >
      {/* Scrollable zoom area — allows panning when zoomed beyond viewport */}
      <div ref={scrollRef} style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      {/* Centering wrapper — centers device when it fits; lets it overflow + scroll when zoomed */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: '100%', minHeight: '100%',
        padding: '60px', boxSizing: 'border-box', position: 'relative',
      }}>
      {/* Dot/grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: snapToGrid
          ? `linear-gradient(${t.dotGrid} 1px, transparent 1px), linear-gradient(90deg, ${t.dotGrid} 1px, transparent 1px)`
          : `radial-gradient(circle, ${t.dotGrid} 1px, transparent 1px)`,
        backgroundSize: snapToGrid ? '8px 8px' : '28px 28px',
        opacity: snapToGrid ? 0.5 : 1,
        pointerEvents: 'none',
      }} />

      {/* Device chrome */}
      <div
        className="device-frame"
        style={{
          position: 'relative',
          transform: `scale(${size.scale * zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {device === 'phone' && (
          <div style={{
            position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
            width: 120, height: 28, background: '#1a1a2e',
            borderRadius: '0 0 20px 20px', zIndex: 20,
          }} />
        )}

        <div style={{
          width: size.width, height: size.height,
          borderRadius: device === 'phone' ? 40 : device === 'tablet' ? 24 : 8,
          border: `2px solid ${t.deviceBorder}`,
          boxShadow: t.deviceShadow,
          background: '#fff', overflow: 'hidden', position: 'relative',
        }}>
          <div
            ref={(node) => {
              setNodeRef(node)
              ;(canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node
            }}
            id="canvas-drop-zone"
            style={{
              position: 'absolute', inset: 0,
              background: isOver ? 'rgba(99,102,241,0.04)' : canvasBg,
              transition: 'background 0.15s',
            }}
          >
            {elements.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 36, opacity: 0.3 }}>✦</div>
                <div style={{ fontSize: 14, color: t.canvasEmpty, textAlign: 'center', lineHeight: 1.6 }}>
                  Drag pieces from the left<br />to start building
                </div>
              </div>
            )}
            {/* ── Persistent paint layer — shown below UI elements at all times ── */}
            {activeScreen?.paintCanvas && !(drawMode && PAINT_TOOLS.has(drawTool)) && (
              <img
                src={activeScreen.paintCanvas}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
                alt=""
              />
            )}

            {elements.map((el) => (
              <DraggableElement
                key={el.id}
                element={el}
                device={device}
                devicePreset={devicePreset}
                zoom={zoom}
                isSelected={selectedId === el.id}
                isInMultiSelect={selectedIds.length > 1 && selectedIds.includes(el.id)}
              />
            ))}

            {/* ── Draw overlay — sits above all elements when draw mode is active ── */}
            {drawMode && (
              <div
                style={{
                  position: 'absolute', inset: 0,
                  cursor: PAINT_TOOLS.has(drawTool) ? 'none' : 'crosshair',
                  zIndex: 200, touchAction: 'none',
                }}
                {...(PAINT_TOOLS.has(drawTool) ? {} : {
                  onPointerDown: handleDrawStart,
                  onPointerMove: handleDrawMove,
                  onPointerUp: handleDrawEnd,
                  onPointerLeave: handleDrawEnd,
                })}
              >
                {/* Paint-tool canvas (pixel-based blending) */}
                {PAINT_TOOLS.has(drawTool) && (
                  <PaintCanvas
                    screenId={activeScreenId}
                    initialData={activeScreen?.paintCanvas}
                    deviceWidth={size.width}
                    deviceHeight={size.height}
                  />
                )}

                {/* SVG overlay for vector drawing tools */}
                {!PAINT_TOOLS.has(drawTool) && (livePathD || liveShape) && (
                  <svg
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
                    fill="none"
                  >
                    {/* Gradient def for live shape preview */}
                    {drawGradientEnabled && drawFill && (
                      <defs>
                        <linearGradient id="live-grad" x1="0%" y1="50%" x2="100%" y2="50%"
                          gradientTransform={`rotate(${drawGradientAngle}, 0.5, 0.5)`}>
                          <stop offset="0%" stopColor={drawFill} />
                          <stop offset="100%" stopColor={drawGradientColor2} />
                        </linearGradient>
                      </defs>
                    )}
                    {/* Freehand preview — includes glow for neon tool */}
                    {livePathD && (
                      <>
                        {drawTool === 'neon' && (
                          <path
                            d={livePathD}
                            stroke={drawColor}
                            strokeWidth={drawWidth * 3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.35}
                            filter="blur(6px)"
                          />
                        )}
                        <path
                          d={livePathD}
                          stroke={drawColor}
                          strokeWidth={drawTool === 'highlighter' ? drawWidth : drawWidth}
                          strokeLinecap={drawTool === 'marker' || drawTool === 'highlighter' ? 'square' : 'round'}
                          strokeLinejoin="round"
                          opacity={drawOpacity}
                          style={{ mixBlendMode: drawTool === 'highlighter' ? 'multiply' : (drawBlendMode as React.CSSProperties['mixBlendMode']) }}
                        />
                      </>
                    )}
                    {/* Shape tool live preview */}
                    {liveShape && (() => {
                      const { tool, x1, y1, x2, y2 } = liveShape
                      const common = { stroke: drawColor, strokeWidth: drawWidth, opacity: drawOpacity }
                      const shapeFill = drawGradientEnabled && drawFill ? 'url(#live-grad)' : (drawFill || 'none')
                      if (tool === 'line') return (
                        <line x1={x1} y1={y1} x2={x2} y2={y2} {...common} strokeLinecap="round" />
                      )
                      if (tool === 'arrow') {
                        const headSize = drawWidth * 4 + 10
                        return (
                          <path d={arrowPath({ x: x1, y: y1 }, { x: x2, y: y2 }, headSize)}
                            {...common} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        )
                      }
                      if (tool === 'rect') {
                        const mx = Math.min(x1, x2), my = Math.min(y1, y2)
                        return (
                          <rect x={mx} y={my} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)}
                            {...common} fill={shapeFill} />
                        )
                      }
                      if (tool === 'ellipse') {
                        return (
                          <ellipse cx={(x1 + x2) / 2} cy={(y1 + y2) / 2}
                            rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2}
                            {...common} fill={shapeFill} />
                        )
                      }
                      if (tool === 'star') {
                        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2
                        const outerR = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2
                        return <path d={starPath(cx, cy, outerR, outerR * 0.4)} {...common} fill={shapeFill} />
                      }
                      if (tool === 'triangle') {
                        return <path d={trianglePath(x1, y1, x2, y2)} {...common} fill={shapeFill} />
                      }
                      return null
                    })()}
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: -32, left: '50%',
          transform: 'translateX(-50%)', fontSize: 12,
          color: t.deviceLabel, whiteSpace: 'nowrap',
        }}>
          {size.label} · {size.width}×{size.height}
        </div>
      </div>
      </div>{/* end centering wrapper */}
      </div>{/* end scroll area */}

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute', bottom: 18, right: 20,
          display: 'flex', alignItems: 'center', gap: 1,
          background: t.bgPanel, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: '3px 4px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ZoomBtn onClick={() => stepZoom(-1)} title="Zoom out (Ctrl+scroll)">−</ZoomBtn>
        <button
          onClick={() => setZoom(1)}
          title="Reset zoom"
          style={{
            padding: '3px 8px', borderRadius: 6, border: 'none',
            background: 'transparent', color: t.textSecondary,
            fontSize: 11, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            minWidth: 46, textAlign: 'center',
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <ZoomBtn onClick={() => stepZoom(1)} title="Zoom in (Ctrl+scroll)">+</ZoomBtn>
        <div style={{ width: 1, height: 14, background: t.border, margin: '0 3px' }} />
        <ZoomBtn onClick={() => setZoom(1)} title="Fit to screen">⊡</ZoomBtn>
      </div>

      {/* Multi-select hint */}
      {selectedIds.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(99,102,241,0.9)', color: '#fff',
          padding: '4px 12px', borderRadius: 20, fontSize: 11,
          fontFamily: 'Inter, sans-serif', pointerEvents: 'none',
        }}>
          {selectedIds.length} elements selected · Shift+click to add/remove
        </div>
      )}
    </div>
  )
}

// ─── ResizeHandles ───────────────────────────────────────────────────────────
type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLE_POSITIONS: Record<ResizeDir, React.CSSProperties> = {
  nw: { top: -5,  left:  -5, cursor: 'nw-resize' },
  n:  { top: -5,  left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' },
  ne: { top: -5,  right: -5,  cursor: 'ne-resize' },
  e:  { top: '50%', right: -5,  transform: 'translateY(-50%)', cursor: 'e-resize' },
  se: { bottom: -5, right: -5,  cursor: 'se-resize' },
  s:  { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' },
  sw: { bottom: -5, left:  -5,  cursor: 'sw-resize' },
  w:  { top: '50%', left:  -5,  transform: 'translateY(-50%)', cursor: 'w-resize' },
}

function ResizeHandles({ element, devicePreset, zoom }: {
  element: CanvasElement
  devicePreset: string
  zoom: number
}) {
  const scale = getDeviceSpec(devicePreset).scale * zoom

  function handleMouseDown(dir: ResizeDir) {
    return (e: React.MouseEvent) => {
      e.stopPropagation()
      const store = useStore.getState()
      store._pushHistory()
      const startMX = e.clientX, startMY = e.clientY
      const { x: startElX, y: startElY, width: startW, height: startH } = element

      const onMove = (me: MouseEvent) => {
        const dx = (me.clientX - startMX) / scale
        const dy = (me.clientY - startMY) / scale
        let newX = startElX, newY = startElY
        let newW = startW, newH = startH

        if (dir.includes('e')) newW = Math.max(20, startW + dx)
        if (dir.includes('w')) {
          newW = Math.max(20, startW - dx)
          newX = startElX + (startW - newW)
        }
        if (dir.includes('s')) newH = Math.max(10, startH + dy)
        if (dir.includes('n')) {
          newH = Math.max(10, startH - dy)
          newY = startElY + (startH - newH)
        }
        store.updateElement(element.id, { x: newX, y: newY, width: newW, height: newH })
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  return (
    <>
      {(Object.keys(HANDLE_POSITIONS) as ResizeDir[]).map((dir) => (
        <div
          key={dir}
          style={{
            position: 'absolute',
            width: 9, height: 9,
            borderRadius: dir === 'n' || dir === 's' ? 2 : dir === 'e' || dir === 'w' ? 2 : 3,
            background: '#6366f1', border: '2px solid #fff',
            zIndex: 20,
            ...HANDLE_POSITIONS[dir],
          }}
          onMouseDown={handleMouseDown(dir)}
        />
      ))}
    </>
  )
}

// ─── ZoomBtn ─────────────────────────────────────────────────────────────────
function ZoomBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  const t = useUITheme()
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 26, height: 26, borderRadius: 6, border: 'none',
        background: 'transparent', color: t.textSecondary,
        fontSize: 14, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}
