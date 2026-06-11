-- ============================================================
-- PORRA MUNDIALISTA — Row Level Security (RLS)
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- ─── profiles ────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer perfiles (alias, avatar para el leaderboard)
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT USING (true);

-- Cada usuario puede actualizar su propio perfil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- El trigger on_auth_user_created usa SECURITY DEFINER, no necesita policy de INSERT

-- ─── matchdays ───────────────────────────────────────────────
ALTER TABLE matchdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matchdays_select_public"
  ON matchdays FOR SELECT USING (true);

CREATE POLICY "matchdays_admin_all"
  ON matchdays FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));

-- ─── matches ─────────────────────────────────────────────────
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Todos ven todos los partidos (estado, kickoff, equipos)
-- PERO los scores solo son visibles cuando status = 'finished'
-- Esto se maneja en el frontend: si status='upcoming', scores son null
CREATE POLICY "matches_select_public"
  ON matches FOR SELECT USING (true);

CREATE POLICY "matches_admin_all"
  ON matches FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));

-- ─── players ─────────────────────────────────────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_public"
  ON players FOR SELECT USING (true);

CREATE POLICY "players_admin_all"
  ON players FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));

-- ─── predictions ─────────────────────────────────────────────
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- El usuario siempre puede ver sus propias predicciones
CREATE POLICY "predictions_select_own"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

-- Las predicciones de otros se ven SOLO cuando la jornada ya cerró
CREATE POLICY "predictions_select_others_after_close"
  ON predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM matches m
      JOIN matchdays md ON m.matchday_id = md.id
      WHERE m.id = predictions.match_id
        AND md.closes_at < NOW()
    )
  );

-- Solo puede crear predicción el propio usuario cuando la jornada está abierta
CREATE POLICY "predictions_insert_own_when_open"
  ON predictions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM matches m
      JOIN matchdays md ON m.matchday_id = md.id
      WHERE m.id = match_id
        AND md.closes_at > NOW()
        AND m.status = 'upcoming'
    )
  );

-- Solo puede editar el propio usuario y mientras la jornada está abierta
CREATE POLICY "predictions_update_own_when_open"
  ON predictions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM matches m
      JOIN matchdays md ON m.matchday_id = md.id
      WHERE m.id = predictions.match_id
        AND md.closes_at > NOW()
    )
  );

-- El admin puede actualizar predicciones (para escribir base_score, bonus_score)
CREATE POLICY "predictions_admin_update"
  ON predictions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));

-- ─── match_events ────────────────────────────────────────────
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Eventos visibles solo cuando el partido terminó
CREATE POLICY "events_select_when_finished"
  ON match_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE id = match_events.match_id AND status = 'finished'
    )
  );

CREATE POLICY "events_admin_all"
  ON match_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));

-- ─── matchday_scores ─────────────────────────────────────────
ALTER TABLE matchday_scores ENABLE ROW LEVEL SECURITY;

-- Puntuaciones siempre públicas (es el leaderboard)
CREATE POLICY "matchday_scores_select_public"
  ON matchday_scores FOR SELECT USING (true);

-- Solo el sistema (funciones con SECURITY DEFINER) puede escribir
CREATE POLICY "matchday_scores_admin_all"
  ON matchday_scores FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin));
