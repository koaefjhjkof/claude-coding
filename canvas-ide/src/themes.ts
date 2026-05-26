export interface UITheme {
  bgApp: string
  bgToolbar: string
  bgSidebar: string
  bgPanel: string
  bgModal: string
  bgInput: string
  bgPiece: string
  bgPieceBorder: string
  bgSelected: string
  bgSelectedBorder: string
  textPrimary: string
  textSecondary: string
  textDim: string
  textDisabled: string
  border: string
  borderMed: string
  borderStrong: string
  accentText: string
  sep: string
  dotGrid: string
  deviceBorder: string
  deviceShadow: string
  deviceLabel: string
  canvasEmpty: string
}

export const DARK: UITheme = {
  bgApp:             '#0d0d1a',
  bgToolbar:         '#0a0a18',
  bgSidebar:         '#0d0d1a',
  bgPanel:           '#0d0d1a',
  bgModal:           '#1e1e32',
  bgInput:           'rgba(255,255,255,0.05)',
  bgPiece:           'rgba(255,255,255,0.04)',
  bgPieceBorder:     'rgba(255,255,255,0.06)',
  bgSelected:        'rgba(99,102,241,0.15)',
  bgSelectedBorder:  'rgba(99,102,241,0.3)',
  textPrimary:       '#e2e0ff',
  textSecondary:     '#7c7ca8',
  textDim:           '#4b4b6a',
  textDisabled:      '#2a2a40',
  border:            'rgba(255,255,255,0.06)',
  borderMed:         'rgba(255,255,255,0.08)',
  borderStrong:      'rgba(255,255,255,0.1)',
  accentText:        '#a5b4fc',
  sep:               'rgba(255,255,255,0.07)',
  dotGrid:           'rgba(99,102,241,0.12)',
  deviceBorder:      'rgba(255,255,255,0.08)',
  deviceShadow:      '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
  deviceLabel:       '#4b4b6a',
  canvasEmpty:       '#c4bfba',
}

export const LIGHT: UITheme = {
  bgApp:             '#f0eff8',
  bgToolbar:         '#ffffff',
  bgSidebar:         '#fafafa',
  bgPanel:           '#ffffff',
  bgModal:           '#ffffff',
  bgInput:           'rgba(0,0,0,0.04)',
  bgPiece:           'rgba(99,102,241,0.03)',
  bgPieceBorder:     'rgba(99,102,241,0.1)',
  bgSelected:        'rgba(99,102,241,0.08)',
  bgSelectedBorder:  'rgba(99,102,241,0.25)',
  textPrimary:       '#1a1a2e',
  textSecondary:     '#5a5a80',
  textDim:           '#9ca3af',
  textDisabled:      '#d1d5db',
  border:            'rgba(0,0,0,0.07)',
  borderMed:         'rgba(0,0,0,0.10)',
  borderStrong:      'rgba(0,0,0,0.15)',
  accentText:        '#4f46e5',
  sep:               'rgba(0,0,0,0.07)',
  dotGrid:           'rgba(99,102,241,0.07)',
  deviceBorder:      'rgba(0,0,0,0.15)',
  deviceShadow:      '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
  deviceLabel:       '#9ca3af',
  canvasEmpty:       '#a8a29e',
}
