import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { CanvasElement, Screen, DeviceType, AppStyles, ElementType, Flow, ElementProps, AlignType } from '../types'
import { DEVICE_SIZES } from '../data/devices'

interface HistorySnapshot {
  screens: Screen[]
  activeScreenId: string
}

interface CanvasStore {
  // Screens
  screens: Screen[]
  activeScreenId: string

  // Selection & UI
  selectedId: string | null
  device: DeviceType
  styles: AppStyles
  uiTheme: 'dark' | 'light'
  flowModalElementId: string | null
  customElementModalOpen: boolean
  customElementEditId: string | null
  previewMode: boolean
  previewScreenId: string
  snapToGrid: boolean

  // Clipboard
  clipboard: CanvasElement | null

  // History
  past: HistorySnapshot[]
  future: HistorySnapshot[]

  // Derived helpers (call inside actions)
  _snapshot: () => HistorySnapshot
  _pushHistory: () => void

  // Screen actions
  addScreen: () => void
  removeScreen: (id: string) => void
  renameScreen: (id: string, name: string) => void
  switchScreen: (id: string) => void

  // Element actions (operate on active screen)
  addElement: (type: ElementType, x: number, y: number, width: number, height: number, props: ElementProps) => void
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
  updateElementProps: (id: string, props: Partial<ElementProps>) => void
  removeElement: (id: string) => void
  duplicateElement: (id: string) => void
  copyElement: (id: string) => void
  pasteElement: () => void
  alignElement: (id: string, align: AlignType) => void
  selectElement: (id: string | null) => void
  toggleElementLocked: (id: string) => void
  toggleElementHidden: (id: string) => void
  moveElementUp: (id: string) => void
  moveElementDown: (id: string) => void
  setScreenBackground: (color: string) => void
  toggleSnapToGrid: () => void
  importProject: (data: { screens: Screen[]; styles: AppStyles; device: DeviceType; uiTheme: 'dark' | 'light' }) => void

  // Global style, device & misc
  setDevice: (device: DeviceType) => void
  updateStyles: (styles: Partial<AppStyles>) => void
  setUiTheme: (theme: 'dark' | 'light') => void

  // Flow modal
  openFlowModal: (elementId: string) => void
  closeFlowModal: () => void

  // Custom element modal
  openCustomElementModal: (editId?: string) => void
  closeCustomElementModal: () => void
  addFlow: (elementId: string, flow: Omit<Flow, 'id'>) => void
  removeFlow: (elementId: string, flowId: string) => void

  // Preview
  setPreviewMode: (on: boolean) => void
  setPreviewScreen: (id: string) => void

  // Game mode
  gameModeOpen: boolean
  openGameMode: () => void
  closeGameMode: () => void

  // History
  undo: () => void
  redo: () => void

  // Auto-layout
  makePretty: () => void
}

const DEFAULT_SCREEN_ID = uuidv4()

const INITIAL_STYLES: AppStyles = {
  primaryColor: '#6366f1',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  textColor: '#111827',
  borderRadius: 'medium',
}

// Per-type canonical heights used by makePretty
const PRETTY_H: Record<string, number> = {
  heading: 44, text: 72, button: 50, input: 48, searchbar: 48,
  card: 180, image: 200, avatar: 64, badge: 36, slider: 56,
  progress: 48, rating: 40, alert: 52, divider: 16, list: 110,
  stat: 110, chart: 180, stepper: 72, video: 210, map: 200,
  skeleton: 120, checkbox: 36, toggle: 44, custom: 120,
}

function prettifyProps(type: string, props: ElementProps, styles: AppStyles, r: number): ElementProps {
  const p: ElementProps = { ...props }
  switch (type) {
    case 'heading':
      p.fontSize = p.fontSize ?? 26; p.fontWeight = p.fontWeight ?? '700'
      p.textColor = p.textColor ?? styles.textColor; break
    case 'text':
      p.fontSize = p.fontSize ?? 15; p.textColor = p.textColor ?? '#6b7280'; break
    case 'button':
      if (!p.bgColor) p.bgColor = styles.primaryColor
      p.textColor = p.textColor ?? '#ffffff'; p.borderRadius = r; break
    case 'input': case 'searchbar': case 'alert':
      p.borderRadius = r; break
    case 'card':
      p.shadow = true; p.bgColor = p.bgColor ?? '#ffffff'
      p.borderRadius = r + 6; p.padding = 20; break
    case 'stat':
      p.bgColor = p.bgColor ?? '#ffffff'; p.borderRadius = r + 6; break
    case 'badge':
      p.badgeColor = p.badgeColor ?? styles.primaryColor; break
    case 'avatar':
      p.bgColor = p.bgColor ?? styles.primaryColor; break
    case 'slider': case 'progress': case 'checkbox': case 'stepper':
      p.bgColor = p.bgColor ?? styles.primaryColor; break
    case 'tabbar':
      p.bgColor = p.bgColor ?? styles.primaryColor; break
    case 'image': case 'video': case 'map': case 'chart':
      p.borderRadius = r + 6; break
  }
  return p
}

function applySnapshot(state: CanvasStore, snap: HistorySnapshot): Partial<CanvasStore> {
  return { screens: snap.screens, activeScreenId: snap.activeScreenId, selectedId: null }
}

export const useStore = create<CanvasStore>((set, get) => ({
  screens: [{ id: DEFAULT_SCREEN_ID, name: 'Screen 1', elements: [] }],
  activeScreenId: DEFAULT_SCREEN_ID,
  selectedId: null,
  device: 'phone',
  uiTheme: 'dark',
  flowModalElementId: null,
  customElementModalOpen: false,
  customElementEditId: null,
  previewMode: false,
  previewScreenId: DEFAULT_SCREEN_ID,
  snapToGrid: false,
  gameModeOpen: false,
  clipboard: null,
  past: [],
  future: [],
  styles: INITIAL_STYLES,

  _snapshot: () => ({
    screens: JSON.parse(JSON.stringify(get().screens)),
    activeScreenId: get().activeScreenId,
  }),

  _pushHistory: () => {
    const snap = get()._snapshot()
    set((s) => ({
      past: [...s.past.slice(-49), snap],
      future: [],
    }))
  },

  // --- Screens ---
  addScreen: () => {
    get()._pushHistory()
    const id = uuidv4()
    const n = get().screens.length + 1
    set((s) => ({
      screens: [...s.screens, { id, name: `Screen ${n}`, elements: [] }],
      activeScreenId: id,
      selectedId: null,
    }))
  },

  removeScreen: (id) => {
    const { screens } = get()
    if (screens.length <= 1) return
    get()._pushHistory()
    const remaining = screens.filter((s) => s.id !== id)
    set((s) => ({
      screens: remaining,
      activeScreenId: s.activeScreenId === id ? remaining[0].id : s.activeScreenId,
      selectedId: null,
    }))
  },

  renameScreen: (id, name) => {
    set((s) => ({
      screens: s.screens.map((sc) => (sc.id === id ? { ...sc, name } : sc)),
    }))
  },

  switchScreen: (id) => set({ activeScreenId: id, selectedId: null }),

  // --- Elements ---
  addElement: (type, x, y, width, height, props) => {
    get()._pushHistory()
    const el: CanvasElement = { id: uuidv4(), type, x, y, width, height, props, flows: [] }
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId ? { ...sc, elements: [...sc.elements, el] } : sc
      ),
    }))
  },

  updateElement: (id, updates) => {
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId
          ? { ...sc, elements: sc.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)) }
          : sc
      ),
    }))
  },

  updateElementProps: (id, props) => {
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId
          ? {
              ...sc,
              elements: sc.elements.map((el) =>
                el.id === id ? { ...el, props: { ...el.props, ...props } } : el
              ),
            }
          : sc
      ),
    }))
  },

  removeElement: (id) => {
    get()._pushHistory()
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId
          ? { ...sc, elements: sc.elements.filter((el) => el.id !== id) }
          : sc
      ),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }))
  },

  duplicateElement: (id) => {
    get()._pushHistory()
    set((s) => {
      const screen = s.screens.find((sc) => sc.id === s.activeScreenId)
      if (!screen) return {}
      const el = screen.elements.find((e) => e.id === id)
      if (!el) return {}
      const copy: CanvasElement = {
        ...JSON.parse(JSON.stringify(el)),
        id: uuidv4(),
        x: el.x + 20,
        y: el.y + 20,
      }
      return {
        screens: s.screens.map((sc) =>
          sc.id === s.activeScreenId ? { ...sc, elements: [...sc.elements, copy] } : sc
        ),
        selectedId: copy.id,
      }
    })
  },

  copyElement: (id) => {
    const screen = get().screens.find((sc) => sc.id === get().activeScreenId)
    const el = screen?.elements.find((e) => e.id === id)
    if (el) set({ clipboard: JSON.parse(JSON.stringify(el)) })
  },

  pasteElement: () => {
    const { clipboard } = get()
    if (!clipboard) return
    get()._pushHistory()
    const copy: CanvasElement = {
      ...JSON.parse(JSON.stringify(clipboard)),
      id: uuidv4(),
      x: clipboard.x + 30,
      y: clipboard.y + 30,
    }
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId ? { ...sc, elements: [...sc.elements, copy] } : sc
      ),
      selectedId: copy.id,
    }))
  },

  alignElement: (id, align) => {
    const { device } = get()
    const { width: frameW, height: frameH } = DEVICE_SIZES[device]
    set((s) => {
      const screen = s.screens.find((sc) => sc.id === s.activeScreenId)
      const el = screen?.elements.find((e) => e.id === id)
      if (!el) return {}
      let newX = el.x, newY = el.y
      switch (align) {
        case 'left':     newX = 0; break
        case 'center-h': newX = Math.round((frameW - el.width) / 2); break
        case 'right':   newX = frameW - el.width; break
        case 'top':     newY = 0; break
        case 'center-v': newY = Math.round((frameH - el.height) / 2); break
        case 'bottom':  newY = frameH - el.height; break
      }
      return {
        screens: s.screens.map((sc) =>
          sc.id === s.activeScreenId
            ? { ...sc, elements: sc.elements.map((e) => e.id === id ? { ...e, x: newX, y: newY } : e) }
            : sc
        ),
      }
    })
  },

  selectElement: (id) => set({ selectedId: id }),

  toggleElementLocked: (id) => {
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId
          ? { ...sc, elements: sc.elements.map((el) => el.id === id ? { ...el, locked: !el.locked } : el) }
          : sc
      ),
    }))
  },

  toggleElementHidden: (id) => {
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId
          ? { ...sc, elements: sc.elements.map((el) => el.id === id ? { ...el, hidden: !el.hidden } : el) }
          : sc
      ),
    }))
  },

  moveElementUp: (id) => {
    set((s) => {
      const screen = s.screens.find((sc) => sc.id === s.activeScreenId)
      if (!screen) return {}
      const idx = screen.elements.findIndex((e) => e.id === id)
      if (idx >= screen.elements.length - 1) return {}
      const els = [...screen.elements]
      ;[els[idx], els[idx + 1]] = [els[idx + 1], els[idx]]
      return { screens: s.screens.map((sc) => sc.id === s.activeScreenId ? { ...sc, elements: els } : sc) }
    })
  },

  moveElementDown: (id) => {
    set((s) => {
      const screen = s.screens.find((sc) => sc.id === s.activeScreenId)
      if (!screen) return {}
      const idx = screen.elements.findIndex((e) => e.id === id)
      if (idx <= 0) return {}
      const els = [...screen.elements]
      ;[els[idx], els[idx - 1]] = [els[idx - 1], els[idx]]
      return { screens: s.screens.map((sc) => sc.id === s.activeScreenId ? { ...sc, elements: els } : sc) }
    })
  },

  setScreenBackground: (color) => {
    set((s) => ({
      screens: s.screens.map((sc) => sc.id === s.activeScreenId ? { ...sc, background: color } : sc),
    }))
  },

  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

  importProject: (data) => {
    set({
      screens: data.screens,
      styles: data.styles,
      device: data.device,
      uiTheme: data.uiTheme ?? 'dark',
      activeScreenId: data.screens[0]?.id ?? '',
      selectedId: null,
      past: [],
      future: [],
    })
  },

  setDevice: (device) => set({ device }),

  updateStyles: (styles) => set((s) => ({ styles: { ...s.styles, ...styles } })),

  setUiTheme: (uiTheme) => set({ uiTheme }),

  openFlowModal: (elementId) => set({ flowModalElementId: elementId }),
  closeFlowModal: () => set({ flowModalElementId: null }),

  openCustomElementModal: (editId) => set({ customElementModalOpen: true, customElementEditId: editId ?? null }),
  closeCustomElementModal: () => set({ customElementModalOpen: false, customElementEditId: null }),

  addFlow: (elementId, flow) => {
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId
          ? {
              ...sc,
              elements: sc.elements.map((el) =>
                el.id === elementId
                  ? { ...el, flows: [...el.flows, { ...flow, id: uuidv4() }] }
                  : el
              ),
            }
          : sc
      ),
    }))
  },

  removeFlow: (elementId, flowId) => {
    set((s) => ({
      screens: s.screens.map((sc) =>
        sc.id === s.activeScreenId
          ? {
              ...sc,
              elements: sc.elements.map((el) =>
                el.id === elementId
                  ? { ...el, flows: el.flows.filter((f) => f.id !== flowId) }
                  : el
              ),
            }
          : sc
      ),
    }))
  },

  setPreviewMode: (on) => {
    set((s) => ({ previewMode: on, previewScreenId: s.activeScreenId, selectedId: null }))
  },

  openGameMode: () => set({ gameModeOpen: true }),
  closeGameMode: () => set({ gameModeOpen: false }),

  setPreviewScreen: (id) => set({ previewScreenId: id }),

  undo: () => {
    const { past, future, _snapshot } = get()
    if (past.length === 0) return
    const current = _snapshot()
    const prev = past[past.length - 1]
    set((s) => ({
      ...applySnapshot(s as CanvasStore, prev),
      past: s.past.slice(0, -1),
      future: [current, ...s.future.slice(0, 49)],
    }))
  },

  redo: () => {
    const { future, _snapshot } = get()
    if (future.length === 0) return
    const current = _snapshot()
    const next = future[0]
    set((s) => ({
      ...applySnapshot(s as CanvasStore, next),
      past: [...s.past.slice(-49), current],
      future: s.future.slice(1),
    }))
  },

  makePretty: () => {
    const { activeScreenId, screens, device, styles } = get()
    const screen = screens.find(s => s.id === activeScreenId)
    if (!screen || screen.elements.length === 0) return

    get()._pushHistory()

    const { width: frameW, height: frameH } = DEVICE_SIZES[device]
    const pad = 20
    const gap = 16
    const contentW = frameW - pad * 2
    const radiusMap = { sharp: 4, medium: 12, soft: 24 }
    const r = radiusMap[styles.borderRadius]

    // Tabbars always pin to bottom
    const tabbars = screen.elements.filter(e => e.type === 'tabbar')
    const rest = screen.elements.filter(e => e.type !== 'tabbar')

    // Sort by original Y position so reading order is preserved
    rest.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)

    let currentY = 28

    const prettified = rest.map(el => {
      const h = PRETTY_H[el.type] ?? el.height
      let w = contentW
      let x = pad

      // Small/square elements: keep intrinsic size, center horizontally
      if (el.type === 'avatar') {
        w = 64; x = Math.round((frameW - 64) / 2)
      } else if (el.type === 'badge') {
        w = Math.min(el.width, 140); x = pad
      } else if (el.type === 'divider') {
        w = contentW; x = pad
      }

      const props = prettifyProps(el.type, el.props, styles, r)
      const updated = { ...el, x, y: currentY, width: w, height: h, props }
      currentY += h + gap
      return updated
    })

    const prettifiedTabs = tabbars.map(el => ({
      ...el,
      x: 0, y: frameH - 64, width: frameW, height: 64,
      props: prettifyProps(el.type, el.props, styles, r),
    }))

    set(s => ({
      screens: s.screens.map(sc =>
        sc.id === activeScreenId
          ? { ...sc, elements: [...prettified, ...prettifiedTabs] }
          : sc
      ),
      selectedId: null,
    }))
  },
}))

// Selector: active screen's elements
export const selectElements = (s: CanvasStore) =>
  s.screens.find((sc) => sc.id === s.activeScreenId)?.elements ?? []

// Selector: preview screen's elements
export const selectPreviewElements = (s: CanvasStore) =>
  s.screens.find((sc) => sc.id === s.previewScreenId)?.elements ?? []
