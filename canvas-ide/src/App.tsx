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
import { DrawingToolbar } from './components/DrawingToolbar'
import { Sidebar } from './components/Sidebar'
import { Canvas } from './components/Canvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { FlowModal } from './components/FlowModal'
import { CustomElementModal } from './components/CustomElementModal'
import { PreviewMode } from './components/PreviewMode'
import { useStore, selectElements } from './store/useStore'
import { useUITheme } from './hooks/useUITheme'
import { PIECES } from './data/pieces'
import { getDeviceSpec } from './data/devices'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { getLocalUser } from './lib/localAuth'

// Lazy-load GameMode so Three.js (~500 KB) is only fetched when the user opens it
const GameMode = lazy(() =>
  import('./components/GameMode').then((m) => ({ default: m.GameMode }))
)

export default function App() {
  const { addElement, updateElement, device, selectedId, selectedIds, removeElement, removeSelectedElements,
          duplicateElement, copyElement, pasteElement, undo, redo, previewMode, setPreviewMode,
          drawMode, setDrawMode, setDrawTool,
          setUser, setUserProfile, addFlow } = useStore()
  const t = useUITheme()

  // ── Auth: restore session on startup ────────────────────────────────────────
  useEffect(() => {
    // 1. Always check for a local (no-setup) user first
    const localUser = getLocalUser()
    if (localUser) {
      setUser({ id: localUser.id, email: localUser.name })
      setUserProfile({ id: localUser.id, username: localUser.name, bio: null, avatar_url: null, updated_at: localUser.createdAt })
    }

    // 2. If Supabase is configured, also listen for cloud auth (overrides local if present)
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      if (u) {
        setUser({ id: u.id, email: u.email })
        fetchUserProfile(u.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (u) {
        setUser({ id: u.id, email: u.email })
        fetchUserProfile(u.id)
      } else if (!getLocalUser()) {
        // Only clear if there's no local user either
        setUser(null)
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchUserProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setUserProfile(data)
  }

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
        if (drawMode) { setDrawMode(false); return }
        useStore.getState().selectElement(null)
      }

      // Draw-tool keyboard shortcuts (only when draw mode is active and not typing)
      if (drawMode && !isTyping && !e.ctrlKey && !e.metaKey) {
        const keyMap: Record<string, Parameters<typeof setDrawTool>[0]> = {
          p: 'pen', c: 'pencil', k: 'marker',
          h: 'highlighter', n: 'neon', y: 'spray',
          l: 'line', a: 'arrow', r: 'rect', e: 'ellipse',
          s: 'star', t: 'triangle',
          // Paint brushes
          w: 'watercolor', o: 'oil', g: 'acrylic', i: 'inkwash',
        }
        const tool = keyMap[e.key.toLowerCase()]
        if (tool) { e.preventDefault(); setDrawTool(tool); return }
      }

      // Zoom keyboard shortcuts (Ctrl+= zoom in, Ctrl+- zoom out, Ctrl+0 reset)
      if (!isTyping && (e.ctrlKey || e.metaKey)) {
        const STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          const { zoom, setZoom } = useStore.getState()
          const next = STEPS.find((z) => z > zoom + 0.01)
          setZoom(next ?? 3)
        }
        if (e.key === '-') {
          e.preventDefault()
          const { zoom, setZoom } = useStore.getState()
          const prev = [...STEPS].reverse().find((z) => z < zoom - 0.01)
          setZoom(prev ?? 0.25)
        }
        if (e.key === '0') {
          e.preventDefault()
          useStore.getState().setZoom(1)
        }
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
        // Ctrl+A: select all elements on the current screen
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          e.preventDefault()
          const els = selectElements(useStore.getState())
          if (els.length > 0) {
            const { selectElement: sel } = useStore.getState()
            sel(els[0].id)
            els.slice(1).forEach((el) => sel(el.id, true))
          }
        }
        // Arrow keys: nudge selected element(s) by 1px (or 10px with Shift)
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && (selectedId || selectedIds.length > 0)) {
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          const store = useStore.getState()
          const curElements = selectElements(store)
          const toMove = selectedIds.length > 1 ? selectedIds : selectedId ? [selectedId] : []
          toMove.forEach((id) => {
            const el = curElements.find((e) => e.id === id)
            if (el) store.updateElement(id, { x: Math.max(0, el.x + dx), y: Math.max(0, el.y + dy) })
          })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, selectedIds, removeElement, removeSelectedElements, duplicateElement, copyElement, pasteElement, undo, redo, previewMode, setPreviewMode, drawMode, setDrawMode, setDrawTool])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event
    if (!active.data.current) return

    // Read volatile values fresh from the store to keep deps minimal
    const { zoom: curZoom, snapToGrid: curSnap, selectedIds: curIds, devicePreset: curPreset } = useStore.getState()
    const curElements = selectElements(useStore.getState())

    const dragData = active.data.current
    const scale = getDeviceSpec(curPreset).scale * curZoom
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
    } else if (dragData.type === 'ANIMATION') {
      const { selectedId: curSelected } = useStore.getState()
      if (curSelected) {
        addFlow(curSelected, dragData.animDef)
      }
    }
  }, [device, addElement, updateElement, addFlow])

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: t.bgApp }}>
        <Toolbar />
        {drawMode && <DrawingToolbar />}
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
