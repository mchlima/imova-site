<script setup lang="ts">
import { type Contact, fmtBRL, fmtOpportunityDate, oppCity, oppUf, oppPropertyValue } from '~/utils/opportunityModel'

const props = defineProps<{ modelValue: boolean; contactId: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; updated: [Contact] }>()

const apiBase = useRuntimeConfig().public.apiBase

interface OppSummary {
  id: string
  status: string
  temperature: string
  fields: Record<string, unknown>
  createdAt: string
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

// funil como dado — cor do badge de status vem de GET /stages
const { loadStages, stageBadgeStyle } = useStages()
loadStages()

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
          <h2 class="text-[19px] font-extrabold tracking-[-0.02em] m-0 text-slate-900">
            {{ detail?.name || 'Carregando…' }}
          </h2>
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
            <NuxtLink
              v-for="o in detail.opportunities"
              :key="o.id"
              :to="`/admin/oportunidades?oportunidade=${o.id}`"
              class="flex items-center justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2.5 no-underline hover:border-slate-300 transition-colors"
            >
              <div class="min-w-0">
                <div class="text-[13.5px] font-semibold text-slate-800 truncate">
                  {{ fmtBRL(oppPropertyValue(o)) }}
                  <span v-if="oppCity(o)" class="font-normal text-slate-400"
                    >· {{ oppCity(o) }}{{ oppUf(o) ? '/' + oppUf(o) : '' }}</span
                  >
                </div>
                <div class="text-[12px] text-slate-400">{{ fmtOpportunityDate(o.createdAt) }}</div>
              </div>
              <span
                class="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold shrink-0"
                :style="stageBadgeStyle(o.status)"
                >{{ o.status }}</span
              >
            </NuxtLink>
          </div>
        </div>
      </div>
      <div v-else class="px-[22px] py-10 text-center text-slate-400 text-[14px]">Carregando…</div>
      </aside>
    </Transition>
  </div>
</template>
