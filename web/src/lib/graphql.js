import { recordOp, delayMs } from './inspector'

const URL = import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:8080/v1/graphql'

export const graphqlUrl = URL

// Cliente mínimo: um POST com { query, variables }. Sem cache, para o fluxo ficar visível.
// Cada operação é registrada no inspetor (painel lateral do app).
// Devolve também o tamanho da resposta e o tempo, usados na página de comparação.
export async function gqlMeasured(query, variables = {}) {
  if (delayMs.value) await new Promise((r) => setTimeout(r, delayMs.value))
  const t0 = performance.now()
  let json
  let bytes = 0
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    const text = await res.text()
    bytes = new TextEncoder().encode(text).length
    json = JSON.parse(text)
  } catch (e) {
    json = { errors: [{ message: `Falha de rede: ${e.message}` }] }
  }
  const ms = Math.round(performance.now() - t0)
  recordOp({ query, variables, data: json.data, errors: json.errors, bytes, ms })
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('\n'))
  return { data: json.data, bytes, ms }
}

export const gql = async (query, variables) => (await gqlMeasured(query, variables)).data
