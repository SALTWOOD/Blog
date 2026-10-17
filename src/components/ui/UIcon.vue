<script setup lang="ts">
import { computed } from 'vue'
import { ICON_BODIES } from './icons'

const props = defineProps<{ name?: string }>()

const body = computed(() => {
  const key = (props.name ?? '').replace(/^i-(lucide|simple-icons)-/, '')
  return ICON_BODIES[key] ?? ICON_BODIES.info ?? ''
})
</script>

<template>
  <span class="uicon">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      v-html="body"
    />
  </span>
</template>

<style>
@layer components {
  .uicon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .uicon > svg {
    width: 100%;
    height: 100%;
    display: block;
  }
}
</style>
