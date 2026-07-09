<script setup lang="ts">
import { type Contact, type DraftChannel } from '~/utils/opportunityModel'

// Drawer de CRIAÇÃO de contato. Estado local; só faz POST /contacts ao salvar.
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [Contact] }>()

const apiBase = useRuntimeConfig().public.apiBase

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = reactive({
  name: '',
  channels: [] as DraftChannel[],
  residenceStreetType: '',
  residenceStreet: '',
  residenceNumber: '',
  residenceComplement: '',
  residenceNeighborhood: '',
  residencePostalCode: '',
  residenceUf: '',
  residenceCity: '',
})
const saving = ref(false)
const error = ref('')

function reset() {
  form.name = ''
  form.channels = []
  form.residenceStreetType = ''
  form.residenceStreet = ''
  form.residenceNumber = ''
  form.residenceComplement = ''
  form.residenceNeighborhood = ''
  form.residencePostalCode = ''
  form.residenceUf = ''
  form.residenceCity = ''
  error.value = ''
}
// limpa o form toda vez que abre
watch(open, (v) => {
  if (v) reset()
})

// ── endereço ──
const STREET_TYPES = ['Rua', 'Avenida', 'Estrada', 'Rodovia', 'Travessa', 'Alameda', 'Praça', 'Viela', 'Outro']
const statesData = ref<{ uf: string; name: string }[]>([])
const citiesData = ref<{ name: string }[]>([])
const ufOptions = computed(() => statesData.value.map((s) => ({ value: s.uf, label: `${s.name} (${s.uf})` })))
const cityOptions = computed(() => citiesData.value.map((c) => ({ value: c.name, label: c.name })))
async function loadStates() {
  try {
    statesData.value = await $fetch('/locations/states', { baseURL: apiBase })
  } catch {
    /* ignore */
  }
}
async function loadCities(uf: string) {
  if (!uf) {
    citiesData.value = []
    return
  }
  try {
    citiesData.value = await $fetch('/locations/cities', { baseURL: apiBase, params: { uf } })
  } catch {
    citiesData.value = []
  }
}
onMounted(loadStates)
const resUf = computed({
  get: () => form.residenceUf,
  set: (v: string) => {
    form.residenceUf = v
    form.residenceCity = ''
    loadCities(v)
  },
})

async function save() {
  if (!form.name.trim()) {
    error.value = 'Informe o nome do contato.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const created = await $fetch<Contact>('/contacts', {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: {
        name: form.name.trim(),
        channels: form.channels,
        residenceStreetType: form.residenceStreetType,
        residenceStreet: form.residenceStreet,
        residenceNumber: form.residenceNumber,
        residenceComplement: form.residenceComplement,
        residenceNeighborhood: form.residenceNeighborhood,
        residencePostalCode: form.residencePostalCode,
        residenceUf: form.residenceUf,
        residenceCity: form.residenceCity,
      },
    })
    emit('created', created)
    open.value = false
  } catch {
    error.value = 'Não foi possível salvar. Tente novamente.'
  } finally {
    saving.value = false
  }
}

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

const label = 'block text-[12.5px] font-semibold text-slate-700 mb-[7px]'
const input = 'w-full h-[38px] px-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none'
const select = 'w-full h-[38px] pl-[11px] pr-7 text-[13px] text-slate-900 border border-slate-300 rounded-lg bg-white cursor-pointer outline-none'
const block = 'text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400'
</script>

<template>
  <div>
    <Transition v-bind="fadeT">
      <div v-if="open" class="fixed inset-0 z-[52] bg-slate-900/40 backdrop-blur-[2px]" @click="open = false"></div>
    </Transition>
    <Transition v-bind="slideT">
      <aside
        v-if="open"
        class="fixed top-0 right-0 z-[53] w-[520px] max-w-[94vw] h-screen bg-slate-50 shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.3)] overflow-y-auto flex flex-col"
      >
        <div class="sticky top-0 z-[2] bg-white border-b border-slate-200 px-[22px] py-[18px] flex items-start justify-between">
          <div>
            <h2 class="text-[19px] font-extrabold tracking-[-0.02em] m-0 text-slate-900">Novo contato</h2>
            <div class="text-[12.5px] text-slate-400">Cadastro manual</div>
          </div>
          <button
            class="w-8 h-8 border border-slate-200 bg-white rounded-[7px] text-[16px] text-slate-500 cursor-pointer shrink-0 leading-none"
            @click="open = false"
          >
            ✕
          </button>
        </div>

        <div class="px-[22px] pt-5 pb-4 flex-1">
          <div class="bg-white border border-slate-200 rounded-[10px] p-[18px] flex flex-col gap-4">
            <div>
              <label :class="label">Nome</label>
              <input v-model="form.name" :class="input" placeholder="Nome completo" />
            </div>

            <!-- formas de contato -->
            <div>
              <div :class="block" class="mb-2">Formas de contato</div>
              <ChannelsEditor v-model="form.channels" />
            </div>

            <!-- endereço -->
            <div>
              <div :class="block" class="mb-3">Endereço</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label :class="label">Tipo</label>
                  <select v-model="form.residenceStreetType" :class="select">
                    <option value="">—</option>
                    <option v-for="t in STREET_TYPES" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
                <div>
                  <label :class="label">Logradouro</label>
                  <input v-model="form.residenceStreet" :class="input" placeholder="ex: das Flores" />
                </div>
                <div>
                  <label :class="label">Número</label>
                  <input v-model="form.residenceNumber" :class="input" placeholder="ex: 123" />
                </div>
                <div>
                  <label :class="label">Complemento</label>
                  <input v-model="form.residenceComplement" :class="input" placeholder="ex: apto 45" />
                </div>
                <div>
                  <label :class="label">Bairro</label>
                  <input v-model="form.residenceNeighborhood" :class="input" placeholder="ex: Centro" />
                </div>
                <div>
                  <label :class="label">CEP</label>
                  <input v-model="form.residencePostalCode" :class="input" placeholder="00000-000" />
                </div>
                <div>
                  <label :class="label">UF</label>
                  <SearchableSelect v-model="resUf" :options="ufOptions" placeholder="UF" search-placeholder="Buscar estado…" />
                </div>
                <div>
                  <label :class="label">Cidade</label>
                  <SearchableSelect
                    v-model="form.residenceCity"
                    :options="cityOptions"
                    :disabled="!resUf"
                    :placeholder="resUf ? 'Cidade' : 'Escolha a UF'"
                    search-placeholder="Buscar cidade…"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 bg-white border-t border-slate-200 px-[22px] py-3.5 flex items-center gap-3">
          <span v-if="error" class="text-[12.5px] text-red-600 font-medium flex-1">{{ error }}</span>
          <div class="ml-auto flex gap-2">
            <button
              class="h-9 px-4 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
              @click="open = false"
            >
              Cancelar
            </button>
            <button
              class="h-9 px-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-brand rounded-lg cursor-pointer border-none hover:bg-brand-dark disabled:opacity-50"
              :disabled="saving"
              @click="save"
            >
              <AppSpinner v-if="saving" :size="14" />
              {{ saving ? 'Salvando…' : 'Salvar contato' }}
            </button>
          </div>
        </div>
      </aside>
    </Transition>
  </div>
</template>
