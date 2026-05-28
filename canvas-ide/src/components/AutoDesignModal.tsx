import { useState, useRef, useEffect } from 'react'
import { useStore, selectElements } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import { getApiKey } from '../utils/aiInterpretAction'

const EXAMPLES = [
  'A fitness tracking app with workout stats, progress rings, and a weekly chart',
  'A food delivery app with a restaurant list, search bar, and cart button',
  'A meditation app with a timer, mood selector, and session history list',
  'A social media profile page with an avatar, bio, stats, and a post grid',
  'A finance dashboard with account balance, transaction list, and a pie chart',
  'A music player with album art, playback controls, and a playlist',
  'An e-commerce product page with image, price, rating, and an add-to-cart button',
  'A weather app with current temperature, hourly forecast, and a 5-day outlook',
]

type Phase = 'input' | 'review' | 'changes' | 'functional'

interface Props {
  onClose: () => void
}

export function AutoDesignModal({ onClose }: Props) {
  const { styles, clearScreen, addElements, removeElements, updateElements, setAppDatabase, screens, activeScreenId } = useStore()
  const t = useUITheme()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clearFirst, setClearFirst] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const feedbackRef = useRef<HTMLTextAreaElement>(null)

  // Phase state
  const [phase, setPhase] = useState<Phase>('input')
  const [generatedIds, setGeneratedIds] = useState<string[]>([])
  const [elementSummary, setElementSummary] = useState<{ count: number; typeBreakdown: string }>({ count: 0, typeBreakdown: '' })
  const [feedback, setFeedback] = useState('')
  const [functionalStatus, setFunctionalStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [functionalSummary, setFunctionalSummary] = useState('')

  useEffect(() => {
    if (phase === 'input') textareaRef.current?.focus()
    if (phase === 'changes') feedbackRef.current?.focus()
  }, [phase])

  function buildElementSummary(elements: { type: string }[]) {
    const typeCounts: Record<string, number> = {}
    for (const el of elements) {
      typeCounts[el.type] = (typeCounts[el.type] ?? 0) + 1
    }
    const parts = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, count]) => count > 1 ? `${type}×${count}` : type)
    return { count: elements.length, typeBreakdown: parts.join(' · ') }
  }

  async function handleGenerate(isRegenerate = false) {
    const apiKey = getApiKey()
    if (!apiKey) { setError('Add your Anthropic API key in Settings (✦ button).'); return }
    const desc = description.trim()
    if (!desc) { setError('Please describe your app first.'); return }

    setLoading(true)
    setError(null)

    try {
      const fullDesc = isRegenerate && feedback.trim()
        ? `${desc}\n\nRevisions requested: ${feedback.trim()}`
        : desc

      const res = await fetch('/api/auto-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          description: fullDesc,
          primaryColor: styles.primaryColor,
          clearFirst: true,  // always clear when regenerating from review
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to generate')
      if (!Array.isArray(data.elements)) throw new Error('Invalid response')

      // Remove any previously generated elements
      if (generatedIds.length > 0) removeElements(generatedIds)
      if (clearFirst && !isRegenerate) clearScreen()

      // Track existing IDs before adding
      const beforeIds = new Set(selectElements(useStore.getState()).map((e) => e.id))
      addElements(data.elements)
      const afterIds = selectElements(useStore.getState()).map((e) => e.id)
      const newIds = afterIds.filter((id) => !beforeIds.has(id))
      setGeneratedIds(newIds)

      setElementSummary(buildElementSummary(data.elements))
      setFeedback('')
      setPhase('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleMakeItWork() {
    const apiKey = getApiKey()
    if (!apiKey) { setError('Add your Anthropic API key in Settings (✦ button).'); return }

    setFunctionalStatus('loading')
    setError(null)
    setPhase('functional')

    try {
      // Get the current generated elements
      const allElements = selectElements(useStore.getState())
      const generatedSet = new Set(generatedIds)
      const elements = allElements.filter((e) => generatedSet.has(e.id))

      const screenList = screens.map((s) => ({ id: s.id, name: s.name }))

      const res = await fetch('/api/make-it-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          description: description.trim(),
          elements,
          screens: screenList,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to make functional')

      // Apply element updates (flows + bindings)
      if (Array.isArray(data.elements) && data.elements.length > 0) {
        // Merge returned elements back — preserve IDs, merge props+flows
        type Patch = { id: string; props?: Record<string, unknown>; flows?: { id: string; trigger: string; description: string; action: string }[] }
        const updatesById = new Map<string, Patch>(
          (data.elements as Patch[]).map((e) => [e.id, e])
        )
        const merged = allElements.filter((e) => generatedSet.has(e.id)).map((el) => {
          const patch = updatesById.get(el.id)
          if (!patch) return el
          return {
            ...el,
            props: { ...el.props, ...(patch.props ?? {}) },
            flows: Array.isArray(patch.flows) ? patch.flows : el.flows,
          }
        })
        updateElements(merged)
      }

      // Apply database tables if suggested
      if (Array.isArray(data.tables) && data.tables.length > 0) {
        const { v4: uuidv4 } = await import('uuid')
        const tables = data.tables.map((t: { name: string; label: string; fields: { name: string; label: string; type: string; required?: boolean }[] }) => ({
          id: uuidv4(),
          name: t.name,
          label: t.label ?? t.name,
          fields: (t.fields ?? []).map((f) => ({
            id: uuidv4(),
            name: f.name,
            label: f.label ?? f.name,
            type: f.type ?? 'text',
            required: f.required ?? false,
          })),
        }))
        setAppDatabase({ tables })
        setFunctionalSummary(
          `Added ${data.elements?.length ?? 0} behaviors · Created ${tables.length} database table${tables.length !== 1 ? 's' : ''}`
        )
      } else {
        setFunctionalSummary(
          `Added ${data.elements?.length ?? 0} behaviors to your app`
        )
      }

      setFunctionalStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setFunctionalStatus('idle')
      setPhase('review')
    }
  }

  function handleApprove() {
    onClose()
  }

  function handleDiscard() {
    if (generatedIds.length > 0) removeElements(generatedIds)
    setGeneratedIds([])
    setPhase('input')
  }

  function pickExample(ex: string) {
    setDescription(ex)
    textareaRef.current?.focus()
  }

  const overlayOpacity = phase === 'review' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.55)'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: overlayOpacity, backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.3s',
      }}
      onClick={phase === 'review' ? undefined : onClose}
    >
      <div
        style={{
          width: phase === 'review' ? 480 : 540,
          maxHeight: '88vh', overflow: 'auto',
          background: t.bgPanel, borderRadius: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          border: `1px solid ${t.border}`,
          padding: 28,
          transition: 'width 0.2s',
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ─── PHASE: INPUT ─────────────────────────────────────── */}
        {phase === 'input' && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, fontFamily: 'Inter, sans-serif' }}>
                  ✦ Auto Design
                </div>
                <div style={{ fontSize: 12, color: t.textSecondary, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                  Describe your app and AI builds the screen for you
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: t.textSecondary, fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Text area */}
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A fitness app with a workout tracker, progress charts, and a weekly goal summary"
              rows={4}
              style={{
                width: '100%', borderRadius: 12,
                border: `1.5px solid ${t.border}`,
                background: t.bgApp, color: t.textPrimary,
                fontFamily: 'Inter, sans-serif', fontSize: 14,
                padding: '12px 14px', resize: 'none',
                outline: 'none', boxSizing: 'border-box',
                lineHeight: 1.6,
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
            />

            {/* Examples */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: t.textSecondary, fontFamily: 'Inter, sans-serif', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Try an example
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => pickExample(ex)}
                    style={{
                      padding: '4px 10px', borderRadius: 20,
                      border: `1px solid ${t.border}`,
                      background: description === ex ? 'rgba(99,102,241,0.15)' : t.bgApp,
                      color: description === ex ? '#6366f1' : t.textSecondary,
                      fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      textAlign: 'left',
                    }}
                  >
                    {ex.split(' ').slice(0, 5).join(' ')}…
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="clear-first"
                checked={clearFirst}
                onChange={(e) => setClearFirst(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
              />
              <label htmlFor="clear-first" style={{ fontSize: 13, color: t.textSecondary, fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
                Clear current screen first
              </label>
            </div>

            {error && <ErrorBox message={error} />}

            {/* Footer */}
            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '9px 18px', borderRadius: 10, border: `1px solid ${t.border}`,
                  background: 'transparent', color: t.textSecondary,
                  fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerate(false)}
                disabled={loading || !description.trim()}
                style={{
                  padding: '9px 22px', borderRadius: 10, border: 'none',
                  background: loading || !description.trim()
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: loading || !description.trim() ? 'default' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {loading ? (
                  <><Spinner /> Designing…</>
                ) : (
                  '✦ Generate Screen'
                )}
              </button>
            </div>
          </>
        )}

        {/* ─── PHASE: REVIEW ────────────────────────────────────── */}
        {phase === 'review' && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#10b981' }}>✓</span> Design Generated
                </div>
                <div style={{ fontSize: 12, color: t.textSecondary, fontFamily: 'Inter, sans-serif', marginTop: 4, lineHeight: 1.5 }}>
                  {elementSummary.count} elements placed on the canvas
                </div>
              </div>
              <button
                onClick={handleApprove}
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: t.textSecondary, fontSize: 18, cursor: 'pointer', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Element type breakdown */}
            <div style={{
              background: t.bgApp, borderRadius: 10, padding: '12px 14px',
              border: `1px solid ${t.border}`, marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, color: t.textSecondary, fontFamily: 'Inter, sans-serif', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Elements
              </div>
              <div style={{ fontSize: 13, color: t.textPrimary, fontFamily: 'Inter, monospace', lineHeight: 1.6 }}>
                {elementSummary.typeBreakdown}
              </div>
            </div>

            {/* Canvas peek hint */}
            <div style={{
              fontSize: 12, color: t.textSecondary, fontFamily: 'Inter, sans-serif',
              textAlign: 'center', padding: '8px 0 16px',
              borderBottom: `1px solid ${t.border}`, marginBottom: 18,
            }}>
              👆 See the canvas behind this panel to review the layout
            </div>

            {error && <ErrorBox message={error} />}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Make it Work — primary CTA */}
              <button
                onClick={handleMakeItWork}
                style={{
                  padding: '12px 20px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                }}
              >
                ⚡ Make it Work
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
                  — add data, behaviors & logic
                </span>
              </button>

              {/* Secondary row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPhase('changes')}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    background: 'transparent', color: t.textPrimary,
                    fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  ✏️ Request Changes
                </button>
                <button
                  onClick={handleApprove}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 10,
                    border: `1px solid ${t.border}`,
                    background: t.bgApp, color: t.textPrimary,
                    fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontWeight: 500,
                  }}
                >
                  ✓ Approve & Close
                </button>
              </div>

              {/* Discard */}
              <button
                onClick={handleDiscard}
                style={{
                  padding: '6px 0', border: 'none', background: 'transparent',
                  color: t.textSecondary, fontSize: 12,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  textDecoration: 'underline',
                }}
              >
                Discard and start over
              </button>
            </div>
          </>
        )}

        {/* ─── PHASE: CHANGES ───────────────────────────────────── */}
        {phase === 'changes' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => setPhase('review')}
                style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ←
              </button>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontFamily: 'Inter, sans-serif' }}>
                  Request Changes
                </div>
                <div style={{ fontSize: 12, color: t.textSecondary, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                  Describe what you'd like to change
                </div>
              </div>
            </div>

            <textarea
              ref={feedbackRef}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Make the header bigger, use blue instead of purple, add a search bar at the top, remove the chart…"
              rows={5}
              style={{
                width: '100%', borderRadius: 12,
                border: `1.5px solid ${t.border}`,
                background: t.bgApp, color: t.textPrimary,
                fontFamily: 'Inter, sans-serif', fontSize: 14,
                padding: '12px 14px', resize: 'none',
                outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(true) }}
            />

            {error && <ErrorBox message={error} />}

            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPhase('review')}
                style={{
                  padding: '9px 18px', borderRadius: 10, border: `1px solid ${t.border}`,
                  background: 'transparent', color: t.textSecondary,
                  fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={loading || !feedback.trim()}
                style={{
                  padding: '9px 22px', borderRadius: 10, border: 'none',
                  background: loading || !feedback.trim()
                    ? '#9ca3af'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: loading || !feedback.trim() ? 'default' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {loading ? (
                  <><Spinner /> Redesigning…</>
                ) : (
                  '↺ Regenerate'
                )}
              </button>
            </div>
          </>
        )}

        {/* ─── PHASE: FUNCTIONAL ────────────────────────────────── */}
        {phase === 'functional' && (
          <>
            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
              {functionalStatus === 'loading' && (
                <>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>
                    <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>⚡</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
                    Making it Work…
                  </div>
                  <div style={{ fontSize: 13, color: t.textSecondary, fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                    Connecting components, designing database,<br />and wiring up behaviors…
                  </div>
                </>
              )}

              {functionalStatus === 'done' && (
                <>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary, fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
                    Your app is fully wired up!
                  </div>
                  <div style={{ fontSize: 13, color: t.textSecondary, fontFamily: 'Inter, sans-serif', lineHeight: 1.6, marginBottom: 6 }}>
                    {functionalSummary}
                  </div>
                  <div style={{ fontSize: 12, color: t.textSecondary, fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                    Check the Properties Panel to review data bindings,<br />then press ▶ Preview to try it out.
                  </div>

                  <button
                    onClick={onClose}
                    style={{
                      marginTop: 20, padding: '10px 28px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: '#fff', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    ▶ Preview My App
                  </button>
                </>
              )}

              {error && <ErrorBox message={error} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Small shared helpers ──────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>
      ⟳
    </span>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      marginTop: 14, padding: '10px 14px', borderRadius: 10,
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444', fontSize: 13, fontFamily: 'Inter, sans-serif',
    }}>
      {message}
    </div>
  )
}
