import 'dotenv/config'
import axios from 'axios'

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY ?? '' },
  timeout: 15_000,
})

console.log('Probando API-Football con league=1 season=2026...\n')

// Cuota y plan
const { data: status } = await client.get('/status')
console.log('Plan:', status.response?.account?.plan)
console.log('Requests hoy:', status.response?.requests?.current, '/', status.response?.requests?.limit_day)

// Fixtures WC 2026
const { data } = await client.get('/fixtures', { params: { league: 1, season: 2026 } })
console.log('\nFixtures WC 2026:')
console.log('  results:', data.results)
console.log('  errors:', JSON.stringify(data.errors))

if (data.results > 0) {
  const f = data.response[0]
  console.log('\nPrimer fixture:')
  console.log(' ', f.teams.home.name, 'vs', f.teams.away.name)
  console.log('  Fecha:', f.fixture.date)
  console.log('  Status:', f.fixture.status.short)
  console.log('  Ronda:', f.league.round)
  console.log('\nTotal rondas únicas:', new Set(data.response.map((x: {league:{round:string}}) => x.league.round)).size)
}
