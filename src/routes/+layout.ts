// geossoca is a fully client-side app: all data lives in the browser
// (localStorage) and never touches a server. Disable SSR and prerender the
// route shells to static HTML — ideal for Vercel and guarantees data privacy.
export const ssr = false
export const prerender = true
