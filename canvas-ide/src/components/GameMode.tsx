import { useState } from 'react'
import { useStore } from '../store/useStore'
import { GameMode2D } from './GameMode2D'
import { GameMode3D } from './GameMode3D'
import type { GameType } from '../types/game'

export function GameMode() {
  const { gameModeOpen, closeGameMode } = useStore()
  const [gameType, setGameType] = useState<GameType | null>(null)

  if (!gameModeOpen) return null

  function handleBack() {
    setGameType(null)
  }

  function handleClose() {
    setGameType(null)
    closeGameMode()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#0f1729',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
    }}>
      {gameType === '2d' && <GameMode2D onBack={handleBack} />}
      {gameType === '3d' && <GameMode3D onBack={handleBack} />}

      {!gameType && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      flex: 1, gap: 48, padding: 32 }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎮</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e0e7ff', margin: 0, letterSpacing: '-0.02em' }}>
              Game Mode
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginTop: 10, maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
              Build and play your own games — place objects visually, then hit Play to jump right in.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
            <GameTypeCard
              type="2d"
              title="2D Platformer"
              emoji="🏃"
              description="Build a side-scrolling platformer with platforms, enemies, coins, springs and more. Physics included."
              features={['Gravity & jump physics', 'Enemy patrol AI', 'Coins & scoring', 'Springs & spikes', 'Goal flag to win']}
              accent="#6366f1"
              onSelect={setGameType}
            />
            <GameTypeCard
              type="3d"
              title="3D World"
              emoji="🌍"
              description="Place 3D objects and walk through your creation in first-person. Collect coins and explore."
              features={['Full 3D scene builder', 'First-person walkthrough', 'Orbit camera in editor', 'Lighting & shadows', 'Coin collection']}
              accent="#10b981"
              onSelect={setGameType}
            />
          </div>

          {/* Close */}
          <button
            onClick={handleClose}
            style={{
              padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            ← Back to Canvas
          </button>
        </div>
      )}
    </div>
  )
}

function GameTypeCard({ type, title, emoji, description, features, accent, onSelect }: {
  type: GameType
  title: string
  emoji: string
  description: string
  features: string[]
  accent: string
  onSelect: (t: GameType) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => onSelect(type)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 300, padding: '28px 26px', borderRadius: 20, textAlign: 'left',
        border: `1.5px solid ${hovered ? accent : 'rgba(255,255,255,0.1)'}`,
        background: hovered ? `${accent}18` : 'rgba(255,255,255,0.04)',
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        transition: 'all 0.2s', transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? `0 16px 48px ${accent}30` : 'none',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#e0e7ff', marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 18 }}>
        {description}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: `${accent}30`,
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           fontSize: 9, color: accent, flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 22, padding: '10px 0', borderRadius: 10, textAlign: 'center',
                    background: hovered ? accent : `${accent}20`,
                    color: hovered ? '#fff' : accent, fontWeight: 600, fontSize: 13,
                    transition: 'all 0.2s' }}>
        Start Building →
      </div>
    </button>
  )
}
