<script setup lang="ts">
import { type Contact, CHANNEL_LABELS, CHANNEL_ICONS } from '~/utils/opportunityModel'

const props = defineProps<{ contact: Contact }>()
const emit = defineEmits<{ updated: [Contact] }>()
const apiBase = useRuntimeConfig().public.apiBase

// Atualização otimista + PATCH /contacts/:id (nome/endereço).
async function patch(p: Partial<Contact>) {
  const id = props.contact?.id
  if (!id) return
  emit('updated', { ...props.contact, ...p })
  try {
    const updated = await $fetch<Contact>(`/contacts/${id}`, {
      baseURL: apiBase,
      method: 'PATCH',
      credentials: 'include',
      body: p,
    })
    emit('updated', updated)
  } catch {
    /* o pai recarrega se precisar */
  }
}

// ── formas de contato (channels) ──
const CHANNEL_TYPES = [
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'outro', label: 'Outro' },
]
const adding = ref(false)
const newType = ref('email')
const newValue = ref('')
async function addChannel() {
  const id = props.contact?.id
  const value = newValue.value.trim()
  if (!id || !value) return
  try {
    const updated = await $fetch<Contact>(`/contacts/${id}/channels`, {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: { type: newType.value, value },
    })
    emit('updated', updated)
    newValue.value = ''
    newType.value = 'email'
    adding.value = false
  } catch {
    /* ignore */
  }
}
async function removeChannel(channelId: string) {
  const id = props.contact?.id
  if (!id) return
  try {
    const updated = await $fetch<Contact>(`/contacts/${id}/channels/${channelId}`, {
      baseURL: apiBase,
      method: 'DELETE',
      credentials: 'include',
    })
    emit('updated', updated)
  } catch {
    /* ignore */
  }
}

// ── endereço (residência) ──
const STREET_TYPES = [
  'Rua',
  'Avenida',
  'Estrada',
  'Rodovia',
  'Travessa',
  'Alameda',
  'Praça',
  'Viela',
  'Outro',
]
const statesData = ref<{ uf: string; name: string }[]>([])
const citiesData = ref<{ name: string }[]>([])
const ufOptions = computed(() =>
  statesData.value.map((s) => ({ value: s.uf, label: `${s.name} (${s.uf})` })),
)
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
onMounted(() => {
  loadStates()
  if (props.contact?.residenceUf) loadCities(props.contact.residenceUf)
})

const resUf = computed({
  get: () => props.contact.residenceUf,
  set: (v: string) => {
    patch({ residenceUf: v, residenceCity: '' })
    loadCities(v)
  },
})
const resCity = computed({
  get: () => props.contact.residenceCity,
  set: (v: string) => patch({ residenceCity: v }),
})

const label = 'block text-[12.5px] font-semibold text-slate-700 mb-[7px]'
const input =
  'w-full h-[38px] px-[11px] text-[13px] text-slate-900 border border-slate-300 rounded-lg outline-none'
const select =
  'w-full h-[38px] pl-[11px] pr-7 text-[13px] text-slate-900 border border-slate-300 rounded-lg bg-white cursor-pointer outline-none'
const block = 'text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400'
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-[10px] p-[18px] flex flex-col gap-4">
    <div>
      <label :class="label">Nome</label>
      <input
        :value="contact.name"
        :class="input"
        @change="patch({ name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <!-- formas de contato -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span :class="block">Formas de contato</span>
        <button
          v-if="!adding"
          type="button"
          class="text-[12.5px] font-semibold text-brand hover:underline cursor-pointer bg-transparent border-none p-0"
          @click="adding = true"
        >
          + Adicionar
        </button>
      </div>

      <div v-if="contact.channels?.length" class="flex flex-col gap-1.5 mb-2">
        <div
          v-for="ch in contact.channels"
          :key="ch.id"
          class="flex items-center gap-2 border border-slate-100 rounded-lg px-2.5 py-2"
        >
          <span
            class="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md bg-slate-100 text-slate-500 shrink-0"
            :title="CHANNEL_LABELS[ch.type] || ch.type"
          >
            <AdminIcon :name="CHANNEL_ICONS[ch.type] || 'message'" :size="15" />
          </span>
          <span class="text-[13px] text-slate-800 truncate flex-1">{{ ch.value }}</span>
          <button
            type="button"
            title="Remover"
            class="text-slate-300 hover:text-red-600 cursor-pointer bg-transparent border-none text-[14px] leading-none shrink-0"
            @click="removeChannel(ch.id)"
          >
            ✕
          </button>
        </div>
      </div>
      <div v-else class="text-[12.5px] text-slate-400 mb-2">Nenhuma forma de contato.</div>

      <!-- form de adicionar -->
      <div v-if="adding" class="flex gap-2 items-center">
        <select v-model="newType" :class="select" class="!w-[120px]">
          <option v-for="t in CHANNEL_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <input
          v-model="newValue"
          :class="input"
          class="flex-1"
          placeholder="ex.: contato@email.com / (11) 90000-0000"
          @keyup.enter="addChannel"
        />
        <button
          type="button"
          class="h-[38px] px-3 bg-slate-900 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none disabled:opacity-50 shrink-0"
          :disabled="!newValue.trim()"
          @click="addChannel"
        >
          Adicionar
        </button>
        <button
          type="button"
          class="h-[38px] px-2 text-slate-400 text-[13px] cursor-pointer bg-transparent border-none shrink-0"
          @click="adding = false"
        >
          cancelar
        </button>
      </div>
    </div>

    <!-- endereço de residência (onde mora) -->
    <div>
      <div :class="block" class="mb-3">Endereço</div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label :class="label">Tipo</label>
          <select
            :value="contact.residenceStreetType"
            :class="select"
            @change="patch({ residenceStreetType: ($event.target as HTMLSelectElement).value })"
          >
            <option value="">—</option>
            <option v-for="t in STREET_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label :class="label">Logradouro</label>
          <input
            :value="contact.residenceStreet"
            :class="input"
            placeholder="ex: das Flores"
            @change="patch({ residenceStreet: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div>
          <label :class="label">Número</label>
          <input
            :value="contact.residenceNumber"
            :class="input"
            placeholder="ex: 123"
            @change="patch({ residenceNumber: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div>
          <label :class="label">Complemento</label>
          <input
            :value="contact.residenceComplement"
            :class="input"
            placeholder="ex: apto 45"
            @change="patch({ residenceComplement: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div>
          <label :class="label">Bairro</label>
          <input
            :value="contact.residenceNeighborhood"
            :class="input"
            placeholder="ex: Centro"
            @change="patch({ residenceNeighborhood: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div>
          <label :class="label">CEP</label>
          <input
            :value="contact.residencePostalCode"
            :class="input"
            placeholder="00000-000"
            @change="patch({ residencePostalCode: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div>
          <label :class="label">UF</label>
          <SearchableSelect
            v-model="resUf"
            :options="ufOptions"
            placeholder="UF"
            search-placeholder="Buscar estado…"
          />
        </div>
        <div>
          <label :class="label">Cidade</label>
          <SearchableSelect
            v-model="resCity"
            :options="cityOptions"
            :disabled="!resUf"
            :placeholder="resUf ? 'Cidade' : 'Escolha a UF'"
            search-placeholder="Buscar cidade…"
          />
        </div>
      </div>
    </div>
  </div>
</template>
