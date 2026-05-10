<script setup lang="ts">
import { ref, computed } from 'vue'

type CaveApi = {
  id: string; name: string; lon: number; lat: number; cave_type: string
  depth_m: number | null; length_m: number | null; region: string
  municipality: string | null; is_public: boolean; sensitivity_level: string
}

const props = defineProps<{ caves: CaveApi[] }>()
const emit = defineEmits<{ select: [cave: CaveApi] }>()

const query = ref('')
const isOpen = ref(false)
const focusedIdx = ref(-1)

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const results = computed(() => {
  const q = norm(query.value.trim())
  if (!q) return []
  return props.caves
    .filter(c =>
      norm(c.name).includes(q) ||
      norm(c.region).includes(q) ||
      norm(c.cave_type).includes(q) ||
      (c.municipality ? norm(c.municipality).includes(q) : false),
    )
    .slice(0, 8)
})

function select(cave: CaveApi) {
  query.value = cave.name
  isOpen.value = false
  focusedIdx.value = -1
  emit('select', cave)
}

function onInput() {
  isOpen.value = true
  focusedIdx.value = -1
}

function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value || results.value.length === 0) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIdx.value = Math.min(focusedIdx.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIdx.value = Math.max(focusedIdx.value - 1, 0)
  } else if (e.key === 'Enter' && focusedIdx.value >= 0) {
    e.preventDefault()
    const cave = results.value[focusedIdx.value]
    if (cave) select(cave)
  } else if (e.key === 'Escape') {
    isOpen.value = false
    focusedIdx.value = -1
  }
}

function onBlur() {
  setTimeout(() => { isOpen.value = false }, 150)
}

function clear() {
  query.value = ''
  isOpen.value = false
  focusedIdx.value = -1
}
</script>

<template>
  <div class="search-wrap">
    <div class="search-box">
      <svg class="search-icon" viewBox="0 0 20 20" fill="none">
        <circle cx="8.5" cy="8.5" r="5.5" stroke="#94a3b8" stroke-width="1.8" />
        <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <input
        class="search-input"
        type="text"
        placeholder="Search caves…"
        autocomplete="off"
        v-model="query"
        @input="onInput"
        @keydown="onKeydown"
        @focus="isOpen = true"
        @blur="onBlur"
      />
      <button v-if="query" class="clear-btn" @mousedown.prevent="clear">
        <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
          <line x1="1" y1="1" x2="11" y2="11" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" />
          <line x1="11" y1="1" x2="1" y2="11" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <ul v-if="isOpen && results.length" class="dropdown">
      <li
        v-for="(cave, i) in results"
        :key="cave.id"
        class="dropdown-item"
        :class="{ focused: i === focusedIdx }"
        @mousedown.prevent="select(cave)"
      >
        <span
          class="sensitivity-dot"
          :class="`dot--${cave.sensitivity_level}`"
        ></span>
        <div class="item-text">
          <span class="item-name">{{ cave.name }}</span>
          <span class="item-sub">{{ cave.cave_type }}&ensp;·&ensp;{{ cave.region }}</span>
        </div>
      </li>
    </ul>

    <div v-else-if="isOpen && query.trim() && !results.length" class="dropdown no-results">
      No caves found
    </div>
  </div>
</template>

<style scoped>
.search-wrap {
  position: relative;
  width: 320px;
}

.search-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(6px);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 0 10px;
  gap: 6px;
  height: 40px;
}

.search-icon {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
}

.search-input::placeholder { color: #94a3b8; }

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  flex-shrink: 0;
}

.clear-btn:hover { background: #f1f5f9; }

/* ── Dropdown ──────────────────────────────── */
.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(6px);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 320px;
  overflow-y: auto;
  z-index: 200;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
}

.dropdown-item:hover,
.dropdown-item.focused {
  background: #f1f5f9;
}

.sensitivity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot--public           { background: #22c55e; }
.dot--restricted       { background: #f59e0b; }
.dot--highly_restricted { background: #ef4444; }

.item-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-sub {
  font-size: 11px;
  color: #94a3b8;
}

.no-results {
  padding: 12px 16px;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
}
</style>
