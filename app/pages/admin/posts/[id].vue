<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const id = route.params.id as string
const { api } = useAdminApi()

interface Category { id: string; name: string; level: number; parentId: string | null }
interface Tag { id: string; name: string }
type Status = 'draft' | 'published' | 'changed' | 'archived'

const form = reactive({
  title: '',
  slug: '',
  deck: '',
  body: '',
  bullets: [] as string[],
  faq: [] as { q: string; a: string }[],
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogImage: '',
  categoryId: '' as string | null,
  tagIds: [] as string[],
})
const coverImageUrl = ref('')
const status = ref<Status>('draft')
const archived = ref(false)
const publishedAt = ref<string | null>(null)
const cats = ref<Category[]>([])
const tags = ref<Tag[]>([])
const saving = ref(false)
const msg = ref('')
const loaded = ref(false)
const menuOpen = ref(false)

const catOptions = computed(() =>
  cats.value.map((c) => ({ value: c.id, label: `${'— '.repeat(c.level - 1)}${c.name}` })),
)

// assinatura do formulário para detectar edições não salvas (dirty)
const baseline = ref('')
function formSignature() {
  return JSON.stringify({
    title: form.title, slug: form.slug, deck: form.deck, body: form.body,
    bullets: form.bullets, faq: form.faq,
    metaTitle: form.metaTitle, metaDescription: form.metaDescription,
    canonicalUrl: form.canonicalUrl, ogImage: form.ogImage,
    categoryId: form.categoryId, tagIds: [...form.tagIds].sort(),
    cover: coverImageUrl.value,
  })
}
const dirty = computed(() => baseline.value !== '' && formSignature() !== baseline.value)

// botão de publicar só aparece quando há o que publicar:
// rascunho novo, alterações já salvas (changed) ou edições não salvas no ar.
const showPublish = computed(() => {
  if (archived.value) return false
  if (status.value === 'draft' || status.value === 'changed') return true
  return dirty.value
})
const publishLabel = computed(() => (status.value === 'draft' ? 'Publicar' : 'Publicar alterações'))

async function load() {
  const [p, c, t] = await Promise.all([
    api<Record<string, unknown>>(`/admin/posts/${id}`),
    api<Category[]>('/admin/categories'),
    api<Tag[]>('/admin/tags'),
  ])
  cats.value = c
  tags.value = t
  Object.assign(form, {
    title: p.title,
    slug: p.slug,
    deck: p.deck ?? '',
    body: p.body ?? '',
    bullets: Array.isArray(p.bullets) ? p.bullets : [],
    faq: Array.isArray(p.faq) ? p.faq : [],
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    canonicalUrl: p.canonicalUrl ?? '',
    ogImage: p.ogImage ?? '',
    categoryId: (p.categoryId as string) ?? '',
    tagIds: (p.tagIds as string[]) ?? [],
  })
  coverImageUrl.value = (p.coverImageUrl as string) ?? ''
  status.value = p.status as Status
  archived.value = !!p.archived
  publishedAt.value = (p.publishedAt as string) ?? null
  loaded.value = true
  baseline.value = formSignature()
}
onMounted(load)

function toggleTag(tid: string) {
  const i = form.tagIds.indexOf(tid)
  if (i >= 0) form.tagIds.splice(i, 1)
  else form.tagIds.push(tid)
}

function flash(text: string) {
  msg.value = text
  setTimeout(() => (msg.value = ''), 2200)
}
async function patch() {
  await api(`/admin/posts/${id}`, {
    method: 'PATCH',
    body: { ...form, categoryId: form.categoryId || null },
  })
}
async function save() {
  saving.value = true
  try {
    await patch()
    await load()
    flash('Rascunho salvo')
  } catch {
    flash('Erro ao salvar')
  } finally {
    saving.value = false
  }
}
async function publish() {
  saving.value = true
  try {
    await patch()
    await api(`/admin/posts/${id}/publish`, { method: 'POST' })
    await load()
    flash('Publicado')
  } catch {
    flash('Erro ao publicar')
  } finally {
    saving.value = false
  }
}
async function runAction(path: string, label: string) {
  menuOpen.value = false
  saving.value = true
  try {
    await api(`/admin/posts/${id}/${path}`, { method: 'POST' })
    await load()
    flash(label)
  } finally {
    saving.value = false
  }
}
async function remove() {
  menuOpen.value = false
  if (!confirm('Excluir este post? Esta ação não pode ser desfeita.')) return
  await api(`/admin/posts/${id}`, { method: 'DELETE' })
  await navigateTo('/admin/posts')
}

const statusInfo: Record<Status, { label: string; cls: string; hint: string }> = {
  draft: {
    label: 'Rascunho',
    cls: 'bg-slate-100 text-slate-600',
    hint: 'Ainda não está no site. Publique para torná-lo visível.',
  },
  published: {
    label: 'Publicado',
    cls: 'bg-brand-soft text-brand',
    hint: 'No ar. A versão publicada reflete o último “Publicar”.',
  },
  changed: {
    label: 'Alterações não publicadas',
    cls: 'bg-[#FEF6E7] text-amber-700',
    hint: 'Há alterações salvas que ainda não estão no site. Publique para aplicá-las.',
  },
  archived: {
    label: 'Arquivado',
    cls: 'bg-slate-200 text-slate-500',
    hint: 'Removido do site sem ser apagado. Desarquive para reativar.',
  },
}

const field =
  'w-full h-[40px] px-3 text-[14px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15'
const area =
  'w-full px-3 py-2 text-[14px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 resize-y'
const lbl = 'flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 mb-1.5'
const cardTitle = 'text-[13px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-4'
const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR')
</script>

<template>
  <div class="p-4 sm:p-6">
    <!-- TOP BAR -->
    <div class="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        <NuxtLink
          to="/admin/posts"
          class="inline-flex items-center gap-1 text-[13px] text-slate-500 no-underline hover:text-slate-800"
          >← Posts</NuxtLink
        >
        <h1 class="text-[22px] font-extrabold tracking-[-0.02em] text-slate-900 m-0 mt-1">
          {{ form.title || 'Editar post' }}
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <Transition
          enter-active-class="transition-opacity duration-150"
          enter-from-class="opacity-0"
          leave-active-class="transition-opacity duration-150"
          leave-to-class="opacity-0"
        >
          <span v-if="msg" class="text-[13px] font-semibold text-brand mr-1">{{ msg }}</span>
        </Transition>
        <button
          class="h-[38px] px-4 bg-white border border-slate-300 text-slate-700 text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-slate-100 disabled:opacity-60"
          :disabled="saving"
          @click="save"
        >
          Salvar rascunho
        </button>
        <button
          v-if="showPublish"
          class="inline-flex items-center gap-1.5 h-[38px] px-4 bg-brand text-white text-[13px] font-semibold rounded-lg cursor-pointer hover:bg-brand-dark border-none disabled:opacity-60"
          :disabled="saving"
          @click="publish"
        >
          <AdminIcon name="publish" :size="15" />
          {{ publishLabel }}
        </button>
        <!-- menu mais ações -->
        <div class="relative">
          <button
            class="inline-flex items-center justify-center w-[38px] h-[38px] bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            @click="menuOpen = !menuOpen"
          >
            <AdminIcon name="dots" :size="18" />
          </button>
          <div v-if="menuOpen" class="fixed inset-0 z-20" @click="menuOpen = false"></div>
          <div
            v-if="menuOpen"
            class="absolute right-0 mt-2 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-12px_rgba(15,23,42,0.25)] overflow-hidden py-1"
          >
            <a
              v-if="status === 'published' || status === 'changed'"
              :href="`/guias/${form.slug}`"
              target="_blank"
              class="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 no-underline hover:bg-slate-50"
            >
              <AdminIcon name="eye" :size="15" /> Ver no site
            </a>
            <button
              v-if="status === 'published' || status === 'changed'"
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left"
              @click="runAction('unpublish', 'Voltou para rascunho')"
            >
              <AdminIcon name="draft" :size="15" /> Voltar para rascunho
            </button>
            <button
              v-if="!archived"
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left"
              @click="runAction('archive', 'Arquivado')"
            >
              <AdminIcon name="archive" :size="15" /> Arquivar
            </button>
            <button
              v-else
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer bg-transparent border-none text-left"
              @click="runAction('unarchive', 'Desarquivado')"
            >
              <AdminIcon name="archive" :size="15" /> Desarquivar
            </button>
            <div class="h-px bg-slate-100 my-1"></div>
            <button
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium text-red-600 hover:bg-red-50 cursor-pointer bg-transparent border-none text-left"
              @click="remove"
            >
              <AdminIcon name="trash" :size="15" /> Excluir
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-5 items-start">
      <!-- COLUNA PRINCIPAL -->
      <div class="flex flex-col gap-5 min-w-0">
        <!-- capa -->
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 :class="cardTitle" class="flex items-center gap-1.5">
            Imagem de capa
            <InfoTip>
              Aparece no topo do guia e nos cards. É convertida para WebP no navegador antes
              do envio. Trocar ou remover apaga a anterior do armazenamento.
            </InfoTip>
          </h3>
          <CoverImageInput v-if="loaded" :post-id="id" v-model="coverImageUrl" />
        </div>

        <!-- conteúdo -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <label :class="lbl">Título</label>
            <input v-model="form.title" :class="field" placeholder="Título do guia" />
          </div>
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label :class="lbl">
                Slug
                <InfoTip>Parte final da URL: /guias/<b>seu-slug</b>. Gerado do título; edite com cuidado depois de publicado.</InfoTip>
              </label>
              <input v-model="form.slug" :class="field" />
            </div>
            <div>
              <label :class="lbl">Deck (subtítulo)</label>
              <input v-model="form.deck" :class="field" placeholder="Uma linha que resume o guia" />
            </div>
          </div>
          <div>
            <label :class="lbl">
              Conteúdo
              <InfoTip :width="280">
                Use as abas no rodapé do editor para alternar entre <b>WYSIWYG</b> (escrita visual)
                e <b>Markdown</b> (texto puro). O conteúdo é salvo como markdown.
              </InfoTip>
            </label>
            <MarkdownEditor v-if="loaded" v-model="form.body" />
          </div>
        </div>

        <!-- GEO: resumo em 1 minuto -->
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 :class="cardTitle" class="flex items-center gap-1.5">
            Resumo direto em 1 minuto
            <InfoTip :width="280">
              Aparece em destaque no topo do post. Bullets curtos e diretos são facilmente
              citados por IAs de busca (GEO). Aceita <b>**negrito**</b>.
            </InfoTip>
          </h3>
          <div class="flex flex-col gap-2">
            <div v-for="(b, i) in form.bullets" :key="i" class="flex gap-2 items-center">
              <span class="text-brand font-bold text-[14px] w-5 text-center">{{ i + 1 }}.</span>
              <input v-model="form.bullets[i]" :class="field" placeholder="Ponto-chave do guia" />
              <button
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer bg-transparent border-none shrink-0"
                @click="form.bullets.splice(i, 1)"
              >
                <AdminIcon name="trash" :size="15" />
              </button>
            </div>
            <button
              class="self-start text-[13px] font-semibold text-brand cursor-pointer bg-transparent border-none mt-1"
              @click="form.bullets.push('')"
            >
              + bullet
            </button>
          </div>
        </div>

        <!-- GEO: FAQ -->
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 :class="cardTitle" class="flex items-center gap-1.5">
            Perguntas frequentes (FAQ)
            <InfoTip :width="280">
              Geram rich snippets (FAQPage) no Google e são muito usadas por IAs.
              Responda as dúvidas mais comuns sobre o tema do guia.
            </InfoTip>
          </h3>
          <div class="flex flex-col gap-3">
            <div
              v-for="(f, i) in form.faq"
              :key="i"
              class="border border-slate-100 rounded-lg p-3 bg-slate-50/60 flex flex-col gap-2"
            >
              <input v-model="f.q" placeholder="Pergunta" :class="field" />
              <textarea v-model="f.a" placeholder="Resposta" rows="2" :class="area" />
              <button
                class="self-end text-[12.5px] font-semibold text-red-600 cursor-pointer bg-transparent border-none"
                @click="form.faq.splice(i, 1)"
              >
                Remover
              </button>
            </div>
            <button
              class="self-start text-[13px] font-semibold text-brand cursor-pointer bg-transparent border-none"
              @click="form.faq.push({ q: '', a: '' })"
            >
              + pergunta
            </button>
          </div>
        </div>
      </div>

      <!-- SIDEBAR -->
      <div class="flex flex-col gap-5 lg:sticky lg:top-[76px]">
        <!-- publicação -->
        <div class="bg-white border border-slate-200 rounded-xl p-5">
          <h3 :class="cardTitle">Publicação</h3>
          <span
            class="inline-flex items-center h-[24px] px-2.5 rounded-md text-[12px] font-semibold"
            :class="statusInfo[status].cls"
            >{{ statusInfo[status].label }}</span
          >
          <p class="text-[12.5px] leading-[1.5] text-slate-500 mt-3 mb-0">
            {{ statusInfo[status].hint }}
          </p>
          <p v-if="publishedAt" class="text-[12px] text-slate-400 mt-2 mb-0">
            Publicado em {{ fmtDate(publishedAt) }}
          </p>
        </div>

        <!-- audiência / analytics -->
        <PostAnalytics v-if="loaded" :post-id="id" />

        <!-- organização -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
          <h3 :class="cardTitle">Organização</h3>
          <div>
            <label :class="lbl">
              Categoria
              <InfoTip>Define o caminho (breadcrumb) e as páginas de categoria onde o guia aparece.</InfoTip>
            </label>
            <SearchableSelect
              v-model="form.categoryId"
              :options="catOptions"
              placeholder="Sem categoria"
              search-placeholder="Buscar…"
            />
          </div>
          <div>
            <label :class="lbl">Tags</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="t in tags"
                :key="t.id"
                type="button"
                class="h-[30px] px-3 rounded-full text-[12.5px] font-semibold border cursor-pointer transition-all"
                :class="
                  form.tagIds.includes(t.id)
                    ? 'bg-brand-soft text-brand border-transparent'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                "
                @click="toggleTag(t.id)"
              >
                {{ t.name }}
              </button>
              <NuxtLink
                v-if="tags.length === 0"
                to="/admin/tags"
                class="text-[13px] text-brand no-underline font-semibold"
                >Criar tags →</NuxtLink
              >
            </div>
          </div>
        </div>

        <!-- SEO -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3">
          <h3 :class="cardTitle">SEO</h3>
          <div>
            <label :class="lbl">
              Meta title
              <InfoTip>Título nos resultados do Google e na aba do navegador (~60 caracteres). Vazio = usa o título do post.</InfoTip>
            </label>
            <input v-model="form.metaTitle" :class="field" placeholder="Título para o Google" />
          </div>
          <div>
            <label :class="lbl">
              Meta description
              <InfoTip>Resumo sob o título nos resultados de busca (~155 caracteres).</InfoTip>
            </label>
            <textarea
              v-model="form.metaDescription"
              rows="3"
              :class="area"
              placeholder="Descrição para os resultados de busca"
            />
          </div>
          <div>
            <label :class="lbl">
              Canonical URL
              <InfoTip>URL preferencial, para evitar conteúdo duplicado. Opcional.</InfoTip>
            </label>
            <input v-model="form.canonicalUrl" :class="field" placeholder="https://…" />
          </div>
          <div>
            <label :class="lbl">
              Imagem (OG)
              <InfoTip>Imagem exibida ao compartilhar o link em redes sociais.</InfoTip>
            </label>
            <input v-model="form.ogImage" :class="field" placeholder="https://…/imagem.jpg" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
