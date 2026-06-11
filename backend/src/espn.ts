/**
 * Cliente ESPN (API no oficial, pública — sin key, sin límite)
 * Cubre el Mundial 2026 con datos en tiempo real.
 * Base: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world
 */
import axios from 'axios'

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

const client = axios.create({ baseURL: BASE, timeout: 12_000 })

// ─── Tipos ────────────────────────────────────────────────────

export interface ESPNFixture {
  id         : string
  date       : string            // ISO 8601 UTC
  status     : 'STATUS_SCHEDULED' | 'STATUS_IN_PROGRESS' | 'STATUS_HALFTIME' | 'STATUS_FINAL' | string
  homeTeam   : ESPNTeam
  awayTeam   : ESPNTeam
  homeScore  : number | null
  awayScore  : number | null
  round      : string | null     // "Group Stage", "Round of 32", etc.
  group      : string | null     // "Group A" … "Group L"
  matchday   : number | null     // 1, 2, 3 en fase de grupos
}

export interface ESPNTeam {
  id           : string
  displayName  : string
  abbreviation : string          // "MEX", "ARG", etc.
}

export interface ESPNGoal {
  scorerId   : string
  scorerName : string
  assistId   : string | null
  assistName : string | null
  type       : 'goal' | 'penalty' | 'own_goal'
  minute     : number | null
}

// ─── Parser de un evento del scoreboard ──────────────────────
function parseFixture(ev: Record<string, unknown>): ESPNFixture {
  const comp   = (ev.competitions as unknown[])?.[0] as Record<string, unknown>
  const comps  = (comp?.competitors as unknown[] ?? []) as Record<string, unknown>[]
  const home   = comps.find(c => c.homeAway === 'home') as Record<string, unknown>
  const away   = comps.find(c => c.homeAway === 'away') as Record<string, unknown>
  const status = (ev.status as {type: {name: string}})?.type?.name ?? ''

  // Intentar extraer grupo y ronda
  const note   = (ev.notes as {type?: string; headline?: string}[])?.[0]?.headline ?? null
  const season = ev.season as {slug?: string} | undefined
  const week   = (ev as {week?: {number?: number}}).week?.number ?? null

  return {
    id        : String(ev.id),
    date      : String(ev.date),
    status,
    homeTeam  : {
      id          : String((home?.team as {id?: unknown})?.id ?? ''),
      displayName : String((home?.team as {displayName?: unknown})?.displayName ?? ''),
      abbreviation: String((home?.team as {abbreviation?: unknown})?.abbreviation ?? '').toUpperCase(),
    },
    awayTeam  : {
      id          : String((away?.team as {id?: unknown})?.id ?? ''),
      displayName : String((away?.team as {displayName?: unknown})?.displayName ?? ''),
      abbreviation: String((away?.team as {abbreviation?: unknown})?.abbreviation ?? '').toUpperCase(),
    },
    homeScore : status === 'STATUS_FINAL' ? Number(home?.score ?? 0) : null,
    awayScore : status === 'STATUS_FINAL' ? Number(away?.score ?? 0) : null,
    round     : note ?? (season?.slug ?? null),
    group     : extractGroup(comp),
    matchday  : week,
  }
}

function extractGroup(comp: Record<string, unknown>): string | null {
  // ESPN puede poner el grupo en comp.groups o en comp.notes
  const groups = comp?.groups as {name?: string}[]
  if (groups?.length) return groups[0].name ?? null
  const note = (comp?.notes as {headline?: string}[])?.[0]?.headline ?? null
  if (note?.toLowerCase().includes('group')) return note
  return null
}

// ─── 1 request: todos los fixtures del torneo ─────────────────
// ESPN acepta rango de fechas: ?dates=20260611-20260719
export async function getAllFixtures(): Promise<ESPNFixture[]> {
  const { data } = await client.get('/scoreboard', {
    params: { dates: '20260611-20260719', limit: 200 },
  })
  return (data.events ?? []).map(parseFixture)
}

// ─── 1 request: partidos de hoy (para el cron de sync) ───────
export async function getTodayFixtures(): Promise<ESPNFixture[]> {
  const { data } = await client.get('/scoreboard')
  return (data.events ?? []).map(parseFixture)
}

// ─── 1 request: partidos de una fecha concreta ────────────────
export async function getFixturesByDate(yyyymmdd: string): Promise<ESPNFixture[]> {
  const { data } = await client.get('/scoreboard', {
    params: { dates: yyyymmdd },
  })
  return (data.events ?? []).map(parseFixture)
}

// ─── 1 request: goles de un partido finalizado ───────────────
export async function getMatchGoals(espnEventId: string): Promise<ESPNGoal[]> {
  const goals: ESPNGoal[] = []
  try {
    const { data } = await client.get('/summary', { params: { event: espnEventId } })

    // ESPN guarda los goles en scoring.periods[].items
    const periods = (data.scoring?.periods ?? []) as Record<string, unknown>[]
    for (const period of periods) {
      for (const item of (period.items as Record<string, unknown>[]) ?? []) {
        const desc = String(item.description ?? '').toLowerCase()
        const isPenalty = desc.includes('penalty') || desc.includes('pk')
        const isOwn     = desc.includes('own goal')
        const athletes  = item.athletes as {athlete?: {id?: string; displayName?: string}; type?: {text?: string}}[]

        const scorer = athletes?.find(a => a.type?.text?.toLowerCase().includes('scorer') || a === athletes[0])
        const assist = athletes?.find(a => a.type?.text?.toLowerCase().includes('assist'))

        if (scorer?.athlete?.id) {
          goals.push({
            scorerId  : String(scorer.athlete.id),
            scorerName: scorer.athlete.displayName ?? '',
            assistId  : assist?.athlete?.id ? String(assist.athlete.id) : null,
            assistName: assist?.athlete?.displayName ?? null,
            type      : isOwn ? 'own_goal' : isPenalty ? 'penalty' : 'goal',
            minute    : item.clock ? Math.floor(Number(item.clock)) : null,
          })
        }
      }
    }
  } catch {
    // Si el endpoint falla, retornamos vacío (la puntuación base igual se calcula)
  }
  return goals
}

// ─── Mapeo de stage ESPN → nuestro stage ────────────────────
export function mapESPNStage(round: string | null, matchday: number | null): string {
  const r = (round ?? '').toLowerCase()
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 'final'
  if (r.includes('semi'))    return 'sf'
  if (r.includes('quarter')) return 'qf'
  if (r.includes('32'))      return 'r32'
  if (r.includes('16'))      return 'r16'
  return 'group'
}
