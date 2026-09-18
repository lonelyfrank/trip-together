// L'app non ha foto profilo (nessuna colonna, nessuno storage): l'identità
// visiva è l'iniziale del nome su un colore stabile derivato dall'id-membro,
// così la stessa persona ha sempre lo stesso colore in tutte le sezioni.
// Se un giorno arriveranno le immagini, basterà aggiungere `src` qui.

const PALETTE = ['bg-accent/15 text-accent', 'bg-warn/15 text-warn', 'bg-info/15 text-info', 'bg-danger/15 text-danger'] as const

const SIZES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-12 w-12 text-base',
} as const

function toneFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface AvatarProps {
  name: string
  seed?: string
  size?: keyof typeof SIZES
  className?: string
}

export default function Avatar({ name, seed, size = 'md', className = '' }: AvatarProps) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${toneFor(seed ?? name)} ${SIZES[size]} ${className}`}
    >
      {initial}
    </span>
  )
}

interface AvatarGroupProps {
  people: { id: string; display_name: string }[]
  max?: number
  size?: keyof typeof SIZES
}

/** Avatar sovrapposti con "+N": il conteggio resta leggibile anche a 10 membri. */
export function AvatarGroup({ people, max = 4, size = 'sm' }: AvatarGroupProps) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((person) => (
          <Avatar
            key={person.id}
            name={person.display_name}
            seed={person.id}
            size={size}
            className="ring-2 ring-surface"
          />
        ))}
      </div>
      {rest > 0 && (
        <span className={`-ml-2 inline-flex items-center justify-center rounded-full bg-canvas font-semibold text-fg-muted ring-2 ring-surface ${SIZES[size]}`}>
          +{rest}
        </span>
      )}
      <span className="sr-only">{people.map((p) => p.display_name).join(', ')}</span>
    </div>
  )
}
