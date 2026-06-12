// ─── Entidades del dominio ───────────────────────────────────────────────────

export type MatchStatus = 'upcoming' | 'live' | 'finished'
export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
export type EventType = 'goal' | 'penalty' | 'assist' | 'motm'

export interface Match {
  id: string
  home_team: string        // Código ISO 3166-1 alpha-2 (p.ej. "ar", "fr")
  away_team: string
  home_team_name: string   // Nombre completo
  away_team_name: string
  kickoff_at: string       // ISO 8601 UTC
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  matchday_id: string
  stage: MatchStage
  group_name?: string      // "A", "B", ... (solo fase de grupos)
  venue?: string
  // Calculado en el cliente: true si kickoff_at > ahora (se puede predecir)
  is_open: boolean
}

export interface Matchday {
  id: string
  number: number           // Número de jornada (1, 2, 3, ...)
  closes_at: string        // ISO 8601 — kickoff del primer partido de la jornada
  label: string            // Texto descriptivo: "Jornada 1", "Octavos de final", etc.
  stage: MatchStage
  is_open: boolean         // closes_at > now()
}

export interface Player {
  id: string
  name: string
  team: string             // Código ISO
  team_name: string
  position?: 'GK' | 'DEF' | 'MID' | 'FWD'
}

export interface Prediction {
  id: string
  match_id: string
  user_id: string
  user_alias?: string          // alias del participante (join con profiles)
  home_score: number
  away_score: number
  key_player_id: string
  key_player_name: string
  base_score: number | null   // null = partido no finalizado aún
  bonus_score: number | null
  total_score: number | null
  created_at: string
  updated_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  player_id: string
  player_name: string
  event_type: EventType
  minute?: number
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  alias: string
  total_points: number
  predictions_count: number
  exact_scores: number     // predicciones con 4 pts
  correct_results: number  // predicciones con 2 o 3 pts
  total_bonus: number
}

// ─── DTOs (Request / Response) ───────────────────────────────────────────────

export interface CreatePredictionDto {
  match_id: string
  home_score: number
  away_score: number
  key_player_id: string
}

export interface UpdatePredictionDto {
  home_score?: number
  away_score?: number
  key_player_id?: string
}

export interface RegisterResultDto {
  home_score: number
  away_score: number
}

export interface RegisterEventDto {
  player_id: string
  event_type: EventType
  minute?: number
}

// ─── Estado de UI / helpers ──────────────────────────────────────────────────

export interface ScoreBreakdown {
  base: number
  bonus: number
  total: number
  reason: {
    base: string
    bonus: string[]
  }
}

export interface UserProfile {
  id: string
  alias: string
  email: string
  is_admin: boolean
  avatar_url?: string
}

export interface PredictionWithMatch extends Prediction {
  match: Match
}
