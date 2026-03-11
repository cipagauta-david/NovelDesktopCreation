import { useState } from 'react'

import { providerModels } from '../data/constants'
import type { OnboardingPayload, Provider } from '../types/workspace'

type OnboardingScreenProps = {
  onSubmit: (payload: OnboardingPayload) => void
}

export function OnboardingScreen({ onSubmit }: OnboardingScreenProps) {
  const [authorName, setAuthorName] = useState('')
  const [provider, setProvider] = useState<Provider>('OpenRouter')
  const [model, setModel] = useState(providerModels.OpenRouter[0])
  const [apiKey, setApiKey] = useState('')

  return (
    <main className="onboarding-shell">
      <section className="hero-panel">
        <div className="eyebrow">Primer paso</div>
        <h1>Organiza tu novela, tu mundo y tus ideas en un solo lugar.</h1>
        <p>
          Prepara tu espacio creativo en menos de un minuto. Elige cómo quieres usar la IA y entra
          a escribir con colecciones, entidades, referencias cruzadas y vista de relaciones.
        </p>

        <div className="hero-grid">
          <article className="hero-feature">
            <strong>Todo en contexto</strong>
            <span>Escenas, personajes, lugares y notas conectadas en un mismo flujo.</span>
          </article>
          <article className="hero-feature">
            <strong>Escritura con estructura</strong>
            <span>Documento libre, propiedades reutilizables y plantillas para arrancar rápido.</span>
          </article>
          <article className="hero-feature">
            <strong>Referencias vivas</strong>
            <span>{'{{}}'} para enlazar ideas, previsualizarlas y moverte entre ellas sin perder foco.</span>
          </article>
          <article className="hero-feature">
            <strong>IA bajo control</strong>
            <span>Sugerencias útiles, confirmación explícita y distintos modelos según tu estilo.</span>
          </article>
        </div>
      </section>

      <form
        className="onboarding-card"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({ authorName, provider, model, apiKey })
        }}
      >
        <div className="section-title">
          <span className="eyebrow">Onboarding</span>
          <h2>Empieza en menos de un minuto</h2>
        </div>

        <label>
          Tu nombre o perfil creativo
          <input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Ej. David · space opera política"
          />
        </label>

        <div className="inline-grid">
          <label>
            Proveedor
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
          </label>

          <label>
            Modelo
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              {providerModels[provider].map((modelOption) => (
                <option key={modelOption} value={modelOption}>
                  {modelOption}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          API key o token
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-or-v1-..."
            type="password"
            autoComplete="current-password"
          />
          <small className="form-hint">Déjalo vacío si solo quieres entrar al modo local o demo.</small>
        </label>

        <button className="primary-button" type="submit">
          Entrar al espacio de trabajo
        </button>
      </form>
    </main>
  )
}
