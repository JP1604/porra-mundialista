import { useState } from 'react'
import { useMatches, useMatchdays, useRegisterResult, useRegisterEvent } from '@/hooks/useMatches'
import { usePlayers } from '@/hooks/usePlayers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { leaderboardApi } from '@/api/leaderboard'
import { toast } from 'sonner'
import type { Match, EventType } from '@/types'
import { Shield, Calculator, RefreshCw } from 'lucide-react'

const inputClass = 'w-16 text-center bg-[#1E293B] border-white/[0.08] text-white focus-visible:ring-[#00D084]'

function ResultForm({ match }: { match: Match }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? '0')
  const [away, setAway] = useState(match.away_score?.toString() ?? '0')
  const registerResult = useRegisterResult(match.id)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    registerResult.mutate(
      { home_score: parseInt(home), away_score: parseInt(away) },
      {
        onSuccess: () => toast.success(`Resultado guardado: ${home}–${away}`),
        onError: (err) => toast.error(err.message),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <Input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)}
        className={inputClass} />
      <span className="text-slate-600 font-bold">–</span>
      <Input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)}
        className={inputClass} />
      <Button type="submit" size="sm" disabled={registerResult.isPending}
        className="bg-[#F59E0B] hover:bg-amber-500 text-[#070C18] font-bold text-xs">
        {registerResult.isPending ? 'Guardando…' : 'Guardar resultado'}
      </Button>
    </form>
  )
}

function EventForm({ match }: { match: Match }) {
  const { data: players = [] } = usePlayers([match.home_team, match.away_team])
  const [playerId, setPlayerId] = useState('')
  const [eventType, setEventType] = useState<EventType>('goal')
  const registerEvent = useRegisterEvent(match.id)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerId) return
    registerEvent.mutate(
      { player_id: playerId, event_type: eventType },
      {
        onSuccess: () => { toast.success('Evento registrado'); setPlayerId('') },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <Select value={playerId} onValueChange={setPlayerId}>
        <SelectTrigger className="w-52 bg-[#1E293B] border-white/[0.08] text-slate-200 text-xs">
          <SelectValue placeholder="Seleccionar jugador…" />
        </SelectTrigger>
        <SelectContent className="bg-[#0F172A] border-white/[0.09] text-slate-200 max-h-60">
          {players.length === 0 && (
            <SelectItem value="_" disabled>Cargando jugadores…</SelectItem>
          )}
          {players.map(p => (
            <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer focus:bg-white/5">
              {p.name} ({p.team_name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={eventType} onValueChange={v => setEventType(v as EventType)}>
        <SelectTrigger className="w-36 bg-[#1E293B] border-white/[0.08] text-slate-200 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0F172A] border-white/[0.09] text-slate-200">
          <SelectItem value="goal">⚽ Gol (+3)</SelectItem>
          <SelectItem value="penalty">🎯 Penal (+2)</SelectItem>
          <SelectItem value="assist">🅰️ Asistencia (+1)</SelectItem>
          <SelectItem value="motm">⭐ MOTM (+1)</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={!playerId || registerEvent.isPending}
        className="bg-[#00D084] hover:bg-[#00b872] text-[#070C18] font-bold text-xs">
        Registrar evento
      </Button>
    </form>
  )
}

export function Admin() {
  const { data: matches, isLoading } = useMatches()
  const { data: matchdays } = useMatchdays()
  const [calculating, setCalculating] = useState<string | null>(null)

  async function handleCalculate(matchdayId: string, label: string) {
    setCalculating(matchdayId)
    try {
      await leaderboardApi.calculateMatchday(matchdayId)
      toast.success(`Puntajes de "${label}" recalculados`)
    } catch (err) {
      toast.error((err as Error).message ?? 'Error al recalcular')
    } finally {
      setCalculating(null)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center ring-1 ring-[#F59E0B]/20">
          <Shield className="w-5 h-5 text-[#F59E0B]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Panel Admin</h1>
          <p className="text-xs text-slate-500">Gestión de resultados y eventos</p>
        </div>
        <span className="ml-2 text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Solo admins
        </span>
      </div>

      {(matchdays ?? []).map(matchday => {
        const mdMatches = matches?.filter(m => m.matchday_id === matchday.id) ?? []
        return (
          <section key={matchday.id} className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-bold text-white">{matchday.label}</h2>
              <Button
                size="sm"
                variant="outline"
                className="border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/50 text-xs gap-1.5 bg-transparent"
                disabled={calculating === matchday.id}
                onClick={() => handleCalculate(matchday.id, matchday.label)}
              >
                {calculating === matchday.id
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <Calculator className="w-3.5 h-3.5" />}
                {calculating === matchday.id ? 'Calculando…' : 'Recalcular puntajes'}
              </Button>
            </div>

            <Separator className="bg-white/[0.06]" />

            {isLoading ? (
              <p className="text-slate-600 text-sm">Cargando partidos…</p>
            ) : mdMatches.length === 0 ? (
              <p className="text-slate-600 text-sm">Sin partidos en esta jornada.</p>
            ) : (
              <div className="space-y-5">
                {mdMatches.map(match => (
                  <div key={match.id} className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200">
                        {match.home_team_name} vs {match.away_team_name}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        match.status === 'finished'
                          ? 'text-slate-500 bg-white/[0.04] border-white/[0.06]'
                          : 'text-[#00D084] bg-[#00D084]/10 border-[#00D084]/20'
                      }`}>
                        {match.status}
                      </span>
                    </div>
                    <div className="pl-4 space-y-3 border-l-2 border-white/[0.06]">
                      <div>
                        <p className="text-xs text-slate-600 mb-2 font-medium uppercase tracking-wider">Resultado final</p>
                        <ResultForm match={match} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-2 font-medium uppercase tracking-wider">Registrar evento</p>
                        <EventForm match={match} />
                      </div>
                    </div>
                    <Separator className="bg-white/[0.05]" />
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
