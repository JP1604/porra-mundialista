/**
 * SEED — Poblar Supabase con todos los partidos del Mundial 2026
 * Fuente: football-data.org (plan free, clave en FOOTBALL_DATA_TOKEN)
 * Uso: npm run seed  (ejecutar UNA sola vez, o para re-sincronizar)
 * Costo: 1 request a football-data.org
 */
import 'dotenv/config'
import { supabase } from './supabase.js'
import {
  getAllMatches, buildMatchdayMeta, matchToRow, mapFDStage, getMatchdayNum, checkStatus,
} from './football-data.js'

async function main() {
  console.log('\n══ SEED Mundial 2026 (football-data.org) ══\n')

  // ── 0. Verificar token y disponibilidad ───────────────────────
  try {
    await checkStatus()
  } catch (e) {
    console.error('❌ Error conectando a football-data.org:', (e as Error).message)
    console.error('   → Verifica FOOTBALL_DATA_TOKEN en .env')
    return
  }

  // ── 1. Obtener los 104 fixtures ───────────────────────────────
  console.log('\nObteniendo fixtures...')
  const matches = await getAllMatches()
  console.log(`Recibidos: ${matches.length} partidos`)

  if (matches.length === 0) {
    console.error('❌ Sin datos. Verifica el token o que el torneo esté cargado en la API.')
    return
  }

  // ── 2. Construir mapa de jornadas ─────────────────────────────
  const jornadas = buildMatchdayMeta(matches)

  const groupCounts = [1, 2, 3]
    .map(n => `J${n}=${matches.filter(m => m.stage === 'GROUP_STAGE' && m.matchday === n).length}`)
    .join(', ')
  console.log(`Jornadas de grupo: ${groupCounts} (total jornadas=${jornadas.size})`)

  // ── 3. Insertar/actualizar matchdays ──────────────────────────
  console.log(`\nInsertando ${jornadas.size} jornadas...`)
  const matchdayIdMap = new Map<string, string>()

  for (const [key, j] of [...jornadas.entries()].sort((a, b) => a[1].num - b[1].num)) {
    const { data, error } = await supabase
      .from('matchdays')
      .upsert(
        { number: j.num, label: j.label, stage: j.stage, closes_at: j.closesAt },
        { onConflict: 'number' }
      )
      .select('id')
      .maybeSingle()

    if (error) { console.error(`  ❌ ${j.label}:`, error.message); continue }
    if (data) {
      matchdayIdMap.set(key, data.id)
      console.log(`  ✅ ${j.label} — cierra: ${j.closesAt.slice(0, 16)}`)
    }
  }

  // ── 4. Insertar partidos (borra primero por matchday para evitar duplicados) ──
  console.log(`\nInsertando ${matches.length} partidos...`)
  let ok = 0, fail = 0

  // Limpiar matches existentes de cada matchday antes de insertar
  for (const matchdayId of matchdayIdMap.values()) {
    await supabase.from('matches').delete().eq('matchday_id', matchdayId)
  }

  for (const m of matches) {
    const stage = mapFDStage(m.stage)
    const num   = getMatchdayNum(m)
    const matchdayId = matchdayIdMap.get(`${stage}_${num}`)

    if (!matchdayId) {
      console.error(`  ❌ Sin jornada: ${m.homeTeam.name} vs ${m.awayTeam.name} (stage=${m.stage})`)
      fail++; continue
    }

    const { error } = await supabase
      .from('matches')
      .insert(matchToRow(m, matchdayId))

    if (error) { console.error(`  ❌ ${m.homeTeam.name} vs ${m.awayTeam.name}:`, error.message); fail++ }
    else ok++
  }

  console.log(`\n✅ Seed completado: ${ok} partidos insertados, ${fail} errores.`)

  // ── 5. Resumen final ──────────────────────────────────────────
  const { data: mds } = await supabase.from('matchdays').select('number, label, closes_at').order('number')
  console.log('\nJornadas en Supabase:')
  for (const md of mds ?? []) {
    console.log(`  [${md.number}] ${md.label} — cierra: ${md.closes_at?.slice(0, 16)}`)
  }
}

main().catch(console.error)
