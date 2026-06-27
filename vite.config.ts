import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'link-preview-middleware',
      configureServer(server: any) {
        server.middlewares.use('/api/extract', async (req: any, res: any) => {
          try {
            const urlString = req.url || ''
            const queryIndex = urlString.indexOf('?')
            if (queryIndex === -1) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing url query parameter' }))
              return
            }
            const queryString = urlString.substring(queryIndex + 1)
            const params = new Map<string, string>()
            queryString.split('&').forEach((param: string) => {
              const [key, value] = param.split('=')
              if (key && value) {
                params.set(key, decodeURIComponent(value))
              }
            })
            const target = params.get('url')

            if (!target) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing url query parameter' }))
              return
            }

            const mod = await import('link-preview-js')
            const getLinkPreview =
              (mod as any).getLinkPreview || (mod as any).default?.getLinkPreview || mod

            const data = await getLinkPreview(target as string)

            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
          } catch (err: any) {
            res.statusCode = 500
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(err?.message ?? err) }))
          }
        })
      },
    },
  ],
})
