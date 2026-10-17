<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  color?: 'primary' | 'neutral' | 'success' | 'warning' | 'error'
  variant?: 'subtle' | 'solid' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>(), {
  color: 'neutral',
  variant: 'subtle',
  size: 'sm'
})

const classes = computed(() => [
  'ubadge',
  `ubadge-${props.color}`,
  `ubadge-${props.variant}`,
  `ubadge-${props.size}`
])
</script>

<template>
  <span :class="classes">
    <span v-if="$slots.leading" class="ubadge-leading">
      <slot name="leading" />
    </span>
    <slot />
  </span>
</template>

<style>
@layer components {
  .ubadge {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    box-sizing: border-box;
    border: 1px solid transparent;
    border-radius: var(--r-pill);
    font-family: var(--font-body);
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
    vertical-align: middle;
  }

  .ubadge-xs {
    font-size: 0.68rem;
    padding: 0.12rem 0.45rem;
  }

  .ubadge-sm {
    font-size: 0.75rem;
    padding: 0.16rem 0.55rem;
  }

  .ubadge-md {
    font-size: 0.82rem;
    padding: 0.22rem 0.65rem;
  }

  .ubadge-lg {
    font-size: 0.88rem;
    padding: 0.28rem 0.75rem;
  }

  .ubadge-leading {
    display: inline-flex;
    align-items: center;
  }

  .ubadge-leading .uicon {
    width: 1em;
    height: 1em;
  }

  .ubadge-subtle.ubadge-success {
    color: #15803d;
    background: rgba(34, 197, 94, 0.14);
    border-color: rgba(34, 197, 94, 0.3);
  }

  .ubadge-subtle.ubadge-warning {
    color: #b45309;
    background: rgba(245, 158, 11, 0.16);
    border-color: rgba(245, 158, 11, 0.32);
  }

  .ubadge-subtle.ubadge-error {
    color: #b91c1c;
    background: rgba(239, 68, 68, 0.14);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .ubadge-subtle.ubadge-primary {
    color: var(--sea-deep);
    background: rgba(var(--sea-rgb), 0.14);
    border-color: rgba(var(--sea-rgb), 0.3);
  }

  .ubadge-subtle.ubadge-neutral {
    color: rgb(var(--ink-soft));
    background: rgba(var(--ink), 0.07);
    border-color: color-mix(in srgb, var(--rule) 90%, transparent);
  }

  [data-theme='dark'] .ubadge-subtle.ubadge-success {
    color: #6ee7a8;
    background: rgba(34, 197, 94, 0.18);
  }

  [data-theme='dark'] .ubadge-subtle.ubadge-warning {
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.18);
  }

  [data-theme='dark'] .ubadge-subtle.ubadge-error {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.2);
  }

  [data-theme='dark'] .ubadge-subtle.ubadge-primary {
    color: var(--sea);
    background: rgba(var(--sea-rgb), 0.18);
  }

  .ubadge-solid {
    color: #fff;
    background: var(--sea);
    border-color: transparent;
  }

  .ubadge-solid.ubadge-success {
    background: var(--pine);
  }

  .ubadge-solid.ubadge-warning {
    background: #b45309;
  }

  .ubadge-solid.ubadge-error {
    background: var(--signal);
  }

  .ubadge-outline {
    background: transparent;
    border-color: color-mix(in srgb, var(--rule) 92%, transparent);
    color: rgb(var(--ink-soft));
  }
}
</style>
