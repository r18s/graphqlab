import { recordOp, delayMs } from './inspector'

const BASE = import.meta.env.VITE_REST_URL ?? 'http://localhost:8083'

export const restUrl = BASE

// GET simples na API REST fake. Devolve os dados e também o tamanho da resposta (bytes),
// e registra a chamada no inspetor como as do GraphQL.
export async function rest(path) {
  if (delayMs.value) await new Promise((r) => setTimeout(r, delayMs.value))
  const t0 = performance.now()
  const res = await fetch(BASE + path)
  const text = await res.text()
  const bytes = new TextEncoder().encode(text).length
  const ms = Math.round(performance.now() - t0)
  const data = JSON.parse(text)
  recordOp({ kind: 'rest', name: `GET ${path}`, query: `GET ${path}`, data: res.ok ? data : undefined, errors: res.ok ? undefined : [data], bytes, ms })
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return { data, bytes, ms }
}
