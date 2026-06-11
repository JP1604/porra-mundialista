import cron from 'node-cron'
import 'dotenv/config'
import { syncResults } from './sync.js'

const INTERVAL = process.env.SYNC_INTERVAL_MINUTES ?? '30'

console.log('══════════════════════════════════════')
console.log('  Porra Mundialista — Backend Sync')
console.log('  Fuente: football-data.org (v4, liga WC)')
console.log(`  Intervalo: cada ${INTERVAL} min`)
console.log('══════════════════════════════════════\n')

await syncResults()
cron.schedule(`*/${INTERVAL} * * * *`, syncResults)
