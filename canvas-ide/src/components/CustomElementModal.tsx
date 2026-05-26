import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'

const CANVAS_W = 600
const CANVAS_H = 320

const DESCRIBE_EXAMPLES = [
  'A stat card with a large number, a label, and a small trend arrow',
  'A profile chip with avatar, name, and online indicator dot',
  'A music player mini bar with play/pause and a progress line',
  'A notification badge with an icon and a dismiss button',
  'A gradient hero banner with a headline and a CTA button',
  'A tag/chip row with colorful labels like "Design", "React", "AI"',
  'A circular progress ring showing 72% with a label in the center',
  'A rating widget with 5 stars and a score like "4.8"',
]

export function CustomElementModal() {
  const { customElementModalOpen, customElementEditId, closeCustomElementModal, addElement, updateElementProps } = useStore()
  const t = useUITheme()
  const [tab, setTab] = useState<'describe' | 'draw'>('describe')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  // Pre-fill description when editing an existing element
  const elements = useStore((s) => s.screens.find(sc => sc.id === s.activeScreenId)?.elements ?? [])
  const editElement = customElementEditId ? elements.find(e => e.id === customElementEditId) : null

  useEffect(() => {
    if (customElementModalOpen && editElement?.props.description) {
      setDescription(editElement.props.description)
    }
    if (customElementModalOpen && editElement?.props.svg) {
      setGeneratedSvg(editElement.props.svg)
    }
  }, [customElementModalOpen])

  // Initialize canvas with white fill whenever draw tab is shown
  useEffect(() => {
    if (tab !== 'draw') return
    const id = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    })
    return () => cancelAnimationFrame(id)
  }, [tab, customElementModalOpen])

  if (!customElementModalOpen) return null

  // ── Canvas drawing ───────────────────────────────────────────────────────────
  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    }
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    setHasDrawn(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function onDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  function endDraw() { isDrawingRef.current = false }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    setGeneratedSvg(null)
    setError(null)
  }

  // ── Generate ─────────────────────────────────────────────────────────────────
  async function generate() {
    const key = localStorage.getItem('canvas-anthropic-key') ?? ''
    if (!key) { setError('No API key set — add it in Settings (⚙ top right).'); return }
    if (tab === 'describe' && !description.trim()) { setError('Write a description first.'); return }
    if (tab === 'draw' && !hasDrawn) { setError('Draw something first.'); return }

    setLoading(true)
    setError(null)
    setGeneratedSvg(null)

    try {
      let imageData: string | undefined
      if (tab === 'draw') {
        const dataUrl = canvasRef.current?.toDataURL('image/png') ?? ''
        imageData = dataUrl.split(',')[1]
      }

      const res = await fetch('/api/generate-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, description: description.trim(), imageData }),
      })

      const data = await res.json()
      if (data.error) { setError(data.error) }
      else { setGeneratedSvg(data.svg) }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Add / Update ─────────────────────────────────────────────────────────────
  function commit() {
    if (!generatedSvg) return
    if (customElementEditId) {
      updateElementProps(customElementEditId, { svg: generatedSvg, description: description.trim() })
    } else {
      addElement('custom', 40, 100, 260, 130, { svg: generatedSvg, description: description.trim() })
    }
    handleClose()
  }

  function handleClose() {
    closeCustomElementModal()
    setGeneratedSvg(null)
    setError(null)
    setDescription('')
    setHasDrawn(false)
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const tabStyle = (active: boolean) => ({
    padding: '7px 18px', borderRadius: 8, border: 'none',
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? '#a5b4fc' : t.textSecondary,
    fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div style={{
        background: t.bgModal, border: `1px solid ${t.borderMed}`,
        borderRadius: 20, padding: 28, width: 540, maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {customElementEditId ? 'Edit custom element' : 'Create custom element'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: t.textPrimary }}>
              ✦ AI-generated component
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: t.textDim, fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: t.bgInput, borderRadius: 10, padding: 4 }}>
          <button style={tabStyle(tab === 'describe')} onClick={() => setTab('describe')}>✏ Describe</button>
          <button style={tabStyle(tab === 'draw')} onClick={() => setTab('draw')}>✏ Draw</button>
        </div>

        {/* Describe tab */}
        {tab === 'describe' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the component you want to create…"
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', resize: 'vertical',
                background: t.bgInput, border: `1.5px solid ${t.borderStrong}`,
                borderRadius: 12, color: t.textPrimary, fontSize: 14,
                fontFamily: 'Inter, sans-serif', outline: 'none', lineHeight: 1.6,
              }}
            />
            <div>
              <div style={{ fontSize: 11, color: t.textDim, marginBottom: 8 }}>Examples — click to use</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DESCRIBE_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setDescription(ex)}
                    style={{
                      padding: '4px 10px', borderRadius: 999,
                      border: `1px solid ${t.border}`,
                      background: 'transparent', color: t.textSecondary,
                      fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      textAlign: 'left',
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Draw tab */}
        {tab === 'draw' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: t.textSecondary }}>
              Sketch your component — Claude will recreate it as a polished SVG
            </div>
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${t.borderMed}` }}>
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                onPointerDown={startDraw}
                onPointerMove={onDraw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
                style={{
                  display: 'block', width: '100%',
                  cursor: 'crosshair', touchAction: 'none',
                  background: '#ffffff',
                }}
              />
              {!hasDrawn && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{ textAlign: 'center', color: '#d1d5db', userSelect: 'none' }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>✏</div>
                    <div style={{ fontSize: 13 }}>Draw your component here</div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={clearCanvas}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  border: `1px solid ${t.border}`, background: 'transparent',
                  color: t.textSecondary, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Clear
              </button>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: add context about your sketch…"
                style={{
                  flex: 1, padding: '7px 12px',
                  background: t.bgInput, border: `1.5px solid ${t.borderMed}`,
                  borderRadius: 8, color: t.textPrimary, fontSize: 13,
                  fontFamily: 'Inter, sans-serif', outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* SVG Preview */}
        {generatedSvg && (
          <div>
            <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Preview
            </div>
            <div style={{
              borderRadius: 12, border: `1.5px solid ${t.borderMed}`,
              background: '#ffffff', overflow: 'hidden',
              height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}>
              <div
                style={{ width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: generatedSvg }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: `1.5px solid ${t.borderStrong}`, background: 'transparent',
              color: t.textSecondary, fontSize: 14, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Cancel
          </button>

          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)',
              color: '#a5b4fc',
              fontSize: 14, cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>◌</span>
                Generating…
              </>
            ) : '✦ Generate'}
          </button>

          {generatedSvg && (
            <button
              onClick={commit}
              style={{
                padding: '10px 22px', borderRadius: 10, border: 'none',
                background: '#6366f1', color: '#fff',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {customElementEditId ? 'Update →' : 'Add to canvas →'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
