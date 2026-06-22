'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { TeamAvatar } from '@/components/ui/team-avatar'

export const TEAM_COLOR_PRESETS = [
  '#dc2626', // Red
  '#ea580c', // Orange
  '#d97706', // Amber
  '#16a34a', // Green
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#475569', // Slate
  '#0f172a', // Dark
]

interface Props {
  teamName: string
  logoUrl: string | null
  primaryColor: string | null
  onLogoUrlChange: (url: string | null) => void
  onColorChange: (color: string | null) => void
}

export function TeamAvatarPicker({ teamName, logoUrl, primaryColor, onLogoUrlChange, onColorChange }: Props) {
  const [urlInput, setUrlInput] = useState(logoUrl ?? '')
  const [showUrlField, setShowUrlField] = useState(!!logoUrl)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <TeamAvatar name={teamName || 'TM'} logoUrl={logoUrl} primaryColor={primaryColor} size="lg" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Team Avatar</p>
          <p className="text-xs text-text-secondary">Pick a colour or paste a logo URL</p>
        </div>
      </div>

      {/* Colour swatches */}
      <div className="flex flex-wrap gap-2">
        {TEAM_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => { onColorChange(color); onLogoUrlChange(null); setUrlInput('') }}
            className="relative h-7 w-7 rounded-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            style={{ background: color }}
            title={color}
          >
            {primaryColor === color && !logoUrl && (
              <Check size={12} className="absolute inset-0 m-auto text-white drop-shadow" />
            )}
          </button>
        ))}
        {/* Clear / custom */}
        <button
          type="button"
          onClick={() => { onColorChange(null); onLogoUrlChange(null); setUrlInput('') }}
          className="h-7 w-7 rounded-lg border border-dashed border-border flex items-center justify-center text-text-muted text-xs hover:border-brand-500 transition-colors"
          title="Clear"
        >
          ✕
        </button>
      </div>

      {/* Logo URL toggle */}
      <button
        type="button"
        onClick={() => setShowUrlField((v) => !v)}
        className="text-xs text-text-muted hover:text-brand-400 underline underline-offset-2 transition-colors"
      >
        {showUrlField ? 'Hide' : '+ Custom logo URL'}
      </button>

      {showUrlField && (
        <div className="space-y-1">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value)
              onLogoUrlChange(e.target.value || null)
            }}
            placeholder="https://example.com/logo.png"
            className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
