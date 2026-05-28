import type { DeviceType } from '../types'

export interface DeviceSpec {
  width: number
  height: number
  label: string
  scale: number
  category: DeviceType
}

// Legacy defaults (keep for backward compatibility — keyed by DeviceType)
export const DEVICE_SIZES: Record<DeviceType, DeviceSpec> = {
  phone:   { width: 375, height: 720,  label: 'Phone',   scale: 0.90, category: 'phone' },
  tablet:  { width: 768, height: 960,  label: 'Tablet',  scale: 0.75, category: 'tablet' },
  desktop: { width: 1024, height: 680, label: 'Desktop', scale: 0.60, category: 'desktop' },
}

// All device presets — indexed by preset key
export const DEVICE_PRESETS: Record<string, DeviceSpec> = {
  // Generic defaults (same as DEVICE_SIZES, always present)
  phone:   DEVICE_SIZES.phone,
  tablet:  DEVICE_SIZES.tablet,
  desktop: DEVICE_SIZES.desktop,

  // ── iPhone ─────────────────────────────────────────────
  'iphone-se':         { width: 375, height: 667,  label: 'iPhone SE',          scale: 0.88, category: 'phone' },
  'iphone-13-mini':    { width: 375, height: 812,  label: 'iPhone 13 mini',     scale: 0.86, category: 'phone' },
  'iphone-14':         { width: 390, height: 844,  label: 'iPhone 14',          scale: 0.84, category: 'phone' },
  'iphone-14-pro':     { width: 393, height: 852,  label: 'iPhone 14 Pro',      scale: 0.84, category: 'phone' },
  'iphone-14-plus':    { width: 430, height: 932,  label: 'iPhone 14 Plus',     scale: 0.78, category: 'phone' },
  'iphone-15-pro-max': { width: 430, height: 932,  label: 'iPhone 15 Pro Max',  scale: 0.78, category: 'phone' },

  // ── Android ────────────────────────────────────────────
  'galaxy-s23':        { width: 360, height: 780,  label: 'Galaxy S23',         scale: 0.88, category: 'phone' },
  'galaxy-s23-ultra':  { width: 384, height: 824,  label: 'Galaxy S23 Ultra',   scale: 0.83, category: 'phone' },
  'pixel-7':           { width: 412, height: 892,  label: 'Pixel 7',            scale: 0.80, category: 'phone' },
  'pixel-7-pro':       { width: 412, height: 892,  label: 'Pixel 7 Pro',        scale: 0.80, category: 'phone' },
  'oneplus-11':        { width: 412, height: 919,  label: 'OnePlus 11',         scale: 0.80, category: 'phone' },

  // ── iPad ───────────────────────────────────────────────
  'ipad-mini':         { width: 744,  height: 1133, label: 'iPad mini 6',       scale: 0.67, category: 'tablet' },
  'ipad-10':           { width: 820,  height: 1180, label: 'iPad (10th gen)',   scale: 0.63, category: 'tablet' },
  'ipad-air':          { width: 820,  height: 1180, label: 'iPad Air',          scale: 0.63, category: 'tablet' },
  'ipad-pro-11':       { width: 834,  height: 1194, label: 'iPad Pro 11"',      scale: 0.62, category: 'tablet' },
  'ipad-pro-13':       { width: 1032, height: 1376, label: 'iPad Pro 13"',      scale: 0.51, category: 'tablet' },

  // ── Android Tablet ─────────────────────────────────────
  'galaxy-tab-s8':     { width: 800,  height: 1280, label: 'Galaxy Tab S8',     scale: 0.61, category: 'tablet' },
  'galaxy-tab-s9':     { width: 834,  height: 1194, label: 'Galaxy Tab S9+',    scale: 0.62, category: 'tablet' },
  'pixel-tablet':      { width: 834,  height: 1194, label: 'Pixel Tablet',      scale: 0.62, category: 'tablet' },

  // ── MacBook / Laptop ───────────────────────────────────
  'macbook-13':        { width: 1280, height: 800,  label: 'MacBook 13"',       scale: 0.49, category: 'desktop' },
  'macbook-14':        { width: 1512, height: 982,  label: 'MacBook Pro 14"',   scale: 0.43, category: 'desktop' },
  'macbook-16':        { width: 1728, height: 1117, label: 'MacBook Pro 16"',   scale: 0.38, category: 'desktop' },

  // ── Desktop monitors ───────────────────────────────────
  'desktop-1080':      { width: 1920, height: 1080, label: 'Full HD (1080p)',   scale: 0.35, category: 'desktop' },
  'desktop-1440':      { width: 2560, height: 1440, label: 'QHD (1440p)',       scale: 0.26, category: 'desktop' },
  'desktop-4k':        { width: 3840, height: 2160, label: '4K UHD',            scale: 0.18, category: 'desktop' },
}

// Groups for the device picker UI
export interface DeviceGroup {
  label: string
  category: DeviceType
  presets: string[]
}

export const DEVICE_PRESET_GROUPS: DeviceGroup[] = [
  { label: '📱 iPhone',          category: 'phone',   presets: ['iphone-se', 'iphone-13-mini', 'iphone-14', 'iphone-14-pro', 'iphone-14-plus', 'iphone-15-pro-max'] },
  { label: '🤖 Android',         category: 'phone',   presets: ['galaxy-s23', 'galaxy-s23-ultra', 'pixel-7', 'pixel-7-pro', 'oneplus-11'] },
  { label: '◻ iPad',             category: 'tablet',  presets: ['ipad-mini', 'ipad-10', 'ipad-air', 'ipad-pro-11', 'ipad-pro-13'] },
  { label: '◻ Android Tablet',   category: 'tablet',  presets: ['galaxy-tab-s8', 'galaxy-tab-s9', 'pixel-tablet'] },
  { label: '💻 Mac / Laptop',    category: 'desktop', presets: ['macbook-13', 'macbook-14', 'macbook-16'] },
  { label: '🖥 Desktop',         category: 'desktop', presets: ['desktop-1080', 'desktop-1440', 'desktop-4k'] },
]

/** Get device spec for any preset key — falls back to generic 'phone' if unknown */
export function getDeviceSpec(preset: string): DeviceSpec {
  return DEVICE_PRESETS[preset] ?? DEVICE_SIZES.phone
}
