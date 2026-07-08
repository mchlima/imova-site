// robots.txt — libera o site, bloqueia o admin e aponta o sitemap.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const base = (
    (config.public.siteUrl as string) || getRequestURL(event).origin
  ).replace(/\/+$/, '')

  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${base}/sitemap.xml
`
})
