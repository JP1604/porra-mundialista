/**
 * QA E2E — Simulación completa de las mecánicas de la porra.
 *
 * Crea datos de prueba AISLADOS (jornadas 90/91, usuarios qa-*), ejecuta:
 *   1. RLS: solo el dueño inserta/edita sus predicciones
 *   2. Bloqueo: no se puede predecir en jornada cerrada
 *   3. Transparencia: predicciones ajenas ocultas hasta el cierre
 *   4. Motor de puntos: marcador (4/3/2/1/0) + clave de gol (+3/+2/+1/+1)
 *   5. Leaderboard: agregado y orden descendente
 *   6. Regla consecutiva: get_blocked_players
 * Al final LIMPIA todo lo creado.
 *
 * Uso: npm run qa
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { supabase as admin } from './supabase.js'

const URL = process.env.SUPABASE_URL!
// Clave pública (la misma que usa el frontend) — necesaria para probar RLS real
const ANON_KEY = process.env.SUPABASE_ANON_KEY
  ?? 'sb_publishable_Yz0iFFcZ6v5IJFN_reUw4g_-ODvZ-ak'

const PASS: string[] = []
const FAIL: string[] = []

function check(name: string, cond: boolean, detail = '') {
  if (cond) { PASS.push(name); console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`) }
  else      { FAIL.push(name); console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`) }
}

function section(t: string) { console.log(`\n══ ${t} ══`) }

const EMAIL_A = 'qa-porra-a@test-e2e.dev'
const EMAIL_B = 'qa-porra-b@test-e2e.dev'
const PASSWORD = 'QA-test-2026!'

async function getOrCreateUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  })
  if (data?.user) return data.user.id
  // Ya existe → buscarlo
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const found = list?.users.find(u => u.email === email)
  if (!found) throw new Error(`No se pudo crear ni encontrar ${email}: ${error?.message}`)
  return found.id
}

async function main() {
  console.log('\n🧪 QA E2E — Porra Mundialista\n')

  // IDs creados (para cleanup)
  let mdClosed = '', mdOpen = ''
  const matchIds: string[] = []
  let userA = '', userB = ''

  try {
    // ════ SETUP ═══════════════════════════════════════════════
    section('Setup de datos de prueba')

    userA = await getOrCreateUser(EMAIL_A)
    userB = await getOrCreateUser(EMAIL_B)
    console.log(`  Usuarios QA: A=${userA.slice(0, 8)}… B=${userB.slice(0, 8)}…`)

    const past   = new Date(Date.now() - 2 * 3600_000).toISOString()
    const future = new Date(Date.now() + 24 * 3600_000).toISOString()

    // Jornada 90 (CERRADA) y 91 (ABIERTA) — números altos para no chocar con las reales
    const { data: md1, error: e1 } = await admin.from('matchdays')
      .insert({ number: 90, label: 'QA Jornada Cerrada', stage: 'group', closes_at: past })
      .select('id').single()
    const { data: md2, error: e2 } = await admin.from('matchdays')
      .insert({ number: 91, label: 'QA Jornada Abierta', stage: 'group', closes_at: future })
      .select('id').single()
    if (e1 || e2 || !md1 || !md2) throw new Error(`matchdays: ${e1?.message ?? e2?.message}`)
    mdClosed = md1.id; mdOpen = md2.id

    // 5 partidos TERMINADOS en la jornada cerrada (para el motor de puntos)
    // M1 real 2-0 | M2 real 2-0 | M3 real 2-0 | M4 real 1-0 | M5 real 2-0
    const finishedMatches = [
      { h: 2, a: 0 }, { h: 2, a: 0 }, { h: 2, a: 0 }, { h: 1, a: 0 }, { h: 2, a: 0 },
    ]
    for (let i = 0; i < finishedMatches.length; i++) {
      const fm = finishedMatches[i]
      const { data, error } = await admin.from('matches').insert({
        matchday_id: mdClosed, home_team: 'MEX', away_team: 'RSA',
        home_team_name: `QA Local ${i + 1}`, away_team_name: `QA Visita ${i + 1}`,
        kickoff_at: past, status: 'finished',
        home_score: fm.h, away_score: fm.a, stage: 'group',
      }).select('id').single()
      if (error || !data) throw new Error(`match M${i + 1}: ${error?.message}`)
      matchIds.push(data.id)
    }
    // M6: partido ABIERTO en jornada abierta (para RLS de inserción)
    const { data: m6, error: e6 } = await admin.from('matches').insert({
      matchday_id: mdOpen, home_team: 'ARG', away_team: 'BRA',
      home_team_name: 'QA Abierto Local', away_team_name: 'QA Abierto Visita',
      kickoff_at: future, status: 'upcoming', stage: 'group',
    }).select('id').single()
    if (e6 || !m6) throw new Error(`match M6: ${e6?.message}`)
    matchIds.push(m6.id)
    const [M1, M2, M3, M4, M5, M6] = matchIds

    // 5 jugadores reales (de la plantilla de México)
    const { data: mexPlayers } = await admin.from('players')
      .select('id, name').eq('team', 'MEX').order('name').limit(5)
    if (!mexPlayers || mexPlayers.length < 5) throw new Error('No hay 5 jugadores MEX')
    const [P1, P2, P3, P4, P5] = mexPlayers
    console.log(`  Partidos QA: 6 | Jugadores clave: ${mexPlayers.map(p => p.name).join(', ')}`)

    // ════ 1. RLS: AUTENTICACIÓN Y PROPIEDAD ═══════════════════
    section('1. RLS — propiedad de predicciones')

    const clientA = createClient(URL, ANON_KEY, { auth: { persistSession: false } })
    const clientB = createClient(URL, ANON_KEY, { auth: { persistSession: false } })
    const clientAnon = createClient(URL, ANON_KEY, { auth: { persistSession: false } })

    const { error: loginA } = await clientA.auth.signInWithPassword({ email: EMAIL_A, password: PASSWORD })
    const { error: loginB } = await clientB.auth.signInWithPassword({ email: EMAIL_B, password: PASSWORD })
    check('Login con email+password funciona', !loginA && !loginB,
      loginA?.message ?? loginB?.message ?? 'sesiones activas')

    // A inserta SU predicción en partido abierto → debe PASAR
    const { error: insOwn } = await clientA.from('predictions').insert({
      user_id: userA, match_id: M6, home_score: 1, away_score: 1, key_player_id: P1.id,
    })
    check('Usuario puede crear su propia predicción (jornada abierta)', !insOwn, insOwn?.message)

    // A intenta insertar una predicción A NOMBRE DE B → debe FALLAR
    const { error: insOther } = await clientA.from('predictions').insert({
      user_id: userB, match_id: M6, home_score: 0, away_score: 0, key_player_id: P1.id,
    })
    check('Usuario NO puede crear predicción a nombre de otro', !!insOther,
      insOther ? `bloqueado (${insOther.code})` : '¡SE PERMITIÓ!')

    // B intenta EDITAR la predicción de A → debe afectar 0 filas
    const { data: updOther } = await clientB.from('predictions')
      .update({ home_score: 9 }).eq('user_id', userA).eq('match_id', M6).select()
    check('Usuario NO puede editar predicción ajena', (updOther ?? []).length === 0,
      `${(updOther ?? []).length} filas afectadas`)

    // ════ 2. BLOQUEO POR CIERRE DE JORNADA ════════════════════
    section('2. Bloqueo de predicciones al cierre')

    // A intenta predecir en partido de jornada CERRADA → debe FALLAR
    const { error: insClosed } = await clientA.from('predictions').insert({
      user_id: userA, match_id: M1, home_score: 2, away_score: 0, key_player_id: P1.id,
    })
    check('NO se puede crear predicción en jornada cerrada', !!insClosed,
      insClosed ? `bloqueado (${insClosed.code})` : '¡SE PERMITIÓ!')

    // Cerrar md91 y verificar que A ya no puede editar su predicción de M6
    await admin.from('matchdays').update({ closes_at: past }).eq('id', mdOpen)
    const { data: updAfterClose } = await clientA.from('predictions')
      .update({ home_score: 5 }).eq('user_id', userA).eq('match_id', M6).select()
    check('NO se puede editar predicción tras el cierre', (updAfterClose ?? []).length === 0,
      `${(updAfterClose ?? []).length} filas afectadas`)
    await admin.from('matchdays').update({ closes_at: future }).eq('id', mdOpen) // restaurar

    // ════ 3. TRANSPARENCIA ════════════════════════════════════
    section('3. Transparencia de predicciones')

    // Con la jornada ABIERTA: B no debe ver la predicción de A en M6
    const { data: hidden } = await clientB.from('predictions').select('id').eq('match_id', M6)
    check('Predicciones ajenas OCULTAS mientras la jornada está abierta',
      (hidden ?? []).length === 0, `${(hidden ?? []).length} visibles`)

    // Insertar predicciones de A en la jornada CERRADA (setup del motor de puntos)
    // pred: 2-0 | 4-2 | 2-1 | 0-1 | 0-3 con claves P1..P5
    const preds = [
      { m: M1, h: 2, a: 0, p: P1.id },  // exacto → 4
      { m: M2, h: 4, a: 2, p: P2.id },  // mismo ganador, misma dif → 3
      { m: M3, h: 2, a: 1, p: P3.id },  // mismo ganador, otra dif → 2
      { m: M4, h: 0, a: 1, p: P4.id },  // misma dif, otro ganador → 1 (regla oficial)
      { m: M5, h: 0, a: 3, p: P5.id },  // nada → 0
    ]
    for (const pr of preds) {
      const { error } = await admin.from('predictions').insert({
        user_id: userA, match_id: pr.m, home_score: pr.h, away_score: pr.a, key_player_id: pr.p,
      })
      if (error) throw new Error(`pred setup: ${error.message}`)
    }

    // Con la jornada CERRADA: B SÍ debe ver las predicciones de A
    const { data: visible } = await clientB.from('predictions').select('id').eq('match_id', M1)
    check('Predicciones ajenas VISIBLES tras el cierre (partido en juego)',
      (visible ?? []).length === 1, `${(visible ?? []).length} visibles`)

    // Usuario sin sesión también las ve (clave pública)
    const { data: anonSees } = await clientAnon.from('predictions').select('id').eq('match_id', M1)
    console.log(`  ℹ️  Sin sesión iniciada se ven ${(anonSees ?? []).length} predicciones de jornada cerrada (clave anon pública)`)

    // ════ 4. MOTOR DE PUNTOS ══════════════════════════════════
    section('4. Motor de puntos (marcador + clave de gol)')

    // Eventos: M1 → P1 gol + asistencia (bonus 4) | M2 → P2 penal + MOTM (bonus 3)
    await admin.from('match_events').insert([
      { match_id: M1, player_id: P1.id, event_type: 'goal',    minute: 10 },
      { match_id: M1, player_id: P1.id, event_type: 'assist',  minute: 55 },
      { match_id: M2, player_id: P2.id, event_type: 'penalty', minute: 30 },
      { match_id: M2, player_id: P2.id, event_type: 'motm' },
    ])

    // Calcular puntuaciones (simula lo que hace el sync/admin)
    for (const mid of [M1, M2, M3, M4, M5]) {
      const { error } = await admin.rpc('calculate_match_scores', { p_match_id: mid })
      if (error) throw new Error(`calculate_match_scores(${mid}): ${error.message}`)
    }

    // Verificar caso por caso
    const { data: scored } = await admin.from('predictions')
      .select('match_id, home_score, away_score, base_score, bonus_score, total_score')
      .eq('user_id', userA).in('match_id', [M1, M2, M3, M4, M5])

    const byMatch = new Map(scored?.map(s => [s.match_id, s]))
    const cases = [
      { m: M1, name: 'Marcador exacto (2-0 vs 2-0)',            base: 4, bonus: 4, total: 8 },
      { m: M2, name: 'Mismo ganador + misma dif (4-2 vs 2-0)',  base: 3, bonus: 3, total: 6 },
      { m: M3, name: 'Mismo ganador, otra dif (2-1 vs 2-0)',    base: 2, bonus: 0, total: 2 },
      { m: M4, name: 'Misma dif, otro ganador (0-1 vs 1-0)',    base: 1, bonus: 0, total: 1 },
      { m: M5, name: 'Sin aciertos (0-3 vs 2-0)',               base: 0, bonus: 0, total: 0 },
    ]
    for (const c of cases) {
      const s = byMatch.get(c.m)
      const okBase  = s?.base_score === c.base
      const okBonus = s?.bonus_score === c.bonus
      const okTotal = s?.total_score === c.total
      check(c.name, okBase && okBonus && okTotal,
        `esperado ${c.base}+${c.bonus}=${c.total}, obtenido ${s?.base_score}+${s?.bonus_score}=${s?.total_score}`)
    }

    // ════ 5. LEADERBOARD ══════════════════════════════════════
    section('5. Leaderboard')

    const { data: mdScore } = await admin.from('matchday_scores')
      .select('total_points, base_points, bonus_points, predictions_count, exact_scores')
      .eq('user_id', userA).eq('matchday_id', mdClosed).maybeSingle()

    // Totales esperados según la regla oficial: base 4+3+2+1+0=10, bonus 4+3=7 → 17
    console.log(`  Agregado jornada QA: ${mdScore?.total_points} pts (base ${mdScore?.base_points} + bonus ${mdScore?.bonus_points}), ${mdScore?.predictions_count} predicciones, ${mdScore?.exact_scores} exactas`)
    check('Agregado de jornada coincide con la suma de predicciones',
      mdScore?.total_points === (scored ?? []).reduce((acc, s) => acc + (s.total_score ?? 0), 0),
      `agregado=${mdScore?.total_points}`)

    // Vista global: ordenada descendente y contiene al usuario QA
    const { data: lb } = await admin.from('leaderboard').select('user_id, alias, total_points, rank')
    const sortedOk = (lb ?? []).every((row, i, arr) => i === 0 || arr[i - 1].total_points >= row.total_points)
    const rowA = lb?.find(r => r.user_id === userA)
    check('Leaderboard ordenado descendente', sortedOk)
    check('Usuario QA aparece en leaderboard con sus puntos',
      rowA?.total_points === mdScore?.total_points, `${rowA?.total_points} pts, rank ${rowA?.rank}`)

    // RPC por jornada
    const { data: mdLb } = await admin.rpc('get_matchday_leaderboard', { p_matchday_id: mdClosed })
    const topEntry = (mdLb as { user_id: string; total_points: number }[] | null)?.[0]
    check('Leaderboard por jornada: usuario QA es #1',
      topEntry?.user_id === userA, `top=${topEntry?.total_points} pts`)

    // ════ 6. REGLA CONSECUTIVA (clave de gol) ═════════════════
    section('6. Bloqueo de clave de gol consecutiva')

    // md91 (número 91) → jornada anterior = 90 → bloqueados P1..P5
    const { data: blocked } = await clientA.rpc('get_blocked_players', {
      p_user_id: userA, p_matchday_id: mdOpen,
    })
    const blockedSet = new Set((blocked as string[]) ?? [])
    const allBlocked = [P1, P2, P3, P4, P5].every(p => blockedSet.has(p.id))
    check('Jugadores usados en jornada anterior quedan bloqueados',
      allBlocked && blockedSet.size === 5, `${blockedSet.size} bloqueados`)

    // J1 real (número 1) no tiene jornada anterior → sin bloqueos
    const { data: j1 } = await admin.from('matchdays').select('id').eq('number', 1).single()
    const { data: blockedJ1 } = await clientA.rpc('get_blocked_players', {
      p_user_id: userA, p_matchday_id: j1!.id,
    })
    check('Jornada 1 no bloquea a nadie (sin jornada anterior)',
      ((blockedJ1 as string[]) ?? []).length === 0)

    await clientA.auth.signOut()
    await clientB.auth.signOut()

  } finally {
    // ════ CLEANUP ═════════════════════════════════════════════
    section('Cleanup')
    if (matchIds.length) {
      await admin.from('match_events').delete().in('match_id', matchIds)
      await admin.from('predictions').delete().in('match_id', matchIds)
    }
    if (userA) await admin.from('matchday_scores').delete().eq('user_id', userA)
    if (userB) await admin.from('matchday_scores').delete().eq('user_id', userB)
    if (matchIds.length) await admin.from('matches').delete().in('id', matchIds)
    if (mdClosed) await admin.from('matchdays').delete().eq('id', mdClosed)
    if (mdOpen)   await admin.from('matchdays').delete().eq('id', mdOpen)
    if (userA) await admin.auth.admin.deleteUser(userA)
    if (userB) await admin.auth.admin.deleteUser(userB)
    console.log('  🧹 Datos de prueba eliminados.')
  }

  // ════ RESUMEN ═══════════════════════════════════════════════
  console.log(`\n════════ RESULTADO: ${PASS.length} ✅  /  ${FAIL.length} ❌ ════════`)
  if (FAIL.length) {
    console.log('\nFallos:')
    FAIL.forEach(f => console.log(`  ❌ ${f}`))
    process.exitCode = 1
  }
}

main().catch(e => { console.error('\n💥 Error fatal:', e.message); process.exitCode = 1 })
