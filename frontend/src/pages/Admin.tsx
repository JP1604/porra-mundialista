import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  useMatches, useMatchdays, useRegisterResult,
  useRegisterEvent, useDeleteEvent, useMatchEvents,
  useUpdateLiveScore, useSetMatchStatus,
} from '@/hooks/useMatches'
import { usePlayers } from '@/hooks/usePlayers'
import { useAuth } from '@/contexts/AuthContext'
import { leaderboardApi } from '@/api/leaderboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Match, EventType, MatchEvent } from '@/types'
import {
  Shield, Calculator, RefreshCw, ChevronDown, ChevronUp,
  Trophy, Trash2, Plus, Target, Star,
} from 'lucide-react'

// ─── Guardia de acceso admin ──────────────────────────────────
function useAdminGuard() {
  const { profile, isAdmin, isLoading } = useAuth()
  if (isLoading) return 'loading'
  const emailOk = profile?.email?.endsWith('@admin') ||
                  profile?.email?.endsWith('@porra2026.com')
  if (!isAdmin && !emailOk) return 'denied'
  return 'ok'
}

// ─── Config de tipos de evento ────────────────────────────────
const EVENT_CONFIG: Record<EventType, { label: string; icon: string; pts: string; color: string }> = {
  goal:    { label: 'Gol',        icon: '⚽', pts: '+3 pts', color: 'bg-green-500/15 text-green-400 border-green-500/25' },
  penalty: { label: 'Penal',      icon: '🎯', pts: '+2 pts', color: 'bg-blue-500/15 text-blue-400 border-blue-500/25'   },
  assist:  { label: 'Asistencia', icon: '🅰️',  pts: '+1 pt',  color: 'bg-sky-500/15 text-sky-400 border-sky-500/25'     },
  motm:    { label: 'MOTM',       icon: '⭐', pts: '+1 pt',  color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
}

// ─── Lista de eventos registrados ────────────────────────────
function EventList({ matchId }: { matchId: string }) {
  const { data: events = [], isLoading } = useMatchEvents(matchId)
  const deleteEvent = useDeleteEvent(matchId)

  if (isLoading) return <p className="text-xs text-slate-500 italic">Cargando eventos…</p>
  if (events.length === 0) return (
    <p className="text-xs text-slate-600 italic">Sin eventos registrados aún.</p>
  )

  return (
    <div className="flex flex-wrap gap-2">
      {events.map((ev: MatchEvent) => {
        const cfg = EVENT_CONFIG[ev.event_type]
        return (
          <div key={ev.id} className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
            cfg.color
          )}>
            <span>{cfg.icon}</span>
            <span className="font-semibold">{ev.player_name}</span>
            <span className="opacity-70">{cfg.label}{ev.minute ? ` ${ev.minute}'` : ''}</span>
            <button
              onClick={() => deleteEvent.mutate(ev.id, {
                onSuccess: () => toast.success('Evento eliminado'),
                onError:   (e) => toast.error(e.message),
              })}
              className="ml-1 opacity-40 hover:opacity-100 transition-opacity"
              title="Eliminar evento"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Formulario de resultado ──────────────────────────────────
function ResultForm({ match }: { match: Match }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? '0')
  const [away, setAway] = useState(match.away_score?.toString() ?? '0')
  const reg     = useRegisterResult(match.id)
  const live    = useUpdateLiveScore(match.id)
  const setStatus = useSetMatchStatus(match.id)
  const isLive  = match.status === 'live'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 w-20 truncate text-right font-medium">{match.home_team_name}</span>
        <Input type="number" min={0} max={20} value={home} onChange={e => setHome(e.target.value)}
          className="w-14 h-9 text-center text-lg font-black bg-slate-800/60 border-white/[0.1] text-white focus-visible:ring-[#F59E0B]" />
        <span className="text-slate-500 font-bold text-lg">–</span>
        <Input type="number" min={0} max={20} value={away} onChange={e => setAway(e.target.value)}
          className="w-14 h-9 text-center text-lg font-black bg-slate-800/60 border-white/[0.1] text-white focus-visible:ring-[#F59E0B]" />
        <span className="text-xs text-slate-500 w-20 truncate font-medium">{match.away_team_name}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Iniciar EN VIVO (solo si es upcoming) */}
        {match.status === 'upcoming' && (
          <Button
            type="button" size="sm" variant="outline"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate('live', {
              onSuccess: () => toast.success('⚡ Partido marcado como EN VIVO'),
              onError: (e) => toast.error(e.message),
            })}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs gap-1.5"
          >
            {setStatus.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : '🔴'}
            Iniciar en vivo
          </Button>
        )}

        {/* Actualizar marcador EN VIVO (solo durante live) */}
        {isLive && (
          <Button
            type="button" size="sm"
            disabled={live.isPending}
            onClick={async () => {
              const h = parseInt(home)
              const a = parseInt(away)
              live.mutate(
                { home: h, away: a },
                {
                  onSuccess: async () => {
                    toast.success(`📡 Marcador actualizado: ${home}–${away}`)
                    // Recalcular puntajes en tiempo real
                    try {
                      const { supabase } = await import('@/lib/supabase')
                      await supabase.rpc('calculate_match_scores', { p_match_id: match.id })
                    } catch (_) {
                      // silencioso — no bloquear la UX
                    }
                  },
                  onError: (e) => toast.error(e.message),
                }
              )
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 animate-pulse"
          >
            {live.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '📡'}
            Actualizar marcador
          </Button>
        )}

        {/* Finalizar partido (live o upcoming) */}
        {match.status !== 'finished' && (
          <Button
            type="button" size="sm"
            disabled={reg.isPending}
            onClick={() => reg.mutate(
              { home_score: parseInt(home), away_score: parseInt(away) },
              {
                onSuccess: () => toast.success(`✅ Partido finalizado: ${home}–${away}`),
                onError: (e) => toast.error(e.message),
              }
            )}
            className="bg-[#F59E0B] hover:bg-amber-500 text-slate-900 font-bold text-xs gap-1.5"
          >
            {reg.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '✓'}
            Finalizar partido
          </Button>
        )}

        {/* Reabrir partido (finished) */}
        {match.status === 'finished' && (
          <Button
            type="button" size="sm" variant="outline"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate('live', {
              onSuccess: () => toast.success('Partido reabierto como EN VIVO'),
              onError: (e) => toast.error(e.message),
            })}
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs"
          >
            Reabrir partido
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Formulario de evento ─────────────────────────────────────
function EventForm({ match }: { match: Match }) {
  const { data: players = [] } = usePlayers([match.home_team, match.away_team])
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<{ id: string; name: string; team_name: string } | null>(null)
  const [eventType, setType]  = useState<EventType>('goal')
  const [minute, setMinute]   = useState('')
  const [showList, setShow]   = useState(false)
  const reg = useRegisterEvent(match.id)

  const filtered = players
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team_name.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 50)

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (!selected) { toast.error('Selecciona un jugador'); return }
        reg.mutate(
          { player_id: selected.id, event_type: eventType, minute: minute ? parseInt(minute) : undefined },
          {
            onSuccess: async () => {
              toast.success(`${EVENT_CONFIG[eventType].icon} ${selected!.name} — ${EVENT_CONFIG[eventType].label} registrado`)
              setSelected(null); setSearch(''); setMinute('')
              // Si el partido está en curso, recalcular puntajes al instante
              if (match.status === 'live' || match.status === 'finished') {
                try {
                  const { supabase } = await import('@/lib/supabase')
                  await supabase.rpc('calculate_match_scores', { p_match_id: match.id })
                } catch (_) {
                  // silencioso
                }
              }
            },
            onError: (err) => toast.error(err.message),
          }
        )
      }}
      className="space-y-3"
    >
      {/* Buscador de jugador */}
      <div className="relative">
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setShow(true); setSelected(null) }}
          onFocus={() => setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 150)}
          placeholder="Buscar jugador por nombre o selección…"
          className="bg-slate-800/60 border-white/[0.1] text-white placeholder:text-slate-600 text-sm h-9"
        />
        {showList && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-[#0F172A] border border-white/[0.1] rounded-lg shadow-2xl max-h-56 overflow-y-auto">
            {filtered.map(p => (
              <button
                key={p.id} type="button"
                onMouseDown={() => { setSelected(p); setSearch(p.name); setShow(false) }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/[0.05] text-left"
              >
                <span className="font-medium text-slate-200">{p.name}</span>
                <span className="text-xs text-slate-500 ml-3 shrink-0">{p.team_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tipo de evento + minuto + submit */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(EVENT_CONFIG) as EventType[]).map(type => {
            const cfg = EVENT_CONFIG[type]
            return (
              <button key={type} type="button" onClick={() => setType(type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  eventType === type
                    ? cfg.color + ' shadow-sm'
                    : 'border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/20'
                )}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span className="opacity-60 text-[10px]">{cfg.pts}</span>
              </button>
            )
          })}
        </div>
        <Input type="number" min={1} max={120} value={minute} onChange={e => setMinute(e.target.value)}
          placeholder="Min" className="w-16 h-8 text-center text-xs bg-slate-800/60 border-white/[0.1] text-white" />
        <Button type="submit" size="sm" disabled={!selected || reg.isPending}
          className="bg-[#00D084] hover:bg-[#00b872] text-[#070C18] font-bold text-xs gap-1.5 h-8">
          {reg.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> Registrar</>}
        </Button>
      </div>
    </form>
  )
}

// ─── Tarjeta de partido ───────────────────────────────────────
function MatchAdminCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(match.status !== 'finished')
  const [recalcLoading, setRecalcLoading] = useState(false)

  async function handleRecalc() {
    setRecalcLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.rpc('calculate_match_scores', { p_match_id: match.id })
      if (error) throw new Error(error.message)
      toast.success(`Puntajes recalculados: ${match.home_team_name} vs ${match.away_team_name}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRecalcLoading(false)
    }
  }

  return (
    <div className="border border-white/[0.07] rounded-xl overflow-hidden">
      <button
        type="button" onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="flex-1 flex items-center gap-3 min-w-0 flex-wrap">
          <span className="text-sm font-bold text-slate-200 shrink-0">{match.home_team_name}</span>
          {match.status === 'finished' ? (
            <span className="text-sm font-black text-white tabular-nums px-2 py-0.5 bg-white/[0.06] rounded-md shrink-0">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="text-xs text-slate-600 px-2 py-0.5 bg-white/[0.04] rounded-md shrink-0">vs</span>
          )}
          <span className="text-sm font-bold text-slate-200 shrink-0">{match.away_team_name}</span>
        </div>
        <Badge className={cn(
          'text-[10px] font-bold uppercase tracking-wider shrink-0',
          match.status === 'finished'
            ? 'bg-slate-700 text-slate-400 border-slate-600'
            : 'bg-[#00D084]/15 text-[#00D084] border-[#00D084]/25'
        )}>
          {match.status === 'finished' ? 'Finalizado' : 'Pendiente'}
        </Badge>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-4 space-y-5">

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Resultado final</p>
            <ResultForm match={match} />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Eventos registrados</p>
            <EventList matchId={match.id} />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Registrar evento de clave de gol
            </p>
            <EventForm match={match} />
          </div>

          <button
            type="button" onClick={handleRecalc} disabled={recalcLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#F59E0B] transition-colors font-medium pt-1"
          >
            {recalcLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
            Recalcular puntajes de este partido
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Criterios de puntuación ─────────────────────────────────
function ScoreRules() {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        <Trophy className="w-4 h-4 text-[#F59E0B]" /> Criterios de puntuación
      </h2>
      <div className="grid sm:grid-cols-2 gap-5 text-xs">
        <div className="space-y-2">
          <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Por marcador</p>
          {[
            { pts: '4 pts', desc: 'Marcador exacto', ex: 'predice 2-0 → 2-0' },
            { pts: '3 pts', desc: 'Mismo ganador + diferencia', ex: 'predice 4-2 → 2-0' },
            { pts: '2 pts', desc: 'Mismo ganador', ex: 'predice 2-1 → 2-0' },
            { pts: '1 pt',  desc: 'Misma diferencia de goles', ex: 'predice 0-1 → 1-0' },
            { pts: '0 pts', desc: 'Ninguna coincidencia', ex: '' },
          ].map(r => (
            <div key={r.pts} className="flex items-start gap-2">
              <span className="font-black text-[#F59E0B] w-10 shrink-0">{r.pts}</span>
              <span className="text-slate-400">{r.desc} {r.ex && <span className="text-slate-600 text-[10px]">({r.ex})</span>}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Bonus clave de gol</p>
          {[
            { pts: '+3 pts', desc: 'Gol normal', icon: '⚽' },
            { pts: '+2 pts', desc: 'Gol de penal', icon: '🎯' },
            { pts: '+1 pt',  desc: 'Asistencia', icon: '🅰️' },
            { pts: '+1 pt',  desc: 'MOTM (MVP del partido)', icon: '⭐' },
          ].map(r => (
            <div key={r.pts} className="flex items-center gap-2">
              <span className="text-sm">{r.icon}</span>
              <span className="font-black text-[#00D084] w-10 shrink-0">{r.pts}</span>
              <span className="text-slate-400">{r.desc}</span>
            </div>
          ))}
          <p className="text-[10px] text-slate-600 pt-1">Un jugador puede acumular varios bonus en el mismo partido.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export function Admin() {
  const guard = useAdminGuard()
  const { data: matches, isLoading } = useMatches()
  const { data: matchdays } = useMatchdays()
  const [calculating, setCalculating] = useState<string | null>(null)
  const [activeMatchday, setActiveMatchday] = useState<string | null>(null)

  if (guard === 'loading') return null
  if (guard === 'denied')  return <Navigate to="/" replace />

  const allMatchdays = matchdays ?? []
  const shownId = activeMatchday ?? allMatchdays[0]?.id ?? null

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
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center ring-1 ring-[#F59E0B]/20">
          <Shield className="w-5 h-5 text-[#F59E0B]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Panel Admin</h1>
          <p className="text-xs text-slate-500">Resultados, goleadores y puntajes</p>
        </div>
        <Badge className="ml-1 text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20 uppercase tracking-wider">
          Solo admins
        </Badge>
      </div>

      <ScoreRules />

      {/* Tabs de jornada */}
      {allMatchdays.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {allMatchdays.map(md => (
            <button key={md.id} onClick={() => setActiveMatchday(md.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                shownId === md.id
                  ? 'bg-[#F59E0B] text-slate-900 border-[#F59E0B]'
                  : 'border-white/[0.08] text-slate-500 hover:text-slate-200 hover:border-white/20'
              )}
            >
              {md.label}
            </button>
          ))}
        </div>
      )}

      {/* Partidos de la jornada activa */}
      {shownId && (() => {
        const matchday = allMatchdays.find(md => md.id === shownId)
        const mdMatches = matches?.filter(m => m.matchday_id === shownId) ?? []
        const finished = mdMatches.filter(m => m.status === 'finished').length

        return (
          <section className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">{matchday?.label}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{finished}/{mdMatches.length} partidos finalizados</p>
              </div>
              <Button size="sm" variant="outline"
                className="border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/10 hover:border-[#F59E0B]/50 text-xs gap-1.5 bg-transparent"
                disabled={calculating === shownId}
                onClick={() => handleCalculate(shownId, matchday?.label ?? '')}
              >
                {calculating === shownId
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <Calculator className="w-3.5 h-3.5" />}
                Recalcular toda la jornada
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />)}
              </div>
            ) : mdMatches.length === 0 ? (
              <p className="text-slate-600 text-sm py-4 text-center">Sin partidos en esta jornada.</p>
            ) : (
              <div className="space-y-2">
                {mdMatches.map(match => <MatchAdminCard key={match.id} match={match} />)}
              </div>
            )}
          </section>
        )
      })()}

      <div className="flex items-center gap-4 flex-wrap text-[11px] text-slate-600 pt-2 pb-4 border-t border-white/[0.05]">
        <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Los bonus aplican solo si el jugador fue elegido como clave en la predicción.</span>
        <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> MOTM = Man of the Match (MVP del partido).</span>
      </div>
    </div>
  )
}

