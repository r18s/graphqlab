// API REST "tradicional" sobre o mesmo Postgres do lab, só para comparar com o GraphQL.
// Como a maioria das APIs REST, cada recurso devolve a linha inteira (SELECT *) mais links de navegação,
// e o cliente não tem como pedir só alguns campos. Daí o overfetching.
import http from 'node:http'
import pg from 'pg'

const PORT = 8083
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const rows = (text, params) => pool.query(text, params).then((r) => r.rows)

const withLinks = (u) => ({ ...u, links: { self: `/users/${u.id}`, posts: `/users/${u.id}/posts` } })

const routes = [
  [/^\/users$/, async (_, url) => {
    const search = url.searchParams.get('search')
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset') ?? 0
    const found = await rows(
      `SELECT * FROM users
        WHERE ($1::text IS NULL OR name ILIKE $1 OR username ILIKE $1)
        ORDER BY name LIMIT $2 OFFSET $3`,
      [search ? `%${search}%` : null, limit ? Number(limit) : null, Number(offset)],
    )
    return found.map(withLinks)
  }],
  [/^\/users\/(\d+)$/, async ([, id]) => {
    const [u] = await rows('SELECT * FROM users WHERE id = $1', [id])
    return u ? withLinks(u) : null
  }],
  [/^\/users\/(\d+)\/posts$/, ([, id]) => rows('SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC', [id])],
  [/^\/posts\/(\d+)\/comments$/, ([, id]) => rows('SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at', [id])],
]

const send = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
  })
  res.end(JSON.stringify(body))
}

http.createServer(async (req, res) => {
  const t0 = Date.now()
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (req.method === 'OPTIONS') return send(res, 204, null)
  if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' })

  let status = 404
  let body = { error: 'not found' }
  for (const [re, handler] of routes) {
    const m = url.pathname.match(re)
    if (!m) continue
    try {
      const data = await handler(m, url)
      status = data === null ? 404 : 200
      body = data === null ? { error: 'not found' } : data
    } catch (e) {
      status = 500
      body = { error: e.message }
    }
    break
  }
  send(res, status, body)
  console.log(`${req.method} ${req.url} -> ${status} (${Date.now() - t0} ms)`)
}).listen(PORT, () => console.log(`REST fake em http://localhost:${PORT}`))
