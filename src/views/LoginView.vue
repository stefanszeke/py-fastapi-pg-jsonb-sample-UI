<script setup lang="ts">
import { inject } from 'vue'
import type Keycloak from 'keycloak-js'

const keycloak = inject<Keycloak>('keycloak')!
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo">🗺️</div>
      <h1>Caves SK</h1>
      <p class="subtitle">Explore Slovak cave expedition data</p>
      <div class="actions">
        <button class="btn-primary" @click="keycloak.login()">Sign In</button>
        <button class="btn-secondary" @click="keycloak.register()">Create Account</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #1a2a3a 0%, #2d4a5e 50%, #1a3a2a 100%);
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 48px 40px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 360px;
}

.logo {
  font-size: 48px;
  margin-bottom: 8px;
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #1a2a3a;
}

.subtitle {
  margin: 0 0 32px;
  color: #666;
  font-size: 14px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}

button:active {
  transform: scale(0.98);
}

.btn-primary {
  background: #2d6a4f;
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: transparent;
  color: #2d6a4f;
  border: 2px solid #2d6a4f;
}

.btn-secondary:hover {
  background: #f0f7f4;
}
</style>
