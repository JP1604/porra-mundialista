/**
 * SEED de plantillas — descarga el squad completo de las 48 selecciones
 * desde football-data.org y lo inserta en la tabla `players`.
 *
 * Límite del plan free: 10 req/min → se hace 1 request cada 6.5 s.
 * Duración total estimada: ~5-6 minutos para 48 selecciones.
 *
 * Uso: npm run seed:squads
 */
import 'dotenv/config'
import { supabase } from './supabase.js'
import { getCompetitionTeams, getTeamSquad, mapPosition } from './football-data.js'

const DELAY_MS = 6_500   // 10 req/min máx en plan free

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

async function main() {
  console.log('\n══ SEED Plantillas (football-data.org) ══\n')

  // ── 1. Las 48 selecciones ─────────────────────────────────────
  const teams = await getCompetitionTeams()
  console.log(`Selecciones clasificadas: ${teams.length}\n`)

  if (teams.length === 0) {
    console.error('❌ Sin equipos. Verifica el token o la temporada.')
    return
  }

  // ── 2. Jugadores ya existentes (para no duplicar) ─────────────
  const { data: existing } = await supabase
    .from('players')
    .select('id, name, api_football_id')

  const byApiId = new Map<number, string>()
  const byName  = new Map<string, string>()
  for (const p of existing ?? []) {
    if (p.api_football_id != null) byApiId.set(p.api_football_id, p.id)
    byName.set(p.name.toLowerCase(), p.id)
  }
  console.log(`Jugadores ya en DB: ${existing?.length ?? 0}`)

  // ── 3. Descargar plantilla de cada selección ──────────────────
  let totalNew = 0, totalUpdated = 0, totalFail = 0

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i]
    const tla  = (team.tla ?? '???').slice(0, 3).toUpperCase()

    await sleep(DELAY_MS)

    let squad
    try {
      const full = await getTeamSquad(team.id)
      squad = full.squad ?? []
    } catch (e) {
      console.error(`  ❌ [${i + 1}/${teams.length}] ${team.name}: ${(e as Error).message}`)
      totalFail++
      continue
    }

    if (squad.length === 0) {
      console.log(`  ⚠️  [${i + 1}/${teams.length}] ${team.name} (${tla}): plantilla vacía en la API`)
      continue
    }

    const rowsToInsert: Record<string, unknown>[] = []
    let updated = 0

    for (const sp of squad) {
      const position = mapPosition(sp.position)
      const base = {
        name           : sp.name,
        team           : tla,
        team_name      : team.name,
        position,
        api_football_id: sp.id,
      }

      const existingId = byApiId.get(sp.id) ?? byName.get(sp.name.toLowerCase())
      if (existingId) {
        // Ya existe (p.ej. del seed manual de estrellas): actualizar datos
        const { error } = await supabase.from('players').update(base).eq('id', existingId)
        if (!error) updated++
      } else {
        rowsToInsert.push(base)
      }
    }

    if (rowsToInsert.length > 0) {
      const { data: inserted, error } = await supabase
        .from('players')
        .insert(rowsToInsert)
        .select('id, name, api_football_id')

      if (error) {
        console.error(`  ❌ [${i + 1}/${teams.length}] ${team.name}: ${error.message}`)
        totalFail++
        continue
      }
      // Registrar en los mapas para dedupe del resto del loop
      for (const p of inserted ?? []) {
        if (p.api_football_id != null) byApiId.set(p.api_football_id, p.id)
        byName.set(p.name.toLowerCase(), p.id)
      }
      totalNew += inserted?.length ?? 0
    }
    totalUpdated += updated

    console.log(`  ✅ [${i + 1}/${teams.length}] ${team.name} (${tla}): ${squad.length} jugadores (${rowsToInsert.length} nuevos, ${updated} actualizados)`)
  }

  // ── 4. Resumen ────────────────────────────────────────────────
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })

  console.log(`\n✅ Seed de plantillas completado.`)
  console.log(`   Nuevos: ${totalNew} | Actualizados: ${totalUpdated} | Errores: ${totalFail}`)
  console.log(`   Total jugadores en Supabase: ${count}`)
}

main().catch(console.error)
