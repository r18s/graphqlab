<script setup>
import { ref, computed, onMounted } from 'vue'
import { gqlMeasured } from '../lib/graphql'
import { rest, restUrl } from '../lib/rest'

const utf8 = (v) => new TextEncoder().encode(JSON.stringify(v)).length
const fmtBytes = (n) => (n >= 1024 ? `${(n / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB` : `${n} B`)
const sum = (xs) => xs.reduce((a, b) => a + b, 0)
const chips = (obj, used) => Object.keys(obj).map((k) => ({ k, used: used.includes(k) }))

const SCENARIOS = {
  simple: {
    label: 'Lista simples',
    hint: 'Nome e username de todos os usuários: a página inicial do app.',
    gql: `query UsersSimples {\n  users(order_by: { name: asc }) {\n    name\n    username\n  }\n}`,
    restLines: ['GET /users'],
  },
  posts: {
    label: 'Usuários com nº de posts',
    hint: 'Os 12 primeiros usuários com a contagem de posts, como a página Usuários.',
    gql: `query UsersComPosts {\n  users(order_by: { name: asc }, limit: 12) {\n    name\n    username\n    posts_aggregate { aggregate { count } }\n  }\n}`,
    restLines: ['GET /users?limit=12', 'GET /users/:id/posts  (uma vez por usuário)'],
  },
}

const scenario = ref('simple')
const loading = ref(false)
const error = ref('')
const result = ref(null)
let runId = 0

async function runRest(kind) {
  const t0 = performance.now()
  if (kind === 'simple') {
    const r = await rest('/users')
    return {
      requests: 1, rounds: 1, bytes: r.bytes, ms: Math.round(performance.now() - t0),
      useful: utf8(r.data.map(({ name, username }) => ({ name, username }))),
      groups: [{ label: 'cada usuário', fields: chips(r.data[0], ['name', 'username']) }],
    }
  }
  const users = await rest('/users?limit=12')
  const posts = await Promise.all(users.data.map((u) => rest(`/users/${u.id}/posts`)))
  const sample = posts.find((p) => p.data.length)?.data[0] ?? { id: 0, user_id: 0, title: '', body: '', created_at: '' }
  return {
    requests: 1 + posts.length, rounds: 2, bytes: users.bytes + sum(posts.map((p) => p.bytes)), ms: Math.round(performance.now() - t0),
    useful: utf8(users.data.map((u, i) => ({ name: u.name, username: u.username, posts: posts[i].data.length }))),
    groups: [
      { label: 'cada usuário', fields: chips(users.data[0], ['name', 'username']) },
      { label: 'cada post (só a contagem importa)', fields: chips(sample, []) },
    ],
  }
}

async function runGql(kind) {
  const t0 = performance.now()
  const r = await gqlMeasured(SCENARIOS[kind].gql)
  const sample = r.data.users[0]
  return {
    requests: 1, rounds: 1, bytes: r.bytes, ms: Math.round(performance.now() - t0), useful: r.bytes,
    groups: [{ label: 'cada usuário', fields: Object.keys(sample).map((k) => ({ k, used: true })) }],
  }
}

async function run() {
  const id = ++runId
  loading.value = true
  error.value = ''
  try {
    const kind = scenario.value
    // em sequência (não em paralelo) para os tempos de um lado não atrapalharem os do outro
    const r = await runRest(kind)
    const g = await runGql(kind)
    if (id === runId) result.value = { rest: r, gql: g, kind }
  } catch (e) {
    if (id === runId) error.value = e.message
  } finally {
    if (id === runId) loading.value = false
  }
}

const pick = (kind) => { scenario.value = kind; run() }
const ratio = computed(() => (result.value ? result.value.rest.bytes / result.value.gql.bytes : 0))
const pct = (r) => Math.round((r.useful / r.bytes) * 100)

onMounted(run)
</script>

<template>
  <h1>REST <small>x</small> GraphQL</h1>
  <p class="muted">A mesma tela, buscada das duas formas. REST é uma API fake em <code>{{ restUrl }}</code> sobre o mesmo banco: cada recurso devolve a linha inteira.</p>

  <div class="row tabs">
    <button v-for="(s, k) in SCENARIOS" :key="k" class="tab" :class="{ on: scenario === k }" @click="pick(k)">{{ s.label }}</button>
    <button class="again" :disabled="loading" @click="run">↻ Rodar de novo</button>
  </div>
  <p class="muted hint">{{ SCENARIOS[scenario].hint }}</p>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="loading && !result" class="muted">Buscando das duas formas…</p>

  <div v-if="result" class="cols" :class="{ busy: loading }">
    <section v-for="side in ['rest', 'gql']" :key="side" class="card side" :class="side">
      <h2>{{ side === 'rest' ? 'REST' : 'GraphQL' }}</h2>
      <pre class="req">{{ side === 'rest' ? SCENARIOS[result.kind].restLines.join('\n') : SCENARIOS[result.kind].gql }}</pre>

      <div class="stats">
        <div><b>{{ result[side].requests }}</b><span>{{ result[side].requests === 1 ? 'requisição' : 'requisições' }}</span></div>
        <div><b>{{ result[side].rounds }}</b><span>{{ result[side].rounds === 1 ? 'rodada' : 'rodadas' }}</span></div>
        <div><b>{{ fmtBytes(result[side].bytes) }}</b><span>recebidos</span></div>
        <div><b>{{ result[side].ms }} ms</b><span>tempo total</span></div>
      </div>

      <div class="use">
        <div class="bar"><i :style="{ width: pct(result[side]) + '%' }" /></div>
        <span><b>{{ pct(result[side]) }}%</b> dos bytes foram usados pela tela</span>
      </div>

      <div v-for="g in result[side].groups" :key="g.label" class="group">
        <span class="muted">Campos recebidos em {{ g.label }}</span>
        <div class="chips">
          <span v-for="f in g.fields" :key="f.k" class="chip" :class="f.used ? 'used' : 'waste'">{{ f.k }}</span>
        </div>
      </div>
    </section>
  </div>

  <p v-if="result" class="card verdict">
    <span>Para a mesma tela, o REST trouxe <b>{{ ratio.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }}×</b> mais bytes</span>
    <span v-if="result.rest.requests > 1"> e precisou de <b>{{ result.rest.requests }} requisições</b> contra {{ result.gql.requests }}.</span>
    <span v-else>, em {{ result.rest.requests }} requisição, igual ao GraphQL.</span>
    <span class="muted"> Abra o inspetor ⚡ para ver cada chamada.</span>
  </p>
</template>

<style scoped>
.tabs { margin-top: 18px; }
.tab { background: rgb(255 255 255 / 0.06); box-shadow: none; color: var(--muted); }
.tab.on { color: #fff; background: linear-gradient(135deg, rgb(255 45 149 / 0.5), rgb(124 92 255 / 0.5)); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.25); }
.again { margin-left: auto; }
.hint { margin: 10px 0 0; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-top: 16px; transition: opacity 0.2s; }
.cols.busy { opacity: 0.5; }
.side { margin: 0; gap: 14px; }
.side h2 { margin: 0; font-size: 22px; }
.side.rest h2 { color: #fbbf24; }
.side.gql h2 { color: var(--accent); }
.req { margin: 0; padding: 10px 12px; font-size: 12.5px; line-height: 1.5; background: rgb(0 0 0 / 0.3); border: 1px solid rgb(255 255 255 / 0.07); border-radius: 10px; white-space: pre-wrap; color: #cfe0ff; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stats div { display: flex; flex-direction: column; padding: 8px 10px; border-radius: 12px; background: rgb(255 255 255 / 0.05); border: 1px solid rgb(255 255 255 / 0.08); }
.stats b { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.stats span { font-size: 11px; color: var(--muted); }
.use { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.bar { height: 10px; border-radius: 99px; background: rgb(255 92 92 / 0.45); overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--green); border-radius: 99px; transition: width 0.4s; }
.group { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font: 12px var(--mono); padding: 2px 10px; border-radius: 99px; border: 1px solid; }
.chip.used { color: var(--green); background: rgb(52 211 153 / 0.12); border-color: rgb(52 211 153 / 0.5); }
.chip.waste { color: var(--danger); background: rgb(255 92 92 / 0.1); border-color: rgb(255 92 92 / 0.45); text-decoration: line-through; text-decoration-color: rgb(255 92 92 / 0.5); }
.verdict { margin: 16px 0 0; display: block; font-size: 17px; }
</style>
