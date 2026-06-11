import { supabase } from '@/lib/supabase'
import type { LeaderboardEntry } from '@/types'

export const leaderboardApi = {
  getGlobal: async (): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('rank')
    if (error) throw new Error(error.message)
    return data as LeaderboardEntry[]
  },

  getByMatchday: async (matchdayId: string): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase.rpc('get_matchday_leaderboard', {
      p_matchday_id: matchdayId,
    })
    if (error) throw new Error(error.message)
    return (data as LeaderboardEntry[]) ?? []
  },

  // Admin: recalcular puntuaciones de todos los partidos de una jornada ya finalizados
  calculateMatchday: async (matchdayId: string): Promise<void> => {
    // 1. Obtener todos los partidos finalizados de la jornada
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('id')
      .eq('matchday_id', matchdayId)
      .eq('status', 'finished')
    if (matchError) throw new Error(matchError.message)

    // 2. Calcular puntuaciones partido a partido
    for (const match of matches ?? []) {
      const { error } = await supabase.rpc('calculate_match_scores', {
        p_match_id: match.id,
      })
      if (error) throw new Error(error.message)
    }
  },
}
