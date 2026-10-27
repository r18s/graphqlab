<script setup>
import { ref, watch, computed } from 'vue'
import { gql } from '../lib/graphql'

const PAGE_SIZE = 12

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const QUERY = `
  query Users($search: String!, $limit: Int!, $offset: Int!, $order: [users_order_by!]) {
    users(
      where: { _or: [{ name: { _ilike: $search } }, { username: { _ilike: $search } }] }
      order_by: $order
      limit: $limit
      offset: $offset
    ) {
      id
      name
      username
      bio
      posts_aggregate { aggregate { count } }
      comments_aggregate { aggregate { count } }
    }
    users_aggregate(
      where: { _or: [{ name: { _ilike: $search } }, { username: { _ilike: $search } }] }
    ) {
      aggregate { count }
    }
  }
`

const search = ref('')
const sort = ref('name')
const page = ref(0)
const users = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')

const orderBy = computed(() =>
  sort.value === 'posts' ? [{ posts_aggregate: { count: 'desc' } }, { name: 'asc' }] : [{ name: 'asc' }],
)
const pages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await gql(QUERY, {
      search: `%${search.value}%`,
      limit: PAGE_SIZE,
      offset: page.value * PAGE_SIZE,
      order: orderBy.value,
    })
    users.value = data.users
    total.value = data.users_aggregate.aggregate.count
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

let timer
watch([search, sort], () => {
  page.value = 0
  clearTimeout(timer)
  timer = setTimeout(load, 250)
})
watch(page, load)
load()
</script>

<template>
  <div class="row between">
    <h1>Usuários <small>({{ total }})</small></h1>
    <div class="row">
      <input v-model="search" type="search" placeholder="Buscar por nome ou username…" />
      <select v-model="sort">
        <option value="name">Ordenar por nome</option>
        <option value="posts">Mais posts primeiro</option>
      </select>
    </div>
  </div>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="loading && !users.length" class="muted">Carregando…</p>

  <div class="grid">
    <RouterLink v-for="u in users" :key="u.id" :to="{ name: 'user', params: { id: u.id } }" class="card link">
      <strong>{{ u.name }}</strong>
      <span class="handle"><span class="at">@</span>{{ u.username }}</span>
      <p class="bio">{{ u.bio }}</p>
      <span class="badges">
        <span class="badge">{{ plural(u.posts_aggregate.aggregate.count, 'post', 'posts') }}</span>
        <span class="badge">{{ plural(u.comments_aggregate.aggregate.count, 'comentário', 'comentários') }}</span>
      </span>
    </RouterLink>
  </div>

  <div class="row center pager">
    <button :disabled="page === 0" @click="page--">← Anterior</button>
    <span class="muted">{{ page + 1 }} / {{ pages }}</span>
    <button :disabled="page + 1 >= pages" @click="page++">Próxima →</button>
  </div>
</template>
