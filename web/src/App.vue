<script setup>
import BgScene from './components/BgScene.vue'
import GqlLogo from './components/GqlLogo.vue'
import GqlInspector from './components/GqlInspector.vue'

const consoleUrl = import.meta.env.VITE_HASURA_CONSOLE_URL ?? 'http://localhost:8080/console'
</script>

<template>
  <BgScene />
  <header class="topbar">
    <RouterLink to="/" class="brand" aria-label="GraphQLab, página inicial"><GqlLogo :size="32" /></RouterLink>
    <nav>
      <RouterLink to="/">Usuários (simples)</RouterLink>
      <RouterLink to="/usuarios">Usuários</RouterLink>
      <RouterLink to="/comparar">REST x GraphQL</RouterLink>
      <RouterLink to="/playground">Playground</RouterLink>
      <a :href="consoleUrl" target="_blank" rel="noopener">Console Hasura ↗</a>
    </nav>
  </header>
  <main class="container">
    <RouterView />
  </main>
  <GqlInspector />
</template>
