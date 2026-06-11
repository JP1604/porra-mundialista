import { cn } from '@/lib/utils'
import { useCountdown } from '@/hooks/useCountdown'
import { Lock, Timer } from 'lucide-react'

interface CountdownTimerProps {
  closesAt: string
  className?: string
  compact?: boolean
}

export function CountdownTimer({ closesAt, className, compact = false }: CountdownTimerProps) {
  const { days, hours, minutes, seconds, isExpired, isUrgent } = useCountdown(closesAt)

  if (isExpired) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-slate-600 text-xs font-medium', className)}>
        <Lock className="w-3 h-3" />
        Jornada cerrada
      </span>
    )
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  if (compact) {
    const display = days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    return (
      <span className={cn(
        'font-mono font-bold text-xs tabular-nums px-2 py-0.5 rounded-full border',
        isUrgent
          ? 'text-red-400 bg-red-950/30 border-red-800/40 animate-pulse'
          : 'text-[#00D084] bg-[#00D084]/8 border-[#00D084]/20',
        className
      )}>
        ⏱ {display}
      </span>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Timer className={cn('w-4 h-4 shrink-0', isUrgent ? 'text-red-400' : 'text-[#00D084]')} />
      <span className={cn(
        'text-sm font-medium',
        isUrgent ? 'text-red-400' : 'text-slate-400'
      )}>
        {days > 0 && <span>Cierra en <strong className="text-white">{days}d {pad(hours)}h {pad(minutes)}m</strong></span>}
        {days === 0 && <span>Cierra en <strong className="text-white">{pad(hours)}:{pad(minutes)}:{pad(seconds)}</strong></span>}
      </span>
    </div>
  )
}
