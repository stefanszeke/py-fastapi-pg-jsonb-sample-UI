<script setup lang="ts">
const props = defineProps<{
  modelValue: { protectedAreas: boolean; caves: boolean; entrances: boolean; surveyLines: boolean }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
}>()

const LAYERS = [
  { key: 'protectedAreas' as const, label: 'Protected Areas', color: '#22c55e', shape: 'circle' },
  { key: 'caves' as const,          label: 'Caves',            color: '#2563eb', shape: 'circle' },
  { key: 'entrances' as const,      label: 'Entrances',        color: '#7c3aed', shape: 'diamond' },
  { key: 'surveyLines' as const,    label: 'Survey Lines',     color: '#ef4444', shape: 'circle' },
]

function toggle(key: keyof typeof props.modelValue) {
  emit('update:modelValue', { ...props.modelValue, [key]: !props.modelValue[key] })
}
</script>

<template>
  <div class="layer-control">
    <div class="lc-title">Layers</div>
    <label v-for="layer in LAYERS" :key="layer.key" class="lc-row">
      <input type="checkbox" :checked="modelValue[layer.key]" @change="toggle(layer.key)" />
      <span
        class="lc-dot"
        :class="{ 'lc-dot--diamond': layer.shape === 'diamond' }"
        :style="{ background: layer.color }"
      ></span>
      {{ layer.label }}
    </label>
  </div>
</template>

<style scoped>
.layer-control {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14);
  padding: 10px 14px;
  min-width: 158px;
}

.lc-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 8px;
}

.lc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 3px 0;
  font-size: 12px;
  color: #1e293b;
  font-weight: 500;
  user-select: none;
}

.lc-row input { cursor: pointer; accent-color: #2563eb; }

.lc-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.lc-dot--diamond {
  border-radius: 2px;
  transform: rotate(45deg);
}
</style>
