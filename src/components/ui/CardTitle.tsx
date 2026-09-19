import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ICON_TONES, type IconTone } from './iconTones'

// Riga titolo delle card del mockup: icona in un cerchio tenue, titolo
// 12.5/700 che si tronca, chevron o azione a destra.

interface CardTitleProps {
  icon: LucideIcon
  title: string
  tone?: IconTone
  /** Diametro del cerchio: 26 nelle card standard, 27 in Stanza. */
  circle?: number
  chevron?: boolean
  action?: ReactNode
  as?: 'h2' | 'h3'
  /** Icona nuda (senza cerchio), come in Radar. */
  bare?: boolean
}

export default function CardTitle({
  icon: Icon,
  title,
  tone = 'brand',
  circle = 26,
  chevron = false,
  action,
  as: Tag = 'h3',
  bare = false,
}: CardTitleProps) {
  const colors = ICON_TONES[tone]
  return (
    <div className="flex items-center gap-[7px]" style={{ height: bare ? 22 : circle }}>
      {bare ? (
        <span className="flex h-[22px] w-4 shrink-0 items-center justify-center">
          <Icon aria-hidden="true" size={11} strokeWidth={2} className={colors.icon} />
        </span>
      ) : (
        <span
          className={`flex shrink-0 items-center justify-center rounded-full ${colors.circle}`}
          style={{ width: circle, height: circle }}
        >
          <Icon aria-hidden="true" size={14} strokeWidth={2} className={colors.icon} />
        </span>
      )}
      <Tag className="min-w-0 flex-1 truncate text-[12.5px] font-bold leading-[1.15] text-fg">{title}</Tag>
      {action}
      {chevron && <ChevronRight aria-hidden="true" size={14} strokeWidth={2.2} className="shrink-0 text-fg-muted" />}
    </div>
  )
}
