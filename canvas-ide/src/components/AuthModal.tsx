import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { createLocalUser } from '../lib/localAuth'
import { useStore } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'

interface Props {
  onClose: () => void
}

export function AuthModal({ onClose }: Props) {
  const t = useUITheme()
  const { setUser, setUserProfile } = useStore()

  // ── Local (no-setup) sign-in ──────────────────────────────────────────────────
  const [name, setName]   = useState('')
  const [nameErr, setNameErr] = useState('')

  function handleLocalSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setNameErr('Please enter your name.'); return }
    const u = createLocalUser(name)
    setUser({ id: u.id, email: u.name })          // email field carries display name
    setUserProfile({ id: u.id, username: u.name, bio: null, avatar_url: null, updated_at: u.createdAt })
    onClose()
  }

  // ── Supabase sign-in (only shown when configured) ─────────────────────────────
  const [tab, setTab]           = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  async function handleCloudSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (tab === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) {
          setSuccess('Check your email for a confirmation link, then sign in.')
        } else {
          if (username.trim()) {
            await supabase.from('profiles').upsert({
              id: data.user!.id, username: username.trim(),
              updated_at: new Date().toISOString(),
            })
          }
          onClose()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.bgApp,
    color: t.textPrimary, fontSize: 15, outline: 'none',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  // ── Default: simple local sign-in (no Supabase required) ─────────────────────
  if (!isSupabaseConfigured) {
    return (
      <Backdrop onClick={onClose}>
        <Card t={t} onClick={(e) => e.stopPropagation()}>
          {/* Logo / header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>✦</div>
            <h2 style={{ margin: 0, color: t.textPrimary, fontSize: 22, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 }}>
              Welcome to Canvas IDE
            </h2>
            <p style={{ margin: '8px 0 0', color: t.textDim, fontSize: 13 }}>
              Just tell us your name to get started — no account needed.
            </p>
          </div>

          <form onSubmit={handleLocalSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, display: 'block', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Your name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); setNameErr('') }}
                placeholder="e.g. Alex"
                style={inputStyle}
              />
              {nameErr && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 5 }}>{nameErr}</div>}
            </div>

            <button type="submit" style={primaryBtn}>
              Get Started
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: t.textDim, lineHeight: 1.6 }}>
            Your projects are saved locally in your browser.<br />
            No account, email, or password required.
          </div>
        </Card>
      </Backdrop>
    )
  }

  // ── Supabase-backed sign-in (when .env is configured) ─────────────────────────
  return (
    <Backdrop onClick={onClose}>
      <Card t={t} onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={tab === 'signin' ? 'Welcome back' : 'Create account'} onClose={onClose} t={t} />

        <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: t.bgApp, borderRadius: 10, padding: 3 }}>
          {(['signin', 'signup'] as const).map((key) => (
            <button key={key}
              onClick={() => { setTab(key); setError(''); setSuccess('') }}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: tab === key ? 600 : 400,
                background: tab === key ? '#6366f1' : 'transparent',
                color: tab === key ? '#fff' : t.textSecondary,
                transition: 'background 0.12s, color 0.12s',
              }}>
              {key === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleCloudSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'signup' && (
            <Field label="Username (optional)" t={t}>
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username" style={inputStyle} />
            </Field>
          )}
          <Field label="Email" t={t}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" style={inputStyle} />
          </Field>
          <Field label="Password" t={t}>
            <input type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6+ characters" style={inputStyle} />
          </Field>

          {error   && <Banner kind="error"   text={error} />}
          {success && <Banner kind="success" text={success} />}

          <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? '…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </Card>
    </Backdrop>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Backdrop({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClick}>
      {children}
    </div>
  )
}

function Card({ t, onClick, children }: { t: ReturnType<typeof useUITheme>; onClick?: React.MouseEventHandler; children: React.ReactNode }) {
  return (
    <div style={{ background: t.bgPanel, borderRadius: 20, padding: 30, width: '100%', maxWidth: 420, margin: '0 16px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
      onClick={onClick}>
      {children}
    </div>
  )
}

function ModalHeader({ title, onClose, t }: { title: string; onClose: () => void; t: ReturnType<typeof useUITheme> }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
      <h2 style={{ margin: 0, color: t.textPrimary, fontSize: 19, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500 }}>
        {title}
      </h2>
      <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: t.textDim, fontSize: 16 }}>✕</button>
    </div>
  )
}

function Field({ label, t, children }: { label: string; t: ReturnType<typeof useUITheme>; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, display: 'block', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  )
}

function Banner({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  const isErr = kind === 'error'
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
      background: isErr ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
      color: isErr ? '#ef4444' : '#10b981' }}>
      {text}
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '12px 0', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  color: '#fff', fontSize: 14, fontWeight: 600,
  fontFamily: 'Inter, sans-serif', cursor: 'pointer', width: '100%',
  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
}
