<script setup lang="ts">
// Shared SEO/GEO editor block for categories and tags. Mutates the passed
// reactive object directly (parent owns the state).
export interface SeoGeo {
  description: string
  intro: string
  faq: { q: string; a: string }[]
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  ogImage: string
}
const props = defineProps<{ data: SeoGeo; entity: 'categoria' | 'tag' }>()

const field =
  'w-full h-[40px] px-3 text-[14px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15'
const area =
  'w-full px-3 py-2 text-[14px] text-slate-900 border border-slate-300 rounded-lg outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15 resize-y'
const lbl = 'flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 mb-1.5'

function addFaq() {
  props.data.faq.push({ q: '', a: '' })
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Conteúdo / GEO -->
    <section>
      <h4 class="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-3">
        Conteúdo & GEO
      </h4>
      <div class="flex flex-col gap-3">
        <div>
          <label :class="lbl">
            Resumo curto
            <InfoTip>Frase exibida no card desta {{ entity }} nas listagens do site.</InfoTip>
          </label>
          <input v-model="data.description" :class="field" :placeholder="`Sobre esta ${entity}…`" />
        </div>
        <div>
          <label :class="lbl">
            Texto introdutório
            <InfoTip>
              Abre a página da {{ entity }}. Um parágrafo claro respondendo “do que se trata”
              ajuda buscadores e IAs (GEO) a entender e citar o conteúdo.
            </InfoTip>
          </label>
          <textarea v-model="data.intro" rows="3" :class="area" placeholder="Introdução da página…" />
        </div>
        <div>
          <label :class="lbl">
            Perguntas frequentes (FAQ)
            <InfoTip>
              Perguntas e respostas geram rich snippets (FAQPage) e são facilmente citadas
              por IAs de busca. Use as dúvidas mais comuns sobre o tema.
            </InfoTip>
          </label>
          <div class="flex flex-col gap-2.5">
            <div
              v-for="(f, i) in data.faq"
              :key="i"
              class="border border-slate-100 rounded-lg p-3 bg-slate-50/60 flex flex-col gap-2"
            >
              <input v-model="f.q" placeholder="Pergunta" :class="field" />
              <textarea v-model="f.a" placeholder="Resposta" rows="2" :class="area" />
              <button
                type="button"
                class="self-end text-[12.5px] font-semibold text-red-600 cursor-pointer bg-transparent border-none"
                @click="data.faq.splice(i, 1)"
              >
                Remover
              </button>
            </div>
            <button
              type="button"
              class="self-start text-[13px] font-semibold text-brand cursor-pointer bg-transparent border-none"
              @click="addFaq"
            >
              + pergunta
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- SEO -->
    <section>
      <h4 class="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-3">
        SEO
      </h4>
      <div class="flex flex-col gap-3">
        <div>
          <label :class="lbl">
            Meta title
            <InfoTip>Título que aparece na aba do navegador e no Google (~60 caracteres).</InfoTip>
          </label>
          <input v-model="data.metaTitle" :class="field" placeholder="Título para o Google" />
        </div>
        <div>
          <label :class="lbl">
            Meta description
            <InfoTip>Resumo exibido sob o título nos resultados de busca (~155 caracteres).</InfoTip>
          </label>
          <textarea
            v-model="data.metaDescription"
            rows="2"
            :class="area"
            placeholder="Descrição para os resultados de busca"
          />
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label :class="lbl">
              Canonical URL
              <InfoTip>URL preferencial desta página, para evitar conteúdo duplicado. Opcional.</InfoTip>
            </label>
            <input v-model="data.canonicalUrl" :class="field" placeholder="https://…" />
          </div>
          <div>
            <label :class="lbl">
              Imagem (OG)
              <InfoTip>Imagem mostrada ao compartilhar o link em redes sociais.</InfoTip>
            </label>
            <input v-model="data.ogImage" :class="field" placeholder="https://…/imagem.jpg" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
