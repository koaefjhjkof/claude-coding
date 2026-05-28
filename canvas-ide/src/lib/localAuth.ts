// ─── Local (no-setup) auth + project storage ─────────────────────────────────
// Everything lives in localStorage so the IDE works with zero configuration.
// Supabase is an optional upgrade for cloud sync — not required for basic use.

export interface LocalUser {
  id: string
  name: string
  createdAt: string
}

export interface LocalProject {
  id: string
  name: string
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

const USER_KEY     = 'canvas-ide-local-user'
const PROJECTS_KEY = 'canvas-ide-local-projects'

// ── User ──────────────────────────────────────────────────────────────────────

export function getLocalUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as LocalUser) : null
  } catch { return null }
}

export function createLocalUser(name: string): LocalUser {
  const user: LocalUser = {
    id: 'local-' + Math.random().toString(36).slice(2, 10),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function updateLocalUserName(name: string): void {
  const user = getLocalUser()
  if (!user) return
  user.name = name.trim()
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearLocalUser(): void {
  localStorage.removeItem(USER_KEY)
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function getLocalProjects(): LocalProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    return raw ? (JSON.parse(raw) as LocalProject[]) : []
  } catch { return [] }
}

export function saveLocalProject(
  name: string,
  data: Record<string, unknown>,
): LocalProject {
  const projects = getLocalProjects()
  const now = new Date().toISOString()
  const existing = projects.find((p) => p.name === name)
  if (existing) {
    existing.data = data
    existing.updatedAt = now
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    return existing
  }
  const project: LocalProject = {
    id: 'proj-' + Math.random().toString(36).slice(2, 10),
    name,
    data,
    createdAt: now,
    updatedAt: now,
  }
  projects.unshift(project)
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
  return project
}

export function deleteLocalProject(id: string): void {
  const projects = getLocalProjects().filter((p) => p.id !== id)
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}
