import type { SVGProps } from 'react'

// Le icone del mockup che lucide non ha nella stessa forma: la bacheca
// (foglio con righe), le monete impilate di Spese, la strada e la valigia.
// Accettano le stesse prop principali delle icone lucide (size,
// strokeWidth), così si usano negli stessi punti.
interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string
}

function Svg({ size = 24, strokeWidth = 2, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function BoardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M7 9h10M7 13h10M7 17h6" />
    </Svg>
  )
}

export function CoinsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </Svg>
  )
}

export function RoadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 21V8M20 21V8M2 8h20M7 8v13M17 8v13M4 3h16v5" />
    </Svg>
  )
}

/** Valigia piena dei "Bagagli": il colore distingue le valigie, non lo stato. */
export function SuitcaseGlyph({ className = '' }: { className?: string }) {
  return (
    <svg width="17" height="24" viewBox="0 0 17 24" aria-hidden="true" className={className}>
      <rect x="5" y="0.8" width="7" height="4.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="0.5" y="4" width="16" height="17" rx="3.5" fill="currentColor" />
      <rect x="3.4" y="7" width="1.4" height="11" rx=".7" fill="white" opacity=".45" />
      <rect x="12.2" y="7" width="1.4" height="11" rx=".7" fill="white" opacity=".45" />
      <circle cx="4.2" cy="22.4" r="1.2" fill="currentColor" />
      <circle cx="12.8" cy="22.4" r="1.2" fill="currentColor" />
    </svg>
  )
}
