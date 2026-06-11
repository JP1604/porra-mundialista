import { useAuth } from '@/contexts/AuthContext'
import { useLeaderboard, useRealtimeLeaderboard } from '@/hooks/useLeaderboard'
import { useMatchdays } from '@/hooks/useMatches'
import { LeaderboardTable, LeaderboardSkeleton } from '@/components/LeaderboardTable'
import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Leaderboard() {
  const { user } = useAuth()
  const { data: matchdays } = useMatchdays()
  const [matchdayId, setMatchdayId] = useState<string | undefined>(undefined)
  const { data: entries, isLoading } = useLeaderboard(matchdayId)

  useRealtimeLeaderboard()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center ring-1 ring-[#F59E0B]/20">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Clasificación</h1>
            <p className="text-xs text-slate-500">Ranking global de predicciones</p>
          </div>
        </div>

        {/* Filtro por jornada */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setMatchdayId(undefined)}
            className={cn('pill-filter', matchdayId === undefined && 'active-gold')}
          >
            Global
          </button>
          {(matchdays ?? []).map(md => (
            <button
              key={md.id}
              onClick={() => setMatchdayId(md.id)}
              className={cn('pill-filter', matchdayId === md.id && 'active-gold')}
            >
              J{md.number}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-600 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          <span className="text-[#F59E0B] font-medium">Exacto = 4 pts</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-blue-400 font-medium">Acierto = 2-3 pts</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00D084]" />
          <span className="text-[#00D084] font-medium">Bonus clave de gol</span>
        </span>
      </div>

      {isLoading ? (
        <LeaderboardSkeleton rows={10} />
      ) : (
        <LeaderboardTable
          entries={entries ?? []}
          currentUserId={user?.id ?? ''}
        />
      )}
    </div>
  )
}
