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
  | 'video'
  | 'map'
  | 'chart'
  | 'stepper'
  | 'stat'
  | 'skeleton'

export type AnimationPreset =
  | 'pulse' | 'bounce' | 'shake' | 'fade-in' | 'slide-up'
  | 'slide-left' | 'spin' | 'float' | 'pop' | 'wiggle' | 'glow'

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
  tabs?: string           // tabbar: comma-separated tab names
  activeTab?: number      // tabbar: active tab index
  // Custom element
  svg?: string            // raw SVG markup
  description?: string    // prompt used to generate it
  // Chart
  chartData?: string      // comma-separated values e.g. "40,65,45,80"
  // Stepper
  steps?: string          // comma-separated step labels
  currentStep?: number    // active step (0-indexed)
  // Stat card
  statValue?: string      // e.g. "$12,400"
  statLabel?: string      // e.g. "Total Revenue"
  statChange?: string     // e.g. "+12%"
  statUp?: boolean        // true = green ↑, false = red ↓
  // Skeleton
  skeletonRows?: number   // number of content rows
  // Animation
  animation?: AnimationPreset
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
