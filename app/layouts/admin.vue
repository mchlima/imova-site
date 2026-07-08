<script setup lang="ts">
const { user, logout } = useAuth()
const route = useRoute()

interface NavItem {
  label: string
  to?: string
  icon: string
  children?: NavItem[]
}
const nav: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
  {
    label: 'CRM',
    to: '/admin/crm',
    icon: 'opportunities',
    children: [
      { label: 'Oportunidades', to: '/admin/oportunidades', icon: 'opportunities' },
      { label: 'Contatos', to: '/admin/contatos', icon: 'contacts' },
      { label: 'Follow-up', to: '/admin/follow-up', icon: 'followup' },
      { label: 'Configurações', to: '/admin/configuracoes', icon: 'settings' },
    ],
  },
  {
    label: 'CMS',
    to: '/admin/cms',
    icon: 'cms',
    children: [
      { label: 'Posts', to: '/admin/posts', icon: 'posts' },
      { label: 'Categorias', to: '/admin/categorias', icon: 'categorias' },
      { label: 'Tags', to: '/admin/tags', icon: 'tags' },
    ],
  },
  { label: 'Taxas', to: '/admin/taxas', icon: 'taxas' },
]

const isActive = (to: string) => route.path === to || route.path.startsWith(to + '/')
const groupActive = (item: NavItem) => !!item.children?.some((c) => c.to && isActive(c.to))

const initials = computed(() =>
  (user.value?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)

// Sidebar off-canvas no mobile; sempre visível no desktop (lg+).
const sidebarOpen = ref(false)
watch(() => route.path, () => (sidebarOpen.value = false))

const menuOpen = ref(false)
async function signOut() {
  menuOpen.value = false
  await logout()
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- backdrop (mobile, quando o sidebar está aberto) -->
    <div
      v-if="sidebarOpen"
      class="lg:hidden fixed inset-0 z-30 bg-slate-900/40"
      @click="sidebarOpen = false"
    ></div>

    <!-- SIDEBAR -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 -translate-x-full lg:translate-x-0"
      :class="{ 'translate-x-0': sidebarOpen }"
    >
      <div class="h-14 flex items-center gap-[9px] px-5 border-b border-slate-200">
        <span
          class="inline-flex items-center justify-center w-[26px] h-[26px] bg-brand rounded-md"
        >
          <span
            class="block w-[9px] h-[9px] border-[2.5px] border-white rounded-[3px]"
          ></span>
        </span>
        <span class="text-[16px] font-extrabold tracking-[-0.02em] text-slate-900"
          >Meu Revelar</span
        >
        <span class="text-[11px] font-semibold text-slate-400 ml-1">admin</span>
      </div>

      <nav class="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        <template v-for="item in nav" :key="item.label">
          <!-- group with a clickable header (context dashboard) + subitems -->
          <div v-if="item.children" class="mt-2">
            <NuxtLink
              :to="item.to!"
              class="flex items-center gap-3 h-[34px] px-3 rounded-lg text-[11px] font-bold uppercase tracking-[0.06em] no-underline transition-all"
              :class="
                isActive(item.to!)
                  ? 'bg-brand-soft text-brand'
                  : groupActive(item)
                    ? 'text-brand hover:bg-slate-100'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              "
            >
              <AdminIcon :name="item.icon" :size="15" />
              {{ item.label }}
            </NuxtLink>
            <div class="mt-1 flex flex-col gap-1 pl-2 ml-3 border-l border-slate-100">
              <NuxtLink
                v-for="child in item.children"
                :key="child.to"
                :to="child.to!"
                class="flex items-center gap-2.5 h-[36px] px-3 rounded-lg text-[13.5px] font-medium no-underline transition-all"
                :class="
                  isActive(child.to!)
                    ? 'bg-brand-soft text-brand'
                    : 'text-slate-600 hover:bg-slate-100'
                "
              >
                <AdminIcon :name="child.icon" :size="16" />
                {{ child.label }}
              </NuxtLink>
            </div>
          </div>

          <!-- top-level link -->
          <NuxtLink
            v-else
            :to="item.to!"
            class="flex items-center gap-3 h-[38px] px-3 rounded-lg text-[14px] font-medium no-underline transition-all"
            :class="
              isActive(item.to!)
                ? 'bg-brand-soft text-brand'
                : 'text-slate-600 hover:bg-slate-100'
            "
          >
            <AdminIcon :name="item.icon" />
            {{ item.label }}
          </NuxtLink>
        </template>
      </nav>

      <div class="p-3 border-t border-slate-200">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 h-[34px] px-3 rounded-lg text-[13px] font-medium text-slate-500 no-underline transition-all hover:bg-slate-100"
          >← Ver o site</NuxtLink
        >
      </div>
    </aside>

    <!-- ÁREA PRINCIPAL -->
    <div class="lg:pl-60 flex flex-col min-h-screen">
      <!-- TOPBAR -->
      <header
        class="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6"
      >
        <div class="flex items-center gap-2 sm:gap-3">
          <button
            class="lg:hidden inline-flex items-center justify-center w-9 h-9 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-all cursor-pointer border-none bg-transparent"
            aria-label="Abrir menu"
            @click="sidebarOpen = true"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <!-- AVATAR + SUBMENU (auth é client-only → evita hydration mismatch) -->
        <ClientOnly>
        <div class="relative">
          <button
            class="flex items-center gap-2.5 h-10 pl-1 pr-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer border-none bg-transparent"
            @click="menuOpen = !menuOpen"
          >
            <span
              class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand text-white text-[12px] font-bold"
              >{{ initials }}</span
            >
            <span class="hidden sm:block text-[13px] font-semibold text-slate-700">{{
              user?.name
            }}</span>
            <svg
              class="w-4 h-4 text-slate-400 transition-transform"
              :class="{ 'rotate-180': menuOpen }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <!-- overlay para fechar ao clicar fora -->
          <div v-if="menuOpen" class="fixed inset-0 z-30" @click="menuOpen = false"></div>

          <div
            v-if="menuOpen"
            class="absolute right-0 mt-2 w-64 z-40 bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] overflow-hidden"
          >
            <div class="px-4 py-3.5 border-b border-slate-100">
              <div class="text-[14px] font-bold text-slate-900">{{ user?.name }}</div>
              <div class="text-[12.5px] text-slate-500 truncate">{{ user?.email }}</div>
            </div>
            <button
              class="w-full flex items-center gap-2.5 px-4 py-3 text-[13.5px] font-semibold text-red-600 hover:bg-red-50 transition-all cursor-pointer border-none bg-transparent text-left"
              @click="signOut"
            >
              <svg
                class="w-[17px] h-[17px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair
            </button>
          </div>
        </div>
        </ClientOnly>
      </header>

      <main class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
