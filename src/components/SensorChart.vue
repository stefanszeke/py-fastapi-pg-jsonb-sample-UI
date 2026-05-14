<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { authFetch } from '@/api/http'

type RawReading    = { measured_at: string; temperature: number | null; humidity: number | null; co2: number | null }
type HourlyReading = { hour: string; avg_temp: number | null; avg_humidity: number | null; avg_co2: number | null }
type Metric = 'temperature' | 'humidity' | 'co2'
type Mode   = '24h' | '7d'

const props = defineProps<{ sensorId: string; sensorName: string; sensorCode: string }>()

const mode    = ref<Mode>('24h')
const metric  = ref<Metric>('temperature')
const loading = ref(false)
const error   = ref(false)
const series  = ref<ApexAxisChartSeries>([])
const options = ref<object>({})

const LABELS: Record<Metric, string> = {
  temperature: 'Temperature',
  humidity:    'Humidity',
  co2:         'CO₂',
}
const COLORS: Record<Metric, string> = {
  temperature: '#2563eb',
  humidity:    '#22c55e',
  co2:         '#f59e0b',
}
const UNITS: Record<Metric, string> = {
  temperature: '°C',
  humidity:    '%',
  co2:         ' ppm',
}

function fmt(v: number): string {
  if (metric.value === 'temperature') return `${v.toFixed(2)}°C`
  if (metric.value === 'humidity')    return `${v.toFixed(1)}%`
  return `${Math.round(v)} ppm`
}

function buildOptions() {
  const color = COLORS[metric.value]
  options.value = {
    chart: {
      type: 'area',
      height: 150,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      background: 'transparent',
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02 },
    },
    colors: [color],
    xaxis: {
      type: 'datetime',
      labels: {
        style: { fontSize: '10px', colors: '#94a3b8' },
        datetimeUTC: false,
      },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '10px', colors: '#94a3b8' },
        formatter: (v: number) => fmt(v).replace(UNITS[metric.value], ''),
      },
    },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 3, padding: { left: 4, right: 8 } },
    tooltip: {
      x: { format: mode.value === '24h' ? 'HH:mm' : 'dd MMM HH:mm' },
      y: { formatter: fmt },
      theme: 'light',
    },
    legend: { show: false },
  }
}

async function load() {
  loading.value = true
  error.value   = false
  try {
    let xArr: number[] = []
    let yArr: (number | null)[] = []

    if (mode.value === '24h') {
      const resp = await authFetch(`http://127.0.0.1:8000/sensor-readings/${props.sensorId}/raw?hours=24`)
      if (!resp.ok) throw new Error()
      const rows: RawReading[] = await resp.json()
      xArr = rows.map(r => new Date(r.measured_at).getTime())
      yArr = rows.map(r => metric.value === 'temperature' ? r.temperature
                         : metric.value === 'humidity'    ? r.humidity
                         :                                  r.co2)
    } else {
      const resp = await authFetch(`http://127.0.0.1:8000/sensor-readings/${props.sensorId}/hourly?days=7`)
      if (!resp.ok) throw new Error()
      const rows: HourlyReading[] = await resp.json()
      xArr = rows.map(r => new Date(r.hour).getTime())
      yArr = rows.map(r => metric.value === 'temperature' ? r.avg_temp
                         : metric.value === 'humidity'    ? r.avg_humidity
                         :                                  r.avg_co2)
    }

    series.value = [{ name: LABELS[metric.value], data: xArr.map((x, i) => [x, yArr[i]]) }]
    buildOptions()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

watch([mode, metric], load)
onMounted(load)
</script>

<template>
  <div class="sensor-card">
    <div class="sensor-header">
      <span class="sensor-code">{{ sensorCode }}</span>
      <span class="sensor-name">{{ sensorName }}</span>
    </div>

    <div class="controls">
      <div class="btn-group">
        <button
          v-for="m in (['temperature', 'humidity', 'co2'] as const)"
          :key="m"
          class="ctrl-btn"
          :class="{ active: metric === m, [`active--${m}`]: metric === m }"
          @click="metric = m"
        >
          {{ m === 'temperature' ? 'Temp' : m === 'humidity' ? 'Humid' : 'CO₂' }}
        </button>
      </div>
      <div class="btn-group">
        <button class="ctrl-btn" :class="{ active: mode === '24h' }" @click="mode = '24h'">24h</button>
        <button class="ctrl-btn" :class="{ active: mode === '7d' }"  @click="mode = '7d'">7d</button>
      </div>
    </div>

    <div v-if="loading" class="chart-placeholder">
      <span class="spinner"></span>
    </div>
    <div v-else-if="error" class="chart-placeholder chart-error">
      Failed to load data
    </div>
    <VueApexCharts
      v-else
      type="area"
      height="150"
      :options="options"
      :series="series"
    />
  </div>
</template>

<style scoped>
.sensor-card {
  margin: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.sensor-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 6px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.sensor-code {
  font-size: 10px;
  font-weight: 700;
  color: #7c3aed;
  background: #ede9fe;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.sensor-name {
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.controls {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px 2px;
  gap: 6px;
}

.btn-group {
  display: flex;
  gap: 3px;
}

.ctrl-btn {
  padding: 2px 8px;
  border-radius: 5px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.12s;
}

.ctrl-btn:hover { border-color: #cbd5e1; color: #475569; }

.ctrl-btn.active                    { color: #fff; border-color: transparent; }
.ctrl-btn.active--temperature       { background: #2563eb; }
.ctrl-btn.active--humidity          { background: #22c55e; }
.ctrl-btn.active--co2               { background: #f59e0b; }
.ctrl-btn.active:not([class*="active--"]) { background: #475569; }

.chart-placeholder {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #94a3b8;
}

.chart-error { color: #ef4444; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
