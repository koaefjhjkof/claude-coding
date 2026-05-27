export type ElementType =
  | 'button'
  | 'text'
  | 'heading'
  | 'card'
  | 'image'
  | 'input'
  | 'toggle'
  | 'badge'
  | 'slider'
  | 'progress'
  | 'checkbox'
  | 'avatar'
  | 'alert'
  | 'divider'
  | 'rating'
  | 'list'
  | 'tabbar'
  | 'searchbar'
  | 'custom'

export interface Flow {
  id: string
  trigger: string
  description: string
  action: string
}

export interface ElementProps {
  label?: string
  text?: string
  placeholder?: string
  src?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  bgColor?: string
  textColor?: string
  borderRadius?: number
  fontSize?: number
  fontWeight?: string
  padding?: number
  shadow?: boolean
  checked?: boolean
  badgeColor?: string
  // New props
  value?: number          // slider (0–100), progress (0–100), rating (1–5)
  min?: number
  max?: number
  initials?: string       // avatar
  alertVariant?: 'info' | 'success' | 'warning' | 'error'
  items?: string          // list: newline-separated
  opacity?: number        // 0–1
  textAlign?: 'left' | 'center' | 'right'
  tabs?: string           // tabbar: comma-separated tab names
  activeTab?: number      // tabbar: active tab index
  // Custom element
  svg?: string            // raw SVG markup
  description?: string    // prompt used to generate it
}

export interface CanvasElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  props: ElementProps
  flows: Flow[]
  locked?: boolean   // cannot be moved/resized in design mode
  hidden?: boolean   // invisible in design mode (shown dimmed)
}

export interface Screen {
  id: string
  name: string
  elements: CanvasElement[]
  background?: string  // canvas fill colour, default '#faf8f5'
}

export type DeviceType = 'phone' | 'tablet' | 'desktop'

export type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'

export interface AppStyles {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  borderRadius: 'sharp' | 'medium' | 'soft'
}

export interface PieceDef {
  type: ElementType
  label: string
  icon: string
  description: string
  defaultWidth: number
  defaultHeight: number
  defaultProps: ElementProps
}
