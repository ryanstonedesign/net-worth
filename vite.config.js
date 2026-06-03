import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CSP for the built SPA. Inline scripts are forbidden; styles allow inline for
// the Afacad webfont + small style attrs. Network is locked to Supabase only.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ')

function cspPlugin() {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: process.env.GITHUB_PAGES ? '/net-worth/' : '/',
})
