import type { IconComponent } from './iconTones'
import type { ReactNode } from 'react'

// Titolo di pagina delle tab: 22/700 con il sottotitolo che dice a cosa
// serve la sezione. Tre forme, come nel mockup: con l'icona nuda (Auto), con
// l'icona in un cerchio tenue da 46 (Bacheca, Spese) o solo testo (Radar).
interface PageTitleProps {
  title: string
  hint?: string
  icon?: IconComponent
  iconStyle?: 'bare' | 'circle'
  action?: ReactNode
  className?: string
}

export default function PageTitle({ title, hint, icon: Icon, iconStyle = 'circle', action, className = '' }: PageTitleProps) {
  const circle = Icon && iconStyle === 'circle'
  return (
    <div className={`flex shrink-0 items-center ${circle ? 'min-h-[46px] gap-[9px]' : 'gap-2'} ${className}`}>
      {Icon &&
        (circle ? (
          <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-brand-soft">
            <Icon aria-hidden="true" size={23} strokeWidth={2} className="text-brand-button" />
          </span>
        ) : (
          <Icon aria-hidden="true" size={26} strokeWidth={1.8} className="ml-px shrink-0 text-fg" />
        ))}
      <div className="min-w-0">
        <h2 className="text-[22px] font-bold leading-none tracking-[-0.4px] text-fg">{title}</h2>
        {hint && (
          <p className={`text-[11.5px] leading-[1.25] text-fg-muted ${circle ? 'mt-1' : 'mt-[3px]'}`}>{hint}</p>
        )}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  )
}
