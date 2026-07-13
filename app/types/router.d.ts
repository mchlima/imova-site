// Permite `definePageMeta({ permission: 'users:manage' })` — lido pelo middleware
// de permissão (app/middleware/permission.ts).
declare module 'vue-router' {
  interface RouteMeta {
    permission?: string
  }
}

export {}
