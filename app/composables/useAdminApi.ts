// Helper para chamadas autenticadas ao backend (cookie de sessão).
export function useAdminApi() {
  const apiBase = useRuntimeConfig().public.apiBase
  return {
    api<T>(path: string, opts: Record<string, unknown> = {}) {
      return $fetch<T>(path, { baseURL: apiBase, credentials: 'include', ...opts })
    },
  }
}
