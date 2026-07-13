// Auth state shared across the app. The session lives in an httpOnly cookie set by
// the NestJS backend, so we never touch the token here — we only track the user.
export interface AuthRole {
  id: string
  key: string
  name: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: AuthRole | null
  permissions: string[]
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const apiBase = useRuntimeConfig().public.apiBase

  async function login(email: string, password: string) {
    const res = await $fetch<{ user: AuthUser }>('/auth/login', {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: { email, password },
    })
    user.value = res.user
    return res.user
  }

  async function fetchMe() {
    try {
      const res = await $fetch<{ user: AuthUser }>('/auth/me', {
        baseURL: apiBase,
        credentials: 'include',
      })
      user.value = res.user
    } catch {
      user.value = null
    }
    return user.value
  }

  async function logout() {
    try {
      await $fetch('/auth/logout', {
        baseURL: apiBase,
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      user.value = null
    }
  }

  // Esconder o que o usuário não pode fazer é cortesia de UI, não segurança: quem
  // autoriza de verdade é o PermissionsGuard do backend, em toda requisição.
  function can(permission: string) {
    return user.value?.permissions.includes(permission) ?? false
  }

  /** Verdadeiro se o usuário tiver PELO MENOS UMA das permissões (útil p/ menus). */
  function canAny(...permissions: string[]) {
    return permissions.some((p) => can(p))
  }

  return { user, login, fetchMe, logout, can, canAny }
}
