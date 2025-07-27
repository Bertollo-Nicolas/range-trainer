-- Migration pour créer la table pomodoro_sessions
-- À exécuter dans l'éditeur SQL de Supabase

-- Table pour stocker les sessions Pomodoro
CREATE TABLE pomodoro_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    work_duration INTEGER NOT NULL DEFAULT 1500, -- 25 minutes en secondes
    short_break_duration INTEGER NOT NULL DEFAULT 300, -- 5 minutes en secondes
    long_break_duration INTEGER NOT NULL DEFAULT 900, -- 15 minutes en secondes
    cycles_before_long_break INTEGER NOT NULL DEFAULT 4,
    current_cycle INTEGER NOT NULL DEFAULT 0,
    current_type TEXT NOT NULL DEFAULT 'work' CHECK (current_type IN ('work', 'short_break', 'long_break')),
    time_left INTEGER NOT NULL DEFAULT 1500,
    is_running BOOLEAN NOT NULL DEFAULT false,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    completed_pomodoros INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE,
    pause_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Contraintes de validation
    CONSTRAINT valid_durations CHECK (
        work_duration > 0 AND 
        short_break_duration > 0 AND 
        long_break_duration > 0 AND
        cycles_before_long_break > 0
    ),
    CONSTRAINT valid_cycle CHECK (current_cycle >= 0),
    CONSTRAINT valid_time_left CHECK (time_left >= 0),
    CONSTRAINT valid_completed CHECK (completed_pomodoros >= 0)
);

-- Table pour l'historique des pomodoros complétés
CREATE TABLE pomodoro_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES pomodoro_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('work', 'short_break', 'long_break')),
    planned_duration INTEGER NOT NULL, -- durée prévue en secondes
    actual_duration INTEGER, -- durée réelle si interrompu
    completed BOOLEAN NOT NULL DEFAULT true,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX idx_pomodoro_sessions_updated_at ON pomodoro_sessions(updated_at);
CREATE INDEX idx_pomodoro_sessions_is_running ON pomodoro_sessions(is_running);
CREATE INDEX idx_pomodoro_history_session_id ON pomodoro_history(session_id);
CREATE INDEX idx_pomodoro_history_type ON pomodoro_history(type);
CREATE INDEX idx_pomodoro_history_start_time ON pomodoro_history(start_time);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_pomodoro_sessions_updated_at 
    BEFORE UPDATE ON pomodoro_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS (Row Level Security)
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_history ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (à ajuster selon vos besoins d'authentification)
CREATE POLICY "Allow all operations on pomodoro_sessions" ON pomodoro_sessions
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on pomodoro_history" ON pomodoro_history
    FOR ALL USING (true);