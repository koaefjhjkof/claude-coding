import type { Screen, AppStyles, CanvasElement } from '../types'

function elementToHtml(el: CanvasElement, styles: AppStyles, screens: Screen[]): string {
  const { type, props, x, y, width, height, flows } = el
  const radiusMap = { sharp: 4, medium: 10, soft: 20 }
  const r = props.borderRadius ?? radiusMap[styles.borderRadius]
  const opacity = props.opacity ?? 1

  const tapFlows = flows.filter((f) => f.trigger === 'tap')
  const onClick = tapFlows.length > 0
    ? `onclick="handleTap(this, ${JSON.stringify(tapFlows.map(f => f.description))}, ${JSON.stringify(screens.map(s => ({ id: s.id, name: s.name })))})" `
    : ''

  const base = `position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;opacity:${opacity};`

  switch (type) {
    case 'button': {
      const bg = props.bgColor ?? styles.primaryColor
      return `<button ${onClick}style="${base}background:${bg};color:${props.textColor ?? '#fff'};border:none;border-radius:${r}px;font-family:Inter,sans-serif;font-size:${props.fontSize ?? 15}px;font-weight:500;cursor:pointer;">${props.label ?? 'Button'}</button>`
    }

    case 'heading':
      return `<div style="${base}display:flex;align-items:center;color:${props.textColor ?? styles.textColor};font-size:${props.fontSize ?? 28}px;font-weight:${props.fontWeight ?? 600};font-family:Inter,sans-serif;line-height:1.2;">${props.text ?? 'Heading'}</div>`

    case 'text':
      return `<div style="${base}color:${props.textColor ?? '#6b7280'};font-size:${props.fontSize ?? 15}px;font-family:Inter,sans-serif;line-height:1.6;overflow:hidden;">${props.text ?? 'Text'}</div>`

    case 'card':
      return `<div style="${base}background:${props.bgColor ?? '#fff'};border-radius:${r}px;${props.shadow ? 'box-shadow:0 4px 24px rgba(0,0,0,0.10);' : ''}padding:${props.padding ?? 20}px;"></div>`

    case 'image':
      return props.src
        ? `<img src="${props.src}" style="${base}object-fit:cover;border-radius:${r}px;" />`
        : `<div style="${base}background:linear-gradient(135deg,#e0e7ff,#f3e8ff);border-radius:${r}px;display:flex;align-items:center;justify-content:center;color:#a5b4fc;font-size:13px;font-family:Inter,sans-serif;">Image</div>`

    case 'input':
      return `<input placeholder="${props.placeholder ?? 'Type here…'}" style="${base}background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:${r}px;padding:0 14px;color:#111;font-size:14px;font-family:Inter,sans-serif;" />`

    case 'toggle': {
      const on = props.checked ?? false
      return `<div style="${base}display:flex;align-items:center;gap:10px;font-family:Inter,sans-serif;font-size:14px;">
        <div style="width:44px;height:26px;border-radius:13px;background:${on ? styles.primaryColor : '#d1d5db'};position:relative;">
          <div style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
        </div>
        <span>${props.label ?? ''}</span>
      </div>`
    }

    case 'badge':
      return `<div style="${base}display:inline-flex;align-items:center;justify-content:center;background:${(props.badgeColor ?? styles.primaryColor)}20;color:${props.badgeColor ?? styles.primaryColor};border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600;font-family:Inter,sans-serif;">${props.label ?? 'Badge'}</div>`

    case 'slider': {
      const val = props.value ?? 60
      const trackColor = props.bgColor ?? styles.primaryColor
      return `<div style="${base}display:flex;flex-direction:column;justify-content:center;gap:8px;font-family:Inter,sans-serif;">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#374151;">
          ${props.label ? `<span>${props.label}</span>` : ''}<span style="color:${trackColor};font-weight:600;">${val}</span>
        </div>
        <div style="position:relative;height:6px;background:#e5e7eb;border-radius:3px;">
          <div style="position:absolute;left:0;top:0;height:100%;width:${val}%;background:${trackColor};border-radius:3px;"></div>
          <div style="position:absolute;top:50%;left:${val}%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px ${trackColor};"></div>
        </div>
      </div>`
    }

    case 'progress': {
      const val = props.value ?? 60
      const barColor = props.bgColor ?? styles.primaryColor
      return `<div style="${base}display:flex;flex-direction:column;justify-content:center;gap:6px;font-family:Inter,sans-serif;">
        ${props.label ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#374151;"><span>${props.label}</span><span style="color:${barColor};font-weight:600;">${val}%</span></div>` : ''}
        <div style="width:100%;height:10px;background:#e5e7eb;border-radius:5px;overflow:hidden;">
          <div style="height:100%;width:${val}%;background:${barColor};border-radius:5px;"></div>
        </div>
      </div>`
    }

    case 'checkbox': {
      const on = props.checked ?? false
      const color = props.bgColor ?? styles.primaryColor
      return `<div style="${base}display:flex;align-items:center;gap:12px;font-family:Inter,sans-serif;font-size:${props.fontSize ?? 14}px;color:#111;">
        <div style="width:22px;height:22px;border-radius:6px;border:2px solid ${on ? color : '#d1d5db'};background:${on ? color : '#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${on ? '<svg viewBox="0 0 12 10" width="12" height="10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
        </div>
        <span>${props.label ?? 'Checkbox'}</span>
      </div>`
    }

    case 'avatar':
      return props.src
        ? `<div style="${base}border-radius:50%;overflow:hidden;"><img src="${props.src}" style="width:100%;height:100%;object-fit:cover;" /></div>`
        : `<div style="${base}border-radius:50%;background:${props.bgColor ?? styles.primaryColor};display:flex;align-items:center;justify-content:center;color:#fff;font-family:Inter,sans-serif;font-weight:700;font-size:${props.fontSize ?? 20}px;">${props.initials ?? '?'}</div>`

    case 'alert': {
      const variant = props.alertVariant ?? 'info'
      const themes: Record<string, { bg: string; border: string; color: string; icon: string }> = {
        info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'i' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: '✓' },
        warning: { bg: '#fffbeb', border: '#fde68a', color: '#b45309', icon: '!' },
        error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: '×' },
      }
      const t = themes[variant]
      return `<div style="${base}background:${t.bg};border:1.5px solid ${t.border};border-radius:${r}px;display:flex;align-items:center;gap:10px;padding:0 16px;font-family:Inter,sans-serif;font-size:${props.fontSize ?? 14}px;">
        <span style="color:${t.color};font-weight:700;font-size:16px;">${t.icon}</span>
        <span style="color:${t.color};">${props.text ?? 'Alert message'}</span>
      </div>`
    }

    case 'divider':
      return `<div style="${base}display:flex;align-items:center;"><div style="width:100%;height:2px;background:${props.bgColor ?? '#e5e7eb'};border-radius:1px;"></div></div>`

    case 'rating': {
      const val = Math.round(props.value ?? 4)
      const color = props.badgeColor ?? '#f59e0b'
      const stars = [1,2,3,4,5].map((s) =>
        `<svg viewBox="0 0 24 24" width="20" height="20" fill="${s <= val ? color : '#e5e7eb'}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
      ).join('')
      return `<div style="${base}display:flex;align-items:center;gap:3px;">${stars}<span style="font-family:Inter,sans-serif;font-size:13px;color:#6b7280;margin-left:4px;">${val}/5</span></div>`
    }

    case 'list': {
      const items = (props.items ?? 'First item\nSecond item\nThird item').split('\n').filter(Boolean)
      const rows = items.map((item) =>
        `<div style="display:flex;align-items:center;gap:10px;"><div style="width:6px;height:6px;border-radius:50%;background:${styles.primaryColor};flex-shrink:0;"></div><span>${item}</span></div>`
      ).join('')
      return `<div style="${base}display:flex;flex-direction:column;gap:8px;font-family:Inter,sans-serif;font-size:${props.fontSize ?? 14}px;color:${props.textColor ?? '#111'};overflow:hidden;">${rows}</div>`
    }

    case 'tabbar': {
      const tabs = (props.tabs ?? 'Home,Explore,Profile').split(',').map((t) => t.trim())
      const active = props.activeTab ?? 0
      const activeColor = props.bgColor ?? styles.primaryColor
      const icons = ['⌂', '◉', '♥', '☆', '≡', '◻']
      const tabItems = tabs.map((tab, i) =>
        `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-family:Inter,sans-serif;font-size:10px;color:${i === active ? activeColor : '#9ca3af'};">
          <span style="font-size:18px;">${icons[i % icons.length]}</span><span>${tab}</span>
        </div>`
      ).join('')
      return `<div style="${base}background:#fff;border-top:1px solid #e5e7eb;display:flex;align-items:center;">${tabItems}</div>`
    }

    case 'searchbar':
      return `<div style="${base}background:#f3f4f6;border:1.5px solid #e5e7eb;border-radius:${r}px;display:flex;align-items:center;padding:0 14px;gap:10px;font-family:Inter,sans-serif;font-size:${props.fontSize ?? 14}px;color:#9ca3af;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span>${props.placeholder ?? 'Search…'}</span>
      </div>`

    case 'video':
      return props.src
        ? `<video src="${props.src}" controls style="${base}object-fit:contain;border-radius:${r}px;background:#000;display:block;"></video>`
        : `<div style="${base}background:#1e1b4b;border-radius:${r}px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-family:Inter,sans-serif;font-size:13px;">No video URL set</div>`

    case 'map': {
      const q = encodeURIComponent(props.text ?? 'New York, USA')
      return `<iframe src="https://maps.google.com/maps?q=${q}&output=embed&z=14" style="${base}border:none;border-radius:${r}px;" loading="lazy" title="Map"></iframe>`
    }

    case 'chart': {
      const raw = (props.chartData ?? '40,65,45,80,55,70,60').split(',')
      const data = raw.map(v => Math.max(0, Math.min(100, parseFloat(v.trim()) || 0)))
      const maxVal = Math.max(...data, 1)
      const barColor = props.bgColor ?? styles.primaryColor
      const bars = data.map((val, i) => {
        const h = Math.round((val / maxVal) * 100)
        const bg = i === data.length - 1 ? barColor : barColor + 'a0'
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end;">
          <div style="font-size:8px;color:#9ca3af;">${val}</div>
          <div style="width:100%;border-radius:3px 3px 0 0;height:${h}%;background:${bg};min-height:3px;"></div>
        </div>`
      }).join('')
      return `<div style="${base}display:flex;flex-direction:column;font-family:Inter,sans-serif;padding:8px 4px 4px;">
        ${props.label ? `<div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;padding-left:4px;">${props.label}</div>` : ''}
        <div style="flex:1;display:flex;align-items:flex-end;gap:3px;overflow:hidden;">${bars}</div>
      </div>`
    }

    case 'stat': {
      const isUp = props.statUp !== false
      return `<div style="${base}background:${props.bgColor ?? '#fff'};border-radius:${r}px;box-shadow:0 2px 12px rgba(0,0,0,0.07);padding:14px;display:flex;flex-direction:column;justify-content:space-between;font-family:Inter,sans-serif;">
        <div style="font-size:11px;color:#6b7280;font-weight:500;">${props.statLabel ?? 'Total Revenue'}</div>
        <div style="font-size:${props.fontSize ?? 26}px;font-weight:700;color:${props.textColor ?? '#111'};line-height:1.1;">${props.statValue ?? '$12,400'}</div>
        ${props.statChange ? `<div style="display:flex;align-items:center;gap:4px;font-size:11px;">
          <span style="color:${isUp ? '#10b981' : '#ef4444'};font-weight:600;">${isUp ? '↑' : '↓'} ${props.statChange}</span>
          <span style="color:#9ca3af;">vs last period</span>
        </div>` : ''}
      </div>`
    }

    case 'stepper': {
      const steps = (props.steps ?? 'Step 1,Step 2,Step 3').split(',').map(s => s.trim())
      const current = props.currentStep ?? 1
      const color = props.bgColor ?? styles.primaryColor
      const nodes = steps.map((step, i) => {
        const done = i < current, active = i === current
        const circle = `<div style="width:28px;height:28px;border-radius:50%;background:${done || active ? color : '#e5e7eb'};display:flex;align-items:center;justify-content:center;color:${done || active ? '#fff' : '#9ca3af'};font-size:12px;font-weight:600;flex-shrink:0;">${done ? '✓' : i + 1}</div>`
        const label = `<span style="font-size:10px;font-weight:${active ? 600 : 400};color:${active ? color : done ? '#6b7280' : '#9ca3af'};white-space:nowrap;text-align:center;max-width:60px;">${step}</span>`
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;">${circle}${label}</div>`
      })
      const withLines: string[] = []
      nodes.forEach((node, i) => {
        withLines.push(node)
        if (i < nodes.length - 1) withLines.push(`<div style="flex:1;height:2px;align-self:flex-start;margin-top:13px;background:${i < current ? color : '#e5e7eb'};"></div>`)
      })
      return `<div style="${base}display:flex;align-items:center;padding:0 8px;font-family:Inter,sans-serif;">${withLines.join('')}</div>`
    }

    case 'skeleton': {
      const rows = props.skeletonRows ?? 3
      const rowDivs = Array.from({ length: rows }, (_, i) =>
        `<div style="height:12px;border-radius:6px;width:${90 - i * 14}%;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);"></div>`
      ).join('')
      return `<div style="${base}display:flex;flex-direction:column;gap:10px;padding:4px;">
        <div style="display:flex;gap:10px;align-items:center;">
          <div style="width:38px;height:38px;border-radius:50%;flex-shrink:0;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
            <div style="height:12px;border-radius:6px;width:65%;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);"></div>
            <div style="height:10px;border-radius:5px;width:40%;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);"></div>
          </div>
        </div>
        ${rowDivs}
      </div>`
    }

    default:
      return ''
  }
}

function screenToHtml(screen: Screen, styles: AppStyles, screens: Screen[], isFirst: boolean): string {
  const elements = screen.elements.map((el) => elementToHtml(el, styles, screens)).join('\n    ')
  return `  <div id="screen-${screen.id}" class="screen" style="display:${isFirst ? 'block' : 'none'};position:relative;width:375px;height:720px;background:#faf8f5;overflow:hidden;">
    ${elements}
  </div>`
}

function buildHtml(screens: Screen[], styles: AppStyles): string {
  const screenDivs = screens.map((s, i) => screenToHtml(s, styles, screens, i === 0)).join('\n')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f0f0f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: Inter, sans-serif; }
    .app-frame { width: 375px; height: 720px; border-radius: 40px; border: 2px solid #ddd; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.15); position: relative; background: #faf8f5; }
    .screen { position: absolute; inset: 0; }
    .toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(17,24,39,0.92); color: #fff; padding: 10px 20px; border-radius: 12px; font-size: 13px; z-index: 999; pointer-events: none; }
  </style>
</head>
<body>
  <div class="app-frame">
${screenDivs}
  </div>
  <script>
    const screens = ${JSON.stringify(screens.map((s) => ({ id: s.id, name: s.name })))};
    let toastTimer;
    function showScreen(id) {
      document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
      const t = document.getElementById('screen-' + id);
      if (t) t.style.display = 'block';
    }
    function showToast(msg) {
      let toast = document.querySelector('.toast');
      if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
      toast.textContent = msg; toast.style.opacity = '1';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    }
    function handleTap(el, flows, allScreens) {
      flows.forEach(desc => {
        const d = desc.toLowerCase(); let navigated = false;
        allScreens.forEach((s, i) => {
          if (d.includes(s.name.toLowerCase()) || d.includes('screen ' + (i+1))) { showScreen(s.id); navigated = true; }
        });
        if ((d.includes('next screen') || d.includes('next page')) && !navigated) {
          const cur = allScreens.findIndex(s => document.getElementById('screen-'+s.id)?.style.display !== 'none');
          if (allScreens[cur+1]) { showScreen(allScreens[cur+1].id); navigated = true; }
        }
        if (!navigated) showToast(desc);
      });
    }
  </script>
</body>
</html>`

  return html
}

export function exportHtml(screens: Screen[], styles: AppStyles) {
  const html = buildHtml(screens, styles)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'my-app.html'; a.click()
  URL.revokeObjectURL(url)
}

export function publishHtml(screens: Screen[], styles: AppStyles) {
  const html = buildHtml(screens, styles)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const tab = window.open(url, '_blank')
  if (!tab) URL.revokeObjectURL(url)
  else setTimeout(() => URL.revokeObjectURL(url), 60000)
}
