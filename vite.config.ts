import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_KEYS = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'SLACK_WEBHOOK_URL', 'SLACK_APPROVAL_WEBHOOK_URL']

/**
 * 개발 서버에서도 api/*.ts 서버 함수를 그대로 돌린다(배포 환경의 Vercel 함수와 같은 코드).
 * 키는 프로젝트 루트의 .env.local 에 둔다 — `*.local` 은 git에 올라가지 않는다.
 */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const k of API_KEYS) if (env[k] && !process.env[k]) process.env[k] = env[k]

      server.middlewares.use(async (req, res, next) => {
        const m = /^\/api\/([a-z]+)(?:\?.*)?$/.exec(req.url ?? '')
        if (!m) return next()
        const send = (code: number, body: unknown) => {
          res.statusCode = code
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          let body: unknown = undefined
          try {
            body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined
          } catch {
            body = undefined
          }
          const mod = (await server.ssrLoadModule(`/api/${m[1]}.ts`).catch(() => null)) as { default?: (q: unknown, r: unknown) => unknown } | null
          if (!mod?.default) return send(404, { error: 'not_found' })
          const api = {
            status(code: number) {
              res.statusCode = code
              return api
            },
            json: (b: unknown) => {
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(b))
            },
            setHeader: (k: string, v: string) => res.setHeader(k, v),
          }
          await mod.default({ method: req.method, headers: req.headers, body }, api)
        } catch {
          if (!res.headersSent) send(500, { error: 'server_error' })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
})
