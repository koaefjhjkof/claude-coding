import { useRef, useState } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useStore, selectElements } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import { ElementRenderer } from './ElementRenderer'
import { DEVICE_SIZES } from '../data/devices'
import type { CanvasElement, DeviceType } from '../types'

const INLINE_EDITABLE = ['button', 'heading', 'text', 'badge', 'toggle', 'input']

function DraggableElement({
  element,
  device,
  zoom,
  isInMultiSelect,
}: {
  element: CanvasElement
  device: DeviceType
  zoom: number
  isInMultiSelect: boolean
}) {
  const { selectedId, selectedIds, selectElement, updateElementProps } = useStore()
  const isSelected = selectedId === element.id
  const isMulti = isInMultiSelect && selectedIds.length > 1
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
    if (element.type === 'button' || element.type === 'badge' || element.type === 'toggle') {
      updateElementProps(element.id, { label: val })
    } else if (element.type === 'text' || element.type === 'heading') {
      updateElementProps(element.id, { text: val })
    } else if (element.type === 'input') {
      updateElementProps(element.id, { placeholder: val })
    }
  }

  // Selection ring color: purple for multi, blue for single
  const selectionColor = isMulti ? 'rgba(99,102,241,0.6)' : '#6366f1'
  const selectionStyle =
    isSelected || isMulti
      ? { outline: `2px solid ${selectionColor}`, outlineOffset: '1px' }
      : {}
  const lockedStyle = isLocked && isSelected ? { outline: '2px dashed rgba(99,102,241,0.4)', outlineOffset: '1px' } : {}

  return (
    <div
      ref={setNodeRef}
      {...(editing ? {} : listeners)}
      {...attributes}
      className={`canvas-element${isSelected ? ' selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        selectElement(element.id, e.shiftKey)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (INLINE_EDITABLE.includes(element.type)) setEditing(true)
      }}
      style={{
        position: 'absolute',
        left: element.x + tx, top: element.y + ty,
        width: element.width, height: element.height,
        cursor: editing ? 'text' : isLocked ? 'default' : isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.6 : element.hidden ? 0.25 : 1,
        userSelect: 'none', touchAction: 'none',
        zIndex: isSelected ? 10 : 1,
        ...selectionStyle,
        ...lockedStyle,
      }}
    >
      {editing && INLINE_EDITABLE.includes(element.type) ? (
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

      {/* Resize handle (hidden when locked or not the primary selected) */}
      {isSelected && !isLocked && (
        <div
          style={{
            position: 'absolute', bottom: -5, right: -5,
            width: 11, height: 11, borderRadius: 3,
            background: '#6366f1', border: '2px solid #fff',
            cursor: 'se-resize', zIndex: 20,
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            useStore.getState()._pushHistory()
            const startX = e.clientX, startY = e.clientY
            const startW = element.width, startH = element.height
            const scale = DEVICE_SIZES[device].scale * zoom
            const onMove = (me: MouseEvent) => {
              useStore.getState().updateElement(element.id, {
                width: Math.max(20, startW + (me.clientX - startX) / scale),
                height: Math.max(10, startH + (me.clientY - startY) / scale),
              })
            }
            const onUp = () => {
              window.removeEventListener('mousemove', onMove)
              window.removeEventListener('mouseup', onUp)
            }
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
          }}
        />
      )}
    </div>
  )
}

export function Canvas() {
  const { device, selectElement, screens, activeScreenId, snapToGrid, zoom, setZoom, selectedIds } = useStore()
  const elements = useStore(selectElements)
  const canvasRef = useRef<HTMLDivElement>(null)
  const size = DEVICE_SIZES[device]
  const t = useUITheme()
  const activeScreen = screens.find((s) => s.id === activeScreenId)
  const canvasBg = activeScreen?.background ?? '#faf8f5'

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' })

  const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]

  function stepZoom(dir: 1 | -1) {
    const cur = zoom
    if (dir === 1) {
      const next = ZOOM_STEPS.find((z) => z > cur + 0.01)
      setZoom(next ?? 3)
    } else {
      const prev = [...ZOOM_STEPS].reverse().find((z) => z < cur - 0.01)
      setZoom(prev ?? 0.25)
    }
  }

  return (
    <div
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: t.bgApp, position: 'relative', overflow: 'hidden',
      }}
      onClick={() => selectElement(null)}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          const delta = e.deltaY > 0 ? -0.08 : 0.08
          setZoom(zoom + delta)
        }
      }}
    >
      {/* Dot/grid overlay */}
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
            {elements.map((el) => (
              <DraggableElement
                key={el.id}
                element={el}
                device={device}
                zoom={zoom}
                isInMultiSelect={selectedIds.includes(el.id)}
              />
            ))}
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

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 18, right: 20,
        display: 'flex', alignItems: 'center', gap: 1,
        background: t.bgPanel, border: `1px solid ${t.border}`,
        borderRadius: 10, padding: '3px 4px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
      }} onClick={(e) => e.stopPropagation()}>
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

function ZoomBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
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
