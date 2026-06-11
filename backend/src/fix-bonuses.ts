/**
 * FIX-BONUSES — Script one-shot para recuperar bonus de goleadores.
 *
 * Uso: npm run fix:bonuses
 *
 * Qué hace:
 *   1. Lee todos los partidos 'finished' con al menos un gol marcado.
 *   2. Para cada uno, borra los match_events existentes (pueden estar mal linkeados).
 *   3. Descarga los goles desde football-data.org con reintentos.
 *   4. Inserta los eventos con los player_id correctos de nuestra DB.
 *   5. Recalcula base_score + bonus_score para todas las predicciones del partido.
 *
 * Es seguro ejecutarlo múltiples veces (idempotente).
 */
import 'dotenv/config'
import { supabase } from './supabase.js'
import { getMatchGoals } from './football-data.js'

const API_DELAY = 7_000
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

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
      console.log(`    ↳ Vinculado por nombre: "${name}" → api_id=${fdPlayerId}`)
    } else {
      console.warn(`    ⚠️  Jugador no encontrado: "${name}" (fd_id=${fdPlayerId}) — creando entrada temporal`)
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

async function main() {
  console.log('\n══ FIX-BONUSES ══')
  console.log('Recuperando goleadores de todos los partidos finished con goles…\n')

  // 1. Todos los partidos terminados con al menos un gol
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, api_football_id, home_score, away_score')
    .eq('status', 'finished')
    .not('api_football_id', 'is', null)
    .or('home_score.gt.0,away_score.gt.0')

  if (error || !matches) {
    console.error('Error leyendo partidos:', error?.message)
    return
  }

  console.log(`Partidos con goles encontrados: ${matches.length}\n`)

  let fixed = 0
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const label = `${m.home_team_name} ${m.home_score}-${m.away_score} ${m.away_team_name}`
    console.log(`[${i + 1}/${matches.length}] ${label}`)

    if (i > 0) await sleep(API_DELAY)

    // 2. Obtener goles desde la API
    const goals = await getMatchGoals(m.api_football_id)
    if (goals.length === 0) {
      console.log('  → Sin datos de goles en API (puede que no estén publicados aún)\n')
      continue
    }

    console.log(`  → ${goals.length} gol(es) obtenido(s) de la API`)

    // 3. Borrar eventos previos del partido (limpieza)
    await supabase.from('match_events').delete().eq('match_id', m.id)

    // 4. Insertar eventos con player_id correcto
    let registered = 0
    for (const g of goals) {
      if (g.type === 'OWN') { console.log(`    · Gol en propia (${g.scorer.name}) — ignorado`); continue }

      await upsertPlayerEvent(m.id, g.scorer.id, g.scorer.name,
        g.type === 'PENALTY' ? 'penalty' : 'goal', g.minute)
      registered++

      if (g.assist) {
        await upsertPlayerEvent(m.id, g.assist.id, g.assist.name, 'assist', g.minute)
        registered++
      }

      console.log(`    · ${g.type === 'PENALTY' ? '🎯 Penal' : '⚽ Gol'}: ${g.scorer.name} min.${g.minute ?? '?'}${g.assist ? ` (asist. ${g.assist.name})` : ''}`)
    }

    // 5. Recalcular base_score + bonus_score
    const { error: rpcErr } = await supabase.rpc('calculate_match_scores', { p_match_id: m.id })
    if (rpcErr) {
      console.error(`  ❌ Error calculando scores: ${rpcErr.message}`)
    } else {
      console.log(`  ✅ Scores recalculados (${registered} evento(s) registrado(s))\n`)
      fixed++
    }
  }

  console.log(`\n══ FIN ══`)
  console.log(`Partidos corregidos: ${fixed}/${matches.length}`)
}

main().catch(console.error)
