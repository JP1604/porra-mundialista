import { supabase } from '@/lib/supabase'
import type { Player } from '@/types'

export const playersApi = {
  getAll: async (): Promise<Player[]> => {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, team, team_name, position')
      .order('name')
      .limit(2000)
    if (error) throw new Error(error.message)
    return (data ?? []) as Player[]
  },

  // Solo los jugadores de las selecciones indicadas (códigos TLA: 'MEX', 'RSA'…)
  getByTeams: async (teams: string[]): Promise<Player[]> => {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, team, team_name, position')
      .in('team', teams)
      .order('team')
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []) as Player[]
  },
}
