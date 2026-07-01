import { useState } from 'react'

import { providerModels } from '../../data/constants'
import type { OnboardingPayload, Provider } from '../../types/workspace'
import { Field } from '../common/Field'
import { Button } from '../ui/Button'
import '../../styles/onboarding/OnboardingScreen.css';



type OnboardingScreenProps = {
  onSubmit: (payload: OnboardingPayload) => void
}

export function OnboardingScreen({ onSubmit }: OnboardingScreenProps) {
  const [view, setView] = useState<'landing' | 'onboarding'>('landing')
  const [authorName, setAuthorName] = useState('')
  const [provider, setProvider] = useState<Provider>('OpenRouter')
  const [model, setModel] = useState(providerModels.OpenRouter[0])
  const [apiKey, setApiKey] = useState('')
  const [streamEnabled, setStreamEnabled] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  if (view === 'landing') {
    return (
      <main className="onboarding-shell">
        <section className="hero-panel" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div className="eyebrow">La nueva forma de crear universos</div>
          <h1>Escribe con una IA que respeta tu visión.</h1>
          <p>
            El único espacio de trabajo creativo donde las sugerencias de la IA están 100% bajo tu control.
            Organiza entidades, descubre conexiones ocultas y da vida a tus historias sin perder tu voz.
          </p>
          
          <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--surface-sunken)' }}>
            <span style={{ fontSize: '3rem' }}>🌌</span>
            <p><strong>Vista Previa del Espacio de Trabajo</strong></p>
            <small style={{ color: 'var(--text-secondary)' }}>Interfaz orientada a escritores creativos, libre de distracciones.</small>
          </div>

          <Button className="primary-button" variant="primary" type="button" onClick={() => setView('onboarding')} style={{ fontSize: '1.25rem', padding: '0.75rem 2rem' }}>
            Empieza a diseñar tu mundo
          </Button>

          <div className="hero-grid" style={{ marginTop: '3rem', textAlign: 'left' }}>
            <article className="hero-feature">
              <strong>IA bajo control radical</strong>
              <span>Tú decides cuándo pedir ideas y cuándo confirmar sugerencias. La IA nunca impone, solo propone.</span>
            </article>
            <article className="hero-feature">
              <strong>Escenas vivas y conectadas</strong>
              <span>Observa cómo evolucionan tus personajes con un sistema de referencias visual que evita que pierdas el hilo narrativo.</span>
            </article>
            <article className="hero-feature">
              <strong>Adiós al síndrome del lienzo en blanco</strong>
              <span>Gira tu historia con desarrollos de conflictos y propuestas narrativas instantáneas.</span>
            </article>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="onboarding-shell">
      <form
        className="onboarding-card"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({ authorName, provider, model, apiKey, streamEnabled })
        }}
      >
        <div className="section-title">
          <button type="button" onClick={() => setView('landing')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>← Volver</button>
          <br /><br />
          <h2>¿Cómo quieres configurar tu espacio?</h2>
        </div>

        <Field label="¿Cómo deberíamos llamarte? (Tu nombre o pseudónimo)">
          <input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Ej. David · space opera política"
          />
        </Field>

        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Button 
            className="primary-button" 
            variant="primary" 
            type="button" 
            onClick={() => onSubmit({ authorName, provider: 'Local/Ollama', model: 'demo', apiKey: '' })}
          >
            Probar sin API key — Modo demo
          </Button>
          
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>o</div>
          
          <Button 
            variant="ghost" 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            {showAdvanced ? 'Ocultar configuración de IA propia' : 'Conectar mi propia IA (API Key)'}
          </Button>
        </div>

        {showAdvanced && (
          <div className="advanced-config">
            <div className="inline-grid">
              <Field label="Proveedor IA">
                <select
                  value={provider}
                  onChange={(event) => {
                    const nextProvider = event.target.value as Provider
                    setProvider(nextProvider)
                    setModel(providerModels[nextProvider][0])
                  }}
                >
                  {Object.keys(providerModels).map((providerOption) => (
                    <option key={providerOption} value={providerOption}>
                      {providerOption}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Modelo a utilizar">
                <select value={model} onChange={(event) => setModel(event.target.value)}>
                  {providerModels[provider].map((modelOption) => (
                    <option key={modelOption} value={modelOption}>
                      {modelOption}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Tu API Key">
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-or-v1-..."
                type="password"
                autoComplete="current-password"
              />
            </Field>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={streamEnabled}
                onChange={(e) => setStreamEnabled(e.target.checked)}
              />
              <span>Streaming (respuesta token por token)</span>
            </label>

            <label className="checkbox-label checkbox-privacy">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              />
              Entiendo que mi API key se guardará localmente. <a href="#">Ver Política de Privacidad</a>.
            </label>

            <Button
              className="primary-button"
              variant="primary"
              type="submit"
              disabled={!acceptedPrivacy || !apiKey}
            >
              Guardar configuración y Entrar
            </Button>
          </div>
        )}
      </form>
    </main>
  )
}
