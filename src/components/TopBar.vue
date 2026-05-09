<script setup lang="ts">
import { inject, computed } from 'vue'
import type Keycloak from 'keycloak-js'

const keycloak = inject<Keycloak>('keycloak')!

const username = computed(
  () =>
    keycloak.tokenParsed?.preferred_username ??
    keycloak.tokenParsed?.given_name ??
    'User',
)

const initial = computed(() => (username.value[0] ?? 'U').toUpperCase())

function hasRole(role: string): boolean {
  return keycloak.hasRealmRole(role) || keycloak.hasResourceRole(role, 'caves-api')
}

const roleLabel = computed(() => {
  if (hasRole('admin')) return 'Admin'
  if (hasRole('surveys:read_scientific')) return 'Researcher'
  if (hasRole('surveys:read_caver')) return 'Caver'
  return 'Visitor'
})

function logout() {
  keycloak.logout({ redirectUri: window.location.origin + '/' })
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <svg class="brand-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 20L8 7L13 15L16 10L22 20H2Z" fill="#60a5fa" />
        <path d="M2 20L8 7L13 15L16 10L22 20" stroke="#93c5fd" stroke-width="1.2" stroke-linejoin="round" fill="none" />
      </svg>
      <span class="brand-name">CavesSK</span>
    </div>

    <div class="user-area">
      <div class="user-info">
        <div class="avatar">{{ initial }}</div>
        <span class="username">{{ username }}</span>
        <span class="role-badge" :class="`role-badge--${roleLabel.toLowerCase()}`">{{ roleLabel }}</span>
      </div>
      <button class="logout-btn" @click="logout">Log out</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: #0f172a;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 28px;
  height: 28px;
}

.brand-name {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #f8fafc;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 9px;
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.role-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  border: 1px solid transparent;
}

.role-badge--admin {
  background: #ef381c;
  color: #ffffff;
  border-color: #020202;
}

.role-badge--researcher {
  background: #ede9fe;
  color: #6d28d9;
  border-color: #c4b5fd;
}

.role-badge--caver {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
}

.role-badge--visitor {
  background: #1e293b;
  color: #94a3b8;
  border-color: #334155;
}

.username {
  font-size: 14px;
  color: #94a3b8;
}

.logout-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #334155;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.logout-btn:hover {
  background: #1e293b;
  color: #f1f5f9;
  border-color: #475569;
}
</style>
