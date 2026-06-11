import 'dotenv/config'
import axios from 'axios'

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY ?? '' },
  timeout: 15_000,
})

// Verificar liga ID=1 directamente
console.log('──── Liga ID=1 ────')
const { data: l1 } = await client.get('/leagues', { params: { id: 1 } })
console.log(JSON.stringify(l1.response?.[0]?.league, null, 2))
const seasons1 = l1.response?.[0]?.seasons?.map((s: {year:number,coverage:object}) => s.year)
console.log('Temporadas:', seasons1)

// Verificar fixtures para liga 1 temporada 2026
console.log('\n──── Fixtures liga=1 season=2026 ────')
const { data: f1 } = await client.get('/fixtures', { params: { league: 1, season: 2026 } })
console.log('Total:', f1.results, '| Error:', f1.errors)

// Probar temporada 2025 (por si el torneo cae en 2025 en su calendario)
console.log('\n──── Fixtures liga=1 season=2025 ────')
const { data: f2 } = await client.get('/fixtures', { params: { league: 1, season: 2025 } })
console.log('Total:', f2.results)

// Listar TODAS las ligas disponibles tipo "cup" de CONMEBOL/FIFA
console.log('\n──── Ligas internacionales (type=cup, primeras 20) ────')
const { data: all } = await client.get('/leagues', { params: { type: 'cup' } })
const intl = (all.response ?? [])
  .filter((item: {league: {id:number, name:string}}) => item.league.id < 20)
  .slice(0, 20)
for (const item of intl) {
  console.log(`ID: ${item.league.id} | ${item.league.name}`)
}
