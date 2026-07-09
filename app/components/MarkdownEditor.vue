<script setup lang="ts">
// WYSIWYG + raw-markdown editor (Toast UI). Stores markdown. The built-in bottom
// tabs let the author switch between "Markdown" (raw) and "WYSIWYG" (visual) and
// write in either mode. Browser-only — mounted on the client.
const model = defineModel<string>({ default: '' })
const props = withDefaults(
  defineProps<{
    height?: string
    initialEditType?: 'markdown' | 'wysiwyg'
    previewStyle?: 'vertical' | 'tab'
    // esconde o alternador Markdown/WYSIWYG do rodapé (evita confusão em editores simples)
    hideModeSwitch?: boolean
    // 'full' = barra completa (CMS); 'simple' = essencial (negrito, listas, etc.)
    toolbar?: 'full' | 'simple'
    placeholder?: string
  }>(),
  {
    height: '520px',
    initialEditType: 'wysiwyg',
    previewStyle: 'vertical',
    hideModeSwitch: false,
    toolbar: 'full',
    placeholder: '',
  },
)

const TOOLBARS = {
  full: [
    ['heading', 'bold', 'italic', 'strike'],
    ['hr', 'quote'],
    ['ul', 'ol', 'task'],
    ['table', 'link'],
    ['code', 'codeblock'],
  ],
  simple: [['bold', 'italic'], ['ul', 'ol'], ['link']],
}

const el = ref<HTMLElement | null>(null)
let editor: { getMarkdown: () => string; setMarkdown: (v: string, cursor?: boolean) => void; destroy: () => void } | null =
  null

onMounted(async () => {
  const [{ default: Editor }] = await Promise.all([
    import('@toast-ui/editor'),
    // @ts-expect-error — CSS side-effect import
    import('@toast-ui/editor/dist/toastui-editor.css'),
  ])
  if (!el.value) return
  editor = new Editor({
    el: el.value,
    height: props.height,
    initialEditType: props.initialEditType,
    previewStyle: props.previewStyle,
    hideModeSwitch: props.hideModeSwitch,
    usageStatistics: false,
    initialValue: model.value || '',
    autofocus: false,
    placeholder: props.placeholder,
    toolbarItems: TOOLBARS[props.toolbar],
    events: {
      change: () => {
        if (editor) model.value = editor.getMarkdown()
      },
    },
  })
})

// Keep editor in sync when the model is replaced externally (e.g. after load()).
watch(model, (v) => {
  if (editor && v !== editor.getMarkdown()) editor.setMarkdown(v || '', false)
})

onBeforeUnmount(() => {
  editor?.destroy()
  editor = null
})
</script>

<template>
  <ClientOnly>
    <div ref="el" class="imova-md-editor" :class="{ 'imova-md-editor--light': props.toolbar === 'simple' }"></div>
    <template #fallback>
      <div
        class="flex items-center justify-center text-slate-400 text-[14px] border border-slate-200 rounded-lg bg-slate-50"
        :style="{ height: props.height }"
      >
        Carregando editor…
      </div>
    </template>
  </ClientOnly>
</template>

<style>
/* Align Toast UI with the app's rounded/neutral look. */
.imova-md-editor .toastui-editor-defaultUI {
  border-color: #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  font-family: inherit;
}
.imova-md-editor .toastui-editor-toolbar {
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}
/* conteúdo mais legível e alinhado à tipografia do app */
.imova-md-editor .toastui-editor-contents {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.65;
}
/* placeholder mais suave */
.imova-md-editor .toastui-editor-defaultUI .placeholder,
.imova-md-editor .toastui-editor .placeholder {
  color: #94a3b8;
}
/* realça o editor ao focar */
.imova-md-editor .toastui-editor-defaultUI:focus-within {
  border-color: #146c4e;
  box-shadow: 0 0 0 3px rgba(20, 108, 78, 0.12);
}
.imova-md-editor .toastui-editor-mode-switch {
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

/* ── variante "leve" (toolbar simple) ── barra discreta, sem peso visual ── */
.imova-md-editor--light .toastui-editor-defaultUI {
  border-radius: 10px;
}
.imova-md-editor--light .toastui-editor-toolbar {
  background: transparent;
}
.imova-md-editor--light .toastui-editor-defaultUI-toolbar {
  padding: 3px 6px;
  background: transparent;
  border-bottom: 1px solid #f1f5f9;
}
/* botões: sem borda/fundo, hover suave, cantos arredondados */
.imova-md-editor--light .toastui-editor-toolbar-icons {
  border: 0;
  margin: 1px;
  border-radius: 6px;
  background-color: transparent;
  opacity: 0.7;
}
.imova-md-editor--light .toastui-editor-toolbar-icons:not(:disabled):hover {
  border: 0;
  background-color: #f1f5f9;
  opacity: 1;
}
/* remove divisórias e bordas de grupo (o que deixava a barra "pesada") */
.imova-md-editor--light .toastui-editor-toolbar-group {
  margin: 0;
}
.imova-md-editor--light .toastui-editor-toolbar-divider {
  display: none;
}
</style>
