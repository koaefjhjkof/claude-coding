import { useEffect, useCallback, lazy, Suspense } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { Canvas } from './components/Canvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { FlowModal } from './components/FlowModal'
import { CustomElementModal } from './components/CustomElementModal'
import { PreviewMode } from './components/PreviewMode'
import { useStore, selectElements } from './store/useStore'
import { useUITheme } from './hooks/useUITheme'
import { PIECES } from './data/pieces'
import { DEVICE_SIZES } from './data/devices'

// Lazy-load GameMode so Three.js (~500 KB) is only fetched when the user opens it
const GameMode = lazy(() =>
  import('./components/GameMode').then((m) => ({ default: m.GameMode }))
)

export default function App() {
  const { addElement, updateElement, device, selectedId, selectedIds, removeElement, removeSelectedElements,
          duplicateElement, copyElement, pasteElement, undo, redo, previewMode, setPreviewMode } = useStore()
  const t = useUITheme()

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA'

      if (e.key === 'Escape') {
        if (previewMode) { setPreviewMode(false); return }
        useStore.getState().selectElement(null)
      }

      if (!isTyping) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedIds.length > 1) { removeSelectedElements() }
          else if (selectedId) { removeElement(selectedId) }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault(); undo()
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
          e.preventDefault(); redo()
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) {
          e.preventDefault(); duplicateElement(selectedId)
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) {
          e.preventDefault(); copyElement(selectedId)
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          e.preventDefault(); pasteElement()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, selectedIds, removeElement, removeSelectedElements, duplicateElement, copyElement, pasteElement, undo, redo, previewMode, setPreviewMode])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event
    if (!active.data.current) return

    // Read volatile values fresh from the store to keep deps minimal
    const { zoom: curZoom, snapToGrid: curSnap, selectedIds: curIds } = useStore.getState()
    const curElements = selectElements(useStore.getState())

    const dragData = active.data.current
    const scale = DEVICE_SIZES[device].scale * curZoom
    const snap = (v: number) => curSnap ? Math.round(v / 8) * 8 : v

    if (dragData.type === 'PIECE' && over?.id === 'canvas') {
      const piece = PIECES.find((p) => p.type === dragData.pieceType)
      if (!piece) return
      const canvasZone = document.getElementById('canvas-drop-zone')
      if (!canvasZone) return
      const rect = canvasZone.getBoundingClientRect()
      const translated = active.rect.current.translated
      if (!translated) return
      const x = snap(Math.max(0, (translated.left - rect.left) / scale))
      const y = snap(Math.max(0, (translated.top - rect.top) / scale))
      addElement(piece.type, x, y, piece.defaultWidth, piece.defaultHeight, piece.defaultProps)
    } else if (dragData.type === 'ELEMENT') {
      const el = curElements.find((e) => e.id === dragData.elementId)
      if (!el) return
      const dx = delta.x / scale
      const dy = delta.y / scale

      // Move all selected elements together if dragging one of them
      if (curIds.includes(dragData.elementId) && curIds.length > 1) {
        for (const sid of curIds) {
          const sel = curElements.find((e) => e.id === sid)
          if (sel) {
            updateElement(sid, {
              x: snap(Math.max(0, sel.x + dx)),
              y: snap(Math.max(0, sel.y + dy)),
            })
          }
        }
      } else {
        updateElement(dragData.elementId, {
          x: snap(Math.max(0, el.x + dx)),
          y: snap(Math.max(0, el.y + dy)),
        })
      }
    }
  }, [device, addElement, updateElement])

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: t.bgApp }}>
        <Toolbar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <Canvas />
          {!previewMode && <PropertiesPanel />}
        </div>
      </div>
      <FlowModal />
      <CustomElementModal />
      {previewMode && <PreviewMode />}
      <Suspense fallback={null}>
        <GameMode />
      </Suspense>
    </DndContext>
  )
}
