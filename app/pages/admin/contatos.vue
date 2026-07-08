<script setup lang="ts">
import { type Contact, contactEmail, contactWhatsapp } from '~/utils/opportunityModel'

definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const apiBase = useRuntimeConfig().public.apiBase

type ContactRow = Contact & { _count: { opportunities: number }; createdAt: string }

const contacts = ref<ContactRow[]>([])
const loading = ref(true)
const loadError = ref(false)
const search = ref('')

async function load() {
  loading.value = true
  loadError.value = false
  try {
    contacts.value = await $fetch<ContactRow[]>('/contacts', {
      baseURL: apiBase,
      credentials: 'include',
    })
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}
const route = useRoute()
onMounted(async () => {
  await load()
  const id = route.query.contato
  if (typeof id === 'string' && id) openContact(id)
})
watch(
  () => route.query.contato,
  (id) => {
    if (typeof id === 'string' && id) openContact(id)
  },
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return contacts.value
  return contacts.value.filter((c) =>
    (c.name + ' ' + (c.channels || []).map((ch) => ch.value).join(' '))
      .toLowerCase()
      .includes(q),
  )
})

// drawer do contato
const drawerOpen = ref(false)
const selectedId = ref<string | null>(null)
function openContact(id: string) {
  selectedId.value = id
  drawerOpen.value = true
}
// contato editado no ContactCard → reflete na lista
function onContactUpdated(c: Contact) {
  contacts.value = contacts.value.map((r) => (r.id === c.id ? { ...r, ...c } : r))
}

// criação manual (NewContactDrawer)
const newOpen = ref(false)
function onContactCreated(c: Contact) {
  contacts.value = [
    { ...c, createdAt: new Date().toISOString(), _count: { opportunities: 0 } } as ContactRow,
    ...contacts.value,
  ]
  openContact(c.id)
}

const th = 'text-left py-3 px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-400'
</script>

<template>
  <div>
    <div class="p-4 sm:p-6">
      <PageHeader title="Contatos" subtitle="As pessoas e suas oportunidades." />

      <div class="flex gap-2.5 items-center flex-wrap mb-[18px]">
        <div class="relative flex-1 max-w-[360px]">
          <span class="absolute left-[11px] top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">⌕</span>
          <input
            v-model="search"
            placeholder="Buscar por nome, e-mail ou WhatsApp…"
            class="w-full h-[38px] pl-8 pr-3 text-[13.5px] text-slate-900 border border-slate-300 rounded-[7px] outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10"
          />
        </div>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-3.5 bg-brand text-white text-[13px] font-semibold rounded-[7px] cursor-pointer border-none hover:bg-brand-dark shrink-0"
          @click="newOpen = true"
        >
          <span class="text-[15px] leading-none">+</span> Novo contato
        </button>
      </div>

      <div class="bg-white border border-slate-200 rounded-[10px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div class="overflow-x-auto">
          <table class="w-full table-fixed border-collapse min-w-[760px]">
            <colgroup>
              <col class="w-[24%]" /><col class="w-[26%]" /><col class="w-[16%]" />
              <col class="w-[18%]" /><col class="w-[16%]" />
            </colgroup>
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th :class="th" class="!px-4">Nome</th>
                <th :class="th">E-mail</th>
                <th :class="th">WhatsApp</th>
                <th :class="th">Reside em</th>
                <th :class="th" class="!text-right !px-4">Oportunidades</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in filtered"
                :key="c.id"
                class="border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50"
                @click="openContact(c.id)"
              >
                <td class="py-[13px] px-4 text-[14px] font-semibold text-slate-900 truncate">{{ c.name }}</td>
                <td class="py-[13px] px-3 text-[13px] text-slate-600 truncate">{{ contactEmail(c) || '—' }}</td>
                <td class="py-[13px] px-3 text-[13px] text-slate-500">{{ contactWhatsapp(c) || '—' }}</td>
                <td class="py-[13px] px-3 text-[13px] text-slate-500 truncate">
                  {{ c.residenceCity ? c.residenceCity + (c.residenceUf ? '/' + c.residenceUf : '') : '—' }}
                </td>
                <td class="py-[13px] px-4 text-right">
                  <span class="inline-flex items-center justify-center min-w-[24px] h-[22px] px-2 rounded-md text-[12px] font-bold bg-slate-100 text-slate-600">{{ c._count.opportunities }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="loading" class="text-center py-12 text-slate-400 text-[14px]">Carregando…</div>
        <div v-else-if="loadError" class="text-center py-12 text-red-600 text-[14px]">
          Não foi possível carregar. <button class="ml-2 underline font-semibold" @click="load">Tentar de novo</button>
        </div>
        <div v-else-if="!filtered.length" class="text-center py-12 text-slate-400 text-[14px]">Nenhum contato.</div>
      </div>
    </div>

    <ContactDrawer v-model="drawerOpen" :contact-id="selectedId" @updated="onContactUpdated" />
    <NewContactDrawer v-model="newOpen" @created="onContactCreated" />
  </div>
</template>
