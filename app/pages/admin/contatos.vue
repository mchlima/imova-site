<script setup lang="ts">
import {
  type Contact,
  type Opportunity,
  type RawOpportunity,
  contactEmail,
  contactWhatsapp,
  mapOpportunity,
} from '~/utils/opportunityModel'

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

// ── paginação (client-side, sobre o resultado filtrado) ──────────────────
const pageSize = 20
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const rangeStart = computed(() => (filtered.value.length === 0 ? 0 : (page.value - 1) * pageSize + 1))
const rangeEnd = computed(() => Math.min(page.value * pageSize, filtered.value.length))
watch(filtered, () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})
watch(search, () => (page.value = 1))

// ── seleção ──────────────────────────────────────────────────────────────
const { can } = useAuth()
const canDelete = computed(() => can('contacts:delete'))
const selected = ref<Set<string>>(new Set())

function toggleRow(id: string) {
  const s = new Set(selected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selected.value = s
}
// O cabeçalho age sobre a PÁGINA (é o que está à vista). Para ir além dela existe
// o atalho "selecionar todos os N resultados" na barra de seleção.
const pageIds = computed(() => paged.value.map((c) => c.id))
const pageAllSelected = computed(
  () => pageIds.value.length > 0 && pageIds.value.every((id) => selected.value.has(id)),
)
const pageSomeSelected = computed(
  () => pageIds.value.some((id) => selected.value.has(id)) && !pageAllSelected.value,
)
function togglePage() {
  const s = new Set(selected.value)
  if (pageAllSelected.value) for (const id of pageIds.value) s.delete(id)
  else for (const id of pageIds.value) s.add(id)
  selected.value = s
}
function selectAllResults() {
  selected.value = new Set(filtered.value.map((c) => c.id))
}
function clearSelection() {
  selected.value = new Set()
}
const allResultsSelected = computed(
  () => filtered.value.length > 0 && selected.value.size === filtered.value.length,
)
// a busca some com linhas selecionadas; excluir o que não está mais à vista assusta
watch(filtered, () => {
  const visible = new Set(filtered.value.map((c) => c.id))
  const kept = [...selected.value].filter((id) => visible.has(id))
  if (kept.length !== selected.value.size) selected.value = new Set(kept)
})

// ── exclusão (individual e em massa) ─────────────────────────────────────
// A confirmação mostra o que vai junto (oportunidades e documentos), porque a
// exclusão cascateia — ninguém deve descobrir isso depois.
const confirmOpen = ref(false)
const pendingIds = ref<string[]>([])
const impact = ref<{ contacts: number; opportunities: number; documents: number } | null>(null)
const impactLoading = ref(false)
const deleting = ref(false)
const deleteError = ref('')

async function askDelete(ids: string[]) {
  if (!ids.length) return
  pendingIds.value = ids
  impact.value = null
  deleteError.value = ''
  confirmOpen.value = true
  impactLoading.value = true
  try {
    impact.value = await $fetch('/contacts/deletion-impact', {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: { ids },
    })
  } catch {
    deleteError.value = 'Não foi possível calcular o impacto da exclusão.'
  } finally {
    impactLoading.value = false
  }
}

const pendingNames = computed(() =>
  pendingIds.value
    .map((id) => contacts.value.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[],
)

async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch('/contacts/bulk-delete', {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: { ids: pendingIds.value },
    })
    const gone = new Set(pendingIds.value)
    contacts.value = contacts.value.filter((c) => !gone.has(c.id))
    clearSelection()
    confirmOpen.value = false
  } catch (e) {
    const msg = (e as { data?: { message?: string | string[] } })?.data?.message
    deleteError.value = (Array.isArray(msg) ? msg[0] : msg) || 'Erro ao excluir.'
  } finally {
    deleting.value = false
  }
}

// drawer do contato
const contactDrawer = ref<{ reload: () => void } | null>(null)
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

// oportunidade aberta a partir do drawer do contato (por cima dele)
const oppOpen = ref(false)
const selectedOpp = ref<Opportunity | null>(null)
async function openOpportunity(id: string) {
  try {
    const raw = await $fetch<RawOpportunity>(`/opportunities/${id}`, {
      baseURL: apiBase,
      credentials: 'include',
    })
    selectedOpp.value = mapOpportunity(raw)
    // abre por cima do drawer do contato (sem fechá-lo)
    oppOpen.value = true
  } catch {
    /* silencioso — a oportunidade pode ter sido removida */
  }
}
// edições na oportunidade refletem no drawer do contato (lista) e nos contadores
function onOpportunityUpdated(o: Opportunity) {
  selectedOpp.value = o
  contactDrawer.value?.reload()
}
function onOpportunityDeleted() {
  oppOpen.value = false
  contactDrawer.value?.reload()
  load()
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

      <!-- BARRA DE SELEÇÃO — só aparece quando há algo selecionado -->
      <div
        v-if="selected.size > 0"
        class="flex items-center gap-3 flex-wrap mb-[18px] px-4 py-2.5 bg-brand-soft border border-brand/30 rounded-[10px]"
      >
        <span class="text-[13px] font-bold text-brand">
          {{ selected.size }} selecionado{{ selected.size > 1 ? 's' : '' }}
        </span>
        <button
          v-if="!allResultsSelected && filtered.length > selected.size"
          class="text-[12.5px] font-semibold text-brand underline cursor-pointer bg-transparent border-none p-0"
          @click="selectAllResults"
        >
          Selecionar todos os {{ filtered.length }} resultados
        </button>
        <button
          class="text-[12.5px] font-semibold text-slate-500 cursor-pointer bg-transparent border-none p-0 hover:text-slate-700"
          @click="clearSelection"
        >
          Limpar seleção
        </button>
        <button
          v-if="canDelete"
          class="ml-auto inline-flex items-center gap-1.5 h-[34px] px-3.5 bg-red-600 text-white text-[13px] font-semibold rounded-[7px] cursor-pointer border-none hover:bg-red-700"
          @click="askDelete([...selected])"
        >
          <AdminIcon name="trash" :size="15" /> Excluir selecionados
        </button>
      </div>

      <div class="bg-white border border-slate-200 rounded-[10px] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div class="overflow-x-auto">
          <table class="w-full table-fixed border-collapse min-w-[820px]">
            <colgroup>
              <col class="w-[44px]" /><col class="w-[22%]" /><col class="w-[24%]" />
              <col class="w-[15%]" /><col class="w-[16%]" /><col class="w-[13%]" /><col class="w-[52px]" />
            </colgroup>
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <!-- text-left explícito: <th> centraliza por padrão e o checkbox
                     sairia do eixo dos das linhas, que ficam em <td> -->
                <th class="py-3 pl-4 pr-0 text-left">
                  <input
                    type="checkbox"
                    class="w-4 h-4 accent-brand cursor-pointer align-middle"
                    :checked="pageAllSelected"
                    :indeterminate.prop="pageSomeSelected"
                    :aria-label="pageAllSelected ? 'Desmarcar a página' : 'Selecionar a página'"
                    @change="togglePage"
                  />
                </th>
                <th :class="th">Nome</th>
                <th :class="th">E-mail</th>
                <th :class="th">WhatsApp</th>
                <th :class="th">Reside em</th>
                <th :class="th" class="!text-right">Oportunidades</th>
                <th :class="th" class="!px-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in paged"
                :key="c.id"
                class="border-b border-slate-100 cursor-pointer transition-colors"
                :class="selected.has(c.id) ? 'bg-brand-soft/40' : 'hover:bg-slate-50'"
                @click="openContact(c.id)"
              >
                <!-- o clique no checkbox não deve abrir o contato -->
                <td class="py-[13px] pl-4 pr-0" @click.stop>
                  <input
                    type="checkbox"
                    class="w-4 h-4 accent-brand cursor-pointer align-middle"
                    :checked="selected.has(c.id)"
                    :aria-label="`Selecionar ${c.name}`"
                    @change="toggleRow(c.id)"
                  />
                </td>
                <td class="py-[13px] px-3 text-[14px] font-semibold text-slate-900 truncate">{{ c.name }}</td>
                <td class="py-[13px] px-3 text-[13px] text-slate-600 truncate">{{ contactEmail(c) || '—' }}</td>
                <td class="py-[13px] px-3 text-[13px] text-slate-500">{{ contactWhatsapp(c) || '—' }}</td>
                <td class="py-[13px] px-3 text-[13px] text-slate-500 truncate">
                  {{ c.residenceCity ? c.residenceCity + (c.residenceUf ? '/' + c.residenceUf : '') : '—' }}
                </td>
                <td class="py-[13px] px-3 text-right">
                  <span class="inline-flex items-center justify-center min-w-[24px] h-[22px] px-2 rounded-md text-[12px] font-bold bg-slate-100 text-slate-600">{{ c._count.opportunities }}</span>
                </td>
                <td class="py-[13px] px-2 text-right" @click.stop>
                  <button
                    v-if="canDelete"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 cursor-pointer bg-transparent border-none transition-colors"
                    title="Excluir contato"
                    @click="askDelete([c.id])"
                  >
                    <AdminIcon name="trash" :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <SkeletonTable v-if="loading" :rows="8" :cols="4" />
        <div v-else-if="loadError" class="text-center py-12 text-red-600 text-[14px]">
          Não foi possível carregar. <button class="ml-2 underline font-semibold" @click="load">Tentar de novo</button>
        </div>
        <div v-else-if="!filtered.length" class="text-center py-12 text-slate-400 text-[14px]">Nenhum contato.</div>

        <!-- PAGINAÇÃO -->
        <div
          v-if="!loading && !loadError && filtered.length > 0"
          class="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 border-t border-slate-200"
        >
          <span class="text-[12.5px] text-slate-500">
            Mostrando {{ rangeStart }}–{{ rangeEnd }} de {{ filtered.length }}
          </span>
          <div class="flex items-center gap-1">
            <button
              class="h-8 px-3 text-[13px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 cursor-pointer transition-all enabled:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page <= 1"
              @click="page--"
            >
              Anterior
            </button>
            <span class="text-[12.5px] text-slate-500 px-2">Página {{ page }} de {{ totalPages }}</span>
            <button
              class="h-8 px-3 text-[13px] font-semibold rounded-md border border-slate-200 bg-white text-slate-600 cursor-pointer transition-all enabled:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page >= totalPages"
              @click="page++"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- confirmação de exclusão: mostra o que vai junto -->
    <AppModal
      v-model="confirmOpen"
      :title="pendingIds.length > 1 ? `Excluir ${pendingIds.length} contatos?` : 'Excluir contato?'"
      subtitle="Esta ação é irreversível."
    >
      <div class="flex flex-col gap-3">
        <p v-if="pendingIds.length === 1" class="text-[14px] text-slate-700 m-0">
          <b>{{ pendingNames[0] }}</b> será excluído.
        </p>
        <p v-else class="text-[14px] text-slate-700 m-0">
          {{ pendingNames.slice(0, 3).join(', ') }}<span v-if="pendingNames.length > 3">
            e mais {{ pendingNames.length - 3 }}</span
          >
          serão excluídos.
        </p>

        <div v-if="impactLoading" class="text-[13px] text-slate-400">Calculando o que será removido…</div>
        <div
          v-else-if="impact && (impact.opportunities > 0 || impact.documents > 0)"
          class="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800"
        >
          <b>Isto também remove, em definitivo:</b>
          <ul class="mt-1.5 mb-0 pl-4 list-disc">
            <li v-if="impact.opportunities > 0">
              {{ impact.opportunities }} oportunidade{{ impact.opportunities > 1 ? 's' : '' }},
              com todo o histórico, atividades, comentários e tarefas
            </li>
            <li v-if="impact.documents > 0">
              {{ impact.documents }} documento{{ impact.documents > 1 ? 's' : '' }} anexado{{ impact.documents > 1 ? 's' : '' }}
            </li>
          </ul>
        </div>

        <p v-if="deleteError" class="text-[13px] font-semibold text-red-600 m-0">{{ deleteError }}</p>
      </div>
      <template #footer>
        <button
          class="h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-100"
          @click="confirmOpen = false"
        >
          Cancelar
        </button>
        <button
          class="h-[38px] px-5 bg-red-600 text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-red-700 border-none disabled:opacity-60"
          :disabled="deleting || impactLoading"
          @click="confirmDelete"
        >
          {{ deleting ? 'Excluindo…' : 'Excluir' }}
        </button>
      </template>
    </AppModal>

    <ContactDrawer
      ref="contactDrawer"
      v-model="drawerOpen"
      :contact-id="selectedId"
      @updated="onContactUpdated"
      @open-opportunity="openOpportunity"
    />
    <!-- contexto de empilhamento acima do drawer de contato (z-[51]) para o
         drawer de oportunidade abrir SOBRE ele, sem alterar seu z-index interno -->
    <div class="relative z-[60]">
      <OpportunityDrawer
        v-model="oppOpen"
        :opportunity="selectedOpp"
        @updated="onOpportunityUpdated"
        @moved="onOpportunityUpdated"
        @deleted="onOpportunityDeleted"
      />
    </div>
    <NewContactDrawer v-model="newOpen" @created="onContactCreated" />
  </div>
</template>
