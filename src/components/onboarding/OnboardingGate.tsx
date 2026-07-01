import type { ReactNode } from 'react'
import { OnboardingScreen } from './OnboardingScreen'
import { saveProviderApiKey } from '../../services/security/apiKeyVault'
import type { OnboardingPayload, PersistedState } from '../../types/workspace'

type Props = {
  initialData: PersistedState
  onComplete: (updated: PersistedState) => void
  children: ReactNode
}

/**
 * Single authoritative gate for onboarding.
 * Renders OnboardingScreen when settings are absent; otherwise passes through children.
 * Also ensures the API key is persisted to the secure vault on completion.
 */
export function OnboardingGate({ initialData, onComplete, children }: Props) {
  if (initialData.settings) {
    return <>{children}</>
  }

  const handleSubmit = (payload: OnboardingPayload) => {
    void saveProviderApiKey(payload.provider, payload.apiKey).catch((err) => {
      console.error('[Vault] No se pudo guardar API key', err)
    })

    onComplete({
      ...initialData,
      settings: {
        authorName: payload.authorName || 'Autor(a)',
        provider: payload.provider,
        model: payload.model,
        apiKeyHint: payload.apiKey ? `••••${payload.apiKey.slice(-4)}` : 'Modo local',
        streamEnabled: payload.streamEnabled ?? true,
      },
    })
  }

  return <OnboardingScreen onSubmit={handleSubmit} />
}
