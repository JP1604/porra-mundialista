import { cn, getInitials } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Zap, Target, Star, Sparkles } from 'lucide-react'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId?: string | null
  limit?: number
  className?: string
  /** compact=true: fuerza 3 columnas (# | jugador | pts) para paneles pequeños */
  compact?: boolean
}

// Grid de 3 columnas para paneles pequeños (ej. sidebar del Home)
const GRID_COLS_COMPACT =
  'grid grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] gap-x-2 items-center px-3'

// Grid expandido para la página completa de Clasificación
const GRID_COLS_FULL =
  'grid grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] ' +
  'sm:grid-cols-[2.25rem_minmax(0,1fr)_3.5rem_4.5rem_4.5rem] ' +
  'md:grid-cols-[2.25rem_minmax(0,1fr)_3.5rem_4.5rem_4.5rem_4rem] ' +
  'gap-x-2 sm:gap-x-3 items-center px-3 sm:px-4'

const headerCell =
  'text-[11px] text-slate-500 dark:text-slate-500 font-semibold uppercase tracking-wider'

const RANK_CONFIG: Record<number, {
  badge: string
  row: string
  avatar: string
}> = {
  1: {
    badge: 'bg-[#FFD700] text-[#0A0E1A] shadow-[0_0_12px_rgba(255,215,0,0.4)]',
    row: 'border-l-[#FFD700]/50 bg-[#FFD700]/[0.04]',
    avatar: 'bg-[#FFD700]/20 text-[#FFD700]',
  },
  2: {
    badge: 'bg-slate-300 text-slate-900',
    row: 'border-l-slate-400/40 bg-slate-400/[0.03]',
    avatar: 'bg-slate-400/20 text-slate-300',
  },
  3: {
    badge: 'bg-amber-700 text-white',
    row: 'border-l-amber-700/50 bg-amber-900/[0.04]',
    avatar: 'bg-amber-700/20 text-amber-500',
  },
}

export function LeaderboardTable({
  entries,
  currentUserId,
  limit,
  className,
  compact = false,
}: LeaderboardTableProps) {
  const displayed = limit ? entries.slice(0, limit) : entries
  const GRID_COLS = compact ? GRID_COLS_COMPACT : GRID_COLS_FULL

  return (
    <div
      role="table"
      aria-label="Tabla de clasificación"
      className={cn('rounded-xl overflow-hidden border border-white/[0.07]', className)}
    >
      {/* Header */}
      <div role="row" className={cn(GRID_COLS, 'py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/[0.06]')}>
        <span role="columnheader" className={cn(headerCell, 'text-center')}>#</span>
        <span role="columnheader" className={headerCell}>Jugador</span>
        <span role="columnheader" className={cn(headerCell, 'flex items-center justify-end gap-1')}>
          <Zap className="w-3 h-3" aria-hidden /> Pts
        </span>
        {!compact && <>
          <span role="columnheader" className={cn(headerCell, 'hidden sm:flex items-center justify-end gap-1')}>
            <Target className="w-3 h-3" aria-hidden /> Exactos
          </span>
          <span role="columnheader" className={cn(headerCell, 'hidden sm:flex items-center justify-end gap-1')}>
            <Star className="w-3 h-3" aria-hidden /> Aciertos
          </span>
          <span role="columnheader" className={cn(headerCell, 'hidden md:flex items-center justify-end gap-1')}>
            <Sparkles className="w-3 h-3" aria-hidden /> Bonus
          </span>
        </>}
      </div>

      {/* Rows */}
      {displayed.map((entry) => {
        const rankCfg = RANK_CONFIG[entry.rank]
        const isMe = currentUserId === entry.user_id
        return (
          <div
            key={entry.user_id}
            role="row"
            className={cn(
              GRID_COLS,
              'py-3 border-b border-slate-100 dark:border-white/[0.05] last:border-0',
              'border-l-2 border-l-transparent transition-colors duration-150',
              rankCfg?.row,
              isMe && !rankCfg && 'bg-[#00D084]/[0.05] border-l-[#00D084]/50',
              !isMe && !rankCfg && 'hover:bg-slate-50 dark:hover:bg-white/[0.02]',
            )}
          >
            {/* Rank */}
            <div role="cell" className="flex items-center justify-center">
              {rankCfg ? (
                <span className={cn(
                  'text-xs font-black h-6 w-6 flex items-center justify-center rounded-full',
                  rankCfg.badge
                )}>
                  {entry.rank}
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 font-mono text-sm tabular-nums">{entry.rank}</span>
              )}
            </div>

            {/* Avatar + alias */}
            <div role="cell" className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className={cn(
                  'text-[10px] font-bold',
                  rankCfg?.avatar ?? (isMe ? 'bg-[#00D084]/15 text-[#00D084]' : 'bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400')
                )}>
                  {getInitials(entry.alias)}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                'text-sm font-semibold truncate',
                isMe ? 'text-[#00D084]' : entry.rank <= 3 ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
              )}>
                {entry.alias}
                {isMe && <span className="text-xs text-slate-500 font-normal ml-1">(tú)</span>}
              </span>
            </div>

            {/* Puntos totales */}
            <span role="cell" className={cn(
              'text-right font-black text-base tabular-nums',
              entry.rank === 1 ? 'text-[#FFD700]' : 'text-slate-900 dark:text-white'
            )}>
              {entry.total_points}
            </span>

            {/* Exactos, Aciertos, Bonus — solo en modo expandido */}
            {!compact && <>
              <span role="cell" className="text-right text-sm tabular-nums text-[#F59E0B] font-semibold hidden sm:block">
                {entry.exact_scores}
              </span>
              <span role="cell" className="text-right text-sm tabular-nums text-blue-400 font-semibold hidden sm:block">
                {entry.correct_results}
              </span>
              <span role="cell" className="text-right text-sm tabular-nums text-slate-500 hidden md:block">
                +{entry.total_bonus}
              </span>
            </>}
          </div>
        )
      })}

      {displayed.length === 0 && (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
          Aún no hay resultados registrados.
        </div>
      )}
    </div>
  )
}

export function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.07]">
      <div className="h-10 bg-white/[0.03] border-b border-white/[0.06]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-0">
          <Skeleton className="w-6 h-6 rounded-full bg-white/[0.06]" />
          <Skeleton className="w-7 h-7 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-4 flex-1 max-w-[120px] bg-white/[0.06]" />
          <Skeleton className="h-4 w-8 ml-auto bg-white/[0.06]" />
        </div>
      ))}
    </div>
  )
}
