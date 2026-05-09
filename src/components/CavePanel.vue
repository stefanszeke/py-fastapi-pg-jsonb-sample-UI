<script setup lang="ts">
import { ref } from 'vue'

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

defineProps<{
  cave: CaveApi | null
  surveys: SurveyRead[]
  entrances: EntranceRead[]
  loading: boolean
  panelWidth: number
}>()

const activeTab = ref<'overview' | 'surveys' | 'entrances'>('overview')

function strVal(v: unknown) { return String(v ?? '') }
function numVal(v: unknown) { return typeof v === 'number' ? v.toLocaleString() : String(v ?? '') }
function listVal(v: unknown) { return Array.isArray(v) ? v.join(', ') : String(v ?? '') }
</script>

<template>
  <aside class="panel" :style="{ width: panelWidth + 'px' }">
    <div class="panel-header">
      <svg class="panel-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.5" fill="#2563eb" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <h2>{{ cave ? cave.name : 'Cave Details' }}</h2>
    </div>

    <template v-if="!cave">
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 64 64" fill="none">
          <path d="M6 54L20 22L32 38L40 26L58 54H6Z" fill="#dbeafe" stroke="#93c5fd" stroke-width="2" stroke-linejoin="round" />
          <circle cx="44" cy="16" r="5" fill="#bfdbfe" stroke="#93c5fd" stroke-width="1.5" />
        </svg>
        <p>Click a cave marker<br />on the map to explore.</p>
      </div>
    </template>

    <template v-else>
      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">Overview</button>
        <button class="tab-btn" :class="{ active: activeTab === 'surveys' }" @click="activeTab = 'surveys'">
          Surveys
          <span v-if="surveys.length" class="tab-count">{{ surveys.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'entrances' }" @click="activeTab = 'entrances'">
          Entrances
          <span v-if="entrances.length" class="tab-count">{{ entrances.length }}</span>
        </button>
      </div>

      <div v-if="loading" class="loading">
        <span class="spinner"></span> Loading…
      </div>

      <!-- Overview -->
      <div v-else-if="activeTab === 'overview'" class="tab-content">
        <div class="section">
          <div class="section-head section-head--public">
            <span class="section-title">Location</span>
          </div>
          <div class="kv-list">
            <div class="kv-row"><span class="kv-label">Region</span><span class="kv-value">{{ cave.region }}</span></div>
            <div v-if="cave.municipality" class="kv-row"><span class="kv-label">Municipality</span><span class="kv-value">{{ cave.municipality }}</span></div>
            <div class="kv-row"><span class="kv-label">Coordinates</span><span class="kv-value mono">{{ cave.lat.toFixed(4) }}, {{ cave.lon.toFixed(4) }}</span></div>
          </div>
        </div>
        <div class="section">
          <div class="section-head section-head--caver">
            <span class="section-title">Cave</span>
          </div>
          <div class="kv-list">
            <div class="kv-row"><span class="kv-label">Type</span><span class="kv-value">{{ cave.cave_type }}</span></div>
            <div v-if="cave.length_m != null" class="kv-row"><span class="kv-label">Length</span><span class="kv-value">{{ cave.length_m.toLocaleString() }} m</span></div>
            <div v-if="cave.depth_m != null" class="kv-row"><span class="kv-label">Depth</span><span class="kv-value">{{ cave.depth_m.toLocaleString() }} m</span></div>
            <div class="kv-row">
              <span class="kv-label">Access</span>
              <span class="kv-value">
                <span class="pill" :class="cave.is_public ? 'pill--yes' : 'pill--no'">{{ cave.is_public ? 'Public' : 'Restricted' }}</span>
                <span class="pill pill--diff">{{ cave.sensitivity_level }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Surveys -->
      <div v-else-if="activeTab === 'surveys'" class="tab-content">
        <div v-if="surveys.length === 0" class="no-data">No survey data for this cave.</div>
        <template v-for="survey in surveys" :key="survey.id">
          <div class="survey-name">{{ survey.name }}</div>
          <div class="section">
            <div class="section-head section-head--public">
              <span class="section-title">General</span>
              <span class="tier-badge tier-badge--public">Public</span>
            </div>
            <div class="kv-list">
              <div class="kv-row"><span class="kv-label">Kind</span><span class="kv-value">{{ strVal(survey.public_payload.kind) }}</span></div>
              <div class="kv-row">
                <span class="kv-label">Tags</span>
                <span class="kv-value">
                  <span v-for="tag in (survey.public_payload.tags as string[])" :key="tag" class="tag">{{ tag }}</span>
                </span>
              </div>
              <div class="kv-row">
                <span class="kv-label">Protected</span>
                <span class="kv-value">
                  <span class="pill" :class="survey.public_payload.protected ? 'pill--yes' : 'pill--no'">
                    {{ survey.public_payload.protected ? 'Yes' : 'No' }}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div v-if="survey.caver_payload" class="section">
            <div class="section-head section-head--caver">
              <span class="section-title">Expedition</span>
              <span class="tier-badge tier-badge--caver">Caver+</span>
            </div>
            <div class="kv-list">
              <div class="kv-row"><span class="kv-label">Length</span><span class="kv-value">{{ numVal(survey.caver_payload.length_m) }} m</span></div>
              <div class="kv-row">
                <span class="kv-label">Difficulty</span>
                <span class="kv-value"><span class="pill pill--diff">{{ strVal(survey.caver_payload.difficulty) }}</span></span>
              </div>
              <div class="kv-row"><span class="kv-label">Equipment</span><span class="kv-value">{{ listVal(survey.caver_payload.equipment_required) }}</span></div>
            </div>
          </div>
          <div v-if="survey.scientific_payload" class="section">
            <div class="section-head section-head--researcher">
              <span class="section-title">Research</span>
              <span class="tier-badge tier-badge--researcher">Researcher</span>
            </div>
            <div class="kv-list">
              <div class="kv-row"><span class="kv-label">Geology</span><span class="kv-value">{{ strVal(survey.scientific_payload.geology) }}</span></div>
              <div class="kv-row"><span class="kv-label">Discovered</span><span class="kv-value">{{ strVal(survey.scientific_payload.discovered) }}</span></div>
              <div class="kv-row"><span class="kv-label">Species</span><span class="kv-value">{{ strVal(survey.scientific_payload.species_count) }}</span></div>
            </div>
          </div>
        </template>
      </div>

      <!-- Entrances -->
      <div v-else-if="activeTab === 'entrances'" class="tab-content">
        <div v-if="entrances.length === 0" class="no-data">No entrance data for this cave.</div>
        <div v-for="entrance in entrances" :key="entrance.id" class="section">
          <div class="section-head section-head--caver">
            <span class="section-title">{{ entrance.name || 'Entrance' }}</span>
            <span class="tier-badge tier-badge--caver">{{ entrance.entrance_type || 'Unknown' }}</span>
          </div>
          <div class="kv-list">
            <div class="kv-row">
              <span class="kv-label">Coordinates</span>
              <span class="kv-value mono">{{ entrance.lat.toFixed(4) }}, {{ entrance.lon.toFixed(4) }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">Access</span>
              <span class="kv-value">
                <span class="pill" :class="entrance.is_public ? 'pill--yes' : 'pill--no'">
                  {{ entrance.is_public ? 'Public' : 'Restricted' }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </aside>
</template>

<style scoped>
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
  padding: 14px 20px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
}

.panel-icon { width: 18px; height: 18px; flex-shrink: 0; }

.panel-header h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Tabs ────────────────────────────── */
.tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  background: #f8fafc;
}

.tab-btn {
  flex: 1;
  padding: 9px 6px;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tab-btn:hover { color: #475569; }

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.tab-count {
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
  min-width: 16px;
  text-align: center;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 8px;
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
  padding: 7px 12px;
  border-bottom: 1px solid transparent;
}

.section-head--public     { background: #eff6ff; border-bottom-color: #dbeafe; }
.section-head--caver      { background: #f0fdf4; border-bottom-color: #dcfce7; }
.section-head--researcher { background: #faf5ff; border-bottom-color: #ede9fe; }

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #334155;
}

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
  gap: 6px;
}

.kv-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
}

.kv-label {
  min-width: 80px;
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

.kv-value.mono { font-family: monospace; font-size: 12px; }

/* ── Survey name separator ───────────── */
.survey-name {
  padding: 10px 20px 4px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
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

.empty-icon { width: 72px; height: 72px; opacity: 0.7; }

.empty-state p, .no-data {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  padding: 20px;
}
</style>
