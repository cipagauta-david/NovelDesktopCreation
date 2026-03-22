import React from 'react'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message }
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error', error, info)
  }

  handleReset = () => {
    try {
      localStorage.removeItem('ndc-mvp-state-v3')
      localStorage.removeItem('ndc-mvp-state-v2')
    } catch {}
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem' }}>
          <h3>Se detectó un error en la interfaz</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{this.state.message}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={() => window.location.reload()}>Recargar</button>
            <button onClick={this.handleReset}>Limpiar seeds y recargar</button>
            <button onClick={() => console.log('Dumping state for debug', { userAgent: navigator.userAgent })}>Imprimir debug</button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
