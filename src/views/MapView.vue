<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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

type CaveDetails = {
  name: string
  type: string
  depthM: number
  region: string
}

const mapEl = ref<HTMLElement | null>(null)
const selectedCave = ref<CaveDetails | null>(null)

let map: Map | null = null

onMounted(async () => {
  if (!mapEl.value) return

  const response = await authFetch('http://127.0.0.1:8000/caves')
  const caves: CaveApi[] = await response.json()

  const caveFeatures = caves.map(
    (cave) =>
      new Feature({
        geometry: new Point(fromLonLat([cave.lon, cave.lat])),
        name: cave.name,
        type: cave.type,
        depthM: cave.depth_m,
        region: cave.region,
      }),
  )

  const defaultPointStyle = new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: '#2563eb' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  })

  const cavesLayer = new VectorLayer({
    source: new VectorSource({ features: caveFeatures }),
    style: defaultPointStyle,
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
    const result = map?.forEachFeatureAtPixel(event.pixel, (feature) => {
      const cave = feature as Feature
      return {
        name: String(cave.get('name') ?? 'Unknown cave'),
        type: String(cave.get('type') ?? 'Unknown type'),
        depthM: Number(cave.get('depthM') ?? 0),
        region: String(cave.get('region') ?? 'Unknown region'),
      } satisfies CaveDetails
    })

    selectedCave.value = result ?? null
  })

  map.on('pointermove', (event) => {
    if (!mapEl.value) return
    mapEl.value.style.cursor = map?.hasFeatureAtPixel(event.pixel) ? 'pointer' : ''
  })
})

onUnmounted(() => {
  if (map) {
    map.setTarget(undefined)
    map = null
  }
})
</script>

<template>
  <div class="page">
    <div ref="mapEl" class="map"></div>

    <aside class="panel">
      <div class="panel-header">
        <svg class="panel-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3.5" fill="#2563eb" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <h2>Cave Details</h2>
      </div>

      <template v-if="selectedCave">
        <div class="cave-name">{{ selectedCave.name }}</div>

        <div class="detail-list">
          <div class="detail-item">
            <div class="detail-icon">
              <svg viewBox="0 0 16 16" fill="none">
                <path d="M8 1L15 14H1L8 1Z" fill="#60a5fa" stroke="#3b82f6" stroke-width="1" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <div class="detail-label">Type</div>
              <div class="detail-value">{{ selectedCave.type }}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">
              <svg viewBox="0 0 16 16" fill="none">
                <line x1="8" y1="1" x2="8" y2="15" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
                <path d="M4 11L8 15L12 11" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
            </div>
            <div>
              <div class="detail-label">Depth</div>
              <div class="detail-value">{{ selectedCave.depthM }} m</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">
              <svg viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="7" r="3.5" stroke="#3b82f6" stroke-width="1.5"/>
                <path d="M8 10.5C8 10.5 3 14 3 15H13C13 14 8 10.5 8 10.5Z" fill="#60a5fa"/>
              </svg>
            </div>
            <div>
              <div class="detail-label">Region</div>
              <div class="detail-value">{{ selectedCave.region }}</div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
            <path d="M6 54L20 22L32 38L40 26L58 54H6Z" fill="#dbeafe" stroke="#93c5fd" stroke-width="2" stroke-linejoin="round"/>
            <circle cx="44" cy="16" r="5" fill="#bfdbfe" stroke="#93c5fd" stroke-width="1.5"/>
          </svg>
          <p>Click a cave marker<br />on the map to explore.</p>
        </div>
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

.panel {
  width: 300px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow-y: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.panel-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.panel-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #475569;
}

.cave-name {
  padding: 20px 20px 4px;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}

.detail-list {
  padding: 12px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-icon svg {
  width: 16px;
  height: 16px;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #94a3b8;
  margin-bottom: 3px;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

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

.empty-icon {
  width: 80px;
  height: 80px;
  opacity: 0.7;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
}
</style>