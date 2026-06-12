import { useAuth } from '@/contexts/AuthContext'
import { useLeaderboard, useRealtimeLeaderboard } from '@/hooks/useLeaderboard'
import { useMatchdays } from '@/hooks/useMatches'
import { LeaderboardTable, LeaderboardSkeleton } from '@/components/LeaderboardTable'
import { useState } from 'react'
import { Trophy, HelpCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ─── Modal de criterios de puntuación ────────────────────────
function ScoreRulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-[#0F172A] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
            Criterios de puntuación
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 text-xs">
          {/* Marcador */}
          <div className="space-y-2.5">
            <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Por marcador</p>
            {[
              { pts: '4 pts', desc: 'Marcador exacto',               ex: 'predice 2-0 → 2-0' },
              { pts: '3 pts', desc: 'Mismo ganador + diferencia',    ex: 'predice 4-2 → 2-0' },
              { pts: '2 pts', desc: 'Mismo ganador',                 ex: 'predice 2-1 → 2-0' },
              { pts: '1 pt',  desc: 'Misma diferencia de goles',     ex: 'predice 0-1 → 1-0' },
              { pts: '0 pts', desc: 'Ninguna coincidencia',          ex: '' },
            ].map(r => (
              <div key={r.pts} className="flex items-start gap-2">
                <span className="font-black text-[#F59E0B] w-10 shrink-0">{r.pts}</span>
                <span className="text-slate-400">
                  {r.desc}
                  {r.ex && <span className="text-slate-600 text-[10px] ml-1">({r.ex})</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Bonus */}
          <div className="space-y-2.5">
            <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Bonus clave de gol</p>
            {[
              { pts: '+3 pts', desc: 'Gol normal',           icon: '⚽' },
              { pts: '+2 pts', desc: 'Gol de penal',         icon: '🎯' },
              { pts: '+1 pt',  desc: 'Asistencia',           icon: '🅰️' },
              { pts: '+1 pt',  desc: 'MOTM (MVP del partido)', icon: '⭐' },
            ].map(r => (
              <div key={r.pts + r.desc} className="flex items-center gap-2">
                <span className="text-sm w-6 text-center">{r.icon}</span>
                <span className="font-black text-[#00D084] w-10 shrink-0">{r.pts}</span>
                <span className="text-slate-400">{r.desc}</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-600 pt-1">
              Un jugador puede acumular varios bonus en el mismo partido.
            </p>
          </div>
        </div>

        {/* Nota */}
        <p className="text-[10px] text-slate-600 border-t border-white/[0.06] pt-3">
          El bonus aplica solo si el jugador fue elegido como <span className="text-slate-500 font-semibold">clave de gol</span> en tu predicción antes del cierre del partido.
        </p>
      </div>
    </div>
  )
}

export function Leaderboard() {
  const { user } = useAuth()
  const { data: matchdays } = useMatchdays()
  const [matchdayId, setMatchdayId] = useState<string | undefined>(undefined)
  const { data: entries, isLoading } = useLeaderboard(matchdayId)
  const [rulesOpen, setRulesOpen] = useState(false)

  useRealtimeLeaderboard()

  return (
    <div className="space-y-6 animate-fade-in">
      <ScoreRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

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

        <div className="flex items-center gap-3 flex-wrap">
          {/* Botón criterios */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRulesOpen(true)}
            className="border-white/[0.1] text-slate-400 hover:text-white hover:bg-white/[0.05] text-xs gap-1.5 bg-transparent"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            ¿Cómo se puntúa?
          </Button>

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
