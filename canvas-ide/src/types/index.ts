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
  | 'icon'
  | 'dropdown'
  | 'video'
  | 'map'
  | 'chart'
  | 'stepper'
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
  // Existing scalar props
  value?: number          // slider (0–100), progress (0–100), rating (1–5), stepper
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
  // Typography (new)
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  // Icon element (new)
  iconName?: string
  // Dropdown element (new)
  dropdownItems?: string  // comma-separated options
  selectedItem?: string
  // Video element (new)
  videoUrl?: string
  // Chart element (new)
  chartType?: 'bar' | 'line' | 'pie'
  chartData?: string      // comma-separated numbers
  chartLabels?: string    // comma-separated labels
  // Stepper element (new)
  stepperStep?: number
}

export interface AppVariable {
  id: string
  name: string
  defaultValue: string
  type: 'text' | 'number' | 'boolean'
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
