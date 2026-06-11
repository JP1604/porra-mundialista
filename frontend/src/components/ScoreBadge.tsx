import { cn, getScoreLabel, getBonusLabels } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ScoreBadgeProps {
  base: number
  bonus?: number
  className?: string
  showTooltip?: boolean
  bonusDetail?: {
    goal?: boolean
    penalty?: boolean
    assist?: boolean
    motm?: boolean
  }
}

const SCORE_STYLES: Record<number, string> = {
  4: 'bg-[#F59E0B] text-[#070C18]',
  3: 'bg-[#00D084] text-[#070C18]',
  2: 'bg-blue-500 text-white',
  1: 'bg-slate-600 text-white',
  0: 'bg-red-950/80 text-red-400 border border-red-800/40',
}

export function ScoreBadge({
  base,
  bonus = 0,
  className,
  showTooltip = true,
  bonusDetail,
}: ScoreBadgeProps) {
  const total = base + bonus
  const style = SCORE_STYLES[base as keyof typeof SCORE_STYLES] ?? SCORE_STYLES[0]

  const badge = (
    <span className={cn(
      'inline-flex items-baseline gap-1 rounded-md px-2 py-0.5 text-sm font-bold tabular-nums',
      style,
      className
    )}>
      {bonus > 0 ? (
        <>
          <span>{base}</span>
          <span className="text-xs font-medium opacity-75">+{bonus}</span>
          <span className="text-xs opacity-60">= {total}</span>
        </>
      ) : (
        <span>{base} pts</span>
      )}
    </span>
  )

  if (!showTooltip) return badge

  const bonusLines = bonusDetail ? getBonusLabels(bonusDetail) : []

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="bg-[#0F172A] border-white/[0.09] text-slate-200 shadow-xl max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-white">{getScoreLabel(base)} — {base} pts</p>
          {bonusLines.length > 0 && (
            <>
              <p className="text-slate-500 font-medium mt-1">Bonus clave de gol:</p>
              {bonusLines.map(l => (
                <p key={l} className="text-[#00D084] font-medium">{l}</p>
              ))}
            </>
          )}
          <p className="pt-1 border-t border-white/[0.08] font-bold text-white">Total: {total} pts</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
