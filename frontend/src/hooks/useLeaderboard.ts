import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { leaderboardApi } from '@/api/leaderboard'
import { supabase } from '@/lib/supabase'

export function useLeaderboard(matchdayId?: string) {
  return useQuery({
    queryKey: ['leaderboard', matchdayId],
    queryFn: () =>
      matchdayId !== undefined
        ? leaderboardApi.getByMatchday(matchdayId)
        : leaderboardApi.getGlobal(),
    staleTime: 60_000,
  })
}

/**
 * Escucha cambios en matchday_scores (tabla que actualiza el admin al
 * registrar resultados) e invalida el leaderboard automáticamente.
 * No usa polling de partidos en vivo — solo reacciona a resultados finales.
 */
export function useRealtimeLeaderboard() {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('matchday_scores_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matchday_scores' },
        () => {
          qc.invalidateQueries({ queryKey: ['leaderboard'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
