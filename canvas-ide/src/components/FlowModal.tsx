import { useState } from 'react'
import { useStore, selectElements } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'

const TRIGGER_OPTIONS = [
  { value: 'tap', label: 'When tapped' },
  { value: 'load', label: 'When screen loads' },
  { value: 'swipe-left', label: 'When swiped left' },
  { value: 'swipe-right', label: 'When swiped right' },
  { value: 'hold', label: 'When held down' },
]

const EXAMPLE_PHRASES = [
  'Go to the next screen',
  'Show a success message',
  'Spin then turn green',
  'Count taps and show the number',
  'Shake and show an error',
  'Add a "Well done!" text in blue',
  'Change to a random colour',
  'Grow bigger each tap',
  'Hide after 2 seconds',
  'Pulse every second',
]

export function FlowModal() {
  const { flowModalElementId, closeFlowModal, addFlow, screens, activeScreenId } = useStore()
  const elements = useStore(selectElements)
  const [trigger, setTrigger] = useState('tap')
  const [description, setDescription] = useState('')
  const t = useUITheme()

  const otherScreens = screens.filter((s) => s.id !== activeScreenId)

  if (!flowModalElementId) return null

  const element = elements.find((e) => e.id === flowModalElementId)
  if (!element) return null

  function handleAdd() {
    if (!description.trim()) return
    addFlow(flowModalElementId!, {
      trigger,
      description,
      action: description,
    })
    setDescription('')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => e.target === e.currentTarget && closeFlowModal()}
    >
      <div
        style={{
          background: t.bgModal,
          border: `1px solid ${t.borderMed}`,
          borderRadius: 20, padding: 32,
          width: 480, maxWidth: '90vw',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Add a behavior
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: t.textPrimary }}>
            What should this {element.type} do?
          </div>
        </div>

        {/* Trigger selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8 }}>Trigger</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TRIGGER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTrigger(opt.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1.5px solid',
                  borderColor: trigger === opt.value ? '#6366f1' : t.borderStrong,
                  background: trigger === opt.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: trigger === opt.value ? t.accentText : t.textSecondary,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8 }}>What happens</div>
          <input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Describe what should happen…"
            style={{
              width: '100%', padding: '12px 16px',
              background: t.bgInput, border: `1.5px solid ${t.borderStrong}`,
              borderRadius: 12, color: t.textPrimary,
              fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none',
            }}
          />
        </div>

        {/* Example chips */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8 }}>Examples</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* Dynamic screen navigation chips */}
            {otherScreens.map((screen) => (
              <button
                key={screen.id}
                onClick={() => setDescription(`Go to ${screen.name}`)}
                style={{
                  padding: '4px 10px', borderRadius: 999,
                  border: '1px solid rgba(99,102,241,0.2)',
                  background: 'rgba(99,102,241,0.08)',
                  color: '#a5b4fc', fontSize: 12, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                → {screen.name}
              </button>
            ))}
            {EXAMPLE_PHRASES.map((phrase) => (
              <button
                key={phrase}
                onClick={() => setDescription(phrase)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: `1px solid ${t.border}`,
                  background: 'transparent',
                  color: t.textSecondary,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>

        {/* Existing flows */}
        {element.flows.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8 }}>Current behaviors</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {element.flows.map((flow) => (
                <div
                  key={flow.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'rgba(99,102,241,0.08)',
                    borderRadius: 10,
                    fontSize: 13,
                    color: t.accentText,
                  }}
                >
                  <span style={{ color: t.textSecondary, flexShrink: 0 }}>{TRIGGER_OPTIONS.find(opt => opt.value === flow.trigger)?.label ?? flow.trigger}</span>
                  <span style={{ color: t.textDim }}>→</span>
                  <span style={{ flex: 1, color: t.accentText }}>{flow.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={closeFlowModal}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: `1.5px solid ${t.borderStrong}`,
              background: 'transparent',
              color: t.textSecondary,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Done
          </button>
          <button
            onClick={handleAdd}
            disabled={!description.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: description.trim() ? '#6366f1' : 'rgba(99,102,241,0.3)',
              color: description.trim() ? '#fff' : t.textDim,
              fontSize: 14,
              fontWeight: 500,
              cursor: description.trim() ? 'pointer' : 'default',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Add behavior
          </button>
        </div>
      </div>
    </div>
  )
}
