<script setup>
import { ref } from 'vue'
import { gql } from '../lib/graphql'

// Só os dois campos que a tela mostra: nada de id, bio, contagens…
const QUERY = `
  query UsersSimples {
    users(order_by: { name: asc }) {
      name
      username
    }
  }
`

const users = ref([])
const error = ref('')
const loading = ref(true)

gql(QUERY)
  .then((data) => { users.value = data.users })
  .catch((e) => { error.value = e.message })
  .finally(() => { loading.value = false })
</script>

<template>
  <h1>Usuários <small>(simples)</small></h1>
  <p class="muted">Só <code>name</code> e <code>username</code>: é tudo o que a query pede.</p>

  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="loading" class="muted">Carregando…</p>

  <table v-else class="simple">
    <thead>
      <tr><th>Nome</th><th>Username</th></tr>
    </thead>
    <tbody>
      <tr v-for="u in users" :key="u.username">
        <td>{{ u.name }}</td>
        <td class="handle"><span class="at">@</span>{{ u.username }}</td>
      </tr>
    </tbody>
  </table>
</template>

