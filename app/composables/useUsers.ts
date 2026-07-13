// Usuários do CRM (GET /users) — candidatos a responsáveis por oportunidades.
// Cache compartilhado entre páginas/drawers (SSR-safe).
export interface CrmUser {
  id: string
  name: string
  email: string
  roleRef: { key: string; name: string } | null
}

export function useUsers() {
  const apiBase = useRuntimeConfig().public.apiBase
  const users = useState<CrmUser[]>('crm-users', () => [])
  const loaded = useState<boolean>('crm-users-loaded', () => false)

  async function loadUsers(force = false) {
    if (loaded.value && !force) return users.value
    try {
      users.value = await $fetch<CrmUser[]>('/users', {
        baseURL: apiBase,
        credentials: 'include',
      })
      loaded.value = true
    } catch {
      /* mantém o que tiver */
    }
    return users.value
  }

  return { users, loadUsers }
}
