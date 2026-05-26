export type GameType = '2d' | '3d'

// ─── 2D ───────────────────────────────────────────────────────────────────────
export type ObjKind2D =
  | 'player'    // controllable character
  | 'platform'  // solid floor/shelf
  | 'wall'      // solid vertical barrier
  | 'enemy'     // kills player on contact
  | 'coin'      // collect for points
  | 'spike'     // kills player on contact
  | 'spring'    // bounces player high
  | 'goal'      // reaching this wins the level

export interface GObj2D {
  id: string
  kind: ObjKind2D
  x: number        // world px (left edge)
  y: number        // world px (top edge)
  w: number
  h: number
  color: string
  speed?: number        // enemy patrol px/s
  patrolDist?: number   // enemy patrol range px
  points?: number       // coin value
}

// ─── 3D ───────────────────────────────────────────────────────────────────────
export type ObjKind3D =
  | 'ground'   // large flat floor
  | 'box'      // cube/cuboid obstacle
  | 'sphere'   // ball obstacle
  | 'ramp'     // angled wedge
  | 'coin'     // collect for points
  | 'start'    // player spawn position
  | 'light'    // point light

export interface GObj3D {
  id: string
  kind: ObjKind3D
  x: number
  y: number
  z: number
  sx: number    // scale / size X
  sy: number    // scale / size Y
  sz: number    // scale / size Z
  color: string
  rotY?: number       // rotation Y in degrees
  intensity?: number  // light intensity
}
