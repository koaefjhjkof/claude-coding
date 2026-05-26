import { useState } from 'react'
import { getApiKey, setApiKey } from '../utils/aiInterpretAction'
import { useUITheme } from '../hooks/useUITheme'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [key, setKey] = useState(getApiKey())
  const [saved, setSaved] = useState(false)
  const t = useUITheme()

  function handleSave() {
    setApiKey(key)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 200,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: t.bgModal, border: `1px solid ${t.borderMed}`,
        borderRadius: 20, padding: 32, width: 440, maxWidth: '90vw',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: t.textPrimary, marginBottom: 8 }}>
          AI Settings
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>
          Add your Anthropic API key to enable intelligent behavior parsing.
          Behaviors you describe will be understood by Claude instead of simple pattern matching.
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8 }}>Anthropic API Key</div>
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false) }}
            placeholder="sk-ant-..."
            autoFocus
            style={{
              width: '100%', padding: '12px 16px',
              background: t.bgInput, border: `1.5px solid ${t.borderStrong}`,
              borderRadius: 12, color: t.textPrimary, fontSize: 14,
              fontFamily: 'Inter, sans-serif', outline: 'none',
            }}
          />
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 8 }}>
            Your key is stored only in your browser's localStorage and sent directly to the Vite dev server — never to a third party.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1.5px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#9ca3af',
              fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: saved ? '#10b981' : '#6366f1',
              color: '#fff', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.2s',
            }}
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
