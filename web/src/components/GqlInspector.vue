<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { ops, panelOpen, delayMs, clearOps } from '../lib/inspector'

const hasError = computed(() => ops.some((o) => o.error))

const fmtBytes = (n) => (n >= 1024 ? `${(n / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB` : `${n} B`)
const copy = (text) => navigator.clipboard?.writeText(text)
// só marca como "mexido pelo usuário" quando o DOM diverge do estado (ou seja, foi um clique)
const onToggle = (o, e) => {
  if (e.target.open !== o.open) { o.open = e.target.open; o.touched = true }
}
const onKey = (e) => { if (e.key === 'Escape') panelOpen.value = false }

// com o painel aberto o conteúdo é empurrado para a esquerda (ver .gi-open no CSS), em vez de ficar sob o painel
watch(panelOpen, (v) => document.body.classList.toggle('gi-open', v), { immediate: true })

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.body.classList.remove('gi-open')
})
</script>

<template>
  <button v-if="!panelOpen" class="gi-toggle" :class="{ err: hasError }" title="Inspetor GraphQL" @click="panelOpen = true">
    ⚡ GraphQL <span class="gi-count">{{ ops.length }}</span>
  </button>

  <aside v-if="panelOpen" class="gi-panel" aria-label="Inspetor GraphQL">
    <header class="gi-head">
      <div class="gi-row">
        <strong>Inspetor GraphQL</strong>
        <span class="gi-muted">{{ ops.length }} operações</span>
        <span class="gi-spacer" />
        <button class="gi-btn" @click="clearOps">Limpar</button>
        <button class="gi-btn" title="Fechar (Esc)" @click="panelOpen = false">✕</button>
      </div>
      <label class="gi-row gi-muted gi-delay">
        Atraso simulado
        <select v-model.number="delayMs">
          <option :value="0">nenhum</option>
          <option :value="500">0,5 s</option>
          <option :value="1000">1 s</option>
          <option :value="2000">2 s</option>
          <option :value="3000">3 s</option>
        </select>
        <span>por requisição, para dar tempo de ver</span>
      </label>
    </header>

    <p v-if="!ops.length" class="gi-muted gi-empty">Nenhuma operação ainda. Navegue pelo app e elas aparecem aqui.</p>

    <details v-for="o in ops" :key="o.id" class="gi-op" :open="o.open" @toggle="onToggle(o, $event)">
      <summary>
        <span class="gi-kind" :class="o.kind">{{ o.kind }}</span>
        <b>{{ o.name }}</b>
        <span class="gi-muted">{{ o.ms }} ms · {{ fmtBytes(o.bytes) }} · {{ o.time }}</span>
        <span v-if="o.error" class="gi-bad">erro</span>
      </summary>

      <section>
        <h4>Pedido <span class="gi-muted">{{ o.kind === 'rest' ? 'requisição HTTP' : 'com os valores já aplicados' }}</span><button class="gi-btn" @click="copy(o.query)">copiar</button></h4>
        <pre v-html="o.html.query"></pre>
      </section>
      <section>
        <h4>
          {{ o.error ? 'Erro' : 'Resposta' }}
          <span class="gi-muted">{{ o.response.length.toLocaleString('pt-BR') }} caracteres{{ o.truncated ? ' (exibição truncada)' : '' }}</span>
          <button class="gi-btn" @click="copy(o.response)">copiar</button>
        </h4>
        <pre class="gi-resp" v-html="o.html.resp"></pre>
      </section>
    </details>
  </aside>
</template>

<style>
.gi-toggle { position: fixed; right: 18px; bottom: 18px; z-index: 40; border-radius: 99px; padding: 9px 18px; }
.gi-toggle.err { background: var(--danger); border-color: var(--danger); }
.gi-count { background: rgb(255 255 255 / 0.25); border-radius: 99px; padding: 0 8px; margin-left: 4px; }

:root { --gi-w: min(780px, 55vw); }
body { transition: padding-right 0.2s ease; }
body.gi-open { padding-right: var(--gi-w); }
/* em telas estreitas não dá para empurrar: o painel passa a cobrir a página */
@media (max-width: 800px) {
  :root { --gi-w: 100vw; }
  body.gi-open { padding-right: 0; }
}

.gi-panel {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 50; width: var(--gi-w); overflow-y: auto;
  background: linear-gradient(160deg, rgb(255 255 255 / 0.09), rgb(10 14 28 / 0.62) 45%); color: #e8eaf0; border-left: 1px solid rgb(255 255 255 / 0.16); box-shadow: -8px 0 40px rgb(0 0 0 / 0.45), inset 1px 0 0 rgb(255 255 255 / 0.12); -webkit-backdrop-filter: blur(26px) saturate(160%); backdrop-filter: blur(26px) saturate(160%); padding: 0 16px 24px;
}
.gi-head { position: sticky; top: 0; z-index: 1; display: flex; flex-direction: column; gap: 8px; padding: 14px 0 12px; background: rgb(10 14 28 / 0.55); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border-bottom: 1px solid rgb(255 255 255 / 0.12); }
.gi-row { display: flex; align-items: center; gap: 10px; }
.gi-spacer { flex: 1; }
.gi-muted { color: #98a0b3; font-size: 13px; }
.gi-empty { margin-top: 24px; }
.gi-delay select { padding: 2px 8px; font-size: 13px; border-radius: 8px; }
.gi-btn { background: rgb(255 255 255 / 0.07); border: 1px solid rgb(255 255 255 / 0.16); color: #e8eaf0; padding: 2px 10px; font-size: 12px; white-space: nowrap; box-shadow: none; border-radius: 99px; }
.gi-op { margin-top: 12px; border: 1px solid rgb(255 255 255 / 0.12); border-radius: 14px; background: rgb(255 255 255 / 0.05); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.1); }
.gi-op > summary { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; list-style: none; }
.gi-op > summary::-webkit-details-marker { display: none; }
.gi-op > summary::before { content: '▸'; color: #98a0b3; }
.gi-op[open] > summary::before { content: '▾'; }
.gi-kind { font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 1px 8px; border-radius: 99px; background: #3b9eff33; color: #3b9eff; }
.gi-kind.mutation { background: #34d39933; color: #34d399; }
.gi-kind.rest { background: #fbbf2433; color: #fbbf24; }
.gi-bad { margin-left: auto; color: #ff5c5c; font-weight: 700; font-size: 12px; }
.gi-op section { padding: 0 12px 10px; }
.gi-op h4 { display: flex; align-items: center; gap: 10px; margin: 8px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #e8eaf0; }
.gi-op h4 .gi-btn { margin-left: auto; }
.gi-op pre { margin: 0; padding: 10px 12px; overflow-x: auto; font: 12.5px/1.55 var(--mono); background: rgb(0 0 0 / 0.38); border: 1px solid rgb(255 255 255 / 0.07); border-radius: 10px; }
.gi-op pre.gi-resp { max-height: 420px; overflow: auto; }
.t-c { color: #6b7385; } .t-s { color: #34d399; } .t-k { color: #22d3ee; } .t-v { color: #fbbf24; } .t-n { color: #fbbf24; } .t-w { color: #ff2d95; font-weight: 700; }
</style>
