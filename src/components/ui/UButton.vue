<script setup lang="ts">
import { computed } from 'vue'
import UIcon from './UIcon.vue'

type Variant = 'solid' | 'outline' | 'ghost' | 'subtle'
type Color = 'primary' | 'neutral' | 'zinc' | 'error' | 'success'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  label?: string
  icon?: string
  variant?: Variant
  color?: Color
  size?: Size
  square?: boolean
  block?: boolean
  loading?: boolean
  disabled?: boolean
  to?: string
  target?: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'outline',
  color: 'neutral',
  size: 'md',
  square: false,
  block: false,
  loading: false,
  disabled: false,
  type: 'button'
})

const classes = computed(() => [
  'ubtn',
  `ubtn-${props.variant}`,
  `ubtn-${props.color}`,
  `ubtn-${props.size}`,
  { 'ubtn-square': props.square, 'ubtn-block': props.block, 'ubtn-loading': props.loading }
])
</script>

<template>
  <a
    v-if="to"
    :href="to"
    :target="target"
    :class="classes"
    :aria-disabled="disabled || loading || undefined"
  >
    <span v-if="loading" class="ubtn-spinner" />
    <UIcon v-else-if="icon" :name="icon" />
    <span v-if="label || $slots.default" class="ubtn-label"><slot>{{ label }}</slot></span>
  </a>
  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="ubtn-spinner" />
    <UIcon v-else-if="icon" :name="icon" />
    <span v-if="label || $slots.default" class="ubtn-label"><slot>{{ label }}</slot></span>
  </button>
</template>

<style>
@layer components {
  .ubtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45em;
    box-sizing: border-box;
    border: 1px solid transparent;
    border-radius: 9px;
    font-family: var(--font-body);
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
  }

  .ubtn:disabled,
  .ubtn[aria-disabled='true'] {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .ubtn .uicon {
    width: 1.05em;
    height: 1.05em;
  }

  .ubtn-xs {
    font-size: 0.75rem;
    padding: 0.25rem 0.55rem;
    min-height: 1.6rem;
  }

  .ubtn-sm {
    font-size: 0.85rem;
    padding: 0.38rem 0.75rem;
    min-height: 2rem;
  }

  .ubtn-md {
    font-size: 0.92rem;
    padding: 0.5rem 1rem;
    min-height: 2.35rem;
  }

  .ubtn-lg {
    font-size: 1rem;
    padding: 0.7rem 1.2rem;
    min-height: 2.9rem;
  }

  .ubtn-square {
    padding: 0;
    aspect-ratio: 1;
    width: auto;
  }

  .ubtn-square.ubtn-xs {
    width: 1.6rem;
  }

  .ubtn-square.ubtn-sm {
    width: 2rem;
  }

  .ubtn-square.ubtn-md {
    width: 2.35rem;
  }

  .ubtn-square.ubtn-lg {
    width: 2.9rem;
  }

  .ubtn-block {
    display: flex;
    width: 100%;
  }

  .ubtn-outline,
  .ubtn-solid,
  .ubtn-subtle,
  .ubtn-ghost {
    color: rgb(var(--ink));
  }

  .ubtn-outline {
    border-color: color-mix(in srgb, var(--rule) 92%, transparent);
    background: color-mix(in srgb, var(--paper-raised) 52%, transparent);
  }

  .ubtn-outline:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--brass) 55%, transparent);
    background: color-mix(in srgb, var(--paper-raised) 80%, transparent);
    box-shadow: 0 8px 20px rgba(var(--ink), 0.16);
  }

  .ubtn-ghost {
    background: transparent;
  }

  .ubtn-ghost:hover:not(:disabled) {
    background: rgba(var(--ink), 0.08);
  }

  .ubtn-subtle {
    background: rgba(var(--ink), 0.07);
  }

  .ubtn-subtle:hover:not(:disabled) {
    background: rgba(var(--ink), 0.12);
  }

  .ubtn-solid {
    border-color: transparent;
    background: var(--brass);
    color: #fff7e8;
    box-shadow: 0 4px 14px rgba(var(--brass-rgb), 0.28);
  }

  .ubtn-solid:hover:not(:disabled) {
    background: var(--sea-deep);
    box-shadow: 0 8px 20px rgba(var(--sea-rgb), 0.32);
  }

  .ubtn-solid.ubtn-error {
    background: var(--signal);
    color: #fff;
  }

  .ubtn-solid.ubtn-success {
    background: var(--pine);
    color: #fff;
  }

  .ubtn-ghost.ubtn-zinc,
  .ubtn-subtle.ubtn-zinc {
    color: inherit;
  }

  .ubtn-ghost.ubtn-zinc:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
  }

  .ubtn-outline.ubtn-error {
    color: var(--signal);
    border-color: color-mix(in srgb, var(--signal) 40%, transparent);
  }

  .ubtn-spinner {
    width: 0.95em;
    height: 0.95em;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-top-color: transparent;
    animation: ubtn-spin 0.7s linear infinite;
  }

  @keyframes ubtn-spin {
    to {
      transform: rotate(360deg);
    }
  }
}
</style>
