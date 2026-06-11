import { useState, useEffect, useRef } from 'react'
import { parseISO, differenceInSeconds } from 'date-fns'

interface CountdownState {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
  /** true cuando quedan menos de 30 minutos */
  isUrgent: boolean
  totalSeconds: number
}

export function useCountdown(closesAt: string): CountdownState {
  const getState = (): CountdownState => {
    const diff = differenceInSeconds(parseISO(closesAt), new Date())
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isUrgent: true, totalSeconds: 0 }
    }
    const days    = Math.floor(diff / 86400)
    const hours   = Math.floor((diff % 86400) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    return {
      days, hours, minutes, seconds,
      isExpired: false,
      isUrgent: diff < 1800, // < 30 minutos
      totalSeconds: diff,
    }
  }

  const [state, setState] = useState<CountdownState>(getState)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const next = getState()
      setState(next)
      if (next.isExpired && intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [closesAt])

  return state
}
