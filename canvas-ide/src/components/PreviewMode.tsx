import { useState, useRef, useEffect } from 'react'
import { useStore, selectPreviewElements } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import { ElementRenderer } from './ElementRenderer'
import { DEVICE_SIZES } from '../data/devices'
import { aiInterpretAction, getApiKey } from '../utils/aiInterpretAction'
import type { CanvasElement, ElementProps, ElementType, Flow } from '../types'
import { PIECES } from '../data/pieces'

// ─── Colour vocabulary ───────────────────────────────────────────────────────
const NAMED_COLORS: Record<string, string> = {
  red: '#ef4444', crimson: '#dc2626', rose: '#f43f5e',
  blue: '#3b82f6', navy: '#1e3a8a', sky: '#0ea5e9',
  green: '#10b981', emerald: '#059669', lime: '#84cc16',
  yellow: '#f59e0b', amber: '#f97316', gold: '#eab308',
  purple: '#8b5cf6', violet: '#7c3aed', indigo: '#6366f1',
  pink: '#ec4899', magenta: '#d946ef',
  orange: '#f97316', coral: '#fb7185',
  black: '#111827', white: '#ffffff', gray: '#9ca3af', grey: '#9ca3af',
  teal: '#14b8a6', cyan: '#06b6d4', brown: '#92400e',
}

function resolveColor(desc: string): string | null {
  const hex = desc.match(/#([0-9a-fA-F]{3,6})/)
  if (hex) return hex[0]
  let best: string | null = null
  for (const name of Object.keys(NAMED_COLORS)) {
    if (desc.includes(name) && (!best || name.length > best.length)) best = name
  }
  return best ? NAMED_COLORS[best] : null
}

// ─── Action types ─────────────────────────────────────────────────────────────
type PreviewAction =
  | { type: 'navigate'; screenId: string }
  | { type: 'style'; props: Partial<ElementProps> }
  | { type: 'animate'; animation: string; duration?: number; repeat?: number | 'infinite' }
  | { type: 'run-code'; code: string }
  | { type: 'create-element'; elementType: string; props?: Record<string, unknown>; x?: number; y?: number; width?: number; height?: number }
  | { type: 'move'; x: number; y: number }
  | { type: 'resize'; width: number; height: number }
  | { type: 'remove' }
  | { type: 'toggle-checked' }
  | { type: 'hide' }
  | { type: 'show' }
  | { type: 'set-text'; text: string }
  | { type: 'toast'; message: string }

// ─── Animation catalogue ──────────────────────────────────────────────────────
// Each entry: [regex pattern, animation name, default duration ms]
const ANIM_PATTERNS: [RegExp, string, number][] = [
  [/\bspin\b|rotate\s*360|spinning/,           'spin',        600],
  [/\bshake\b|rattle|vibrate/,                 'shake',       500],
  [/\bbounce\b|jump|boing/,                    'bounce',      700],
  [/\bpulse\b|throb|pulsate/,                  'pulse',       600],
  [/\bwiggle\b|wobble/,                        'wiggle',      500],
  [/\bflash\b|blink/,                          'flash',       500],
  [/\btada\b|celebrat|confetti|fanfare/,        'tada',        800],
  [/rubber.?band|stretch|squish/,              'rubber-band', 700],
  [/\bjello\b/,                                'jello',       900],
  [/heart.?beat|heartbeat/,                    'heartbeat',  1200],
  [/\bflip\b|flipping/,                        'flip',        800],
  [/\bswing\b|swinging/,                       'swing',       700],
  [/slide.?in|fly.?in/,                        'slide-in',    400],
  [/fade.?in|appear/,                          'fade-in',     400],
  [/fade.?out|disappear/,                      'fade-out',    400],
  [/\bglow\b|light.?up|illuminate/,            'glow',        800],
]

function interpretFlow(
  flow: Flow,
  screens: { id: string; name: string }[],
  currentScreenId: string,
  elementType: string,
): PreviewAction {
  const raw = flow.description + ' ' + flow.action
  const desc = raw.toLowerCase()

  // ── Navigation ──────────────────────────────────────────────────────────────
  for (const screen of screens) {
    if (screen.id === currentScreenId) continue
    const nameLower = screen.name.toLowerCase()
    const idx = screens.indexOf(screen)
    if (desc.includes(nameLower) || desc.includes(`screen ${idx + 1}`)) {
      return { type: 'navigate', screenId: screen.id }
    }
  }
  if (desc.match(/next (screen|page)/)) {
    const idx = screens.findIndex((s) => s.id === currentScreenId)
    const next = screens[idx + 1]
    if (next) return { type: 'navigate', screenId: next.id }
  }
  if (desc.match(/(previous|prev|back) (screen|page)|go back/)) {
    const idx = screens.findIndex((s) => s.id === currentScreenId)
    const prev = screens[idx - 1]
    if (prev) return { type: 'navigate', screenId: prev.id }
  }

  // ── Animations ──────────────────────────────────────────────────────────────
  const isLoop = !!/\b(loop|infinite|continuously?|keep|forever|always|non.?stop)\b/.exec(desc)
  for (const [pattern, animName, duration] of ANIM_PATTERNS) {
    if (pattern.test(desc)) {
      return { type: 'animate', animation: animName, duration, repeat: isLoop ? 'infinite' : 1 }
    }
  }

  // ── Hide / Show ─────────────────────────────────────────────────────────────
  if (desc.match(/\bhide\b/) && !desc.match(/\bshow\b/)) return { type: 'hide' }
  if (desc.match(/\bshow\b/) && !desc.match(/\bhide\b/)) return { type: 'show' }

  // ── Toggle ──────────────────────────────────────────────────────────────────
  if (desc.match(/\btoggle\b/)) return { type: 'toggle-checked' }

  // ── Colour changes ──────────────────────────────────────────────────────────
  const isTextTarget = desc.match(/text\s+color|font\s+color|label\s+color/)
  const color = resolveColor(desc)
  if (color) {
    if (isTextTarget || elementType === 'text' || elementType === 'heading') {
      return { type: 'style', props: { textColor: color } }
    }
    return { type: 'style', props: { bgColor: color } }
  }

  // ── Border-radius ────────────────────────────────────────────────────────────
  if (desc.match(/round(ed)?|pill|circle/)) return { type: 'style', props: { borderRadius: 999 } }
  if (desc.match(/sharp|square|no radius/)) return { type: 'style', props: { borderRadius: 0 } }

  // ── Font size ────────────────────────────────────────────────────────────────
  const sizeMatch = desc.match(/font\s*size\s*(\d+)|(\d+)px/)
  if (sizeMatch) {
    const size = parseInt(sizeMatch[1] || sizeMatch[2])
    return { type: 'style', props: { fontSize: size } }
  }
  if (desc.match(/bigger|larger|increase\s+size/)) return { type: 'style', props: { fontSize: 22 } }
  if (desc.match(/smaller|decrease\s+size/))        return { type: 'style', props: { fontSize: 12 } }

  // ── Opacity ──────────────────────────────────────────────────────────────────
  const opacityMatch = desc.match(/opacity\s*([\d.]+)|(\d+)%\s*opacity/)
  if (opacityMatch) {
    const val = parseFloat(opacityMatch[1] || opacityMatch[2])
    return { type: 'style', props: { opacity: val > 1 ? val / 100 : val } }
  }
  if (desc.match(/\btransparent\b/)) return { type: 'style', props: { opacity: 0.1 } }
  if (desc.match(/\bopaque\b/))      return { type: 'style', props: { opacity: 1 } }

  // ── Shadow ───────────────────────────────────────────────────────────────────
  if (desc.match(/add\s+shadow|with\s+shadow/)) return { type: 'style', props: { shadow: true } }
  if (desc.match(/remove\s+shadow|no\s+shadow/)) return { type: 'style', props: { shadow: false } }

  // ── Fallback toast ───────────────────────────────────────────────────────────
  return { type: 'toast', message: flow.description }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ElementOverride = Partial<ElementProps> & {
  hidden?: boolean
  _x?: number; _y?: number; _w?: number; _h?: number
}
type Overrides = Record<string, ElementOverride>
interface Toast { id: number; text: string }
let toastId = 0

interface GestureRef {
  startX: number
  startY: number
  didHold: boolean
  isSliding: boolean
  holdTimer: ReturnType<typeof setTimeout>
}

// ─── Single interactive element ───────────────────────────────────────────────
function PreviewElement({
  element,
  overrides,
  onAction,
  currentScreenId,
  sharedState,
  intervalsRef,
}: {
  element: CanvasElement
  overrides: Overrides
  onAction: (elementId: string, action: PreviewAction) => void
  currentScreenId: string
  sharedState: { current: Record<string, unknown> }
  intervalsRef: { current: Set<ReturnType<typeof setInterval>> }
}) {
  const { screens } = useStore()
  const override = overrides[element.id] ?? {}
  const [thinking, setThinking] = useState(false)
  const gestureRef = useRef<GestureRef | null>(null)
  const animRef = useRef<HTMLDivElement>(null)
  const outerRef = useRef<HTMLDivElement>(null)

  if (override.hidden) return null

  const mergedProps: ElementProps = { ...element.props, ...override }
  const display: CanvasElement = { ...element, props: mergedProps }

  // ── CSS animation (no re-render needed, direct DOM) ──────────────────────────
  function runAnimation(name: string, duration: number, repeat: number | 'infinite'): Promise<void> {
    return new Promise((resolve) => {
      const el = animRef.current
      if (!el) { resolve(); return }
      el.style.animation = 'none'
      void el.offsetHeight                       // force reflow to restart
      const rep = repeat === 'infinite' ? 'infinite' : String(repeat)
      el.style.animation = `${name} ${duration}ms ease-in-out ${rep}`
      if (repeat === 'infinite') {
        resolve()
      } else {
        const total = duration * (typeof repeat === 'number' ? repeat : 1)
        setTimeout(() => { if (animRef.current) animRef.current.style.animation = ''; resolve() }, total + 50)
      }
    })
  }

  // ── Unified flow runner ───────────────────────────────────────────────────────
  async function fireFlows(trigger: string) {
    const flows = element.flows.filter((f) => f.trigger === trigger)

    if (trigger === 'tap') {
      if (element.type === 'toggle' || element.type === 'checkbox') {
        onAction(element.id, { type: 'toggle-checked' })
      }
      if (flows.length === 0) {
        if (element.type === 'button') {
          onAction(element.id, {
            type: 'toast',
            message: `"${element.props.label ?? 'Button'}" tapped — add a behavior to make it do something`,
          })
        }
        return
      }
    } else {
      if (flows.length === 0) return
    }

    const aiEnabled = !!getApiKey()

    for (const flow of flows) {
      let action: PreviewAction

      if (aiEnabled) {
        setThinking(true)
        const aiResult = await aiInterpretAction({
          description: flow.description + ' ' + flow.action,
          elementType: element.type,
          screens: screens.map((s) => ({ id: s.id, name: s.name })),
          currentScreenId,
        })
        setThinking(false)
        if (aiResult) {
          action = aiResult as PreviewAction
        } else {
          action = interpretFlow(flow, screens, currentScreenId, element.type)
        }
      } else {
        action = interpretFlow(flow, screens, currentScreenId, element.type)
      }

      // Animations and run-code are handled locally; everything else goes to parent
      if (action.type === 'animate') {
        await runAnimation(action.animation, action.duration ?? 600, action.repeat ?? 1)
      } else if (action.type === 'run-code') {
        // Build helper closures scoped to this element
        const animFn = (name: string, dur = 600, rep: number | 'infinite' = 1) =>
          runAnimation(name, dur, rep)
        const styleFn = (props: Record<string, unknown>) =>
          onAction(element.id, { type: 'style', props } as PreviewAction)
        const navFn = (nameOrId: string) => {
          const sc = screens.find(
            (s) => s.id === nameOrId || s.name.toLowerCase() === nameOrId.toLowerCase()
          )
          if (sc) onAction(element.id, { type: 'navigate', screenId: sc.id })
        }
        const hideFn  = () => onAction(element.id, { type: 'hide' })
        const showFn  = () => onAction(element.id, { type: 'show' })
        const setTextFn = (text: string) => onAction(element.id, { type: 'set-text', text })
        const toastFn   = (message: string) => onAction(element.id, { type: 'toast', message })
        const toggleFn  = () => onAction(element.id, { type: 'toggle-checked' })
        const waitFn      = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
        const createElFn  = (type: string, props?: Record<string, unknown>, x?: number, y?: number, w?: number, h?: number) =>
          onAction(element.id, { type: 'create-element', elementType: type, props, x, y, width: w, height: h })
        const moveFn      = (x: number, y: number) => onAction(element.id, { type: 'move', x, y })
        const resizeFn    = (w: number, h: number) => onAction(element.id, { type: 'resize', width: w, height: h })
        const removeFn    = () => onAction(element.id, { type: 'remove' })
        const getStateFn  = (key: string, def?: unknown) => sharedState.current[key] ?? def
        const setStateFn  = (key: string, val: unknown) => { sharedState.current[key] = val }
        const randomFn    = (min: number, max: number) => Math.random() * (max - min) + min
        const intervalFn  = (fn: () => void, ms: number) => {
          const id = setInterval(fn, ms)
          intervalsRef.current.add(id)
          return id
        }
        const stopFn      = (id: ReturnType<typeof setInterval>) => {
          clearInterval(id)
          intervalsRef.current.delete(id)
        }

        try {
          // eslint-disable-next-line no-new-func
          const runner = new Function(
            'animate', 'style', 'navigate', 'hide', 'show', 'setText', 'toast', 'toggle',
            'wait', 'createElement', 'move', 'resize', 'remove',
            'getState', 'setState', 'random', 'interval', 'stop',
            `return (async()=>{${action.code}})()`
          )
          await runner(
            animFn, styleFn, navFn, hideFn, showFn, setTextFn, toastFn, toggleFn,
            waitFn, createElFn, moveFn, resizeFn, removeFn,
            getStateFn, setStateFn, randomFn, intervalFn, stopFn
          )
        } catch (err) {
          onAction(element.id, {
            type: 'toast',
            message: `Behavior error: ${err instanceof Error ? err.message : String(err)}`,
          })
        }
      } else {
        onAction(element.id, action)
      }
    }
  }

  // ── Pointer gesture detection ────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const holdTimer = setTimeout(() => {
      if (gestureRef.current && !gestureRef.current.isSliding) {
        gestureRef.current.didHold = true
        fireFlows('hold')
      }
    }, 500)
    gestureRef.current = { startX: e.clientX, startY: e.clientY, didHold: false, isSliding: false, holdTimer }
  }

  // Slider drag — updates value in real time
  function onPointerMove(e: React.PointerEvent) {
    const ref = gestureRef.current
    if (!ref || element.type !== 'slider') return
    const rect = outerRef.current?.getBoundingClientRect()
    if (!rect) return
    if (!ref.isSliding && Math.abs(e.clientX - ref.startX) < 4) return
    ref.isSliding = true
    clearTimeout(ref.holdTimer)   // cancel hold while dragging
    const trackPad = 14           // matches ElementRenderer slider padding
    const trackW = Math.max(1, rect.width - trackPad * 2)
    const x = Math.max(0, Math.min(e.clientX - rect.left - trackPad, trackW))
    const min = mergedProps.min ?? 0
    const max = mergedProps.max ?? 100
    const value = Math.round(min + (x / trackW) * (max - min))
    onAction(element.id, { type: 'style', props: { value } as Partial<ElementProps> })
  }

  function onPointerUp(e: React.PointerEvent) {
    const ref = gestureRef.current
    if (!ref) return
    gestureRef.current = null
    clearTimeout(ref.holdTimer)
    if (ref.didHold || ref.isSliding) return  // sliding = no tap/swipe

    const dx = e.clientX - ref.startX
    const dy = e.clientY - ref.startY

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      fireFlows(dx < 0 ? 'swipe-left' : 'swipe-right')
    } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      // ── Native interactions for specific element types ──────────────────────
      const rect = outerRef.current?.getBoundingClientRect()
      if (rect) {
        const relX = e.clientX - rect.left

        if (element.type === 'tabbar') {
          const tabs = (mergedProps.tabs ?? 'Home,Explore,Profile').split(',')
          const tabIdx = Math.max(0, Math.min(tabs.length - 1,
            Math.floor((relX / rect.width) * tabs.length)))
          onAction(element.id, { type: 'style', props: { activeTab: tabIdx } as Partial<ElementProps> })
        }

        if (element.type === 'rating') {
          const star = Math.max(1, Math.min(5, Math.ceil((relX / rect.width) * 5)))
          onAction(element.id, { type: 'style', props: { value: star } as Partial<ElementProps> })
        }
      }
      fireFlows('tap')
    }
  }

  function onPointerCancel() {
    const ref = gestureRef.current
    if (!ref) return
    gestureRef.current = null
    clearTimeout(ref.holdTimer)
  }

  // All elements with flows are interactive; some types are always interactive
  const NATIVE_INTERACTIVE = new Set(['button', 'toggle', 'checkbox', 'slider', 'tabbar', 'rating'])
  const isInteractive = element.flows.length > 0 || NATIVE_INTERACTIVE.has(element.type)

  return (
    <div
      ref={outerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        position: 'absolute',
        left: override._x ?? element.x,
        top: override._y ?? element.y,
        width: override._w ?? element.width,
        height: override._h ?? element.height,
        cursor: isInteractive ? (thinking ? 'wait' : 'pointer') : 'default',
        opacity: thinking ? 0.7 : 1,
        transition: 'opacity 0.15s',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* pointerEvents:none lets ALL pointer events reach the outer wrapper unobstructed
          (prevents inner <button>, <img>, etc. from stealing events in preview) */}
      <div ref={animRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
        <ElementRenderer element={display} />
      </div>
    </div>
  )
}

// ─── Preview overlay ──────────────────────────────────────────────────────────
export function PreviewMode() {
  const { device, setPreviewMode, screens, previewScreenId, setPreviewScreen } = useStore()
  const elements = useStore(selectPreviewElements)
  const size = DEVICE_SIZES[device]
  const t = useUITheme()

  const [overrides, setOverrides] = useState<Overrides>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [localChecked, setLocalChecked] = useState<Record<string, boolean>>({})
  const [dynamicElements, setDynamicElements] = useState<CanvasElement[]>([])
  const dynamicCounter = useRef(0)
  const sharedState = useRef<Record<string, unknown>>({})
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set())

  function addToast(text: string) {
    const id = ++toastId
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }

  function handleAction(elementId: string, action: PreviewAction) {
    switch (action.type) {
      case 'navigate':
        setPreviewScreen(action.screenId)
        break
      case 'style':
        setOverrides((prev) => ({
          ...prev,
          [elementId]: { ...prev[elementId], ...action.props },
        }))
        break
      case 'toggle-checked':
        setLocalChecked((prev) => ({ ...prev, [elementId]: !prev[elementId] }))
        setOverrides((prev) => ({
          ...prev,
          [elementId]: { ...prev[elementId], checked: !localChecked[elementId] },
        }))
        break
      case 'hide':
        setOverrides((prev) => ({ ...prev, [elementId]: { ...prev[elementId], hidden: true } }))
        break
      case 'show':
        setOverrides((prev) => {
          const next = { ...prev[elementId] }
          delete next.hidden
          return { ...prev, [elementId]: next }
        })
        break
      case 'set-text':
        setOverrides((prev) => ({
          ...prev,
          [elementId]: { ...prev[elementId], text: action.text, label: action.text },
        }))
        break
      case 'toast':
        addToast(action.message)
        break
      case 'create-element': {
        const piece = PIECES.find((p) => p.type === action.elementType)
        const id = `dyn-${++dynamicCounter.current}-${Date.now()}`
        const newEl: CanvasElement = {
          id,
          type: (action.elementType as ElementType) ?? 'text',
          x: action.x ?? 40,
          y: action.y ?? 300,
          width: action.width ?? (piece?.defaultWidth ?? 200),
          height: action.height ?? (piece?.defaultHeight ?? 48),
          props: { ...(piece?.defaultProps ?? {}), ...(action.props ?? {}) } as ElementProps,
          flows: [],
        }
        setDynamicElements((prev) => [...prev, newEl])
        break
      }
      case 'move':
        setOverrides((prev) => ({ ...prev, [elementId]: { ...prev[elementId], _x: action.x, _y: action.y } }))
        break
      case 'resize':
        setOverrides((prev) => ({ ...prev, [elementId]: { ...prev[elementId], _w: action.width, _h: action.height } }))
        break
      case 'remove':
        setOverrides((prev) => ({ ...prev, [elementId]: { ...prev[elementId], hidden: true } }))
        setDynamicElements((prev) => prev.filter((el) => el.id !== elementId))
        break
      case 'animate':
      case 'run-code':
        // Handled locally in PreviewElement — nothing to do here
        break
    }
  }

  // Reset per-screen state and clear intervals when switching screens
  useEffect(() => {
    setDynamicElements([])
    setOverrides({})
    sharedState.current = {}
    for (const id of intervalsRef.current) clearInterval(id)
    intervalsRef.current.clear()
  }, [previewScreenId])

  // Clean up any running intervals when preview is closed
  useEffect(() => {
    return () => {
      for (const id of intervalsRef.current) clearInterval(id)
    }
  }, [])

  // Fire 'load' behaviors when the visible screen changes
  useEffect(() => {
    async function fireLoadTriggers() {
      const aiEnabled = !!getApiKey()
      for (const el of elements) {
        const loadFlows = el.flows.filter((f) => f.trigger === 'load')
        for (const flow of loadFlows) {
          if (aiEnabled) {
            const aiAction = await aiInterpretAction({
              description: flow.description + ' ' + flow.action,
              elementType: el.type,
              screens: screens.map((s) => ({ id: s.id, name: s.name })),
              currentScreenId: previewScreenId,
            })
            if (aiAction) { handleAction(el.id, aiAction as PreviewAction); continue }
          }
          handleAction(el.id, interpretFlow(flow, screens, previewScreenId, el.type))
        }
      }
    }
    fireLoadTriggers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewScreenId])

  const currentScreen = screens.find((s) => s.id === previewScreenId)
  const aiEnabled = !!getApiKey()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 52,
        background: t.bgToolbar + 'f0', borderBottom: `1px solid ${t.border}`,
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      }}>
        <div style={{ fontSize: 13, color: '#10b981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Preview
        </div>

        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {screens.map((screen) => (
            <button
              key={screen.id}
              onClick={() => setPreviewScreen(screen.id)}
              style={{
                padding: '4px 12px', borderRadius: 8, border: 'none',
                background: previewScreenId === screen.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: previewScreenId === screen.id ? '#10b981' : '#5a5a80',
                fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              {screen.name}
            </button>
          ))}
        </div>

        {aiEnabled && (
          <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>✦</span> AI behaviors on
          </div>
        )}
        <div style={{ fontSize: 11, color: '#4b4b6a' }}>Esc to exit</div>
        <button
          onClick={() => setPreviewMode(false)}
          style={{
            padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#9ca3af', fontSize: 12,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          ■ Stop
        </button>
      </div>

      {/* Device frame */}
      <div style={{
        transform: `scale(${size.scale})`, transformOrigin: 'center center',
        position: 'relative', marginTop: 52,
      }}>
        {device === 'phone' && (
          <div style={{
            position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
            width: 120, height: 28, background: '#0d0d1a',
            borderRadius: '0 0 20px 20px', zIndex: 20,
          }} />
        )}

        <div style={{
          width: size.width, height: size.height,
          borderRadius: device === 'phone' ? 40 : device === 'tablet' ? 24 : 8,
          border: '2px solid rgba(255,255,255,0.12)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: '#faf8f5' }}>
            {elements.length === 0 ? (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#c4bfba', fontSize: 14,
              }}>
                {currentScreen?.name} is empty
              </div>
            ) : (
              <>
                {elements.map((el) => (
                  <PreviewElement
                    key={el.id}
                    element={el}
                    overrides={overrides}
                    onAction={handleAction}
                    currentScreenId={previewScreenId}
                    sharedState={sharedState}
                    intervalsRef={intervalsRef}
                  />
                ))}
                {dynamicElements.map((el) => (
                  <PreviewElement
                    key={el.id}
                    element={el}
                    overrides={overrides}
                    onAction={handleAction}
                    currentScreenId={previewScreenId}
                    sharedState={sharedState}
                    intervalsRef={intervalsRef}
                  />
                ))}
              </>
            )}
          </div>

          {/* Toasts */}
          <div style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', gap: 8, width: '85%',
            pointerEvents: 'none', zIndex: 30,
          }}>
            {toasts.map((toast) => (
              <div key={toast.id} style={{
                background: 'rgba(17,24,39,0.92)', color: '#fff',
                padding: '10px 16px', borderRadius: 12, fontSize: 13,
                textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}>
                {toast.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
