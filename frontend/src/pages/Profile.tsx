import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useMyPredictions } from '@/hooks/usePredictions'
import { useMatches } from '@/hooks/useMatches'
import { ScoreBadge } from '@/components/ScoreBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials, getFlagUrl } from '@/lib/utils'
import { ChevronLeft, Star, Target, Zap } from 'lucide-react'

export function Profile() {
  const { userId } = useParams<{ userId: string }>()
  const { user, profile: myProfile } = useAuth()
  const isMe = user?.id === userId || userId === 'user-me'
  const { data: fetchedProfile } = useProfile(isMe ? undefined : userId)
  const alias = isMe
    ? (myProfile?.alias ?? 'Usuario')
    : (fetchedProfile?.alias ?? 'Usuario')

  const { data: predictions, isLoading: loadingPred } = useMyPredictions()
  const { data: matches, isLoading: loadingMatches } = useMatches()

  const totalPoints = predictions?.reduce((acc, p) => acc + (p.total_score ?? 0), 0) ?? 0
  const exactCount  = predictions?.filter(p => p.base_score === 4).length ?? 0
  const correctCount = predictions?.filter(p => (p.base_score ?? 0) >= 2 && p.base_score !== 4).length ?? 0

  if (loadingPred || loadingMatches) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full bg-white/[0.06] rounded-2xl" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full bg-white/[0.06] rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white -ml-2 gap-1 hover:bg-white/5">
          <ChevronLeft className="w-4 h-4" /> Inicio
        </Button>
      </Link>

      {/* Profile header */}
      <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
        <Avatar className="w-16 h-16 shrink-0">
          <AvatarFallback className="bg-[#00D084]/15 text-[#00D084] font-bold text-xl">
            {getInitials(alias)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white">
            {alias}{' '}
            {isMe && <span className="text-sm text-slate-500 font-normal">(tú)</span>}
          </h1>
          <div className="flex gap-5 mt-3 text-sm flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <strong className="text-[#F59E0B]">{totalPoints}</strong>
              <span className="text-slate-600">pts</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <Target className="w-3.5 h-3.5 text-[#00D084]" />
              <strong className="text-[#00D084]">{exactCount}</strong>
              <span className="text-slate-600">exactos</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <Star className="w-3.5 h-3.5 text-blue-400" />
              <strong className="text-blue-400">{correctCount}</strong>
              <span className="text-slate-600">aciertos</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="text-slate-600">{predictions?.length ?? 0}</span>
              <span className="text-slate-600">predicciones</span>
            </span>
          </div>
        </div>
      </div>

      {/* Prediction history */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Historial de predicciones</h2>
        {predictions?.length === 0 && (
          <div className="rounded-xl border border-white/[0.07] bg-[#0F172A] py-12 text-center">
            <p className="text-slate-600 text-sm">Aún no hay predicciones registradas.</p>
          </div>
        )}
        <div className="space-y-1.5">
          {predictions?.map(pred => {
            const match = matches?.find(m => m.id === pred.match_id)
            if (!match) return null
            return (
              <Link key={pred.id} to={`/match/${match.id}`} className="block">
                <div className="glass-card-hover rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <img src={getFlagUrl(match.home_team, '32x24')} alt="" className="w-6 h-4 object-cover rounded-sm border border-white/10" />
                    <span className="text-xs text-slate-600">vs</span>
                    <img src={getFlagUrl(match.away_team, '32x24')} alt="" className="w-6 h-4 object-cover rounded-sm border border-white/10" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {match.home_team_name} vs {match.away_team_name}
                    </p>
                    <p className="text-xs text-slate-600">
                      Clave: {pred.key_player_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#00D084] tabular-nums">
                      {pred.home_score} – {pred.away_score}
                    </p>
                    {match.home_score !== null && (
                      <p className="text-xs text-slate-600">
                        Real: {match.home_score} – {match.away_score}
                      </p>
                    )}
                  </div>
                  {pred.total_score !== null ? (
                    <ScoreBadge base={pred.base_score ?? 0} bonus={pred.bonus_score ?? 0} showTooltip={false} />
                  ) : (
                    <span className="text-xs text-slate-600 w-12 text-right">–</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
