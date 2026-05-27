import { Fragment } from 'react'
import type { CanvasElement } from '../types'
import { useStore } from '../store/useStore'

interface Props {
  element: CanvasElement
}

export function ElementRenderer({ element }: Props) {
  const { type, props } = element
  const styles = useStore((s) => s.styles)

  const radiusMap = { sharp: 4, medium: 10, soft: 20 }
  const globalRadius = radiusMap[styles.borderRadius]

  function renderContent() {
    switch (type) {
      // ── Button ──────────────────────────────────────────────────────────────
      case 'button': {
        const isSecondary = props.variant === 'secondary'
        const isGhost     = props.variant === 'ghost'
        const bg = props.bgColor
          ? props.bgColor
          : isGhost || isSecondary ? 'transparent' : styles.primaryColor
        return (
          <button style={{
            width: '100%', height: '100%',
            background: bg,
            color: props.textColor ?? (isGhost || isSecondary ? styles.primaryColor : '#fff'),
            border: isSecondary ? `2px solid ${styles.primaryColor}` : 'none',
            borderRadius: props.borderRadius ?? globalRadius,
            fontFamily: 'Inter, sans-serif', fontWeight: 500,
            fontSize: props.fontSize ?? 15, cursor: 'pointer', letterSpacing: '0.01em',
          }}>
            {props.label ?? 'Button'}
          </button>
        )
      }

      // ── Heading ─────────────────────────────────────────────────────────────
      case 'heading':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            color: props.textColor ?? styles.textColor,
            fontSize: props.fontSize ?? 28, fontWeight: props.fontWeight ?? '600',
            fontFamily: 'Inter, sans-serif', lineHeight: 1.2,
          }}>
            {props.text ?? 'Heading'}
          </div>
        )

      // ── Text ────────────────────────────────────────────────────────────────
      case 'text':
        return (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start',
            color: props.textColor ?? '#6b7280',
            fontSize: props.fontSize ?? 15, fontFamily: 'Inter, sans-serif',
            lineHeight: 1.6, overflow: 'hidden',
          }}>
            {props.text ?? 'Your text goes here.'}
          </div>
        )

      // ── Card ────────────────────────────────────────────────────────────────
      case 'card':
        return (
          <div style={{
            width: '100%', height: '100%',
            background: props.bgColor ?? '#ffffff',
            borderRadius: props.borderRadius ?? globalRadius,
            boxShadow: props.shadow ? '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)' : 'none',
            padding: props.padding ?? 20,
          }} />
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
            background: '#f9fafb', border: '1.5px solid #e5e7eb',
            borderRadius: props.borderRadius ?? globalRadius,
            display: 'flex', alignItems: 'center', padding: '0 14px',
            color: '#9ca3af', fontSize: props.fontSize ?? 14,
            fontFamily: 'Inter, sans-serif',
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
      case 'badge':
        return (
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: (props.badgeColor ?? styles.primaryColor) + '20',
            color: props.badgeColor ?? styles.primaryColor,
            borderRadius: 999, padding: '4px 12px',
            fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.03em', height: '100%',
          }}>
            {props.label ?? 'Badge'}
          </div>
        )

      // ── Slider ──────────────────────────────────────────────────────────────
      case 'slider': {
        const val = props.value ?? 60
        const trackColor = props.bgColor ?? styles.primaryColor
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
        const barColor = props.bgColor ?? styles.primaryColor
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
        const color = props.bgColor ?? styles.primaryColor
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
                background: props.bgColor ?? styles.primaryColor,
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
            <div style={{ width: '100%', height: 2, background: props.bgColor ?? '#e5e7eb', borderRadius: 1 }} />
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
        const activeColor = props.bgColor ?? styles.primaryColor
        const ICONS = ['⌂', '◉', '♡', '☆', '≡', '◻']
        return (
          <div style={{
            width: '100%', height: '100%', background: '#fff',
            borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center',
          }}>
            {tabs.map((tab, i) => (
              <div key={i} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                fontFamily: 'Inter, sans-serif', fontSize: 10,
                color: i === active ? activeColor : '#9ca3af',
              }}>
                <span style={{ fontSize: 18 }}>{ICONS[i % ICONS.length]}</span>
                <span>{tab}</span>
              </div>
            ))}
          </div>
        )
      }

      // ── Search Bar ──────────────────────────────────────────────────────────
      case 'searchbar':
        return (
          <div style={{
            width: '100%', height: '100%',
            background: '#f3f4f6', border: '1.5px solid #e5e7eb',
            borderRadius: props.borderRadius ?? globalRadius,
            display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
            fontFamily: 'Inter, sans-serif', fontSize: props.fontSize ?? 14, color: '#9ca3af',
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{props.placeholder ?? 'Search…'}</span>
          </div>
        )

      // ── Video ───────────────────────────────────────────────────────────────
      case 'video':
        return (
          <div style={{
            width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
            borderRadius: props.borderRadius ?? globalRadius,
            background: '#000',
          }}>
            {props.src ? (
              <video
                src={props.src}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter,sans-serif', fontSize: 13, textAlign: 'center',
              }}>
                <div style={{ fontSize: 34 }}>🎬</div>
                <div style={{ lineHeight: 1.5 }}>Paste a video URL<br />in the Properties panel</div>
              </div>
            )}
          </div>
        )

      // ── Map ─────────────────────────────────────────────────────────────────
      case 'map': {
        const mapQuery = encodeURIComponent(props.text ?? 'New York, USA')
        return (
          <div style={{
            width: '100%', height: '100%', overflow: 'hidden',
            borderRadius: props.borderRadius ?? globalRadius,
            position: 'relative',
          }}>
            <iframe
              src={`https://maps.google.com/maps?q=${mapQuery}&output=embed&z=14`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              loading="lazy"
              title="Map"
            />
          </div>
        )
      }

      // ── Bar Chart ───────────────────────────────────────────────────────────
      case 'chart': {
        const raw = (props.chartData ?? '40,65,45,80,55,70,60').split(',')
        const data = raw.map(v => Math.max(0, Math.min(100, parseFloat(v.trim()) || 0)))
        const maxVal = Math.max(...data, 1)
        const barColor = props.bgColor ?? styles.primaryColor
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            fontFamily: 'Inter,sans-serif', padding: '8px 4px 4px' }}>
            {props.label && (
              <div style={{ fontSize: 12, fontWeight: 600, color: styles.textColor, marginBottom: 6, paddingLeft: 4 }}>
                {props.label}
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 3, overflow: 'hidden' }}>
              {data.map((val, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 8, color: '#9ca3af', lineHeight: 1 }}>{val}</div>
                  <div style={{
                    width: '100%', borderRadius: '3px 3px 0 0', minHeight: 3,
                    height: `${(val / maxVal) * 100}%`,
                    background: i === data.length - 1 ? barColor : barColor + 'a0',
                  }} />
                </div>
              ))}
            </div>
          </div>
        )
      }

      // ── Stepper ─────────────────────────────────────────────────────────────
      case 'stepper': {
        const steps = (props.steps ?? 'Step 1,Step 2,Step 3').split(',').map(s => s.trim())
        const current = props.currentStep ?? 1
        const color = props.bgColor ?? styles.primaryColor
        const nodes: JSX.Element[] = []
        steps.forEach((step, i) => {
          const done = i < current, active = i === current
          nodes.push(
            <div key={`s${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done || active ? color : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: done || active ? '#fff' : '#9ca3af', fontSize: 12, fontWeight: 600,
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 600 : 400,
                color: active ? color : done ? '#6b7280' : '#9ca3af',
                whiteSpace: 'nowrap', maxWidth: 60, textAlign: 'center', lineHeight: 1.2,
              }}>
                {step}
              </span>
            </div>
          )
          if (i < steps.length - 1) {
            nodes.push(
              <div key={`l${i}`} style={{ flex: 1, height: 2, alignSelf: 'flex-start', marginTop: 13,
                background: i < current ? color : '#e5e7eb' }} />
            )
          }
        })
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '0 8px', fontFamily: 'Inter,sans-serif' }}>
            {nodes}
          </div>
        )
      }

      // ── Stat Card ───────────────────────────────────────────────────────────
      case 'stat': {
        const isUp = props.statUp !== false
        return (
          <div style={{
            width: '100%', height: '100%',
            background: props.bgColor ?? '#ffffff',
            borderRadius: props.borderRadius ?? globalRadius,
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            padding: props.padding ?? 14,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            fontFamily: 'Inter,sans-serif',
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, letterSpacing: '0.02em' }}>
              {props.statLabel ?? 'Total Revenue'}
            </div>
            <div style={{ fontSize: props.fontSize ?? 26, fontWeight: 700, color: props.textColor ?? styles.textColor, lineHeight: 1.1 }}>
              {props.statValue ?? '$12,400'}
            </div>
            {props.statChange && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <span style={{ color: isUp ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {isUp ? '↑' : '↓'} {props.statChange}
                </span>
                <span style={{ color: '#9ca3af' }}>vs last period</span>
              </div>
            )}
          </div>
        )
      }

      // ── Skeleton ────────────────────────────────────────────────────────────
      case 'skeleton': {
        const rows = props.skeletonRows ?? 3
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 4 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="skeleton-shimmer" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="skeleton-shimmer" style={{ height: 12, borderRadius: 6, width: '65%' }} />
                <div className="skeleton-shimmer" style={{ height: 10, borderRadius: 5, width: '40%' }} />
              </div>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skeleton-shimmer" style={{ height: 12, borderRadius: 6, width: `${90 - i * 14}%` }} />
            ))}
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
    <div
      style={{ width: '100%', height: '100%', opacity: props.opacity ?? 1 }}
      className={props.animation ? `anim-${props.animation}` : undefined}
    >
      {renderContent()}
    </div>
  )
}
