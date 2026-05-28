import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { CloudProject } from '../lib/supabase'
import {
  getLocalProjects, saveLocalProject, deleteLocalProject,
  updateLocalUserName, clearLocalUser,
} from '../lib/localAuth'
import { useStore } from '../store/useStore'
import { useUITheme } from '../hooks/useUITheme'
import type { AuthUser } from '../store/useStore'

interface Props {
  user: AuthUser
  onClose: () => void
}

// A local user has an id starting with 'local-'
const isLocalUser = (user: AuthUser) => user.id.startsWith('local-')

export function ProfileModal({ user, onClose }: Props) {
  const t = useUITheme()
  const { importProject, setUser, setUserProfile } = useStore()

  // Display name (local) or username (cloud)
  const [displayName, setDisplayName] = useState(user.email ?? '')
  const [savingName, setSavingName]   = useState(false)
  const [nameMsg, setNameMsg]         = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // ── Local projects ────────────────────────────────────────────────────────────
  const [localProjects, setLocalProjects] = useState(getLocalProjects)
  const [projectName, setProjectName]     = useState('My App')
  const [savingProject, setSavingProject] = useState(false)
  const [projectMsg, setProjectMsg]       = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // ── Cloud projects (Supabase, only when configured + cloud user) ──────────────
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([])
  const [loadingCloud, setLoadingCloud]   = useState(false)

  const fetchCloudProjects = useCallback(async () => {
    if (!isSupabaseConfigured || isLocalUser(user)) return
    setLoadingCloud(true)
    const { data } = await supabase
      .from('projects').select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    setCloudProjects((data ?? []) as CloudProject[])
    setLoadingCloud(false)
  }, [user])

  useEffect(() => { fetchCloudProjects() }, [fetchCloudProjects])

  // ── Save display name ─────────────────────────────────────────────────────────
  async function saveName() {
    if (!displayName.trim()) return
    setSavingName(true); setNameMsg(null)
    if (isLocalUser(user)) {
      updateLocalUserName(displayName)
      setUser({ ...user, email: displayName.trim() })
      setUserProfile({ id: user.id, username: displayName.trim(), bio: null, avatar_url: null, updated_at: new Date().toISOString() })
      setNameMsg({ kind: 'ok', text: 'Name updated!' })
    } else {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id, username: displayName.trim(), updated_at: new Date().toISOString(),
      })
      if (error) setNameMsg({ kind: 'err', text: error.message })
      else {
        setUserProfile({ id: user.id, username: displayName.trim(), bio: null, avatar_url: null, updated_at: new Date().toISOString() })
        setNameMsg({ kind: 'ok', text: 'Profile updated!' })
      }
    }
    setSavingName(false)
    setTimeout(() => setNameMsg(null), 2500)
  }

  // ── Save project ──────────────────────────────────────────────────────────────
  async function saveProject() {
    if (!projectName.trim()) return
    setSavingProject(true); setProjectMsg(null)
    const state = useStore.getState()
    const data = {
      screens: state.screens, styles: state.styles,
      device: state.device, uiTheme: state.uiTheme,
      appDatabase: state.appDatabase,
    }

    if (isLocalUser(user)) {
      saveLocalProject(projectName.trim(), data as Record<string, unknown>)
      setLocalProjects(getLocalProjects())
      setProjectMsg({ kind: 'ok', text: 'Saved locally!' })
    } else {
      const { error } = await supabase.from('projects').insert({ user_id: user.id, name: projectName.trim(), data })
      if (error) setProjectMsg({ kind: 'err', text: error.message })
      else {
        setProjectMsg({ kind: 'ok', text: 'Saved to cloud!' })
        await fetchCloudProjects()
      }
    }
    setSavingProject(false)
    setTimeout(() => setProjectMsg(null), 2500)
  }

  // ── Load / delete ─────────────────────────────────────────────────────────────
  function loadProject(data: Record<string, unknown>, name: string) {
    if (!confirm(`Load "${name}"? Unsaved changes will be lost.`)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    importProject(data as any)
    onClose()
  }

  function removeLocalProject(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteLocalProject(id)
    setLocalProjects(getLocalProjects())
  }

  async function removeCloudProject(id: string, name: string) {
    if (!confirm(`Delete "${name}" from the cloud? This cannot be undone.`)) return
    await supabase.from('projects').delete().eq('id', id)
    setCloudProjects((prev) => prev.filter((p) => p.id !== id))
  }

  // ── Sign out ──────────────────────────────────────────────────────────────────
  async function signOut() {
    if (isLocalUser(user)) {
      clearLocalUser()
    } else {
      await supabase.auth.signOut()
    }
    setUser(null)
    setUserProfile(null)
    onClose()
  }

  const initial = (displayName || '?').charAt(0).toUpperCase()
  const screenCount = (data: Record<string, unknown>) =>
    ((data.screens as unknown[]) ?? []).length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: t.bgPanel, borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', margin: '0 16px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: t.textPrimary, fontSize: 19, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500 }}>
            My Account
          </h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: t.textDim, fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Avatar + identity */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: '#fff', fontWeight: 700,
            }}>
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>{displayName || 'New User'}</div>
              <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
                {isLocalUser(user) ? '💾 Saved locally in this browser' : user.email}
              </div>
            </div>
          </div>

          {/* Name editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel text="Profile" />
            <Label t={t}>Display name</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name" style={{ ...inputStyle(t), flex: 1 }}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName() }} />
              <button onClick={saveName} disabled={savingName}
                style={secondaryBtn(t, savingName)}>
                {savingName ? '…' : 'Save'}
              </button>
            </div>
            {nameMsg && <Msg kind={nameMsg.kind} text={nameMsg.text} />}
          </div>

          <Divider t={t} />

          {/* Projects */}
          <div>
            <SectionLabel text={isLocalUser(user) ? '💾 Saved Projects' : '☁ Cloud Projects'} />

            <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 12 }}>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name…" style={{ ...inputStyle(t), flex: 1 }}
                onKeyDown={(e) => { if (e.key === 'Enter') saveProject() }} />
              <button onClick={saveProject} disabled={savingProject}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', opacity: savingProject ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}>
                {savingProject ? '…' : '↑ Save'}
              </button>
            </div>
            {projectMsg && <div style={{ marginBottom: 10 }}><Msg kind={projectMsg.kind} text={projectMsg.text} /></div>}

            {/* Local projects list */}
            {isLocalUser(user) && (
              localProjects.length === 0 ? (
                <EmptyState text="No saved projects yet. Save your current project above." />
              ) : (
                <ProjectList
                  projects={localProjects.map((p) => ({
                    id: p.id, name: p.name, data: p.data, updated_at: p.updatedAt,
                  }))}
                  t={t}
                  onLoad={(p) => loadProject(p.data as Record<string, unknown>, p.name)}
                  onDelete={(p) => removeLocalProject(p.id, p.name)}
                  screenCount={(p) => screenCount(p.data as Record<string, unknown>)}
                />
              )
            )}

            {/* Cloud projects list */}
            {!isLocalUser(user) && (
              loadingCloud ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: t.textDim, fontSize: 13 }}>Loading…</div>
              ) : cloudProjects.length === 0 ? (
                <EmptyState text="No cloud projects yet. Save your current project above." />
              ) : (
                <ProjectList
                  projects={cloudProjects.map((p) => ({
                    id: p.id, name: p.name, data: p.data, updated_at: p.updated_at,
                  }))}
                  t={t}
                  onLoad={(p) => loadProject(p.data as Record<string, unknown>, p.name)}
                  onDelete={(p) => removeCloudProject(p.id, p.name)}
                  screenCount={(p) => screenCount(p.data as Record<string, unknown>)}
                />
              )
            )}
          </div>

          <Divider t={t} />

          {/* Sign out */}
          <button onClick={signOut}
            style={{ padding: '10px 0', borderRadius: 10, border: `1px solid rgba(239,68,68,0.25)`, background: 'transparent', color: '#f87171', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            {isLocalUser(user) ? 'Clear Profile & Sign Out' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ProjectList ──────────────────────────────────────────────────────────────
function ProjectList({
  projects, t, onLoad, onDelete, screenCount,
}: {
  projects: { id: string; name: string; data: unknown; updated_at: string }[]
  t: ReturnType<typeof useUITheme>
  onLoad: (p: { id: string; name: string; data: unknown; updated_at: string }) => void
  onDelete: (p: { id: string; name: string; data: unknown; updated_at: string }) => void
  screenCount: (p: { id: string; name: string; data: unknown; updated_at: string }) => number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {projects.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgApp }}>
          <div style={{ fontSize: 18, flexShrink: 0 }}>📁</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
              {screenCount(p)} screen{screenCount(p) !== 1 ? 's' : ''} ·{' '}
              {new Date(p.updated_at).toLocaleDateString()} {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button onClick={() => onLoad(p)}
            style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSecondary, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            Load
          </button>
          <button onClick={() => onDelete(p)} title="Delete"
            style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: '#f87171', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>{text}</div>
}
function SectionLabel({ text }: { text: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 6 }}>{text}</div>
}
function Label({ t, children }: { t: ReturnType<typeof useUITheme>; children: React.ReactNode }) {
  return <label style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, display: 'block', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{children}</label>
}
function Divider({ t }: { t: ReturnType<typeof useUITheme> }) {
  return <div style={{ height: 1, background: t.border }} />
}
function Msg({ kind, text }: { kind: 'ok' | 'err'; text: string }) {
  const isErr = kind === 'err'
  return (
    <div style={{ padding: '9px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
      background: isErr ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
      color: isErr ? '#ef4444' : '#10b981' }}>
      {text}
    </div>
  )
}
const inputStyle = (t: ReturnType<typeof useUITheme>): React.CSSProperties => ({
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${t.border}`, background: t.bgApp,
  color: t.textPrimary, fontSize: 13, outline: 'none',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
})
const secondaryBtn = (t: ReturnType<typeof useUITheme>, disabled: boolean): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, border: `1px solid ${t.border}`,
  background: 'transparent', color: t.textSecondary, fontSize: 13,
  cursor: 'pointer', whiteSpace: 'nowrap', opacity: disabled ? 0.6 : 1,
  fontFamily: 'Inter, sans-serif',
})
