import { supabase } from '@/lib/supabase'
import type { Match, Matchday, RegisterResultDto, RegisterEventDto } from '@/types'

export interface MatchFilters {
  stage?: string
  matchday_id?: string
  status?: 'upcoming' | 'finished'
}

function toMatchday(row: Record<string, unknown>): Matchday {
  return {
    ...(row as Omit<Matchday, 'is_open'>),
    is_open: new Date(row.closes_at as string) > new Date(),
  } as Matchday
}

function toMatch(row: Match): Match {
  return {
    ...row,
    // Abierto si el partido aún no ha comenzado (independiente de la jornada)
    is_open: row.status === 'upcoming' && new Date(row.kickoff_at) > new Date(),
  }
}

export const matchesApi = {
  listMatchdays: async (): Promise<Matchday[]> => {
    const { data, error } = await supabase
      .from('matchdays')
      .select('*')
      .order('number')
    if (error) throw new Error(error.message)
    return (data as Record<string, unknown>[]).map(toMatchday)
  },

  list: async (filters?: MatchFilters): Promise<Match[]> => {
    let query = supabase
      .from('matches')
      .select('*')
      .order('kickoff_at')

    if (filters?.matchday_id) query = query.eq('matchday_id', filters.matchday_id)
    if (filters?.stage)       query = query.eq('stage', filters.stage)
    if (filters?.status)      query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data as Match[]).map(toMatch)
  },

  get: async (id: string): Promise<Match> => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return toMatch(data as Match)
  },

  // ── Admin ────────────────────────────────────────────────────

  /** Guardar resultado final y marcar como 'finished' */
  registerResult: async (id: string, dto: RegisterResultDto): Promise<Match> => {
    const { data, error } = await supabase
      .from('matches')
      .update({
        home_score: dto.home_score,
        away_score: dto.away_score,
        status: 'finished',
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Match
  },

  /** Actualizar marcador parcial en vivo (sin cambiar status) */
  updateLiveScore: async (id: string, homeScore: number, awayScore: number): Promise<void> => {
    const { error } = await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  /** Cambiar status del partido (upcoming → live → finished) */
  setStatus: async (id: string, status: 'upcoming' | 'live' | 'finished'): Promise<void> => {
    const { error } = await supabase
      .from('matches')
      .update({ status })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  registerEvent: async (id: string, dto: RegisterEventDto): Promise<void> => {
    const { error } = await supabase
      .from('match_events')
      .insert({
        match_id:   id,
        player_id:  dto.player_id,
        event_type: dto.event_type,
        minute:     dto.minute,
      })
    if (error) throw new Error(error.message)
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', eventId)
    if (error) throw new Error(error.message)
  },

  getEvents: async (matchId: string): Promise<import('@/types').MatchEvent[]> => {
    const { data, error } = await supabase
      .from('match_events')
      .select('id, match_id, player_id, event_type, minute, players(name)')
      .eq('match_id', matchId)
      .order('minute')
    if (error) throw new Error(error.message)
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id:          r.id as string,
      match_id:    r.match_id as string,
      player_id:   r.player_id as string,
      player_name: ((r.players as Record<string, unknown>)?.name as string) ?? '?',
      event_type:  r.event_type as import('@/types').EventType,
      minute:      r.minute as number | undefined,
    }))
  },

  calculateScores: async (matchId: string): Promise<void> => {
    const { error } = await supabase.rpc('calculate_match_scores', {
      p_match_id: matchId,
    })
    if (error) throw new Error(error.message)
  },
}
