import { useEffect, useRef, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { GObj2D, ObjKind2D } from '../types/game'

// ─── World constants ────────────────────────────────────────────────────────
const WORLD_W = 3200
const WORLD_H = 520
const GRAVITY  = 900   // px/s²
const P_SPEED  = 220   // px/s horizontal
const P_JUMP   = -470  // px/s upward
const P_W = 34; const P_H = 46
const SPRING_V = -720  // px/s upward

// ─── Default sizes / colours per object type ────────────────────────────────
const DEFAULTS: Record<ObjKind2D, Partial<GObj2D>> = {
  player:   { w: P_W, h: P_H, color: '#3b82f6' },
  platform: { w: 180, h: 22, color: '#22c55e' },
  wall:     { w: 22,  h: 140, color: '#6b7280' },
  enemy:    { w: 34,  h: 44,  color: '#ef4444', speed: 80, patrolDist: 140 },
  coin:     { w: 24,  h: 24,  color: '#fbbf24', points: 10 },
  spike:    { w: 40,  h: 22,  color: '#f97316' },
  spring:   { w: 36,  h: 18,  color: '#22d3ee' },
  goal:     { w: 44,  h: 88,  color: '#a855f7' },
}

const KIND_LABELS: Record<ObjKind2D, string> = {
  player: 'Player', platform: 'Platform', wall: 'Wall',
  enemy: 'Enemy', coin: 'Coin', spike: 'Spike', spring: 'Spring', goal: 'Goal 🏁',
}
const KIND_ICONS: Record<ObjKind2D, string> = {
  player: '🧍', platform: '▬', wall: '▐', enemy: '👾',
  coin: '🪙', spike: '▲', spring: '🔛', goal: '🚩',
}

// ─── Collision helper ────────────────────────────────────────────────────────
function overlaps(ax: number, ay: number, aw: number, ah: number,
                  bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// ─── Canvas drawing ──────────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function drawObj(ctx: CanvasRenderingContext2D, obj: GObj2D, cx: number, selected: boolean, alpha = 1) {
  const dx = Math.round(obj.x - cx)
  const dy = Math.round(obj.y)
  ctx.globalAlpha = alpha

  switch (obj.kind) {
    case 'platform': case 'wall': {
      ctx.fillStyle = obj.color
      ctx.fillRect(dx, dy, obj.w, obj.h)
      // grain lines
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1
      for (let lx = dx; lx < dx + obj.w; lx += 14) {
        ctx.beginPath(); ctx.moveTo(lx, dy); ctx.lineTo(lx, dy + obj.h); ctx.stroke()
      }
      break
    }
    case 'player': {
      ctx.fillStyle = obj.color
      rrect(ctx, dx, dy, obj.w, obj.h, 6); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillRect(dx + 6, dy + 10, 8, 8); ctx.fillRect(dx + obj.w - 14, dy + 10, 8, 8)
      ctx.fillStyle = '#1e3a8a'
      ctx.fillRect(dx + 8, dy + 12, 4, 5); ctx.fillRect(dx + obj.w - 12, dy + 12, 4, 5)
      break
    }
    case 'enemy': {
      ctx.fillStyle = obj.color
      rrect(ctx, dx, dy, obj.w, obj.h, 5); ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5
      ;[[dx+7,dy+11,dx+14,dy+18],[dx+14,dy+11,dx+7,dy+18],
        [dx+obj.w-14,dy+11,dx+obj.w-7,dy+18],[dx+obj.w-7,dy+11,dx+obj.w-14,dy+18]
      ].forEach(([x1,y1,x2,y2]) => { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke() })
      // teeth
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 4; i++) ctx.fillRect(dx + 6 + i * 6, dy + obj.h - 10, 4, 6)
      break
    }
    case 'coin': {
      const cx2 = dx + obj.w / 2, cy = dy + obj.h / 2
      ctx.fillStyle = obj.color
      ctx.beginPath(); ctx.arc(cx2, cy, obj.w / 2, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#92400e'
      ctx.font = `bold ${obj.h * 0.5}px Inter`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('$', cx2, cy + 1)
      break
    }
    case 'spike': {
      ctx.fillStyle = obj.color
      ctx.beginPath()
      const n = Math.max(2, Math.floor(obj.w / 13))
      for (let i = 0; i < n; i++) {
        const sx = dx + i * (obj.w / n), sw = obj.w / n
        ctx.moveTo(sx, dy + obj.h); ctx.lineTo(sx + sw / 2, dy); ctx.lineTo(sx + sw, dy + obj.h)
      }
      ctx.closePath(); ctx.fill()
      break
    }
    case 'spring': {
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(dx, dy + obj.h * 0.5, obj.w, obj.h * 0.5)
      ctx.fillStyle = obj.color
      for (let i = 0; i < 3; i++)
        ctx.fillRect(dx + 2, dy + i * (obj.h * 0.5 / 3), obj.w - 4, obj.h * 0.5 / 3 - 2)
      break
    }
    case 'goal': {
      ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(dx + 10, dy); ctx.lineTo(dx + 10, dy + obj.h); ctx.stroke()
      ctx.fillStyle = obj.color
      ctx.beginPath()
      ctx.moveTo(dx + 10, dy + 8); ctx.lineTo(dx + obj.w, dy + 20); ctx.lineTo(dx + 10, dy + 32)
      ctx.closePath(); ctx.fill()
      break
    }
  }

  ctx.globalAlpha = 1
  if (selected) {
    ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2; ctx.setLineDash([5, 4])
    ctx.strokeRect(dx - 3, dy - 3, obj.w + 6, obj.h + 6)
    ctx.setLineDash([])
  }
}

// ─── Background draw ────────────────────────────────────────────────────────
function drawBg(ctx: CanvasRenderingContext2D, camX: number, playing: boolean) {
  const { width: cw, height: ch } = ctx.canvas
  const grad = ctx.createLinearGradient(0, 0, 0, ch)
  grad.addColorStop(0, '#bfdbfe'); grad.addColorStop(1, '#dbeafe')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, cw, ch)
  // parallax clouds (static decoration)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  const clouds = [[100,60,120,40],[350,40,80,30],[600,70,140,45],[900,50,90,35],[1200,65,110,40]]
  clouds.forEach(([bx, by, bw, bh]) => {
    const wx = (bx - camX * 0.4) % (cw + 200) - 100
    ctx.beginPath(); ctx.ellipse(wx, by, bw/2, bh/2, 0, 0, Math.PI*2); ctx.fill()
  })
  // grid (edit mode only)
  if (!playing) {
    ctx.strokeStyle = 'rgba(99,102,241,0.08)'; ctx.lineWidth = 1
    for (let gx = ((-camX % 40) + 40) % 40; gx < cw; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ch); ctx.stroke()
    }
    for (let gy = 0; gy < ch; gy += 40) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke()
    }
  }
}

// ─── Runtime state types ─────────────────────────────────────────────────────
interface RunPlayer { x: number; y: number; vx: number; vy: number; onGround: boolean; alive: boolean; dead: boolean; grace: number }
interface RunEnemy  { id: string; x: number; y: number; vx: number; timer: number; alive: boolean }
interface RunCoin   { id: string; x: number; y: number; collected: boolean }
interface RunState  { player: RunPlayer; enemies: RunEnemy[]; coins: RunCoin[]; score: number; won: boolean; started: boolean }

function buildRunState(objects: GObj2D[]): RunState {
  const pDef = objects.find(o => o.kind === 'player')
  return {
    player: { x: pDef?.x ?? 80, y: pDef?.y ?? 360, vx: 0, vy: 0, onGround: false, alive: true, dead: false, grace: 0 },
    enemies: objects.filter(o => o.kind === 'enemy').map(o => ({
      id: o.id, x: o.x, y: o.y, vx: o.speed ?? 80, timer: (o.patrolDist ?? 120) / (o.speed ?? 80), alive: true,
    })),
    coins: objects.filter(o => o.kind === 'coin').map(o => ({ id: o.id, x: o.x, y: o.y, collected: false })),
    score: 0, won: false, started: false,
  }
}

// ─── Physics tick ─────────────────────────────────────────────────────────────
function tick(dt: number, rs: RunState, objects: GObj2D[], keys: Set<string>) {
  const p = rs.player
  if (!p.alive || rs.won) return

  const solids = objects.filter(o => o.kind === 'platform' || o.kind === 'wall')

  // Horizontal
  const left  = keys.has('ArrowLeft')  || keys.has('KeyA')
  const right = keys.has('ArrowRight') || keys.has('KeyD')
  if (left)       { p.vx = -P_SPEED }
  else if (right) { p.vx =  P_SPEED }
  else            { p.vx *= 0.78; if (Math.abs(p.vx) < 3) p.vx = 0 }

  // Jump (with coyote time)
  const wantJump = keys.has('ArrowUp') || keys.has('KeyW') || keys.has('Space')
  if (wantJump && p.grace > 0) { p.vy = P_JUMP; p.grace = 0; p.onGround = false }

  // Gravity
  p.vy = Math.min(p.vy + GRAVITY * dt, 640)

  // Move X + resolve
  p.x += p.vx * dt
  p.x = Math.max(0, Math.min(WORLD_W - P_W, p.x))
  for (const s of solids) {
    if (overlaps(p.x, p.y, P_W, P_H, s.x, s.y, s.w, s.h)) {
      if (p.vx > 0) { p.x = s.x - P_W; p.vx = 0 }
      else if (p.vx < 0) { p.x = s.x + s.w; p.vx = 0 }
    }
  }

  // Move Y + resolve
  p.y += p.vy * dt
  p.onGround = false
  for (const s of solids) {
    if (overlaps(p.x, p.y, P_W, P_H, s.x, s.y, s.w, s.h)) {
      if (p.vy >= 0) { p.y = s.y - P_H; p.onGround = true; p.vy = 0; p.grace = 8 }
      else           { p.y = s.y + s.h; p.vy = 0 }
    }
  }
  if (p.grace > 0) p.grace--

  // Fall death
  if (p.y > WORLD_H + 80) { p.alive = false; p.dead = true; return }

  // Springs
  for (const s of objects.filter(o => o.kind === 'spring')) {
    if (p.vy > 0 && overlaps(p.x, p.y, P_W, P_H, s.x, s.y, s.w, s.h)) {
      p.vy = SPRING_V; p.onGround = false
    }
  }

  // Spikes (top 60% collision only)
  for (const s of objects.filter(o => o.kind === 'spike')) {
    if (overlaps(p.x, p.y + P_H * 0.4, P_W, P_H * 0.6, s.x, s.y, s.w, s.h)) {
      p.alive = false; p.dead = true; return
    }
  }

  // Enemies (move + player kill)
  for (const e of rs.enemies) {
    if (!e.alive) continue
    e.x += e.vx * dt; e.timer -= dt
    if (e.timer <= 0) { e.vx = -e.vx; e.timer = Math.abs(e.timer) + 1.5 }
    const eo = objects.find(o => o.id === e.id)
    const ew = eo?.w ?? 34, eh = eo?.h ?? 44
    if (overlaps(p.x, p.y, P_W, P_H, e.x, e.y, ew, eh)) {
      p.alive = false; p.dead = true; return
    }
  }

  // Coins
  for (const c of rs.coins) {
    if (c.collected) continue
    if (overlaps(p.x, p.y, P_W, P_H, c.x - 12, c.y - 12, 28, 28)) {
      c.collected = true
      rs.score += objects.find(o => o.id === c.id)?.points ?? 10
    }
  }

  // Goal
  for (const g of objects.filter(o => o.kind === 'goal')) {
    if (overlaps(p.x, p.y, P_W, P_H, g.x, g.y, g.w, g.h)) rs.won = true
  }
}

// ─── Main component ──────────────────────────────────────────────────────────
export function GameMode2D({ onBack }: { onBack: () => void }) {
  const [objects, setObjects] = useState<GObj2D[]>([
    // Default starter level
    { id: uuidv4(), kind: 'platform', x: 0, y: 480, w: WORLD_W, h: 40, color: '#4ade80' },
    { id: uuidv4(), kind: 'player',   x: 100, y: 430, w: P_W, h: P_H, color: '#3b82f6' },
    { id: uuidv4(), kind: 'platform', x: 280, y: 380, w: 180, h: 22, color: '#22c55e' },
    { id: uuidv4(), kind: 'platform', x: 560, y: 320, w: 160, h: 22, color: '#22c55e' },
    { id: uuidv4(), kind: 'coin',     x: 340, y: 348, w: 24, h: 24, color: '#fbbf24', points: 10 },
    { id: uuidv4(), kind: 'coin',     x: 390, y: 348, w: 24, h: 24, color: '#fbbf24', points: 10 },
    { id: uuidv4(), kind: 'enemy',    x: 600, y: 432, w: 34, h: 44, color: '#ef4444', speed: 90, patrolDist: 130 },
    { id: uuidv4(), kind: 'spring',   x: 780, y: 462, w: 36, h: 18, color: '#22d3ee' },
    { id: uuidv4(), kind: 'platform', x: 840, y: 300, w: 160, h: 22, color: '#22c55e' },
    { id: uuidv4(), kind: 'spike',    x: 1060, y: 458, w: 52, h: 22, color: '#f97316' },
    { id: uuidv4(), kind: 'goal',     x: 1200, y: 390, w: 44, h: 88, color: '#a855f7' },
  ])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ObjKind2D | null>(null)
  const [camX, setCamX] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [panStartX, setPanStartX] = useState<number | null>(null)
  const [panStartCam, setPanStartCam] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runRef = useRef<RunState | null>(null)
  const keysRef = useRef(new Set<string>())
  const rafRef = useRef<number>(0)
  const lastTRef = useRef(0)
  const camXRef = useRef(camX)
  camXRef.current = camX

  // ── Edit-mode render ──────────────────────────────────────────────────────
  const renderEdit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { width: cw, height: ch } = canvas
    drawBg(ctx, camXRef.current, false)
    // world boundary markers
    ctx.strokeStyle = 'rgba(239,68,68,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4])
    ctx.strokeRect(0 - camXRef.current, 0, WORLD_W, WORLD_H)
    ctx.setLineDash([])
    for (const o of objects) drawObj(ctx, o, camXRef.current, o.id === selectedId)
    // cursor preview when tool active
    if (activeTool) {
      ctx.globalAlpha = 0.25
      const def = DEFAULTS[activeTool]
      ctx.fillStyle = def.color ?? '#6366f1'
      ctx.fillRect(cw / 2 - (def.w ?? 40) / 2, ch / 2 - (def.h ?? 40) / 2, def.w ?? 40, def.h ?? 40)
      ctx.globalAlpha = 1
    }
  }, [objects, selectedId, activeTool])

  useEffect(() => { if (!playing) renderEdit() }, [playing, renderEdit, camX])

  // ── Play loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return }
    runRef.current = buildRunState(objects)
    lastTRef.current = performance.now()
    setScore(0); setStatusMsg(null)

    function loop(now: number) {
      const dt = Math.min((now - lastTRef.current) / 1000, 0.05)
      lastTRef.current = now
      const rs = runRef.current!
      tick(dt, rs, objects, keysRef.current)
      setScore(rs.score)

      // Camera follow
      const targetCam = Math.max(0, Math.min(WORLD_W - 820, rs.player.x - 300))
      setCamX(prev => prev + (targetCam - prev) * 0.12)

      // Render
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      drawBg(ctx, camXRef.current, true)
      // Draw objects
      for (const o of objects) {
        const rEnemy = rs.enemies.find(e => e.id === o.id)
        const rCoin  = rs.coins.find(c => c.id === o.id)
        if (rEnemy && !rEnemy.alive) continue
        if (rCoin  && rCoin.collected) continue
        const oo = rEnemy ? { ...o, x: rEnemy.x, y: rEnemy.y } : o
        drawObj(ctx, oo, camXRef.current, false)
      }
      // Draw player
      const po: GObj2D = { id: '', kind: 'player', color: DEFAULTS.player.color ?? '#3b82f6',
                   x: rs.player.x, y: rs.player.y, w: P_W, h: P_H }
      drawObj(ctx, po, camXRef.current, false, rs.player.alive ? 1 : 0.3)

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, 820, 40)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText(`Score: ${rs.score}`, 14, 20)
      ctx.textAlign = 'right'
      ctx.fillText('WASD / Arrows to move  ·  Space / ↑ to jump  ·  ESC to stop', 816, 20)

      if (rs.won) {
        setStatusMsg(`🏆 You win!  Score: ${rs.score}`)
        setPlaying(false); return
      }
      if (rs.player.dead) {
        setStatusMsg('💀 Game over — restart to try again')
        setPlaying(false); return
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, objects])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      if (e.code === 'Escape' && playing) { setPlaying(false); setCamX(0) }
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedId && !playing) {
        setObjects(prev => prev.filter(o => o.id !== selectedId)); setSelectedId(null)
      }
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [playing, selectedId])

  // ── Canvas pointer (editor) ───────────────────────────────────────────────
  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (playing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = (e.clientX - rect.left) * (820 / rect.width) + camXRef.current
    const cy = (e.clientY - rect.top)  * (480 / rect.height)

    if (activeTool) {
      // Place object
      const def = DEFAULTS[activeTool]
      const w = def.w ?? 80, h = def.h ?? 40
      const newObj = {
        ...def,
        id: uuidv4(), kind: activeTool,
        x: cx - w / 2, y: cy - h / 2,
      } as GObj2D
      setObjects(prev => prev.filter(o => activeTool === 'player' ? o.kind !== 'player' : true).concat(newObj))
      setSelectedId(newObj.id); setActiveTool(null)
    } else {
      // Select or start pan
      const hit = [...objects].reverse().find(o =>
        cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h
      )
      if (hit) { setSelectedId(hit.id) }
      else { setSelectedId(null); setPanStartX(e.clientX); setPanStartCam(camXRef.current) }
    }
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (playing) return
    if (panStartX !== null) {
      const rect = e.currentTarget.getBoundingClientRect()
      const dx = (panStartX - e.clientX) * (820 / rect.width)
      setCamX(Math.max(0, Math.min(WORLD_W - 820, panStartCam + dx)))
    } else if (selectedId) {
      const rect = e.currentTarget.getBoundingClientRect()
      const dx = e.movementX * (820 / rect.width)
      const dy = e.movementY * (480 / rect.height)
      setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, x: o.x + dx, y: o.y + dy } : o))
    }
  }

  function handleCanvasPointerUp() { setPanStartX(null) }

  const selectedObj = objects.find(o => o.id === selectedId)

  // ── Render ────────────────────────────────────────────────────────────────
  const sidebarItems: ObjKind2D[] = ['player', 'platform', 'wall', 'enemy', 'coin', 'spike', 'spring', 'goal']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        <button onClick={onBack} style={tbtn}>← Back</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#e0e7ff' }}>2D Platformer</span>
        {statusMsg && <span style={{ fontSize: 13, color: statusMsg.includes('win') ? '#4ade80' : '#f87171',
                                     fontWeight: 600 }}>{statusMsg}</span>}
        <div style={{ flex: 1 }} />
        {!playing && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Drag to pan · Click tool then click canvas to place · Drag objects to move
        </span>}
        {!playing && <button onClick={() => { setObjects([]); setSelectedId(null) }} style={tbtn}>🗑 Clear</button>}
        <button
          onClick={() => { setPlaying(p => !p); if (playing) { setCamX(0); setStatusMsg(null) } }}
          style={{ ...tbtn, background: playing ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)',
                   color: playing ? '#f87171' : '#4ade80', border: `1px solid ${playing ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}` }}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {!playing && (
          <div style={{ width: 160, borderRight: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(0,0,0,0.25)', padding: '14px 10px', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
                          letterSpacing: '0.1em', marginBottom: 10 }}>Objects</div>
            {sidebarItems.map(kind => (
              <button key={kind} onClick={() => setActiveTool(t => t === kind ? null : kind)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid',
                  borderColor: activeTool === kind ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)',
                  background: activeTool === kind ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                  color: '#e0e7ff', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, textAlign: 'left',
                }}>
                <span style={{ fontSize: 16 }}>{KIND_ICONS[kind]}</span>
                {KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#0f172a', overflow: 'hidden' }}>
          <canvas ref={canvasRef} width={820} height={480}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            style={{ width: '100%', maxWidth: 820, height: 'auto', cursor: activeTool ? 'crosshair' : 'default',
                     display: 'block', touchAction: 'none', imageRendering: 'pixelated',
                     boxShadow: '0 0 40px rgba(99,102,241,0.3)' }} />
        </div>

        {/* Properties */}
        {!playing && (
          <div style={{ width: 200, borderLeft: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(0,0,0,0.25)', padding: '14px 12px', overflowY: 'auto', flexShrink: 0 }}>
            {selectedObj ? (
              <>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
                              letterSpacing: '0.1em', marginBottom: 12 }}>
                  {KIND_ICONS[selectedObj.kind]} {KIND_LABELS[selectedObj.kind]}
                </div>
                {[
                  { label: 'X', field: 'x' }, { label: 'Y', field: 'y' },
                  { label: 'Width', field: 'w' }, { label: 'Height', field: 'h' },
                  ...(selectedObj.kind === 'enemy' ? [{ label: 'Speed', field: 'speed' }, { label: 'Patrol', field: 'patrolDist' }] : []),
                  ...(selectedObj.kind === 'coin'  ? [{ label: 'Points', field: 'points' }] : []),
                ].map(({ label, field }) => (
                  <PropField key={field} label={label}
                    value={Math.round(((selectedObj as unknown) as Record<string, number>)[field] ?? 0)}
                    onChange={(v) => setObjects(prev => prev.map(o => o.id === selectedObj.id ? { ...o, [field]: v } : o))} />
                ))}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Colour</div>
                  <input type="color" value={selectedObj.color}
                    onChange={(e) => setObjects(prev => prev.map(o => o.id === selectedObj.id ? { ...o, color: e.target.value } : o))}
                    style={{ width: '100%', height: 32, borderRadius: 6, border: 'none', cursor: 'pointer' }} />
                </div>
                <button onClick={() => { setObjects(prev => prev.filter(o => o.id !== selectedId)); setSelectedId(null) }}
                  style={{ ...tbtn, marginTop: 12, width: '100%', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
                  🗑 Delete
                </button>
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, lineHeight: 1.6 }}>
                Click an object to edit its properties, or pick a tool from the left to place new objects.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PropField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState<string | null>(null)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{label}</div>
      <input type="number" value={local ?? value}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => { setLocal(null); const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(n) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { setLocal(null); const n = parseFloat((e.target as HTMLInputElement).value); if (!isNaN(n)) onChange(n) } }}
        style={{ width: '100%', padding: '5px 8px', background: 'rgba(255,255,255,0.08)',
                 border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                 color: '#e0e7ff', fontSize: 12, fontFamily: 'Inter, sans-serif', outline: 'none' }} />
    </div>
  )
}

const tbtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)',
  fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
}
