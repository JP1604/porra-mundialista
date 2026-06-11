import { useQuery } from '@tanstack/react-query'
import { profilesApi } from '@/api/profiles'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profilesApi.getById(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}
