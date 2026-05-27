import { useRef, useState, useEffect, useCallback } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useStore, selectElements } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import { ElementRenderer } from './ElementRenderer'
import { DEVICE_SIZES } from '../data/devices'
import type { CanvasElement, DeviceType } from '../types'

const INLINE_EDITABLE = ['button', 'heading', 'text', 'badge', 'toggle', 'input']

interface ContextMenuState {
  x: number
  y: number
  elementId: string
}

function ContextMenu({
  menu,
  onClose,
}: {
  menu: ContextMenuState
  onClose: () => void
}) {
  const { copyElement, pasteElement, duplicateElement, moveElementUp, moveElementDown,
          toggleElementLocked, toggleElementHidden, removeElement, clipboard } = useStore()
  const elements = useStore(selectElements)
  const t = useUITheme()
  const el = elements.find((e) => e.id === menu.elementId)
  if (!el) return null

  function item(label: string, shortcut: string | null, action: () => void, danger = false) {
    return (
      <button
        key={label}
        onMouseDown={(e) => { e.stopPropagation(); action(); onClose() }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '7px 12px', border: 'none', borderRadius: 6,
          background: 'transparent', cursor: 'pointer', textAlign: 'left',
          color: danger ? '#f87171' : t.textPrimary,
          fontSize: 12, fontFamily: 'Inter, sans-serif', gap: 24,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? 'rgba(248,113,113,0.1)' : 'rgba(99,102,241,0.12)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <span>{label}</span>
        {shortcut && <span style={{ color: t.textDim, fontSize: 11 }}>{shortcut}</span>}
      </button>
    )
  }

  function sep() {
    return <div style={{ height: 1, background: t.border, margin: '3px 8px' }} />
  }

  // Clamp so menu doesn't go off-screen
  const menuW = 190, menuH = 300
  const left = Math.min(menu.x, window.innerWidth - menuW - 8)
  const top = Math.min(menu.y, window.innerHeight - menuH - 8)

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onMouseDown={onClose} />
      <div style={{
        position: 'fixed', left, top, zIndex: 999,
        background: t.bgModal, border: `1px solid ${t.borderMed}`,
        borderRadius: 10, padding: '4px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        minWidth: menuW,
      }}>
        {item('Copy', 'Ctrl+C', () => copyElement(menu.elementId))}
        {item('Duplicate', 'Ctrl+D', () => duplicateElement(menu.elementId))}
        {clipboard && item('Paste below', 'Ctrl+V', () => pasteElement())}
        {sep()}
        {item('Bring forward', null, () => moveElementUp(menu.elementId))}
        {item('Send backward', null, () => moveElementDown(menu.elementId))}
        {sep()}
        {item(el.locked ? 'Unlock' : 'Lock', null, () => toggleElementLocked(menu.elementId))}
        {item(el.hidden ? 'Show' : 'Hide', null, () => toggleElementHidden(menu.elementId))}
        {sep()}
        {item('Delete', 'Del', () => removeElement(menu.elementId), true)}
      </div>
    </>
  )
}

function DraggableElement({
  element,
  device,
  onContextMenu,
}: {
  element: CanvasElement
  device: DeviceType
  onContextMenu: (id: string, x: number, y: number) => void
}) {
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
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        selectElement(element.id)
        onContextMenu(element.id, e.clientX, e.clientY)
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
        pointerEvents: element.hidden ? 'none' : undefined,
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
            const scale = DEVICE_SIZES[device].scale * useStore.getState().canvasZoom
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
  const { device, selectElement, screens, activeScreenId, snapToGrid, canvasZoom, setCanvasZoom } = useStore()
  const elements = useStore(selectElements)
  const outerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const size = DEVICE_SIZES[device]
  const t = useUITheme()
  const activeScreen = screens.find((s) => s.id === activeScreenId)
  const canvasBg = activeScreen?.background ?? '#faf8f5'
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' })

  // Ctrl+wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setCanvasZoom(useStore.getState().canvasZoom + delta)
  }, [setCanvasZoom])

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  return (
    <div
      ref={outerRef}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: t.bgApp, position: 'relative', overflow: 'hidden',
      }}
      onClick={() => { selectElement(null); setCtxMenu(null) }}
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
        style={{ position: 'relative', transform: `scale(${size.scale * canvasZoom})`, transformOrigin: 'center center' }}
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
                onContextMenu={(id, x, y) => setCtxMenu({ x, y, elementId: id })}
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
        position: 'absolute', bottom: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 2,
        background: t.bgToolbar, border: `1px solid ${t.border}`,
        borderRadius: 9, padding: '3px 4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); setCanvasZoom(canvasZoom - 0.1) }}
          title="Zoom out (Ctrl+−)"
          style={{
            width: 26, height: 26, borderRadius: 6, border: 'none',
            background: 'transparent', color: t.textSecondary,
            fontSize: 16, cursor: 'pointer', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >−</button>
        <button
          onClick={(e) => { e.stopPropagation(); setCanvasZoom(1) }}
          title="Reset zoom (Ctrl+0)"
          style={{
            minWidth: 44, height: 26, borderRadius: 6, border: 'none',
            background: canvasZoom !== 1 ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: canvasZoom !== 1 ? t.accentText : t.textSecondary,
            fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
          }}
        >{Math.round(canvasZoom * 100)}%</button>
        <button
          onClick={(e) => { e.stopPropagation(); setCanvasZoom(canvasZoom + 0.1) }}
          title="Zoom in (Ctrl+=)"
          style={{
            width: 26, height: 26, borderRadius: 6, border: 'none',
            background: 'transparent', color: t.textSecondary,
            fontSize: 16, cursor: 'pointer', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />
      )}
    </div>
  )
}
