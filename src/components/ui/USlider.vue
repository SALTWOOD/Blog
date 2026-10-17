<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: number
  min?: number
  max?: number
  step?: number
  color?: 'primary' | 'neutral'
  size?: 'xs' | 'sm' | 'md'
  disabled?: boolean
}>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  color: 'primary',
  size: 'sm',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  change: [value: number]
}>()

const classes = computed(() => [
  'uslider',
  `uslider-${props.color}`,
  `uslider-${props.size}`
])

function onInput(event: Event) {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}

function onChange(event: Event) {
  emit('change', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <input
    :class="classes"
    type="range"
    :min="min"
    :max="max"
    :step="step"
    :value="modelValue"
    :disabled="disabled"
    @input="onInput"
    @change="onChange"
  >
</template>

<style>
@layer components {
  .uslider {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  .uslider:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .uslider::-webkit-slider-runnable-track {
    height: 0.4rem;
    border-radius: var(--r-pill);
    background: color-mix(in srgb, currentColor 25%, transparent);
  }

  .uslider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.9rem;
    height: 0.9rem;
    margin-top: -0.25rem;
    border: none;
    border-radius: 50%;
    background: var(--brass);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }

  .uslider::-moz-range-track {
    height: 0.4rem;
    border-radius: var(--r-pill);
    background: color-mix(in srgb, currentColor 25%, transparent);
  }

  .uslider::-moz-range-thumb {
    width: 0.9rem;
    height: 0.9rem;
    border: none;
    border-radius: 50%;
    background: var(--brass);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }

  .uslider-neutral::-webkit-slider-thumb {
    background: currentColor;
  }

  .uslider-neutral::-moz-range-thumb {
    background: currentColor;
  }

  .uslider-xs::-webkit-slider-runnable-track {
    height: 0.3rem;
  }

  .uslider-xs::-webkit-slider-thumb {
    width: 0.7rem;
    height: 0.7rem;
    margin-top: -0.2rem;
  }

  .uslider-xs::-moz-range-track {
    height: 0.3rem;
  }

  .uslider-xs::-moz-range-thumb {
    width: 0.7rem;
    height: 0.7rem;
  }

  .uslider-md::-webkit-slider-runnable-track {
    height: 0.5rem;
  }

  .uslider-md::-webkit-slider-thumb {
    width: 1.05rem;
    height: 1.05rem;
    margin-top: -0.28rem;
  }
}
</style>
