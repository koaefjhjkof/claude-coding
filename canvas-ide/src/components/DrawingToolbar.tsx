import { useStore } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'

type DrawTool = 'pen' | 'pencil' | 'marker' | 'highlighter' | 'neon' | 'spray' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'star' | 'triangle' | 'watercolor' | 'oil' | 'acrylic' | 'inkwash'

// ── SVG icons ────────────────────────────────────────────────────────────────
const Icons: Record<DrawTool, React.ReactNode> = {
  pen: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 15 L5.5 10 L13 2.5 L15.5 5 L8 12.5 L3 15Z" />
      <line x1="11.5" y1="4" x2="14" y2="6.5" />
    </svg>
  ),
  pencil: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 L16 5 L6 15 L2 16 L3 12 L13 2Z" />
      <line x1="11" y1="4" x2="14" y2="7" />
      <path d="M3 12.5 L5.5 15" strokeDasharray="1.5 1" />
    </svg>
  ),
  marker: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="8" height="11" rx="2" />
      <path d="M8 13 L7 16 L9 15.5 L11 16 L10 13" />
      <line x1="5" y1="7" x2="13" y2="7" />
    </svg>
  ),
  highlighter: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="12" height="6" rx="1" fill="currentColor" opacity="0.25" />
      <line x1="3" y1="9" x2="15" y2="9" strokeWidth="4" strokeLinecap="butt" opacity="0.5" />
    </svg>
  ),
  neon: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 14 Q9 4 15 8" strokeWidth="2" />
      <path d="M3 14 Q9 4 15 8" strokeWidth="4" opacity="0.25" />
    </svg>
  ),
  spray: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 14 L6 6" />
      <rect x="5" y="3" width="4" height="4" rx="1" />
      <line x1="9" y1="5" x2="12" y2="5" />
      <circle cx="12" cy="9" r="0.8" fill="currentColor" />
      <circle cx="14" cy="7" r="0.8" fill="currentColor" />
      <circle cx="15" cy="11" r="0.8" fill="currentColor" />
      <circle cx="11" cy="12" r="0.8" fill="currentColor" />
      <circle cx="13" cy="14" r="0.6" fill="currentColor" />
      <circle cx="16" cy="13" r="0.6" fill="currentColor" />
    </svg>
  ),
  line: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="15" x2="15" y2="3" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="15" x2="15" y2="3" />
      <polyline points="8,3 15,3 15,10" />
    </svg>
  ),
  rect: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="4" width="14" height="10" rx="1.5" />
    </svg>
  ),
  ellipse: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="9" cy="9" rx="7" ry="5" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <polygon points="9,2 10.8,7 16,7 11.8,10.2 13.4,15.4 9,12.4 4.6,15.4 6.2,10.2 2,7 7.2,7" />
    </svg>
  ),
  triangle: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <polygon points="9,2 16,16 2,16" />
    </svg>
  ),
  // ── Paint brushes ───────────────────────────────────────────────────────────
  watercolor: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Wet blob with feathered edge */}
      <ellipse cx="9" cy="10" rx="6" ry="5" strokeWidth="0" fill="currentColor" opacity="0.2" />
      <ellipse cx="9" cy="10" rx="4" ry="3.2" strokeWidth="0" fill="currentColor" opacity="0.3" />
      <path d="M5 5 Q9 2 13 5" strokeWidth="1.5" opacity="0.7" />
      <path d="M6 4 Q9 1.5 12 4" strokeWidth="1" opacity="0.4" />
    </svg>
  ),
  oil: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {/* Thick impasto stroke with specular highlight */}
      <path d="M3 14 Q7 9 13 5" strokeWidth="5.5" opacity="0.35" />
      <path d="M3 14 Q7 9 13 5" strokeWidth="3" opacity="0.85" />
      <path d="M5 12 Q9 7 14 4" strokeWidth="1" opacity="0.5" />
      {/* Glint */}
      <circle cx="11" cy="6.5" r="1" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  acrylic: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Palette knife / flat blade */}
      <path d="M4 14 L10 4 L14 8 L8 16 Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M4 14 L10 4 L14 8 L8 16 Z" />
      <line x1="10" y1="4" x2="12.5" y2="1.5" strokeWidth="2" />
    </svg>
  ),
  inkwash: (
    <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeLinecap="round">
      {/* Calligraphic tapered stroke */}
      <path d="M3 15 C5 11 8 8 14 4" strokeWidth="4" opacity="0.18" />
      <path d="M3 15 C5 11 8 8 14 4" strokeWidth="1.2" opacity="0.9" />
      <path d="M5 13 C7 10 10 7 15 5" strokeWidth="0.8" opacity="0.35" />
    </svg>
  ),
}

const PAINT_TOOLS: { id: DrawTool; label: string; hint: string; key: string }[] = [
  { id: 'watercolor', label: 'Watercolor', hint: 'Bristle dabs — colours bloom & pool at edges', key: 'W' },
  { id: 'oil',        label: 'Oil',        hint: 'Picks up existing paint — real colour mixing',  key: 'O' },
  { id: 'acrylic',    label: 'Acrylic',    hint: 'Thick opaque strokes with bristle texture',     key: 'G' },
  { id: 'inkwash',    label: 'Ink Wash',   hint: 'Speed-responsive ink — slow=dark, fast=light',  key: 'I' },
]
const PAINT_TOOL_IDS = new Set(PAINT_TOOLS.map((t) => t.id))

const BRUSH_TOOLS: { id: DrawTool; label: string; hint: string; key: string }[] = [
  { id: 'pen',         label: 'Pen',         hint: 'Smooth Bézier curves',          key: 'P' },
  { id: 'pencil',      label: 'Pencil',      hint: 'Rough hand-drawn strokes',       key: 'C' },
  { id: 'marker',      label: 'Marker',      hint: 'Thick flat-cap strokes',         key: 'K' },
  { id: 'highlighter', label: 'Highlight',   hint: 'Multiply blend — great on text', key: 'H' },
  { id: 'neon',        label: 'Neon',        hint: 'Glow effect — use bright colors', key: 'N' },
  { id: 'spray',       label: 'Spray',       hint: 'Airbrush dot scatter',           key: 'Y' },
]

const SHAPE_TOOLS: { id: DrawTool; label: string; hint: string; key: string }[] = [
  { id: 'line',     label: 'Line',     hint: 'Straight line · Shift=snap 45°', key: 'L' },
  { id: 'arrow',    label: 'Arrow',    hint: 'Line with arrowhead',             key: 'A' },
  { id: 'rect',     label: 'Rect',     hint: 'Rectangle · Shift=square',        key: 'R' },
  { id: 'ellipse',  label: 'Ellipse',  hint: 'Ellipse · Shift=circle',          key: 'E' },
  { id: 'star',     label: 'Star',     hint: '5-point star',                    key: 'S' },
  { id: 'triangle', label: 'Triangle', hint: 'Triangle · Shift=equilateral',    key: 'T' },
]

const BLEND_MODES: { value: string; label: string }[] = [
  { value: 'normal',      label: 'Normal' },
  { value: 'multiply',    label: 'Multiply' },
  { value: 'screen',      label: 'Screen' },
  { value: 'overlay',     label: 'Overlay' },
  { value: 'soft-light',  label: 'Soft Light' },
  { value: 'hard-light',  label: 'Hard Light' },
  { value: 'color-dodge', label: 'Dodge' },
  { value: 'color-burn',  label: 'Burn' },
  { value: 'darken',      label: 'Darken' },
  { value: 'lighten',     label: 'Lighten' },
  { value: 'difference',  label: 'Difference' },
  { value: 'exclusion',   label: 'Exclusion' },
  { value: 'luminosity',  label: 'Luminosity' },
]

// Presets applied when switching tools
const TOOL_PRESETS: Record<DrawTool, { width?: number; opacity?: number; blend?: string; glow?: number }> = {
  pen:         { width: 3,  opacity: 1,    blend: 'normal',   glow: 0 },
  pencil:      { width: 2,  opacity: 0.9,  blend: 'normal',   glow: 0 },
  marker:      { width: 18, opacity: 0.85, blend: 'normal',   glow: 0 },
  highlighter: { width: 22, opacity: 0.6,  blend: 'multiply', glow: 0 },
  neon:        { width: 3,  opacity: 1,    blend: 'normal',   glow: 6 },
  spray:       { width: 20, opacity: 0.8,  blend: 'normal',   glow: 0 },
  line:        { width: 2,  opacity: 1,    blend: 'normal',   glow: 0 },
  arrow:       { width: 2,  opacity: 1,    blend: 'normal',   glow: 0 },
  rect:        { width: 2,  opacity: 1,    blend: 'normal',   glow: 0 },
  ellipse:     { width: 2,  opacity: 1,    blend: 'normal',   glow: 0 },
  star:        { width: 2,  opacity: 1,    blend: 'normal',   glow: 0 },
  triangle:    { width: 2,  opacity: 1,    blend: 'normal',   glow: 0 },
  // Paint brushes — size means brush radius in canvas pixels
  watercolor:  { width: 32, opacity: 0.8,  blend: 'normal',   glow: 0 },
  oil:         { width: 24, opacity: 0.85, blend: 'normal',   glow: 0 },
  acrylic:     { width: 20, opacity: 0.92, blend: 'normal',   glow: 0 },
  inkwash:     { width: 14, opacity: 0.85, blend: 'normal',   glow: 0 },
}

export function DrawingToolbar() {
  const {
    drawTool, drawColor, drawWidth, drawFill,
    drawGradientEnabled, drawGradientColor2, drawGradientAngle,
    drawOpacity, drawBlendMode, drawGlow,
    setDrawTool, setDrawColor, setDrawWidth, setDrawFill,
    setDrawGradientEnabled, setDrawGradientColor2, setDrawGradientAngle,
    setDrawOpacity, setDrawBlendMode, setDrawGlow,
    setDrawMode,
  } = useStore()
  const t = useUITheme()

  function pickTool(tool: DrawTool) {
    setDrawTool(tool)
    const p = TOOL_PRESETS[tool]
    if (p.width    !== undefined) setDrawWidth(p.width)
    if (p.opacity  !== undefined) setDrawOpacity(p.opacity)
    if (p.blend    !== undefined) setDrawBlendMode(p.blend)
    if (p.glow     !== undefined) setDrawGlow(p.glow)
  }

  function clearAllDrawings() {
    const state = useStore.getState()
    const screen = state.screens.find((s) => s.id === state.activeScreenId)
    if (!screen) return
    const ids = screen.elements.filter((el) => el.type === 'draw').map((el) => el.id)
    const hasPaint = !!screen.paintCanvas
    if (ids.length === 0 && !hasPaint) return
    state._pushHistory()
    ids.forEach((id) => state.removeElement(id))
    if (hasPaint) state.setPaintCanvas(state.activeScreenId, '')
  }

  const isShape    = ['rect', 'ellipse', 'star', 'triangle'].includes(drawTool)
  const isBrush    = BRUSH_TOOLS.some((t) => t.id === drawTool)
  const isPaint    = PAINT_TOOL_IDS.has(drawTool)
  const isNeon     = drawTool === 'neon'
  const hasShift   = ['rect', 'ellipse', 'line', 'arrow', 'star', 'triangle'].includes(drawTool)

  const sep = <div style={{ width: 1, height: 22, background: t.sep, flexShrink: 0, margin: '0 3px' }} />

  function ToolBtn({ tool, hint, kbd }: { tool: DrawTool; hint: string; kbd: string }) {
    const active = drawTool === tool
    return (
      <button
        onClick={() => pickTool(tool)}
        title={`${tool.charAt(0).toUpperCase() + tool.slice(1)} — ${hint}  [${kbd}]`}
        style={{
          width: 32, height: 30, borderRadius: 7, border: 'none',
          background: active ? '#6366f1' : 'transparent',
          color: active ? '#fff' : t.textSecondary,
          cursor: 'pointer', flexShrink: 0, padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.12s, color 0.12s',
          position: 'relative',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(99,102,241,0.12)' }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        {Icons[tool]}
        {/* Tiny blend/glow indicators */}
        {tool === 'highlighter' && (
          <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 5, color: active ? '#fff' : '#f59e0b', fontWeight: 700, lineHeight: 1 }}>M</span>
        )}
        {tool === 'neon' && (
          <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 5, color: active ? '#fff' : '#a78bfa', fontWeight: 700, lineHeight: 1 }}>✦</span>
        )}
      </button>
    )
  }

  return (
    <div
      style={{
        height: 46,
        borderBottom: `1px solid ${t.border}`,
        background: `linear-gradient(to bottom, ${t.bgToolbar}, ${t.bgPanel}ee)`,
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 4,
        flexShrink: 0, overflowX: 'auto', overflowY: 'hidden',
        boxShadow: '0 1px 0 rgba(99,102,241,0.08)',
      }}
    >
      {/* Mode label */}
      <div style={{
        fontSize: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif',
        color: '#6366f1', letterSpacing: '0.06em', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <svg viewBox="0 0 14 14" width="9" height="9" fill="#6366f1"><circle cx="7" cy="7" r="6" /></svg>
        DRAW
      </div>

      {sep}

      {/* Paint tools */}
      <div style={{ fontSize: 9, color: t.textDim, flexShrink: 0, marginRight: 2, letterSpacing: '0.04em' }}>PAINT</div>
      <div style={{ display: 'flex', gap: 1 }}>
        {PAINT_TOOLS.map((tool) => (
          <ToolBtn key={tool.id} tool={tool.id} hint={tool.hint} kbd={tool.key} />
        ))}
      </div>

      {sep}

      {/* Brush tools */}
      <div style={{ fontSize: 9, color: t.textDim, flexShrink: 0, marginRight: 2, letterSpacing: '0.04em' }}>BRUSH</div>
      <div style={{ display: 'flex', gap: 1 }}>
        {BRUSH_TOOLS.map((tool) => (
          <ToolBtn key={tool.id} tool={tool.id} hint={tool.hint} kbd={tool.key} />
        ))}
      </div>

      {sep}

      {/* Shape tools */}
      <div style={{ fontSize: 9, color: t.textDim, flexShrink: 0, marginRight: 2, letterSpacing: '0.04em' }}>SHAPE</div>
      <div style={{ display: 'flex', gap: 1 }}>
        {SHAPE_TOOLS.map((tool) => (
          <ToolBtn key={tool.id} tool={tool.id} hint={tool.hint} kbd={tool.key} />
        ))}
      </div>

      {sep}

      {/* Stroke color */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, cursor: 'pointer' }}>
        <span style={{ fontSize: 10, color: t.textSecondary }}>Stroke</span>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: drawColor, border: `2px solid ${t.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
          <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
        </div>
      </label>

      {/* Paint-tool badge (instead of fill/blend/glow) */}
      {isPaint && (
        <div style={{
          fontSize: 10, color: '#7c3aed', background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.25)', borderRadius: 6,
          padding: '3px 8px', flexShrink: 0, fontFamily: 'Inter, sans-serif',
        }}>
          Pixel paint · blends with canvas
        </div>
      )}

      {/* Fill + Gradient (shape tools only) */}
      {isShape && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: t.textSecondary }}>Fill</span>

          {/* No fill */}
          <button onClick={() => { setDrawFill(''); setDrawGradientEnabled(false) }} title="No fill"
            style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${drawFill === '' && !drawGradientEnabled ? '#6366f1' : t.border}`, background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 18 18" width="12" height="12">
              <rect x="1.5" y="1.5" width="15" height="15" rx="2" fill="none" stroke={t.textDim} strokeWidth="1.2" />
              <line x1="2.5" y1="15.5" x2="15.5" y2="2.5" stroke="#ef4444" strokeWidth="1.5" />
            </svg>
          </button>

          {/* Solid fill colour */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6,
              background: drawFill || 'white',
              border: `2px solid ${drawFill && !drawGradientEnabled ? '#6366f1' : t.border}`,
              opacity: drawFill ? 1 : 0.4 }} />
            <input type="color" value={drawFill || '#ffffff'}
              onChange={(e) => { setDrawFill(e.target.value); setDrawGradientEnabled(false) }}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
          </div>

          {/* Gradient toggle */}
          <button
            onClick={() => {
              if (!drawGradientEnabled) {
                if (!drawFill) setDrawFill('#6366f1')
                setDrawGradientEnabled(true)
              } else {
                setDrawGradientEnabled(false)
              }
            }}
            title="Gradient fill"
            style={{
              width: 24, height: 24, borderRadius: 6, padding: 0, cursor: 'pointer', flexShrink: 0,
              border: `2px solid ${drawGradientEnabled ? '#6366f1' : t.border}`,
              background: drawGradientEnabled
                ? `linear-gradient(${drawGradientAngle}deg, ${drawFill || '#6366f1'}, ${drawGradientColor2})`
                : `linear-gradient(135deg, rgba(99,102,241,0.3), rgba(245,158,11,0.3))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {!drawGradientEnabled && (
              <svg viewBox="0 0 18 18" width="11" height="11" fill="none">
                <defs>
                  <linearGradient id="grad-icon" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <rect x="1.5" y="1.5" width="15" height="15" rx="2" fill="url(#grad-icon)" />
              </svg>
            )}
          </button>

          {/* Gradient controls — shown only when gradient is on */}
          {drawGradientEnabled && (
            <>
              {/* Second colour */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6,
                  background: drawGradientColor2,
                  border: `2px solid ${t.border}` }} />
                <input type="color" value={drawGradientColor2}
                  onChange={(e) => setDrawGradientColor2(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>

              {/* Angle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: t.textDim }}>°</span>
                <input type="range" min={0} max={360} value={drawGradientAngle}
                  onChange={(e) => setDrawGradientAngle(Number(e.target.value))}
                  style={{ width: 56, accentColor: '#6366f1' }} />
                <span style={{ fontSize: 10, color: t.accentText, width: 24, textAlign: 'right' }}>{drawGradientAngle}°</span>
              </div>
            </>
          )}
        </div>
      )}

      {sep}

      {/* Size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: t.textSecondary }}>Size</span>
        <input type="range" min={1} max={60} value={drawWidth} onChange={(e) => setDrawWidth(Number(e.target.value))}
          style={{ width: 70, accentColor: '#6366f1' }} />
        <span style={{ fontSize: 10, color: t.accentText, width: 20, textAlign: 'right' }}>{drawWidth}</span>
      </div>

      {/* Opacity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: t.textSecondary }}>Opacity</span>
        <input type="range" min={5} max={100} value={Math.round(drawOpacity * 100)} onChange={(e) => setDrawOpacity(Number(e.target.value) / 100)}
          style={{ width: 60, accentColor: '#6366f1' }} />
        <span style={{ fontSize: 10, color: t.accentText, width: 26, textAlign: 'right' }}>{Math.round(drawOpacity * 100)}%</span>
      </div>

      {sep}

      {/* Blend mode (SVG tools only) */}
      {!isPaint && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: t.textSecondary }}>Blend</span>
          <select
            value={drawBlendMode}
            onChange={(e) => setDrawBlendMode(e.target.value)}
            style={{
              padding: '3px 6px', borderRadius: 6, border: `1px solid ${t.border}`,
              background: t.bgApp, color: t.textPrimary,
              fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              outline: 'none',
            }}
          >
            {BLEND_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Glow (neon / SVG brush tools only) */}
      {!isPaint && (isNeon || drawGlow > 0 || isBrush) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: t.textSecondary }}>Glow</span>
          <input type="range" min={0} max={20} value={drawGlow} onChange={(e) => setDrawGlow(Number(e.target.value))}
            style={{ width: 55, accentColor: '#a78bfa' }} />
          <span style={{ fontSize: 10, color: '#a78bfa', width: 18, textAlign: 'right' }}>{drawGlow}</span>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 8 }} />

      {/* Hint */}
      {hasShift && (
        <div style={{ fontSize: 9, color: t.textDim, flexShrink: 0 }}>Shift=constrain</div>
      )}

      {sep}

      {/* Clear */}
      <button onClick={clearAllDrawings}
        style={{ padding: '4px 9px', borderRadius: 7, border: `1px solid rgba(239,68,68,0.25)`, background: 'transparent', color: '#f87171', fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        Clear all
      </button>

      {/* Exit */}
      <button onClick={() => setDrawMode(false)} title="Exit draw mode (Esc)"
        style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: t.textDim, fontSize: 14, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        ✕
      </button>
    </div>
  )
}
