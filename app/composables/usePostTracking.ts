// Mede o engajamento de leitura de forma resiliente (modelo heartbeat):
// - registra a visualização na abertura (nunca se perde);
// - acumula tempo ATIVO (aba visível + sem ociosidade) segundo a segundo;
// - envia heartbeats periódicos (merge por MAX no backend) → uma queda de energia
//   perde no máximo o último intervalo;
// - mede atenção por faixa de scroll (mapa de calor) e profundidade máxima.

const BUCKETS = 20
const HEARTBEAT_MS = 12000
const IDLE_MS = 30000
const DEDUP_MS = 30 * 60 * 1000

export function usePostTracking(slug: Ref<string>, articleEl: Ref<HTMLElement | null>) {
  if (!import.meta.client) return

  const apiBase = useRuntimeConfig().public.apiBase
  let viewId: string | null = null
  let activeSeconds = 0
  let maxScroll = 0
  const buckets = new Array(BUCKETS).fill(0)
  let lastActivity = Date.now()
  let tickTimer: ReturnType<typeof setInterval> | null = null
  let beatTimer: ReturnType<typeof setInterval> | null = null
  let stopped = false

  const markActivity = () => (lastActivity = Date.now())

  function scrollMetrics() {
    const el = articleEl.value
    if (!el) return { band: 0, depth: 0 }
    const rect = el.getBoundingClientRect()
    const top = rect.top + window.scrollY
    const height = Math.max(el.offsetHeight, 1)
    const center = window.scrollY + window.innerHeight / 2
    const bottom = window.scrollY + window.innerHeight
    const pos = Math.min(Math.max((center - top) / height, 0), 0.9999)
    const depth = Math.min(Math.max(Math.round(((bottom - top) / height) * 100), 0), 100)
    return { band: Math.floor(pos * BUCKETS), depth }
  }

  function tick() {
    if (stopped) return
    if (document.visibilityState !== 'visible') return
    if (Date.now() - lastActivity > IDLE_MS) return
    activeSeconds += 1
    const { band, depth } = scrollMetrics()
    buckets[band] = (buckets[band] || 0) + 1
    if (depth > maxScroll) maxScroll = depth
  }

  function payload() {
    return JSON.stringify({ activeSeconds, maxScroll, buckets })
  }
  function beat(useBeacon = false) {
    if (!viewId || activeSeconds === 0) return
    const url = `${apiBase}/content/views/${viewId}/heartbeat`
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload()], { type: 'application/json' }))
    } else {
      // keepalive garante o envio mesmo durante a navegação
      $fetch(url, { method: 'POST', body: payload(), keepalive: true } as never).catch(() => {})
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') beat(true)
    else markActivity()
  }
  function onScroll() {
    markActivity()
    const { depth } = scrollMetrics()
    if (depth > maxScroll) maxScroll = depth
  }

  const activityEvents = ['mousemove', 'keydown', 'pointerdown', 'touchstart'] as const

  async function start() {
    const key = `pv:${slug.value}`
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (saved && Date.now() - saved.ts < DEDUP_MS) viewId = saved.id
    } catch {
      /* ignore */
    }
    if (!viewId) {
      try {
        const res = await $fetch<{ id: string }>(`/content/posts/${slug.value}/view`, {
          baseURL: apiBase,
          method: 'POST',
          body: {
            device: window.innerWidth < 768 ? 'mobile' : 'desktop',
            referrer: document.referrer || '',
          },
        })
        viewId = res.id
        sessionStorage.setItem(key, JSON.stringify({ id: viewId, ts: Date.now() }))
      } catch {
        return // post não publicado / erro — não rastreia
      }
    }
    tickTimer = setInterval(tick, 1000)
    beatTimer = setInterval(() => beat(false), HEARTBEAT_MS)
    activityEvents.forEach((e) => window.addEventListener(e, markActivity, { passive: true }))
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', () => beat(true))
  }

  function stop() {
    stopped = true
    if (tickTimer) clearInterval(tickTimer)
    if (beatTimer) clearInterval(beatTimer)
    activityEvents.forEach((e) => window.removeEventListener(e, markActivity))
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('visibilitychange', onVisibility)
    beat(true)
  }

  onMounted(start)
  onBeforeUnmount(stop)
}
