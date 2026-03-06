import { useEffect, useRef } from 'react'

type SSEEventHandler = (data: unknown) => void

interface UseSSEOptions {
  onReminder?: SSEEventHandler
  onConnected?: () => void
}

export function useSSE(enabled: boolean, options: UseSSEOptions = {}) {
  const esRef = useRef<EventSource | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!enabled) return

    let retryTimeout: ReturnType<typeof setTimeout>
    let retryDelay = 1000

    function connect() {
      const es = new EventSource('/api/events', { withCredentials: true })
      esRef.current = es

      es.addEventListener('connected', () => {
        retryDelay = 1000 // reset on successful connection
        optionsRef.current.onConnected?.()
      })

      es.addEventListener('reminder', (e) => {
        try {
          const data = JSON.parse(e.data)
          optionsRef.current.onReminder?.(data)
        } catch {}
      })

      es.onerror = () => {
        es.close()
        esRef.current = null
        // Exponential backoff, max 30s
        retryDelay = Math.min(retryDelay * 2, 30_000)
        retryTimeout = setTimeout(connect, retryDelay)
      }
    }

    connect()

    return () => {
      clearTimeout(retryTimeout)
      esRef.current?.close()
      esRef.current = null
    }
  }, [enabled])
}
