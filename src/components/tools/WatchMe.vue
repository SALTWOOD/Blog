<script setup lang="ts">
import { computed } from 'vue'
import UBadge from '../ui/UBadge.vue'
import UButton from '../ui/UButton.vue'
import UCard from '../ui/UCard.vue'
import UIcon from '../ui/UIcon.vue'
import { useDeviceStatus } from './useDeviceStatus'

const {
  devices,
  loading,
  error,
  lastUpdate,
  countdown,
  refreshing,
  overallStatusInfo,
  fetchStatus,
  getDeviceStatus,
  getBatteryInfo,
  formatDateTime
} = useDeviceStatus()

const formattedLastUpdate = computed(() => {
  if (!lastUpdate.value) return ''
  return lastUpdate.value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})
</script>

<template>
  <div class="w-full">
    <div class="max-w-[1000px] mx-auto flex flex-col gap-5">
      <section class="section-card">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="text-2xl font-bold">
              似了吗？
            </div>
            <div class="text-sm text-(--ui-text-muted) mt-1">
              设备状态监控
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span
              v-if="lastUpdate"
              class="text-xs text-(--ui-text-dimmed)"
            >
              上次更新: {{ formattedLastUpdate }} · {{ countdown }}s 后刷新
            </span>
            <UButton
              icon="i-lucide-refresh-cw"
              variant="outline"
              size="sm"
              :loading="refreshing"
              label="刷新"
              @click="fetchStatus"
            />
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="flex items-center gap-3">
          <UIcon
            :name="overallStatusInfo.icon"
            class="size-6"
            :class="{
              'text-green-500': overallStatusInfo.color === 'success',
              'text-amber-500': overallStatusInfo.color === 'warning',
              'text-red-500': overallStatusInfo.color === 'error'
            }"
          />
          <div>
            <span class="font-semibold">综合状态：</span>
            <UBadge
              :color="overallStatusInfo.color"
              variant="subtle"
              size="lg"
            >
              {{ overallStatusInfo.label }}
            </UBadge>
          </div>
        </div>
      </section>

      <div
        v-if="loading"
        class="section-card state flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-3">
          <UIcon
            name="i-lucide-loader"
            class="size-8 text-(--ui-text-dimmed) animate-spin"
          />
          <div class="text-(--ui-text-muted)">
            正在获取设备状态...
          </div>
        </div>
      </div>

      <div
        v-else-if="error"
        class="section-card"
      >
        <div class="flex flex-col items-center gap-3 py-8">
          <UIcon
            name="i-lucide-alert-triangle"
            class="size-8 text-red-500"
          />
          <div class="text-red-500 font-medium">
            获取状态失败
          </div>
          <div class="text-sm text-(--ui-text-dimmed)">
            {{ error }}
          </div>
          <UButton
            label="重试"
            icon="i-lucide-refresh-cw"
            variant="outline"
            size="sm"
            @click="fetchStatus"
          />
        </div>
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <UCard
          v-for="device in devices"
          :key="device.name"
          class="device-card"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <div class="font-semibold truncate">
                {{ device.name }}
              </div>
              <UBadge
                v-if="device.ignored"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                已忽略
              </UBadge>
            </div>
            <UBadge
              :color="getDeviceStatus(device).color"
              variant="subtle"
              size="sm"
            >
              <template #leading>
                <UIcon
                  :name="getDeviceStatus(device).icon"
                  class="size-3"
                />
              </template>
              {{ getDeviceStatus(device).label }}
            </UBadge>
          </div>

          <div class="space-y-2 text-sm">
            <div
              v-if="device.message"
              class="flex items-start gap-2"
            >
              <UIcon
                name="i-lucide-message-square"
                class="size-4 text-(--ui-text-dimmed) shrink-0 mt-0.5"
              />
              <span class="text-(--ui-text-muted) break-all">{{ device.message }}</span>
            </div>

            <div
              v-if="device.battery"
              class="flex items-center gap-2"
            >
              <UIcon
                :name="getBatteryInfo(device.battery).icon"
                class="size-4 shrink-0"
                :class="getBatteryInfo(device.battery).color"
              />
              <span :class="getBatteryInfo(device.battery).color">
                {{ getBatteryInfo(device.battery).text }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-heart-pulse"
                class="size-4 text-(--ui-text-dimmed) shrink-0"
              />
              <span class="text-(--ui-text-muted)">
                心跳: {{ formatDateTime(device.lastUpdatedAt) }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-clock"
                class="size-4 text-(--ui-text-dimmed) shrink-0"
              />
              <span class="text-(--ui-text-muted)">
                上次在线: {{ formatDateTime(device.lastOnline) }}
              </span>
            </div>
          </div>
        </UCard>
      </div>

      <div
        v-if="!loading && !error && devices.length === 0"
        class="section-card state flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-3">
          <UIcon
            name="i-lucide-inbox"
            class="size-8 text-(--ui-text-dimmed)"
          />
          <div class="text-(--ui-text-muted)">
            暂无设备数据
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-card.state {
  padding-block: 4rem;
}

.device-card {
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.device-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}
</style>
