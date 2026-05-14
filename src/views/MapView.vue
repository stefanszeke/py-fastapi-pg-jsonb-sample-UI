<script setup lang="ts">
import { onMounted, onUnmounted, onBeforeUnmount, ref, watch, inject, computed } from 'vue'
import type Keycloak from 'keycloak-js'
import 'ol/ol.css'

import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { fromLonLat } from 'ol/proj.js'
import Style from 'ol/style/Style.js'
import CircleStyle from 'ol/style/Circle.js'
import RegularShape from 'ol/style/RegularShape.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'

import { authFetch } from '@/api/http'
import CavePanel from '@/components/CavePanel.vue'
import LayerControl from '@/components/LayerControl.vue'
import CaveSearch from '@/components/CaveSearch.vue'

type CaveApi = {
  id: string; name: string; lon: number; lat: number; cave_type: string
  depth_m: number | null; length_m: number | null; region: string
  municipality: string | null; is_public: boolean; sensitivity_level: string
}
type SurveyRead = {
  id: string; cave_id: string; name: string
  public_payload: Record<string, unknown>
  caver_payload: Record<string, unknown> | null
  scientific_payload: Record<string, unknown> | null
}
type EntranceRead = {
  id: string; cave_id: string; name: string | null
  lon: number; lat: number; entrance_type: string | null; is_public: boolean
}
type SurveyLineRead = { id: string; cave_id: string; geom: string; payload: Record<string, unknown> }
type ProtectedAreaRead = { id: string; name: string; geom: string; payload: Record<string, unknown> }

const keycloak = inject<Keycloak>('keycloak')!
const canSeeEntrances   = computed(() => keycloak.hasResourceRole('caves:read_restricted', 'caves-api'))
const canSeeSurveyLines = computed(() => keycloak.hasResourceRole('surveys:read_caver', 'caves-api'))
const canSeeSensors     = computed(() => keycloak.hasResourceRole('surveys:read_scientific', 'caves-api'))

const mapEl = ref<HTMLElement | null>(null)
const selectedCave = ref<CaveApi | null>(null)
const surveys = ref<SurveyRead[]>([])
const entrances = ref<EntranceRead[]>([])
const loading = ref(false)
const loadError = ref(false)
const initialLoading = ref(true)

const layerVisible = ref({ protectedAreas: true, caves: true, entrances: true, surveyLines: true })

// ── Resizable panel ────────────────────────────────────────────
const panelWidth = ref(380)
let isResizing = false
let startX = 0
let startWidth = 0
let maxWidth = 600

function onResizerMouseDown(e: MouseEvent) {
  isResizing = true
  startX = e.clientX
  startWidth = panelWidth.value
  maxWidth = Math.floor(window.innerWidth * 0.5)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isResizing) return
  panelWidth.value = Math.min(maxWidth, Math.max(200, startWidth + (startX - e.clientX)))
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
let cavesLayer: VectorLayer<VectorSource> | null = null
let protectedAreasLayer: VectorLayer<VectorSource> | null = null
let entrancesLayer: VectorLayer<VectorSource> | null = null
let surveyLinesLayer: VectorLayer<VectorSource> | null = null
let cavesSource: VectorSource | null = null
let protectedAreasSource: VectorSource | null = null
let entrancesSource: VectorSource | null = null
let surveyLinesSource: VectorSource | null = null

const caves = ref<CaveApi[]>([])

const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857', dataProjection: 'EPSG:4326' })

const selectedStyle = [
  new Style({
    image: new CircleStyle({
      radius: 14,
      fill: new Fill({ color: 'rgba(37, 99, 235, 0.18)' }),
      stroke: new Stroke({ color: '#2563eb', width: 2 }),
    }),
  }),
  new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: '#2563eb' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  }),
]

const selectedEntranceStyle = [
  new Style({
    image: new CircleStyle({
      radius: 16,
      fill: new Fill({ color: 'rgba(124, 58, 237, 0.15)' }),
      stroke: new Stroke({ color: '#7c3aed', width: 2 }),
    }),
  }),
  new Style({
    image: new RegularShape({
      points: 4,
      radius: 10,
      angle: 0,
      fill: new Fill({ color: '#7c3aed' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  }),
]

let activeFeature: Feature | null = null
let activeEntranceFeature: Feature | null = null

async function selectCave(cave: CaveApi) {
  selectedCave.value = cave
  surveys.value = []
  entrances.value = []
  loading.value = true

  if (activeEntranceFeature) { activeEntranceFeature.setStyle(undefined); activeEntranceFeature = null }
  entrancesSource?.clear()
  surveyLinesSource?.clear()

  const [surveysRes, entrancesRes, linesRes] = await Promise.allSettled([
    authFetch(`http://127.0.0.1:8000/surveys/by-cave/${cave.id}`),
    canSeeEntrances.value   ? authFetch(`http://127.0.0.1:8000/entrances/by-cave/${cave.id}`)   : Promise.reject<Response>('no-role'),
    canSeeSurveyLines.value ? authFetch(`http://127.0.0.1:8000/survey-lines/by-cave/${cave.id}`) : Promise.reject<Response>('no-role'),
  ] as [Promise<Response>, Promise<Response>, Promise<Response>])

  try {
    if (surveysRes.status === 'fulfilled' && surveysRes.value.ok)
      surveys.value = await surveysRes.value.json()
  } catch (err) { console.error('surveys fetch failed', err) }

  try {
    if (entrancesRes.status === 'fulfilled' && entrancesRes.value.ok) {
      const entrancesData: EntranceRead[] = await entrancesRes.value.json()
      entrances.value = entrancesData
      entrancesSource?.addFeatures(
        entrancesData.map(e => new Feature({ geometry: new Point(fromLonLat([e.lon, e.lat])), entranceData: e })),
      )
    }
  } catch (err) { console.error('entrances fetch failed', err) }

  try {
    if (linesRes.status === 'fulfilled' && linesRes.value.ok) {
      const linesData: SurveyLineRead[] = await linesRes.value.json()
      linesData.forEach(line => surveyLinesSource?.addFeatures(geojsonFormat.readFeatures(line.geom)))
    }
  } catch (err) { console.error('survey-lines fetch failed', err) }

  loading.value = false
}

function handleSearchSelect(cave: CaveApi) {
  map?.getView().animate({ center: fromLonLat([cave.lon, cave.lat]), zoom: 13, duration: 600 })

  const feature = cavesSource?.getFeatures().find(f => f.get('caveData')?.id === cave.id)
  if (activeFeature) activeFeature.setStyle(undefined)
  if (feature) {
    ;(feature as Feature).setStyle(selectedStyle)
    activeFeature = feature as Feature
  }

  selectCave(cave)
}

function handleFlyToCave() {
  if (!selectedCave.value) return
  if (activeEntranceFeature) { activeEntranceFeature.setStyle(undefined); activeEntranceFeature = null }
  map?.getView().animate({ center: fromLonLat([selectedCave.value.lon, selectedCave.value.lat]), zoom: 13, duration: 600 })
}

function handleFlyToEntrance(entrance: EntranceRead) {
  map?.getView().animate({ center: fromLonLat([entrance.lon, entrance.lat]), zoom: 16, duration: 600 })

  if (activeEntranceFeature) activeEntranceFeature.setStyle(undefined)
  const feature = entrancesSource?.getFeatures().find(f => f.get('entranceData')?.id === entrance.id)
  if (feature) {
    ;(feature as Feature).setStyle(selectedEntranceStyle)
    activeEntranceFeature = feature as Feature
  }
}

async function loadMapData() {
  initialLoading.value = true
  loadError.value = false
  try {
    const [cavesResp, areasResp] = await Promise.all([
      authFetch('http://127.0.0.1:8000/caves'),
      authFetch('http://127.0.0.1:8000/protected-areas'),
    ])
    caves.value = await cavesResp.json()
    const areas: ProtectedAreaRead[] = await areasResp.json()
    cavesSource!.addFeatures(
      caves.value.map(cave => new Feature({ geometry: new Point(fromLonLat([cave.lon, cave.lat])), caveData: cave })),
    )
    areas.forEach(area => protectedAreasSource!.addFeatures(geojsonFormat.readFeatures(area.geom)))
  } catch {
    loadError.value = true
  } finally {
    initialLoading.value = false
  }
}

function retryLoad() {
  cavesSource?.clear()
  protectedAreasSource?.clear()
  caves.value = []
  loadMapData()
}

watch(layerVisible, (v) => {
  cavesLayer?.setVisible(v.caves)
  protectedAreasLayer?.setVisible(v.protectedAreas)
  entrancesLayer?.setVisible(v.entrances)
  surveyLinesLayer?.setVisible(v.surveyLines)
}, { deep: true })

onMounted(async () => {
  if (!mapEl.value) return

  cavesSource          = new VectorSource()
  protectedAreasSource = new VectorSource()
  entrancesSource      = new VectorSource()
  surveyLinesSource    = new VectorSource()

  protectedAreasLayer = new VectorLayer({
    source: protectedAreasSource,
    style: new Style({
      fill: new Fill({ color: 'rgba(34, 197, 94, 0.12)' }),
      stroke: new Stroke({ color: '#22c55e', width: 1.5 }),
    }),
    zIndex: 0,
  })

  surveyLinesLayer = new VectorLayer({
    source: surveyLinesSource,
    style: new Style({ stroke: new Stroke({ color: '#ef4444', width: 2.5 }) }),
    zIndex: 2,
  })

  cavesLayer = new VectorLayer({
    source: cavesSource,
    style: new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: '#2563eb' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
    }),
    zIndex: 4,
  })

  entrancesLayer = new VectorLayer({
    source: entrancesSource,
    style: new Style({
      image: new RegularShape({
        points: 4,
        radius: 8,
        angle: 0,
        fill: new Fill({ color: '#7c3aed' }),
        stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
      }),
    }),
    zIndex: 5,
  })

  map = new Map({
    target: mapEl.value,
    layers: [
      new TileLayer({ source: new OSM() }),
      protectedAreasLayer,
      surveyLinesLayer,
      cavesLayer,
      entrancesLayer,
    ],
    view: new View({ center: fromLonLat([19.5, 48.7]), zoom: 8 }),
  })

  await loadMapData()

  map.on('click', (event) => {
    let clickedFeature: Feature | null = null
    const cave = map?.forEachFeatureAtPixel(event.pixel, (f, layer) => {
      if (layer === cavesLayer) {
        clickedFeature = f as Feature
        return (f as Feature).get('caveData') as CaveApi
      }
    })

    if (activeFeature) activeFeature.setStyle(undefined)

    if (clickedFeature) {
      ;(clickedFeature as Feature).setStyle(selectedStyle)
      activeFeature = clickedFeature as Feature
    } else {
      activeFeature = null
    }

    if (cave) {
      selectCave(cave)
    } else {
      selectedCave.value = null
      entrancesSource?.clear()
      surveyLinesSource?.clear()
    }
  })

  map.on('pointermove', (event) => {
    if (!mapEl.value) return
    mapEl.value.style.cursor = map?.hasFeatureAtPixel(event.pixel) ? 'pointer' : ''
  })
})

onUnmounted(() => {
  map?.setTarget(undefined)
  map = cavesLayer = protectedAreasLayer = entrancesLayer = surveyLinesLayer = null
})
</script>

<template>
  <div class="page">
    <div class="map-wrapper">
      <div ref="mapEl" class="map"></div>
      <div class="layer-control-wrap">
        <LayerControl
          v-model="layerVisible"
          :can-see-entrances="canSeeEntrances"
          :can-see-survey-lines="canSeeSurveyLines"
        />
      </div>
      <div class="search-wrap-outer">
        <CaveSearch :caves="caves" @select="handleSearchSelect" />
      </div>

      <div v-if="initialLoading" class="map-banner map-banner--loading">
        <span class="spinner-sm"></span> Loading map data…
      </div>
      <div v-else-if="loadError" class="map-banner map-banner--error">
        <svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="flex-shrink:0">
          <circle cx="10" cy="10" r="9" stroke="#ef4444" stroke-width="1.8"/>
          <line x1="10" y1="6" x2="10" y2="11" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
          <circle cx="10" cy="14" r="1" fill="#ef4444"/>
        </svg>
        <span>Could not reach the server.</span>
        <button class="retry-btn" @click="retryLoad">Retry</button>
      </div>
    </div>

    <div class="resizer" @mousedown="onResizerMouseDown"></div>

    <CavePanel
      :cave="selectedCave"
      :surveys="surveys"
      :entrances="entrances"
      :loading="loading"
      :panel-width="panelWidth"
      :can-see-entrances="canSeeEntrances"
      :can-see-survey-lines="canSeeSurveyLines"
      :can-see-sensors="canSeeSensors"
      @fly-to-cave="handleFlyToCave"
      @fly-to-entrance="handleFlyToEntrance"
    />
  </div>
</template>

<style scoped>
.page {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 12px;
  gap: 0;
  background: #e2e8f0;
}

.map-wrapper {
  flex: 1;
  min-width: 0;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.layer-control-wrap {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
}

.search-wrap-outer {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.map-banner {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(6px);
}

.map-banner--loading {
  background: rgba(255, 255, 255, 0.92);
  color: #475569;
}

.map-banner--error {
  background: rgba(255, 241, 241, 0.97);
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.spinner-sm {
  width: 13px;
  height: 13px;
  border: 2px solid #cbd5e1;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

.retry-btn {
  margin-left: 4px;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid #ef4444;
  background: #fff;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.retry-btn:hover { background: #fee2e2; }

.resizer {
  width: 6px;
  cursor: col-resize;
  flex-shrink: 0;
  border-radius: 3px;
  margin: 0 3px;
  transition: background 0.15s;
}

.resizer:hover,
.resizer:active {
  background: #94a3b8;
}
</style>
