import type { CollectionTab, Provider } from '../types/workspace'

// Bump the storage key to force a fresh seed for development when structure changes.
export const STORAGE_KEY = 'ndc-mvp-state-v3'

export const ENABLE_INCREMENTAL_GRAPH_HUD =
  (import.meta.env.VITE_ENABLE_INCREMENTAL_GRAPH_HUD ?? '1') !== '0'

export const GRAPH_RENDERER_KIND =
  (import.meta.env.VITE_GRAPH_RENDERER_KIND as 'native' | 'd3-pixi' | undefined) ?? 'd3-pixi'

export const providerModels: Record<Provider, string[]> = {
  OpenAI: ['gpt-4.1', 'gpt-4o-mini'],
  Anthropic: ['claude-3-7-sonnet', 'claude-3-5-haiku'],
  'Google Gemini': ['gemini-2.5-pro', 'gemini-2.0-flash'],
  OpenRouter: [
    'openrouter/anthropic/claude-3.7-sonnet',
    'openrouter/openai/gpt-4o-mini',
    'openrouter/google/gemini-2.0-flash-001',
  ],
  'Local/Ollama': ['llama3.2', 'qwen2.5-coder'],
}

export const defaultTabBlueprints: Array<Pick<CollectionTab, 'name' | 'prompt' | 'icon' | 'color'>> = [
  {
    name: 'Capítulos',
    icon: '📚',
    color: '#60A5FA',
    prompt: 'Redacta escenas con tensión progresiva, continuidad impecable y ritmo cinematográfico.',
  },
  {
    name: 'Personajes',
    icon: '🧍',
    color: '#FB923C',
    prompt: 'Profundiza en motivaciones, contradicciones internas y evolución emocional.',
  },
  {
    name: 'Escenarios',
    icon: '🏙️',
    color: '#2DD4BF',
    prompt: 'Describe espacios con atmósfera, utilidad narrativa y detalles sensoriales concretos.',
  },
  {
    name: 'Historia',
    icon: '🧭',
    color: '#A78BFA',
    prompt: 'Mantén continuidad temporal, causa-efecto y claridad de eventos históricos.',
  },
  {
    name: 'Lógica del mundo',
    icon: '🧪',
    color: '#F472B6',
    prompt: 'Define reglas consistentes, costes dramáticos y límites verificables del sistema.',
  },
]
