// O React SEMPRE chama URLs relativas (ex.: /api/messages).
//
// - Em produção, o NGINX serve este build e faz proxy de /api/* pro
//   backend Laravel. Tudo na mesma origem, sem CORS.
// - Em desenvolvimento (`npm run dev`), o Vite resolve /api via proxy
//   configurado em vite.config.js, apontando pro Laravel local.
//
// Conclusão: o frontend nunca precisa saber o host do backend.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return res.json()
}

export function listMessages() {
  return request('/api/messages')
}

export function createMessage({ recipient, body }) {
  return request('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ recipient, body }),
  })
}
