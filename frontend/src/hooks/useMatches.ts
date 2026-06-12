import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchesApi, type MatchFilters } from '@/api/matches'
import type { RegisterResultDto, RegisterEventDto } from '@/types'

export function useMatchdays() {
  return useQuery({
    queryKey: ['matchdays'],
    queryFn: () => matchesApi.listMatchdays(),
    staleTime: 5 * 60_000,
  })
}

export function useMatches(filters?: MatchFilters) {
  return useQuery({
    queryKey: ['matches', filters],
    queryFn: () => matchesApi.list(filters),
    staleTime: 60_000,
  })
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: ['match', id],
    queryFn: () => matchesApi.get(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useMatchEvents(matchId: string) {
  return useQuery({
    queryKey: ['match-events', matchId],
    queryFn: () => matchesApi.getEvents(matchId),
    staleTime: 30_000,
    enabled: !!matchId,
  })
}

export function useRegisterResult(matchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: RegisterResultDto) => matchesApi.registerResult(matchId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match', matchId] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}

export function useRegisterEvent(matchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: RegisterEventDto) => matchesApi.registerEvent(matchId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match', matchId] })
      qc.invalidateQueries({ queryKey: ['match-events', matchId] })
    },
  })
}

export function useDeleteEvent(matchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => matchesApi.deleteEvent(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match-events', matchId] })
    },
  })
}

export function useUpdateLiveScore(matchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ home, away }: { home: number; away: number }) =>
      matchesApi.updateLiveScore(matchId, home, away),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match', matchId] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}

export function useSetMatchStatus(matchId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: 'upcoming' | 'live' | 'finished') =>
      matchesApi.setStatus(matchId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match', matchId] })
      qc.invalidateQueries({ queryKey: ['matches'] })
    },
  })
}
