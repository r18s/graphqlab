<script setup>
import { useId } from 'vue'

defineProps({ size: { type: [Number, String], default: 32 } })
const id = `gqlg-${useId()}`
// hexágono pontudo (raio 44) com o triângulo inscrito, como no logo do GraphQL
const v = [[50, 6], [88.1, 28], [88.1, 72], [50, 94], [11.9, 72], [11.9, 28]]
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" fill="none" role="img" aria-label="GraphQL">
    <defs>
      <linearGradient :id="id" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff2d95" />
        <stop offset="1" stop-color="#7c5cff" />
      </linearGradient>
    </defs>
    <g :stroke="`url(#${id})`" stroke-width="3" stroke-linejoin="round">
      <polygon :points="v.map((p) => p.join(',')).join(' ')" />
      <polygon points="50,6 11.9,72 88.1,72" />
    </g>
    <g :fill="`url(#${id})`">
      <circle v-for="(p, i) in v" :key="i" :cx="p[0]" :cy="p[1]" r="5.5" />
    </g>
  </svg>
</template>
