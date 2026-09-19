// Immagini del mockup (handoff Claude Design), in un solo posto.
//
// Sono tutte decorative: lo schema non ha foto di copertina, foto profilo o
// modelli d'auto, quindi nessuna di queste immagini rappresenta un dato
// dell'evento. Le foto delle persone del mockup restano fuori apposta: su un
// membro reale sarebbero la faccia di qualcun altro.
//
// Il glob (e non un import per file) rende un'immagine mancante un
// `undefined` invece di un errore di build: chi la usa ricade sul proprio
// fondo a gradiente.
const files = import.meta.glob<string>('../assets/*.png', { eager: true, import: 'default' })

function asset(name: string): string | undefined {
  return files[`../assets/${name}.png`]
}

export const ASSETS = {
  /** Logo Trip Together dell'header (38×31). */
  logo: asset('logo'),
  /** Copertina dell'hero: mare e borgo, nessun luogo reale dell'evento. */
  hero: asset('hero'),
  /** Miniatura tonda dell'evento nell'header. */
  trip: asset('trip'),
  /** Illustrazione di un'auto bianca generica. */
  car: asset('car'),
  /** Foto decorativa del "Piano di oggi". */
  lunch: asset('lunch'),
} as const
