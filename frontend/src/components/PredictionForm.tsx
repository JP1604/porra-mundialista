import { useState, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Match, Matchday, Player, Prediction, CreatePredictionDto, UpdatePredictionDto } from '@/types'
import { CountdownTimer } from './CountdownTimer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Check, ChevronDown, Lock, Search, X } from 'lucide-react'

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
  const [homeScore, setHomeScore] = useState(existingPrediction?.home_score?.toString() ?? '0')
  const [awayScore, setAwayScore] = useState(existingPrediction?.away_score?.toString() ?? '0')
  const [selectedPlayerId, setSelectedPlayerId] = useState(existingPrediction?.key_player_id ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const isClosed = !match.is_open

  const availablePlayers = useMemo(
    () => players.filter(p => !blockedPlayerIds.includes(p.id)),
    [players, blockedPlayerIds]
  )

  // Filtra por búsqueda y agrupa por equipo
  const playersByTeam = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = availablePlayers.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.team_name.toLowerCase().includes(q)
    )
    const groups: { team: string; teamName: string; players: typeof players }[] = []
    for (const teamCode of [match.home_team, match.away_team]) {
      const tp = filtered.filter(p => p.team === teamCode)
      if (tp.length > 0) groups.push({ team: teamCode, teamName: tp[0].team_name, players: tp })
    }
    const rest = filtered.filter(p => p.team !== match.home_team && p.team !== match.away_team)
    if (rest.length > 0) groups.push({ team: 'OTROS', teamName: 'Otros', players: rest })
    return groups
  }, [availablePlayers, match.home_team, match.away_team, search])

  const totalFiltered = playersByTeam.reduce((acc, g) => acc + g.players.length, 0)
  const selectedPlayer = players.find(p => p.id === selectedPlayerId)
  const isSelectedBlocked = blockedPlayerIds.includes(selectedPlayerId)
  const blockedNames = players.filter(p => blockedPlayerIds.includes(p.id)).map(p => p.name)

  function openPicker() {
    setPickerOpen(true)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function selectPlayer(id: string) {
    setSelectedPlayerId(id)
    setPickerOpen(false)
    setSearch('')
  }

  const canSubmit = !isClosed && !isSaving && !isSelectedBlocked &&
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
    if (existingPrediction) onSave({ id: existingPrediction.id, dto })
    else onSave(dto)
  }

  const scoreInputClass =
    'w-16 h-14 text-center text-2xl font-black bg-slate-100 dark:bg-[#1E293B] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus-visible:ring-[#00D084] focus-visible:border-[#00D084]/40'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isClosed && <CountdownTimer closesAt={match.kickoff_at} className="justify-center" />}

      {/* Marcador */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">{match.home_team_name}</span>
          <Input type="number" min={0} max={20} value={homeScore}
            onChange={e => setHomeScore(e.target.value)}
            disabled={isClosed} className={scoreInputClass} aria-label="Goles equipo local" />
        </div>
        <span className="text-2xl font-black text-slate-400 mt-5">–</span>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">{match.away_team_name}</span>
          <Input type="number" min={0} max={20} value={awayScore}
            onChange={e => setAwayScore(e.target.value)}
            disabled={isClosed} className={scoreInputClass} aria-label="Goles equipo visitante" />
        </div>
      </div>

      {/* Clave de gol */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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

        {/* Botón que abre el picker inline */}
        {!pickerOpen ? (
          <button
            type="button"
            disabled={isClosed}
            onClick={openPicker}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors',
              'bg-slate-100 dark:bg-[#1E293B] border-slate-200 dark:border-white/[0.08]',
              'hover:bg-slate-200 dark:hover:bg-[#253548]',
              !selectedPlayer && 'text-slate-400 dark:text-slate-500',
              selectedPlayer && !isSelectedBlocked && 'text-slate-900 dark:text-white',
              isSelectedBlocked && 'border-red-300 dark:border-red-700/50 text-red-500',
              isClosed && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span className="truncate">
              {selectedPlayer
                ? `${selectedPlayer.name} (${selectedPlayer.team_name})`
                : 'Seleccionar jugador…'}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2 text-slate-400" />
          </button>
        ) : (
          /* Panel inline — sin portal, scroll funciona en móvil */
          <div className="rounded-lg border border-[#00D084]/40 overflow-hidden bg-white dark:bg-[#0F172A]">
            {/* Buscador */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-white/[0.08]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar jugador…"
                className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />
              <button type="button" onClick={() => { setPickerOpen(false); setSearch('') }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista — scroll táctil sin problemas en iOS/Android */}
            <div
              className="overflow-y-scroll"
              style={{
                maxHeight: '13rem',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
              }}
            >
              {totalFiltered === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">
                  {availablePlayers.length === 0 ? 'Sin jugadores disponibles' : 'Jugador no encontrado'}
                </p>
              )}
              {playersByTeam.map(group => (
                <div key={group.team}>
                  <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {group.teamName}
                  </p>
                  {group.players.map(player => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => selectPlayer(player.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
                        'hover:bg-slate-50 dark:hover:bg-white/[0.05]',
                        selectedPlayerId === player.id
                          ? 'bg-[#00D084]/10 text-[#00955C] dark:text-[#00D084]'
                          : 'text-slate-700 dark:text-slate-300',
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{player.name}</span>
                        {player.position && (
                          <span className="text-[10px] text-slate-400 shrink-0">{player.position}</span>
                        )}
                      </span>
                      {selectedPlayerId === player.id && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isClosed ? (
        <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500">
          <Lock className="w-4 h-4" /> Partido cerrado — no se pueden editar predicciones
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
