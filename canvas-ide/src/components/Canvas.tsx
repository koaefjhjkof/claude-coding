import { useRef, useState } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useStore, selectElements } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import { ElementRenderer } from './ElementRenderer'
import { DEVICE_SIZES } from '../data/devices'
import type { CanvasElement, DeviceType } from '../types'

const INLINE_EDITABLE = ['button', 'heading', 'text', 'badge', 'toggle', 'input']

function DraggableElement({ element, device }: { element: CanvasElement; device: DeviceType }) {
  const { selectedId, selectElement, updateElementProps } = useStore()
  const isSelected = selectedId === element.id
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

  return (
    <div
      ref={setNodeRef}
      {...(editing ? {} : listeners)}
      {...attributes}
      className={`canvas-element${isSelected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); selectElement(element.id) }}
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
        outline: isLocked && isSelected ? '2px dashed rgba(99,102,241,0.5)' : undefined,
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

      {/* Resize handle (hidden when locked) */}
      {isSelected && !isLocked && (
        <div
          style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 10, height: 10, borderRadius: 2,
            background: '#6366f1', border: '2px solid #fff',
            cursor: 'se-resize', zIndex: 20,
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            useStore.getState()._pushHistory()
            const startX = e.clientX, startY = e.clientY
            const startW = element.width, startH = element.height
            const scale = DEVICE_SIZES[device].scale
            const onMove = (me: MouseEvent) => {
              useStore.getState().updateElement(element.id, {
                width: Math.max(20, startW + (me.clientX - startX) / scale),
                height: Math.max(10, startH + (me.clientY - startY) / scale),
              })
            }
            const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
          }}
        />
      )}
    </div>
  )
}

export function Canvas() {
  const { device, selectElement, screens, activeScreenId, snapToGrid } = useStore()
  const elements = useStore(selectElements)
  const canvasRef = useRef<HTMLDivElement>(null)
  const size = DEVICE_SIZES[device]
  const t = useUITheme()
  const activeScreen = screens.find((s) => s.id === activeScreenId)
  const canvasBg = activeScreen?.background ?? '#faf8f5'

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' })

  return (
    <div
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: t.bgApp, position: 'relative', overflow: 'hidden',
      }}
      onClick={() => selectElement(null)}
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
        style={{ position: 'relative', transform: `scale(${size.scale})`, transformOrigin: 'center center' }}
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
              <DraggableElement key={el.id} element={el} device={device} />
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
    </div>
  )
}
