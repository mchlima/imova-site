import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Porta fixa do dev server: o backend libera CORS/cookie para http://localhost:3100.
  devServer: { port: 3100 },

  modules: ['@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
    // vuedraggable publica um build UMD no campo "module"; deixar o esbuild
    // pré-empacotar (em vez de transpilar) corrige o default export no client.
    optimizeDeps: {
      include: ['vuedraggable', 'sortablejs'],
    },
  },

  runtimeConfig: {
    public: {
      // NestJS backend base URL (POST /opportunities). Override with NUXT_PUBLIC_API_BASE.
      apiBase: '',
      // Public site origin used in sitemap/robots (ex.: https://meurevelar.com.br).
      // Vazio = deriva do host da requisição. Override com NUXT_PUBLIC_SITE_URL.
      siteUrl: '',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'ReveLar · Simulador avançado',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },
})
