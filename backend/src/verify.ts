/**
 * Verificación completa del estado de la app.
 * Uso: npm run verify
 */
import 'dotenv/config'
import { supabase } from './supabase.js'

function ok(msg: string) { console.log(`  ✅ ${msg}`) }
function fail(msg: string) { console.log(`  ❌ ${msg}`) }
function warn(msg: string) { console.log(`  ⚠️  ${msg}`) }
function section(title: string) { console.log(`\n══ ${title} ══`) }

async function main() {
  console.log('\n🔍 Verificando estado de la app...')

  // ── Base de datos ─────────────────────────────────────────────
  section('Base de datos')

  const [
    { count: matchdays },
    { count: matches },
    { count: players },
    { count: predictions },
    { count: events },
  ] = await Promise.all([
    supabase.from('matchdays').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('predictions').select('*', { count: 'exact', head: true }),
    supabase.from('match_events').select('*', { count: 'exact', head: true }),
  ])

  matchdays === 8  ? ok(`Matchdays: ${matchdays}`) : fail(`Matchdays: ${matchdays} (esperado: 8)`)
  matches === 104  ? ok(`Matches: ${matches}`)     : fail(`Matches: ${matches} (esperado: 104)`)
  ;(players ?? 0) >= 1200 ? ok(`Players: ${players}`) : fail(`Players: ${players} (esperado: ~1248)`)
  ok(`Predictions: ${predictions ?? 0}`)
  ok(`Match events: ${events ?? 0}`)

  // ── Duplicados en matches ─────────────────────────────────────
  section('Duplicados')
  const { data: allMatches } = await supabase
    .from('matches')
    .select('home_team, away_team, kickoff_at')
  const seen = new Set<string>()
  let dupes = 0
  for (const m of allMatches ?? []) {
    const key = `${m.home_team}|${m.away_team}|${m.kickoff_at}`
    if (seen.has(key)) dupes++
    else seen.add(key)
  }
  dupes === 0 ? ok('Sin partidos duplicados') : fail(`${dupes} partidos duplicados`)

  // ── Plantillas ────────────────────────────────────────────────
  section('Plantillas por selección')
  const checkTeams = ['MEX', 'ARG', 'BRA', 'ENG', 'ESP', 'RSA', 'USA', 'CAN']
  for (const team of checkTeams) {
    const { count } = await supabase
      .from('players').select('*', { count: 'exact', head: true }).eq('team', team)
    ;(count ?? 0) >= 20 ? ok(`${team}: ${count} jugadores`) : warn(`${team}: ${count} jugadores (¿plantilla incompleta?)`)
  }

  // ── Matchdays ─────────────────────────────────────────────────
  section('Jornadas')
  const { data: mds } = await supabase
    .from('matchdays').select('number, label, closes_at').order('number')
  for (const md of mds ?? []) {
    const isOpen = new Date(md.closes_at) > new Date()
    console.log(`  [${md.number}] ${md.label} — ${isOpen ? '🟢 ABIERTA' : '🔴 CERRADA'} (${md.closes_at?.slice(0, 16)})`)
  }

  // ── Football-data.org ─────────────────────────────────────────
  section('API externa')
  try {
    const { checkStatus } = await import('./football-data.js')
    await checkStatus()
    ok('football-data.org accesible')
  } catch (e) {
    fail(`football-data.org: ${(e as Error).message}`)
  }

  console.log('\n════════════════════════')
}

main().catch(console.error)
