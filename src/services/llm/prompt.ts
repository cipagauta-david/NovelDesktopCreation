import type { LlmRequestInput } from './types'

export const SYSTEM_PROMPT =
  'Eres un asistente editorial para narrativa. Debes proponer mejoras concretas y breves en español.'

const MAX_ENTITY_CONTENT_LENGTH = 4000

export function buildUserPrompt(input: LlmRequestInput) {
  return [
    `Entidad: ${input.entityTitle}`,
    `Contexto de tab: ${input.tabPrompt || 'Sin prompt definido.'}`,
    'Contenido actual:',
    input.entityContent.slice(0, MAX_ENTITY_CONTENT_LENGTH) || '(vacío)',
    '',
    'Devuelve 3 bullets de mejora narrativa y una nota breve de continuidad.',
  ].join('\n')
}
