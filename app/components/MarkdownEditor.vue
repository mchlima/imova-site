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
  }>(),
  { height: '520px', initialEditType: 'wysiwyg', previewStyle: 'vertical' },
)

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
    hideModeSwitch: false,
    usageStatistics: false,
    initialValue: model.value || '',
    autofocus: false,
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['table', 'link'],
      ['code', 'codeblock'],
    ],
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
    <div ref="el" class="imova-md-editor"></div>
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
.imova-md-editor .toastui-editor-mode-switch {
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}
</style>
