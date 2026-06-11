import axios from 'axios'
import 'dotenv/config'

export const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1)
export const SEASON    = Number(process.env.API_FOOTBALL_SEASON    ?? 2026)

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY ?? '' },
  timeout: 15_000,
})

// Rastreador de requests para no pasarse del límite diario
let requestsToday = 0
export function getRequestsUsed() { return requestsToday }
function track() { requestsToday++ }

const FINISHED = new Set(['FT', 'AET', 'PEN'])

// ─── Tipos ────────────────────────────────────────────────────

export interface ApiFixture {
  fixtureId  : number
  round      : string       // "Group Stage - 1", "Round of 32", etc.
  homeId     : number
  homeName   : string
  homeCode   : string       // 3-letter code (ARG, BRA…)
  awayId     : number
  awayName   : string
  awayCode   : string
  kickoffUtc : string       // ISO 8601
  venue      : string
  status     : string       // NS, FT, AET, PEN…
  homeGoals  : number | null
  awayGoals  : number | null
}

export interface FixtureEvent {
  playerId   : number
  playerName : string
  type       : 'goal' | 'penalty' | 'assist' | 'motm'
  minute     : number | null
}

// ─── 1 request: todos los fixtures del torneo ─────────────────
// Úsalo para seed + para el sync (filtrando por status)
export async function getAllFixtures(status?: string): Promise<ApiFixture[]> {
  track()
  const params: Record<string, unknown> = { league: LEAGUE_ID, season: SEASON }
  if (status) params.status = status   // "FT-AET-PEN" filtra terminados

  const { data } = await client.get('/fixtures', { params })
  const items: ApiFixture[] = []

  for (const f of data.response ?? []) {
    items.push({
      fixtureId : f.fixture.id,
      round     : f.league.round ?? '',
      homeId    : f.teams.home.id,
      homeName  : f.teams.home.name,
      homeCode  : (f.teams.home.code ?? f.teams.home.name.slice(0, 3)).toUpperCase(),
      awayId    : f.teams.away.id,
      awayName  : f.teams.away.name,
      awayCode  : (f.teams.away.code ?? f.teams.away.name.slice(0, 3)).toUpperCase(),
      kickoffUtc: f.fixture.date,
      venue     : f.fixture.venue?.name ?? '',
      status    : f.fixture.status.short,
      homeGoals : f.goals.home,
      awayGoals : f.goals.away,
    })
  }
  return items
}

// ─── 1 request: todos los terminados ─────────────────────────
// Úsalo en el cron — una sola llamada cubre TODOS los partidos finalizados
export async function getFinishedFixtures(): Promise<ApiFixture[]> {
  // "FT-AET-PEN" es el filtro de api-football para partidos terminados
  const all = await getAllFixtures('FT-AET-PEN')
  return all.filter(f => FINISHED.has(f.status))
}

// ─── 1 request: eventos de un partido (goles, asistencias) ───
export async function getFixtureEvents(fixtureId: number): Promise<FixtureEvent[]> {
  track()
  const { data } = await client.get('/fixtures/events', { params: { fixture: fixtureId } })
  const events: FixtureEvent[] = []

  for (const ev of data.response ?? []) {
    if (ev.type !== 'Goal') continue
    const isPenalty = (ev.detail as string ?? '').toLowerCase().includes('penalty')

    if (ev.player?.id) {
      events.push({
        playerId  : ev.player.id,
        playerName: ev.player.name ?? '',
        type      : isPenalty ? 'penalty' : 'goal',
        minute    : ev.time?.elapsed ?? null,
      })
    }
    if (!isPenalty && ev.assist?.id) {
      events.push({
        playerId  : ev.assist.id,
        playerName: ev.assist.name ?? '',
        type      : 'assist',
        minute    : ev.time?.elapsed ?? null,
      })
    }
  }
  return events
}

// ─── 1 request: MOTM (jugador con mejor rating) ───────────────
export async function getFixtureMOTM(fixtureId: number): Promise<FixtureEvent | null> {
  track()
  const { data } = await client.get('/fixtures/players', { params: { fixture: fixtureId } })

  let topRating = 0
  let motm: FixtureEvent | null = null

  for (const team of data.response ?? []) {
    for (const p of team.players ?? []) {
      const rating = parseFloat(p.statistics?.[0]?.games?.rating ?? '0')
      if (rating > topRating && p.player?.id) {
        topRating = rating
        motm = { playerId: p.player.id, playerName: p.player.name, type: 'motm', minute: null }
      }
    }
  }
  return motm
}

// ─── Verificar API key y cuota restante ──────────────────────
export async function checkApiStatus(): Promise<void> {
  track()
  const { data } = await client.get('/status')
  const acc = data.response?.account
  console.log(`[api-football] Plan: ${acc?.plan ?? '?'} | Requests hoy: ${data.response?.requests?.current ?? '?'} / ${data.response?.requests?.limit_day ?? '?'}`)
}
