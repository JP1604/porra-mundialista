-- ============================================================
-- FIX: Bloqueo de predicciones POR PARTIDO (no por jornada)
-- Antes: bloqueaba toda la jornada al arrancar el primer partido
-- Ahora: cada partido se bloquea individualmente en su kickoff_at
--
-- Ejecutar en Supabase → SQL Editor → New query → Run
-- Es seguro ejecutarlo varias veces (DROP + CREATE).
-- ============================================================

-- ── 1. INSERT: permitir si el partido aún no ha comenzado ───
DROP POLICY IF EXISTS "predictions_insert_own_when_open" ON predictions;
CREATE POLICY "predictions_insert_own_when_open"
  ON predictions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND m.kickoff_at > NOW()
        AND m.status = 'upcoming'
    )
  );

-- ── 2. UPDATE: permitir editar si el partido aún no ha comenzado ──
DROP POLICY IF EXISTS "predictions_update_own_when_open" ON predictions;
CREATE POLICY "predictions_update_own_when_open"
  ON predictions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = predictions.match_id
        AND m.kickoff_at > NOW()
    )
  );

-- ── 3. SELECT OTROS: visible cuando EL PARTIDO (no la jornada) ya empezó ──
-- Antes usaba md.closes_at; ahora cada predicción se revela
-- en cuanto arranca ese partido específico.
DROP POLICY IF EXISTS "predictions_select_others_after_close" ON predictions;
CREATE POLICY "predictions_select_others_after_close"
  ON predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = predictions.match_id
        AND m.kickoff_at < NOW()
    )
  );
