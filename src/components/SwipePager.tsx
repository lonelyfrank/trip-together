import { type PointerEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PagerActiveContext } from './pagerActive'

// Pager orizzontale delle tab della stanza, con pointer events scritti a
// mano (nessuna libreria di gesture).
//
// - Si monta solo la pagina visibile, più la vicina mentre la si trascina o
//   durante l'animazione: le tab non sono duplicate nel DOM. Conta anche
//   per il radar, che deve spegnersi quando si esce dalla sua sezione.
// - Ogni pagina ha il proprio scroll verticale, ricordato per tab.
// - Lo swipe parte solo se il gesto è chiaramente orizzontale
//   (|dx| > 1.5·|dy|) e si conferma oltre 60 px; mappe, slider, campi di
//   testo e pannelli aperti non lo avviano mai.
// - L'indice arriva da fuori (l'URL): il pager anima verso qualunque indice
//   nuovo, sia che arrivi dal suo swipe, sia da un tap sulla barra.

const COMMIT_PX = 60
const START_PX = 8
const DURATION_MS = 280
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const IGNORE = 'input, textarea, select, [contenteditable], [role="slider"], [data-no-swipe], dialog'

interface SwipePagerProps {
  count: number
  index: number
  onIndexChange: (index: number) => void
  renderPage: (index: number) => ReactNode
  /** Etichetta di ogni pagina per le tecnologie assistive. */
  labelFor: (index: number) => string
}

interface Anim {
  from: number
  to: number
  /** Spostamento già fatto col dito quando l'animazione parte. */
  startPx: number
  running: boolean
}

type Gesture = { id: number; x: number; y: number; mode: 'pending' | 'drag' | 'scroll' }

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function SwipePager({ count, index, onIndexChange, renderPage, labelFor }: SwipePagerProps) {
  const [shown, setShown] = useState(index)
  const [drag, setDrag] = useState<number | null>(null)
  const [anim, setAnim] = useState<Anim | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const scrollTops = useRef(new Map<number, number>())
  // Meta di uno swipe appena confermato: finché l'URL non la raggiunge,
  // l'indice vecchio in arrivo da fuori non deve far tornare indietro.
  const requested = useRef<number | null>(null)

  // Un indice nuovo che non è già la meta dell'animazione in corso: parte
  // una transizione dalla pagina visibile a quella richiesta.
  useEffect(() => {
    if (requested.current !== null) {
      if (index !== requested.current) return
      requested.current = null
    }
    if (index === shown && !anim) return
    if (anim?.to === index) return
    if (prefersReducedMotion()) {
      setAnim(null)
      setShown(index)
      return
    }
    setAnim({ from: anim ? anim.to : shown, to: index, startPx: 0, running: false })
  }, [index, shown, anim])

  // Primo frame nella posizione di partenza, il successivo con la
  // transizione: senza il doppio passaggio il browser salterebbe l'animazione.
  useEffect(() => {
    if (!anim || anim.running) return
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnim((current) => (current === anim ? { ...current, running: true } : current))),
    )
    return () => cancelAnimationFrame(frame)
  }, [anim])

  useEffect(() => {
    if (!anim?.running) return
    const timer = setTimeout(() => {
      setShown(anim.to)
      setAnim(null)
    }, DURATION_MS + 20)
    return () => clearTimeout(timer)
  }, [anim])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (anim || (event.pointerType === 'mouse' && event.button !== 0)) return
    if ((event.target as Element).closest(IGNORE)) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, mode: 'pending' }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId || g.mode === 'scroll') return
    const dx = event.clientX - g.x
    const dy = event.clientY - g.y
    if (g.mode === 'pending') {
      if (Math.abs(dx) < START_PX && Math.abs(dy) < START_PX) return
      if (Math.abs(dx) > 1.5 * Math.abs(dy)) {
        g.mode = 'drag'
        event.currentTarget.setPointerCapture(event.pointerId)
      } else {
        g.mode = 'scroll'
        return
      }
    }
    // Ai bordi (prima e ultima tab) il dito "tira" con resistenza.
    const atEdge = (dx > 0 && shown === 0) || (dx < 0 && shown === count - 1)
    setDrag(atEdge ? dx / 3 : dx)
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.id !== event.pointerId) return
    gesture.current = null
    if (g.mode !== 'drag' || drag === null) {
      setDrag(null)
      return
    }
    suppressClick.current = true
    const target = drag <= -COMMIT_PX ? shown + 1 : drag >= COMMIT_PX ? shown - 1 : shown
    setDrag(null)
    if (target < 0 || target >= count || target === shown) {
      if (Math.abs(drag) > 1 && !prefersReducedMotion()) {
        // Torna in posizione con la stessa curva dell'avanzamento.
        setAnim({ from: shown, to: shown, startPx: drag, running: false })
      }
      return
    }
    requested.current = target
    if (prefersReducedMotion()) {
      setShown(target)
    } else {
      setAnim({ from: shown, to: target, startPx: drag, running: false })
    }
    onIndexChange(target)
  }

  // Un trascinamento finisce con un pointerup sopra una card: quel click
  // non deve aprire niente.
  function onClickCapture(event: React.MouseEvent) {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  // Posizione di ogni pagina montata, in percentuale della larghezza più i
  // pixel del dito.
  const pages: { index: number; transform: string }[] = []
  if (anim) {
    const dir = Math.sign(anim.to - anim.from)
    if (dir === 0) {
      pages.push({ index: anim.from, transform: anim.running ? 'translateX(0)' : `translateX(${anim.startPx}px)` })
    } else {
      pages.push({
        index: anim.from,
        transform: anim.running ? `translateX(${-dir * 100}%)` : `translateX(${anim.startPx}px)`,
      })
      pages.push({
        index: anim.to,
        transform: anim.running ? 'translateX(0)' : `translateX(calc(${dir * 100}% + ${anim.startPx}px))`,
      })
    }
  } else if (drag !== null) {
    pages.push({ index: shown, transform: `translateX(${drag}px)` })
    const neighbour = drag < 0 ? shown + 1 : shown - 1
    if (neighbour >= 0 && neighbour < count) {
      pages.push({ index: neighbour, transform: `translateX(calc(${drag < 0 ? 100 : -100}% + ${drag}px))` })
    }
  } else {
    pages.push({ index: shown, transform: 'translateX(0)' })
  }
  const settled = !anim && drag === null

  return (
    <div
      className="relative min-h-0 flex-1 touch-pan-y overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onClickCapture={onClickCapture}
    >
      {[...pages]
        .sort((a, b) => a.index - b.index)
        .map((page) => (
          <PagerPage
            key={page.index}
            label={labelFor(page.index)}
            current={page.index === (anim ? anim.to : shown)}
            transform={page.transform}
            transition={anim?.running ? `transform ${DURATION_MS}ms ${EASING}` : 'none'}
            settled={settled}
            savedTop={scrollTops.current.get(page.index) ?? 0}
            onScroll={(top) => scrollTops.current.set(page.index, top)}
          >
            {renderPage(page.index)}
          </PagerPage>
        ))}
    </div>
  )
}

interface PagerPageProps {
  label: string
  current: boolean
  transform: string
  transition: string
  settled: boolean
  savedTop: number
  onScroll: (top: number) => void
  children: ReactNode
}

function PagerPage({ label, current, transform, transition, settled, savedTop, onScroll, children }: PagerPageProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Solo al montaggio: la pagina riappare dove l'avevi lasciata.
  const initialTop = useRef(savedTop)
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = initialTop.current
  }, [])

  return (
    <section
      ref={ref}
      aria-label={label}
      aria-hidden={!current || undefined}
      inert={!current || undefined}
      onScroll={(event) => onScroll(event.currentTarget.scrollTop)}
      className="absolute inset-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
      style={{ transform: settled ? undefined : transform, transition, willChange: settled ? undefined : 'transform' }}
    >
      <PagerActiveContext.Provider value={current}>{children}</PagerActiveContext.Provider>
    </section>
  )
}
