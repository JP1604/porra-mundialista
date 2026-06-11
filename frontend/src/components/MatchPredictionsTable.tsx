import { cn, getInitials } from '@/lib/utils'
import type { Prediction } from '@/types'
import { ScoreBadge } from './ScoreBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Lock } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface MatchPredictionsTableProps {
  predictions: Prediction[]
  isMatchdayOpen: boolean
  currentUserId?: string | null
  className?: string
}

export function MatchPredictionsTable({
  predictions,
  isMatchdayOpen,
  currentUserId,
  className,
}: MatchPredictionsTableProps) {
  if (isMatchdayOpen) {
    return (
      <div className={cn(
        'glass-card rounded-xl flex flex-col items-center justify-center gap-3 py-12 px-6 text-center',
        className
      )}>
        <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-600" />
        </div>
        <p className="text-slate-400 font-medium text-sm">
          Predicciones ocultas hasta el cierre de la jornada
        </p>
        <p className="text-xs text-slate-600 max-w-xs">
          Una vez que comience el primer partido, podrás ver aquí las predicciones de todos los participantes.
        </p>
      </div>
    )
  }

  if (predictions.length === 0) {
    return (
      <div className={cn('glass-card rounded-xl py-10 text-center text-slate-600 text-sm', className)}>
        Nadie hizo una predicción para este partido.
      </div>
    )
  }

  const sorted = [...predictions].sort(
    (a, b) => (b.total_score ?? -1) - (a.total_score ?? -1)
  )

  return (
    <div className={cn('rounded-xl overflow-hidden border border-white/[0.07]', className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.03]">
            <TableHead className="text-slate-600 text-[11px] uppercase tracking-wider font-semibold">Jugador</TableHead>
            <TableHead className="text-slate-600 text-[11px] uppercase tracking-wider font-semibold text-center">Predicción</TableHead>
            <TableHead className="text-slate-600 text-[11px] uppercase tracking-wider font-semibold text-center">Clave</TableHead>
            <TableHead className="text-slate-600 text-[11px] uppercase tracking-wider font-semibold text-right">Puntaje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((pred) => {
            const alias = pred.user_alias ?? pred.user_id.slice(0, 8)
            const isMe = currentUserId === pred.user_id
            return (
              <TableRow
                key={pred.id}
                className={cn(
                  'border-white/[0.05] transition-colors',
                  isMe ? 'bg-[#00D084]/[0.06] hover:bg-[#00D084]/[0.09]' : 'hover:bg-white/[0.02]'
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className={cn(
                        'text-[10px] font-bold',
                        isMe ? 'bg-[#00D084]/15 text-[#00D084]' : 'bg-white/[0.07] text-slate-400'
                      )}>
                        {getInitials(alias)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      'text-sm font-medium',
                      isMe ? 'text-[#00D084]' : 'text-slate-300'
                    )}>
                      {alias}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-black tabular-nums text-white text-base">
                  {pred.home_score}
                  <span className="text-slate-600 mx-1">–</span>
                  {pred.away_score}
                </TableCell>
                <TableCell className="text-center text-xs text-slate-500">
                  {pred.key_player_name}
                </TableCell>
                <TableCell className="text-right">
                  {pred.total_score !== null ? (
                    <ScoreBadge base={pred.base_score ?? 0} bonus={pred.bonus_score ?? 0} />
                  ) : (
                    <span className="text-xs text-slate-600">Pendiente</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
