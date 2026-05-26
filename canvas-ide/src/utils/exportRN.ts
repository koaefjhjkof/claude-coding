import type { Screen, AppStyles, CanvasElement } from '../types'

// ─── Element → React Native JSX ──────────────────────────────────────────────
function elementToRN(el: CanvasElement, appStyles: AppStyles, indent = '    '): string {
  const p = el.props
  const sId = `s_${el.id.replace(/-/g, '_')}`
  const rMap = { sharp: 4, medium: 10, soft: 20 }
  const globalR = rMap[appStyles.borderRadius]
  const br = p.borderRadius ?? globalR

  switch (el.type) {
    case 'button':
      return `${indent}<TouchableOpacity style={styles.${sId}}>\n${indent}  <Text style={styles.${sId}Text}>${p.label ?? 'Button'}</Text>\n${indent}</TouchableOpacity>`
    case 'text':
      return `${indent}<Text style={styles.${sId}}>${p.text ?? ''}</Text>`
    case 'heading':
      return `${indent}<Text style={styles.${sId}}>${p.text ?? 'Heading'}</Text>`
    case 'input':
      return `${indent}<TextInput style={styles.${sId}} placeholder="${p.placeholder ?? ''}" />`
    case 'searchbar':
      return `${indent}<TextInput style={styles.${sId}} placeholder="${p.placeholder ?? 'Search…'}" />`
    case 'card':
      return `${indent}<View style={styles.${sId}} />`
    case 'image':
      return p.src
        ? `${indent}<Image style={styles.${sId}} source={{ uri: '${p.src.startsWith('data:') ? '[base64-image]' : p.src}' }} />`
        : `${indent}{/* Image placeholder */}\n${indent}<View style={styles.${sId}} />`
    case 'avatar':
      return p.src
        ? `${indent}<Image style={styles.${sId}} source={{ uri: '${p.src}' }} />`
        : `${indent}<View style={styles.${sId}}>\n${indent}  <Text style={{ color: '#fff', fontWeight: '700' }}>${p.initials ?? '?'}</Text>\n${indent}</View>`
    case 'badge':
      return `${indent}<View style={styles.${sId}}>\n${indent}  <Text style={styles.${sId}Text}>${p.label ?? 'Badge'}</Text>\n${indent}</View>`
    case 'toggle':
      return `${indent}<View style={styles.${sId}}>\n${indent}  {/* Toggle — import Switch from react-native */}\n${indent}  <Switch value={${p.checked ?? false}} />\n${indent}  <Text style={{ marginLeft: 8 }}>${p.label ?? ''}</Text>\n${indent}</View>`
    case 'checkbox':
      return `${indent}<Pressable style={styles.${sId}}>\n${indent}  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '${p.bgColor ?? appStyles.primaryColor}', backgroundColor: '${p.checked ? (p.bgColor ?? appStyles.primaryColor) : '#fff'}' }} />\n${indent}  <Text style={{ marginLeft: 10 }}>${p.label ?? 'Checkbox'}</Text>\n${indent}</Pressable>`
    case 'alert':
      return `${indent}<View style={styles.${sId}}>\n${indent}  <Text>${p.text ?? 'Alert'}</Text>\n${indent}</View>`
    case 'divider':
      return `${indent}<View style={styles.${sId}} />`
    case 'progress':
      return `${indent}<View style={styles.${sId}}>\n${indent}  {/* Progress bar — value: ${p.value ?? 0}% */}\n${indent}  <View style={{ height: '100%', width: '${p.value ?? 0}%', backgroundColor: '${p.bgColor ?? appStyles.primaryColor}' }} />\n${indent}</View>`
    case 'slider':
      return `${indent}{/* Slider — install @react-native-community/slider */}\n${indent}<Slider style={styles.${sId}} value={${p.value ?? 50}} minimumValue={${p.min ?? 0}} maximumValue={${p.max ?? 100}} />`
    case 'rating':
      return `${indent}<View style={styles.${sId}}>\n${indent}  <Text>{'★'.repeat(${p.value ?? 4})}{'☆'.repeat(${5 - (p.value ?? 4)})}</Text>\n${indent}</View>`
    case 'list': {
      const items = (p.items ?? 'Item 1\nItem 2\nItem 3').split('\n').filter(Boolean)
      return `${indent}<View style={styles.${sId}}>\n${items.map((it) => `${indent}  <Text>• ${it}</Text>`).join('\n')}\n${indent}</View>`
    }
    case 'tabbar': {
      const tabs = (p.tabs ?? 'Home,Explore,Profile').split(',')
      return `${indent}<View style={styles.${sId}}>\n${tabs.map((tab) => `${indent}  <TouchableOpacity style={{ flex: 1, alignItems: 'center' }}>\n${indent}    <Text>${tab.trim()}</Text>\n${indent}  </TouchableOpacity>`).join('\n')}\n${indent}</View>`
    }
    case 'icon':
      return `${indent}<View style={styles.${sId}}>\n${indent}  {/* Icon: ${p.iconName ?? 'star'} — use @expo/vector-icons or react-native-vector-icons */}\n${indent}</View>`
    case 'dropdown':
      return `${indent}{/* Dropdown — use @react-native-picker/picker */}\n${indent}<Pressable style={styles.${sId}}>\n${indent}  <Text>${p.placeholder ?? 'Select…'}</Text>\n${indent}</Pressable>`
    case 'video':
      return `${indent}{/* Video — use expo-av or react-native-video */}\n${indent}<View style={styles.${sId}}>\n${indent}  <Text style={{ color: '#fff' }}>${p.label ?? 'Video'}</Text>\n${indent}</View>`
    case 'map':
      return `${indent}{/* Map — use react-native-maps */}\n${indent}<View style={styles.${sId}} />`
    case 'chart':
      return `${indent}{/* Chart (${p.chartType ?? 'bar'}) — use react-native-chart-kit */}\n${indent}<View style={styles.${sId}} />`
    case 'stepper':
      return `${indent}<View style={styles.${sId}}>\n${indent}  {p.label && <Text>${p.label ?? ''}</Text>}\n${indent}  <View style={{ flexDirection: 'row', alignItems: 'center' }}>\n${indent}    <TouchableOpacity><Text>−</Text></TouchableOpacity>\n${indent}    <Text style={{ marginHorizontal: 16 }}>{value}</Text>\n${indent}    <TouchableOpacity><Text>+</Text></TouchableOpacity>\n${indent}  </View>\n${indent}</View>`
    case 'custom':
      return `${indent}{/* Custom element — add custom rendering here */}\n${indent}<View style={styles.${sId}} />`
    default:
      return `${indent}<View style={styles.${sId}} />`
  }
}

// ─── Element → StyleSheet entry ───────────────────────────────────────────────
function elementToStyle(el: CanvasElement, appStyles: AppStyles): string {
  const p = el.props
  const sId = `s_${el.id.replace(/-/g, '_')}`
  const rMap = { sharp: 4, medium: 10, soft: 20 }
  const globalR = rMap[appStyles.borderRadius]
  const lines: string[] = [
    `    position: 'absolute',`,
    `    left: ${Math.round(el.x)},`,
    `    top: ${Math.round(el.y)},`,
    `    width: ${Math.round(el.width)},`,
    `    height: ${Math.round(el.height)},`,
  ]

  if (p.bgColor) lines.push(`    backgroundColor: '${p.bgColor}',`)
  if (p.textColor) lines.push(`    color: '${p.textColor}',`)
  if (p.fontSize) lines.push(`    fontSize: ${p.fontSize},`)
  if (p.fontWeight) lines.push(`    fontWeight: '${p.fontWeight}',`)
  if (p.fontFamily) lines.push(`    fontFamily: '${p.fontFamily}',`)
  if (p.textAlign) lines.push(`    textAlign: '${p.textAlign}',`)
  if (p.opacity !== undefined && p.opacity !== 1) lines.push(`    opacity: ${p.opacity},`)
  if (p.padding) lines.push(`    padding: ${p.padding},`)
  if (p.shadow) lines.push(`    shadowColor: '#000',\n    shadowOffset: { width: 0, height: 2 },\n    shadowOpacity: 0.10,\n    shadowRadius: 8,\n    elevation: 4,`)

  const hasBorderRadius = ['button', 'card', 'image', 'input', 'alert', 'searchbar', 'avatar', 'badge', 'dropdown', 'video', 'map']
  if (hasBorderRadius.includes(el.type)) {
    lines.push(`    borderRadius: ${p.borderRadius ?? globalR},`)
  }

  // Type-specific additions
  if (el.type === 'button') {
    const bg = p.bgColor ?? appStyles.primaryColor
    lines.push(`    backgroundColor: '${bg}',`)
    lines.push(`    alignItems: 'center',\n    justifyContent: 'center',`)
  }
  if (el.type === 'card') {
    lines.push(`    backgroundColor: '${p.bgColor ?? '#ffffff'}',`)
    lines.push(`    overflow: 'hidden',`)
  }
  if (el.type === 'image') lines.push(`    overflow: 'hidden',`)
  if (el.type === 'avatar') {
    lines.push(`    borderRadius: ${Math.round(el.width) / 2},`)
    lines.push(`    backgroundColor: '${p.bgColor ?? appStyles.primaryColor}',`)
    lines.push(`    alignItems: 'center',\n    justifyContent: 'center',`)
  }
  if (el.type === 'divider') lines.push(`    backgroundColor: '${p.bgColor ?? '#e5e7eb'}',\n    height: 1,`)
  if (el.type === 'input' || el.type === 'searchbar' || el.type === 'dropdown') {
    lines.push(`    backgroundColor: '#f9fafb',\n    borderWidth: 1.5,\n    borderColor: '#e5e7eb',\n    paddingHorizontal: 14,`)
  }
  if (el.type === 'tabbar') {
    lines.push(`    flexDirection: 'row',\n    borderTopWidth: 1,\n    borderTopColor: '#e5e7eb',\n    backgroundColor: '#fff',`)
  }
  if (el.type === 'badge') {
    lines.push(`    backgroundColor: '${(p.badgeColor ?? appStyles.primaryColor)}22',\n    alignItems: 'center',\n    justifyContent: 'center',`)
  }
  if (el.type === 'checkbox' || el.type === 'toggle') {
    lines.push(`    flexDirection: 'row',\n    alignItems: 'center',`)
  }
  if (el.type === 'video') {
    lines.push(`    backgroundColor: '#111827',\n    alignItems: 'center',\n    justifyContent: 'center',`)
  }

  const body = lines.join('\n')

  // Build extra style entries for text child (buttons, badges)
  let extra = ''
  if (el.type === 'button') {
    const tc = p.textColor ?? '#fff'
    extra = `\n  ${sId}Text: {\n    color: '${tc}',\n    fontSize: ${p.fontSize ?? 15},\n    fontWeight: '500',\n  },`
  }
  if (el.type === 'badge') {
    extra = `\n  ${sId}Text: {\n    color: '${p.badgeColor ?? appStyles.primaryColor}',\n    fontSize: 12,\n    fontWeight: '600',\n  },`
  }

  return `  ${sId}: {\n${body}\n  },${extra}`
}

// ─── Screen → full component ──────────────────────────────────────────────────
function screenToComponent(screen: Screen, appStyles: AppStyles): string {
  const fnName = screen.name.replace(/[^a-zA-Z0-9]/g, '') || 'Screen'
  const bg = screen.background ?? '#faf8f5'

  const elements = screen.elements.map((el) => elementToRN(el, appStyles)).join('\n')
  const styleEntries = screen.elements.map((el) => elementToStyle(el, appStyles)).join('\n')

  return `// ─── Screen: ${screen.name} ───────────────────────────────────────────────────
export function ${fnName}Screen({ navigation }: { navigation?: any }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '${bg}' }}>
      <View style={styles_${fnName}.container}>
${elements}
      </View>
    </SafeAreaView>
  )
}

const styles_${fnName} = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '${bg}',
    position: 'relative',
  },
${styleEntries}
})`
}

// ─── Main export function ─────────────────────────────────────────────────────
export function exportReactNative(screens: Screen[], styles: AppStyles): void {
  const screenComponents = screens.map((s) => screenToComponent(s, styles)).join('\n\n\n')
  const firstScreen = screens[0]?.name.replace(/[^a-zA-Z0-9]/g, '') || 'Screen'

  const navCode = screens.length > 1
    ? `// ─── Navigation (requires @react-navigation/native + @react-navigation/stack) ──
// import { NavigationContainer } from '@react-navigation/native'
// import { createStackNavigator } from '@react-navigation/stack'
// const Stack = createStackNavigator()
// export default function App() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator>
${screens.map((s) => {
  const fnName = s.name.replace(/[^a-zA-Z0-9]/g, '') || 'Screen'
  return `//         <Stack.Screen name="${fnName}" component={${fnName}Screen} />`
}).join('\n')}
//       </Stack.Navigator>
//     </NavigationContainer>
//   )
// }`
    : `export default function App() {
  return <${firstScreen}Screen />
}`

  const code = `/**
 * Generated by Canvas IDE
 * React Native App
 *
 * Install dependencies:
 *   npx expo init MyApp --template blank (recommended)
 *   npm install @react-navigation/native @react-navigation/stack
 *   npm install react-native-screens react-native-safe-area-context
 */
import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, Pressable, TextInput, Image,
  ScrollView, FlatList, Switch, StyleSheet, SafeAreaView,
} from 'react-native'

${screenComponents}


${navCode}
`

  const blob = new Blob([code], { type: 'text/javascript;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'App.jsx'
  a.click()
  URL.revokeObjectURL(url)
}
