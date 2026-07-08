// Protege rotas do admin. O cookie de sessão é httpOnly e pertence ao backend
// (localhost:3001), então a checagem só funciona no cliente — no SSR o cookie do
// navegador não chega ao servidor Nuxt.
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const { user, fetchMe } = useAuth()
  if (!user.value) await fetchMe()
  if (!user.value) return navigateTo('/admin/login')
})
