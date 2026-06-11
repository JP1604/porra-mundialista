import 'dotenv/config'
import { supabase } from './supabase.js'

const MEX_MATCH_ID = '9edc5579-4316-404d-b20b-d9b865a83eea'

// Calcular puntajes para México 2-0 Sudáfrica
console.log('Calculando puntajes para México vs Sudáfrica (2-0)...')
const { error } = await supabase.rpc('calculate_match_scores', { p_match_id: MEX_MATCH_ID })
if (error) {
  console.error('❌ Error:', error.message)
} else {
  console.log('✅ Puntajes calculados.')
}

// Ver resultados
const { data: preds } = await supabase
  .from('predictions')
  .select('user_id, home_score, away_score, base_score, bonus_score, total_score, key_player:players!predictions_key_player_id_fkey(name), profile:profiles!predictions_user_id_fkey(alias)')
  .eq('match_id', MEX_MATCH_ID)

console.log('\nPredicciones:')
preds?.forEach((p: any) => {
  console.log(`  ${p.profile?.alias ?? p.user_id.slice(0,8)}: ${p.home_score}-${p.away_score} | base=${p.base_score} bonus=${p.bonus_score} total=${p.total_score}`)
})
