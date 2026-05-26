import { useState } from 'react'
import { useStore, selectElements } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import type { AlignType } from '../types'
import type { UITheme } from '../themes'

const RADIUS_MAP = { sharp: 4, medium: 10, soft: 20 }

const COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#3b82f6', '#1f2937',
]

function ColorRow({ label, value, onChange, t }: { label: string; value?: string; onChange: (v: string) => void; t: UITheme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: t.textSecondary, width: 80, flexShrink: 0 }}>{label}</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{
              width: 20, height: 20, borderRadius: '50%', background: c,
              border: value === c ? `2px solid ${t.textPrimary}` : '2px solid transparent',
              cursor: 'pointer', outline: 'none',
            }}
          />
        ))}
        <input
          type="color"
          value={value ?? '#6366f1'}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}
        />
      </div>
    </div>
  )
}

function SliderRow({ label, value, min, max, step = 1, onChange, t }: { label: string; value?: number; min: number; max: number; step?: number; onChange: (v: number) => void; t: UITheme }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: t.textSecondary }}>{label}</span>
        <span style={{ fontSize: 12, color: t.accentText }}>{value ?? min}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#6366f1' }}
      />
    </div>
  )
}

const ALIGN_BUTTONS: { icon: string; title: string; align: AlignType }[] = [
  { icon: '⇤', title: 'Align left',         align: 'left' },
  { icon: '↔', title: 'Center horizontal',  align: 'center-h' },
  { icon: '⇥', title: 'Align right',        align: 'right' },
  { icon: '⇡', title: 'Align top',          align: 'top' },
  { icon: '↕', title: 'Center vertical',    align: 'center-v' },
  { icon: '⇣', title: 'Align bottom',       align: 'bottom' },
]

// Elements where per-element border-radius makes sense
const HAS_RADIUS = new Set(['button', 'card', 'image', 'input', 'alert', 'searchbar', 'avatar', 'badge', 'progress'])

export function PropertiesPanel() {
  const { selectedId, updateElement, updateElementProps, openFlowModal, openCustomElementModal,
          removeElement, duplicateElement, copyElement, pasteElement, alignElement, removeFlow,
          styles, clipboard } = useStore()
  const elements = useStore(selectElements)
  const selected = elements.find((e) => e.id === selectedId)
  const globalRadius = RADIUS_MAP[styles.borderRadius]
  const t = useUITheme()

  if (!selected) {
    return (
      <div style={{
        width: 240, borderLeft: `1px solid ${t.border}`,
        background: t.bgPanel,
        padding: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10, color: t.textDim,
      }}>
        <div style={{ fontSize: 28 }}>←</div>
        <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
          Tap any element on the canvas to edit it
        </div>
        {clipboard && (
          <button
            onClick={pasteElement}
            style={{
              marginTop: 8, padding: '8px 16px', borderRadius: 8,
              border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.08)', color: t.accentText,
              fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Paste  (Ctrl+V)
          </button>
        )}
      </div>
    )
  }

  const { type, props, flows } = selected

  return (
    <div style={{
      width: 240, borderLeft: `1px solid ${t.border}`,
      background: t.bgPanel,
      padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Selected</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary, textTransform: 'capitalize' }}>{type}</div>
      </div>

      {/* ── Position & Size ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 14, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 10, fontWeight: 500 }}>Position & Size</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {([
            { label: 'X', field: 'x' as const, val: selected.x },
            { label: 'Y', field: 'y' as const, val: selected.y },
            { label: 'W', field: 'width' as const, val: selected.width },
            { label: 'H', field: 'height' as const, val: selected.height },
          ] as const).map(({ label, field, val }) => (
            <PosSizeInput
              key={field}
              label={label}
              value={Math.round(val)}
              min={field === 'width' ? 20 : field === 'height' ? 10 : undefined}
              onChange={(v) => updateElement(selected.id, { [field]: v })}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12, fontWeight: 500 }}>Content</div>

        {type === 'custom' && (
          <div style={{ marginBottom: 14 }}>
            {props.description && (
              <div style={{ fontSize: 12, color: t.textDim, marginBottom: 10, lineHeight: 1.5, fontStyle: 'italic' }}>
                "{props.description}"
              </div>
            )}
            <button
              onClick={() => openCustomElementModal(selected.id)}
              style={{
                width: '100%', padding: '9px', borderRadius: 9,
                border: '1.5px solid rgba(99,102,241,0.35)',
                background: 'rgba(99,102,241,0.08)', color: '#a5b4fc',
                fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              ✦ Regenerate
            </button>
          </div>
        )}

        {(type === 'button' || type === 'badge' || type === 'toggle' || type === 'checkbox') && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Label</div>
            <input value={props.label ?? ''} onChange={(e) => updateElementProps(selected.id, { label: e.target.value })} style={inputStyle(t)} />
          </div>
        )}

        {(type === 'text' || type === 'heading') && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Text</div>
            <textarea value={props.text ?? ''} onChange={(e) => updateElementProps(selected.id, { text: e.target.value })} rows={3} style={{ ...inputStyle(t), resize: 'none', lineHeight: 1.5 }} />
          </div>
        )}

        {type === 'alert' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Message</div>
            <textarea value={props.text ?? ''} onChange={(e) => updateElementProps(selected.id, { text: e.target.value })} rows={2} style={{ ...inputStyle(t), resize: 'none', lineHeight: 1.5 }} />
          </div>
        )}

        {type === 'input' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Placeholder</div>
            <input value={props.placeholder ?? ''} onChange={(e) => updateElementProps(selected.id, { placeholder: e.target.value })} style={inputStyle(t)} />
          </div>
        )}

        {type === 'searchbar' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Placeholder</div>
            <input value={props.placeholder ?? ''} onChange={(e) => updateElementProps(selected.id, { placeholder: e.target.value })} style={inputStyle(t)} />
          </div>
        )}

        {type === 'image' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Image URL</div>
            <input value={props.src ?? ''} onChange={(e) => updateElementProps(selected.id, { src: e.target.value })} placeholder="Paste a URL…" style={inputStyle(t)} />
          </div>
        )}

        {type === 'avatar' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Initials</div>
              <input value={props.initials ?? ''} maxLength={3} onChange={(e) => updateElementProps(selected.id, { initials: e.target.value })} style={inputStyle(t)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Photo URL (optional)</div>
              <input value={props.src ?? ''} onChange={(e) => updateElementProps(selected.id, { src: e.target.value })} placeholder="Paste a URL…" style={inputStyle(t)} />
            </div>
          </>
        )}

        {(type === 'slider' || type === 'progress') && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Label</div>
              <input value={props.label ?? ''} onChange={(e) => updateElementProps(selected.id, { label: e.target.value })} style={inputStyle(t)} />
            </div>
            <SliderRow label="Value" value={props.value} min={0} max={100} onChange={(v) => updateElementProps(selected.id, { value: v })} t={t} />
          </>
        )}

        {type === 'rating' && (
          <SliderRow label="Stars" value={props.value} min={1} max={5} onChange={(v) => updateElementProps(selected.id, { value: v })} t={t} />
        )}

        {type === 'list' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Items (one per line)</div>
            <textarea
              value={props.items ?? ''}
              onChange={(e) => updateElementProps(selected.id, { items: e.target.value })}
              rows={4}
              style={{ ...inputStyle(t), resize: 'none', lineHeight: 1.5 }}
            />
          </div>
        )}

        {type === 'tabbar' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 6 }}>Tabs (comma-separated)</div>
              <input value={props.tabs ?? ''} onChange={(e) => updateElementProps(selected.id, { tabs: e.target.value })} placeholder="Home,Explore,Profile" style={inputStyle(t)} />
            </div>
            <SliderRow label="Active tab" value={props.activeTab ?? 0} min={0} max={Math.max(0, (props.tabs ?? 'Home,Explore,Profile').split(',').length - 1)} onChange={(v) => updateElementProps(selected.id, { activeTab: v })} t={t} />
          </>
        )}
      </div>

      {/* ── Style ──────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12, fontWeight: 500 }}>Style</div>

        {/* Button variant */}
        {type === 'button' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8 }}>Variant</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['primary', 'secondary', 'ghost'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => updateElementProps(selected.id, { variant: v })}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8, border: '1.5px solid',
                      borderColor: props.variant === v ? '#6366f1' : t.borderStrong,
                      background: props.variant === v ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: props.variant === v ? t.accentText : t.textSecondary,
                      fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <ColorRow label="BG color" value={props.bgColor} onChange={(v) => updateElementProps(selected.id, { bgColor: v })} t={t} />
            <ColorRow label="Text color" value={props.textColor} onChange={(v) => updateElementProps(selected.id, { textColor: v })} t={t} />
          </>
        )}

        {/* Alert variant */}
        {type === 'alert' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8 }}>Variant</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['info', 'success', 'warning', 'error'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => updateElementProps(selected.id, { alertVariant: v })}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 6, border: '1.5px solid',
                    borderColor: props.alertVariant === v ? '#6366f1' : t.borderStrong,
                    background: props.alertVariant === v ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: props.alertVariant === v ? t.accentText : t.textSecondary,
                    fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color rows for various types */}
        {type === 'card' && <ColorRow label="Background" value={props.bgColor} onChange={(v) => updateElementProps(selected.id, { bgColor: v })} t={t} />}
        {type === 'badge' && <ColorRow label="Color" value={props.badgeColor} onChange={(v) => updateElementProps(selected.id, { badgeColor: v })} t={t} />}
        {type === 'rating' && <ColorRow label="Star color" value={props.badgeColor} onChange={(v) => updateElementProps(selected.id, { badgeColor: v })} t={t} />}
        {(type === 'slider' || type === 'progress' || type === 'avatar' || type === 'checkbox' || type === 'tabbar') && (
          <ColorRow label="Color" value={props.bgColor} onChange={(v) => updateElementProps(selected.id, { bgColor: v })} t={t} />
        )}
        {type === 'divider' && <ColorRow label="Line color" value={props.bgColor} onChange={(v) => updateElementProps(selected.id, { bgColor: v })} t={t} />}

        {/* Text color + font size */}
        {(type === 'text' || type === 'heading' || type === 'list') && (
          <>
            <ColorRow label="Color" value={props.textColor} onChange={(v) => updateElementProps(selected.id, { textColor: v })} t={t} />
            <SliderRow label="Font size" value={props.fontSize} min={10} max={72} onChange={(v) => updateElementProps(selected.id, { fontSize: v })} t={t} />
          </>
        )}

        {/* Border radius */}
        {HAS_RADIUS.has(type) && (
          <SliderRow label="Roundness" value={props.borderRadius ?? globalRadius} min={0} max={40} onChange={(v) => updateElementProps(selected.id, { borderRadius: v })} t={t} />
        )}

        {/* Shadow */}
        {type === 'card' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: t.textSecondary, flex: 1 }}>Shadow</span>
            <button
              onClick={() => updateElementProps(selected.id, { shadow: !props.shadow })}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: props.shadow ? '#6366f1' : t.borderStrong,
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: props.shadow ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        )}

        {/* Opacity */}
        <SliderRow
          label="Opacity"
          value={Math.round((props.opacity ?? 1) * 100)}
          min={10} max={100}
          onChange={(v) => updateElementProps(selected.id, { opacity: v / 100 })}
          t={t}
        />
      </div>

      {/* ── Alignment ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 10, fontWeight: 500 }}>Align in canvas</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {ALIGN_BUTTONS.map(({ icon, title, align }) => (
            <button
              key={align}
              onClick={() => alignElement(selected.id, align)}
              title={title}
              style={{
                flex: 1, height: 28, borderRadius: 6,
                border: `1px solid ${t.border}`,
                background: 'transparent', color: t.textSecondary,
                fontSize: 14, cursor: 'pointer',
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Behaviors ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 12, fontWeight: 500 }}>Behaviors</div>

        {flows.length > 0 && (
          <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {flows.map((flow) => (
              <div
                key={flow.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 10px', background: 'rgba(99,102,241,0.08)',
                  borderRadius: 8, fontSize: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.textSecondary, marginBottom: 2 }}>When {flow.trigger}</div>
                  <div style={{ color: t.accentText }}>{flow.description}</div>
                </div>
                <button
                  onClick={() => removeFlow(selected.id, flow.id)}
                  title="Remove behavior"
                  style={{
                    width: 18, height: 18, borderRadius: 4, border: 'none',
                    background: 'transparent', color: t.textDim,
                    cursor: 'pointer', fontSize: 14, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => openFlowModal(selected.id)}
          style={{
            width: '100%', padding: '10px', borderRadius: 10,
            border: '1.5px dashed rgba(99,102,241,0.3)',
            background: 'transparent', color: '#6366f1',
            fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: 10,
          }}
        >
          + Add behavior
        </button>

        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <button
            onClick={() => copyElement(selected.id)}
            title="Ctrl+C"
            style={{
              flex: 1, padding: '7px', borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: 'transparent', color: t.textSecondary,
              fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Copy
          </button>
          <button
            onClick={() => duplicateElement(selected.id)}
            title="Ctrl+D"
            style={{
              flex: 1, padding: '7px', borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: 'transparent', color: t.textSecondary,
              fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Duplicate
          </button>
        </div>

        <button
          onClick={() => removeElement(selected.id)}
          style={{
            width: '100%', padding: '8px', borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'transparent', color: '#f87171',
            fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Remove  (Del)
        </button>
      </div>
    </div>
  )
}

function inputStyle(t: UITheme): React.CSSProperties {
  return {
    width: '100%', padding: '8px 12px',
    background: t.bgInput, border: `1.5px solid ${t.borderMed}`,
    borderRadius: 8, color: t.textPrimary, fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
}

function PosSizeInput({ label, value, min, onChange, t }: {
  label: string; value: number; min?: number
  onChange: (v: number) => void; t: UITheme
}) {
  const [local, setLocal] = useState<string | null>(null)

  function commit(raw: string) {
    setLocal(null)
    const n = parseInt(raw, 10)
    if (!isNaN(n)) onChange(min !== undefined ? Math.max(min, n) : n)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, color: t.textDim, paddingLeft: 2 }}>{label}</span>
      <input
        type="number"
        value={local ?? value}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
        style={{
          width: '100%', padding: '6px 8px',
          background: t.bgInput, border: `1.5px solid ${t.borderMed}`,
          borderRadius: 7, color: t.textPrimary, fontSize: 12,
          fontFamily: 'Inter, sans-serif', outline: 'none',
          MozAppearance: 'textfield',
        } as React.CSSProperties}
      />
    </div>
  )
}
