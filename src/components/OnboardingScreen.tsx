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
        <div className="eyebrow">NovelDesktopCreation · functional MVP</div>
        <h1>Workspace narrativo local-first, organizado y listo para producir.</h1>
        <p>
          Configura proveedor, modelo y perfil creativo sin fricción. OpenRouter ya forma parte del
          flujo desde el minuto cero para abrir el abanico de modelos sin acoplar la UX a un solo
          vendor.
        </p>

        <div className="hero-grid">
          <article className="hero-feature">
            <strong>Menos ruido</strong>
            <span>Paneles colapsables, menús compactos y foco editorial claro.</span>
          </article>
          <article className="hero-feature">
            <strong>Módulos separados</strong>
            <span>Tipos, datos, utilidades, hook de estado y componentes desacoplados.</span>
          </article>
          <article className="hero-feature">
            <strong>Referencias vivas</strong>
            <span>{'{{}}'} estructurado, preview, navegación segura y grafo derivado.</span>
          </article>
          <article className="hero-feature">
            <strong>IA con control</strong>
            <span>Propuestas confirmables, prompts por tab y proveedores múltiples.</span>
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
          <h2>Deja el sistema operativo en menos de un minuto</h2>
        </div>

        <label>
          Perfil creativo
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
          API key / token
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-or-v1-..."
            type="password"
            autoComplete="current-password"
          />
        </label>

        <button className="primary-button" type="submit">
          Entrar al workspace
        </button>
      </form>
    </main>
  )
}
