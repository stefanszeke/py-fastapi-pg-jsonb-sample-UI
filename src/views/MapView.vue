<script setup lang="ts">
import { onMounted, onUnmounted, ref, onBeforeUnmount } from 'vue'
import 'ol/ol.css'

import { authFetch } from '@/api/http'

import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { fromLonLat } from 'ol/proj.js'
import Style from 'ol/style/Style.js'
import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'

type CaveApi = {
  id: number
  name: string
  lon: number
  lat: number
  type: string
  depth_m: number
  region: string
}

type EventRead = {
  id: number
  cave_id: number
  name: string
  public_payload: Record<string, unknown>
  caver_payload: Record<string, unknown> | null
  scientific_payload: Record<string, unknown> | null
}

const mapEl = ref<HTMLElement | null>(null)
const selectedCave = ref<CaveApi | null>(null)
const eventData = ref<EventRead | null>(null)
const loadingEvents = ref(false)

// ── Resizable panel ────────────────────────────────────────────
const panelWidth = ref(300)
let isResizing = false
let startX = 0
let startWidth = 0

function onResizerMouseDown(e: MouseEvent) {
  isResizing = true
  startX = e.clientX
  startWidth = panelWidth.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isResizing) return
  const delta = startX - e.clientX
  panelWidth.value = Math.min(600, Math.max(200, startWidth + delta))
}

function onMouseUp() {
  isResizing = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
// ──────────────────────────────────────────────────────────────

let map: Map | null = null

async function selectCave(cave: CaveApi) {
  selectedCave.value = cave
  eventData.value = null
  loadingEvents.value = true
  try {
    const resp = await authFetch(`http://127.0.0.1:8000/events/by-cave/${cave.id}`)
    const events: EventRead[] = await resp.json()
    eventData.value = events[0] ?? null
  } catch (e) {
    console.error('Failed to load events', e)
  } finally {
    loadingEvents.value = false
  }
}

onMounted(async () => {
  if (!mapEl.value) return

  const response = await authFetch('http://127.0.0.1:8000/caves')
  const caves: CaveApi[] = await response.json()

  const caveFeatures = caves.map(
    (cave) =>
      new Feature({
        geometry: new Point(fromLonLat([cave.lon, cave.lat])),
        caveData: cave,
      }),
  )

  const pointStyle = new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: '#2563eb' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  })

  const selectedStyle = new Style({
    image: new CircleStyle({
      radius: 11,
      fill: new Fill({ color: '#f59e0b' }),
      stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
    }),
  })

  let activeFeature: Feature | null = null

  const cavesLayer = new VectorLayer({
    source: new VectorSource({ features: caveFeatures }),
    style: pointStyle,
  })

  map = new Map({
    target: mapEl.value,
    layers: [new TileLayer({ source: new OSM() }), cavesLayer],
    view: new View({
      center: fromLonLat([19.5, 48.7]),
      zoom: 8,
    }),
  })

  map.on('click', (event) => {
    let clickedFeature: Feature | null = null
    const cave = map?.forEachFeatureAtPixel(event.pixel, (f) => {
      clickedFeature = f as Feature
      return clickedFeature.get('caveData') as CaveApi
    })

    if (activeFeature) activeFeature.setStyle(undefined)
    if (clickedFeature) {
      ;(clickedFeature as Feature).setStyle(selectedStyle)
      activeFeature = clickedFeature as Feature
    } else {
      activeFeature = null
    }

    if (cave) selectCave(cave)
    else selectedCave.value = null
  })

  map.on('pointermove', (event) => {
    if (!mapEl.value) return
    mapEl.value.style.cursor = map?.hasFeatureAtPixel(event.pixel) ? 'pointer' : ''
  })
})

onUnmounted(() => {
  map?.setTarget(undefined)
  map = null
})

function strVal(v: unknown): string {
  return String(v ?? '')
}
function numVal(v: unknown): string {
  return typeof v === 'number' ? v.toLocaleString() : String(v ?? '')
}
function listVal(v: unknown): string {
  return Array.isArray(v) ? v.join(', ') : String(v ?? '')
}
</script>

<template>
  <div class="page">
    <div ref="mapEl" class="map"></div>

    <div class="resizer" @mousedown="onResizerMouseDown"></div>

    <aside class="panel" :style="{ width: panelWidth + 'px' }">
      <div class="panel-header">
        <svg class="panel-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3.5" fill="#2563eb" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <h2>Cave Details</h2>
      </div>

      <!-- Empty state -->
      <template v-if="!selectedCave">
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
            <path d="M6 54L20 22L32 38L40 26L58 54H6Z" fill="#dbeafe" stroke="#93c5fd" stroke-width="2" stroke-linejoin="round"/>
            <circle cx="44" cy="16" r="5" fill="#bfdbfe" stroke="#93c5fd" stroke-width="1.5"/>
          </svg>
          <p>Click a cave marker<br />on the map to explore.</p>
        </div>
      </template>

      <!-- Cave selected -->
      <template v-else>
        <!-- Cave base info -->
        <div class="cave-name">{{ selectedCave.name }}</div>
        <div class="cave-meta">
          {{ selectedCave.type }}&ensp;·&ensp;{{ selectedCave.region }}
        </div>
        <div class="cave-depth">
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
            <line x1="8" y1="1" x2="8" y2="15" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
            <path d="M4 11L8 15L12 11" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          {{ selectedCave.depth_m }} m depth
        </div>

        <!-- Loading events -->
        <div v-if="loadingEvents" class="loading">
          <span class="spinner"></span> Loading data…
        </div>

        <template v-else-if="eventData">
          <!-- Public section -->
          <div class="section">
            <div class="section-head section-head--public">
              <span class="section-title">General</span>
              <span class="tier-badge tier-badge--public">Public</span>
            </div>
            <div class="kv-list">
              <div class="kv-row">
                <span class="kv-label">Kind</span>
                <span class="kv-value">{{ strVal(eventData.public_payload.kind) }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Tags</span>
                <span class="kv-value">
                  <span
                    v-for="tag in (eventData.public_payload.tags as string[])"
                    :key="tag"
                    class="tag"
                  >{{ tag }}</span>
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Protected</span>
                <span class="kv-value">
                  <span
                    class="pill"
                    :class="eventData.public_payload.protected ? 'pill--yes' : 'pill--no'"
                  >
                    {{ eventData.public_payload.protected ? 'Yes' : 'No' }}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <!-- Caver section -->
          <div v-if="eventData.caver_payload" class="section">
            <div class="section-head section-head--caver">
              <span class="section-title">Expedition</span>
              <span class="tier-badge tier-badge--caver">Caver+</span>
            </div>
            <div class="kv-list">
              <div class="kv-row">
                <span class="kv-label">Length</span>
                <span class="kv-value">{{ numVal(eventData.caver_payload.length_m) }} m</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Difficulty</span>
                <span class="kv-value">
                  <span class="pill pill--diff">{{ strVal(eventData.caver_payload.difficulty) }}</span>
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Equipment</span>
                <span class="kv-value">{{ listVal(eventData.caver_payload.equipment_required) }}</span>
              </div>
            </div>
          </div>

          <!-- Research section -->
          <div v-if="eventData.scientific_payload" class="section">
            <div class="section-head section-head--researcher">
              <span class="section-title">Research</span>
              <span class="tier-badge tier-badge--researcher">Researcher</span>
            </div>
            <div class="kv-list">
              <div class="kv-row">
                <span class="kv-label">Geology</span>
                <span class="kv-value">{{ strVal(eventData.scientific_payload.geology) }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Discovered</span>
                <span class="kv-value">{{ strVal(eventData.scientific_payload.discovered) }}</span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Species</span>
                <span class="kv-value">{{ strVal(eventData.scientific_payload.species_count) }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-else-if="!loadingEvents" class="no-data">No event data for this cave.</div>
      </template>
    </aside>
  </div>
</template>

<style scoped>
.page {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 12px;
  gap: 12px;
  background: #e2e8f0;
}

.map {
  flex: 1;
  min-width: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* ── Panel ─────────────────────────────── */
.resizer {
  width: 6px;
  cursor: col-resize;
  flex-shrink: 0;
  border-radius: 3px;
  transition: background 0.15s;
}

.resizer:hover,
.resizer:active {
  background: #94a3b8;
}

.panel {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
}

.panel-icon { width: 20px; height: 20px; flex-shrink: 0; }

.panel-header h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #475569;
}

/* ── Cave info ─────────────────────────── */
.cave-name {
  padding: 16px 20px 2px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.cave-meta {
  padding: 0 20px 2px;
  font-size: 12px;
  color: #64748b;
}

.cave-depth {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 20px 14px;
  font-size: 12px;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 4px;
}

/* ── Sections ─────────────────────────── */
.section {
  margin: 8px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid transparent;
}

.section-head--public  { background: #eff6ff; border-bottom-color: #dbeafe; }
.section-head--caver   { background: #f0fdf4; border-bottom-color: #dcfce7; }
.section-head--researcher { background: #faf5ff; border-bottom-color: #ede9fe; }

.section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #334155;
}

/* ── Tier badges ─────────────────────── */
.tier-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 999px;
  letter-spacing: 0.3px;
}

.tier-badge--public     { background: #dbeafe; color: #1d4ed8; }
.tier-badge--caver      { background: #dcfce7; color: #15803d; }
.tier-badge--researcher { background: #ede9fe; color: #6d28d9; }

/* ── KV rows ─────────────────────────── */
.kv-list {
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.kv-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
}

.kv-label {
  min-width: 76px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding-top: 2px;
  flex-shrink: 0;
}

.kv-value {
  color: #1e293b;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.4;
}

/* ── Tag chips ───────────────────────── */
.tag {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
}

/* ── Pills ───────────────────────────── */
.pill {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.pill--yes  { background: #dcfce7; color: #15803d; }
.pill--no   { background: #fee2e2; color: #b91c1c; }
.pill--diff { background: #f1f5f9; color: #475569; }

/* ── Loading ─────────────────────────── */
.loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px;
  font-size: 13px;
  color: #64748b;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Empty / no-data ─────────────────── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  gap: 16px;
  text-align: center;
}

.empty-icon { width: 80px; height: 80px; opacity: 0.7; }

.empty-state p, .no-data {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  padding: 20px;
}
</style>
