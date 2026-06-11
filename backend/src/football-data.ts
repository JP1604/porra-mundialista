/**
 * Cliente football-data.org v4 (plan gratuito)
 * Cubre el Mundial 2026 con matchday correcto (1, 2, 3) en fase de grupos.
 * Límite free: 10 req/min.
 * Documentación: football-data.org/documentation/quickstart
 */
import axios from 'axios'

const client = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  timeout: 15_000,
  headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN ?? '' },
})

// ─── Tipos ────────────────────────────────────────────────────

export interface FDMatch {
  id       : number
  utcDate  : string           // ISO 8601 UTC
  status   : FDStatus
  matchday : number | null    // 1, 2, 3 en fase de grupos — viene directo de la API
  stage    : string           // GROUP_STAGE | ROUND_OF_32 | ROUND_OF_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE | FINAL
  group    : string | null    // "GROUP_A" … "GROUP_L"
  homeTeam : FDTeam
  awayTeam : FDTeam
  score    : FDScore
}

export type FDStatus =
  | 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED'
  | 'FINISHED'  | 'SUSPENDED' | 'POSTPONED' | 'CANCELLED'

export interface FDTeam {
  id        : number
  name      : string
  shortName : string
  tla       : string          // Abreviatura 3 letras: "MEX", "ARG" …
}

export interface FDScore {
  winner   : 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  fullTime : { home: number | null; away: number | null }
}

// Los goles solo vienen en /matches/{id}, no en /competitions/WC/matches
export interface FDGoal {
  minute     : number | null
  injuryTime : number | null
  type       : 'NORMAL' | 'PENALTY' | 'OWN'
  team       : { id: number; name: string }
  scorer     : { id: number; name: string }
  assist     : { id: number; name: string } | null
}

// ─── Stage mapping ───────────────────────────────────────────

const STAGE_MAP: Record<string, 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'> = {
  GROUP_STAGE    : 'group',
  LAST_32        : 'r32',    // football-data.org usa LAST_32, no ROUND_OF_32
  LAST_16        : 'r16',    // ídem
  QUARTER_FINALS : 'qf',
  SEMI_FINALS    : 'sf',
  THIRD_PLACE    : 'final',
  FINAL          : 'final',
}

export function mapFDStage(stage: string): 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' {
  return STAGE_MAP[stage.toUpperCase()] ?? 'group'
}

export function getMatchdayNum(m: FDMatch): number {
  const stage = mapFDStage(m.stage)
  if (stage === 'group') return m.matchday ?? 1
  const map: Record<string, number> = { r32: 4, r16: 5, qf: 6, sf: 7, final: 8 }
  return map[stage] ?? 9
}

export function getMatchdayLabel(stage: string, num: number): string {
  if (stage === 'group') return `Jornada ${num} – Fase de Grupos`
  const labels: Record<string, string> = {
    r32: 'Ronda de 32', r16: 'Octavos de Final',
    qf: 'Cuartos de Final', sf: 'Semifinales', final: 'Final',
  }
  return labels[stage] ?? stage
}

function parseGroup(raw: string | null): string | null {
  if (!raw) return null
  return raw.replace(/group[_\s]*/i, '').trim().toUpperCase().charAt(0) || null
}

// ─── Requests ────────────────────────────────────────────────

/** 1 request: todos los 104 fixtures del torneo */
export async function getAllMatches(): Promise<FDMatch[]> {
  const { data } = await client.get('/competitions/WC/matches', {
    params: { season: 2026 },
  })
  return (data.matches ?? []) as FDMatch[]
}

/** 1 request: solo los partidos terminados */
export async function getFinishedMatches(): Promise<FDMatch[]> {
  const { data } = await client.get('/competitions/WC/matches', {
    params: { season: 2026, status: 'FINISHED' },
  })
  return (data.matches ?? []) as FDMatch[]
}

/** 1 request por partido: goles y asistencias (puede estar vacío en plan free) */
export async function getMatchGoals(matchId: number): Promise<FDGoal[]> {
  try {
    const { data } = await client.get(`/matches/${matchId}`)
    return (data.goals ?? []) as FDGoal[]
  } catch {
    return []
  }
}

// ─── Plantillas (squads) ─────────────────────────────────────

export interface FDSquadPlayer {
  id          : number
  name        : string
  position    : string | null   // "Goalkeeper" | "Defence" | "Midfield" | "Offence" | variantes
  dateOfBirth : string | null
  nationality : string | null
}

export interface FDTeamFull extends FDTeam {
  squad: FDSquadPlayer[]
}

/** 1 request: las 48 selecciones clasificadas */
export async function getCompetitionTeams(): Promise<FDTeam[]> {
  const { data } = await client.get('/competitions/WC/teams', {
    params: { season: 2026 },
  })
  return (data.teams ?? []) as FDTeam[]
}

/** 1 request por selección: datos del equipo + plantilla completa */
export async function getTeamSquad(teamId: number): Promise<FDTeamFull> {
  const { data } = await client.get(`/teams/${teamId}`)
  return data as FDTeamFull
}

/** Mapea la posición de football-data.org a GK/DEF/MID/FWD */
export function mapPosition(raw: string | null): 'GK' | 'DEF' | 'MID' | 'FWD' | null {
  if (!raw) return null
  const p = raw.toLowerCase()
  if (p.includes('keeper') || p === 'gk')                                   return 'GK'
  if (p.includes('defen') || p.includes('back'))                            return 'DEF'
  if (p.includes('midfield'))                                               return 'MID'
  if (p.includes('offence') || p.includes('forward') || p.includes('wing')
      || p.includes('attack') || p.includes('striker'))                     return 'FWD'
  return null
}

/** Verifica token y disponibilidad del torneo */
export async function checkStatus(): Promise<void> {
  const { data } = await client.get('/competitions/WC')
  console.log(`Competición: ${data.name}`)
  console.log(`Plan: ${data.plan ?? 'TIER_ONE'}`)
  console.log(`Temporada: ${data.currentSeason?.startDate ?? '?'} → ${data.currentSeason?.endDate ?? '?'}`)
}

// ─── Helpers para seed ───────────────────────────────────────

export interface MatchdayMeta {
  stage    : string
  num      : number
  label    : string
  closesAt : string   // kickoff del primer partido de esa jornada
}

/** Construye el mapa stage_num → MatchdayMeta a partir de los fixtures */
export function buildMatchdayMeta(matches: FDMatch[]): Map<string, MatchdayMeta> {
  const map = new Map<string, MatchdayMeta>()

  for (const m of matches) {
    const stage = mapFDStage(m.stage)
    const num   = getMatchdayNum(m)
    const key   = `${stage}_${num}`

    if (!map.has(key)) {
      map.set(key, { stage, num, label: getMatchdayLabel(stage, num), closesAt: m.utcDate })
    } else if (m.utcDate < map.get(key)!.closesAt) {
      map.get(key)!.closesAt = m.utcDate   // keeps earliest kickoff
    }
  }

  return map
}

/** Convierte un FDMatch a la fila de Supabase `matches` */
export function matchToRow(m: FDMatch, matchdayId: string) {
  // Equipos aún sin determinar en la fase eliminatoria
  const homeName = m.homeTeam?.name ?? 'TBD'
  const awayName = m.awayTeam?.name ?? 'TBD'
  const homeTla  = (m.homeTeam?.tla ?? 'TBD').slice(0, 3).toUpperCase()
  const awayTla  = (m.awayTeam?.tla ?? 'TBD').slice(0, 3).toUpperCase()

  return {
    matchday_id    : matchdayId,
    api_football_id: m.id,
    home_team      : homeTla,
    away_team      : awayTla,
    home_team_name : homeName,
    away_team_name : awayName,
    kickoff_at     : m.utcDate,
    status         : m.status === 'FINISHED' ? 'finished' : 'upcoming',
    home_score     : m.score.fullTime.home,
    away_score     : m.score.fullTime.away,
    stage          : mapFDStage(m.stage),
    group_name     : parseGroup(m.group),
  }
}
