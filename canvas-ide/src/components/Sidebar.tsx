import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { PIECES, PIECE_CATEGORIES, ANIMATIONS } from '../data/pieces'
import { useStore, selectElements } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import type { PieceDef, AnimationPreset } from '../types'

// Icon lookup for layer rows (fallback to type initial)
const PIECE_ICON: Record<string, string> = Object.fromEntries(PIECES.map((p) => [p.type, p.icon]))
PIECE_ICON['custom'] = '✦'

function elementLabel(el: { type: string; props: Record<string, string | number | undefined> }): string {
  const p = el.props as Record<string, string | number | undefined>
  const raw = p.label ?? p.text ?? p.placeholder ?? p.initials ?? ''
  const str = String(raw).trim()
  if (str) return str.length > 18 ? str.slice(0, 18) + '…' : str
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}

function PieceCard({ piece }: { piece: PieceDef }) {
  const t = useUITheme()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `piece-${piece.type}`,
    data: { type: 'PIECE', pieceType: piece.type, piece },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="piece-card"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10,
        background: t.bgPiece, border: `1px solid ${t.bgPieceBorder}`,
        cursor: 'grab', opacity: isDragging ? 0.4 : 1,
        userSelect: 'none', touchAction: 'none',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(99,102,241,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#a5b4fc', flexShrink: 0,
      }}>
        {piece.icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, marginBottom: 1 }}>{piece.label}</div>
        <div style={{ fontSize: 11, color: t.textDim }}>{piece.description}</div>
      </div>
    </div>
  )
}

function ScreensPanel() {
  const { screens, activeScreenId, switchScreen, addScreen, renameScreen, removeScreen } = useStore()
  const t = useUITheme()
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 4 }}>
        <span style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Screens</span>
        <button
          onClick={addScreen}
          style={{
            padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)',
            background: 'transparent', color: '#6366f1', fontSize: 11,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          + Add
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {screens.map((screen, i) => (
          <div
            key={screen.id}
            onClick={() => switchScreen(screen.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              background: screen.id === activeScreenId ? t.bgSelected : 'transparent',
              border: screen.id === activeScreenId ? `1px solid ${t.bgSelectedBorder}` : '1px solid transparent',
            }}
          >
            <div style={{
              width: 24, height: 32, borderRadius: 3,
              background: screen.id === activeScreenId ? 'rgba(99,102,241,0.3)' : t.bgPiece,
              border: `1px solid ${t.border}`,
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: t.textSecondary,
            }}>
              {i + 1}
            </div>

            {editingId === screen.id ? (
              <input
                autoFocus
                defaultValue={screen.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => { renameScreen(screen.id, e.target.value || screen.name); setEditingId(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { renameScreen(screen.id, (e.target as HTMLInputElement).value || screen.name); setEditingId(null) }
                  if (e.key === 'Escape') setEditingId(null)
                }}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: t.textPrimary, fontSize: 12, fontFamily: 'Inter, sans-serif',
                }}
              />
            ) : (
              <span
                onDoubleClick={(e) => { e.stopPropagation(); setEditingId(screen.id) }}
                style={{ flex: 1, fontSize: 12, color: screen.id === activeScreenId ? t.textPrimary : t.textSecondary, userSelect: 'none' }}
              >
                {screen.name}
              </span>
            )}

            {screens.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeScreen(screen.id) }}
                style={{
                  width: 16, height: 16, borderRadius: 4, border: 'none',
                  background: 'transparent', color: t.textDim, fontSize: 12,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function LayersPanel() {
  const { selectedId, selectElement, toggleElementLocked, toggleElementHidden, moveElementUp, moveElementDown, removeElement } = useStore()
  const elements = useStore(selectElements)
  const t = useUITheme()

  // Show top layer first
  const reversed = [...elements].reverse()

  if (reversed.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: t.textDim }}>
        <div style={{ fontSize: 24 }}>⊡</div>
        <div style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>No elements yet.<br />Drag pieces to the canvas.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {reversed.map((el) => {
        const isSelected = el.id === selectedId
        const icon = PIECE_ICON[el.type] ?? el.type[0].toUpperCase()
        const label = elementLabel({ type: el.type, props: el.props as Record<string, string | number | undefined> })

        return (
          <div
            key={el.id}
            onClick={() => selectElement(isSelected ? null : el.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
              background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent',
              border: isSelected ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
              opacity: el.hidden ? 0.45 : 1,
              transition: 'background 0.1s',
            }}
          >
            {/* Type icon */}
            <div style={{
              width: 22, height: 22, borderRadius: 5, flexShrink: 0,
              background: isSelected ? 'rgba(99,102,241,0.2)' : t.bgPiece,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: isSelected ? '#a5b4fc' : t.textSecondary,
            }}>
              {icon}
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: isSelected ? t.textPrimary : t.textSecondary, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {label}
              </div>
              <div style={{ fontSize: 10, color: t.textDim }}>{el.type}</div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <LayerBtn
                title={el.hidden ? 'Show' : 'Hide'}
                onClick={() => toggleElementHidden(el.id)}
                active={!el.hidden}
                icon={el.hidden ? '○' : '●'}
                t={t}
              />
              <LayerBtn
                title={el.locked ? 'Unlock' : 'Lock'}
                onClick={() => toggleElementLocked(el.id)}
                active={!!el.locked}
                icon={el.locked ? '🔒' : '🔓'}
                t={t}
              />
              <LayerBtn title="Move up (higher z)" onClick={() => moveElementUp(el.id)} icon="↑" t={t} />
              <LayerBtn title="Move down (lower z)" onClick={() => moveElementDown(el.id)} icon="↓" t={t} />
              <LayerBtn
                title="Delete"
                onClick={() => { removeElement(el.id) }}
                icon="×"
                danger
                t={t}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LayerBtn({ title, onClick, icon, active, danger, t }: {
  title: string; onClick: () => void; icon: string
  active?: boolean; danger?: boolean; t: ReturnType<typeof useUITheme>
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 20, height: 20, borderRadius: 4, border: 'none',
        background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
        color: danger ? 'rgba(248,113,113,0.7)' : active ? '#a5b4fc' : t.textDim,
        fontSize: 11, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {icon}
    </button>
  )
}

function AnimationCard({ anim, isActive, onApply }: {
  anim: typeof ANIMATIONS[number]
  isActive: boolean
  onApply: () => void
}) {
  const t = useUITheme()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `anim-${anim.id}`,
    data: { type: 'ANIMATION', animationId: anim.id },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onApply}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 10, cursor: 'grab',
        background: isActive ? 'rgba(99,102,241,0.18)' : t.bgPiece,
        border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : t.bgPieceBorder}`,
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none', touchAction: 'none',
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      {/* Live preview pill */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: isActive ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div
          className={`anim-${anim.id}`}
          style={{ fontSize: 16, color: '#a5b4fc', lineHeight: 1 }}
        >
          {anim.icon}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: isActive ? '#a5b4fc' : t.textPrimary, marginBottom: 1 }}>
          {anim.label}
          {!anim.loop && <span style={{ fontSize: 10, color: t.textDim, marginLeft: 5, fontWeight: 400 }}>once</span>}
        </div>
        <div style={{ fontSize: 11, color: t.textDim }}>{anim.description}</div>
      </div>
      {isActive && (
        <div style={{ fontSize: 10, color: '#a5b4fc', flexShrink: 0 }}>✓</div>
      )}
    </div>
  )
}

function AnimationsPanel() {
  const t = useUITheme()
  const { selectedId, updateElementProps } = useStore()
  const elements = useStore(selectElements)
  const selected = elements.find(e => e.id === selectedId)
  const activeAnim = selected?.props.animation as AnimationPreset | undefined

  function applyAnimation(animId: string) {
    if (!selectedId) return
    updateElementProps(selectedId, { animation: animId === activeAnim ? undefined : animId as AnimationPreset })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!selectedId && (
        <div style={{
          padding: '20px 10px', borderRadius: 12, textAlign: 'center',
          background: t.bgPiece, border: `1px dashed ${t.bgPieceBorder}`,
          color: t.textDim, fontSize: 12, lineHeight: 1.6,
        }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>✦</div>
          Select an element on the canvas, then click or drag an animation onto it
        </div>
      )}

      {selectedId && activeAnim && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <span style={{ fontSize: 11, color: '#a5b4fc', flex: 1 }}>Active: <strong>{activeAnim}</strong></span>
          <button
            onClick={() => updateElementProps(selectedId, { animation: undefined })}
            style={{ fontSize: 10, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
              borderRadius: 4, fontFamily: 'Inter,sans-serif' }}
          >
            Remove
          </button>
        </div>
      )}

      <div style={{ fontSize: 10, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4, marginTop: 2 }}>
        Looping
      </div>
      {ANIMATIONS.filter(a => a.loop).map(anim => (
        <AnimationCard key={anim.id} anim={anim}
          isActive={activeAnim === anim.id}
          onApply={() => applyAnimation(anim.id)} />
      ))}

      <div style={{ fontSize: 10, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4, marginTop: 6 }}>
        Entrance
      </div>
      {ANIMATIONS.filter(a => !a.loop).map(anim => (
        <AnimationCard key={anim.id} anim={anim}
          isActive={activeAnim === anim.id}
          onApply={() => applyAnimation(anim.id)} />
      ))}
    </div>
  )
}

export function Sidebar() {
  const t = useUITheme()
  const { openCustomElementModal } = useStore()
  const [tab, setTab] = useState<'elements' | 'layers' | 'animations'>('elements')

  const tabStyle = (active: boolean) => ({
    flex: 1, padding: '6px 0', borderRadius: 7, border: 'none',
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? '#a5b4fc' : t.textSecondary,
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
  })

  return (
    <div style={{
      width: 220,
      borderRight: `1px solid ${t.border}`,
      background: t.bgSidebar,
      padding: '12px 10px 16px',
      overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 3, background: t.bgInput, borderRadius: 10, padding: 3 }}>
        <button style={tabStyle(tab === 'elements')} onClick={() => setTab('elements')}>Elements</button>
        <button style={tabStyle(tab === 'layers')} onClick={() => setTab('layers')}>Layers</button>
        <button style={tabStyle(tab === 'animations')} onClick={() => setTab('animations')}>Animate</button>
      </div>

      {tab === 'elements' && (
        <>
          {/* Custom element creator */}
          <button
            onClick={() => openCustomElementModal()}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12,
              border: '1.5px dashed rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.06)',
              color: '#a5b4fc', fontSize: 13, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>✦</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 500 }}>Custom element</div>
              <div style={{ fontSize: 11, color: 'rgba(165,180,252,0.6)', marginTop: 1 }}>Describe or draw</div>
            </div>
          </button>

          <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4 }}>
            Pieces
          </div>

          {PIECE_CATEGORIES.map((category) => {
            const categoryPieces = PIECES.filter((p) => category.types.includes(p.type))
            return (
              <div key={category.label}>
                <div style={{ fontSize: 11, color: t.textDim, marginBottom: 8, paddingLeft: 4 }}>
                  {category.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {categoryPieces.map((piece) => (
                    <PieceCard key={piece.type} piece={piece} />
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}

      {tab === 'animations' && (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4, marginBottom: 10 }}>
            Animations
          </div>
          <AnimationsPanel />
        </div>
      )}

      {tab === 'layers' && (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: 4, marginBottom: 10 }}>
            Layers (top → bottom)
          </div>
          <LayersPanel />
        </div>
      )}

      <ScreensPanel />
    </div>
  )
}
