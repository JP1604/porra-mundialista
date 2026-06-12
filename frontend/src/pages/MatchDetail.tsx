import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useMatch, useMatchdays, useMatchEvents } from '@/hooks/useMatches'
import { useMatchPredictions } from '@/hooks/usePredictions'
import { MatchPredictionsTable } from '@/components/MatchPredictionsTable'
import { CountdownTimer } from '@/components/CountdownTimer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getFlagUrl, formatKickoff, cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'
import type { EventType, MatchEvent } from '@/types'

const EVENT_LABEL: Record<EventType, { icon: string; label: string; color: string }> = {
  goal:    { icon: '⚽', label: 'Gol',        color: 'text-green-400' },
  penalty: { icon: '🎯', label: 'Penal',      color: 'text-blue-400'  },
  assist:  { icon: '🅰️',  label: 'Asistencia', color: 'text-sky-400'   },
  motm:    { icon: '⭐', label: 'MOTM',       color: 'text-yellow-400' },
}

export function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: match, isLoading: loadingMatch, error } = useMatch(id ?? '')
  const { data: predictions, isLoading: loadingPred } = useMatchPredictions(id ?? '')
  const { data: matchdays } = useMatchdays()
  const { data: events = [] } = useMatchEvents(id ?? '')

  if (loadingMatch) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/[0.06]" />
        <Skeleton className="h-40 w-full bg-white/[0.06] rounded-xl" />
        <Skeleton className="h-64 w-full bg-white/[0.06] rounded-xl" />
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-slate-500">Partido no encontrado.</p>
        <Link to="/fixture">
          <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">
            Volver al fixture
          </Button>
        </Link>
      </div>
    )
  }

  const matchday = matchdays?.find(md => md.id === match.matchday_id)
  const isOpen = matchday?.is_open ?? false
  const isLive = match.status === 'live'

  // Agrupar eventos por tipo para mostrarlos ordenados
  const goals    = events.filter((e: MatchEvent) => e.event_type === 'goal' || e.event_type === 'penalty')
  const assists  = events.filter((e: MatchEvent) => e.event_type === 'assist')
  const motmList = events.filter((e: MatchEvent) => e.event_type === 'motm')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Link to="/fixture">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white -ml-2 gap-1 hover:bg-white/5">
          <ChevronLeft className="w-4 h-4" /> Fixture
        </Button>
      </Link>

      {/* Match header */}
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
        <div className={cn(
          'absolute inset-0',
          isLive
            ? 'bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(239,68,68,0.08)_0%,transparent_70%)]'
            : 'bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(0,208,132,0.06)_0%,transparent_70%)]'
        )} />

        <div className="relative">
          <div className="text-xs text-slate-600 text-center mb-6 font-medium">
            {matchday?.label} &middot; {formatKickoff(match.kickoff_at)}
            {match.venue && <> &middot; {match.venue}</>}
          </div>

          <div className="flex items-center justify-around gap-6">
            <div className="flex flex-col items-center gap-3 flex-1">
              <img
                src={getFlagUrl(match.home_team, '160x120')}
                alt={match.home_team_name}
                className="w-20 h-14 object-cover rounded-lg shadow-lg border border-white/10"
              />
              <span className="font-bold text-white text-center text-sm">{match.home_team_name}</span>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              {match.status !== 'upcoming' ? (
                <span className="text-5xl font-black text-white tabular-nums tracking-tight">
                  {match.home_score}
                  <span className="text-slate-600 mx-2">–</span>
                  {match.away_score}
                </span>
              ) : (
                <>
                  <span className="text-4xl font-black text-slate-600">VS</span>
                  {matchday && <CountdownTimer closesAt={matchday.closes_at} compact />}
                </>
              )}

              {/* Badge de estado */}
              {isLive ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  EN VIVO
                </span>
              ) : (
                <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 px-2.5 py-0.5 rounded-full border ${
                  match.status === 'finished'
                    ? 'text-slate-600 bg-white/[0.04] border-white/[0.06]'
                    : 'text-[#00D084] bg-[#00D084]/10 border-[#00D084]/20'
                }`}>
                  {match.status === 'finished' ? 'Finalizado' : 'Próximo'}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 flex-1">
              <img
                src={getFlagUrl(match.away_team, '160x120')}
                alt={match.away_team_name}
                className="w-20 h-14 object-cover rounded-lg shadow-lg border border-white/10"
              />
              <span className="font-bold text-white text-center text-sm">{match.away_team_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Eventos del partido (goles, asistencias, MOTM) */}
      {events.length > 0 && (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Eventos del partido
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* Goles */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                ⚽ Goles {goals.length > 0 && <span className="text-slate-500">({goals.length})</span>}
              </p>
              {goals.length === 0
                ? <p className="text-xs text-slate-700">—</p>
                : goals.map((ev: MatchEvent) => (
                  <div key={ev.id} className="flex items-center gap-2 text-sm">
                    <span>{EVENT_LABEL[ev.event_type].icon}</span>
                    <span className="font-semibold text-white">{ev.player_name}</span>
                    {ev.minute && <span className="text-xs text-slate-600">{ev.minute}'</span>}
                    {ev.event_type === 'penalty' && (
                      <span className="text-[10px] text-blue-400 font-medium">(P)</span>
                    )}
                  </div>
                ))
              }
            </div>

            {/* Asistencias */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                🅰️ Asistencias {assists.length > 0 && <span className="text-slate-500">({assists.length})</span>}
              </p>
              {assists.length === 0
                ? <p className="text-xs text-slate-700">—</p>
                : assists.map((ev: MatchEvent) => (
                  <div key={ev.id} className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-sky-400">{ev.player_name}</span>
                    {ev.minute && <span className="text-xs text-slate-600">{ev.minute}'</span>}
                  </div>
                ))
              }
            </div>

            {/* MOTM */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                ⭐ MOTM
              </p>
              {motmList.length === 0
                ? <p className="text-xs text-slate-700">—</p>
                : motmList.map((ev: MatchEvent) => (
                  <div key={ev.id} className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-yellow-400">{ev.player_name}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Predictions */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Predicciones de los participantes
        </h2>
        {loadingPred ? (
          <Skeleton className="h-48 w-full bg-white/[0.06] rounded-xl" />
        ) : (
          <MatchPredictionsTable
            predictions={predictions ?? []}
            isMatchdayOpen={isOpen}
            currentUserId={user?.id ?? 'user-me'}
          />
        )}
      </section>

      {isOpen && (
        <div className="text-center pt-2">
          <Link to="/porra">
            <Button className="bg-[#00D084] hover:bg-[#00b872] text-[#070C18] font-bold px-6 shadow-[0_0_20px_rgba(0,208,132,0.25)]">
              Hacer mi predicción
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
