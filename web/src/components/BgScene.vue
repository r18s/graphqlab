<script setup>
import GqlLogo from './GqlLogo.vue'
</script>

<template>
  <div class="bg" aria-hidden="true">
    <div class="mesh" />
    <GqlLogo class="logo" size="100" />
  </div>
</template>

<style>
.bg { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; background: #070a14; }
.bg .mesh {
  position: absolute; inset: 0;
  background:
    radial-gradient(60vmax 60vmax at 8% 105%, rgb(59 158 255 / 0.22), transparent 60%),
    radial-gradient(55vmax 55vmax at 100% -5%, rgb(255 45 149 / 0.2), transparent 60%),
    radial-gradient(40vmax 40vmax at 55% 55%, rgb(124 92 255 / 0.12), transparent 65%);
}
/* só o símbolo do GraphQL: parado, bem transparente, no canto inferior direito */
.bg svg.logo {
  position: absolute; right: -6vmin; bottom: -8vmin; width: min(85vmin, 880px); height: min(85vmin, 880px); opacity: 0.05;
}
</style>
