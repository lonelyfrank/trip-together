import { Fuel, House, type LucideIcon, Receipt, ShoppingCart, Ticket, UtensilsCrossed } from 'lucide-react'
import type { IconTone } from '../ui/iconTones'

// Le spese non hanno una categoria nello schema: l'icona si ricava dalla
// descrizione, e senza una parola riconoscibile resta lo scontrino neutro.
const RULES: { test: RegExp; icon: LucideIcon; tone: IconTone }[] = [
  { test: /casa|alloggio|appartament|hotel|b&b|airbnb|affitto|campeggio/i, icon: House, tone: 'brand' },
  { test: /pranzo|cena|colazione|ristorant|pizz|trattoria|aperitiv|bar\b|gelat/i, icon: UtensilsCrossed, tone: 'blue' },
  { test: /spesa|supermerc|conad|coop|esselunga|market|alimentar/i, icon: ShoppingCart, tone: 'brand' },
  { test: /benzin|carburant|diesel|pieno|pedagg|autostrad|parchegg/i, icon: Fuel, tone: 'warning' },
  { test: /bigliett|ingress|museo|concerto|tour|escursion|noleggio|lido|ombrellon/i, icon: Ticket, tone: 'purple' },
]

export function expenseCategory(label: string): { icon: LucideIcon; tone: IconTone } {
  return RULES.find((rule) => rule.test.test(label)) ?? { icon: Receipt, tone: 'grey' }
}
