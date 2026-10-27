import { reactive, ref, watch } from 'vue'

const MAX_OPS = 50
const MAX_RESPONSE_CHARS = 30000

export const ops = reactive([])
export const panelOpen = ref(false)
// Atraso simulado antes de cada requisição, para dar tempo de ver o que acontece.
const savedDelay = () => { try { return Number(localStorage.getItem('graphqlab:delay')) || 0 } catch { return 0 } }
export const delayMs = ref(savedDelay())
watch(delayMs, (v) => { try { localStorage.setItem('graphqlab:delay', String(v)) } catch {} })

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const KEYWORDS = new Set(['query', 'mutation', 'subscription', 'fragment', 'on', 'true', 'false', 'null'])

// Destaque simples para GraphQL e JSON. O texto é escapado antes, então o v-html é seguro.
export function highlight(src) {
  const re = /(#.*$)|("(?:[^"\\\n]|\\.)*")(\s*:)?|(\$[A-Za-z_]\w*)|(-?\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/gm
  return esc(src).replace(re, (m, comment, str, colon, variable, num, id) => {
    if (comment) return `<span class="t-c">${comment}</span>`
    if (str) return `<span class="${colon ? 't-k' : 't-s'}">${str}</span>${colon ?? ''}`
    if (variable) return `<span class="t-v">${variable}</span>`
    if (num) return `<span class="t-n">${num}</span>`
    if (KEYWORDS.has(id)) return `<span class="t-w">${id}</span>`
    return m
  })
}

// Remove a indentação comum para a query ficar legível.
function dedent(s) {
  const lines = s.replace(/^\n+|\s+$/g, '').split('\n')
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length))
  return lines.map((l) => l.slice(indent)).join('\n')
}

// valor JS -> literal GraphQL (chaves sem aspas; asc/desc são enums, então também ficam sem aspas)
const ENUM = /^(asc|desc)(_nulls_(first|last))?$/
function literal(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'string') return ENUM.test(v) ? v : JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(literal).join(', ')}]`
  if (typeof v === 'object') {
    const entries = Object.entries(v).map(([k, x]) => `${k}: ${literal(x)}`)
    return entries.length ? `{ ${entries.join(', ')} }` : '{}'
  }
  return String(v)
}

// Deixa a query "pronta para ler": tira a declaração ($x: Tipo!) e troca cada $x pelo valor enviado.
function inlineVariables(query, variables) {
  let out = query.replace(/^(query|mutation|subscription)(\s+\w+)?\s*\([^)]*\)/, '$1$2')
  for (const [name, value] of Object.entries(variables ?? {})) {
    out = out.replace(new RegExp(`\\$${name}\\b`, 'g'), () => literal(value))
  }
  return out
}

let seq = 0

// kind 'rest' = chamada REST: `query` é a linha da requisição (ex.: GET /users) e `name` já vem pronto
export function recordOp({ query, variables, data, errors, ms, bytes, kind, name }) {
  const isRest = kind === 'rest'
  const clean = isRest ? query : inlineVariables(dedent(query), variables)
  const head = isRest ? null : clean.match(/(query|mutation|subscription)\s*(\w*)/)
  const body = JSON.stringify(errors ?? data ?? null, null, 2)
  const truncated = body.length > MAX_RESPONSE_CHARS
  // só a operação mais nova abre sozinha; as que você abriu à mão ficam como estão
  ops.forEach((o) => { if (!o.touched) o.open = false })
  ops.unshift({
    id: ++seq,
    open: true,
    touched: false,
    kind: isRest ? 'rest' : head ? head[1] : 'query',
    name: isRest ? name : head && head[2] ? head[2] : '(anônima)',
    ms,
    bytes,
    time: new Date().toLocaleTimeString('pt-BR'),
    error: !!errors,
    query: clean,
    response: body,
    truncated,
    html: {
      query: highlight(clean),
      resp: highlight(truncated ? body.slice(0, MAX_RESPONSE_CHARS) + '\n…' : body),
    },
  })
  if (ops.length > MAX_OPS) ops.length = MAX_OPS
}

export const clearOps = () => ops.splice(0, ops.length)
