import { useEffect, useState, useMemo } from 'react'
import { useMatches, useMatchdays } from '@/hooks/useMatches'
import { useMyPredictions, useCreatePrediction, useUpdatePrediction } from '@/hooks/usePredictions'
import { usePlayers } from '@/hooks/usePlayers'
import { PredictionForm } from '@/components/PredictionForm'
import { ScoreBadge } from '@/components/ScoreBadge'
import { CountdownTimer } from '@/components/CountdownTimer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, getFlagUrl } from '@/lib/utils'
import { ClipboardList, Lock, Pencil, Plus } from 'lucide-react'
import type { Match, Matchday, Prediction, CreatePredictionDto, UpdatePredictionDto } from '@/types'
import { predictionsApi } from '@/api/predictions'

export function Porra() {
  const { data: matches, isLoading: loadingMatches } = useMatches()
  const { data: matchdays, isLoading: loadingMatchdays } = useMatchdays()
  const { data: myPredictions, isLoading: loadingPred } = useMyPredictions()
  const createPrediction = useCreatePrediction()
  const updatePrediction = useUpdatePrediction()

  const [selectedMatch, setSelectedMatch] = useState<{ match: Match; matchday: Matchday } | null>(null)
  const [blockedPlayerIds, setBlockedPlayerIds] = useState<string[]>([])

  const { data: players = [] } = usePlayers(
    selectedMatch
      ? [selectedMatch.match.home_team, selectedMatch.match.away_team]
      : []
  )

  useEffect(() => {
    if (!selectedMatch) { setBlockedPlayerIds([]); return }
    predictionsApi.getBlockedPlayers(selectedMatch.matchday.id)
      .then(ids => setBlockedPlayerIds(ids))
      .catch(() => setBlockedPlayerIds([]))
  }, [selectedMatch?.matchday.id])

  const predByMatchId = useMemo(() => {
    const map = new Map<string, Prediction>()
    myPredictions?.forEach(p => map.set(p.match_id, p))
    return map
  }, [myPredictions])

  function handleSave(dto: CreatePredictionDto | { id: string; dto: UpdatePredictionDto }) {
    if ('id' in dto) {
      updatePrediction.mutate(dto)
    } else {
      createPrediction.mutate(dto)
    }
    setSelectedMatch(null)
  }

  if (loadingMatches || loadingMatchdays || loadingPred) {
    return (
      <div className="space-y-8">
        {[1, 2].map(g => (
          <div key={g} className="space-y-3">
            <Skeleton className="h-5 w-48 bg-white/[0.06]" />
            {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full bg-white/[0.06] rounded-xl" />)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00D084]/10 flex items-center justify-center ring-1 ring-[#00D084]/20">
          <ClipboardList className="w-5 h-5 text-[#00D084]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Mi Porra</h1>
          <p className="text-xs text-slate-500">Gestiona tus predicciones por jornada</p>
        </div>
      </div>

      {(matchdays ?? []).map(matchday => {
        const mdMatches = matches?.filter(m => m.matchday_id === matchday.id) ?? []
        if (mdMatches.length === 0) return null

        const predCount = mdMatches.filter(m => predByMatchId.has(m.id)).length
        // La jornada se muestra como "abierta" si al menos un partido aún no ha comenzado
        const anyMatchOpen = mdMatches.some(m => m.is_open)

        return (
          <section key={matchday.id} className="space-y-2">
            {/* Matchday header */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h2 className="text-sm font-bold text-white">{matchday.label}</h2>
              {anyMatchOpen ? (
                <CountdownTimer closesAt={matchday.closes_at} compact />
              ) : (
                <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                  <Lock className="w-2.5 h-2.5" /> Cerrada
                </span>
              )}
              <span className="ml-auto text-[11px] text-slate-600 font-medium">
                {predCount}/{mdMatches.length} predicciones
              </span>
            </div>

            {/* Match rows */}
            <div className="space-y-1.5">
              {mdMatches.map(match => {
                const pred = predByMatchId.get(match.id)
                const isFinished = match.status === 'finished'

                return (
                  <div
                    key={match.id}
                    className={cn(
                      'glass-card rounded-xl px-4 py-3 flex items-center gap-4 transition-all duration-150',
                      pred && 'border-l-2 border-l-[#00D084]/40',
                      !pred && match.is_open && 'hover:bg-[#111f38] border-l-2 border-l-transparent',
                    )}
                  >
                    {/* Flags */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                      <img
                        src={getFlagUrl(match.home_team)}
                        alt={match.home_team_name}
                        className="w-7 h-5 object-cover rounded border border-white/10"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <img
                        src={getFlagUrl(match.away_team)}
                        alt={match.away_team_name}
                        className="w-7 h-5 object-cover rounded border border-white/10"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>

                    {/* Match info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {match.home_team_name}
                        <span className="text-slate-600 mx-1.5">vs</span>
                        {match.away_team_name}
                      </p>
                      {isFinished && (
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          Resultado final: <span className="text-white font-bold">{match.home_score} – {match.away_score}</span>
                        </p>
                      )}
                    </div>

                    {/* Right side */}
                    {pred ? (
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black text-[#00D084] tabular-nums">
                            {pred.home_score} – {pred.away_score}
                          </p>
                          {pred.key_player_name && (
                            <p className="text-[11px] text-slate-600 truncate max-w-[100px]">{pred.key_player_name}</p>
                          )}
                        </div>
                        {pred.total_score !== null && (
                          <ScoreBadge base={pred.base_score ?? 0} bonus={pred.bonus_score ?? 0} />
                        )}
                        {match.is_open && (
                          <button
                            onClick={() => setSelectedMatch({ match, matchday })}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#00D084] transition-colors"
                          >
                            <Pencil className="w-3 h-3" /> Editar
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        disabled={!match.is_open}
                        onClick={() => match.is_open && setSelectedMatch({ match, matchday })}
                        className={cn(
                          'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all shrink-0',
                          match.is_open
                            ? 'bg-[#00D084] text-[#070C18] hover:bg-[#00b872] shadow-[0_0_12px_rgba(0,208,132,0.2)]'
                            : 'bg-white/[0.04] text-slate-600 cursor-not-allowed border border-white/[0.06]'
                        )}
                      >
                        {match.is_open ? (
                          <><Plus className="w-3.5 h-3.5" /> Predecir</>
                        ) : (
                          <><Lock className="w-3 h-3" /> Cerrado</>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={open => !open && setSelectedMatch(null)}>
        <DialogContent className="bg-[#0F172A] border-white/[0.09] text-white max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-slate-400 font-normal text-sm">Predice:</span>
              {selectedMatch?.match.home_team_name} vs {selectedMatch?.match.away_team_name}
            </DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <PredictionForm
              match={selectedMatch.match}
              matchday={selectedMatch.matchday}
              players={players}
              existingPrediction={predByMatchId.get(selectedMatch.match.id) ?? null}
              blockedPlayerIds={blockedPlayerIds}
              onSave={handleSave}
              isSaving={createPrediction.isPending || updatePrediction.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
