import type { CSSProperties } from 'react'

// Lo schema non ha foto profilo: l'identità visiva è l'iniziale del nome su
// un colore stabile derivato dall'id-membro, così la stessa persona ha lo
// stesso colore in tutte le sezioni. Tinte piene della palette del mockup,
// ognuna regge il testo bianco.
const PALETTE = ['bg-brand-button', 'bg-blue', 'bg-purple', 'bg-warning-text', 'bg-danger-text', 'bg-fg-soft'] as const

const SIZES = {
  xs: 16,
  sm: 25,
  md: 32,
  lg: 40,
} as const

function toneFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface AvatarProps {
  name: string
  seed?: string
  /** Diametro: un nome della scala o i pixel del mockup (27, 37, 58…). */
  size?: keyof typeof SIZES | number
  className?: string
  style?: CSSProperties
}

export default function Avatar({ name, seed, size = 'md', className = '', style }: AvatarProps) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  const px = typeof size === 'number' ? size : SIZES[size]
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${toneFor(seed ?? name)} ${className}`}
      style={{ width: px, height: px, fontSize: Math.max(8, Math.round(px * 0.42)), ...style }}
    >
      {initial}
    </span>
  )
}

interface AvatarGroupProps {
  people: { id: string; display_name: string }[]
  max?: number
  size?: keyof typeof SIZES | number
}

/** AvatarStack del mockup: volti sovrapposti con bordo bianco e "+N". */
export function AvatarGroup({ people, max = 4, size = 26 }: AvatarGroupProps) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  const px = typeof size === 'number' ? size : SIZES[size]
  return (
    <div className="flex items-center">
      {shown.map((person) => (
        <Avatar
          key={person.id}
          name={person.display_name}
          seed={person.id}
          size={px}
          className="-mr-0.5 border-[1.5px] border-surface"
        />
      ))}
      {rest > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full border-[1.5px] border-surface bg-track text-[9.5px] font-semibold text-fg-muted"
          style={{ width: px, height: px }}
        >
          +{rest}
        </span>
      )}
      <span className="sr-only">{people.map((p) => p.display_name).join(', ')}</span>
    </div>
  )
}
