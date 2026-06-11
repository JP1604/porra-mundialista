import { useState } from 'react'
import { useMatches, useMatchdays } from '@/hooks/useMatches'
import { MatchCard, MatchCardSkeleton } from '@/components/MatchCard'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Match, MatchStage } from '@/types'

const STAGES: { value: MatchStage | 'all'; label: string }[] = [
  { value: 'all',   label: 'Todo' },
  { value: 'group', label: 'Grupos' },
  { value: 'r32',   label: 'Ronda 32' },
  { value: 'r16',   label: 'Octavos' },
  { value: 'qf',    label: 'Cuartos' },
  { value: 'sf',    label: 'Semis' },
  { value: 'final', label: 'Final' },
]

export function Fixture() {
  const [stage, setStage] = useState<MatchStage | 'all'>('all')
  const { data: matches, isLoading } = useMatches(
    stage !== 'all' ? { stage } : undefined
  )
  const { data: matchdays } = useMatchdays()

  const grouped = (matchdays ?? []).map(md => ({
    matchday: md,
    matches: (matches ?? []).filter(m => m.matchday_id === md.id),
  })).filter(g => g.matches.length > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D084]/10 flex items-center justify-center ring-1 ring-[#00D084]/20">
            <Calendar className="w-5 h-5 text-[#00D084]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Fixture</h1>
            <p className="text-xs text-slate-500">Todos los partidos del torneo</p>
          </div>
        </div>

        {/* Stage filters */}
        <div className="flex gap-1.5 flex-wrap">
          {STAGES.map(s => (
            <button
              key={s.value}
              onClick={() => setStage(s.value)}
              className={cn('pill-filter', stage === s.value && 'active-green')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map(g => (
            <div key={g} className="space-y-3">
              <div className="h-5 w-40 bg-white/[0.06] rounded animate-pulse" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <MatchCardSkeleton key={i} />)}
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] bg-[#0F172A] py-16 text-center">
          <p className="text-slate-500 text-sm">No hay partidos para esta fase todavía.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ matchday, matches: mdMatches }) => (
            <section key={matchday.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-white">{matchday.label}</h2>
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                  matchday.is_open
                    ? 'text-[#00D084] bg-[#00D084]/10 border-[#00D084]/20'
                    : 'text-slate-600 bg-white/[0.03] border-white/[0.06]'
                )}>
                  {matchday.is_open ? '🟢 Abierta' : 'Cerrada'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mdMatches.map((match: Match) => (
                  <MatchCard key={match.id} match={match} matchday={matchday} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
