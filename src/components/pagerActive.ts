import { createContext, useContext } from 'react'

// Vero solo per la pagina corrente del pager. Durante l'animazione di uscita
// una pagina resta montata per qualche centinaio di millisecondi: chi deve
// fermarsi subito quando si cambia sezione (il radar) legge questo, non lo
// smontaggio.
export const PagerActiveContext = createContext(true)

export function usePagerActive(): boolean {
  return useContext(PagerActiveContext)
}
