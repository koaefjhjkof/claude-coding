import { memo } from 'react'
import type { CanvasElement } from '../types'
import { useStore } from '../store/useStore'

// Defined at module level — never re-created
const RADIUS_MAP = { sharp: 4, medium: 10, soft: 20 } as const

/** Returns a gradient string when gradient props are set, otherwise bgColor or the fallback. */
function gradBg(p: import('../types').ElementProps, fallback?: string): string | undefined {
  if (p.gradientFrom && p.gradientTo) {
    return `linear-gradient(${p.gradientAngle ?? 135}deg, ${p.gradientFrom}, ${p.gradientTo})`
  }
  return p.bgColor ?? fallback
}

// ─── Icon paths (Heroicons outline, viewBox 0 0 24 24) ────────────────────────
const ICON_PATHS: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  camera: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  plus: 'M12 4v16m8-8H4',
  minus: 'M20 12H4',
  check: 'M5 13l4 4L19 7',
  close: 'M6 18L18 6M6 6l12 12',
  'arrow-right': 'M9 5l7 7-7 7',
  'arrow-left': 'M15 19l-7-7 7-7',
  'arrow-up': 'M5 15l7-7 7 7',
  'arrow-down': 'M19 9l-7 7-7-7',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  share: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  bookmark: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  location: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  wifi: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
  send: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
  image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
}

export const ICON_NAMES = Object.keys(ICON_PATHS)

interface Props {
  element: CanvasElement
}

export const ElementRenderer = memo(function ElementRenderer({ element }: Props) {
  const { type, props } = element
  const styles = useStore((s) => s.styles)
  const globalRadius = RADIUS_MAP[styles.borderRadius]

  function renderContent() {
    switch (type) {
      // ── Button ──────────────────────────────────────────────────────────────
      case 'button': {
        const isSecondary = props.variant === 'secondary'
        const isGhost     = props.variant === 'ghost'
        const bg = gradBg(props) ?? (isGhost || isSecondary ? 'transparent' : styles.primaryColor)
        return (
          <button style={{
            width: '100%', height: '100%',
            background: bg,
            color: props.textColor ?? (isGhost || isSecondary ? styles.primaryColor : '#fff'),
            border: isSecondary ? `2px solid ${styles.primaryColor}` : 'none',
            borderRadius: props.borderRadius ?? globalRadius,
            fontFamily: props.fontFamily ?? 'Inter, sans-serif', fontWeight: props.fontWeight ?? 500,
            fontSize: props.fontSize ?? 15, cursor: 'pointer', letterSpacing: '0.01em',
            boxShadow: props.shadow ? '0 4px 14px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>
            {props.label ?? 'Button'}
          </button>
        )
      }

      // ── Heading ─────────────────────────────────────────────────────────────
      case 'heading': {
        const hGrad = props.gradientFrom && props.gradientTo
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            color: hGrad ? undefined : (props.textColor ?? styles.textColor),
            background: hGrad ? `linear-gradient(${props.gradientAngle ?? 135}deg, ${props.gradientFrom}, ${props.gradientTo})` : undefined,
            WebkitBackgroundClip: hGrad ? 'text' : undefined,
            backgroundClip: hGrad ? 'text' : undefined,
            WebkitTextFillColor: hGrad ? 'transparent' : undefined,
            fontSize: props.fontSize ?? 28, fontWeight: props.fontWeight ?? '600',
            fontFamily: props.fontFamily ?? 'Inter, sans-serif', lineHeight: 1.2,
            textAlign: props.textAlign ?? 'left',
            justifyContent: props.textAlign === 'center' ? 'center' : props.textAlign === 'right' ? 'flex-end' : 'flex-start',
          }}>
            {props.text ?? 'Heading'}
          </div>
        )
      }

      // ── Text ────────────────────────────────────────────────────────────────
      case 'text': {
        const tGrad = props.gradientFrom && props.gradientTo
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start',
            color: tGrad ? undefined : (props.textColor ?? '#6b7280'),
            background: tGrad ? `linear-gradient(${props.gradientAngle ?? 135}deg, ${props.gradientFrom}, ${props.gradientTo})` : undefined,
            WebkitBackgroundClip: tGrad ? 'text' : undefined,
            backgroundClip: tGrad ? 'text' : undefined,
            WebkitTextFillColor: tGrad ? 'transparent' : undefined,
            fontSize: props.fontSize ?? 15, fontFamily: props.fontFamily ?? 'Inter, sans-serif',
            fontWeight: props.fontWeight ?? 400,
            lineHeight: 1.6, overflow: 'hidden',
            textAlign: props.textAlign ?? 'left',
            justifyContent: props.textAlign === 'center' ? 'center' : props.textAlign === 'right' ? 'flex-end' : 'flex-start',
          }}>
            {props.text ?? 'Your text goes here.'}
          </div>
        )
      }

      // ── Card ────────────────────────────────────────────────────────────────
      case 'card':
        return (
          <div style={{
            width: '100%', height: '100%',
            background: gradBg(props, '#ffffff'),
            borderRadius: props.borderRadius ?? globalRadius,
            boxShadow: props.shadow ? '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)' : 'none',
            padding: props.padding ?? 20,
            overflow: 'hidden',
          }}>
            {props.label && (
              <div style={{
                fontSize: props.fontSize ?? 15, fontWeight: props.fontWeight ?? 600,
                color: props.textColor ?? styles.textColor,
                fontFamily: props.fontFamily ?? 'Inter, sans-serif',
                lineHeight: 1.3,
              }}>
                {props.label}
              </div>
            )}
            {props.text && (
              <div style={{
                fontSize: (props.fontSize ?? 15) - 2, color: props.textColor ? props.textColor + 'aa' : '#6b7280',
                fontFamily: props.fontFamily ?? 'Inter, sans-serif',
                marginTop: props.label ? 6 : 0, lineHeight: 1.5,
              }}>
                {props.text}
              </div>
            )}
          </div>
        )

      // ── Image ────────────────────────────────────────────────────────────────
      case 'image':
        return (
          <div style={{
            width: '100%', height: '100%',
            borderRadius: props.borderRadius ?? globalRadius, overflow: 'hidden',
            background: props.src ? 'transparent' : 'linear-gradient(135deg,#e0e7ff 0%,#f3e8ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#a5b4fc', fontSize: 13, fontFamily: 'Inter, sans-serif',
          }}>
            {props.src ? (
              <img src={props.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.7 }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🖼</div>
                <div>Drop an image</div>
              </div>
            )}
          </div>
        )

      // ── Input ───────────────────────────────────────────────────────────────
      case 'input':
        return (
          <div style={{
            width: '100%', height: '100%',
            background: props.bgColor ?? '#f9fafb',
            border: `1.5px solid ${props.bgColor ? 'transparent' : '#e5e7eb'}`,
            borderRadius: props.borderRadius ?? globalRadius,
            display: 'flex', alignItems: 'center', padding: '0 14px',
            color: props.textColor ?? '#9ca3af', fontSize: props.fontSize ?? 14,
            fontFamily: props.fontFamily ?? 'Inter, sans-serif',
          }}>
            {props.placeholder ?? 'Type here…'}
          </div>
        )

      // ── Toggle ──────────────────────────────────────────────────────────────
      case 'toggle': {
        const on = props.checked ?? false
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            gap: 10, fontFamily: 'Inter, sans-serif', fontSize: 14, color: styles.textColor,
          }}>
            <div style={{
              width: 44, height: 26, borderRadius: 13,
              background: on ? styles.primaryColor : '#d1d5db',
              position: 'relative', flexShrink: 0, transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: on ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
              }} />
            </div>
            {props.label}
          </div>
        )
      }

      // ── Badge ───────────────────────────────────────────────────────────────
      case 'badge': {
        const baseColor = props.badgeColor ?? styles.primaryColor
        const bGrad = !!(props.gradientFrom && props.gradientTo)
        const badgeBg = bGrad
          ? gradBg(props, baseColor)!
          : baseColor + '20'
        const badgeText = bGrad ? '#fff' : baseColor
        return (
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: badgeBg,
            color: badgeText,
            borderRadius: 999, padding: '4px 12px',
            fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.03em', height: '100%',
          }}>
            {props.label ?? 'Badge'}
          </div>
        )
      }

      // ── Slider ──────────────────────────────────────────────────────────────
      case 'slider': {
        const val = props.value ?? 60
        const trackColor = gradBg(props, styles.primaryColor)
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', gap: 8, fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: styles.textColor }}>
              {props.label && <span>{props.label}</span>}
              <span style={{ color: trackColor, fontWeight: 600, marginLeft: 'auto' }}>{val}</span>
            </div>
            <div style={{ position: 'relative', height: 6, background: '#e5e7eb', borderRadius: 3 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${val}%`, background: trackColor, borderRadius: 3 }} />
              <div style={{
                position: 'absolute', top: '50%', left: `${val}%`,
                transform: 'translate(-50%,-50%)',
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                boxShadow: `0 0 0 3px ${trackColor}, 0 2px 6px rgba(0,0,0,0.1)`,
              }} />
            </div>
          </div>
        )
      }

      // ── Progress ────────────────────────────────────────────────────────────
      case 'progress': {
        const val = props.value ?? 60
        const barColor = gradBg(props, styles.primaryColor)
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', gap: 6, fontFamily: 'Inter, sans-serif',
          }}>
            {props.label && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: styles.textColor }}>
                <span>{props.label}</span>
                <span style={{ color: barColor, fontWeight: 600 }}>{val}%</span>
              </div>
            )}
            <div style={{ width: '100%', height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${val}%`, background: barColor, borderRadius: 5 }} />
            </div>
          </div>
        )
      }

      // ── Checkbox ────────────────────────────────────────────────────────────
      case 'checkbox': {
        const checked = props.checked ?? false
        const color = gradBg(props, styles.primaryColor)
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            gap: 12, fontFamily: 'Inter, sans-serif',
            fontSize: props.fontSize ?? 14, color: styles.textColor,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: `2px solid ${checked ? color : '#d1d5db'}`,
              background: checked ? color : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {checked && (
                <svg viewBox="0 0 12 10" width="12" height="10" fill="none">
                  <path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span>{props.label ?? 'Checkbox'}</span>
          </div>
        )
      }

      // ── Avatar ──────────────────────────────────────────────────────────────
      case 'avatar':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {props.src ? (
              <img src={props.src} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: gradBg(props, styles.primaryColor),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'Inter, sans-serif',
                fontWeight: 700, fontSize: props.fontSize ?? 20,
              }}>
                {props.initials ?? '?'}
              </div>
            )}
          </div>
        )

      // ── Alert ───────────────────────────────────────────────────────────────
      case 'alert': {
        const variant = props.alertVariant ?? 'info'
        const themes = {
          info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'ℹ' },
          success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: '✓' },
          warning: { bg: '#fffbeb', border: '#fde68a', color: '#b45309', icon: '⚠' },
          error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: '✕' },
        }
        const t = themes[variant]
        return (
          <div style={{
            width: '100%', height: '100%',
            background: t.bg, border: `1.5px solid ${t.border}`,
            borderRadius: props.borderRadius ?? globalRadius,
            display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
            fontFamily: 'Inter, sans-serif', fontSize: props.fontSize ?? 14,
          }}>
            <span style={{ color: t.color, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
            <span style={{ color: t.color }}>{props.text ?? 'Alert message'}</span>
          </div>
        )
      }

      // ── Divider ─────────────────────────────────────────────────────────────
      case 'divider':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%', height: 2, background: gradBg(props, '#e5e7eb'), borderRadius: 1 }} />
          </div>
        )

      // ── Rating ──────────────────────────────────────────────────────────────
      case 'rating': {
        const val = Math.round(props.value ?? 4)
        const color = props.badgeColor ?? '#f59e0b'
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 3 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <svg key={star} viewBox="0 0 24 24" width="20" height="20" fill={star <= val ? color : '#e5e7eb'}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#6b7280', marginLeft: 4 }}>{val}/5</span>
          </div>
        )
      }

      // ── List ────────────────────────────────────────────────────────────────
      case 'list': {
        const items = (props.items ?? 'First item\nSecond item\nThird item').split('\n').filter(Boolean)
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            gap: 8, fontFamily: 'Inter, sans-serif',
            fontSize: props.fontSize ?? 14,
            color: props.textColor ?? styles.textColor, overflow: 'hidden',
          }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: styles.primaryColor, flexShrink: 0 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )
      }

      // ── Tab Bar ─────────────────────────────────────────────────────────────
      case 'tabbar': {
        const tabs = (props.tabs ?? 'Home,Explore,Profile').split(',').map((t) => t.trim())
        const active = props.activeTab ?? 0
        const activeColor = gradBg(props, styles.primaryColor)
        const TAB_ICONS = ['home', 'search', 'heart', 'star', 'bell', 'user', 'settings', 'bookmark']
        return (
          <div style={{
            width: '100%', height: '100%',
            background: props.bgColor ?? '#ffffff',
            borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center',
          }}>
            {tabs.map((tab, i) => {
              const isActive = i === active
              const iconPath = ICON_PATHS[TAB_ICONS[i % TAB_ICONS.length]] ?? ICON_PATHS.home
              const color = isActive ? activeColor : '#9ca3af'
              return (
                <div key={i} style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: isActive ? 600 : 400,
                  color,
                }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                    stroke={typeof color === 'string' ? color : styles.primaryColor}
                    strokeWidth={isActive ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d={iconPath} />
                  </svg>
                  <span>{tab}</span>
                  {isActive && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, marginTop: -2 }} />
                  )}
                </div>
              )
            })}
          </div>
        )
      }

      // ── Search Bar ──────────────────────────────────────────────────────────
      case 'searchbar': {
        const sbColor = props.textColor ?? '#9ca3af'
        return (
          <div style={{
            width: '100%', height: '100%',
            background: props.bgColor ?? '#f3f4f6',
            border: `1.5px solid ${props.bgColor ? 'transparent' : '#e5e7eb'}`,
            borderRadius: props.borderRadius ?? globalRadius,
            display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
            fontFamily: props.fontFamily ?? 'Inter, sans-serif', fontSize: props.fontSize ?? 14, color: sbColor,
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={sbColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{props.placeholder ?? 'Search…'}</span>
          </div>
        )
      }

      // ── Icon ─────────────────────────────────────────────────────────────────
      case 'icon': {
        const iconPath = ICON_PATHS[props.iconName ?? 'star'] ?? ICON_PATHS.star
        const iconColor = gradBg(props, styles.primaryColor)
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg
              viewBox="0 0 24 24"
              style={{ width: '70%', height: '70%' }}
              fill="none"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={iconPath} />
            </svg>
          </div>
        )
      }

      // ── Dropdown ─────────────────────────────────────────────────────────────
      case 'dropdown': {
        const selected = props.selectedItem ?? ''
        const displayText = selected || props.placeholder || 'Select…'
        return (
          <div style={{
            width: '100%', height: '100%',
            background: '#f9fafb', border: '1.5px solid #e5e7eb',
            borderRadius: props.borderRadius ?? globalRadius,
            display: 'flex', alignItems: 'center', padding: '0 14px',
            fontFamily: props.fontFamily ?? 'Inter, sans-serif',
            fontSize: props.fontSize ?? 14,
            color: selected ? (props.textColor ?? '#111827') : '#9ca3af',
            gap: 8, cursor: 'pointer',
          }}>
            <span style={{ flex: 1 }}>{displayText}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )
      }

      // ── Video ─────────────────────────────────────────────────────────────────
      case 'video': {
        const url = props.videoUrl ?? ''
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/)
        const vmMatch = url.match(/vimeo\.com\/(\d+)/)
        const isDirect = !ytMatch && !vmMatch && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)

        if (ytMatch) {
          return (
            <div style={{ width: '100%', height: '100%', borderRadius: props.borderRadius ?? globalRadius, overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        }
        if (vmMatch) {
          return (
            <div style={{ width: '100%', height: '100%', borderRadius: props.borderRadius ?? globalRadius, overflow: 'hidden' }}>
              <iframe
                src={`https://player.vimeo.com/video/${vmMatch[1]}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        }
        if (isDirect) {
          return (
            <div style={{ width: '100%', height: '100%', borderRadius: props.borderRadius ?? globalRadius, overflow: 'hidden', background: '#000' }}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )
        }
        // No URL yet — show a clean placeholder with a prompt to add one
        return (
          <div style={{
            width: '100%', height: '100%', background: '#111827',
            borderRadius: props.borderRadius ?? globalRadius,
            overflow: 'hidden', position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
              {props.label || 'Paste a YouTube, Vimeo,'}
              {!props.label && <><br />or .mp4 URL in properties</>}
            </div>
          </div>
        )
      }

      // ── Map ───────────────────────────────────────────────────────────────────
      case 'map': {
        const location = props.mapLocation ?? ''
        const zoom = props.mapZoom ?? 13
        const radius = props.borderRadius ?? globalRadius

        if (location) {
          const encodedLoc = encodeURIComponent(location)
          const mapSrc = `https://maps.google.com/maps?q=${encodedLoc}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`
          return (
            <div style={{ width: '100%', height: '100%', borderRadius: radius, overflow: 'hidden', position: 'relative' }}>
              <iframe
                src={mapSrc}
                style={{ width: '100%', height: '100%', border: 'none' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )
        }

        // No location yet — decorative placeholder
        const pinColor = gradBg(props, styles.primaryColor)
        return (
          <div style={{
            width: '100%', height: '100%', borderRadius: radius, overflow: 'hidden',
            position: 'relative', background: 'linear-gradient(145deg, #e8f0e8 0%, #d4e4d4 100%)',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(100,120,100,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(100,120,100,0.12) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 280 200" preserveAspectRatio="none">
              <line x1="0" y1="100" x2="280" y2="100" stroke="#fff" strokeWidth="7" opacity="0.6" />
              <line x1="140" y1="0" x2="140" y2="200" stroke="#fff" strokeWidth="7" opacity="0.6" />
              <line x1="0" y1="60" x2="280" y2="60" stroke="#fff" strokeWidth="3.5" opacity="0.45" />
              <line x1="80" y1="0" x2="80" y2="200" stroke="#fff" strokeWidth="3.5" opacity="0.45" />
              <rect x="90" y="65" width="85" height="50" fill="rgba(180,200,180,0.5)" rx="2" />
            </svg>
            <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-100%)' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50% 50% 50% 0', background: pinColor, transform: 'rotate(-45deg)', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }} />
            </div>
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, color: '#374151', fontFamily: 'Inter, sans-serif',
              background: 'rgba(255,255,255,0.9)', padding: '3px 10px', borderRadius: 10,
              whiteSpace: 'nowrap',
            }}>
              Enter a location in properties
            </div>
          </div>
        )
      }

      // ── Chart ─────────────────────────────────────────────────────────────────
      case 'chart': {
        const rawData = (props.chartData ?? '40,65,55,80,35').split(',').map(Number).filter((n) => !isNaN(n))
        const data = rawData.length > 0 ? rawData : [40, 65, 55, 80, 35]
        const rawLabels = (props.chartLabels ?? '').split(',')
        const labels = rawLabels.length >= data.length ? rawLabels : data.map((_, i) => String(i + 1))
        const chartType = props.chartType ?? 'bar'
        const color = gradBg(props, styles.primaryColor)
        const max = Math.max(...data, 1)
        const W = 260, H = 130, padX = 18, padY = 12
        const chartH = H - padY * 2
        const chartW = W - padX * 2
        const labelLine = 14

        if (chartType === 'bar') {
          const n = data.length
          const slotW = chartW / n
          const barW = Math.max(4, slotW * 0.55)
          return (
            <div style={{ width: '100%', height: '100%', padding: '6px 4px 0', fontFamily: 'Inter, sans-serif' }}>
              {props.label && <div style={{ fontSize: 11, color: '#6b7280', paddingLeft: 8, marginBottom: 2 }}>{props.label}</div>}
              <svg viewBox={`0 0 ${W} ${H + labelLine}`} style={{ width: '100%', height: `calc(100% - ${props.label ? 18 : 4}px)` }}>
                {[0.25, 0.5, 0.75, 1].map((f, i) => (
                  <line key={i} x1={padX} x2={W - padX} y1={padY + chartH * (1 - f)} y2={padY + chartH * (1 - f)} stroke="#f3f4f6" strokeWidth="1" />
                ))}
                {data.map((v, i) => {
                  const x = padX + i * slotW + (slotW - barW) / 2
                  const barH = (v / max) * chartH
                  const y = padY + chartH - barH
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={barW} height={barH} rx="3" fill={color} opacity="0.85" />
                      <text x={x + barW / 2} y={H + labelLine - 2} textAnchor="middle" fontSize="8.5" fill="#9ca3af">{labels[i] ?? ''}</text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )
        }

        if (chartType === 'line') {
          const n = data.length
          const pts = data.map((v, i) => {
            const x = padX + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2)
            const y = padY + chartH - (v / max) * chartH
            return { x, y }
          })
          const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
          const fillPts = `${pts[0].x},${padY + chartH} ${polyline} ${pts[pts.length - 1].x},${padY + chartH}`
          return (
            <div style={{ width: '100%', height: '100%', padding: '6px 4px 0', fontFamily: 'Inter, sans-serif' }}>
              {props.label && <div style={{ fontSize: 11, color: '#6b7280', paddingLeft: 8, marginBottom: 2 }}>{props.label}</div>}
              <svg viewBox={`0 0 ${W} ${H + labelLine}`} style={{ width: '100%', height: `calc(100% - ${props.label ? 18 : 4}px)` }}>
                {[0.25, 0.5, 0.75, 1].map((f, i) => (
                  <line key={i} x1={padX} x2={W - padX} y1={padY + chartH * (1 - f)} y2={padY + chartH * (1 - f)} stroke="#f3f4f6" strokeWidth="1" />
                ))}
                <polygon points={fillPts} fill={color} opacity="0.12" />
                <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={color} strokeWidth="2" />
                    <text x={p.x} y={H + labelLine - 2} textAnchor="middle" fontSize="8.5" fill="#9ca3af">{labels[i] ?? ''}</text>
                  </g>
                ))}
              </svg>
            </div>
          )
        }

        if (chartType === 'pie') {
          const total = data.reduce((a, b) => a + b, 0) || 1
          const PIE_COLORS = [color, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']
          let angle = -Math.PI / 2
          const cx = W / 2, cy = (H + labelLine) / 2, r = Math.min(W, H) / 2 - padX
          const slices = data.map((v, i) => {
            const start = angle
            const sweep = (v / total) * 2 * Math.PI
            angle += sweep
            const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
            const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
            const mid = start + sweep / 2
            const lx = cx + r * 0.65 * Math.cos(mid), ly = cy + r * 0.65 * Math.sin(mid)
            return {
              d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0},1 ${x2},${y2} Z`,
              c: PIE_COLORS[i % PIE_COLORS.length],
              pct: Math.round((v / total) * 100),
              lx, ly,
            }
          })
          return (
            <div style={{ width: '100%', height: '100%', padding: '6px 4px 0', fontFamily: 'Inter, sans-serif' }}>
              {props.label && <div style={{ fontSize: 11, color: '#6b7280', paddingLeft: 8, marginBottom: 2 }}>{props.label}</div>}
              <svg viewBox={`0 0 ${W} ${H + labelLine}`} style={{ width: '100%', height: `calc(100% - ${props.label ? 18 : 4}px)` }}>
                {slices.map((s, i) => (
                  <g key={i}>
                    <path d={s.d} fill={s.c} stroke="#fff" strokeWidth="1.5" />
                    {s.pct > 8 && (
                      <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#fff" fontWeight="600">{s.pct}%</text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          )
        }
        return null
      }

      // ── Stepper ───────────────────────────────────────────────────────────────
      case 'stepper': {
        const val = props.value ?? 1
        const minV = props.min ?? 0
        const maxV = props.max ?? 99
        const color = gradBg(props, styles.primaryColor)
        const atMin = val <= minV, atMax = val >= maxV
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            gap: 10, fontFamily: props.fontFamily ?? 'Inter, sans-serif',
          }}>
            {props.label && (
              <span style={{ flex: 1, fontSize: props.fontSize ?? 14, color: props.textColor ?? styles.textColor }}>{props.label}</span>
            )}
            <div style={{
              display: 'flex', alignItems: 'center',
              borderRadius: props.borderRadius ?? 8,
              border: '1.5px solid #e5e7eb', overflow: 'hidden',
            }}>
              {(['minus', 'value', 'plus'] as const).map((part) => {
                if (part === 'value') return (
                  <div key="v" style={{
                    width: 44, textAlign: 'center', fontSize: 15, fontWeight: 600,
                    color: styles.textColor, borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb',
                    height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{val}</div>
                )
                const isDisabled = part === 'minus' ? atMin : atMax
                return (
                  <div key={part} style={{
                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDisabled ? '#f9fafb' : `${color}18`,
                    color: isDisabled ? '#d1d5db' : color,
                    fontSize: 18, fontWeight: 400,
                    cursor: isDisabled ? 'default' : 'pointer',
                  }}>
                    {part === 'minus' ? '−' : '+'}
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      // ── Draw ──────────────────────────────────────────────────────────────────
      case 'draw': {
        const d = props.pathData ?? ''
        const blendMode = (props.blendMode ?? 'normal') as React.CSSProperties['mixBlendMode']
        const glowR = props.glowRadius ?? 0
        const filterId = `glow-${element.id}`
        const gradientId = `grad-${element.id}`
        const strokeColor = props.strokeColor ?? '#6366f1'
        const strokeWidth = props.strokeWidth ?? 3
        const linecap = (props.strokeLinecap ?? 'round') as 'round' | 'square' | 'butt'
        const gradFill = props.fillGradient as { color2: string; angle: number } | undefined
        const fillValue = gradFill ? `url(#${gradientId})` : (props.fillColor ?? 'none')
        const hasDefs = glowR > 0 || !!gradFill
        return (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg
              width="100%" height="100%"
              style={{ overflow: 'visible', position: 'absolute', inset: 0, mixBlendMode: blendMode }}
              fill="none"
            >
              {hasDefs && (
                <defs>
                  {glowR > 0 && (
                    <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
                      <feGaussianBlur stdDeviation={glowR} result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  )}
                  {gradFill && (
                    <linearGradient id={gradientId} x1="0%" y1="50%" x2="100%" y2="50%"
                      gradientTransform={`rotate(${gradFill.angle}, 0.5, 0.5)`}>
                      <stop offset="0%" stopColor={props.fillColor ?? '#6366f1'} />
                      <stop offset="100%" stopColor={gradFill.color2} />
                    </linearGradient>
                  )}
                </defs>
              )}
              {d && (
                <>
                  {/* Outer glow halo — only for neon/glow effect */}
                  {glowR > 0 && (
                    <path
                      d={d}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth * 4}
                      fill="none"
                      strokeLinecap={linecap}
                      strokeLinejoin="round"
                      opacity={0.35}
                      filter={`url(#${filterId})`}
                    />
                  )}
                  {/* Main stroke */}
                  <path
                    d={d}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill={fillValue}
                    strokeLinecap={linecap}
                    strokeLinejoin="round"
                    filter={glowR > 0 ? `url(#${filterId})` : undefined}
                  />
                </>
              )}
            </svg>
          </div>
        )
      }

      // ── Custom (AI-generated SVG) ────────────────────────────────────────────
      case 'custom':
        if (props.svg) {
          // SVG is generated by Claude and trusted for this local tool
          return (
            <div
              style={{ width: '100%', height: '100%' }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: props.svg }}
            />
          )
        }
        return (
          <div style={{
            width: '100%', height: '100%', border: '2px dashed #d1d5db',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9ca3af', fontSize: 12, fontFamily: 'Inter, sans-serif',
          }}>
            Custom element
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', opacity: props.opacity ?? 1 }}>
      {renderContent()}
    </div>
  )
})
