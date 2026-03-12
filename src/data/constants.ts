import type { CollectionTab, Provider } from '../types/workspace'

export const STORAGE_KEY = 'ndc-mvp-state-v2'

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

export const defaultTabBlueprints: Array<Pick<CollectionTab, 'name' | 'prompt' | 'icon'>> = [
  {
    name: 'Capítulos',
    icon: '📚',
    prompt: 'Redacta escenas con tensión progresiva, continuidad impecable y ritmo cinematográfico.',
  },
  {
    name: 'Personajes',
    icon: '🧍',
    prompt: 'Profundiza en motivaciones, contradicciones internas y evolución emocional.',
  },
  {
    name: 'Escenarios',
    icon: '🏙️',
    prompt: 'Describe espacios con atmósfera, utilidad narrativa y detalles sensoriales concretos.',
  },
  {
    name: 'Historia',
    icon: '🧭',
    prompt: 'Mantén continuidad temporal, causa-efecto y claridad de eventos históricos.',
  },
  {
    name: 'Lógica del mundo',
    icon: '🧪',
    prompt: 'Define reglas consistentes, costes dramáticos y límites verificables del sistema.',
  },
]
