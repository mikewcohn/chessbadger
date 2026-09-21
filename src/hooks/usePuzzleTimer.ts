import { useCallback, useEffect, useRef, useState } from 'react'

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000

export type PuzzleTiming = {
  durationMs: number
  pauseCount: number
  restartCount: number
}

type PauseReason = 'manual' | 'hidden' | 'inactivity' | null

export const formatDuration = (durationMs?: number) => {
  if (durationMs === undefined) return ''
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

export const usePuzzleTimer = () => {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [pauseReason, setPauseReason] = useState<PauseReason>(null)
  const [showInactivityPrompt, setShowInactivityPrompt] = useState(false)
  const accumulatedMsRef = useRef(0)
  const runStartedAtRef = useRef(Date.now())
  const lastActivityAtRef = useRef(Date.now())
  const isRunningRef = useRef(true)
  const pauseCountRef = useRef(0)
  const restartCountRef = useRef(0)

  const currentElapsedMs = useCallback(() => (
    accumulatedMsRef.current
    + (isRunningRef.current ? Date.now() - runStartedAtRef.current : 0)
  ), [])

  const stopTimer = useCallback((reason: Exclude<PauseReason, null> | null, countPause: boolean) => {
    if (!isRunningRef.current) return

    accumulatedMsRef.current = currentElapsedMs()
    isRunningRef.current = false
    if (countPause) pauseCountRef.current += 1
    setElapsedMs(accumulatedMsRef.current)
    setIsRunning(false)
    setPauseReason(reason)
  }, [currentElapsedMs])

  const pause = useCallback(() => {
    setShowInactivityPrompt(false)
    stopTimer('manual', true)
  }, [stopTimer])

  const resume = useCallback(() => {
    if (isRunningRef.current) return

    const now = Date.now()
    runStartedAtRef.current = now
    lastActivityAtRef.current = now
    isRunningRef.current = true
    setIsRunning(true)
    setPauseReason(null)
    setShowInactivityPrompt(false)
  }, [])

  const reset = useCallback((isRestart = false) => {
    const now = Date.now()
    accumulatedMsRef.current = 0
    runStartedAtRef.current = now
    lastActivityAtRef.current = now
    isRunningRef.current = true
    pauseCountRef.current = 0
    restartCountRef.current = isRestart ? restartCountRef.current + 1 : 0
    setElapsedMs(0)
    setIsRunning(true)
    setPauseReason(null)
    setShowInactivityPrompt(false)
  }, [])

  const complete = useCallback((): PuzzleTiming => {
    const timing = {
      durationMs: Math.round(currentElapsedMs()),
      pauseCount: pauseCountRef.current,
      restartCount: restartCountRef.current,
    }
    stopTimer(null, false)
    return timing
  }, [currentElapsedMs, stopTimer])

  const keepPaused = useCallback(() => {
    setShowInactivityPrompt(false)
    setPauseReason('manual')
  }, [])

  useEffect(() => {
    const recordActivity = () => {
      if (isRunningRef.current) lastActivityAtRef.current = Date.now()
    }
    const handleVisibility = () => {
      if (document.hidden) {
        setShowInactivityPrompt(false)
        stopTimer('hidden', true)
      }
    }

    window.addEventListener('pointerdown', recordActivity, { passive: true })
    window.addEventListener('keydown', recordActivity)
    document.addEventListener('visibilitychange', handleVisibility)
    handleVisibility()

    return () => {
      window.removeEventListener('pointerdown', recordActivity)
      window.removeEventListener('keydown', recordActivity)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [stopTimer])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!isRunningRef.current) return

      const now = Date.now()
      setElapsedMs(currentElapsedMs())
      if (now - lastActivityAtRef.current >= INACTIVITY_LIMIT_MS) {
        stopTimer('inactivity', true)
        setShowInactivityPrompt(true)
      }
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [currentElapsedMs, stopTimer])

  return {
    complete,
    elapsedMs,
    isRunning,
    keepPaused,
    pause,
    pauseReason,
    reset,
    resume,
    showInactivityPrompt,
  }
}
