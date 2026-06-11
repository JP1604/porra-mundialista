/**
 * TEST-GOALS — Diagnóstico: comprueba si la API devuelve goleadores
 *
 * Uso: npm run test:goals
 *
 * 1. Lee los partidos 'finished' de nuestra DB.
 * 2. Para cada uno llama a GET /matches/{api_football_id}.
 * 3. Muestra el raw de la respuesta para entender qué hay disponible.
 */
import 'dotenv/config'
import axios from 'axios'
import { supabase } from './supabase.js'

const client = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  timeout: 15_000,
  headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN ?? '' },
})

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('\n══ TEST-GOALS — Diagnóstico de goleadores ══\n')

  // 1. Leer partidos finished de nuestra DB
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, home_team_name, away_team_name, api_football_id, home_score, away_score')
    .eq('status', 'finished')
    .not('api_football_id', 'is', null)
    .or('home_score.gt.0,away_score.gt.0')
    .limit(10)   // probar con los primeros 10

  if (error || !matches || matches.length === 0) {
    console.error('Sin partidos finished con goles en DB:', error?.message ?? 'vacío')
    return
  }

  console.log(`Probando ${matches.length} partido(s) con goles:\n`)

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    console.log(`─── [${i + 1}/${matches.length}] ${m.home_team_name} ${m.home_score}-${m.away_score} ${m.away_team_name}`)
    console.log(`    api_football_id: ${m.api_football_id}`)

    if (i > 0) await sleep(7_000)   // respetar rate limit (10 req/min)

    try {
      const { data } = await client.get(`/matches/${m.api_football_id}`)

      // ── Estado y marcador ──
      console.log(`    status API: ${data.status}`)
      console.log(`    score.fullTime: ${JSON.stringify(data.score?.fullTime)}`)
      console.log(`    score.halfTime: ${JSON.stringify(data.score?.halfTime)}`)

      // ── Campo goals ──
      const goals = data.goals ?? null
      if (goals === null) {
        console.log('    goals: campo AUSENTE en la respuesta ❌')
      } else if (goals.length === 0) {
        console.log('    goals: array VACÍO [] — API no publicó goleadores todavía ⚠️')
      } else {
        console.log(`    goals: ${goals.length} entrada(s) ✅`)
        for (const g of goals) {
          const assist = g.assist?.name ?? '—'
          console.log(`      · min.${g.minute ?? '?'} [${g.type}] ${g.scorer?.name ?? '?'} (asist: ${assist}) equipo: ${g.team?.name ?? '?'}`)
        }
      }

      // ── Campo referees (para ver qué más viene en la respuesta) ──
      const topKeys = Object.keys(data).filter(k => !['odds', 'head2head'].includes(k))
      console.log(`    campos disponibles: ${topKeys.join(', ')}`)

    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code
      const msg  = (e as Error).message
      console.log(`    ❌ Error: ${msg} (code: ${code ?? 'n/a'})`)
    }

    console.log()
  }

  console.log('══ FIN ══')
}

main().catch(console.error)
