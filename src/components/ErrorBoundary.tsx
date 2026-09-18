import { Component, type ErrorInfo, type ReactNode } from 'react'
import Button from './ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Rete di sicurezza per errori di render non gestiti: senza, un'eccezione in
// una qualunque tab lascia una schermata bianca senza via d'uscita, su
// un'app pensata per l'uso in mobilità dove un semplice "torna indietro"
// spesso non basta.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-danger">Qualcosa è andato storto.</p>
        <p className="font-mono text-[11px] text-fg-muted">{this.state.error.message}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Ricarica
        </Button>
      </div>
    )
  }
}
