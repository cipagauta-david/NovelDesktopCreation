import type { Provider } from '../types/workspace'

type LlmProposalInput = {
  provider: Provider
  model: string
  apiKey?: string
  tabPrompt: string
  entityTitle: string
  entityContent: string
}

const SYSTEM_PROMPT =
  'Eres un asistente editorial para narrativa. Debes proponer mejoras concretas y breves en español.'

function buildUserPrompt(input: LlmProposalInput) {
  return [
    `Entidad: ${input.entityTitle}`,
    `Contexto de tab: ${input.tabPrompt || 'Sin prompt definido.'}`,
    'Contenido actual:',
    input.entityContent.slice(0, 4000) || '(vacío)',
    '',
    'Devuelve 3 bullets de mejora narrativa y una nota breve de continuidad.',
  ].join('\n')
}

function extractTextFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const candidate = payload as Record<string, unknown>

  const openAiLike = candidate.choices
  if (Array.isArray(openAiLike) && openAiLike.length > 0) {
    const choice = openAiLike[0] as Record<string, unknown>
    const message = choice.message as Record<string, unknown> | undefined
    if (message && typeof message.content === 'string') {
      return message.content
    }
  }

  const anthropicContent = candidate.content
  if (Array.isArray(anthropicContent) && anthropicContent.length > 0) {
    const first = anthropicContent[0] as Record<string, unknown>
    if (typeof first.text === 'string') {
      return first.text
    }
  }

  const geminiCandidates = candidate.candidates
  if (Array.isArray(geminiCandidates) && geminiCandidates.length > 0) {
    const first = geminiCandidates[0] as Record<string, unknown>
    const content = first.content as Record<string, unknown> | undefined
    const parts = content?.parts as Array<Record<string, unknown>> | undefined
    const text = parts?.find((part) => typeof part.text === 'string')?.text
    if (typeof text === 'string') {
      return text
    }
  }

  const ollamaResponse = candidate.response
  if (typeof ollamaResponse === 'string') {
    return ollamaResponse
  }

  return ''
}

async function postJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`LLM ${response.status}: ${detail.slice(0, 240)}`)
  }
  return response.json()
}

export async function requestLlmProposal(input: LlmProposalInput): Promise<string> {
  const userPrompt = buildUserPrompt(input)

  if (input.provider === 'Local/Ollama') {
    const payload = await postJson('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model,
        prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        stream: false,
      }),
    })
    return extractTextFromPayload(payload)
  }

  if (!input.apiKey) {
    return ''
  }

  if (input.provider === 'OpenAI' || input.provider === 'OpenRouter') {
    const payload = await postJson(
      input.provider === 'OpenAI'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify({
          model: input.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
        }),
      },
    )
    return extractTextFromPayload(payload)
  }

  if (input.provider === 'Anthropic') {
    const payload = await postJson('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    return extractTextFromPayload(payload)
  }

  if (input.provider === 'Google Gemini') {
    const payload = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
        }),
      },
    )
    return extractTextFromPayload(payload)
  }

  return ''
}
