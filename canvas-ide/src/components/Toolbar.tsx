import { useState, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import { exportHtml } from '../utils/exportHtml'
import { exportReactNative } from '../utils/exportRN'
import { SettingsModal } from './SettingsModal'
import { getApiKey } from '../utils/aiInterpretAction'
import type { DeviceType, Screen, AppStyles } from '../types'

const DEVICES: { id: DeviceType; icon: string; title: string }[] = [
  { id: 'phone', icon: '📱', title: 'Phone' },
  { id: 'tablet', icon: '◻', title: 'Tablet' },
  { id: 'desktop', icon: '🖥', title: 'Desktop' },
]

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

function ExportMenu({ screens, styles, t }: { screens: Screen[]; styles: AppStyles; t: ReturnType<typeof useUITheme> }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
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
          <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6,
            background: t.bgPanel, border: `1px solid ${t.border}`,
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 99, padding: 6, minWidth: 160,
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
  const { device, setDevice, styles, updateStyles, undo, redo, past, future, previewMode, setPreviewMode,
          screens, activeScreenId, uiTheme, setUiTheme, snapToGrid, toggleSnapToGrid,
          setScreenBackground, importProject, openGameMode } = useStore()
  const [showSettings, setShowSettings] = useState(false)
  const hasKey = !!getApiKey()
  const t = useUITheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeScreen = screens.find((s) => s.id === activeScreenId)
  const canvasBg = activeScreen?.background ?? '#faf8f5'

  const sep = <div style={{ width: 1, height: 20, background: t.sep, flexShrink: 0 }} />

  function saveProject() {
    const state = useStore.getState()
    const data = JSON.stringify({ screens: state.screens, styles: state.styles, device: state.device, uiTheme: state.uiTheme }, null, 2)
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

  return (
    <>
    {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    <input ref={fileInputRef} type="file" accept=".canvas,application/json" style={{ display: 'none' }} onChange={loadProject} />
    <div style={{
      height: 52,
      borderBottom: `1px solid ${t.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 12,
      background: t.bgToolbar,
      flexShrink: 0, overflow: 'hidden',
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

      {/* Device switcher */}
      <div style={{ display: 'flex', gap: 2 }}>
        {DEVICES.map((d) => (
          <button
            key={d.id}
            onClick={() => setDevice(d.id)}
            title={d.title}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: device === d.id ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: device === d.id ? t.accentText : t.textDim,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            {d.icon}
          </button>
        ))}
      </div>

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
    </div>
    </>
  )
}
