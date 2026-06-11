/**
 * CLEANUP — Borra match_events, predictions, matches y matchdays.
 * Usar cuando hay datos duplicados. Después ejecutar: npm run seed
 *   npm run cleanup
 */
import 'dotenv/config'
import { supabase } from './supabase.js'

async function deleteAll(table: string) {
  const { error } = await supabase
    .from(table)
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000')
  if (error) console.error(`  ❌ ${table}: ${error.message}`)
  else       console.log(`  🗑  ${table}: eliminado`)
}

async function main() {
  console.log('\n══ CLEANUP ══\n')
  // FK order: child tables first
  await deleteAll('match_events')
  await deleteAll('predictions')
  await deleteAll('matches')
  await deleteAll('matchdays')
  console.log('\n✅ Listo. Ahora ejecuta: npm run seed\n')
}

main().catch(console.error)
