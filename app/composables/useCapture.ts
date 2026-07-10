import { isInServiceArea } from '~/utils/serviceArea'

// Captação genérica de lead (POST /capture, público). Centraliza o payload e o
// roteamento de área (dentro da RMSP → Lead; fora → Nutrição) para o LeadForm e
// o stepper das LPs não duplicarem essa lógica.
export interface CaptureInput {
  source: string
  contact: { name: string; channels: { type: string; value: string }[] }
  fields?: Record<string, Record<string, unknown>>
  city?: string
  uf?: string
}

export function useCapture() {
  const apiBase = useRuntimeConfig().public.apiBase

  async function submitCapture(input: CaptureInput) {
    // Roteamento de área do site (RMSP → Lead; fora → Nutrição). O backend
    // resolve o estágio por `stageExternalId` (por label ou id externo); se não
    // casar, cai no 1º estágio do board padrão.
    const stageExternalId = isInServiceArea(input.city || '', input.uf) ? 'Lead' : 'Nutrição'
    await $fetch('/capture', {
      baseURL: apiBase,
      method: 'POST',
      body: {
        source: input.source,
        contact: input.contact,
        ...(input.fields ? { fields: input.fields } : {}),
        stageExternalId,
      },
    })
  }

  return { submitCapture }
}
