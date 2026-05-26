import type { DeviceType } from '../types'

export const DEVICE_SIZES: Record<DeviceType, { width: number; height: number; label: string; scale: number }> = {
  phone: { width: 375, height: 720, label: 'iPhone', scale: 0.9 },
  tablet: { width: 768, height: 960, label: 'iPad', scale: 0.75 },
  desktop: { width: 1024, height: 680, label: 'Desktop', scale: 0.6 },
}
