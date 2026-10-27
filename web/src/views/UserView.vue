<script setup>
import { ref, watch } from 'vue'
import { gql } from '../lib/graphql'

const props = defineProps({ id: { type: String, required: true } })

const QUERY = `
  query User($id: Int!) {
    users_by_pk(id: $id) {
      id
      name
      username
      email
      bio
      posts(order_by: { created_at: desc }) {
        id
        title
        body
        created_at
        comments(order_by: { created_at: asc }) {
          id
          body
          created_at
          user { id name }
        }
      }
    }
    users(order_by: { name: asc }) { id name }
  }
`
const INSERT_POST = `
  mutation ($object: posts_insert_input!) { insert_posts_one(object: $object) { id } }
`
const DELETE_POST = `
  mutation ($id: Int!) { delete_posts_by_pk(id: $id) { id } }
`
const INSERT_COMMENT = `
  mutation ($object: comments_insert_input!) { insert_comments_one(object: $object) { id } }
`

const user = ref(null)
const allUsers = ref([])
const error = ref('')
const newPost = ref({ title: '', body: '' })
// "comentar como": padrão é o próprio usuário da página
const commentAs = ref(Number(props.id))
const drafts = ref({})

async function load() {
  try {
    const data = await gql(QUERY, { id: Number(props.id) })
    user.value = data.users_by_pk
    allUsers.value = data.users
    error.value = user.value ? '' : 'Usuário não encontrado.'
  } catch (e) {
    error.value = e.message
  }
}

async function run(query, variables) {
  try {
    await gql(query, variables)
    await load()
  } catch (e) {
    error.value = e.message
  }
}

function addPost() {
  if (!newPost.value.title.trim()) return
  run(INSERT_POST, { object: { ...newPost.value, user_id: user.value.id } })
  newPost.value = { title: '', body: '' }
}

function addComment(postId) {
  const body = (drafts.value[postId] ?? '').trim()
  if (!body) return
  run(INSERT_COMMENT, { object: { post_id: postId, user_id: commentAs.value, body } })
  drafts.value[postId] = ''
}

const fmt = (d) => new Date(d).toLocaleDateString('pt-BR')

watch(() => props.id, () => { commentAs.value = Number(props.id); load() }, { immediate: true })
</script>

<template>
  <RouterLink to="/usuarios" class="muted">← Usuários</RouterLink>
  <p v-if="error" class="error">{{ error }}</p>

  <template v-if="user">
    <h1>{{ user.name }} <small class="handle"><span class="at">@</span>{{ user.username }}</small></h1>
    <p class="muted">{{ user.email }}</p>
    <p>{{ user.bio }}</p>

    <h2>Novo post</h2>
    <form class="card form" @submit.prevent="addPost">
      <input v-model="newPost.title" placeholder="Título" />
      <textarea v-model="newPost.body" rows="3" placeholder="Conteúdo" />
      <button type="submit">Publicar</button>
    </form>

    <div class="row between">
      <h2>Posts ({{ user.posts.length }})</h2>
      <label class="muted">
        Comentar como
        <select v-model="commentAs">
          <option v-for="u in allUsers" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </label>
    </div>
    <p v-if="!user.posts.length" class="muted">Nenhum post ainda.</p>

    <article v-for="p in user.posts" :key="p.id" class="card">
      <div class="row between">
        <h3>{{ p.title }}</h3>
        <button class="danger" @click="run(DELETE_POST, { id: p.id })">Excluir</button>
      </div>
      <small class="muted">{{ fmt(p.created_at) }}</small>
      <p class="pre">{{ p.body }}</p>

      <h4>Comentários ({{ p.comments.length }})</h4>
      <ul class="comments">
        <li v-for="c in p.comments" :key="c.id">
          <RouterLink :to="{ name: 'user', params: { id: c.user.id } }">{{ c.user.name }}</RouterLink>
          <small class="muted"> · {{ fmt(c.created_at) }}</small>
          <div>{{ c.body }}</div>
        </li>
      </ul>
      <form class="row" @submit.prevent="addComment(p.id)">
        <input v-model="drafts[p.id]" placeholder="Escreva um comentário…" />
        <button type="submit">Comentar</button>
      </form>
    </article>
  </template>
</template>
