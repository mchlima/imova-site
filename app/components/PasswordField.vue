<script setup lang="ts">
// Campo de senha com gerador embutido (usado ao criar usuário e ao redefinir senha).
// Quem administra define a senha e a repassa — não há auto-cadastro no CRM.
const model = defineModel<string>({ required: true })

const MIN = 8
const MAX = 32

const length = ref(16)
const useUpper = ref(true)
const useLower = ref(true)
const useDigits = ref(true)
const useSymbols = ref(true)
const reveal = ref(false)
const copied = ref(false)

const SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%&*?-_=+.,;:',
}

const activeSets = computed(() => {
  const sets: string[] = []
  if (useUpper.value) sets.push(SETS.upper)
  if (useLower.value) sets.push(SETS.lower)
  if (useDigits.value) sets.push(SETS.digits)
  if (useSymbols.value) sets.push(SETS.symbols)
  return sets
})

// Desmarcar tudo deixaria o gerador sem alfabeto — mantemos ao menos um conjunto.
const noneSelected = computed(() => activeSets.value.length === 0)

function randomInt(max: number) {
  // crypto em vez de Math.random: é uma senha real de acesso ao CRM
  const buf = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / max) * max
  let n = 0
  do {
    crypto.getRandomValues(buf)
    n = buf[0]!
  } while (n >= limit) // descarta o excedente para não enviesar os primeiros caracteres
  return n % max
}

function generate() {
  const sets = activeSets.value
  if (!sets.length) return

  // garante ao menos um caractere de cada conjunto escolhido...
  const chars = sets.map((set) => set[randomInt(set.length)]!)
  const all = sets.join('')
  while (chars.length < length.value) chars.push(all[randomInt(all.length)]!)

  // ...e embaralha, senão a senha começaria sempre com maiúscula, depois minúscula etc.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }

  model.value = chars.join('')
  reveal.value = true
  copied.value = false
}

async function copy() {
  if (!model.value) return
  try {
    await navigator.clipboard.writeText(model.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    /* clipboard bloqueado (http/permissão) — a senha continua visível para copiar à mão */
  }
}

const strength = computed(() => {
  const pool = activeSets.value.reduce((n, s) => n + s.length, 0)
  if (!model.value || !pool) return { label: '', bits: 0, pct: 0, color: '' }
  // entropia ≈ log2(pool^len); 60 bits ~ forte para uma senha de aplicação
  const bits = Math.round(model.value.length * Math.log2(pool))
  const pct = Math.min(100, Math.round((bits / 100) * 100))
  if (bits < 45) return { label: 'Fraca', bits, pct, color: 'bg-red-500' }
  if (bits < 70) return { label: 'Boa', bits, pct, color: 'bg-amber-500' }
  return { label: 'Forte', bits, pct, color: 'bg-emerald-500' }
})

const toggles = [
  { model: useUpper, label: 'ABC', title: 'Maiúsculas' },
  { model: useLower, label: 'abc', title: 'Minúsculas' },
  { model: useDigits, label: '123', title: 'Números' },
  { model: useSymbols, label: '#$&', title: 'Símbolos' },
]
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <input
          v-model="model"
          :type="reveal ? 'text' : 'password'"
          :minlength="MIN"
          :maxlength="MAX"
          placeholder="Senha de acesso"
          autocomplete="new-password"
          class="w-full h-[40px] pl-3 pr-10 text-[14px] font-mono border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
        />
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer bg-transparent border-none"
          :title="reveal ? 'Ocultar' : 'Mostrar'"
          @click="reveal = !reveal"
        >
          {{ reveal ? '🙈' : '👁' }}
        </button>
      </div>
      <button
        type="button"
        class="h-[40px] px-3.5 bg-brand-soft text-brand text-[13px] font-bold rounded-lg cursor-pointer border-none hover:bg-brand hover:text-white transition-colors disabled:opacity-50"
        :disabled="noneSelected"
        @click="generate"
      >
        Gerar
      </button>
      <button
        type="button"
        class="h-[40px] px-3 bg-white border border-slate-300 text-slate-600 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-50 disabled:opacity-50"
        :disabled="!model"
        @click="copy"
      >
        {{ copied ? 'Copiado!' : 'Copiar' }}
      </button>
    </div>

    <div class="border border-slate-200 rounded-lg p-3 flex flex-col gap-3 bg-slate-50/60">
      <div class="flex items-center gap-3">
        <label class="text-[12.5px] font-semibold text-slate-600 shrink-0">
          Tamanho: <span class="font-mono text-slate-900">{{ length }}</span>
        </label>
        <input
          v-model.number="length"
          type="range"
          :min="MIN"
          :max="MAX"
          class="flex-1 accent-[var(--color-brand,#2563eb)] cursor-pointer"
        />
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="t in toggles"
          :key="t.title"
          type="button"
          class="h-[30px] px-2.5 text-[12px] font-bold font-mono rounded-md cursor-pointer border transition-colors"
          :class="
            t.model.value
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-slate-400 border-slate-300 hover:border-slate-400'
          "
          :title="t.title"
          @click="t.model.value = !t.model.value"
        >
          {{ t.label }}
        </button>
        <span v-if="noneSelected" class="text-[12px] font-semibold text-red-600 ml-1">
          Escolha ao menos um tipo de caractere.
        </span>
      </div>

      <div v-if="model" class="flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all" :class="strength.color" :style="{ width: `${strength.pct}%` }"></div>
        </div>
        <span class="text-[11.5px] font-bold text-slate-500 shrink-0">
          {{ strength.label }} · {{ strength.bits }} bits
        </span>
      </div>
    </div>
  </div>
</template>
