// Definições de campos personalizados (GET /field-definitions), por tenant.
// O drawer da oportunidade renderiza as seções/campos a partir daqui — ADR 0001.
export interface FieldDef {
  id: string
  key: string
  label: string
  type: string // text|textarea|number|money|select|multiselect|boolean|date
  options: string[]
  order: number
}
export interface FieldSection {
  id: string
  key: string
  label: string
  order: number
  fields: FieldDef[]
}

export function useFieldDefinitions() {
  const apiBase = useRuntimeConfig().public.apiBase
  const sections = useState<FieldSection[]>('crm-field-defs', () => [])
  const loaded = useState<boolean>('crm-field-defs-loaded', () => false)

  async function loadFieldDefinitions(force = false) {
    if (loaded.value && !force) return sections.value
    try {
      sections.value = await $fetch<FieldSection[]>('/field-definitions', {
        baseURL: apiBase,
        credentials: 'include',
      })
      loaded.value = true
    } catch {
      /* mantém o que tiver */
    }
    return sections.value
  }

  return { sections, loadFieldDefinitions }
}
