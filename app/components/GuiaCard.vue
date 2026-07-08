<script setup lang="ts">
import type { GuiaCardArticle } from '~/composables/useCms'

export type Article = GuiaCardArticle
defineProps<{ article: Article }>()
</script>

<template>
  <NuxtLink
    :to="`/guias/${article.slug}`"
    class="group flex flex-col bg-white border border-slate-100 rounded-[10px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden no-underline transition-all hover:border-slate-300 hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.22)] hover:-translate-y-0.5"
  >
    <div class="h-[120px] border-b border-slate-100 overflow-hidden">
      <img
        v-if="article.cover"
        :src="article.cover"
        :alt="article.title"
        loading="lazy"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center"
        style="
          background: repeating-linear-gradient(
            135deg,
            #f8fafc,
            #f8fafc 9px,
            #f1f5f9 9px,
            #f1f5f9 18px
          );
        "
      >
        <span class="font-mono text-[10.5px] text-slate-400">{{ article.category }}</span>
      </div>
    </div>
    <div class="p-5 flex flex-col flex-1">
      <span
        class="text-[11px] font-semibold text-brand uppercase tracking-[0.04em] mb-[9px]"
        >{{ article.category }}</span
      >
      <h3
        class="text-[16.5px] font-bold leading-[1.3] tracking-[-0.01em] m-0 mb-2 text-slate-900"
      >
        {{ article.title }}
      </h3>
      <p class="text-[13.5px] leading-[1.55] text-slate-500 m-0 mb-4 flex-1">
        {{ article.summary }}
      </p>
      <div class="flex gap-1.5 flex-wrap">
        <span
          v-for="(tg, i) in article.tags"
          :key="i"
          class="inline-flex items-center h-[22px] px-[9px] bg-slate-100 rounded-[5px] text-[11px] text-slate-500 font-medium"
          >{{ tg }}</span
        >
      </div>
    </div>
  </NuxtLink>
</template>
