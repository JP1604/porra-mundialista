import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { predictionsApi } from '@/api/predictions'
import type { CreatePredictionDto, UpdatePredictionDto } from '@/types'
import { toast } from 'sonner'

export function useMyPredictions() {
  return useQuery({
    queryKey: ['predictions', 'me'],
    queryFn: () => predictionsApi.getMine(),
    staleTime: 30_000,
  })
}

export function useMatchPredictions(matchId: string) {
  return useQuery({
    queryKey: ['predictions', 'match', matchId],
    queryFn: () => predictionsApi.getByMatch(matchId),
    staleTime: 30_000,
    enabled: !!matchId,
  })
}

export function useCreatePrediction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePredictionDto) => predictionsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['predictions', 'me'] })
      toast.success('¡Predicción guardada!')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Error al guardar la predicción')
    },
  })
}

export function useUpdatePrediction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePredictionDto }) =>
      predictionsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['predictions', 'me'] })
      toast.success('Predicción actualizada')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Error al actualizar la predicción')
    },
  })
}
