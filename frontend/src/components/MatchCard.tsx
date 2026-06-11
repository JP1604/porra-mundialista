import { Link } from 'react-router-dom'
import { cn, getFlagUrl, formatKickoff } from '@/lib/utils'
import type { Match, Matchday } from '@/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface MatchCardProps {
  match: Match
  matchday?: Matchday
  userPrediction?: { home: number; away: number } | null
  className?: string
}

function StatusBadge({ status }: { status: Match['status'] }) {
  if (status === 'finished') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/[0.06]">
        Finalizado
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D084] bg-[#00D084]/10 px-2 py-0.5 rounded-full border border-[#00D084]/20">
      Próximo
    </span>
  )
}

export function MatchCard({ match, matchday, userPrediction, className }: MatchCardProps) {
  const isOpen = matchday?.is_open ?? false

  return (
    <div className={cn(
      'glass-card rounded-xl p-4 flex flex-col gap-3 group transition-all duration-200',
      className
    )}>
      {/* Header: fecha + estado */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-medium">
          {formatKickoff(match.kickoff_at)}
        </span>
        <StatusBadge status={match.status} />
      </div>

      {/* Equipos y marcador */}
      <div className="flex items-center justify-between gap-2 py-1">
        {/* Equipo local */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <img
              src={getFlagUrl(match.home_team)}
              alt={match.home_team_name}
              className="w-12 h-8 object-cover rounded-md shadow-md border border-white/10"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight truncate w-full">
            {match.home_team_name}
          </span>
        </div>

        {/* Marcador */}
        <div className="flex flex-col items-center gap-1 shrink-0 px-3">
          {match.status === 'finished' ? (
            <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {match.home_score ?? 0}
              <span className="text-slate-400 mx-1">–</span>
              {match.away_score ?? 0}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-black text-xl tracking-tight">VS</span>
          )}
          {match.group_name && (
            <span className="text-[10px] text-slate-600 font-medium">Grupo {match.group_name}</span>
          )}
        </div>

        {/* Equipo visitante */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <img
              src={getFlagUrl(match.away_team)}
              alt={match.away_team_name}
              className="w-12 h-8 object-cover rounded-md shadow-md border border-white/10"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight truncate w-full">
            {match.away_team_name}
          </span>
        </div>
      </div>

      {/* Predicción del usuario */}
      {userPrediction && (
        <div className="flex items-center justify-center gap-2 bg-[#00D084]/8 rounded-lg py-2 px-3 border border-[#00D084]/15">
          <span className="text-[11px] text-slate-500">Tu predicción:</span>
          <span className="text-sm font-black text-[#00D084] tabular-nums">
            {userPrediction.home} – {userPrediction.away}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.05]">
        {match.venue && (
          <span className="text-[10px] text-slate-500 truncate">{match.venue}</span>
        )}
        <div className="ml-auto flex gap-2 shrink-0">
          <Link to={`/match/${match.id}`}>
            <Button variant="ghost" size="sm" className="text-xs h-8 px-3 text-slate-500 hover:text-white hover:bg-white/5">
              Ver detalles
            </Button>
          </Link>
          {isOpen && !userPrediction && (
            <Link to="/porra">
              <Button size="sm" className="text-xs h-8 px-3.5 bg-[#00D084] hover:bg-[#00b872] text-[#070C18] font-bold shadow-[0_0_12px_rgba(0,208,132,0.25)]">
                Predecir
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28 bg-white/[0.05]" />
        <Skeleton className="h-5 w-16 bg-white/[0.05] rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-4 py-1">
        <Skeleton className="h-16 flex-1 bg-white/[0.05] rounded-lg" />
        <Skeleton className="h-10 w-14 bg-white/[0.05] rounded-lg" />
        <Skeleton className="h-16 flex-1 bg-white/[0.05] rounded-lg" />
      </div>
      <Skeleton className="h-7 w-full bg-white/[0.05] rounded-lg" />
    </div>
  )
}
