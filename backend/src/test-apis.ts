/**
 * Test rápido: verifica que football-data.org devuelve datos del Mundial 2026
 * Uso: npm run test:api
 */
import 'dotenv/config'
import { checkStatus, getAllMatches, mapFDStage, getMatchdayNum } from './football-data.js'

console.log('── Verificando football-data.org ──\n')

// 1. Estado de la competición
await checkStatus()

// 2. Obtener todos los partidos
console.log('\nObteniendo partidos...')
const matches = await getAllMatches()
console.log(`Total: ${matches.length} partidos`)

// 3. Distribución por stage
const byStage = new Map<string, number>()
for (const m of matches) {
  const stage = mapFDStage(m.stage)
  byStage.set(stage, (byStage.get(stage) ?? 0) + 1)
}
console.log('\nPor stage:')
for (const [stage, count] of [...byStage.entries()].sort()) {
  console.log(`  ${stage}: ${count}`)
}

// 4. Jornadas de grupo (debería ser J1=24, J2=24, J3=24)
const groupByMatchday = new Map<number, number>()
for (const m of matches.filter(m => m.stage === 'GROUP_STAGE')) {
  const md = m.matchday ?? 0
  groupByMatchday.set(md, (groupByMatchday.get(md) ?? 0) + 1)
}
console.log('\nFase de grupos por matchday:')
for (const [md, count] of [...groupByMatchday.entries()].sort()) {
  console.log(`  Matchday ${md}: ${count} partidos`)
}

// 5. Primeros 3 partidos
console.log('\nPrimeros 3 partidos:')
matches.slice(0, 3).forEach(m => {
  const s = mapFDStage(m.stage)
  const n = getMatchdayNum(m)
  console.log(`  [${s}_${n}] ${m.utcDate.slice(0, 10)} | ${m.homeTeam.name} vs ${m.awayTeam.name} | status=${m.status}`)
})
