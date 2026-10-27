<script setup>
import { graphqlUrl } from '../lib/graphql'
</script>

<template>
  <div class="row between">
    <h1>Playground</h1>
    <span class="muted">GraphiQL · {{ graphqlUrl }}</span>
  </div>
  <p class="muted">Autocomplete com <kbd>Ctrl</kbd>+<kbd>Espaço</kbd>, executar com <kbd>Ctrl</kbd>+<kbd>Enter</kbd>. O botão de livro abre a documentação do schema.</p>
  <iframe class="graphiql" src="/graphiql.html" title="GraphiQL" />
</template>

