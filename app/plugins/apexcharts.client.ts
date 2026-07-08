import VueApexCharts from 'vue3-apexcharts'

// ApexCharts depende de `window` — registramos só no client (.client.ts).
// Expõe o componente global <apexchart>. Use sempre dentro de <ClientOnly>.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueApexCharts)
})
