import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useMatches } from '@/hooks/useMatches'
import { useMatchdays } from '@/hooks/useMatches'
import { useLeaderboard, useRealtimeLeaderboard } from '@/hooks/useLeaderboard'
import { MatchCard, MatchCardSkeleton } from '@/components/MatchCard'
import { LeaderboardTable, LeaderboardSkeleton } from '@/components/LeaderboardTable'
import { Button } from '@/components/ui/button'
import { ChevronRight, Trophy, Zap } from 'lucide-react'

export function Home() {
  const { user } = useAuth()

  const { data: allMatches, isLoading: loadingMatches } = useMatches()
  const { data: matchdays } = useMatchdays()
  const { data: leaderboard, isLoading: loadingLb } = useLeaderboard()

  useRealtimeLeaderboard()

  const featured = (allMatches ?? [])
    .filter(m => m.status === 'upcoming')
    .slice(0, 6)

  const matchdayById = new Map((matchdays ?? []).map(md => [md.id, md]))

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative rounded-2xl overflow-hidden glass-card">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,208,132,0.13)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_90%_50%,rgba(245,158,11,0.06)_0%,transparent_70%)]" />

        <div className="relative px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="space-y-5 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-widest bg-[#F59E0B]/10 px-3 py-1 rounded-full border border-[#F59E0B]/20">
                ⚽ Mundial 2026
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              <span className="text-[#4B9EFF]">USA</span>
              <span className="text-white/20 mx-2">·</span>
              <span className="text-[#FF6B6B]">Canadá</span>
              <span className="text-white/20 mx-2">·</span>
              <span className="text-[#00D084]">México</span>{' '}
              <span className="gradient-text-gold">2026</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-md leading-relaxed">
              Predice los marcadores, elige tu clave de gol y compite con tus amigos en la porra del Mundial.
            </p>
            {!user && (
              <Link to="/login">
                <Button className="mt-1 bg-[#00D084] hover:bg-[#00b872] text-[#070C18] font-bold px-8 py-2.5 text-base shadow-[0_0_24px_rgba(0,208,132,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,208,132,0.4)]">
                  Unirse a la porra
                </Button>
              </Link>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-center gap-2 shrink-0">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#F59E0B]/20 blur-2xl scale-150" />
              <Trophy className="relative w-28 h-28 text-[#F59E0B]" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2 columnas: partidos + clasificación ──────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 items-start">

        {/* Partidos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#00D084]/15 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-[#00D084]" />
              </span>
              Próximos partidos
            </h2>
            <Link to="/fixture">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 text-xs">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {loadingMatches ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4].map(i => <MatchCardSkeleton key={i} />)}
            </div>
          ) : featured.length === 0 ? (
            <div className="rounded-xl glass-card py-14 text-center">
              <p className="text-slate-500 text-sm">No hay partidos próximos disponibles.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featured.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  matchday={matchdayById.get(match.matchday_id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Clasificación */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#F59E0B]/15 flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" />
              </span>
              Clasificación
            </h2>
            <Link to="/leaderboard">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 text-xs">
                Ver completa <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {loadingLb ? (
            <LeaderboardSkeleton rows={5} />
          ) : (
            <LeaderboardTable
              entries={leaderboard ?? []}
              currentUserId={user?.id}
              limit={5}
              compact
            />
          )}
        </section>

      </div>
    </div>
  )
}
