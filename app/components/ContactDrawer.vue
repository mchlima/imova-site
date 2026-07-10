<script setup lang="ts">
import { type Contact, fmtOpportunityDate } from '~/utils/opportunityModel'

const props = defineProps<{ modelValue: boolean; contactId: string | null }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  updated: [Contact]
  'open-opportunity': [string]
}>()

const apiBase = useRuntimeConfig().public.apiBase

interface OppSummary {
  id: string
  title?: string
  description?: string
  stageId: string | null
  temperature: string
  fields: Record<string, unknown>
  createdAt: string
  assignees?: { id: string; name: string }[]
  comments?: { id: string }[]
  tasks?: { done: boolean }[]
  activities?: { done: boolean; dueAt: string | null }[]
  _count?: { documents?: number }
}
type ContactDetail = Contact & { opportunities: OppSummary[] }

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const detail = ref<ContactDetail | null>(null)

async function load(id: string) {
  detail.value = null
  try {
    detail.value = await $fetch<ContactDetail>(`/contacts/${id}`, {
      baseURL: apiBase,
      credentials: 'include',
    })
  } catch {
    open.value = false
  }
}

// recarrega silenciosamente (sem flash de skeleton) — usado após editar/excluir
// uma oportunidade no OpportunityDrawer aberto por cima deste drawer
async function reload() {
  if (!props.contactId) return
  try {
    detail.value = await $fetch<ContactDetail>(`/contacts/${props.contactId}`, {
      baseURL: apiBase,
      credentials: 'include',
    })
  } catch {
    /* mantém o que tiver */
  }
}
defineExpose({ reload })

// carrega ao abrir (ou ao trocar de contato com o drawer já aberto)
watch(
  () => [props.modelValue, props.contactId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) load(id)
  },
  { immediate: true },
)

// contato editado no ContactCard → reflete aqui e avisa o pai
function onContactUpdated(c: Contact) {
  if (detail.value) detail.value = { ...detail.value, ...c }
  emit('updated', c)
}

// animações: backdrop (fade) e painel (slide da direita)
const fadeT = {
  enterActiveClass: 'transition-opacity duration-300 ease-out',
  enterFromClass: 'opacity-0',
  leaveActiveClass: 'transition-opacity duration-200 ease-in',
  leaveToClass: 'opacity-0',
}
const slideT = {
  enterActiveClass: 'transition-transform duration-300 ease-out',
  enterFromClass: 'translate-x-full',
  leaveActiveClass: 'transition-transform duration-200 ease-in',
  leaveToClass: 'translate-x-full',
}
</script>

<template>
  <div>
    <Transition v-bind="fadeT">
      <div
        v-if="open"
        class="fixed inset-0 z-[50] bg-slate-900/40 backdrop-blur-[2px]"
        @click="open = false"
      ></div>
    </Transition>
    <Transition v-bind="slideT">
      <aside
        v-if="open"
        class="fixed top-0 right-0 z-[51] w-[520px] max-w-[94vw] h-screen bg-slate-50 shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.3)] overflow-y-auto"
      >
      <div
        class="sticky top-0 z-[2] bg-white border-b border-slate-200 px-[22px] py-[18px] flex items-start justify-between"
      >
        <div>
          <h2 v-if="detail" class="text-[19px] font-extrabold tracking-[-0.02em] m-0 text-slate-900">
            {{ detail.name }}
          </h2>
          <AppSkeleton v-else class="h-5 w-44 mb-1" />
          <div class="text-[12.5px] text-slate-400">Contato</div>
        </div>
        <button
          class="w-8 h-8 border border-slate-200 bg-white rounded-[7px] text-[16px] text-slate-500 cursor-pointer shrink-0 leading-none"
          @click="open = false"
        >
          ✕
        </button>
      </div>

      <div v-if="detail" class="px-[22px] pt-5 pb-10 flex flex-col gap-[18px]">
        <ContactCard :contact="detail" @updated="onContactUpdated" />

        <div class="bg-white border border-slate-200 rounded-[10px] p-[18px]">
          <div class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-3.5">
            Oportunidades ({{ detail.opportunities.length }})
          </div>
          <div v-if="!detail.opportunities.length" class="text-[13px] text-slate-400 text-center py-2">
            Nenhuma oportunidade.
          </div>
          <div v-else class="flex flex-col gap-2">
            <button
              v-for="o in detail.opportunities"
              :key="o.id"
              type="button"
              class="block w-full text-left border border-slate-100 rounded-lg px-3 py-2.5 bg-transparent cursor-pointer hover:border-slate-300 transition-colors"
              @click="emit('open-opportunity', o.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-[13.5px] font-semibold text-slate-800 truncate">
                  {{ (o.title || '').trim() || detail.name }}
                </span>
                <span class="text-[12px] text-slate-400 shrink-0">{{ fmtOpportunityDate(o.createdAt) }}</span>
              </div>
              <!-- rodapé: mesmos indicadores do card do kanban -->
              <OpportunityCardFooter
                :has-description="!!o.description"
                :tasks="o.tasks"
                :comments-count="o.comments?.length"
                :documents-count="o._count?.documents"
                :activities="o.activities"
                :assignees="o.assignees"
              />
            </button>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-[10px] p-[18px]">
          <div class="text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-3.5">
            Documentos
          </div>
          <DocumentsPanel :contact-id="detail.id" />
        </div>
      </div>
      <div v-else class="px-[22px] py-6 flex flex-col gap-5">
        <div class="flex flex-col gap-2">
          <AppSkeleton class="h-4 w-40" />
          <AppSkeleton class="h-3.5 w-56" />
        </div>
        <div class="flex flex-col gap-2.5">
          <AppSkeleton class="h-10 w-full rounded-lg" />
          <AppSkeleton class="h-10 w-full rounded-lg" />
          <AppSkeleton class="h-10 w-3/4 rounded-lg" />
        </div>
      </div>
      </aside>
    </Transition>
  </div>
</template>
