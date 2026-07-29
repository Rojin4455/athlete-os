/** Mirrors supabase/schema.sql for typed upserts. */

export type SyncTable =
  | "quick_logs"
  | "workout_sessions"
  | "exercise_history"
  | "week_status"
  | "app_settings"
  | "body_comp"
  | "plan_goals"
  | "milestones"
  | "session_overrides";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface QuickLogRow {
  user_id: string;
  date: string;
  water: number;
  sleep: number | null;
  weight: number | null;
  readiness: "ready" | "okay" | "tired" | null;
  resting_hr: number | null;
  updated_at: string;
}

export interface WorkoutSessionRow {
  id: string;
  user_id: string;
  date: string;
  session_id: string;
  week: number;
  started_at: number;
  finished_at: number | null;
  duration_sec: number;
  exercises: Json;
  extras: Json | null;
  total_volume: number;
  sets_logged: number;
  prs_hit: number;
  completed: boolean;
  updated_at: string;
}

export interface ExerciseHistoryRow {
  user_id: string;
  exercise_id: string;
  last: Json;
  best_weight: number;
  best_e1rm: number;
  updated_at: string;
}

export interface WeekStatusRowCloud {
  user_id: string;
  week_key: string;
  status: Json;
  updated_at: string;
}

export interface AppSettingsRow {
  user_id: string;
  program_start_date: string;
  units: string;
  updated_at: string;
}

export interface BodyCompRow {
  user_id: string;
  date: string;
  body_fat: number | null;
  muscle_mass: number | null;
  weight: number | null;
  notes: string | null;
  updated_at: string;
}

export interface PlanGoalsRow {
  user_id: string;
  period_key: string;
  kind: string;
  items: Json;
  updated_at: string;
}

export interface MilestoneRow {
  user_id: string;
  milestone_id: string;
  status: string;
  note: string | null;
  done_at: string | null;
  updated_at: string;
}

export interface SessionOverrideRow {
  user_id: string;
  session_id: string;
  exercises: Json;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      quick_logs: {
        Row: QuickLogRow;
        Insert: QuickLogRow;
        Update: Partial<QuickLogRow>;
        Relationships: [];
      };
      workout_sessions: {
        Row: WorkoutSessionRow;
        Insert: WorkoutSessionRow;
        Update: Partial<WorkoutSessionRow>;
        Relationships: [];
      };
      exercise_history: {
        Row: ExerciseHistoryRow;
        Insert: ExerciseHistoryRow;
        Update: Partial<ExerciseHistoryRow>;
        Relationships: [];
      };
      week_status: {
        Row: WeekStatusRowCloud;
        Insert: WeekStatusRowCloud;
        Update: Partial<WeekStatusRowCloud>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: AppSettingsRow;
        Update: Partial<AppSettingsRow>;
        Relationships: [];
      };
      body_comp: {
        Row: BodyCompRow;
        Insert: BodyCompRow;
        Update: Partial<BodyCompRow>;
        Relationships: [];
      };
      plan_goals: {
        Row: PlanGoalsRow;
        Insert: PlanGoalsRow;
        Update: Partial<PlanGoalsRow>;
        Relationships: [];
      };
      milestones: {
        Row: MilestoneRow;
        Insert: MilestoneRow;
        Update: Partial<MilestoneRow>;
        Relationships: [];
      };
      session_overrides: {
        Row: SessionOverrideRow;
        Insert: SessionOverrideRow;
        Update: Partial<SessionOverrideRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
