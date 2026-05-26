export type AIAction =
  | { type: 'navigate'; screenId: string }
  | { type: 'style'; props: Record<string, unknown> }
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

export async function aiInterpretAction(params: {
  description: string
  elementType: string
  screens: { id: string; name: string }[]
  currentScreenId: string
}): Promise<AIAction | null> {
  const apiKey = localStorage.getItem('canvas-anthropic-key')
  if (!apiKey) return null

  try {
    const res = await fetch('/api/interpret-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, ...params }),
    })
    const data = await res.json()
    return data.action ?? null
  } catch {
    return null
  }
}

export function getApiKey(): string {
  return localStorage.getItem('canvas-anthropic-key') ?? ''
}

export function setApiKey(key: string) {
  if (key.trim()) {
    localStorage.setItem('canvas-anthropic-key', key.trim())
  } else {
    localStorage.removeItem('canvas-anthropic-key')
  }
}
