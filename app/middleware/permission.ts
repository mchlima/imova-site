// Barra o acesso a páginas do admin por permissão. A permissão exigida vem do
// meta da página: `definePageMeta({ middleware: ['auth', 'permission'], permission: 'users:manage' })`.
//
// Isto é UX (não abrir uma tela que só mostraria erros), não segurança: a API
// rejeita por conta própria quem não tem a permissão.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const required = to.meta.permission as string | undefined
  if (!required) return

  const { user, fetchMe, can } = useAuth()
  if (!user.value) await fetchMe()
  if (!user.value) return navigateTo('/admin/login')

  if (!can(required)) return navigateTo('/admin/dashboard')
})
