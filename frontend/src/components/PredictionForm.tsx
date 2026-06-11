import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Match, Matchday, Player, Prediction, CreatePredictionDto, UpdatePredictionDto } from '@/types'
import { CountdownTimer } from './CountdownTimer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlertTriangle, Check, ChevronsUpDown, Lock } from 'lucide-react'

interface PredictionFormProps {
  match: Match
  matchday: Matchday
  players: Player[]
  existingPrediction?: Prediction | null
  blockedPlayerIds?: string[]
  onSave: (dto: CreatePredictionDto | { id: string; dto: UpdatePredictionDto }) => void
  isSaving?: boolean
}

export function PredictionForm({
  match,
  players,
  existingPrediction,
  blockedPlayerIds = [],
  onSave,
  isSaving = false,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState(
    existingPrediction?.home_score?.toString() ?? '0'
  )
  const [awayScore, setAwayScore] = useState(
    existingPrediction?.away_score?.toString() ?? '0'
  )
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    existingPrediction?.key_player_id ?? ''
  )
  const [comboOpen, setComboOpen] = useState(false)

  // Cada partido se bloquea individualmente en su kickoff_at
  const isClosed = !match.is_open

  const availablePlayers = useMemo(
    () => players.filter(p => !blockedPlayerIds.includes(p.id)),
    [players, blockedPlayerIds]
  )

  const playersByTeam = useMemo(() => {
    const groups: { team: string; teamName: string; players: typeof players }[] = []
    for (const teamCode of [match.home_team, match.away_team]) {
      const teamPlayers = availablePlayers.filter(p => p.team === teamCode)
      if (teamPlayers.length > 0) {
        groups.push({
          team: teamCode,
          teamName: teamPlayers[0].team_name,
          players: teamPlayers,
        })
      }
    }
    const rest = availablePlayers.filter(
      p => p.team !== match.home_team && p.team !== match.away_team
    )
    if (rest.length > 0) groups.push({ team: 'OTROS', teamName: 'Otros', players: rest })
    return groups
  }, [availablePlayers, match.home_team, match.away_team])

  const selectedPlayer = players.find(p => p.id === selectedPlayerId)
  const isSelectedBlocked = blockedPlayerIds.includes(selectedPlayerId)
  const blockedNames = players
    .filter(p => blockedPlayerIds.includes(p.id))
    .map(p => p.name)

  const canSubmit =
    !isClosed && !isSaving && !isSelectedBlocked &&
    selectedPlayerId !== '' && homeScore !== '' && awayScore !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const dto = {
      match_id: match.id,
      home_score: parseInt(homeScore, 10),
      away_score: parseInt(awayScore, 10),
      key_player_id: selectedPlayerId,
    }

    if (existingPrediction) {
      onSave({ id: existingPrediction.id, dto })
    } else {
      onSave(dto)
    }
  }

  const scoreInputClass =
    'w-16 h-14 text-center text-2xl font-black bg-[#1E293B] border-white/[0.08] text-white focus-visible:ring-[#00D084] focus-visible:border-[#00D084]/40'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isClosed && (
        <CountdownTimer closesAt={match.kickoff_at} className="justify-center" />
      )}

      {/* Score inputs */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">{match.home_team_name}</span>
          <Input
            type="number" min={0} max={20}
            value={homeScore} onChange={e => setHomeScore(e.target.value)}
            disabled={isClosed} className={scoreInputClass}
            aria-label="Goles equipo local"
          />
        </div>
        <span className="text-2xl font-black text-slate-600 mt-5">–</span>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">{match.away_team_name}</span>
          <Input
            type="number" min={0} max={20}
            value={awayScore} onChange={e => setAwayScore(e.target.value)}
            disabled={isClosed} className={scoreInputClass}
            aria-label="Goles equipo visitante"
          />
        </div>
      </div>

      {/* Key player */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Clave de gol
        </label>

        {blockedNames.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-800/40 px-3 py-2 text-xs text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong>{blockedNames.join(', ')}</strong>{' '}
              {blockedNames.length === 1 ? 'está bloqueado' : 'están bloqueados'} — usados en la jornada anterior.
            </span>
          </div>
        )}

        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline" role="combobox" disabled={isClosed}
              className={cn(
                'w-full justify-between bg-[#1E293B] border-white/[0.08] text-left font-normal hover:bg-[#253548] hover:border-white/[0.12]',
                !selectedPlayer && 'text-slate-600',
                selectedPlayer && 'text-white',
                isSelectedBlocked && 'border-red-700/50 text-red-400'
              )}
            >
              {selectedPlayer
                ? `${selectedPlayer.name} (${selectedPlayer.team_name})`
                : 'Seleccionar jugador…'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 bg-[#0F172A] border-white/[0.09]" align="start">
            <Command className="bg-transparent">
              <CommandInput
                placeholder="Buscar jugador…"
                className="bg-transparent text-white border-b border-white/[0.08] placeholder:text-slate-600"
              />
              <CommandList className="max-h-56 overflow-y-auto">
                <CommandEmpty className="text-slate-500 text-sm py-3 text-center">
                  {availablePlayers.length === 0
                    ? 'Sin jugadores disponibles para este partido'
                    : 'Jugador no encontrado'}
                </CommandEmpty>
                {playersByTeam.map(group => (
                  <CommandGroup
                    key={group.team}
                    heading={group.teamName}
                    className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-slate-600 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                  >
                    {group.players.map(player => (
                      <CommandItem
                        key={player.id}
                        value={`${player.name} ${player.team_name}`}
                        onSelect={() => { setSelectedPlayerId(player.id); setComboOpen(false) }}
                        className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white aria-selected:bg-white/[0.06] aria-selected:text-white"
                      >
                        <div>
                          <span className="text-sm font-medium">{player.name}</span>
                          {player.position && (
                            <span className="text-xs text-slate-600 ml-2">{player.position}</span>
                          )}
                        </div>
                        {selectedPlayerId === player.id && (
                          <Check className="h-4 w-4 text-[#00D084]" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {isClosed ? (
        <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-slate-600">
          <Lock className="w-4 h-4" />
          Jornada cerrada — no se pueden editar predicciones
        </div>
      ) : (
        <Button
          type="submit" disabled={!canSubmit}
          className="w-full bg-[#00D084] hover:bg-[#00b872] text-[#070C18] font-bold disabled:opacity-30 shadow-[0_0_20px_rgba(0,208,132,0.2)] hover:shadow-[0_0_28px_rgba(0,208,132,0.35)] transition-all"
        >
          {isSaving ? 'Guardando…' : existingPrediction ? 'Actualizar predicción' : 'Guardar predicción'}
        </Button>
      )}
    </form>
  )
}
