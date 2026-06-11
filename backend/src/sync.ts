/**
 * SYNC — Sincronización de resultados desde football-data.org
 * Estrategia: chequea todos los partidos FINISHED, compara con Supabase,
 * actualiza resultados y calcula puntuaciones.
 */
import { supabase } from './supabase.js'
import { getFinishedMatches, getMatchGoals } from './football-data.js'

type FinishedMap = Map<number, Awaited<ReturnType<typeof getFinishedMatches>>[number]>

/** Pausa para respetar el límite de 10 req/min del plan free (mínimo 6 s entre calls) */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const API_DELAY = 7_000  // 7 s entre peticiones a football-data.org

export async function syncResults(): Promise<void> {
  console.log(`\n[sync] ${new Date().toISOString()}`)

  // 1. Partidos terminados según football-data.org
  let finished: Awaited<ReturnType<typeof getFinishedMatches>>
  try {
    finished = await getFinishedMatches()
  } catch (e) {
    console.error('[sync] Error consultando football-data.org:', (e as Error).message)
    return
  }

  if (finished.length === 0) { console.log('[sync] Sin partidos terminados todavía.'); return }

  const finishedIds: FinishedMap = new Map(finished.map(f => [f.id, f]))

  // 2. Pase principal: partidos 'upcoming' → 'finished'
  const { data: pending, error } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, api_football_id')
    .eq('status', 'upcoming')
    .not('api_football_id', 'is', null)

  if (error) { console.error('[sync] Supabase error:', error.message); return }

  const toUpdate = (pending ?? []).filter(m =>
    m.api_football_id && finishedIds.has(m.api_football_id)
  )

  if (toUpdate.length > 0) {
    console.log(`[sync] ${toUpdate.length} partido(s) a actualizar.`)
    for (const match of toUpdate) {
      await processFinishedMatch(match, finishedIds)
      if (toUpdate.indexOf(match) < toUpdate.length - 1) await sleep(API_DELAY)
    }
  } else {
    console.log('[sync] Todo al día.')
  }

  // 3. Pase corrector: partidos ya 'finished' con score 0-0 que la API corrigió
  await correctZeroZeroMatches(finishedIds)

  // 4. Pase de recuperación: partidos 'finished' cuyas predicciones no tienen score calculado
  await recalculateMissingScores()

  // 5. Pase de recuperación de goles: partidos 'finished' sin match_events registrados
  await recoverMissingGoals()
}

/** Actualiza un partido upcoming → finished y calcula scores */
async function processFinishedMatch(
  match: { id: string; home_team_name: string; away_team_name: string; api_football_id: number },
  finishedIds: FinishedMap,
): Promise<void> {
  const fd = finishedIds.get(match.api_football_id)!
  const homeScore = fd.score.fullTime.home
  const awayScore = fd.score.fullTime.away

  // Si la API aún no publicó el marcador final, esperar al próximo ciclo
  if (homeScore === null || awayScore === null) {
    console.log(`[sync]   ⚠️  ${match.home_team_name} vs ${match.away_team_name}: scores aún null — próximo ciclo.`)
    return
  }

  console.log(`[sync] → ${match.home_team_name} ${homeScore}-${awayScore} ${match.away_team_name}`)

  const { error: upErr } = await supabase
    .from('matches')
    .update({ status: 'finished', home_score: homeScore, away_score: awayScore })
    .eq('id', match.id)

  if (upErr) { console.error('[sync]   Error:', upErr.message); return }

  await registerGoals(match.id, match.api_football_id)
  await calculateScores(match.id, match.home_team_name, match.away_team_name)
}

/**
 * Segundo pase: corrige partidos que quedaron con 0-0 erróneo.
 * Ocurre cuando la API devuelve FINISHED con scores=null y el sync
 * usaba "?? 0" como fallback, dejando 0-0 permanentemente.
 */
async function correctZeroZeroMatches(finishedIds: FinishedMap): Promise<void> {
  const { data: zeroZero } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, api_football_id')
    .eq('status', 'finished')
    .eq('home_score', 0)
    .eq('away_score', 0)
    .not('api_football_id', 'is', null)

  if (!zeroZero || zeroZero.length === 0) return

  for (const match of zeroZero) {
    const fd = finishedIds.get(match.api_football_id)
    if (!fd) continue

    const apiHome = fd.score.fullTime.home
    const apiAway = fd.score.fullTime.away

    // Solo corregir si la API tiene scores válidos y diferentes de 0-0
    if (apiHome === null || apiAway === null) continue
    if (apiHome === 0 && apiAway === 0) continue  // realmente fue 0-0

    console.log(`[sync] 🔧 Corrigiendo ${match.home_team_name} ${apiHome}-${apiAway} ${match.away_team_name} (era 0-0 erróneo)`)

    const { error } = await supabase
      .from('matches')
      .update({ home_score: apiHome, away_score: apiAway })
      .eq('id', match.id)

    if (error) { console.error('[sync]   Error corrigiendo score:', error.message); continue }

    await registerGoals(match.id, match.api_football_id)
    await calculateScores(match.id, match.home_team_name, match.away_team_name)
  }
}

/**
 * Pase 5: Recuperación de goles.
 * Cubre dos casos:
 *   A) Partidos finished con goles (score > 0) pero sin ningún match_event → se perdió la llamada a la API.
 *   B) Partidos finished con goles pero TODAS las predicciones tienen bonus_score = 0 →
 *      los eventos existen con el player_id equivocado (fallo en upsert de jugador).
 * En ambos casos: borra eventos previos, re-descarga, re-calcula.
 */
async function recoverMissingGoals(): Promise<void> {
  // Partidos terminados CON goles y con api_football_id
  const { data: scoringMatches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, api_football_id, home_score, away_score')
    .eq('status', 'finished')
    .not('api_football_id', 'is', null)
    .or('home_score.gt.0,away_score.gt.0')   // al menos un equipo marcó

  if (!scoringMatches || scoringMatches.length === 0) return

  // Qué matches tienen al menos UN evento
  const { data: withEvents } = await supabase
    .from('match_events')
    .select('match_id')

  const withEventsSet = new Set((withEvents ?? []).map((e: { match_id: string }) => e.match_id))

  // Qué matches tienen TODAS las predicciones con bonus = 0
  const { data: zeroBonusPreds } = await supabase
    .from('predictions')
    .select('match_id, bonus_score')
    .not('base_score', 'is', null)   // solo predicciones ya evaluadas

  const allZeroBonus = new Set<string>()
  if (zeroBonusPreds && zeroBonusPreds.length > 0) {
    const bonusByMatch = new Map<string, number>()
    for (const p of zeroBonusPreds) {
      const prev = bonusByMatch.get(p.match_id) ?? 0
      bonusByMatch.set(p.match_id, prev + (p.bonus_score ?? 0))
    }
    for (const [mid, total] of bonusByMatch) {
      if (total === 0) allZeroBonus.add(mid)
    }
  }

  const needsGoals = scoringMatches.filter(m =>
    !withEventsSet.has(m.id) ||   // caso A: sin eventos
    allZeroBonus.has(m.id)        // caso B: eventos con UUID incorrecto
  )

  if (needsGoals.length === 0) return

  console.log(`[sync] 🎯 ${needsGoals.length} partido(s) con goles pero bonus=0 — re-sincronizando goleadores…`)

  for (let i = 0; i < needsGoals.length; i++) {
    const match = needsGoals[i]
    if (i > 0) await sleep(API_DELAY)

    const registered = await registerGoals(match.id, match.api_football_id)
    if (registered > 0) {
      console.log(`[sync]   🏆 ${registered} evento(s) para ${match.home_team_name} vs ${match.away_team_name} — recalculando…`)
      await calculateScores(match.id, match.home_team_name, match.away_team_name)
    } else {
      console.log(`[sync]   ⚠️  Sin goleadores en API para ${match.home_team_name} vs ${match.away_team_name} (datos pendientes).`)
    }
  }
}

/**
 * Pase de recuperación: detecta partidos 'finished' que tienen predicciones
 * con base_score=NULL (el RPC nunca se ejecutó) y los recalcula.
 */
async function recalculateMissingScores(): Promise<void> {
  // Buscar matches finished que tengan al menos una predicción sin calcular
  const { data: uncalculated } = await supabase
    .from('predictions')
    .select('match_id')
    .is('base_score', null)

  if (!uncalculated || uncalculated.length === 0) return

  const matchIds = [...new Set(uncalculated.map(p => p.match_id))]

  // Filtrar solo los que están finished
  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name')
    .eq('status', 'finished')
    .in('id', matchIds)

  if (!finishedMatches || finishedMatches.length === 0) return

  console.log(`[sync] 🔁 ${finishedMatches.length} partido(s) finished con scores pendientes — recalculando…`)
  for (const m of finishedMatches) {
    await calculateScores(m.id, m.home_team_name, m.away_team_name)
  }
}

/** Intenta registrar goleadores desde la API. Retorna el número de eventos insertados. */
async function registerGoals(matchId: string, apiFootballId: number): Promise<number> {
  const goals = await getMatchGoals(apiFootballId)
  if (goals.length === 0) {
    console.log('[sync]   Sin datos de goles (plan free / aún sin publicar).')
    return 0
  }

  // Eliminar eventos previos del partido para evitar duplicados en retries
  await supabase.from('match_events').delete().eq('match_id', matchId)

  console.log(`[sync]   ${goals.length} gol(es) encontrado(s).`)
  let registered = 0
  for (const g of goals) {
    if (g.type === 'OWN') continue  // gol en propia no da bonus

    await upsertPlayerEvent(matchId, g.scorer.id, g.scorer.name,
      g.type === 'PENALTY' ? 'penalty' : 'goal', g.minute)
    registered++

    if (g.assist) {
      await upsertPlayerEvent(matchId, g.assist.id, g.assist.name, 'assist', g.minute)
      registered++
    }
  }
  return registered
}

/** Llama al RPC de cálculo de puntuaciones */
async function calculateScores(matchId: string, home: string, away: string): Promise<void> {
  const { error } = await supabase.rpc('calculate_match_scores', { p_match_id: matchId })
  if (error) console.error(`[sync]   Error calculando scores de ${home} vs ${away}:`, error.message)
  else       console.log(`[sync]   ✅ Scores calculados.`)
}

async function upsertPlayerEvent(
  matchId: string, fdPlayerId: number, name: string,
  type: 'goal' | 'penalty' | 'assist' | 'motm', minute: number | null,
): Promise<void> {
  let { data: player } = await supabase
    .from('players').select('id, api_football_id').eq('api_football_id', fdPlayerId).maybeSingle()

  if (!player) {
    const { data: byName } = await supabase
      .from('players').select('id, api_football_id').ilike('name', name).maybeSingle()

    if (byName) {
      await supabase.from('players').update({ api_football_id: fdPlayerId }).eq('id', byName.id)
      player = byName
    } else {
      const { data } = await supabase
        .from('players')
        .insert({ name, team: 'UNK', team_name: 'Unknown', api_football_id: fdPlayerId })
        .select('id, api_football_id').maybeSingle()
      player = data
    }
  }
  if (!player) return

  await supabase.from('match_events').insert({
    match_id: matchId, player_id: player.id, event_type: type, minute,
  })
}

// Permite ejecutar directamente: npm run sync
syncResults().catch(console.error)
