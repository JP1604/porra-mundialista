/**
 * SYNC — Sincronización de resultados desde football-data.org
 * Estrategia: chequea todos los partidos FINISHED, compara con Supabase,
 * actualiza resultados y calcula puntuaciones.
 */
import { supabase } from './supabase.js'
import { getFinishedMatches, getMatchGoals } from './football-data.js'

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

  const finishedIds = new Map(finished.map(f => [f.id, f]))

  // 2. Partidos 'upcoming' en Supabase que ya están terminados en la API
  const { data: pending, error } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, api_football_id')
    .eq('status', 'upcoming')
    .not('api_football_id', 'is', null)

  if (error) { console.error('[sync] Supabase error:', error.message); return }

  const toUpdate = (pending ?? []).filter(m =>
    m.api_football_id && finishedIds.has(m.api_football_id)
  )

  if (toUpdate.length === 0) { console.log('[sync] Todo al día.'); return }

  console.log(`[sync] ${toUpdate.length} partido(s) a actualizar.`)

  for (const match of toUpdate) {
    const fd = finishedIds.get(match.api_football_id)!
    const homeScore = fd.score.fullTime.home ?? 0
    const awayScore = fd.score.fullTime.away ?? 0

    console.log(`[sync] → ${match.home_team_name} ${homeScore}-${awayScore} ${match.away_team_name}`)

    // Actualizar resultado en Supabase
    const { error: upErr } = await supabase
      .from('matches')
      .update({ status: 'finished', home_score: homeScore, away_score: awayScore })
      .eq('id', match.id)

    if (upErr) { console.error('[sync]   Error:', upErr.message); continue }

    // Intentar obtener goles (puede estar vacío en plan free)
    const goals = await getMatchGoals(match.api_football_id)
    if (goals.length > 0) {
      console.log(`[sync]   ${goals.length} gol(es) registrados.`)
      for (const g of goals) {
        if (g.type === 'OWN') continue  // gol en propia no da bonus

        await upsertPlayerEvent(
          match.id,
          g.scorer.id,
          g.scorer.name,
          g.type === 'PENALTY' ? 'penalty' : 'goal',
          g.minute,
        )
        if (g.assist) {
          await upsertPlayerEvent(match.id, g.assist.id, g.assist.name, 'assist', g.minute)
        }
      }
    } else {
      console.log('[sync]   Sin datos de goles (plan free / aún sin publicar). El admin puede registrarlos manualmente.')
    }

    // Calcular puntuaciones de la quiniela
    const { error: rpcErr } = await supabase.rpc('calculate_match_scores', { p_match_id: match.id })
    if (rpcErr) console.error('[sync]   Error scores:', rpcErr.message)
    else        console.log('[sync]   ✅ Scores calculados.')
  }
}

async function upsertPlayerEvent(
  matchId: string, fdPlayerId: number, name: string,
  type: 'goal' | 'penalty' | 'assist' | 'motm', minute: number | null,
): Promise<void> {
  // 1. Buscar por api_football_id (match exacto)
  let { data: player } = await supabase
    .from('players').select('id, api_football_id').eq('api_football_id', fdPlayerId).maybeSingle()

  if (!player) {
    // 2. Buscar por nombre (jugadores sembrados sin api_football_id todavía)
    const { data: byName } = await supabase
      .from('players').select('id, api_football_id').ilike('name', name).maybeSingle()

    if (byName) {
      // Vincular el api_football_id al jugador sembrado
      await supabase.from('players').update({ api_football_id: fdPlayerId }).eq('id', byName.id)
      player = byName
    } else {
      // 3. Crear jugador nuevo (no estaba en el seed)
      const { data } = await supabase
        .from('players')
        .insert({ name, team: 'UNK', team_name: 'Unknown', api_football_id: fdPlayerId })
        .select('id').maybeSingle()
      player = data
    }
  }
  if (!player) return

  await supabase.from('match_events').insert({
    match_id: matchId, player_id: player.id, event_type: type, minute,
  })
}
