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
  | 'draw'

export interface Flow {
  id: string
  trigger: string
  description: string
  action: string
}

// ── App database (the backend for the app being built) ───────────────────────
export type DbFieldType = 'text' | 'number' | 'boolean' | 'date' | 'email' | 'url'

export interface DataField {
  id: string
  name: string       // DB column name (snake_case, used in Supabase)
  label: string      // human-readable display label
  type: DbFieldType
  required?: boolean
}

export interface DataTable {
  id: string
  name: string       // DB table name (snake_case, used in Supabase)
  label: string      // human-readable display label
  fields: DataField[]
}

export interface AppDatabase {
  supabaseUrl: string
  supabaseAnonKey: string
  tables: DataTable[]
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
  value?: number
  min?: number
  max?: number
  initials?: string
  alertVariant?: 'info' | 'success' | 'warning' | 'error'
  items?: string
  opacity?: number
  tabs?: string
  activeTab?: number
  // Custom element
  svg?: string
  description?: string
  // Typography
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  // Icon element
  iconName?: string
  // Dropdown element
  dropdownItems?: string
  selectedItem?: string
  // Video element
  videoUrl?: string
  // Map element
  mapLocation?: string
  mapZoom?: number
  // Chart element
  chartType?: 'bar' | 'line' | 'pie'
  chartData?: string
  chartLabels?: string
  // Stepper element
  stepperStep?: number
  // Data binding
  boundTable?: string          // table name for list elements
  boundDisplayField?: string   // field name used as the primary row label
  boundSubField?: string       // field name used as secondary / subtitle
  listSelectable?: boolean     // tapping a row stores it as the selected row (for edit/delete)
  inputField?: string          // field name this input is bound to
  formTable?: string           // target table name for form submission
  buttonAction?: 'submit-form' | 'update-row' | 'delete-row'

  // Gradient fill (applies to any element with a bgColor surface)
  gradientFrom?: string
  gradientTo?: string
  gradientAngle?: number  // CSS linear-gradient degrees (0=up, 90=right, 135=diagonal)

  // Draw element
  pathData?: string      // SVG path string relative to element origin
  strokeColor?: string
  strokeWidth?: number
  fillColor?: string
  fillGradient?: { color2: string; angle: number }  // linear gradient fill for shapes
  strokeLinecap?: 'round' | 'square' | 'butt'
  blendMode?: string     // CSS mix-blend-mode (e.g. 'multiply', 'screen', 'overlay')
  glowRadius?: number    // feGaussianBlur stdDeviation for neon/glow effect
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
  locked?: boolean
  hidden?: boolean
}

export interface Screen {
  id: string
  name: string
  elements: CanvasElement[]
  background?: string
  paintCanvas?: string   // base64 PNG of pixel-based paint strokes
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
