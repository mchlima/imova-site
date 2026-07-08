// Auth state shared across the app. The session lives in an httpOnly cookie set by
// the NestJS backend, so we never touch the token here — we only track the user.
export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
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

  return { user, login, fetchMe, logout }
}
