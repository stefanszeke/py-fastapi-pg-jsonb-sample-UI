import { createApp } from 'vue'
import App from './App.vue'
import keycloak from './auth/keycloak'

async function bootstrap() {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    })

    console.log('authenticated:', authenticated)

    const app = createApp(App)

    app.provide('keycloak', keycloak)

    app.mount('#app')
  } catch (error) {
    console.error('Failed to initialize Keycloak', error)
  }
}

bootstrap()