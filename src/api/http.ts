import keycloak from '@/auth/keycloak'

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  try {
    await keycloak.updateToken(30)
  } catch (error) {
    console.error('Failed to refresh token', error)
    await keycloak.login()
    throw error
  }

  const headers = new Headers(init.headers ?? {})
  headers.set('Authorization', `Bearer ${keycloak.token}`)

  return fetch(input, {
    ...init,
    headers,
  })
}