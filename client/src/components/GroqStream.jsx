import { useState, useEffect, useRef } from 'react'
import { Loader2, Zap, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function GroqStream({ prompt, systemPrompt, onComplete, autoStart = false, className = '' }) {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [duration, setDuration] = useState(null)
  const [error, setError] = useState(null)
  const [isFallback, setIsFallback] = useState(false)
  const abortRef = useRef(null)

  const startStream = async () => {
    setContent('')
    setError(null)
    setDuration(null)
    setIsStreaming(true)
    setIsFallback(false)

    try {
      const response = await fetch(`${API_URL}/api/groq/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
        signal: abortRef.current?.signal,
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) setContent(prev => prev + data.token)
            if (data.done) {
              setDuration(data.duration)
              if (data.fallback) setIsFallback(true)
              onComplete?.(data)
            }
            if (data.error) setError(data.error)
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setIsStreaming(false)
    }
  }

  useEffect(() => {
    if (autoStart && prompt) startStream()
  }, [autoStart, prompt])

  return (
    <div className={`relative ${className}`}>
      {/* Status bar */}
      {(isStreaming || duration) && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          {isStreaming ? (
            <>
              <Loader2 size={12} className="animate-spin text-humana-green" />
              <span className="text-humana-green">Claude Opus 4 generating response...</span>
            </>
          ) : duration ? (
            <>
              <Zap size={12} className="text-amber-500" />
              <span>AI responded in {(duration / 1000).toFixed(2)}s{isFallback ? ' (demo mode)' : ''}</span>
            </>
          ) : null}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-500 mb-2">
          <AlertCircle size={12} />
          <span>Error: {error}</span>
        </div>
      )}

      {content && (
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
          {content}
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-humana-green ml-0.5 animate-pulse align-text-bottom" />}
        </div>
      )}

      {!autoStart && !isStreaming && !content && (
        <button onClick={startStream} className="btn-primary text-sm">
          <Zap size={14} />
          Run AI Analysis
        </button>
      )}
    </div>
  )
}

export function useGroqStream() {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [duration, setDuration] = useState(null)
  const [error, setError] = useState(null)

  const stream = async (prompt, systemPrompt) => {
    setContent('')
    setError(null)
    setDuration(null)
    setIsStreaming(true)

    try {
      const response = await fetch(`${API_URL}/api/groq/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, systemPrompt }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) setContent(prev => prev + data.token)
            if (data.done) setDuration(data.duration)
            if (data.error) setError(data.error)
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsStreaming(false)
    }

    return content
  }

  return { content, isStreaming, duration, error, stream, setContent }
}
