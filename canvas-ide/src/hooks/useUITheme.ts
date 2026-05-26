import { useStore } from '../store/useStore'
import { DARK, LIGHT } from '../themes'

export function useUITheme() {
  const uiTheme = useStore((s) => s.uiTheme)
  return uiTheme === 'light' ? LIGHT : DARK
}
