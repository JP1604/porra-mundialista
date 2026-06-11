/**
 * Script de prueba de conexión a Supabase.
 * Ejecutar: npm run test-db
 */
import 'dotenv/config'
import { supabase } from './supabase.js'

async function main() {
  console.log('Probando conexión a Supabase...')
  console.log('URL:', process.env.SUPABASE_URL)

  // 1. Leer tabla matchdays
  const { data: matchdays, error: e1 } = await supabase
    .from('matchdays')
    .select('id, number, label')
    .limit(5)

  if (e1) {
    console.error('❌ Error al leer matchdays:', e1.message)
  } else {
    console.log(`✅ matchdays (${matchdays?.length ?? 0} filas):`, matchdays)
  }

  // 2. Leer tabla matches
  const { data: matches, error: e2 } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, status')
    .limit(5)

  if (e2) {
    console.error('❌ Error al leer matches:', e2.message)
  } else {
    console.log(`✅ matches (${matches?.length ?? 0} filas):`, matches)
  }

  // 3. Leer tabla profiles
  const { data: profiles, error: e3 } = await supabase
    .from('profiles')
    .select('id, alias, is_admin')
    .limit(5)

  if (e3) {
    console.error('❌ Error al leer profiles:', e3.message)
  } else {
    console.log(`✅ profiles (${profiles?.length ?? 0} filas):`, profiles)
  }

  // 4. Leer vista leaderboard
  const { data: lb, error: e4 } = await supabase
    .from('leaderboard')
    .select('*')
    .limit(5)

  if (e4) {
    console.error('❌ Error al leer leaderboard:', e4.message)
  } else {
    console.log(`✅ leaderboard (${lb?.length ?? 0} filas):`, lb)
  }

  console.log('\nPrueba completada.')
}

main()
