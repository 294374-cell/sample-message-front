import { useEffect, useState } from 'react'
import { createMessage, listMessages } from './api'

const POLL_INTERVAL_MS = 2000

export default function App() {
  const [messages, setMessages] = useState([])
  const [recipient, setRecipient] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Polling: a cada 2s busca a lista para refletir mudanças feitas pelo worker.
  // Numa app real você usaria websockets/SSE, mas polling é suficiente aqui
  // para enxergar a fila funcionando.
  useEffect(() => {
    let active = true

    async function fetchOnce() {
      try {
        const data = await listMessages()
        if (active) setMessages(data)
      } catch (err) {
        if (active) setError(err.message)
      }
    }

    fetchOnce()
    const id = setInterval(fetchOnce, POLL_INTERVAL_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!recipient.trim() || !body.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const created = await createMessage({ recipient, body })
      setMessages((prev) => [created, ...prev])
      setRecipient('')
      setBody('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      <h1>Sistema de Envio de Mensagens</h1>
      <p>
        Envie uma mensagem. A API grava no Postgres com status{' '}
        <code>pending</code> e despacha um job para a fila do Redis. O worker
        processa em background e atualiza o status para <code>sent</code>.
      </p>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Nova mensagem</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="recipient">Destinatário</label>
          <input
            id="recipient"
            type="text"
            placeholder="ex: joao@exemplo.com"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={submitting}
          />

          <label htmlFor="body">Mensagem</label>
          <textarea
            id="body"
            placeholder="Escreva sua mensagem..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
          />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Mensagens enviadas</h2>
        {messages.length === 0 ? (
          <p className="empty">Nenhuma mensagem ainda.</p>
        ) : (
          <ul className="messages">
            {messages.map((m) => (
              <li key={m.id}>
                <div className="message-body">
                  <div className="message-to">Para: {m.recipient}</div>
                  <div className="message-content">{m.body}</div>
                </div>
                <span className={`status status-${m.status}`}>{m.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
