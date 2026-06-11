import { supabase } from '@/lib/supabase'
import type { Prediction, CreatePredictionDto, UpdatePredictionDto } from '@/types'

// Supabase devuelve key_player y profile como objetos anidados; los aplanamos al tipo Prediction
type PredictionRow = Omit<Prediction, 'key_player_name' | 'user_alias'> & {
  key_player: { name: string } | null
  profile?: { alias: string } | null
}

function toPrediction(row: PredictionRow): Prediction {
  return {
    ...row,
    key_player_name: row.key_player?.name ?? '',
    user_alias: row.profile?.alias,
  }
}

export const predictionsApi = {
  getMine: async (): Promise<Prediction[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data, error } = await supabase
      .from('predictions')
      .select('*, key_player:players!predictions_key_player_id_fkey(name)')
      .eq('user_id', user.id)
      .order('created_at')
    if (error) throw new Error(error.message)
    return (data as PredictionRow[]).map(toPrediction)
  },

  // Solo devuelve predicciones cuando la jornada del partido ya cerró (el RLS lo garantiza)
  getByMatch: async (matchId: string): Promise<Prediction[]> => {
    const { data, error } = await supabase
      .from('predictions')
      .select('*, key_player:players!predictions_key_player_id_fkey(name), profile:profiles!predictions_user_id_fkey(alias)')
      .eq('match_id', matchId)
      .order('total_score', { ascending: false, nullsFirst: false })
    if (error) throw new Error(error.message)
    return (data as PredictionRow[]).map(toPrediction)
  },

  create: async (dto: CreatePredictionDto): Promise<Prediction> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data, error } = await supabase
      .from('predictions')
      .insert({
        user_id:       user.id,
        match_id:      dto.match_id,
        home_score:    dto.home_score,
        away_score:    dto.away_score,
        key_player_id: dto.key_player_id,
      })
      .select('*, key_player:players!predictions_key_player_id_fkey(name)')
      .single()
    if (error) throw new Error(error.message)
    return toPrediction(data as PredictionRow)
  },

  update: async (id: string, dto: UpdatePredictionDto): Promise<Prediction> => {
    const updates: Record<string, unknown> = {}
    if (dto.home_score    !== undefined) updates.home_score    = dto.home_score
    if (dto.away_score    !== undefined) updates.away_score    = dto.away_score
    if (dto.key_player_id !== undefined) updates.key_player_id = dto.key_player_id

    const { data, error } = await supabase
      .from('predictions')
      .update(updates)
      .eq('id', id)
      .select('*, key_player:players!predictions_key_player_id_fkey(name)')
      .single()
    if (error) throw new Error(error.message)
    return toPrediction(data as PredictionRow)
  },

  // Jugadores que el usuario no puede usar en la jornada indicada (regla consecutiva)
  getBlockedPlayers: async (matchdayId: string): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase.rpc('get_blocked_players', {
      p_user_id:     user.id,
      p_matchday_id: matchdayId,
    })
    if (error) throw new Error(error.message)
    return (data as string[]) ?? []
  },
}
