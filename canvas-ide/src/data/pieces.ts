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

  // ── New: Icons & Media ────────────────────────────────────────────────────
  {
    type: 'icon',
    label: 'Icon',
    icon: '◆',
    description: 'Scalable vector icon',
    defaultWidth: 40,
    defaultHeight: 40,
    defaultProps: { iconName: 'star', bgColor: '#6366f1' },
  },
  {
    type: 'video',
    label: 'Video',
    icon: '▶',
    description: 'Video player placeholder',
    defaultWidth: 280,
    defaultHeight: 160,
    defaultProps: { label: 'Video title', borderRadius: 12 },
  },
  {
    type: 'map',
    label: 'Map',
    icon: '📍',
    description: 'Interactive map view',
    defaultWidth: 280,
    defaultHeight: 200,
    defaultProps: { mapLocation: 'New York', mapZoom: 13, borderRadius: 12 },
  },

  // ── New: Input variants ───────────────────────────────────────────────────
  {
    type: 'dropdown',
    label: 'Dropdown',
    icon: '▽',
    description: 'Select from a list',
    defaultWidth: 220,
    defaultHeight: 48,
    defaultProps: { placeholder: 'Select an option…', dropdownItems: 'Option 1,Option 2,Option 3', borderRadius: 10 },
  },
  {
    type: 'stepper',
    label: 'Stepper',
    icon: '⊕',
    description: 'Number input with +/− buttons',
    defaultWidth: 200,
    defaultHeight: 48,
    defaultProps: { label: 'Quantity', value: 1, min: 0, max: 99, stepperStep: 1 },
  },

  // ── New: Data ─────────────────────────────────────────────────────────────
  {
    type: 'chart',
    label: 'Chart',
    icon: '📊',
    description: 'Bar, line or pie chart',
    defaultWidth: 280,
    defaultHeight: 200,
    defaultProps: {
      chartType: 'bar',
      chartData: '40,65,55,80,35',
      chartLabels: 'Mon,Tue,Wed,Thu,Fri',
      label: 'Weekly Stats',
    },
  },

  // ── Drawing ───────────────────────────────────────────────────────────────
  {
    type: 'draw',
    label: 'Drawing',
    icon: '✏',
    description: 'Freehand pen stroke',
    defaultWidth: 200,
    defaultHeight: 100,
    defaultProps: { strokeColor: '#6366f1', strokeWidth: 3, pathData: 'M10,50 Q60,10 100,50 Q140,90 190,50' },
  },
]

export const PIECE_CATEGORIES = [
  { label: 'Buttons & Controls', types: ['button', 'toggle', 'checkbox', 'slider', 'stepper'] },
  { label: 'Text & Labels',      types: ['heading', 'text', 'badge', 'rating'] },
  { label: 'Media',              types: ['image', 'avatar', 'icon', 'video', 'map'] },
  { label: 'Input',              types: ['input', 'searchbar', 'dropdown'] },
  { label: 'Data',               types: ['chart', 'progress', 'list'] },
  { label: 'Feedback',           types: ['alert'] },
  { label: 'Layout & Nav',       types: ['card', 'divider', 'tabbar'] },
  { label: 'Drawing',            types: ['draw'] },
]
