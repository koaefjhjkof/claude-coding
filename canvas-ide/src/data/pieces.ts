import type { PieceDef } from '../types'

export const PIECES: PieceDef[] = [
  // ── Buttons & Controls ──────────────────────────────────────────────────────
  {
    type: 'button',
    label: 'Button',
    icon: '⬛',
    description: 'Tap to trigger an action',
    defaultWidth: 160,
    defaultHeight: 48,
    defaultProps: { label: 'Tap me', variant: 'primary' },
  },
  {
    type: 'toggle',
    label: 'Toggle',
    icon: '◉',
    description: 'On/off switch',
    defaultWidth: 160,
    defaultHeight: 40,
    defaultProps: { label: 'Enable', checked: false },
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: '☑',
    description: 'Check to select',
    defaultWidth: 180,
    defaultHeight: 36,
    defaultProps: { label: 'Check me', checked: false },
  },
  {
    type: 'slider',
    label: 'Slider',
    icon: '⇌',
    description: 'Drag to set a value',
    defaultWidth: 240,
    defaultHeight: 56,
    defaultProps: { label: 'Volume', value: 60, min: 0, max: 100 },
  },

  // ── Text & Labels ──────────────────────────────────────────────────────────
  {
    type: 'heading',
    label: 'Heading',
    icon: 'H',
    description: 'Big, bold title text',
    defaultWidth: 240,
    defaultHeight: 48,
    defaultProps: { text: 'Your Heading', fontSize: 28, fontWeight: '600' },
  },
  {
    type: 'text',
    label: 'Text',
    icon: 'T',
    description: 'Body copy or description',
    defaultWidth: 240,
    defaultHeight: 60,
    defaultProps: { text: 'Your text goes here. Tap to edit.', fontSize: 15 },
  },
  {
    type: 'badge',
    label: 'Badge',
    icon: '●',
    description: 'Status tag or label',
    defaultWidth: 80,
    defaultHeight: 32,
    defaultProps: { label: 'New', badgeColor: '#6366f1' },
  },
  {
    type: 'rating',
    label: 'Rating',
    icon: '★',
    description: 'Star rating display',
    defaultWidth: 160,
    defaultHeight: 36,
    defaultProps: { value: 4, badgeColor: '#f59e0b' },
  },

  // ── Media ──────────────────────────────────────────────────────────────────
  {
    type: 'image',
    label: 'Image',
    icon: '🖼',
    description: 'Photo or illustration',
    defaultWidth: 240,
    defaultHeight: 180,
    defaultProps: { src: '', borderRadius: 12 },
  },
  {
    type: 'avatar',
    label: 'Avatar',
    icon: '◯',
    description: 'Profile picture or initials',
    defaultWidth: 56,
    defaultHeight: 56,
    defaultProps: { initials: 'AB', bgColor: '#6366f1' },
  },

  // ── Input ─────────────────────────────────────────────────────────────────
  {
    type: 'input',
    label: 'Input',
    icon: '▱',
    description: 'Text field for user input',
    defaultWidth: 240,
    defaultHeight: 48,
    defaultProps: { placeholder: 'Type here…', borderRadius: 10 },
  },
  {
    type: 'searchbar',
    label: 'Search Bar',
    icon: '🔍',
    description: 'Search field with icon',
    defaultWidth: 240,
    defaultHeight: 48,
    defaultProps: { placeholder: 'Search…', borderRadius: 24 },
  },

  // ── Feedback & Status ──────────────────────────────────────────────────────
  {
    type: 'alert',
    label: 'Alert',
    icon: '⚠',
    description: 'Info, warning or error strip',
    defaultWidth: 280,
    defaultHeight: 52,
    defaultProps: { alertVariant: 'info', text: 'This is an alert message.' },
  },
  {
    type: 'progress',
    label: 'Progress',
    icon: '▬',
    description: 'Loading or completion bar',
    defaultWidth: 240,
    defaultHeight: 48,
    defaultProps: { label: 'Loading…', value: 65 },
  },

  // ── Layout & Navigation ────────────────────────────────────────────────────
  {
    type: 'card',
    label: 'Card',
    icon: '▭',
    description: 'A container with shadow',
    defaultWidth: 280,
    defaultHeight: 160,
    defaultProps: { bgColor: '#ffffff', shadow: true, borderRadius: 16, padding: 20 },
  },
  {
    type: 'list',
    label: 'List',
    icon: '≡',
    description: 'Bullet list of items',
    defaultWidth: 240,
    defaultHeight: 100,
    defaultProps: { items: 'First item\nSecond item\nThird item', fontSize: 14 },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '—',
    description: 'Horizontal separator line',
    defaultWidth: 280,
    defaultHeight: 20,
    defaultProps: { bgColor: '#e5e7eb' },
  },
  {
    type: 'tabbar',
    label: 'Tab Bar',
    icon: '⊟',
    description: 'Bottom navigation tabs',
    defaultWidth: 375,
    defaultHeight: 64,
    defaultProps: { tabs: 'Home,Explore,Profile', activeTab: 0 },
  },
  {
    type: 'stepper',
    label: 'Stepper',
    icon: '⋯',
    description: 'Multi-step progress indicator',
    defaultWidth: 320,
    defaultHeight: 72,
    defaultProps: { steps: 'Info,Payment,Review', currentStep: 1 },
  },

  // ── Data & Media ──────────────────────────────────────────────────────────
  {
    type: 'video',
    label: 'Video',
    icon: '▶',
    description: 'Video player placeholder',
    defaultWidth: 280,
    defaultHeight: 160,
    defaultProps: { borderRadius: 12 },
  },
  {
    type: 'map',
    label: 'Map',
    icon: '📍',
    description: 'Map with location pin',
    defaultWidth: 280,
    defaultHeight: 180,
    defaultProps: { text: 'Current Location', borderRadius: 12 },
  },
  {
    type: 'chart',
    label: 'Bar Chart',
    icon: '📊',
    description: 'Vertical bar chart',
    defaultWidth: 280,
    defaultHeight: 160,
    defaultProps: { label: 'Weekly Sales', chartData: '40,65,45,80,55,70,60' },
  },
  {
    type: 'stat',
    label: 'Stat Card',
    icon: '◈',
    description: 'KPI metric with trend',
    defaultWidth: 160,
    defaultHeight: 100,
    defaultProps: { statLabel: 'Total Revenue', statValue: '$12,400', statChange: '+12%', statUp: true, bgColor: '#ffffff', borderRadius: 16 },
  },

  // ── Feedback & Status (extras) ────────────────────────────────────────────
  {
    type: 'skeleton',
    label: 'Skeleton',
    icon: '▒',
    description: 'Loading placeholder',
    defaultWidth: 280,
    defaultHeight: 120,
    defaultProps: { skeletonRows: 3 },
  },
]

export const PIECE_CATEGORIES = [
  { label: 'Buttons & Controls', types: ['button', 'toggle', 'checkbox', 'slider'] },
  { label: 'Text & Labels',      types: ['heading', 'text', 'badge', 'rating'] },
  { label: 'Media',              types: ['image', 'avatar', 'video', 'map'] },
  { label: 'Input',              types: ['input', 'searchbar'] },
  { label: 'Data',               types: ['chart', 'stat'] },
  { label: 'Feedback',           types: ['alert', 'progress', 'skeleton'] },
  { label: 'Layout & Nav',       types: ['card', 'list', 'divider', 'tabbar', 'stepper'] },
]

export interface AnimationDef {
  id: string
  label: string
  icon: string
  description: string
  loop: boolean
}

export const ANIMATIONS: AnimationDef[] = [
  { id: 'pulse',      label: 'Pulse',      icon: '◎', description: 'Rhythmic scale pulse',    loop: true  },
  { id: 'bounce',     label: 'Bounce',     icon: '↕', description: 'Bounces up and down',     loop: true  },
  { id: 'shake',      label: 'Shake',      icon: '↔', description: 'Horizontal shake',        loop: true  },
  { id: 'float',      label: 'Float',      icon: '◈', description: 'Gentle floating rise',    loop: true  },
  { id: 'spin',       label: 'Spin',       icon: '↻', description: 'Continuous rotation',     loop: true  },
  { id: 'wiggle',     label: 'Wiggle',     icon: '〰', description: 'Rotation wiggle',         loop: true  },
  { id: 'glow',       label: 'Glow',       icon: '✧', description: 'Pulsing glow shadow',     loop: true  },
  { id: 'fade-in',    label: 'Fade In',    icon: '◌', description: 'Fade up from transparent', loop: false },
  { id: 'slide-up',   label: 'Slide Up',   icon: '⬆', description: 'Slide in from bottom',   loop: false },
  { id: 'slide-left', label: 'Slide Left', icon: '⬅', description: 'Slide in from right',    loop: false },
  { id: 'pop',        label: 'Pop',        icon: '✦', description: 'Scale pop entrance',      loop: false },
]
