<template>
  <div class="ucard">
    <div class="ucard-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="ucard-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style>
@layer components {
  .ucard {
    box-sizing: border-box;
    background: color-mix(in srgb, var(--paper-raised) 78%, transparent);
    border: 1px solid color-mix(in srgb, var(--rule) 92%, transparent);
    border-radius: 14px;
    padding: 1.4rem;
    box-shadow: 0 8px 30px rgba(var(--ink), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(18px) saturate(1.3);
    -webkit-backdrop-filter: blur(18px) saturate(1.3);
  }

  [data-theme='dark'] .ucard {
    background: color-mix(in srgb, var(--paper-raised) 74%, transparent);
    box-shadow: 0 10px 34px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .ucard-footer {
    padding-top: 0.75rem;
  }
}
</style>
