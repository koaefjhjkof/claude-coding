import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import { exportHtml } from '../utils/exportHtml'
import { exportReactNative } from '../utils/exportRN'
import { SettingsModal } from './SettingsModal'
import { AutoDesignModal } from './AutoDesignModal'
import { AuthModal } from './AuthModal'
import { ProfileModal } from './ProfileModal'
import { supabase } from '../lib/supabase'
import { getApiKey } from '../utils/aiInterpretAction'
import { getDeviceSpec, DEVICE_PRESET_GROUPS, DEVICE_PRESETS } from '../data/devices'
import type { DeviceType, Screen, AppStyles } from '../types'

const FEEL_OPTIONS = [
  { value: 'sharp', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'soft', label: 'R' },
] as const

const COLOR_PALETTES = [
  { primary: '#6366f1', accent: '#f59e0b', label: 'Indigo' },
  { primary: '#8b5cf6', accent: '#ec4899', label: 'Violet' },
  { primary: '#10b981', accent: '#3b82f6', label: 'Emerald' },
  { primary: '#ef4444', accent: '#f97316', label: 'Ruby' },
  { primary: '#1f2937', accent: '#6366f1', label: 'Ink' },
]

const CATEGORY_ICONS: Record<DeviceType, string> = { phone: '📱', tablet: '◻', desktop: '🖥' }

function DevicePicker({ device, devicePreset, setDevice, setDevicePreset, t }: {
  device: DeviceType
  devicePreset: string
  setDevice: (d: DeviceType) => void
  setDevicePreset: (p: string) => void
  t: ReturnType<typeof useUITheme>
}) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const toggleRef = useRef<HTMLButtonElement>(null)
  const currentSpec = DEVICE_PRESETS[devicePreset] ?? { label: devicePreset, category: device as DeviceType }

  // Recalculate dropdown position whenever it opens
  useEffect(() => {
    if (!open || !toggleRef.current) return
    const r = toggleRef.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 6, left: r.left })
  }, [open])

  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {/* Quick category buttons */}
      {(['phone', 'tablet', 'desktop'] as DeviceType[]).map((cat) => (
        <button
          key={cat}
          onClick={() => { setDevice(cat); setOpen(false) }}
          title={cat.charAt(0).toUpperCase() + cat.slice(1)}
          style={{
            width: 28, height: 28, borderRadius: 7, border: 'none',
            background: device === cat ? 'rgba(99,102,241,0.2)' : 'transparent',
            color: device === cat ? t.accentText : t.textDim,
            fontSize: 13, cursor: 'pointer',
          }}
        >
          {CATEGORY_ICONS[cat]}
        </button>
      ))}

      {/* Model picker toggle */}
      <button
        ref={toggleRef}
        onClick={() => setOpen(!open)}
        title="Choose specific device model"
        style={{
          height: 28, padding: '0 7px', borderRadius: 7, border: `1px solid ${open ? '#6366f1' : t.border}`,
          background: open ? 'rgba(99,102,241,0.15)' : t.bgApp,
          color: open ? '#a5b4fc' : t.textSecondary,
          fontSize: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
        }}
      >
        <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentSpec.label}
        </span>
        <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
      </button>

      {/* Dropdown — rendered via fixed positioning to escape toolbar's overflow:hidden */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            background: t.bgPanel, border: `1px solid ${t.border}`,
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
            zIndex: 1999, padding: '6px 0', minWidth: 230, maxHeight: 440, overflowY: 'auto',
          }}>
            {DEVICE_PRESET_GROUPS.map((group) => (
              <div key={group.label}>
                <div style={{
                  padding: '8px 14px 4px',
                  fontSize: 10, fontWeight: 700, color: t.textDim,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {group.label}
                </div>
                {group.presets.map((key) => {
                  const spec = DEVICE_PRESETS[key]
                  if (!spec) return null
                  const isActive = devicePreset === key
                  return (
                    <button
                      key={key}
                      onClick={() => { setDevicePreset(key); setOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '7px 14px',
                        border: 'none', borderRadius: 0,
                        background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                        color: isActive ? '#a5b4fc' : t.textPrimary,
                        fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(99,102,241,0.07)' }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span>{spec.label}</span>
                      <span style={{ fontSize: 10, color: t.textDim, fontFamily: 'monospace' }}>
                        {spec.width}×{spec.height}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ExportMenu({ screens, styles, t }: { screens: Screen[]; styles: AppStyles; t: ReturnType<typeof useUITheme> }) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 })
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Recalculate dropdown position whenever it opens
  useEffect(() => {
    if (!open || !toggleRef.current) return
    const r = toggleRef.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }, [open])

  return (
    <div>
      <button
        ref={toggleRef}
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 12px', borderRadius: 8,
          border: `1px solid ${t.borderStrong}`,
          background: open ? 'rgba(99,102,241,0.1)' : 'transparent',
          color: t.textSecondary, fontSize: 12,
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        Export <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <>
          {/* backdrop */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 1998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed',
            top: dropPos.top,
            right: dropPos.right,
            background: t.bgPanel, border: `1px solid ${t.border}`,
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 1999, padding: 6, minWidth: 160,
          }}>
            {[
              { label: '🌐 HTML / Web', action: () => { exportHtml(screens, styles); setOpen(false) } },
              { label: '📱 React Native', action: () => { exportReactNative(screens, styles); setOpen(false) } },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', borderRadius: 7, border: 'none',
                  background: 'transparent', color: t.textPrimary,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Toolbar() {
  const { device, devicePreset, setDevice, setDevicePreset, styles, updateStyles, undo, redo, past, future, previewMode, setPreviewMode,
          screens, activeScreenId, uiTheme, setUiTheme, snapToGrid, toggleSnapToGrid,
          setScreenBackground, importProject, openGameMode,
          drawMode, setDrawMode,
          user, userProfile } = useStore()
  const [showSettings, setShowSettings]     = useState(false)
  const [showAutoDesign, setShowAutoDesign] = useState(false)
  const [makingPretty, setMakingPretty]     = useState(false)
  const [showAuth, setShowAuth]             = useState(false)
  const [showProfile, setShowProfile]       = useState(false)
  const [showUserMenu, setShowUserMenu]     = useState(false)
  const hasKey = !!getApiKey()
  const t = useUITheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeScreen = screens.find((s) => s.id === activeScreenId)
  const canvasBg = activeScreen?.background ?? '#faf8f5'

  const sep = <div style={{ width: 1, height: 20, background: t.sep, flexShrink: 0 }} />

  function saveProject() {
    const state = useStore.getState()
    const data = JSON.stringify({
      screens: state.screens,
      styles: state.styles,
      device: state.device,
      devicePreset: state.devicePreset,
      uiTheme: state.uiTheme,
      appDatabase: state.appDatabase,
      variables: state.variables,
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'project.canvas'; a.click()
    URL.revokeObjectURL(url)
  }

  function loadProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.screens && data.styles) {
          importProject(data)
        } else {
          alert('Invalid project file.')
        }
      } catch {
        alert('Could not read project file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleMakePretty() {
    const apiKey = getApiKey()
    if (!apiKey) { alert('Add your Anthropic API key first (✦ button).'); return }
    const state = useStore.getState()
    const screen = state.screens.find((s) => s.id === state.activeScreenId)
    const elements = screen?.elements ?? []
    if (elements.length === 0) { alert('Add some elements first!'); return }

    const { devicePreset: dp, styles: st } = state
    const { width: dW, height: dH } = getDeviceSpec(dp)

    setMakingPretty(true)
    try {
      const res = await fetch('/api/make-pretty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          elements: elements.map((el) => ({
            id: el.id, type: el.type, x: el.x, y: el.y,
            width: el.width, height: el.height, props: el.props,
          })),
          styles: st,
          deviceWidth: dW,
          deviceHeight: dH,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed')
      if (!Array.isArray(data.elements)) throw new Error('Bad response')

      const { _pushHistory, updateElement } = useStore.getState()
      _pushHistory()
      data.elements.forEach((updated: { id: string; x: number; y: number; width: number; height: number; props: Record<string, unknown> }) => {
        updateElement(updated.id, {
          x: updated.x, y: updated.y,
          width: updated.width, height: updated.height,
          props: updated.props as never,
        })
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Make it Pretty failed.')
    } finally {
      setMakingPretty(false)
    }
  }

  const [height, setHeight] = useState(52)
  const dragging = useRef(false)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const startY = e.clientY
    const startH = height
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      setHeight(Math.max(40, Math.min(120, startH + ev.clientY - startY)))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [height])

  const displayName = userProfile?.username || user?.email?.split('@')[0] || 'User'
  const avatarInitial = displayName.charAt(0).toUpperCase()

  return (
    <>
    {showSettings   && <SettingsModal onClose={() => setShowSettings(false)} />}
    {showAutoDesign && <AutoDesignModal onClose={() => setShowAutoDesign(false)} />}
    {showAuth       && <AuthModal onClose={() => setShowAuth(false)} />}
    {showProfile && user && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
    <input ref={fileInputRef} type="file" accept=".canvas,application/json" style={{ display: 'none' }} onChange={loadProject} />
    <div style={{
      height,
      borderBottom: `1px solid ${t.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 12,
      background: t.bgToolbar,
      flexShrink: 0, overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Logo */}
      <div style={{
        fontSize: 16, fontFamily: 'Fraunces, Georgia, serif',
        fontWeight: 500, color: t.textPrimary,
        flexShrink: 0, marginRight: 4,
      }}>
        ✦ Canvas
      </div>

      {sep}

      {/* Device picker */}
      <DevicePicker
        device={device}
        devicePreset={devicePreset}
        setDevice={setDevice}
        setDevicePreset={setDevicePreset}
        t={t}
      />

      {sep}

      {/* Color palette */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {COLOR_PALETTES.map((p) => (
          <button
            key={p.label}
            onClick={() => updateStyles({ primaryColor: p.primary, accentColor: p.accent })}
            title={p.label}
            style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${p.primary} 50%, ${p.accent} 50%)`,
              border: styles.primaryColor === p.primary ? '2px solid #fff' : `2px solid transparent`,
              cursor: 'pointer', outline: 'none',
            }}
          />
        ))}
      </div>

      {sep}

      {/* Feel */}
      <div style={{ display: 'flex', gap: 2 }}>
        {FEEL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateStyles({ borderRadius: opt.value })}
            title={opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none',
              background: styles.borderRadius === opt.value ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: styles.borderRadius === opt.value ? t.accentText : t.textDim,
              fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {sep}

      {/* ── Draw Tool ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setDrawMode(!drawMode)}
        title={drawMode ? 'Draw mode ON — click to exit  [Esc]' : 'Enter draw mode  [✏]'}
        style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: drawMode ? 'rgba(99,102,241,0.2)' : 'transparent',
          color: drawMode ? '#6366f1' : t.textDim,
          fontSize: 16, cursor: 'pointer', flexShrink: 0,
        }}
      >
        ✏
      </button>

      {sep}

      {/* ── AI Buttons ────────────────────────────────────────────────── */}
      <button
        onClick={() => setShowAutoDesign(true)}
        title="Auto Design — describe your app and AI generates it"
        style={{
          padding: '5px 11px', borderRadius: 8,
          border: `1px solid ${t.borderStrong}`,
          background: 'transparent', color: t.textSecondary,
          fontSize: 11, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        ✦ Auto Design
      </button>
      <button
        onClick={handleMakePretty}
        disabled={makingPretty}
        title="Make it Pretty — AI cleans up and aligns your design"
        style={{
          padding: '5px 11px', borderRadius: 8,
          border: `1px solid ${t.borderStrong}`,
          background: makingPretty ? 'rgba(99,102,241,0.1)' : 'transparent',
          color: makingPretty ? '#6366f1' : t.textSecondary,
          fontSize: 11, fontWeight: 500,
          cursor: makingPretty ? 'default' : 'pointer',
          fontFamily: 'Inter, sans-serif', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        {makingPretty ? '⟳ Prettying…' : '✨ Make Pretty'}
      </button>

      <div style={{ flex: 1 }} />

      {/* Snap to grid */}
      <button
        onClick={toggleSnapToGrid}
        title={snapToGrid ? 'Snap to grid: ON' : 'Snap to grid: OFF'}
        style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: snapToGrid ? 'rgba(99,102,241,0.2)' : 'transparent',
          color: snapToGrid ? t.accentText : t.textDim,
          fontSize: 15, cursor: 'pointer', flexShrink: 0,
        }}
      >
        ⊞
      </button>

      {/* Canvas background colour */}
      <div style={{ position: 'relative', flexShrink: 0 }} title="Canvas background colour">
        <input
          type="color"
          value={canvasBg}
          onChange={(e) => setScreenBackground(e.target.value)}
          style={{
            width: 28, height: 28, borderRadius: 7, border: `2px solid ${t.borderStrong}`,
            cursor: 'pointer', padding: 2, background: 'none',
          }}
        />
      </div>

      {sep}

      {/* Save / Load */}
      <button
        onClick={saveProject}
        title="Save project (.canvas)"
        style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: 'transparent', color: t.textSecondary,
          fontSize: 15, cursor: 'pointer', flexShrink: 0,
        }}
      >
        💾
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Load project (.canvas)"
        style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: 'transparent', color: t.textSecondary,
          fontSize: 15, cursor: 'pointer', flexShrink: 0,
        }}
      >
        📂
      </button>

      {sep}

      {/* Undo / Redo */}
      <div style={{ display: 'flex', gap: 1 }}>
        {[
          { label: '↩', title: 'Undo (Ctrl+Z)', action: undo, disabled: past.length === 0 },
          { label: '↪', title: 'Redo (Ctrl+Y)', action: redo, disabled: future.length === 0 },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={btn.disabled}
            title={btn.title}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: 'transparent',
              color: btn.disabled ? t.textDisabled : t.textSecondary,
              fontSize: 15, cursor: btn.disabled ? 'default' : 'pointer',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {sep}

      {/* Theme toggle */}
      <button
        onClick={() => setUiTheme(uiTheme === 'dark' ? 'light' : 'dark')}
        title={uiTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: 'transparent',
          color: t.textSecondary,
          fontSize: 16, cursor: 'pointer', flexShrink: 0,
        }}
      >
        {uiTheme === 'dark' ? '☀' : '◗'}
      </button>

      {sep}

      {/* Game Mode */}
      <button
        onClick={openGameMode}
        title="Game Mode — build 2D or 3D games"
        style={{
          padding: '6px 14px', borderRadius: 8,
          border: `1px solid ${t.borderStrong}`,
          background: 'transparent', color: t.textSecondary,
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', flexShrink: 0,
        }}
      >
        🎮 Game
      </button>

      {/* Preview */}
      <button
        onClick={() => setPreviewMode(!previewMode)}
        style={{
          padding: '6px 14px', borderRadius: 8,
          border: previewMode ? 'none' : `1px solid ${t.borderStrong}`,
          background: previewMode ? '#10b981' : 'transparent',
          color: previewMode ? '#fff' : t.textSecondary,
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', flexShrink: 0,
        }}
      >
        {previewMode ? '■ Stop' : '▶ Preview'}
      </button>

      {/* AI Settings */}
      <button
        onClick={() => setShowSettings(true)}
        title={hasKey ? 'AI enabled — click to change key' : 'Enable AI behaviors'}
        style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: hasKey ? 'rgba(16,185,129,0.15)' : 'transparent',
          color: hasKey ? '#10b981' : t.textDim,
          fontSize: 15, cursor: 'pointer', flexShrink: 0,
        }}
      >
        ✦
      </button>

      {sep}

      {/* ── User / Auth ─────────────────────────────────────────────── */}
      {user ? (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={displayName}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {avatarInitial}
          </button>
          {showUserMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setShowUserMenu(false)} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                background: t.bgPanel, border: `1px solid ${t.border}`,
                borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                zIndex: 99, minWidth: 200, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: t.textDim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                </div>
                <button
                  onClick={() => { setShowProfile(true); setShowUserMenu(false) }}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', textAlign: 'left', color: t.textSecondary, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  👤 Profile &amp; Cloud Save
                </button>
                <button
                  onClick={async () => { await supabase.auth.signOut(); setShowUserMenu(false) }}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', borderTop: `1px solid ${t.border}`, background: 'transparent', textAlign: 'left', color: '#f87171', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowAuth(true)}
          style={{
            padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${t.borderStrong}`,
            background: 'transparent', color: t.textSecondary,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Sign In
        </button>
      )}

      {/* Export dropdown */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <ExportMenu screens={screens} styles={styles} t={t} />
      </div>

      {/* Publish */}
      <button
        style={{
          padding: '7px 16px', borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', flexShrink: 0,
        }}
      >
        Publish ↗
      </button>

      {/* Drag-to-resize handle */}
      <div
        onMouseDown={startResize}
        title="Drag to resize toolbar"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 5,
          cursor: 'ns-resize', zIndex: 30,
          background: 'transparent', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.35)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      />
    </div>
    </>
  )
}
