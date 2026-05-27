import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { v4 as uuidv4 } from 'uuid'
import type { GObj3D, ObjKind3D } from '../types/game'

// ─── Object palette ──────────────────────────────────────────────────────────
const KIND_LABELS: Record<ObjKind3D, string> = {
  ground: 'Ground', box: 'Box', sphere: 'Sphere', ramp: 'Ramp',
  coin: 'Coin', start: 'Player Start', light: 'Point Light',
}
const KIND_ICONS: Record<ObjKind3D, string> = {
  ground: '🟫', box: '🟦', sphere: '🔵', ramp: '📐',
  coin: '🪙', start: '🚀', light: '💡',
}
const DEFAULTS: Record<ObjKind3D, Partial<GObj3D>> = {
  ground:  { sx: 30, sy: 0.4, sz: 30,  color: '#4ade80', y: 0 },
  box:     { sx: 2,  sy: 2,   sz: 2,   color: '#60a5fa', y: 1 },
  sphere:  { sx: 1.5,sy: 1.5, sz: 1.5, color: '#f472b6', y: 1.5 },
  ramp:    { sx: 4,  sy: 0.4, sz: 4,   color: '#fb923c', y: 0.2, rotY: 0 },
  coin:    { sx: 0.6,sy: 0.6, sz: 0.1, color: '#fbbf24', y: 2 },
  start:   { sx: 0.6,sy: 2,   sz: 0.6, color: '#a855f7', y: 1 },
  light:   { sx: 1,  sy: 1,   sz: 1,   color: '#fff7ed', y: 5, intensity: 2 },
}

interface ThreeMeshMap { [id: string]: THREE.Object3D }

function buildMesh(obj: GObj3D): THREE.Object3D {
  if (obj.kind === 'light') {
    const grp = new THREE.Group()
    const light = new THREE.PointLight(new THREE.Color(obj.color), obj.intensity ?? 2, 40)
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: obj.color }),
    )
    grp.add(light, sphere)
    grp.position.set(obj.x, obj.y, obj.z)
    grp.userData.objId = obj.id
    return grp
  }

  let geo: THREE.BufferGeometry
  if (obj.kind === 'sphere') {
    geo = new THREE.SphereGeometry(obj.sx / 2, 28, 28)
  } else if (obj.kind === 'ramp') {
    // Wedge via custom geometry
    const hw = obj.sx / 2, hh = obj.sy, hz = obj.sz / 2
    const verts = new Float32Array([
      -hw, 0, -hz,  hw, 0, -hz,  hw, hh, -hz,  -hw, hh, -hz,  // front (tilted)
      -hw, 0,  hz,  hw, 0,  hz,  hw, 0,   hz,  -hw, 0,   hz,  // back flat
    ])
    geo = new THREE.BufferGeometry()
    const positions = new Float32Array([
      // front face
      -hw,0,-hz, hw,0,-hz, hw,hh,-hz,
      -hw,0,-hz, hw,hh,-hz, -hw,hh,-hz,
      // back face
      -hw,0,hz, hw,hh,-hz, hw,0,hz,
      // top face
      -hw,0,-hz, -hw,hh,-hz, -hw,0,hz,
      hw,0,-hz, hw,0,hz, hw,hh,-hz,
      // bottom
      -hw,0,-hz, -hw,0,hz, hw,0,hz,
      -hw,0,-hz, hw,0,hz, hw,0,-hz,
    ])
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.computeVertexNormals()
  } else {
    geo = new THREE.BoxGeometry(obj.sx, obj.sy, obj.sz)
  }

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(obj.color),
    roughness: 0.7, metalness: 0.1,
    transparent: obj.kind === 'start',
    opacity: obj.kind === 'start' ? 0.5 : 1,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = obj.kind !== 'ground'
  mesh.receiveShadow = true
  mesh.position.set(obj.x, obj.y, obj.z)
  if (obj.rotY) mesh.rotation.y = (obj.rotY * Math.PI) / 180
  mesh.userData.objId = obj.id
  return mesh
}

// ─── Main component ──────────────────────────────────────────────────────────
export function GameMode3D({ onBack }: { onBack: () => void }) {
  const [objects, setObjects] = useState<GObj3D[]>([
    { id: uuidv4(), kind: 'ground', x: 0,  y: -0.2, z: 0, sx: 40, sy: 0.4, sz: 40, color: '#4ade80' },
    { id: uuidv4(), kind: 'start',  x: 0,  y: 0.2,  z: 8, sx: 0.6, sy: 2, sz: 0.6, color: '#a855f7' },
    { id: uuidv4(), kind: 'box',    x: -4, y: 1,    z: 0, sx: 2, sy: 2, sz: 2, color: '#60a5fa' },
    { id: uuidv4(), kind: 'box',    x: 4,  y: 2,    z: -4, sx: 2, sy: 4, sz: 2, color: '#f472b6' },
    { id: uuidv4(), kind: 'coin',   x: 0,  y: 2,    z: 0, sx: 0.7, sy: 0.7, sz: 0.1, color: '#fbbf24' },
    { id: uuidv4(), kind: 'coin',   x: -4, y: 3.2,  z: 0, sx: 0.7, sy: 0.7, sz: 0.1, color: '#fbbf24' },
    { id: uuidv4(), kind: 'light',  x: 3,  y: 8,    z: 3, sx: 1, sy: 1, sz: 1, color: '#fffbeb', intensity: 3 },
  ])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ObjKind3D | null>(null)
  const [playing, setPlaying]   = useState(false)
  const [score, setScore]       = useState(0)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [, forceRender] = useState(0)

  const mountRef  = useRef<HTMLDivElement>(null)
  const sceneRef  = useRef<THREE.Scene>()
  const camRef    = useRef<THREE.PerspectiveCamera>()
  const rendRef   = useRef<THREE.WebGLRenderer>()
  const ctrlRef   = useRef<OrbitControls>()
  const meshMapRef = useRef<ThreeMeshMap>({})
  const rafRef    = useRef(0)
  const floorRef  = useRef<THREE.Mesh>()  // invisible raycast target
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null)

  // FPS play state refs
  const playingRef  = useRef(false)
  const velRef      = useRef({ x: 0, y: 0, z: 0 })
  const pitchRef    = useRef(0); const yawRef = useRef(0)
  const keysRef     = useRef(new Set<string>())
  const coinsRef    = useRef<{ id: string; collected: boolean; mesh: THREE.Object3D }[]>([])
  const scoreRef    = useRef(0)

  // ── Three.js setup ───────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current!
    const W = mount.clientWidth || 820
    const H = mount.clientHeight || 500

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#87ceeb')
    scene.fog = new THREE.Fog('#87ceeb', 30, 80)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 200)
    camera.position.set(0, 8, 18)
    camRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)
    rendRef.current = renderer

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.4)
    sun.position.set(15, 30, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 120
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30
    scene.add(sun)

    // Invisible floor plane for raycasting placement
    const floorGeo = new THREE.PlaneGeometry(200, 200)
    const floorMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)
    floorRef.current = floor

    // Orbit controls (edit)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.07
    controls.minDistance = 3; controls.maxDistance = 60
    ctrlRef.current = controls

    // Resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h; camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    // Render loop
    let animId = 0
    const loop = () => {
      animId = requestAnimationFrame(loop)
      if (boxHelperRef.current) boxHelperRef.current.update()
      controls.update()
      renderer.render(scene, camera)
    }
    loop(); rafRef.current = animId

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      controls.dispose(); renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  // ── Sync objects → Three.js meshes ───────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current!
    const map = meshMapRef.current

    // Remove stale meshes
    const liveIds = new Set(objects.map(o => o.id))
    for (const [id, mesh] of Object.entries(map)) {
      if (!liveIds.has(id)) { scene.remove(mesh); delete map[id] }
    }
    // Add/update
    for (const obj of objects) {
      if (map[obj.id]) { scene.remove(map[obj.id]); delete map[obj.id] }
      const mesh = buildMesh(obj)
      scene.add(mesh); map[obj.id] = mesh
    }
  }, [objects])

  // ── Selection highlight ──────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (boxHelperRef.current) { scene.remove(boxHelperRef.current); boxHelperRef.current = null }
    if (selectedId && !playing) {
      const mesh = meshMapRef.current[selectedId]
      if (mesh) {
        const helper = new THREE.BoxHelper(mesh, 0x818cf8)
        scene.add(helper)
        boxHelperRef.current = helper
      }
    }
  }, [selectedId, objects, playing])

  // ── Raycasting click handler (edit mode) ─────────────────────────────────
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (playing) return
    const mount = mountRef.current!
    const rect = mount.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width)  * 2 - 1
    const ny = -((e.clientY - rect.top)  / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camRef.current!)

    if (activeTool) {
      // Place on floor
      const hits = raycaster.intersectObject(floorRef.current!)
      if (hits.length > 0) {
        const pt = hits[0].point
        const def = DEFAULTS[activeTool]
        const newObj: GObj3D = {
          id: uuidv4(), kind: activeTool,
          x: Math.round(pt.x * 2) / 2,
          y: (def.y ?? 0) + (activeTool === 'coin' ? 1.5 : 0),
          z: Math.round(pt.z * 2) / 2,
          sx: def.sx ?? 2, sy: def.sy ?? 2, sz: def.sz ?? 2,
          color: def.color ?? '#6366f1',
          rotY: def.rotY, intensity: def.intensity,
        }
        setObjects(prev => {
          const base = activeTool === 'start' ? prev.filter(o => o.kind !== 'start') : prev
          return [...base, newObj]
        })
        setSelectedId(newObj.id); setActiveTool(null)
      }
    } else {
      // Select existing object
      const clickable = Object.values(meshMapRef.current)
      const hits = raycaster.intersectObjects(clickable, true)
      if (hits.length > 0) {
        let obj = hits[0].object
        while (obj.parent && !obj.userData.objId) obj = obj.parent
        const id = obj.userData.objId as string | undefined
        if (id) setSelectedId(id)
        else setSelectedId(null)
      } else {
        setSelectedId(null)
      }
    }
  }

  // ── Play mode: first-person walk ─────────────────────────────────────────
  useEffect(() => {
    if (!playing) return
    playingRef.current = true
    scoreRef.current = 0
    setScore(0); setStatusMsg(null)

    // Disable orbit controls
    ctrlRef.current!.enabled = false

    // Find start position
    const startObj = objects.find(o => o.kind === 'start')
    const cam = camRef.current!
    cam.position.set(startObj?.x ?? 0, 1.7, (startObj?.z ?? 8))
    pitchRef.current = 0; yawRef.current = 0
    velRef.current = { x: 0, y: 0, z: 0 }

    // Collect-able coins
    coinsRef.current = objects
      .filter(o => o.kind === 'coin')
      .map(o => ({ id: o.id, collected: false, mesh: meshMapRef.current[o.id] }))

    // Build AABB list for collision from solid objects
    const solids = objects.filter(o => o.kind === 'ground' || o.kind === 'box' || o.kind === 'ramp')

    // Stop previous RAF, start new one
    cancelAnimationFrame(rafRef.current)
    let last = performance.now()

    const GRAVITY_3D = 18
    const WALK = 7
    const JUMP = 9
    let onGround = false, canJump = false

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.05); last = now

      // Mouse look (pointer-locked)
      const keys = keysRef.current
      const fwd = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current))
      const right = new THREE.Vector3( Math.cos(yawRef.current), 0, -Math.sin(yawRef.current))

      let mv = new THREE.Vector3()
      if (keys.has('KeyW') || keys.has('ArrowUp'))    mv.add(fwd)
      if (keys.has('KeyS') || keys.has('ArrowDown'))  mv.sub(fwd)
      if (keys.has('KeyA') || keys.has('ArrowLeft'))  mv.sub(right)
      if (keys.has('KeyD') || keys.has('ArrowRight')) mv.add(right)
      if (mv.lengthSq() > 0) mv.normalize().multiplyScalar(WALK)

      velRef.current.x = mv.x; velRef.current.z = mv.z
      velRef.current.y -= GRAVITY_3D * dt

      if ((keys.has('Space') || keys.has('KeyE')) && canJump) {
        velRef.current.y = JUMP; canJump = false
      }

      // Move + simple floor collision
      cam.position.x += velRef.current.x * dt
      cam.position.z += velRef.current.z * dt
      cam.position.y += velRef.current.y * dt

      // Simple ground collision (y = 1.7 above ground-level solids)
      onGround = false
      for (const s of solids) {
        const hw = s.sx / 2, hh = s.sy / 2, hz = s.sz / 2
        const px = cam.position.x, py = cam.position.y - 1.7, pz = cam.position.z
        if (px > s.x - hw - 0.3 && px < s.x + hw + 0.3 &&
            pz > s.z - hz - 0.3 && pz < s.z + hz + 0.3 &&
            py < s.y + hh + 0.1  && py + 0.2 > s.y - hh) {
          cam.position.y = s.y + hh + 1.7 + 0.01
          velRef.current.y = Math.max(0, velRef.current.y)
          onGround = true; canJump = true
        }
      }

      // Fall respawn
      if (cam.position.y < -15) {
        cam.position.set(startObj?.x ?? 0, 1.7, startObj?.z ?? 8)
        velRef.current = { x: 0, y: 0, z: 0 }
      }

      // Coin collection
      for (const coin of coinsRef.current) {
        if (coin.collected) continue
        const co = objects.find(o => o.id === coin.id)
        if (!co) continue
        const d = cam.position.distanceTo(new THREE.Vector3(co.x, co.y, co.z))
        if (d < 1.8) {
          coin.collected = true
          if (coin.mesh) coin.mesh.visible = false
          scoreRef.current += 10
          setScore(scoreRef.current)
        }
      }

      // Camera look direction
      cam.rotation.order = 'YXZ'
      cam.rotation.y = yawRef.current
      cam.rotation.x = pitchRef.current

      rendRef.current!.render(sceneRef.current!, cam)
    }
    loop(performance.now())

    // Pointer lock for mouse look
    const domEl = rendRef.current!.domElement
    const requestLock = () => domEl.requestPointerLock()
    domEl.addEventListener('click', requestLock)

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== domEl) return
      yawRef.current   -= e.movementX * 0.0015
      pitchRef.current -= e.movementY * 0.0015
      pitchRef.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitchRef.current))
    }
    document.addEventListener('mousemove', onMouseMove)

    const kd = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      if (e.code === 'Escape') { setPlaying(false) }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    }
    const ku = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)

    return () => {
      playingRef.current = false
      cancelAnimationFrame(rafRef.current)
      ctrlRef.current!.enabled = true
      document.exitPointerLock()
      domEl.removeEventListener('click', requestLock)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
      // Restore orbit loop
      const orbitLoop = () => {
        rafRef.current = requestAnimationFrame(orbitLoop)
        ctrlRef.current!.update()
        rendRef.current!.render(sceneRef.current!, camRef.current!)
      }
      orbitLoop()
      // Reset coin visibility
      coinsRef.current.forEach(c => { if (c.mesh) c.mesh.visible = true })
    }
  }, [playing, objects])

  const selectedObj = objects.find(o => o.id === selectedId)
  const tools: ObjKind3D[] = ['ground', 'box', 'sphere', 'ramp', 'coin', 'start', 'light']

  const tbtn: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)',
    fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        <button onClick={onBack} style={tbtn}>← Back</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#e0e7ff' }}>3D World</span>
        {score > 0 && <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700 }}>🪙 {score}</span>}
        {statusMsg && <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>{statusMsg}</span>}
        <div style={{ flex: 1 }} />
        {!playing && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Pick a tool → click the floor to place  ·  Click object to select
        </span>}
        {playing && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          Click canvas to capture mouse  ·  WASD to walk  ·  Space to jump  ·  ESC to stop
        </span>}
        {!playing && <button onClick={() => { setObjects([]); setSelectedId(null) }} style={tbtn}>🗑 Clear</button>}
        <button
          onClick={() => setPlaying(p => !p)}
          style={{ ...tbtn, background: playing ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)',
                   color: playing ? '#f87171' : '#4ade80', border: `1px solid ${playing ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}` }}
        >
          {playing ? '■ Stop' : '▶ Play (FPS)'}
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
            {tools.map(kind => (
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

        {/* Three.js viewport */}
        <div ref={mountRef} onClick={handleClick}
          style={{ flex: 1, position: 'relative', background: '#0f172a',
                   cursor: activeTool ? 'crosshair' : playing ? 'none' : 'grab' }} />

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
                {([
                  { label: 'X', field: 'x' }, { label: 'Y', field: 'y' }, { label: 'Z', field: 'z' },
                  { label: 'Scale X', field: 'sx' }, { label: 'Scale Y', field: 'sy' }, { label: 'Scale Z', field: 'sz' },
                  ...(selectedObj.kind === 'light' ? [{ label: 'Intensity', field: 'intensity' }] : []),
                  ...(selectedObj.kind === 'ramp'  ? [{ label: 'Rotation Y', field: 'rotY' }] : []),
                ] as { label: string; field: string }[]).map(({ label, field }) => (
                  <div key={selectedObj.id + '-' + field} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{label}</div>
                    <input type="number" step={0.5}
                      defaultValue={(selectedObj as Record<string, number>)[field] ?? 0}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v)) setObjects(prev => prev.map(o => o.id === selectedObj.id ? { ...o, [field]: v } : o))
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      style={{ width: '100%', padding: '5px 8px', background: 'rgba(255,255,255,0.08)',
                               border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                               color: '#e0e7ff', fontSize: 12, fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                  </div>
                ))}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Colour</div>
                  <input type="color" value={selectedObj.color}
                    onChange={(e) => setObjects(prev => prev.map(o => o.id === selectedObj.id ? { ...o, color: e.target.value } : o))}
                    style={{ width: '100%', height: 32, borderRadius: 6, border: 'none', cursor: 'pointer' }} />
                </div>
                <button onClick={() => { setObjects(prev => prev.filter(o => o.id !== selectedId)); setSelectedId(null) }}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                           background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 12,
                           cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: 12, width: '100%' }}>
                  🗑 Delete
                </button>
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, lineHeight: 1.6 }}>
                Pick a tool and click the ground to place objects. Click an object to select and edit it.
                <br /><br />
                Press <strong style={{ color: 'rgba(255,255,255,0.5)' }}>▶ Play</strong> to walk through your world in first-person.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
