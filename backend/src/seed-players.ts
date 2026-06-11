/**
 * SEED de jugadores — inserta estrellas del Mundial 2026 en la tabla `players`.
 * Uso: npm run seed:players  (ejecutar UNA vez antes del torneo)
 * Esto permite que los usuarios elijan un jugador como "clave de gol" en sus predicciones.
 */
import 'dotenv/config'
import { supabase } from './supabase.js'

const PLAYERS = [
  // Argentina
  { name: 'Lionel Messi',        team: 'ARG', team_name: 'Argentina',    position: 'FWD' },
  { name: 'Lautaro Martínez',    team: 'ARG', team_name: 'Argentina',    position: 'FWD' },
  { name: 'Paulo Dybala',        team: 'ARG', team_name: 'Argentina',    position: 'FWD' },
  { name: 'Rodrigo De Paul',     team: 'ARG', team_name: 'Argentina',    position: 'MID' },
  { name: 'Enzo Fernández',      team: 'ARG', team_name: 'Argentina',    position: 'MID' },
  // Francia
  { name: 'Kylian Mbappé',       team: 'FRA', team_name: 'Francia',      position: 'FWD' },
  { name: 'Antoine Griezmann',   team: 'FRA', team_name: 'Francia',      position: 'FWD' },
  { name: 'Aurélien Tchouaméni', team: 'FRA', team_name: 'Francia',      position: 'MID' },
  { name: 'Eduardo Camavinga',   team: 'FRA', team_name: 'Francia',      position: 'MID' },
  // Brasil
  { name: 'Vinícius Jr.',        team: 'BRA', team_name: 'Brasil',       position: 'FWD' },
  { name: 'Rodrygo Goes',        team: 'BRA', team_name: 'Brasil',       position: 'FWD' },
  { name: 'Endrick Felipe',      team: 'BRA', team_name: 'Brasil',       position: 'FWD' },
  { name: 'Casemiro',            team: 'BRA', team_name: 'Brasil',       position: 'MID' },
  // Inglaterra
  { name: 'Jude Bellingham',     team: 'ENG', team_name: 'Inglaterra',   position: 'MID' },
  { name: 'Bukayo Saka',         team: 'ENG', team_name: 'Inglaterra',   position: 'FWD' },
  { name: 'Harry Kane',          team: 'ENG', team_name: 'Inglaterra',   position: 'FWD' },
  { name: 'Phil Foden',          team: 'ENG', team_name: 'Inglaterra',   position: 'MID' },
  // España
  { name: 'Lamine Yamal',        team: 'ESP', team_name: 'España',       position: 'FWD' },
  { name: 'Nico Williams',       team: 'ESP', team_name: 'España',       position: 'FWD' },
  { name: 'Pedri González',      team: 'ESP', team_name: 'España',       position: 'MID' },
  { name: 'Álvaro Morata',       team: 'ESP', team_name: 'España',       position: 'FWD' },
  // Portugal
  { name: 'Cristiano Ronaldo',   team: 'POR', team_name: 'Portugal',     position: 'FWD' },
  { name: 'João Félix',          team: 'POR', team_name: 'Portugal',     position: 'FWD' },
  { name: 'Vitinha',             team: 'POR', team_name: 'Portugal',     position: 'MID' },
  // Alemania
  { name: 'Jamal Musiala',       team: 'GER', team_name: 'Alemania',     position: 'MID' },
  { name: 'Florian Wirtz',       team: 'GER', team_name: 'Alemania',     position: 'MID' },
  { name: 'Kai Havertz',         team: 'GER', team_name: 'Alemania',     position: 'FWD' },
  // Países Bajos
  { name: 'Cody Gakpo',          team: 'NED', team_name: 'Países Bajos', position: 'FWD' },
  { name: 'Memphis Depay',       team: 'NED', team_name: 'Países Bajos', position: 'FWD' },
  // Uruguay
  { name: 'Darwin Núñez',        team: 'URY', team_name: 'Uruguay',      position: 'FWD' },
  { name: 'Federico Valverde',   team: 'URY', team_name: 'Uruguay',      position: 'MID' },
  // Colombia
  { name: 'Luis Díaz',           team: 'COL', team_name: 'Colombia',     position: 'FWD' },
  { name: 'James Rodríguez',     team: 'COL', team_name: 'Colombia',     position: 'MID' },
  // México
  { name: 'Hirving Lozano',      team: 'MEX', team_name: 'México',       position: 'FWD' },
  { name: 'Raúl Jiménez',        team: 'MEX', team_name: 'México',       position: 'FWD' },
  // Estados Unidos
  { name: 'Christian Pulisic',   team: 'USA', team_name: 'EE.UU.',       position: 'FWD' },
  { name: 'Giovanni Reyna',      team: 'USA', team_name: 'EE.UU.',       position: 'MID' },
  // Marruecos
  { name: 'Achraf Hakimi',       team: 'MAR', team_name: 'Marruecos',    position: 'DEF' },
  { name: 'Hakim Ziyech',        team: 'MAR', team_name: 'Marruecos',    position: 'FWD' },
  // Senegal
  { name: 'Sadio Mané',          team: 'SEN', team_name: 'Senegal',      position: 'FWD' },
  // Japón
  { name: 'Takumi Minamino',     team: 'JPN', team_name: 'Japón',        position: 'FWD' },
]

async function main() {
  console.log('\n══ SEED Jugadores ══\n')
  console.log(`Insertando ${PLAYERS.length} jugadores...`)

  let ok = 0, skip = 0

  for (const p of PLAYERS) {
    // Verificar si ya existe por nombre antes de insertar
    const { data: existing } = await supabase
      .from('players').select('id').eq('name', p.name).maybeSingle()

    if (existing) { skip++; continue }

    const { error } = await supabase.from('players').insert(p)
    if (error) {
      console.error(`  ❌ ${p.name}:`, error.message)
    } else {
      ok++
    }
  }

  console.log(`\n✅ ${ok} jugadores insertados/actualizados, ${skip} omitidos.`)

  // Mostrar lista final
  const { data } = await supabase.from('players').select('id, name, team').order('name')
  console.log(`\nJugadores en Supabase (${data?.length ?? 0}):`)
  data?.forEach(p => console.log(`  [${p.team}] ${p.name} — ${p.id}`))
}

main().catch(console.error)
