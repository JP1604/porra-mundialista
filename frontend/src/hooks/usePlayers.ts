import { useQuery } from '@tanstack/react-query'
import { playersApi } from '@/api/players'

/**
 * Sin argumentos → todos los jugadores.
 * Con `teams` (códigos TLA) → solo los de esas selecciones, consultados en el servidor.
 */
export function usePlayers(teams?: string[]) {
  const validTeams = teams?.filter(t => t && t !== 'TBD') ?? []

  return useQuery({
    queryKey: ['players', teams ? [...validTeams].sort().join(',') : 'all'],
    queryFn: () =>
      teams ? playersApi.getByTeams(validTeams) : playersApi.getAll(),
    enabled: !teams || validTeams.length > 0,
    staleTime: 10 * 60_000,
  })
}
