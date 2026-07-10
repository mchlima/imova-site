<script setup lang="ts">
import {
  type Development,
  type DevelopmentImage,
  type DevelopmentsMeta,
  type AmenityDef,
  regiaoLabel,
  statusLabel,
  developmentUrl,
} from '~/utils/developmentModel'

definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const id = route.params.id as string
const { api } = useAdminApi()

interface TypoForm {
  label: string
  bedrooms: string
  suites: string
  areaMin: string
  areaMax: string
  priceFrom: string
  parking: string
  terraco: boolean
  imageUrl: string
  imageStorageKey: string
}

const form = reactive({
  name: '', slug: '', construtora: '', tipo: 'apartamentos', descricao: '', masterplanName: '',
  uf: 'SP', cidade: '', bairro: '', regiao: 'zona_sul', endereco: '', standEndereco: '', lat: '', lng: '',
  status: 'breve_lancamento', obraEvolucaoPct: '', entregaLabel: '',
  priceFrom: '', priceMax: '', programa: '', aceitaFgts: false, subsidioAte: '', rendaMinima: '',
  tetoHis1: '', tetoHis2: '', tetoHmp: '',
  totalUnidades: '', torres: '', pavimentos: '', terrenoM2: '',
  incorporadora: '', cnpj: '', registroIncorporacao: '',
  arquitetura: '', paisagismo: '', decoracao: '',
  seoTitle: '', seoDescription: '',
  amenities: [] as string[],
  typologies: [] as TypoForm[],
})
const images = ref<DevelopmentImage[]>([])
const published = ref(false)
const publicUrl = ref('')
const meta = ref<DevelopmentsMeta>({ amenities: [], regioes: [], statuses: [] })
const loaded = ref(false)
const saving = ref(false)
const msg = ref('')
const menuOpen = ref(false)

const s = (v: unknown) => (v == null ? '' : String(v))
function load() {
  return Promise.all([
    api<Development>(`/admin/developments/${id}`),
    api<DevelopmentsMeta>('/developments/meta'),
  ]).then(([d, m]) => {
    meta.value = m
    Object.assign(form, {
      name: d.name, slug: d.slug, construtora: d.construtora, tipo: d.tipo, descricao: d.descricao,
      masterplanName: d.masterplanName, uf: d.uf, cidade: d.cidade, bairro: d.bairro, regiao: d.regiao,
      endereco: d.endereco, standEndereco: d.standEndereco, lat: s(d.lat), lng: s(d.lng),
      status: d.status, obraEvolucaoPct: s(d.obraEvolucaoPct), entregaLabel: d.entregaLabel,
      priceFrom: s(d.priceFrom || ''), priceMax: s(d.priceMax), programa: d.programa,
      aceitaFgts: d.aceitaFgts, subsidioAte: s(d.subsidioAte), rendaMinima: s(d.rendaMinima),
      tetoHis1: s(d.tetoHis1), tetoHis2: s(d.tetoHis2), tetoHmp: s(d.tetoHmp),
      totalUnidades: s(d.totalUnidades), torres: s(d.torres), pavimentos: d.pavimentos, terrenoM2: s(d.terrenoM2),
      incorporadora: d.incorporadora, cnpj: d.cnpj, registroIncorporacao: d.registroIncorporacao,
      arquitetura: d.arquitetura, paisagismo: d.paisagismo, decoracao: d.decoracao,
      seoTitle: d.seoTitle, seoDescription: d.seoDescription,
      amenities: [...d.amenities],
      typologies: d.typologies.map((t) => ({
        label: t.label, bedrooms: s(t.bedrooms), suites: s(t.suites), areaMin: s(t.areaMin || ''),
        areaMax: s(t.areaMax || ''), priceFrom: s(t.priceFrom), parking: s(t.parking), terraco: t.terraco,
        imageUrl: t.imageUrl || '', imageStorageKey: t.imageStorageKey || '',
      })),
    })
    images.value = d.images
    published.value = d.published
    publicUrl.value = developmentUrl(d)
    loaded.value = true
  })
}
onMounted(load)

// ── características agrupadas ──
const CAT_LABELS: Record<string, string> = {
  lazer: 'Lazer', esporte: 'Esporte', pet: 'Pet', conveniencia: 'Conveniência', bem_estar: 'Bem-estar', estrutura: 'Estrutura',
}
const amenityGroups = computed(() => {
  const g: Record<string, AmenityDef[]> = {}
  for (const a of meta.value.amenities) (g[a.category] ||= []).push(a)
  return Object.entries(g)
})
function toggleAmenity(slug: string) {
  const i = form.amenities.indexOf(slug)
  if (i >= 0) form.amenities.splice(i, 1)
  else form.amenities.push(slug)
}

// ── tipologias ──
function addTypo() {
  form.typologies.push({ label: '', bedrooms: '', suites: '', areaMin: '', areaMax: '', priceFrom: '', parking: '', terraco: false, imageUrl: '', imageStorageKey: '' })
}
function removeTypo(i: number) {
  form.typologies.splice(i, 1)
}

// upload da planta de uma tipologia → guarda url+storageKey no form (salvo junto)
const typoUploading = ref<number | null>(null)
async function uploadTypoPlanta(i: number, ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  typoUploading.value = i
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api<{ url: string; storageKey: string }>(
      `/admin/developments/${id}/typology-image`,
      { method: 'POST', body: fd },
    )
    const t = form.typologies[i]
    if (t) {
      t.imageUrl = res.url
      t.imageStorageKey = res.storageKey
    }
  } catch {
    flash('Erro ao enviar planta')
  } finally {
    typoUploading.value = null
    input.value = ''
  }
}

// ── salvar ──
const nInt = (v: string) => (v.trim() === '' ? null : parseInt(v.replace(/\D/g, ''), 10))
const nFloat = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))
function body() {
  return {
    name: form.name, slug: form.slug || undefined, construtora: form.construtora, tipo: form.tipo,
    descricao: form.descricao, masterplanName: form.masterplanName,
    uf: form.uf, cidade: form.cidade, bairro: form.bairro, regiao: form.regiao,
    endereco: form.endereco, standEndereco: form.standEndereco, lat: nFloat(form.lat), lng: nFloat(form.lng),
    status: form.status, obraEvolucaoPct: nInt(form.obraEvolucaoPct), entregaLabel: form.entregaLabel,
    priceFrom: nInt(form.priceFrom) ?? 0, priceMax: nInt(form.priceMax), programa: form.programa,
    aceitaFgts: form.aceitaFgts, subsidioAte: nInt(form.subsidioAte), rendaMinima: nInt(form.rendaMinima),
    tetoHis1: nInt(form.tetoHis1), tetoHis2: nInt(form.tetoHis2), tetoHmp: nInt(form.tetoHmp),
    totalUnidades: nInt(form.totalUnidades), torres: nInt(form.torres), pavimentos: form.pavimentos, terrenoM2: nFloat(form.terrenoM2),
    incorporadora: form.incorporadora, cnpj: form.cnpj, registroIncorporacao: form.registroIncorporacao,
    arquitetura: form.arquitetura, paisagismo: form.paisagismo, decoracao: form.decoracao,
    seoTitle: form.seoTitle, seoDescription: form.seoDescription,
    amenities: form.amenities,
    typologies: form.typologies
      .filter((t) => t.label.trim())
      .map((t, i) => ({
        label: t.label.trim(), bedrooms: nInt(t.bedrooms) ?? 0, suites: nInt(t.suites),
        areaMin: nFloat(t.areaMin) ?? 0, areaMax: nFloat(t.areaMax) ?? 0, priceFrom: nInt(t.priceFrom),
        parking: nInt(t.parking), terraco: t.terraco, order: i,
        imageUrl: t.imageUrl, imageStorageKey: t.imageStorageKey,
      })),
  }
}
function flash(t: string) {
  msg.value = t
  setTimeout(() => (msg.value = ''), 2200)
}
async function save() {
  saving.value = true
  try {
    await api(`/admin/developments/${id}`, { method: 'PATCH', body: body() })
    await load()
    flash('Salvo')
  } catch {
    flash('Erro ao salvar')
  } finally {
    saving.value = false
  }
}
async function publish() {
  saving.value = true
  try {
    await api(`/admin/developments/${id}`, { method: 'PATCH', body: body() })
    await api(`/admin/developments/${id}/publish`, { method: 'PATCH' })
    await load()
    flash('Publicado')
  } catch {
    flash('Erro ao publicar')
  } finally {
    saving.value = false
  }
}
async function unpublish() {
  menuOpen.value = false
  saving.value = true
  try {
    await api(`/admin/developments/${id}/unpublish`, { method: 'PATCH' })
    await load()
    flash('Voltou para rascunho')
  } finally {
    saving.value = false
  }
}
async function remove() {
  menuOpen.value = false
  if (!confirm(`Excluir "${form.name}"? Remove também as imagens do R2.`)) return
  await api(`/admin/developments/${id}`, { method: 'DELETE' })
  await navigateTo('/admin/imoveis')
}
function onGalleryUpdated(d: Development) {
  images.value = d.images
}

const card = 'bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
const blockTitle = 'text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-4'
const label = 'block text-[12.5px] font-semibold text-slate-700 mb-1.5'
const input = 'w-full h-[38px] px-3 text-[13.5px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/10'
</script>

<template>
  <div class="p-4 sm:p-6 max-w-[980px]">
    <div class="flex items-center justify-between gap-4 mb-6">
      <div class="min-w-0">
        <NuxtLink to="/admin/imoveis" class="text-[13px] font-semibold text-slate-400 hover:text-brand no-underline">← Imóveis</NuxtLink>
        <h1 class="text-[22px] font-extrabold tracking-[-0.02em] text-slate-900 m-0 mt-1 truncate flex items-center gap-2.5">
          {{ form.name || 'Empreendimento' }}
          <span class="inline-flex items-center h-[22px] px-2 rounded-md text-[11px] font-semibold shrink-0" :class="published ? 'bg-brand-soft text-brand' : 'bg-slate-100 text-slate-600'">{{ published ? 'Publicado' : 'Rascunho' }}</span>
        </h1>
      </div>
      <div class="shrink-0 flex items-center gap-2">
        <span v-if="msg" class="text-[12.5px] font-semibold text-slate-500">{{ msg }}</span>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-50 disabled:opacity-60"
          :disabled="saving"
          @click="save"
        >
          <AppSpinner v-if="saving" :size="14" /> Salvar
        </button>
        <button
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none hover:bg-brand-dark disabled:opacity-60"
          :disabled="saving"
          @click="publish"
        >
          <AdminIcon name="publish" :size="15" /> {{ published ? 'Republicar' : 'Publicar' }}
        </button>
        <div class="relative">
          <button class="inline-flex items-center justify-center w-[38px] h-[38px] rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer bg-transparent border border-slate-200" @click="menuOpen = !menuOpen">
            <AdminIcon name="dots" :size="18" />
          </button>
          <template v-if="menuOpen">
            <div class="fixed inset-0 z-20" @click="menuOpen = false"></div>
            <div class="absolute right-0 top-11 z-30 w-52 bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] overflow-hidden py-1">
              <a v-if="published" :href="publicUrl" target="_blank" class="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 no-underline hover:bg-slate-50">
                <AdminIcon name="eye" :size="15" /> Ver no site
              </a>
              <button v-if="published" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left" @click="unpublish">
                <AdminIcon name="draft" :size="15" /> Voltar para rascunho
              </button>
              <div class="h-px bg-slate-100 my-1"></div>
              <button class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-red-600 hover:bg-red-50 cursor-pointer bg-transparent border-none text-left" @click="remove">
                <AdminIcon name="trash" :size="15" /> Excluir
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <SkeletonForm v-if="!loaded" :rows="5" />

    <div v-else class="flex flex-col gap-5">
      <!-- DADOS GERAIS -->
      <div :class="card">
        <div :class="blockTitle">Dados gerais</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label :class="label">Nome</label><input v-model="form.name" :class="input" /></div>
          <div><label :class="label">Slug (URL)</label><input v-model="form.slug" :class="input" placeholder="gerado do nome" /></div>
          <div><label :class="label">Construtora</label><input v-model="form.construtora" :class="input" /></div>
          <div><label :class="label">Tipo</label><input v-model="form.tipo" :class="input" placeholder="apartamentos" /></div>
          <div><label :class="label">Masterplan (opcional)</label><input v-model="form.masterplanName" :class="input" placeholder="Agrupa condomínios/fases" /></div>
        </div>
        <div class="mt-4"><label :class="label">Descrição</label><textarea v-model="form.descricao" rows="4" :class="input" class="!h-auto py-2 resize-y"></textarea></div>
      </div>

      <!-- LOCALIZAÇÃO -->
      <div :class="card">
        <div :class="blockTitle">Localização</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label :class="label">Região (zona)</label>
            <select v-model="form.regiao" :class="input" class="cursor-pointer">
              <option v-for="r in meta.regioes" :key="r" :value="r">{{ regiaoLabel(r) }}</option>
            </select>
          </div>
          <div><label :class="label">Bairro</label><input v-model="form.bairro" :class="input" /></div>
          <div><label :class="label">Cidade</label><input v-model="form.cidade" :class="input" /></div>
          <div><label :class="label">UF</label><input v-model="form.uf" :class="input" maxlength="2" /></div>
          <div class="sm:col-span-2"><label :class="label">Endereço</label><input v-model="form.endereco" :class="input" /></div>
          <div class="sm:col-span-2"><label :class="label">Endereço do stand (opcional)</label><input v-model="form.standEndereco" :class="input" /></div>
          <div><label :class="label">Latitude</label><input v-model="form.lat" :class="input" inputmode="decimal" /></div>
          <div><label :class="label">Longitude</label><input v-model="form.lng" :class="input" inputmode="decimal" /></div>
        </div>
      </div>

      <!-- ESTÁGIO & OBRA -->
      <div :class="card">
        <div :class="blockTitle">Estágio & obra</div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label :class="label">Estágio</label>
            <select v-model="form.status" :class="input" class="cursor-pointer">
              <option v-for="st in meta.statuses" :key="st" :value="st">{{ statusLabel(st) }}</option>
            </select>
          </div>
          <div><label :class="label">Evolução da obra (%)</label><input v-model="form.obraEvolucaoPct" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">Previsão de entrega</label><input v-model="form.entregaLabel" :class="input" placeholder="4º tri/2027" /></div>
        </div>
      </div>

      <!-- COMERCIAL -->
      <div :class="card">
        <div :class="blockTitle">Comercial</div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label :class="label">A partir de (R$)</label><input v-model="form.priceFrom" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">Preço máximo (R$)</label><input v-model="form.priceMax" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">Programa</label><input v-model="form.programa" :class="input" placeholder="MCMV / HIS" /></div>
          <div><label :class="label">Subsídio até (R$)</label><input v-model="form.subsidioAte" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">Renda mínima (R$)</label><input v-model="form.rendaMinima" :class="input" inputmode="numeric" /></div>
          <div class="flex items-end pb-1.5">
            <label class="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-700 cursor-pointer">
              <input v-model="form.aceitaFgts" type="checkbox" class="w-4 h-4 accent-[color:var(--color-brand,#146c4e)]" /> Aceita FGTS
            </label>
          </div>
          <div><label :class="label">Teto HIS-1 (R$)</label><input v-model="form.tetoHis1" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">Teto HIS-2 (R$)</label><input v-model="form.tetoHis2" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">Teto HMP (R$)</label><input v-model="form.tetoHmp" :class="input" inputmode="numeric" /></div>
        </div>
      </div>

      <!-- FÍSICO -->
      <div :class="card">
        <div :class="blockTitle">Ficha física</div>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div><label :class="label">Total de unidades</label><input v-model="form.totalUnidades" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">Torres</label><input v-model="form.torres" :class="input" inputmode="numeric" /></div>
          <div><label :class="label">Terreno (m²)</label><input v-model="form.terrenoM2" :class="input" inputmode="decimal" /></div>
          <div><label :class="label">Pavimentos</label><input v-model="form.pavimentos" :class="input" placeholder="Térreo + 22" /></div>
        </div>
      </div>

      <!-- TIPOLOGIAS -->
      <div :class="card">
        <div class="flex items-center justify-between mb-4">
          <div :class="blockTitle" class="mb-0">Tipologias (plantas)</div>
          <button class="text-[12.5px] font-semibold text-brand hover:underline bg-transparent border-none cursor-pointer" @click="addTypo">+ Adicionar tipologia</button>
        </div>
        <div v-if="!form.typologies.length" class="text-[13px] text-slate-400">Nenhuma tipologia. Elas alimentam os filtros de dormitórios/vagas/área.</div>
        <div v-else class="flex flex-col gap-3">
          <div v-for="(t, i) in form.typologies" :key="i" class="border border-slate-200 rounded-lg p-3">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div class="col-span-2"><label :class="label">Rótulo</label><input v-model="t.label" :class="input" placeholder="2 dormitórios" /></div>
              <div><label :class="label">Dorms.</label><input v-model="t.bedrooms" :class="input" inputmode="numeric" /></div>
              <div><label :class="label">Suítes</label><input v-model="t.suites" :class="input" inputmode="numeric" /></div>
              <div><label :class="label">Área mín (m²)</label><input v-model="t.areaMin" :class="input" inputmode="decimal" /></div>
              <div><label :class="label">Área máx (m²)</label><input v-model="t.areaMax" :class="input" inputmode="decimal" /></div>
              <div><label :class="label">Vagas</label><input v-model="t.parking" :class="input" inputmode="numeric" /></div>
              <div><label :class="label">A partir de (R$)</label><input v-model="t.priceFrom" :class="input" inputmode="numeric" /></div>
            </div>
            <!-- planta desta tipologia -->
            <div class="flex items-center gap-3 mt-3">
              <div class="w-20 h-16 rounded-md border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                <img v-if="t.imageUrl" :src="t.imageUrl" alt="Planta" class="w-full h-full object-cover" />
                <span v-else class="text-[10px] text-slate-400 text-center px-1 leading-tight">sem planta</span>
              </div>
              <label class="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12.5px] font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                <AppSpinner v-if="typoUploading === i" :size="13" />
                {{ t.imageUrl ? 'Trocar planta' : 'Enviar planta' }}
                <input type="file" accept="image/*" class="hidden" @change="uploadTypoPlanta(i, $event)" />
              </label>
              <button v-if="t.imageUrl" type="button" class="text-[12px] font-semibold text-slate-400 hover:text-red-600 bg-transparent border-none cursor-pointer" @click="t.imageUrl = ''; t.imageStorageKey = ''">Remover planta</button>
            </div>
            <div class="flex items-center justify-between mt-2.5">
              <label class="inline-flex items-center gap-2 text-[12.5px] font-semibold text-slate-600 cursor-pointer">
                <input v-model="t.terraco" type="checkbox" class="w-4 h-4 accent-[color:var(--color-brand,#146c4e)]" /> Varanda
              </label>
              <button class="text-[12px] font-semibold text-red-600 hover:underline bg-transparent border-none cursor-pointer" @click="removeTypo(i)">Remover</button>
            </div>
          </div>
        </div>
      </div>

      <!-- GALERIA -->
      <div :class="card">
        <div :class="blockTitle">Galeria</div>
        <DevelopmentGallery :development-id="id" :images="images" @updated="onGalleryUpdated" />
      </div>

      <!-- CARACTERÍSTICAS -->
      <div :class="card">
        <div :class="blockTitle">Características</div>
        <div v-for="[cat, items] in amenityGroups" :key="cat" class="mb-3.5 last:mb-0">
          <div class="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-2">{{ CAT_LABELS[cat] || cat }}</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="a in items"
              :key="a.slug"
              type="button"
              class="h-[30px] px-3 rounded-full text-[12.5px] font-semibold cursor-pointer border transition-all"
              :class="form.amenities.includes(a.slug) ? 'border-transparent bg-brand text-white' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'"
              @click="toggleAmenity(a.slug)"
            >
              {{ a.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- LEGAL & EQUIPE -->
      <div :class="card">
        <div :class="blockTitle">Registro & equipe técnica</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label :class="label">Incorporadora</label><input v-model="form.incorporadora" :class="input" /></div>
          <div><label :class="label">CNPJ</label><input v-model="form.cnpj" :class="input" /></div>
          <div class="sm:col-span-2"><label :class="label">Registro de incorporação</label><input v-model="form.registroIncorporacao" :class="input" /></div>
          <div><label :class="label">Arquitetura</label><input v-model="form.arquitetura" :class="input" /></div>
          <div><label :class="label">Paisagismo</label><input v-model="form.paisagismo" :class="input" /></div>
          <div><label :class="label">Decoração</label><input v-model="form.decoracao" :class="input" /></div>
        </div>
      </div>

      <!-- SEO -->
      <div :class="card">
        <div :class="blockTitle">SEO</div>
        <div class="flex flex-col gap-4">
          <div><label :class="label">Título (SEO)</label><input v-model="form.seoTitle" :class="input" maxlength="200" /></div>
          <div><label :class="label">Descrição (SEO)</label><textarea v-model="form.seoDescription" rows="2" :class="input" class="!h-auto py-2 resize-y" maxlength="300"></textarea></div>
        </div>
      </div>
    </div>
  </div>
</template>
