import 'dotenv/config'
import { supabase } from './supabase.js'
import { checkApiStatus, getAllFixtures, LEAGUE_ID, SEASON } from './api-football.js'

console.log('══════════════════════════════════════════')
console.log('  Diagnóstico completo — Porra Mundialista')
console.log('══════════════════════════════════════════\n')

// ── 1. Supabase: tablas y migraciones ────────────────────────
console.log('📦 SUPABASE')

const checks = await Promise.all([
  supabase.from('matchdays').select('id', { count: 'exact', head: true }),
  supabase.from('matches').select('id', { count: 'exact', head: true }),
  supabase.from('players').select('id', { count: 'exact', head: true }),
  supabase.from('predictions').select('id', { count: 'exact', head: true }),
  supabase.from('profiles').select('id', { count: 'exact', head: true }),
  // Verificar columna api_football_id en matches
  supabase.from('matches').select('api_football_id').limit(1),
  // Verificar columna api_football_id en players
  supabase.from('players').select('api_football_id').limit(1),
  // Verificar leaderboard view
  supabase.from('leaderboard').select('user_id', { count: 'exact', head: true }),
])

const tables = ['matchdays','matches','players','predictions','profiles']
for (let i = 0; i < 5; i++) {
  const { count, error } = checks[i]
  if (error) console.log(`  ❌ ${tables[i]}: ${error.message}`)
  else       console.log(`  ✅ ${tables[i]}: ${count} filas`)
}

const [,,,,,apiColMatch, apiColPlayer, lbCheck] = checks
console.log(`  ${apiColMatch.error ? '❌' : '✅'} matches.api_football_id: ${apiColMatch.error?.message ?? 'OK'}`)
console.log(`  ${apiColPlayer.error ? '❌' : '✅'} players.api_football_id: ${apiColPlayer.error?.message ?? 'OK'}`)
console.log(`  ${lbCheck.error ? '❌' : '✅'} vista leaderboard: ${lbCheck.error?.message ?? 'OK'}`)

// ── 2. api-football: key y cuota ─────────────────────────────
console.log('\n⚽ API-FOOTBALL')
try {
  await checkApiStatus()
} catch (err: unknown) {
  console.log(`  ❌ Error: ${err instanceof Error ? err.message : err}`)
}

// ── 3. Probar fixture del Mundial 2026 ───────────────────────
console.log(`\n🏆 FIXTURES liga=${LEAGUE_ID} season=${SEASON}`)
try {
  const fixtures = await getAllFixtures()
  if (fixtures.length === 0) {
    console.log('  ⚠️  0 fixtures devueltos — verifica LEAGUE_ID y SEASON en .env')
  } else {
    const finished  = fixtures.filter(f => ['FT','AET','PEN'].includes(f.status)).length
    const upcoming  = fixtures.filter(f => f.status === 'NS').length
    const rounds    = [...new Set(fixtures.map(f => f.round))].sort()
    console.log(`  ✅ Total fixtures: ${fixtures.length}`)
    console.log(`     Terminados: ${finished} | Por jugar: ${upcoming}`)
    console.log(`     Rondas (${rounds.length}): ${rounds.slice(0,5).join(', ')}${rounds.length > 5 ? '…' : ''}`)
    console.log(`     Primer partido: ${fixtures[0].homeName} vs ${fixtures[0].awayName} — ${fixtures[0].kickoffUtc}`)
  }
} catch (err: unknown) {
  console.log(`  ❌ Error: ${err instanceof Error ? err.message : err}`)
}

console.log('\n══════════════════════════════════════════')
